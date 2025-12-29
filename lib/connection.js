"use strict";
/**
 * Gerenciamento de conexões TCP para CrabCache
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrabCacheConnection = void 0;
const net_1 = require("net");
const events_1 = require("events");
class CrabCacheConnection extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.connected = false;
        this.connecting = false;
        this.responseBuffer = Buffer.alloc(0);
        this.pendingResponses = [];
        this.config = config;
        this.socket = new net_1.Socket();
        this.setupSocketEvents();
    }
    setupSocketEvents() {
        this.socket.on('connect', () => {
            this.connected = true;
            this.connecting = false;
            this.emit('connect');
        });
        this.socket.on('data', (data) => {
            this.handleData(data);
        });
        this.socket.on('error', (error) => {
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
    async connect() {
        if (this.connected)
            return;
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
    async sendCommand(data) {
        if (!this.connected) {
            await this.connect();
        }
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Command timeout'));
            }, this.config.commandTimeout);
            this.pendingResponses.push({
                resolve: (response) => {
                    clearTimeout(timeout);
                    resolve(response);
                },
                reject: (error) => {
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
    async sendPipelineCommands(commands) {
        if (!this.connected) {
            await this.connect();
        }
        const responses = [];
        // Preparar todas as promises de resposta
        for (let i = 0; i < commands.length; i++) {
            responses.push(new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Pipeline command timeout'));
                }, this.config.commandTimeout);
                this.pendingResponses.push({
                    resolve: (response) => {
                        clearTimeout(timeout);
                        resolve(response);
                    },
                    reject: (error) => {
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
                }
                catch (err) {
                    reject(err);
                }
            });
        });
    }
    handleData(data) {
        this.responseBuffer = Buffer.concat([this.responseBuffer, data]);
        // Processar respostas completas
        while (this.responseBuffer.length > 0 && this.pendingResponses.length > 0) {
            const response = this.extractResponse();
            if (response) {
                const pending = this.pendingResponses.shift();
                if (pending) {
                    pending.resolve(response);
                }
            }
            else {
                break; // Não há resposta completa ainda
            }
        }
    }
    extractResponse() {
        if (this.config.useBinaryProtocol) {
            return this.extractBinaryResponse();
        }
        else {
            return this.extractTextResponse();
        }
    }
    extractTextResponse() {
        const crlfIndex = this.responseBuffer.indexOf('\r\n');
        if (crlfIndex === -1) {
            return null; // Resposta incompleta
        }
        const response = this.responseBuffer.slice(0, crlfIndex);
        this.responseBuffer = this.responseBuffer.slice(crlfIndex + 2);
        return response;
    }
    extractBinaryResponse() {
        if (this.responseBuffer.length === 0)
            return null;
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
        }
        catch (error) {
            // Se não conseguir decodificar, aguarda mais dados
            return null;
        }
    }
    decodeVarint(data) {
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
    rejectPendingResponses(error) {
        while (this.pendingResponses.length > 0) {
            const pending = this.pendingResponses.shift();
            if (pending) {
                clearTimeout(pending.timeout);
                pending.reject(error);
            }
        }
    }
    isConnected() {
        return this.connected;
    }
    async disconnect() {
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
    destroy() {
        this.socket.destroy();
        this.rejectPendingResponses(new Error('Connection destroyed'));
    }
}
exports.CrabCacheConnection = CrabCacheConnection;
//# sourceMappingURL=connection.js.map