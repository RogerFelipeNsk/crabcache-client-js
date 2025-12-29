/**
 * Implementação de pipelining para CrabCache
 */
import { CrabCacheConnection } from './connection';
import { PipelineResponse } from './types';
export declare class CrabCachePipeline {
    private commands;
    private connection;
    private useBinaryProtocol;
    constructor(connection: CrabCacheConnection, useBinaryProtocol?: boolean);
    /**
     * Adiciona um comando PING ao pipeline
     */
    ping(): this;
    /**
     * Adiciona um comando PUT ao pipeline
     */
    put(key: string | Buffer, value: string | Buffer, ttl?: number): this;
    /**
     * Adiciona um comando GET ao pipeline
     */
    get(key: string | Buffer): this;
    /**
     * Adiciona um comando DEL ao pipeline
     */
    del(key: string | Buffer): this;
    /**
     * Adiciona um comando EXPIRE ao pipeline
     */
    expire(key: string | Buffer, ttl: number): this;
    /**
     * Adiciona um comando STATS ao pipeline
     */
    stats(): this;
    /**
     * Adiciona um comando METRICS ao pipeline
     */
    serverMetrics(): this;
    /**
     * Retorna o número de comandos no pipeline
     */
    length(): number;
    /**
     * Limpa todos os comandos do pipeline
     */
    clear(): this;
    /**
     * Executa todos os comandos do pipeline
     */
    execute(): Promise<PipelineResponse[]>;
    /**
     * Executa o pipeline em lotes para otimizar performance
     */
    executeBatched(batchSize?: number): Promise<PipelineResponse[]>;
    private convertToResponse;
}
export declare class PipelineBatch {
    private pipelines;
    private connection;
    private useBinaryProtocol;
    private maxBatchSize;
    constructor(connection: CrabCacheConnection, useBinaryProtocol?: boolean, maxBatchSize?: number);
    /**
     * Cria um novo pipeline
     */
    createPipeline(): CrabCachePipeline;
    /**
     * Executa todos os pipelines em paralelo
     */
    executeAll(): Promise<PipelineResponse[][]>;
    /**
     * Executa todos os pipelines sequencialmente
     */
    executeSequential(): Promise<PipelineResponse[][]>;
    /**
     * Retorna o número de pipelines
     */
    count(): number;
    /**
     * Retorna o número total de comandos em todos os pipelines
     */
    totalCommands(): number;
}
//# sourceMappingURL=pipeline.d.ts.map