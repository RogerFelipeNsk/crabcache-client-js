/**
 * Gerenciamento de conexões TCP para CrabCache
 */

import { Socket } from 'net';
import { EventEmitter } from 'events';
import { CrabCacheConfig } from './types';

export class CrabCacheConnection extends EventEmitter {
  private socket: Socket;
  private config: Required<CrabCacheConfig>;
  private connected: boolean = false;
  private connecting: boolean = false;
  private responseBuffer: Buffer = Buffer.alloc(0);
  private pendingResponses: Array<{
    resolve: (value: Buffer) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = [];

  constructor(config: Required<CrabCacheConfig>) {
    super();
    this.config = config;
    this.socket = new Socket();
    this.setupSocketEvents();
  }

  private setupSocketEvents(): void {
    this.socket.on('connect', () => {
      this.connected = true;
      this.connecting = false;
      this.emit('connect');
    });

    this.socket.on('data', (data: Buffer) => {
      this.handleData(data);
    });

    this.socket.on('error', (error: Error) => {
      this.connected = false;
      this.connecting = false;
      this.emit('error', error);
      this.rejectPendingResponses(error);
    });

    this.socket.on('close', () => {
      this.connected = false;
      this.connecting = false;
      this.emit('close');
      this.rejectPendingResponses(new Error('Connection closed'));
    });

    this.socket.on('timeout', () => {
      this.socket.destroy();
      const error = new Error('Connection timeout');
      this.emit('error', error);
      this.rejectPendingResponses(error);
    });
  }

  async connect(): Promise<void> {
    if (this.connected) return;
    if (this.connecting) {
      return new Promise((resolve, reject) => {
        this.once('connect', resolve);
        this.once('error', reject);
      });
    }

    this.connecting = true;
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.socket.destroy();
        reject(new Error('Connection timeout'));
      }, this.config.connectionTimeout);

      this.socket.once('connect', () => {
        clearTimeout(timeout);
        resolve();
      });

      this.socket.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      this.socket.connect(this.config.port, this.config.host);
    });
  }

  async sendCommand(data: Buffer): Promise<Buffer> {
    if (!this.connected) {
      await this.connect();
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Command timeout'));
      }, this.config.commandTimeout);

      this.pendingResponses.push({
        resolve: (response: Buffer) => {
          clearTimeout(timeout);
          resolve(response);
        },
        reject: (error: Error) => {
          clearTimeout(timeout);
          reject(error);
        },
        timeout
      });

      this.socket.write(data, (error) => {
        if (error) {
          const pending = this.pendingResponses.pop();
          if (pending) {
            clearTimeout(pending.timeout);
            pending.reject(error);
          }
        }
      });
    });
  }

  async sendPipelineCommands(commands: Buffer[]): Promise<Buffer[]> {
    if (!this.connected) {
      await this.connect();
    }

    const responses: Promise<Buffer>[] = [];
    
    // Preparar todas as promises de resposta
    for (let i = 0; i < commands.length; i++) {
      responses.push(new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Pipeline command timeout'));
        }, this.config.commandTimeout);

        this.pendingResponses.push({
          resolve: (response: Buffer) => {
            clearTimeout(timeout);
            resolve(response);
          },
          reject: (error: Error) => {
            clearTimeout(timeout);
            reject(error);
          },
          timeout
        });
      }));
    }

    // Enviar todos os comandos de uma vez
    const batchData = Buffer.concat(commands);
    
    return new Promise((resolve, reject) => {
      this.socket.write(batchData, async (error) => {
        if (error) {
          // Limpar todas as promises pendentes
          while (this.pendingResponses.length > 0) {
            const pending = this.pendingResponses.pop();
            if (pending) {
              clearTimeout(pending.timeout);
              pending.reject(error);
            }
          }
          reject(error);
          return;
        }

        try {
          const results = await Promise.all(responses);
          resolve(results);
        } catch (err) {
          reject(err);
        }
      });
    });
  }

  private handleData(data: Buffer): void {
    this.responseBuffer = Buffer.concat([this.responseBuffer, data]);
    
    // Processar respostas completas
    while (this.responseBuffer.length > 0 && this.pendingResponses.length > 0) {
      const response = this.extractResponse();
      if (response) {
        const pending = this.pendingResponses.shift();
        if (pending) {
          pending.resolve(response);
        }
      } else {
        break; // Não há resposta completa ainda
      }
    }
  }

  private extractResponse(): Buffer | null {
    if (this.config.useBinaryProtocol) {
      return this.extractBinaryResponse();
    } else {
      return this.extractTextResponse();
    }
  }

  private extractTextResponse(): Buffer | null {
    const crlfIndex = this.responseBuffer.indexOf('\r\n');
    
    if (crlfIndex === -1) {
      return null; // Resposta incompleta
    }

    const response = this.responseBuffer.slice(0, crlfIndex);
    this.responseBuffer = this.responseBuffer.slice(crlfIndex + 2);
    return response;
  }

  private extractBinaryResponse(): Buffer | null {
    if (this.responseBuffer.length === 0) return null;

    const responseType = this.responseBuffer[0];

    try {
      switch (responseType) {
        case 0x10: // RESP_OK
        case 0x11: // RESP_PONG  
        case 0x12: // RESP_NULL
          const simpleResponse = this.responseBuffer.slice(0, 1);
          this.responseBuffer = this.responseBuffer.slice(1);
          return simpleResponse;

        case 0x13: // RESP_ERROR
        case 0x14: // RESP_VALUE
        case 0x15: // RESP_STATS
          // CrabCache usa U32LE para length, não varint
          if (this.responseBuffer.length < 5) {
            return null; // Precisa de pelo menos 1 byte (type) + 4 bytes (length)
          }
          
          const length = this.responseBuffer.readUInt32LE(1);
          const totalLength = 1 + 4 + length; // type + length + data
          
          if (this.responseBuffer.length < totalLength) {
            return null; // Resposta incompleta
          }
          
          const fullResponse = this.responseBuffer.slice(0, totalLength);
          this.responseBuffer = this.responseBuffer.slice(totalLength);
          return fullResponse;

        default:
          throw new Error(`Unknown response type: 0x${responseType.toString(16)}`);
      }
    } catch (error) {
      // Se não conseguir decodificar, aguarda mais dados
      return null;
    }
  }

  private decodeVarint(data: Buffer): [number, number] {
    let result = 0;
    let shift = 0;
    let bytesRead = 0;
    
    for (let i = 0; i < data.length; i++) {
      const byte = data[i];
      bytesRead++;
      
      result |= (byte & 0x7F) << shift;
      
      if ((byte & 0x80) === 0) {
        break;
      }
      
      shift += 7;
      if (shift >= 32) {
        throw new Error('Varint too long');
      }
    }
    
    return [result, bytesRead];
  }

  private rejectPendingResponses(error: Error): void {
    while (this.pendingResponses.length > 0) {
      const pending = this.pendingResponses.shift();
      if (pending) {
        clearTimeout(pending.timeout);
        pending.reject(error);
      }
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  async disconnect(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.connected) {
        resolve();
        return;
      }

      this.socket.once('close', () => {
        resolve();
      });

      this.socket.end();
    });
  }

  destroy(): void {
    this.socket.destroy();
    this.rejectPendingResponses(new Error('Connection destroyed'));
  }
}