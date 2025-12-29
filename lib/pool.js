"use strict";
/**
 * Pool de conexões para CrabCache
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionPool = void 0;
const events_1 = require("events");
const connection_1 = require("./connection");
class ConnectionPool extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.connections = [];
        this.metrics = {
            activeConnections: 0,
            idleConnections: 0,
            totalCreated: 0,
            poolHits: 0,
            poolMisses: 0,
            healthCheckFailures: 0
        };
        this.config = config;
        this.startHealthCheck();
    }
    /**
     * Obtém uma conexão do pool
     */
    async acquire() {
        // Procurar por uma conexão idle
        const idleConnection = this.connections.find(conn => !conn.inUse && conn.connection.isConnected());
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
                const available = this.connections.find(conn => !conn.inUse && conn.connection.isConnected());
                if (available) {
                    clearTimeout(timeout);
                    available.inUse = true;
                    available.lastUsed = new Date();
                    this.metrics.poolHits++;
                    this.updateMetrics();
                    resolve(available.connection);
                }
                else {
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
    release(connection) {
        const pooledConnection = this.connections.find(conn => conn.connection === connection);
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
    async createConnection() {
        const connection = new connection_1.CrabCacheConnection(this.config);
        // Configurar eventos da conexão
        connection.on('error', (error) => {
            this.handleConnectionError(connection, error);
        });
        connection.on('close', () => {
            this.removeConnection(connection);
        });
        await connection.connect();
        const pooledConnection = {
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
    removeConnection(connection) {
        const index = this.connections.findIndex(conn => conn.connection === connection);
        if (index !== -1) {
            this.connections.splice(index, 1);
            this.updateMetrics();
            this.emit('connectionRemoved', connection);
        }
    }
    /**
     * Trata erros de conexão
     */
    handleConnectionError(connection, error) {
        const pooledConnection = this.connections.find(conn => conn.connection === connection);
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
    updateMetrics() {
        this.metrics.activeConnections = this.connections.filter(conn => conn.inUse).length;
        this.metrics.idleConnections = this.connections.filter(conn => !conn.inUse).length;
    }
    /**
     * Inicia o health check das conexões
     */
    startHealthCheck() {
        this.healthCheckInterval = setInterval(async () => {
            await this.performHealthCheck();
        }, 30000); // A cada 30 segundos
    }
    /**
     * Executa health check em todas as conexões
     */
    async performHealthCheck() {
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
            }
            catch (error) {
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
    getMetrics() {
        return { ...this.metrics };
    }
    /**
     * Fecha todas as conexões do pool
     */
    async close() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }
        const closePromises = this.connections.map(async (pooledConnection) => {
            try {
                await pooledConnection.connection.disconnect();
            }
            catch (error) {
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
    async warmUp(minConnections = Math.ceil(this.config.poolSize / 2)) {
        const connectionsToCreate = Math.min(minConnections, this.config.poolSize) - this.connections.length;
        if (connectionsToCreate <= 0)
            return;
        const creationPromises = [];
        for (let i = 0; i < connectionsToCreate; i++) {
            creationPromises.push(this.createConnection().then(connection => {
                this.release(connection); // Marcar como disponível
            }));
        }
        await Promise.all(creationPromises);
        this.emit('poolWarmedUp', this.connections.length);
    }
    /**
     * Retorna informações sobre o estado do pool
     */
    getStatus() {
        return {
            totalConnections: this.connections.length,
            activeConnections: this.metrics.activeConnections,
            idleConnections: this.metrics.idleConnections,
            metrics: this.getMetrics()
        };
    }
}
exports.ConnectionPool = ConnectionPool;
//# sourceMappingURL=pool.js.map