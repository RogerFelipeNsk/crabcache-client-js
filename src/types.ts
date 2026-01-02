/**
 * Tipos e interfaces para o cliente CrabCache
 */

import { ProtocolType, ProtocolStats } from './protocols/manager';

export interface ClusterNode {
  /** Endereço do nó */
  host: string;
  /** Porta do nó */
  port: number;
  /** Peso do nó para load balancing (padrão: 1) */
  weight?: number;
  /** Se o nó está ativo (padrão: true) */
  active?: boolean;
}

export interface CrabCacheConfig {
  /** Endereço do servidor CrabCache (padrão: 'localhost') */
  host?: string;
  /** Porta do servidor CrabCache (padrão: 8000) */
  port?: number;
  /** Lista de nós do cluster (para modo distribuído) */
  nodes?: ClusterNode[];
  /** Habilitar modo cluster (padrão: false) */
  enableCluster?: boolean;
  /** Estratégia de load balancing (padrão: 'round_robin') */
  loadBalancingStrategy?: 'round_robin' | 'weighted' | 'resource_based' | 'adaptive';
  /** Habilitar failover automático (padrão: true) */
  enableFailover?: boolean;
  /** Timeout para health check em ms (padrão: 3000) */
  healthCheckTimeout?: number;
  /** Intervalo de health check em ms (padrão: 10000) */
  healthCheckInterval?: number;
  /** Máximo de tentativas de reconexão (padrão: 3) */
  maxRetries?: number;
  /** Timeout de conexão em ms (padrão: 5000) */
  connectionTimeout?: number;
  /** Timeout de comando em ms (padrão: 10000) */
  commandTimeout?: number;
  /** Token de autenticação (opcional) */
  authToken?: string;
  /** Usar protocolo binário (padrão: false) */
  useBinaryProtocol?: boolean;
  /** Tamanho do pool de conexões por nó (padrão: 10) */
  poolSize?: number;
  /** Habilitar pipelining (padrão: true) */
  enablePipelining?: boolean;
  /** Tamanho do batch para pipelining (padrão: 100) */
  pipelineBatchSize?: number;
  
  // New protocol options
  /** Protocolo preferido (padrão: 'toon') */
  preferredProtocol?: ProtocolType;
  /** Habilitar protocolo TOON (padrão: true) */
  enableToonProtocol?: boolean;
  /** Habilitar protocolo Protobuf (padrão: true) */
  enableProtobufProtocol?: boolean;
  /** Negociar protocolo automaticamente (padrão: true) */
  autoNegotiateProtocol?: boolean;
  /** Timeout para negociação de protocolo em ms (padrão: 5000) */
  protocolNegotiationTimeout?: number;
  /** Habilitar fallback de protocolo (padrão: true) */
  enableProtocolFallback?: boolean;
  /** Opções específicas do protocolo TOON */
  toonOptions?: {
    enableStringInterning?: boolean;
    enableZeroCopy?: boolean;
    enableSIMD?: boolean;
    enableUltraCompression?: boolean;
  };
  /** Opções específicas do protocolo Protobuf */
  protobufOptions?: {
    enableCompression?: boolean;
    enableZeroCopy?: boolean;
  };
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

export interface RawCrabCacheStats {
  raw_stats: string;
}

export interface ClusterStats extends CrabCacheStats {
  cluster_nodes: number;
  cluster_active_nodes: number;
  cluster_throughput: number;
  cluster_load_balance_efficiency: number;
  cluster_fault_tolerance_rate: number;
  cluster_network_latency_p99_ms: number;
}

export interface ClientMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatency: number;
  pipelineRequests: number;
  binaryProtocolUsage: number;
  clusterRequests?: number;
  failoverEvents?: number;
  loadBalancingEfficiency?: number;
  
  // New protocol metrics
  toonProtocolUsage?: number;
  protobufProtocolUsage?: number;
  protocolNegotiations?: number;
  protocolFallbacks?: number;
  averageCompressionRatio?: number;
}

export interface ConnectionPoolMetrics {
  activeConnections: number;
  idleConnections: number;
  totalCreated: number;
  poolHits: number;
  poolMisses: number;
  healthCheckFailures: number;
}

export interface NodeMetrics {
  nodeId: string;
  host: string;
  port: number;
  active: boolean;
  weight: number;
  requestCount: number;
  errorCount: number;
  averageLatency: number;
  lastHealthCheck: Date;
  healthCheckStatus: 'healthy' | 'unhealthy' | 'unknown';
  throughput: number;
  connectionPoolMetrics: ConnectionPoolMetrics;
  
  // New protocol metrics
  protocolUsed?: ProtocolType;
  protocolNegotiationTime?: number;
  compressionRatio?: number;
}

export interface ClusterMetrics {
  totalNodes: number;
  activeNodes: number;
  totalRequests: number;
  distributedRequests: number;
  loadBalancingStrategy: string;
  loadBalancingEfficiency: number;
  failoverEvents: number;
  nodeMetrics: NodeMetrics[];
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

export interface NodeConnection {
  node: ClusterNode;
  connection: any; // Connection instance
  lastUsed: Date;
  requestCount: number;
  errorCount: number;
}