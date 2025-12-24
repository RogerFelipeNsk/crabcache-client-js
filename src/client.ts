/**
 * Cliente principal do CrabCache
 */

import { EventEmitter } from 'events';
import { ConnectionPool } from './pool';
import { CrabCachePipeline, PipelineBatch } from './pipeline';
import { ProtocolEncoder, ProtocolDecoder } from './protocol';
import { 
  CrabCacheConfig, 
  CrabCacheValue, 
  CrabCacheStats, 
  ClientMetrics,
  ConnectionPoolMetrics 
} from './types';

export class CrabCacheClient extends EventEmitter {
  private config: Required<CrabCacheConfig>;
  private pool: ConnectionPool;
  private clientMetrics: ClientMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageLatency: 0,
    pipelineRequests: 0,
    binaryProtocolUsage: 0
  };
  private latencySum: number = 0;

  constructor(config: Partial<CrabCacheConfig> = {}) {
    super();
    
    this.config = {
      host: config.host || 'localhost',
      port: config.port || 8000,
      connectionTimeout: config.connectionTimeout || 5000,
      commandTimeout: config.commandTimeout || 10000,
      authToken: config.authToken || '',
      useBinaryProtocol: config.useBinaryProtocol || false,
      poolSize: config.poolSize || 10,
      enablePipelining: config.enablePipelining !== false,
      pipelineBatchSize: config.pipelineBatchSize || 100
    };

    this.pool = new ConnectionPool(this.config);
    this.setupPoolEvents();
  }

  private setupPoolEvents(): void {
    this.pool.on('connectionError', (connection, error) => {
      this.emit('connectionError', error);
    });

    this.pool.on('connectionCreated', (connection) => {
      this.emit('connectionCreated');
    });

    this.pool.on('connectionRemoved', (connection) => {
      this.emit('connectionRemoved');
    });
  }

  /**
   * Conecta ao servidor CrabCache
   */
  async connect(): Promise<void> {
    try {
      // Fazer warm-up do pool com algumas conexões
      await this.pool.warmUp(2);
      this.emit('connected');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Executa um comando PING
   */
  async ping(): Promise<string> {
    const startTime = Date.now();
    
    try {
      const response = await this.executeCommand('PING', []);
      this.updateMetrics(startTime, true);
      
      if (response.type === 'pong') {
        return 'PONG';
      } else if (response.type === 'error') {
        throw new Error(response.message);
      }
      
      throw new Error('Unexpected response to PING');
    } catch (error) {
      this.updateMetrics(startTime, false);
      throw error;
    }
  }

  /**
   * Armazena um valor no cache
   */
  async put(key: string | Buffer, value: string | Buffer, ttl?: number): Promise<void> {
    const startTime = Date.now();
    
    try {
      const args = [key, value];
      if (ttl !== undefined) {
        args.push(ttl.toString());
      }
      
      const response = await this.executeCommand('PUT', args);
      this.updateMetrics(startTime, true);
      
      if (response.type === 'ok') {
        return;
      } else if (response.type === 'error') {
        throw new Error(response.message);
      }
      
      throw new Error('Unexpected response to PUT');
    } catch (error) {
      this.updateMetrics(startTime, false);
      throw error;
    }
  }

  /**
   * Recupera um valor do cache
   */
  async get(key: string | Buffer): Promise<CrabCacheValue> {
    const startTime = Date.now();
    
    try {
      const response = await this.executeCommand('GET', [key]);
      this.updateMetrics(startTime, true);
      
      if (response.type === 'value') {
        return Buffer.isBuffer(response.data) ? response.data : response.data;
      } else if (response.type === 'null') {
        return null;
      } else if (response.type === 'error') {
        throw new Error(response.message);
      }
      
      throw new Error('Unexpected response to GET');
    } catch (error) {
      this.updateMetrics(startTime, false);
      throw error;
    }
  }

  /**
   * Remove um valor do cache
   */
  async del(key: string | Buffer): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      const response = await this.executeCommand('DEL', [key]);
      this.updateMetrics(startTime, true);
      
      if (response.type === 'ok') {
        return true;
      } else if (response.type === 'null') {
        return false;
      } else if (response.type === 'error') {
        throw new Error(response.message);
      }
      
      throw new Error('Unexpected response to DEL');
    } catch (error) {
      this.updateMetrics(startTime, false);
      throw error;
    }
  }

  /**
   * Define TTL para uma chave
   */
  async expire(key: string | Buffer, ttl: number): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      const response = await this.executeCommand('EXPIRE', [key, ttl.toString()]);
      this.updateMetrics(startTime, true);
      
      if (response.type === 'ok') {
        return true;
      } else if (response.type === 'null') {
        return false;
      } else if (response.type === 'error') {
        throw new Error(response.message);
      }
      
      throw new Error('Unexpected response to EXPIRE');
    } catch (error) {
      this.updateMetrics(startTime, false);
      throw error;
    }
  }

  /**
   * Obtém estatísticas do servidor
   */
  async stats(): Promise<CrabCacheStats> {
    const startTime = Date.now();
    
    try {
      const response = await this.executeCommand('STATS', []);
      this.updateMetrics(startTime, true);
      
      if (response.type === 'stats') {
        return typeof response.data === 'string' 
          ? JSON.parse(response.data) 
          : response.data;
      } else if (response.type === 'error') {
        throw new Error(response.message);
      }
      
      throw new Error('Unexpected response to STATS');
    } catch (error) {
      this.updateMetrics(startTime, false);
      throw error;
    }
  }

  /**
   * Obtém métricas do servidor
   */
  async serverMetrics(): Promise<any> {
    const startTime = Date.now();
    
    try {
      const response = await this.executeCommand('METRICS', []);
      this.updateMetrics(startTime, true);
      
      if (response.type === 'stats') {
        return typeof response.data === 'string' 
          ? JSON.parse(response.data) 
          : response.data;
      } else if (response.type === 'error') {
        throw new Error(response.message);
      }
      
      throw new Error('Unexpected response to METRICS');
    } catch (error) {
      this.updateMetrics(startTime, false);
      throw error;
    }
  }

  /**
   * Cria um pipeline para execução em lote
   */
  pipeline(): CrabCachePipeline {
    return new CrabCachePipeline(
      this.pool as any, // Hack para compatibilidade
      this.config.useBinaryProtocol
    );
  }

  /**
   * Cria um batch de pipelines
   */
  createBatch(): PipelineBatch {
    return new PipelineBatch(
      this.pool as any, // Hack para compatibilidade
      this.config.useBinaryProtocol,
      this.config.pipelineBatchSize
    );
  }

  /**
   * Executa múltiplos comandos usando pipelining
   */
  async multi(commands: Array<{
    command: string;
    args: (string | Buffer)[];
  }>): Promise<CrabCacheValue[]> {
    const startTime = Date.now();
    
    try {
      const pipeline = this.pipeline();
      
      // Adicionar todos os comandos ao pipeline
      for (const cmd of commands) {
        switch (cmd.command.toUpperCase()) {
          case 'PING':
            pipeline.ping();
            break;
          case 'PUT':
            pipeline.put(cmd.args[0], cmd.args[1], 
              cmd.args[2] ? parseInt(cmd.args[2].toString()) : undefined);
            break;
          case 'GET':
            pipeline.get(cmd.args[0]);
            break;
          case 'DEL':
            pipeline.del(cmd.args[0]);
            break;
          case 'EXPIRE':
            pipeline.expire(cmd.args[0], parseInt(cmd.args[1].toString()));
            break;
          case 'STATS':
            pipeline.stats();
            break;
          case 'METRICS':
            pipeline.serverMetrics();
            break;
          default:
            throw new Error(`Unknown command: ${cmd.command}`);
        }
      }
      
      const responses = await pipeline.execute();
      this.clientMetrics.pipelineRequests += commands.length;
      this.updateMetrics(startTime, true);
      
      return responses.map(resp => resp.success ? (resp.value ?? null) : null);
    } catch (error) {
      this.updateMetrics(startTime, false);
      throw error;
    }
  }

  /**
   * Executa um comando individual
   */
  private async executeCommand(command: string, args: (string | Buffer)[]): Promise<any> {
    const connection = await this.pool.acquire();
    
    try {
      // Codificar comando
      const encodedCommand = this.config.useBinaryProtocol
        ? ProtocolEncoder.encodeBinaryCommand(command, args)
        : ProtocolEncoder.encodeTextCommand(command, args);
      
      if (this.config.useBinaryProtocol) {
        this.clientMetrics.binaryProtocolUsage++;
      }
      
      // Enviar comando
      const responseBuffer = await connection.sendCommand(encodedCommand);
      
      // Decodificar resposta
      const response = this.config.useBinaryProtocol
        ? ProtocolDecoder.decodeBinaryResponse(responseBuffer)
        : ProtocolDecoder.decodeTextResponse(responseBuffer);
      
      return response;
    } finally {
      this.pool.release(connection);
    }
  }

  /**
   * Atualiza métricas do cliente
   */
  private updateMetrics(startTime: number, success: boolean): void {
    const latency = Date.now() - startTime;
    
    this.clientMetrics.totalRequests++;
    this.latencySum += latency;
    
    if (success) {
      this.clientMetrics.successfulRequests++;
    } else {
      this.clientMetrics.failedRequests++;
    }
    
    this.clientMetrics.averageLatency = this.latencySum / this.clientMetrics.totalRequests;
  }

  /**
   * Retorna métricas do cliente
   */
  getClientMetrics(): ClientMetrics {
    return { ...this.clientMetrics };
  }

  /**
   * Retorna métricas do pool de conexões
   */
  getPoolMetrics(): ConnectionPoolMetrics {
    return this.pool.getMetrics();
  }

  /**
   * Retorna informações sobre o status do cliente
   */
  getStatus(): {
    connected: boolean;
    config: Required<CrabCacheConfig>;
    clientMetrics: ClientMetrics;
    poolMetrics: ConnectionPoolMetrics;
    poolStatus: any;
  } {
    return {
      connected: this.pool.getStatus().totalConnections > 0,
      config: this.config,
      clientMetrics: this.getClientMetrics(),
      poolMetrics: this.getPoolMetrics(),
      poolStatus: this.pool.getStatus()
    };
  }

  /**
   * Fecha todas as conexões
   */
  async disconnect(): Promise<void> {
    try {
      await this.pool.close();
      this.emit('disconnected');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }
}