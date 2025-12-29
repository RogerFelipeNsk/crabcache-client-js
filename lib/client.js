"use strict";
/**
 * Cliente principal do CrabCache
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrabCacheClient = void 0;
const events_1 = require("events");
const pool_1 = require("./pool");
const pipeline_1 = require("./pipeline");
const protocol_1 = require("./protocol");
const manager_1 = require("./protocols/manager");
class CrabCacheClient extends events_1.EventEmitter {
    constructor(config = {}) {
        super();
        this.clusterNodes = new Map();
        this.nodeConnections = new Map();
        this.currentNodeIndex = 0;
        this.protocolNegotiated = false;
        this.clientMetrics = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageLatency: 0,
            pipelineRequests: 0,
            binaryProtocolUsage: 0,
            clusterRequests: 0,
            failoverEvents: 0,
            loadBalancingEfficiency: 0,
            toonProtocolUsage: 0,
            protobufProtocolUsage: 0,
            protocolNegotiations: 0,
            protocolFallbacks: 0,
            averageCompressionRatio: 1.0
        };
        this.nodeMetrics = new Map();
        this.latencySum = 0;
        this.config = {
            host: config.host || 'localhost',
            port: config.port || 8000,
            nodes: config.nodes || [],
            enableCluster: config.enableCluster || false,
            loadBalancingStrategy: config.loadBalancingStrategy || 'round_robin',
            enableFailover: config.enableFailover !== false,
            healthCheckTimeout: config.healthCheckTimeout || 3000,
            healthCheckInterval: config.healthCheckInterval || 10000,
            maxRetries: config.maxRetries || 3,
            connectionTimeout: config.connectionTimeout || 5000,
            commandTimeout: config.commandTimeout || 10000,
            authToken: config.authToken || '',
            useBinaryProtocol: config.useBinaryProtocol || false,
            poolSize: config.poolSize || 10,
            enablePipelining: config.enablePipelining !== false,
            pipelineBatchSize: config.pipelineBatchSize || 100,
            // New protocol options with defaults
            preferredProtocol: config.preferredProtocol || 'toon',
            enableToonProtocol: config.enableToonProtocol !== false,
            enableProtobufProtocol: config.enableProtobufProtocol !== false,
            autoNegotiateProtocol: config.autoNegotiateProtocol !== false,
            protocolNegotiationTimeout: config.protocolNegotiationTimeout || 5000,
            enableProtocolFallback: config.enableProtocolFallback !== false,
            toonOptions: {
                enableStringInterning: config.toonOptions?.enableStringInterning !== false,
                enableZeroCopy: config.toonOptions?.enableZeroCopy !== false,
                enableSIMD: config.toonOptions?.enableSIMD !== false,
                enableUltraCompression: config.toonOptions?.enableUltraCompression !== false,
                ...config.toonOptions
            },
            protobufOptions: {
                enableCompression: config.protobufOptions?.enableCompression !== false,
                enableZeroCopy: config.protobufOptions?.enableZeroCopy !== false,
                ...config.protobufOptions
            }
        };
        // Initialize protocol manager
        this.protocolManager = new manager_1.ProtocolManager();
        // Initialize cluster or single node
        if (this.config.enableCluster && this.config.nodes.length > 0) {
            this.initializeCluster();
        }
        else {
            // Single node mode (backward compatibility)
            this.pool = new pool_1.ConnectionPool(this.config);
            this.setupPoolEvents();
        }
    }
    initializeCluster() {
        // Initialize cluster nodes
        this.config.nodes.forEach((node, index) => {
            const nodeId = `${node.host}:${node.port}`;
            const clusterNode = {
                ...node,
                weight: node.weight || 1,
                active: node.active !== false
            };
            this.clusterNodes.set(nodeId, clusterNode);
            // Create connection pool for each node
            const nodeConfig = {
                ...this.config,
                host: node.host,
                port: node.port
            };
            const nodePool = new pool_1.ConnectionPool(nodeConfig);
            this.nodeConnections.set(nodeId, nodePool);
            // Initialize node metrics
            this.nodeMetrics.set(nodeId, {
                nodeId,
                host: node.host,
                port: node.port,
                active: clusterNode.active || false,
                weight: clusterNode.weight || 1,
                requestCount: 0,
                errorCount: 0,
                averageLatency: 0,
                lastHealthCheck: new Date(),
                healthCheckStatus: 'unknown',
                throughput: 0,
                connectionPoolMetrics: {
                    activeConnections: 0,
                    idleConnections: 0,
                    totalCreated: 0,
                    poolHits: 0,
                    poolMisses: 0,
                    healthCheckFailures: 0
                }
            });
        });
        // Start health checks if enabled
        if (this.config.enableFailover) {
            this.startHealthChecks();
        }
    }
    setupPoolEvents() {
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
    startHealthChecks() {
        this.healthCheckInterval = setInterval(async () => {
            await this.performHealthChecks();
        }, this.config.healthCheckInterval);
    }
    async performHealthChecks() {
        const healthCheckPromises = Array.from(this.clusterNodes.entries()).map(async ([nodeId, node]) => {
            try {
                const startTime = Date.now();
                const pool = this.nodeConnections.get(nodeId);
                if (!pool)
                    return;
                // Simple ping to check health
                const connection = await pool.acquire();
                const encodedCommand = protocol_1.ProtocolEncoder.encodeTextCommand('PING', []);
                await connection.sendCommand(encodedCommand);
                pool.release(connection);
                const latency = Date.now() - startTime;
                // Update node metrics
                const metrics = this.nodeMetrics.get(nodeId);
                if (metrics) {
                    metrics.lastHealthCheck = new Date();
                    metrics.healthCheckStatus = 'healthy';
                    metrics.averageLatency = (metrics.averageLatency + latency) / 2;
                    // Mark node as active if it was inactive
                    if (!node.active) {
                        node.active = true;
                        this.emit('nodeRecovered', nodeId);
                    }
                }
            }
            catch (error) {
                // Mark node as inactive
                const metrics = this.nodeMetrics.get(nodeId);
                if (metrics) {
                    metrics.lastHealthCheck = new Date();
                    metrics.healthCheckStatus = 'unhealthy';
                    metrics.errorCount++;
                }
                if (node.active) {
                    node.active = false;
                    this.clientMetrics.failoverEvents++;
                    this.emit('nodeFailure', nodeId, error);
                }
            }
        });
        await Promise.allSettled(healthCheckPromises);
    }
    selectNode() {
        if (!this.config.enableCluster) {
            return null;
        }
        const activeNodes = Array.from(this.clusterNodes.values()).filter(node => node.active);
        if (activeNodes.length === 0) {
            throw new Error('No active nodes available in cluster');
        }
        // Implement load balancing strategy
        switch (this.config.loadBalancingStrategy) {
            case 'round_robin':
                return this.selectRoundRobin(activeNodes);
            case 'weighted':
                return this.selectWeighted(activeNodes);
            case 'resource_based':
                return this.selectResourceBased(activeNodes);
            case 'adaptive':
                return this.selectAdaptive(activeNodes);
            default:
                return this.selectRoundRobin(activeNodes);
        }
    }
    selectRoundRobin(nodes) {
        const node = nodes[this.currentNodeIndex % nodes.length];
        this.currentNodeIndex++;
        return node;
    }
    selectWeighted(nodes) {
        const totalWeight = nodes.reduce((sum, node) => sum + node.weight, 0);
        let random = Math.random() * totalWeight;
        for (const node of nodes) {
            random -= node.weight;
            if (random <= 0) {
                return node;
            }
        }
        return nodes[0]; // Fallback
    }
    selectResourceBased(nodes) {
        // Select node with lowest current load (request count)
        return nodes.reduce((best, current) => {
            const bestMetrics = this.nodeMetrics.get(`${best.host}:${best.port}`);
            const currentMetrics = this.nodeMetrics.get(`${current.host}:${current.port}`);
            if (!bestMetrics)
                return current;
            if (!currentMetrics)
                return best;
            return currentMetrics.requestCount < bestMetrics.requestCount ? current : best;
        });
    }
    selectAdaptive(nodes) {
        // Combine weight and resource-based selection
        return nodes.reduce((best, current) => {
            const bestMetrics = this.nodeMetrics.get(`${best.host}:${best.port}`);
            const currentMetrics = this.nodeMetrics.get(`${current.host}:${current.port}`);
            if (!bestMetrics)
                return current;
            if (!currentMetrics)
                return best;
            // Score based on weight and inverse of request count
            const bestScore = best.weight / (bestMetrics.requestCount + 1);
            const currentScore = current.weight / (currentMetrics.requestCount + 1);
            return currentScore > bestScore ? current : best;
        });
    }
    /**
     * Conecta ao servidor CrabCache ou cluster
     */
    async connect() {
        try {
            if (this.config.enableCluster) {
                // Connect to all nodes in cluster
                const connectPromises = Array.from(this.nodeConnections.entries()).map(async ([nodeId, pool]) => {
                    try {
                        await pool.warmUp(2);
                        // Negotiate protocol for each node if enabled
                        if (this.config.autoNegotiateProtocol) {
                            await this.negotiateProtocolForNode(nodeId, pool);
                        }
                        this.emit('nodeConnected', nodeId);
                    }
                    catch (error) {
                        this.emit('nodeConnectionFailed', nodeId, error);
                        // Mark node as inactive
                        const node = this.clusterNodes.get(nodeId);
                        if (node) {
                            node.active = false;
                        }
                    }
                });
                await Promise.allSettled(connectPromises);
                // Check if at least one node is connected
                const activeNodes = Array.from(this.clusterNodes.values()).filter(n => n.active);
                if (activeNodes.length === 0) {
                    throw new Error('Failed to connect to any cluster nodes');
                }
                this.emit('clusterConnected', activeNodes.length);
            }
            else {
                // Single node connection
                await this.pool.warmUp(2);
                // Skip protocol negotiation for now due to connection issues
                // TODO: Fix protocol negotiation
                this.protocolManager.forceProtocol('text');
                this.protocolNegotiated = true;
                this.emit('connected');
            }
        }
        catch (error) {
            this.emit('error', error);
            throw error;
        }
    }
    /**
     * Negotiate protocol with server
     */
    async negotiateProtocol() {
        if (this.protocolNegotiated) {
            return {
                selectedProtocol: this.protocolManager.getCurrentProtocol(),
                fallbackChain: [],
                negotiationTime: 0
            };
        }
        const startTime = Date.now();
        this.clientMetrics.protocolNegotiations++;
        try {
            // Use a separate connection for negotiation to avoid corrupting the main connection
            const negotiationConnection = await this.pool.acquire();
            const sendCommand = async (data) => {
                return await negotiationConnection.sendCommand(data);
            };
            const result = await this.protocolManager.negotiateProtocol(sendCommand, this.config.preferredProtocol);
            // Keep the negotiation connection in the pool - don't close it
            this.pool.release(negotiationConnection);
            if (result.selectedProtocol !== this.config.preferredProtocol) {
                this.clientMetrics.protocolFallbacks++;
            }
            this.protocolNegotiated = true;
            // For now, always force text protocol since we know it works
            // TODO: Implement proper protocol switching
            this.protocolManager.forceProtocol('text');
            this.emit('protocolNegotiated', {
                protocol: 'text', // Always report text for now
                negotiationTime: result.negotiationTime,
                fallbackChain: result.fallbackChain
            });
            return {
                selectedProtocol: 'text',
                fallbackChain: result.fallbackChain,
                negotiationTime: result.negotiationTime
            };
        }
        catch (error) {
            this.emit('protocolNegotiationFailed', error);
            // Fallback to text protocol
            this.protocolManager.forceProtocol('text');
            this.protocolNegotiated = true;
            return {
                selectedProtocol: 'text',
                fallbackChain: ['text'],
                negotiationTime: Date.now() - startTime,
                error: `Protocol negotiation failed: ${error}`
            };
        }
    }
    /**
     * Negotiate protocol for specific cluster node
     */
    async negotiateProtocolForNode(nodeId, pool) {
        try {
            const connection = await pool.acquire();
            const sendCommand = async (data) => {
                return await connection.sendCommand(data);
            };
            // Create a separate protocol manager for this node
            const nodeProtocolManager = new manager_1.ProtocolManager();
            const result = await nodeProtocolManager.negotiateProtocol(sendCommand, this.config.preferredProtocol);
            pool.release(connection);
            // Update node metrics
            const nodeMetrics = this.nodeMetrics.get(nodeId);
            if (nodeMetrics) {
                nodeMetrics.protocolUsed = result.selectedProtocol;
                nodeMetrics.protocolNegotiationTime = result.negotiationTime;
            }
            this.emit('nodeProtocolNegotiated', nodeId, result);
        }
        catch (error) {
            this.emit('nodeProtocolNegotiationFailed', nodeId, error);
        }
    }
    /**
     * Executa um comando PING
     */
    async ping() {
        const startTime = Date.now();
        try {
            const response = await this.executeCommand('PING', []);
            this.updateMetrics(startTime, true);
            if (response.type === 'pong') {
                return 'PONG';
            }
            else if (response.type === 'error') {
                throw new Error(response.message);
            }
            throw new Error('Unexpected response to PING');
        }
        catch (error) {
            this.updateMetrics(startTime, false);
            throw error;
        }
    }
    /**
     * Armazena um valor no cache
     */
    async put(key, value, ttl) {
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
            }
            else if (response.type === 'error') {
                throw new Error(response.message);
            }
            throw new Error('Unexpected response to PUT');
        }
        catch (error) {
            this.updateMetrics(startTime, false);
            throw error;
        }
    }
    /**
     * Recupera um valor do cache
     */
    async get(key) {
        const startTime = Date.now();
        try {
            const response = await this.executeCommand('GET', [key]);
            this.updateMetrics(startTime, true);
            if (response.type === 'value') {
                return Buffer.isBuffer(response.data) ? response.data : response.data;
            }
            else if (response.type === 'null') {
                return null;
            }
            else if (response.type === 'error') {
                throw new Error(response.message);
            }
            throw new Error('Unexpected response to GET');
        }
        catch (error) {
            this.updateMetrics(startTime, false);
            throw error;
        }
    }
    /**
     * Remove um valor do cache
     */
    async del(key) {
        const startTime = Date.now();
        try {
            const response = await this.executeCommand('DEL', [key]);
            this.updateMetrics(startTime, true);
            if (response.type === 'ok') {
                return true;
            }
            else if (response.type === 'null') {
                return false;
            }
            else if (response.type === 'error') {
                throw new Error(response.message);
            }
            throw new Error('Unexpected response to DEL');
        }
        catch (error) {
            this.updateMetrics(startTime, false);
            throw error;
        }
    }
    /**
     * Define TTL para uma chave
     */
    async expire(key, ttl) {
        const startTime = Date.now();
        try {
            const response = await this.executeCommand('EXPIRE', [key, ttl.toString()]);
            this.updateMetrics(startTime, true);
            if (response.type === 'ok') {
                return true;
            }
            else if (response.type === 'null') {
                return false;
            }
            else if (response.type === 'error') {
                throw new Error(response.message);
            }
            throw new Error('Unexpected response to EXPIRE');
        }
        catch (error) {
            this.updateMetrics(startTime, false);
            throw error;
        }
    }
    /**
     * Obtém estatísticas do servidor ou cluster
     */
    async stats() {
        const startTime = Date.now();
        try {
            if (this.config.enableCluster) {
                return await this.getClusterStats();
            }
            else {
                const response = await this.executeCommand('STATS', []);
                this.updateMetrics(startTime, true);
                if (response.type === 'stats') {
                    return typeof response.data === 'string'
                        ? JSON.parse(response.data)
                        : response.data;
                }
                else if (response.type === 'error') {
                    throw new Error(response.message);
                }
                throw new Error('Unexpected response to STATS');
            }
        }
        catch (error) {
            this.updateMetrics(startTime, false);
            throw error;
        }
    }
    async getClusterStats() {
        const nodeStats = [];
        const activeNodes = Array.from(this.clusterNodes.values()).filter(n => n.active);
        // Collect stats from all active nodes
        for (const node of activeNodes) {
            try {
                const nodeId = `${node.host}:${node.port}`;
                const pool = this.nodeConnections.get(nodeId);
                if (!pool)
                    continue;
                const connection = await pool.acquire();
                const encodedCommand = protocol_1.ProtocolEncoder.encodeTextCommand('STATS', []);
                const responseBuffer = await connection.sendCommand(encodedCommand);
                pool.release(connection);
                const response = protocol_1.ProtocolDecoder.decodeTextResponse(responseBuffer);
                if (response.type === 'stats') {
                    const stats = typeof response.data === 'string'
                        ? JSON.parse(response.data)
                        : response.data;
                    nodeStats.push(stats);
                }
            }
            catch (error) {
                // Skip failed nodes
                continue;
            }
        }
        // Aggregate stats
        const aggregated = nodeStats.reduce((acc, stats) => ({
            total_operations: acc.total_operations + stats.total_operations,
            get_operations: acc.get_operations + stats.get_operations,
            put_operations: acc.put_operations + stats.put_operations,
            del_operations: acc.del_operations + stats.del_operations,
            cache_hits: acc.cache_hits + stats.cache_hits,
            cache_misses: acc.cache_misses + stats.cache_misses,
            hit_ratio: (acc.hit_ratio + stats.hit_ratio) / 2, // Average
            memory_usage: acc.memory_usage + stats.memory_usage,
            active_connections: acc.active_connections + stats.active_connections,
            uptime_seconds: Math.max(acc.uptime_seconds, stats.uptime_seconds)
        }), {
            total_operations: 0,
            get_operations: 0,
            put_operations: 0,
            del_operations: 0,
            cache_hits: 0,
            cache_misses: 0,
            hit_ratio: 0,
            memory_usage: 0,
            active_connections: 0,
            uptime_seconds: 0
        });
        // Add cluster-specific metrics
        const clusterStats = {
            ...aggregated,
            cluster_nodes: this.clusterNodes.size,
            cluster_active_nodes: activeNodes.length,
            cluster_throughput: this.clientMetrics.totalRequests / (Date.now() / 1000), // Rough estimate
            cluster_load_balance_efficiency: this.clientMetrics.loadBalancingEfficiency || 0,
            cluster_fault_tolerance_rate: activeNodes.length / this.clusterNodes.size,
            cluster_network_latency_p99_ms: this.clientMetrics.averageLatency
        };
        return clusterStats;
    }
    /**
     * Obtém métricas do servidor
     */
    async serverMetrics() {
        const startTime = Date.now();
        try {
            const response = await this.executeCommand('METRICS', []);
            this.updateMetrics(startTime, true);
            if (response.type === 'stats') {
                return typeof response.data === 'string'
                    ? JSON.parse(response.data)
                    : response.data;
            }
            else if (response.type === 'error') {
                throw new Error(response.message);
            }
            throw new Error('Unexpected response to METRICS');
        }
        catch (error) {
            this.updateMetrics(startTime, false);
            throw error;
        }
    }
    /**
     * Cria um pipeline para execução em lote
     */
    pipeline() {
        const pool = this.config.enableCluster ? this.nodeConnections.values().next().value : this.pool;
        return new pipeline_1.CrabCachePipeline(pool, // Hack para compatibilidade
        this.config.useBinaryProtocol);
    }
    /**
     * Cria um batch de pipelines
     */
    createBatch() {
        const pool = this.config.enableCluster ? this.nodeConnections.values().next().value : this.pool;
        return new pipeline_1.PipelineBatch(pool, // Hack para compatibilidade
        this.config.useBinaryProtocol, this.config.pipelineBatchSize);
    }
    /**
     * Executa múltiplos comandos usando pipelining
     */
    async multi(commands) {
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
                        pipeline.put(cmd.args[0], cmd.args[1], cmd.args[2] ? parseInt(cmd.args[2].toString()) : undefined);
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
        }
        catch (error) {
            this.updateMetrics(startTime, false);
            throw error;
        }
    }
    /**
     * Executa um comando individual
     */
    async executeCommand(command, args) {
        let connection;
        let pool;
        // Force single node mode for debugging
        pool = this.pool;
        connection = await pool.acquire();
        try {
            // Skip protocol negotiation in executeCommand
            // Protocol should already be set to text
            // For now, always use fallback encoding/decoding since we know text protocol works
            // TODO: Fix protocol manager integration
            const encodedCommand = this.fallbackEncodeCommand(command, args);
            // Update protocol usage metrics
            this.updateProtocolUsageMetrics();
            // Send command
            const responseBuffer = await connection.sendCommand(encodedCommand);
            // Decode response using fallback
            const response = this.fallbackDecodeResponse(responseBuffer);
            return response;
        }
        finally {
            pool.release(connection);
        }
    }
    /**
     * Fallback encoding when protocol is not negotiated
     */
    fallbackEncodeCommand(command, args) {
        if (this.config.useBinaryProtocol) {
            return protocol_1.ProtocolEncoder.encodeBinaryCommand(command, args);
        }
        else {
            return protocol_1.ProtocolEncoder.encodeTextCommand(command, args);
        }
    }
    /**
     * Fallback decoding when protocol is not negotiated
     */
    fallbackDecodeResponse(responseBuffer) {
        if (this.config.useBinaryProtocol) {
            return protocol_1.ProtocolDecoder.decodeBinaryResponse(responseBuffer);
        }
        else {
            return protocol_1.ProtocolDecoder.decodeTextResponse(responseBuffer);
        }
    }
    /**
     * Update protocol usage metrics
     */
    updateProtocolUsageMetrics() {
        const currentProtocol = this.protocolManager.getCurrentProtocol();
        switch (currentProtocol) {
            case 'toon':
                this.clientMetrics.toonProtocolUsage++;
                break;
            case 'protobuf':
                this.clientMetrics.protobufProtocolUsage++;
                break;
            case 'binary':
                this.clientMetrics.binaryProtocolUsage++;
                break;
            case 'text':
                // Text usage is implicit (total - others)
                break;
        }
        // Update compression ratio
        const protocolStats = this.protocolManager.getStats();
        this.clientMetrics.averageCompressionRatio = protocolStats.compressionRatio;
    }
    /**
     * Atualiza métricas do cliente
     */
    updateMetrics(startTime, success) {
        const latency = Date.now() - startTime;
        this.clientMetrics.totalRequests++;
        this.latencySum += latency;
        if (success) {
            this.clientMetrics.successfulRequests++;
        }
        else {
            this.clientMetrics.failedRequests++;
        }
        this.clientMetrics.averageLatency = this.latencySum / this.clientMetrics.totalRequests;
        // Update load balancing efficiency (simplified calculation)
        if (this.config.enableCluster) {
            const activeNodes = Array.from(this.clusterNodes.values()).filter(n => n.active);
            if (activeNodes.length > 0) {
                this.clientMetrics.loadBalancingEfficiency =
                    this.clientMetrics.successfulRequests / this.clientMetrics.totalRequests;
            }
        }
    }
    /**
     * Retorna métricas do cliente
     */
    getClientMetrics() {
        return { ...this.clientMetrics };
    }
    /**
     * Retorna métricas do cluster
     */
    getClusterMetrics() {
        if (!this.config.enableCluster) {
            return null;
        }
        const activeNodes = Array.from(this.clusterNodes.values()).filter(n => n.active);
        return {
            totalNodes: this.clusterNodes.size,
            activeNodes: activeNodes.length,
            totalRequests: this.clientMetrics.totalRequests,
            distributedRequests: this.clientMetrics.clusterRequests || 0,
            loadBalancingStrategy: this.config.loadBalancingStrategy,
            loadBalancingEfficiency: this.clientMetrics.loadBalancingEfficiency || 0,
            failoverEvents: this.clientMetrics.failoverEvents || 0,
            nodeMetrics: Array.from(this.nodeMetrics.values())
        };
    }
    /**
     * Retorna métricas do pool de conexões
     */
    getPoolMetrics() {
        if (this.config.enableCluster) {
            // Aggregate metrics from all node pools
            const allMetrics = Array.from(this.nodeConnections.values()).map(pool => pool.getMetrics());
            return allMetrics.reduce((acc, metrics) => ({
                activeConnections: acc.activeConnections + metrics.activeConnections,
                idleConnections: acc.idleConnections + metrics.idleConnections,
                totalCreated: acc.totalCreated + metrics.totalCreated,
                poolHits: acc.poolHits + metrics.poolHits,
                poolMisses: acc.poolMisses + metrics.poolMisses,
                healthCheckFailures: acc.healthCheckFailures + metrics.healthCheckFailures
            }), {
                activeConnections: 0,
                idleConnections: 0,
                totalCreated: 0,
                poolHits: 0,
                poolMisses: 0,
                healthCheckFailures: 0
            });
        }
        else {
            return this.pool.getMetrics();
        }
    }
    /**
     * Retorna informações sobre o status do cliente
     */
    getStatus() {
        const status = {
            connected: this.config.enableCluster
                ? Array.from(this.clusterNodes.values()).some(n => n.active)
                : this.pool.getStatus().totalConnections > 0,
            clusterMode: this.config.enableCluster,
            config: this.config,
            clientMetrics: this.getClientMetrics(),
            poolMetrics: this.getPoolMetrics(),
            clusterMetrics: this.getClusterMetrics(),
            protocolInfo: this.getProtocolInfo()
        };
        if (!this.config.enableCluster) {
            status.poolStatus = this.pool.getStatus();
        }
        return status;
    }
    /**
     * Get protocol information
     */
    getProtocolInfo() {
        const protocolInfo = this.protocolManager.getProtocolInfo();
        return {
            current: protocolInfo.current,
            negotiated: this.protocolNegotiated && protocolInfo.negotiated, // Both must be true
            capabilities: Object.keys(protocolInfo.capabilities).filter(key => protocolInfo.capabilities[key]),
            stats: protocolInfo.stats,
            toonStats: protocolInfo.toonStats,
            protobufStats: protocolInfo.protobufStats,
            config: {
                preferred: this.config.preferredProtocol,
                autoNegotiate: this.config.autoNegotiateProtocol,
                fallbackEnabled: this.config.enableProtocolFallback,
                toonEnabled: this.config.enableToonProtocol,
                protobufEnabled: this.config.enableProtobufProtocol
            }
        };
    }
    /**
     * Get protocol statistics
     */
    getProtocolStats() {
        return this.protocolManager.getStats();
    }
    /**
     * Force protocol selection (skip negotiation)
     */
    forceProtocol(protocol) {
        this.protocolManager.forceProtocol(protocol);
        this.protocolNegotiated = true;
        this.emit('protocolForced', protocol);
    }
    /**
     * Reset protocol state and renegotiate
     */
    async resetProtocol() {
        this.protocolManager.reset();
        this.protocolNegotiated = false;
        if (this.config.autoNegotiateProtocol) {
            return await this.negotiateProtocol();
        }
        else {
            return {
                selectedProtocol: 'text',
                fallbackChain: ['text'],
                negotiationTime: 0
            };
        }
    }
    /**
     * Fecha todas as conexões
     */
    async disconnect() {
        try {
            // Stop health checks
            if (this.healthCheckInterval) {
                clearInterval(this.healthCheckInterval);
                this.healthCheckInterval = undefined;
            }
            if (this.config.enableCluster) {
                // Close all node connections
                const closePromises = Array.from(this.nodeConnections.values()).map(pool => pool.close());
                await Promise.allSettled(closePromises);
                this.emit('clusterDisconnected');
            }
            else {
                await this.pool.close();
                this.emit('disconnected');
            }
        }
        catch (error) {
            this.emit('error', error);
            throw error;
        }
    }
}
exports.CrabCacheClient = CrabCacheClient;
//# sourceMappingURL=client.js.map