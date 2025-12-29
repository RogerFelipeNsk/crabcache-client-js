/**
 * Pool de conexões para CrabCache
 */
import { EventEmitter } from 'events';
import { CrabCacheConnection } from './connection';
import { CrabCacheConfig, ConnectionPoolMetrics } from './types';
export declare class ConnectionPool extends EventEmitter {
    private config;
    private connections;
    private metrics;
    private healthCheckInterval?;
    constructor(config: Required<CrabCacheConfig>);
    /**
     * Obtém uma conexão do pool
     */
    acquire(): Promise<CrabCacheConnection>;
    /**
     * Retorna uma conexão para o pool
     */
    release(connection: CrabCacheConnection): void;
    /**
     * Cria uma nova conexão
     */
    private createConnection;
    /**
     * Remove uma conexão do pool
     */
    private removeConnection;
    /**
     * Trata erros de conexão
     */
    private handleConnectionError;
    /**
     * Atualiza as métricas do pool
     */
    private updateMetrics;
    /**
     * Inicia o health check das conexões
     */
    private startHealthCheck;
    /**
     * Executa health check em todas as conexões
     */
    private performHealthCheck;
    /**
     * Retorna as métricas do pool
     */
    getMetrics(): ConnectionPoolMetrics;
    /**
     * Fecha todas as conexões do pool
     */
    close(): Promise<void>;
    /**
     * Força a criação de conexões até o tamanho mínimo do pool
     */
    warmUp(minConnections?: number): Promise<void>;
    /**
     * Retorna informações sobre o estado do pool
     */
    getStatus(): {
        totalConnections: number;
        activeConnections: number;
        idleConnections: number;
        metrics: ConnectionPoolMetrics;
    };
}
//# sourceMappingURL=pool.d.ts.map