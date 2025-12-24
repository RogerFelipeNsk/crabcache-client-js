/**
 * Tipos e interfaces para o cliente CrabCache
 */

export interface CrabCacheConfig {
  /** Endereço do servidor CrabCache (padrão: 'localhost') */
  host?: string;
  /** Porta do servidor CrabCache (padrão: 8000) */
  port?: number;
  /** Timeout de conexão em ms (padrão: 5000) */
  connectionTimeout?: number;
  /** Timeout de comando em ms (padrão: 10000) */
  commandTimeout?: number;
  /** Token de autenticação (opcional) */
  authToken?: string;
  /** Usar protocolo binário (padrão: false) */
  useBinaryProtocol?: boolean;
  /** Tamanho do pool de conexões (padrão: 10) */
  poolSize?: number;
  /** Habilitar pipelining (padrão: true) */
  enablePipelining?: boolean;
  /** Tamanho do batch para pipelining (padrão: 100) */
  pipelineBatchSize?: number;
}

export interface CrabCacheStats {
  total_operations: number;
  get_operations: number;
  put_operations: number;
  del_operations: number;
  cache_hits: number;
  cache_misses: number;
  hit_ratio: number;
  memory_usage: number;
  active_connections: number;
  uptime_seconds: number;
}

export interface ClientMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatency: number;
  pipelineRequests: number;
  binaryProtocolUsage: number;
}

export interface ConnectionPoolMetrics {
  activeConnections: number;
  idleConnections: number;
  totalCreated: number;
  poolHits: number;
  poolMisses: number;
  healthCheckFailures: number;
}

export type CrabCacheValue = string | Buffer | null;

export interface PipelineCommand {
  command: string;
  args: (string | Buffer)[];
}

export interface PipelineResponse {
  success: boolean;
  value?: CrabCacheValue;
  error?: string;
}