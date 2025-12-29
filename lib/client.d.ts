/**
 * Cliente principal do CrabCache
 */
import { EventEmitter } from 'events';
import { CrabCachePipeline, PipelineBatch } from './pipeline';
import { ProtocolType, ProtocolNegotiationResult } from './protocols/manager';
import { CrabCacheConfig, CrabCacheValue, CrabCacheStats, ClusterStats, ClientMetrics, ConnectionPoolMetrics, ClusterMetrics } from './types';
export declare class CrabCacheClient extends EventEmitter {
    private config;
    private pool;
    private clusterNodes;
    private nodeConnections;
    private currentNodeIndex;
    private healthCheckInterval?;
    private protocolManager;
    private protocolNegotiated;
    private clientMetrics;
    private nodeMetrics;
    private latencySum;
    constructor(config?: Partial<CrabCacheConfig>);
    private initializeCluster;
    private setupPoolEvents;
    private startHealthChecks;
    private performHealthChecks;
    private selectNode;
    private selectRoundRobin;
    private selectWeighted;
    private selectResourceBased;
    private selectAdaptive;
    /**
     * Conecta ao servidor CrabCache ou cluster
     */
    connect(): Promise<void>;
    /**
     * Negotiate protocol with server
     */
    private negotiateProtocol;
    /**
     * Negotiate protocol for specific cluster node
     */
    private negotiateProtocolForNode;
    /**
     * Executa um comando PING
     */
    ping(): Promise<string>;
    /**
     * Armazena um valor no cache
     */
    put(key: string | Buffer, value: string | Buffer, ttl?: number): Promise<void>;
    /**
     * Recupera um valor do cache
     */
    get(key: string | Buffer): Promise<CrabCacheValue>;
    /**
     * Remove um valor do cache
     */
    del(key: string | Buffer): Promise<boolean>;
    /**
     * Define TTL para uma chave
     */
    expire(key: string | Buffer, ttl: number): Promise<boolean>;
    /**
     * Obtém estatísticas do servidor ou cluster
     */
    stats(): Promise<CrabCacheStats | ClusterStats>;
    private getClusterStats;
    /**
     * Obtém métricas do servidor
     */
    serverMetrics(): Promise<any>;
    /**
     * Cria um pipeline para execução em lote
     */
    pipeline(): CrabCachePipeline;
    /**
     * Cria um batch de pipelines
     */
    createBatch(): PipelineBatch;
    /**
     * Executa múltiplos comandos usando pipelining
     */
    multi(commands: Array<{
        command: string;
        args: (string | Buffer)[];
    }>): Promise<CrabCacheValue[]>;
    /**
     * Executa um comando individual
     */
    private executeCommand;
    /**
     * Fallback encoding when protocol is not negotiated
     */
    private fallbackEncodeCommand;
    /**
     * Fallback decoding when protocol is not negotiated
     */
    private fallbackDecodeResponse;
    /**
     * Update protocol usage metrics
     */
    private updateProtocolUsageMetrics;
    /**
     * Atualiza métricas do cliente
     */
    private updateMetrics;
    /**
     * Retorna métricas do cliente
     */
    getClientMetrics(): ClientMetrics;
    /**
     * Retorna métricas do cluster
     */
    getClusterMetrics(): ClusterMetrics | null;
    /**
     * Retorna métricas do pool de conexões
     */
    getPoolMetrics(): ConnectionPoolMetrics;
    /**
     * Retorna informações sobre o status do cliente
     */
    getStatus(): {
        connected: boolean;
        clusterMode: boolean;
        config: Required<CrabCacheConfig>;
        clientMetrics: ClientMetrics;
        poolMetrics: ConnectionPoolMetrics;
        clusterMetrics?: ClusterMetrics | null;
        poolStatus?: any;
        protocolInfo?: any;
    };
    /**
     * Get protocol information
     */
    getProtocolInfo(): {
        current: ProtocolType;
        negotiated: boolean;
        capabilities: string[];
        stats: any;
        toonStats?: any;
        protobufStats?: any;
        config: {
            preferred: ProtocolType;
            autoNegotiate: boolean;
            fallbackEnabled: boolean;
            toonEnabled: boolean;
            protobufEnabled: boolean;
        };
    };
    /**
     * Get protocol statistics
     */
    getProtocolStats(): {
        selectedProtocol: ProtocolType;
        negotiationAttempts: number;
        successfulNegotiations: number;
        fallbackCount: number;
        toonUsage: number;
        protobufUsage: number;
        binaryUsage: number;
        textUsage: number;
        averageNegotiationTime: number;
        compressionRatio: number;
    };
    /**
     * Force protocol selection (skip negotiation)
     */
    forceProtocol(protocol: ProtocolType): void;
    /**
     * Reset protocol state and renegotiate
     */
    resetProtocol(): Promise<ProtocolNegotiationResult>;
    /**
     * Fecha todas as conexões
     */
    disconnect(): Promise<void>;
}
//# sourceMappingURL=client.d.ts.map