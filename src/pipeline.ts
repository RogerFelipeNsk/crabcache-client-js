/**
 * Implementação de pipelining para CrabCache
 */

import { CrabCacheConnection } from './connection';
import { ProtocolEncoder, ProtocolDecoder } from './protocol';
import { PipelineCommand, PipelineResponse, CrabCacheValue } from './types';

export class CrabCachePipeline {
  private commands: PipelineCommand[] = [];
  private connection: CrabCacheConnection;
  private useBinaryProtocol: boolean;

  constructor(connection: CrabCacheConnection, useBinaryProtocol: boolean = false) {
    this.connection = connection;
    this.useBinaryProtocol = useBinaryProtocol;
  }

  /**
   * Adiciona um comando PING ao pipeline
   */
  ping(): this {
    this.commands.push({ command: 'PING', args: [] });
    return this;
  }

  /**
   * Adiciona um comando PUT ao pipeline
   */
  put(key: string | Buffer, value: string | Buffer, ttl?: number): this {
    const args = [key, value];
    if (ttl !== undefined) {
      args.push(ttl.toString());
    }
    this.commands.push({ command: 'PUT', args });
    return this;
  }

  /**
   * Adiciona um comando GET ao pipeline
   */
  get(key: string | Buffer): this {
    this.commands.push({ command: 'GET', args: [key] });
    return this;
  }

  /**
   * Adiciona um comando DEL ao pipeline
   */
  del(key: string | Buffer): this {
    this.commands.push({ command: 'DEL', args: [key] });
    return this;
  }

  /**
   * Adiciona um comando EXPIRE ao pipeline
   */
  expire(key: string | Buffer, ttl: number): this {
    this.commands.push({ command: 'EXPIRE', args: [key, ttl.toString()] });
    return this;
  }

  /**
   * Adiciona um comando STATS ao pipeline
   */
  stats(): this {
    this.commands.push({ command: 'STATS', args: [] });
    return this;
  }

  /**
   * Adiciona um comando METRICS ao pipeline
   */
  serverMetrics(): this {
    this.commands.push({ command: 'METRICS', args: [] });
    return this;
  }

  /**
   * Retorna o número de comandos no pipeline
   */
  length(): number {
    return this.commands.length;
  }

  /**
   * Limpa todos os comandos do pipeline
   */
  clear(): this {
    this.commands = [];
    return this;
  }

  /**
   * Executa todos os comandos do pipeline
   */
  async execute(): Promise<PipelineResponse[]> {
    if (this.commands.length === 0) {
      return [];
    }

    try {
      // Codificar todos os comandos
      const encodedCommands = this.commands.map(cmd => {
        if (this.useBinaryProtocol) {
          return ProtocolEncoder.encodeBinaryCommand(cmd.command, cmd.args);
        } else {
          return ProtocolEncoder.encodeTextCommand(cmd.command, cmd.args);
        }
      });

      // Enviar todos os comandos de uma vez
      const responses = await this.connection.sendPipelineCommands(encodedCommands);

      // Decodificar todas as respostas
      const results: PipelineResponse[] = [];
      
      for (let i = 0; i < responses.length; i++) {
        try {
          const decoded = this.useBinaryProtocol 
            ? ProtocolDecoder.decodeBinaryResponse(responses[i])
            : ProtocolDecoder.decodeTextResponse(responses[i]);

          results.push(this.convertToResponse(decoded));
        } catch (error) {
          results.push({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // Limpar comandos após execução
      this.clear();

      return results;
    } catch (error) {
      // Limpar comandos mesmo em caso de erro
      this.clear();
      throw error;
    }
  }

  /**
   * Executa o pipeline em lotes para otimizar performance
   */
  async executeBatched(batchSize: number = 100): Promise<PipelineResponse[]> {
    if (this.commands.length === 0) {
      return [];
    }

    const allResults: PipelineResponse[] = [];
    const commandsCopy = [...this.commands];
    this.clear();

    // Processar em lotes
    for (let i = 0; i < commandsCopy.length; i += batchSize) {
      const batch = commandsCopy.slice(i, i + batchSize);
      
      // Criar pipeline temporário para o lote
      const batchPipeline = new CrabCachePipeline(this.connection, this.useBinaryProtocol);
      batchPipeline.commands = batch;
      
      const batchResults = await batchPipeline.execute();
      allResults.push(...batchResults);
    }

    return allResults;
  }

  private convertToResponse(decoded: any): PipelineResponse {
    switch (decoded.type) {
      case 'ok':
        return { success: true, value: 'OK' };
      
      case 'pong':
        return { success: true, value: 'PONG' };
      
      case 'null':
        return { success: true, value: null };
      
      case 'value':
        return { 
          success: true, 
          value: Buffer.isBuffer(decoded.data) ? decoded.data : decoded.data 
        };
      
      case 'stats':
        return { success: true, value: decoded.data };
      
      case 'error':
        return { success: false, error: decoded.message };
      
      default:
        return { success: false, error: 'Unknown response type' };
    }
  }
}

export class PipelineBatch {
  private pipelines: CrabCachePipeline[] = [];
  private connection: CrabCacheConnection;
  private useBinaryProtocol: boolean;
  private maxBatchSize: number;

  constructor(
    connection: CrabCacheConnection, 
    useBinaryProtocol: boolean = false,
    maxBatchSize: number = 1000
  ) {
    this.connection = connection;
    this.useBinaryProtocol = useBinaryProtocol;
    this.maxBatchSize = maxBatchSize;
  }

  /**
   * Cria um novo pipeline
   */
  createPipeline(): CrabCachePipeline {
    const pipeline = new CrabCachePipeline(this.connection, this.useBinaryProtocol);
    this.pipelines.push(pipeline);
    return pipeline;
  }

  /**
   * Executa todos os pipelines em paralelo
   */
  async executeAll(): Promise<PipelineResponse[][]> {
    const promises = this.pipelines.map(pipeline => 
      pipeline.executeBatched(this.maxBatchSize)
    );
    
    const results = await Promise.all(promises);
    this.pipelines = []; // Limpar após execução
    
    return results;
  }

  /**
   * Executa todos os pipelines sequencialmente
   */
  async executeSequential(): Promise<PipelineResponse[][]> {
    const results: PipelineResponse[][] = [];
    
    for (const pipeline of this.pipelines) {
      const result = await pipeline.executeBatched(this.maxBatchSize);
      results.push(result);
    }
    
    this.pipelines = []; // Limpar após execução
    return results;
  }

  /**
   * Retorna o número de pipelines
   */
  count(): number {
    return this.pipelines.length;
  }

  /**
   * Retorna o número total de comandos em todos os pipelines
   */
  totalCommands(): number {
    return this.pipelines.reduce((total, pipeline) => total + pipeline.length(), 0);
  }
}