/**
 * Pool de conexões para CrabCache
 */

import { EventEmitter } from 'events';
import { CrabCacheConnection } from './connection';
import { CrabCacheConfig, ConnectionPoolMetrics } from './types';

interface PooledConnection {
  connection: CrabCacheConnection;
  inUse: boolean;
  createdAt: Date;
  lastUsed: Date;
  healthCheckFailures: number;
}

export class ConnectionPool extends EventEmitter {
  private config: Required<CrabCacheConfig>;
  private connections: PooledConnection[] = [];
  private metrics: ConnectionPoolMetrics = {
    activeConnections: 0,
    idleConnections: 0,
    totalCreated: 0,
    poolHits: 0,
    poolMisses: 0,
    healthCheckFailures: 0
  };
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(config: Required<CrabCacheConfig>) {
    super();
    this.config = config;
    this.startHealthCheck();
  }

  /**
   * Obtém uma conexão do pool
   */
  async acquire(): Promise<CrabCacheConnection> {
    // Procurar por uma conexão idle
    const idleConnection = this.connections.find(conn => 
      !conn.inUse && conn.connection.isConnected()
    );

    if (idleConnection) {
      idleConnection.inUse = true;
      idleConnection.lastUsed = new Date();
      this.metrics.poolHits++;
      this.updateMetrics();
      return idleConnection.connection;
    }

    // Se não há conexões idle e ainda não atingiu o limite, criar nova
    if (this.connections.length < this.config.poolSize) {
      const connection = await this.createConnection();
      this.metrics.poolMisses++;
      return connection;
    }

    // Aguardar por uma conexão disponível
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Pool acquisition timeout'));
      }, this.config.connectionTimeout);

      const checkForConnection = () => {
        const available = this.connections.find(conn => 
          !conn.inUse && conn.connection.isConnected()
        );

        if (available) {
          clearTimeout(timeout);
          available.inUse = true;
          available.lastUsed = new Date();
          this.metrics.poolHits++;
          this.updateMetrics();
          resolve(available.connection);
        } else {
          // Verificar novamente em 10ms
          setTimeout(checkForConnection, 10);
        }
      };

      checkForConnection();
    });
  }

  /**
   * Retorna uma conexão para o pool
   */
  release(connection: CrabCacheConnection): void {
    const pooledConnection = this.connections.find(conn => 
      conn.connection === connection
    );

    if (pooledConnection) {
      pooledConnection.inUse = false;
      pooledConnection.lastUsed = new Date();
      this.updateMetrics();
      this.emit('connectionReleased', connection);
    }
  }

  /**
   * Cria uma nova conexão
   */
  private async createConnection(): Promise<CrabCacheConnection> {
    const connection = new CrabCacheConnection(this.config);
    
    // Configurar eventos da conexão
    connection.on('error', (error) => {
      this.handleConnectionError(connection, error);
    });

    connection.on('close', () => {
      this.removeConnection(connection);
    });

    await connection.connect();

    const pooledConnection: PooledConnection = {
      connection,
      inUse: true,
      createdAt: new Date(),
      lastUsed: new Date(),
      healthCheckFailures: 0
    };

    this.connections.push(pooledConnection);
    this.metrics.totalCreated++;
    this.updateMetrics();

    this.emit('connectionCreated', connection);
    return connection;
  }

  /**
   * Remove uma conexão do pool
   */
  private removeConnection(connection: CrabCacheConnection): void {
    const index = this.connections.findIndex(conn => 
      conn.connection === connection
    );

    if (index !== -1) {
      this.connections.splice(index, 1);
      this.updateMetrics();
      this.emit('connectionRemoved', connection);
    }
  }

  /**
   * Trata erros de conexão
   */
  private handleConnectionError(connection: CrabCacheConnection, error: Error): void {
    const pooledConnection = this.connections.find(conn => 
      conn.connection === connection
    );

    if (pooledConnection) {
      pooledConnection.healthCheckFailures++;
      this.metrics.healthCheckFailures++;
      
      // Se muitas falhas, remover a conexão
      if (pooledConnection.healthCheckFailures > 3) {
        this.removeConnection(connection);
        connection.destroy();
      }
    }

    this.emit('connectionError', connection, error);
  }

  /**
   * Atualiza as métricas do pool
   */
  private updateMetrics(): void {
    this.metrics.activeConnections = this.connections.filter(conn => conn.inUse).length;
    this.metrics.idleConnections = this.connections.filter(conn => !conn.inUse).length;
  }

  /**
   * Inicia o health check das conexões
   */
  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, 30000); // A cada 30 segundos
  }

  /**
   * Executa health check em todas as conexões
   */
  private async performHealthCheck(): Promise<void> {
    const healthCheckPromises = this.connections
      .filter(conn => !conn.inUse)
      .map(async (pooledConnection) => {
        try {
          if (!pooledConnection.connection.isConnected()) {
            throw new Error('Connection not connected');
          }

          // Tentar um PING simples
          const pingData = this.config.useBinaryProtocol 
            ? Buffer.from([0x01]) // CMD_PING
            : Buffer.from('PING\r\n');
          
          await pooledConnection.connection.sendCommand(pingData);
          pooledConnection.healthCheckFailures = 0;
        } catch (error) {
          pooledConnection.healthCheckFailures++;
          this.metrics.healthCheckFailures++;
          
          if (pooledConnection.healthCheckFailures > 3) {
            this.removeConnection(pooledConnection.connection);
            pooledConnection.connection.destroy();
          }
        }
      });

    await Promise.allSettled(healthCheckPromises);
    this.updateMetrics();
  }

  /**
   * Retorna as métricas do pool
   */
  getMetrics(): ConnectionPoolMetrics {
    return { ...this.metrics };
  }

  /**
   * Fecha todas as conexões do pool
   */
  async close(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    const closePromises = this.connections.map(async (pooledConnection) => {
      try {
        await pooledConnection.connection.disconnect();
      } catch (error) {
        // Ignorar erros de desconexão
        pooledConnection.connection.destroy();
      }
    });

    await Promise.allSettled(closePromises);
    this.connections = [];
    this.updateMetrics();
    this.emit('poolClosed');
  }

  /**
   * Força a criação de conexões até o tamanho mínimo do pool
   */
  async warmUp(minConnections: number = Math.ceil(this.config.poolSize / 2)): Promise<void> {
    const connectionsToCreate = Math.min(minConnections, this.config.poolSize) - this.connections.length;
    
    if (connectionsToCreate <= 0) return;

    const creationPromises: Promise<void>[] = [];
    
    for (let i = 0; i < connectionsToCreate; i++) {
      creationPromises.push(
        this.createConnection().then(connection => {
          this.release(connection); // Marcar como disponível
        })
      );
    }

    await Promise.all(creationPromises);
    this.emit('poolWarmedUp', this.connections.length);
  }

  /**
   * Retorna informações sobre o estado do pool
   */
  getStatus(): {
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
    metrics: ConnectionPoolMetrics;
  } {
    return {
      totalConnections: this.connections.length,
      activeConnections: this.metrics.activeConnections,
      idleConnections: this.metrics.idleConnections,
      metrics: this.getMetrics()
    };
  }
}