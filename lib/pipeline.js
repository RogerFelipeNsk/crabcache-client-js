"use strict";
/**
 * Implementação de pipelining para CrabCache
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PipelineBatch = exports.CrabCachePipeline = void 0;
const protocol_1 = require("./protocol");
class CrabCachePipeline {
    constructor(connection, useBinaryProtocol = false) {
        this.commands = [];
        this.connection = connection;
        this.useBinaryProtocol = useBinaryProtocol;
    }
    /**
     * Adiciona um comando PING ao pipeline
     */
    ping() {
        this.commands.push({ command: 'PING', args: [] });
        return this;
    }
    /**
     * Adiciona um comando PUT ao pipeline
     */
    put(key, value, ttl) {
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
    get(key) {
        this.commands.push({ command: 'GET', args: [key] });
        return this;
    }
    /**
     * Adiciona um comando DEL ao pipeline
     */
    del(key) {
        this.commands.push({ command: 'DEL', args: [key] });
        return this;
    }
    /**
     * Adiciona um comando EXPIRE ao pipeline
     */
    expire(key, ttl) {
        this.commands.push({ command: 'EXPIRE', args: [key, ttl.toString()] });
        return this;
    }
    /**
     * Adiciona um comando STATS ao pipeline
     */
    stats() {
        this.commands.push({ command: 'STATS', args: [] });
        return this;
    }
    /**
     * Adiciona um comando METRICS ao pipeline
     */
    serverMetrics() {
        this.commands.push({ command: 'METRICS', args: [] });
        return this;
    }
    /**
     * Retorna o número de comandos no pipeline
     */
    length() {
        return this.commands.length;
    }
    /**
     * Limpa todos os comandos do pipeline
     */
    clear() {
        this.commands = [];
        return this;
    }
    /**
     * Executa todos os comandos do pipeline
     */
    async execute() {
        if (this.commands.length === 0) {
            return [];
        }
        // Se connection é na verdade um pool, precisamos adquirir uma conexão
        let actualConnection;
        let shouldRelease = false;
        if (typeof this.connection.acquire === 'function') {
            // É um pool
            actualConnection = await this.connection.acquire();
            shouldRelease = true;
        }
        else {
            // É uma conexão direta
            actualConnection = this.connection;
        }
        try {
            // Codificar todos os comandos
            const encodedCommands = this.commands.map(cmd => {
                if (this.useBinaryProtocol) {
                    return protocol_1.ProtocolEncoder.encodeBinaryCommand(cmd.command, cmd.args);
                }
                else {
                    return protocol_1.ProtocolEncoder.encodeTextCommand(cmd.command, cmd.args);
                }
            });
            // Enviar todos os comandos de uma vez
            const responses = await actualConnection.sendPipelineCommands(encodedCommands);
            // Decodificar todas as respostas
            const results = [];
            for (let i = 0; i < responses.length; i++) {
                try {
                    const decoded = this.useBinaryProtocol
                        ? protocol_1.ProtocolDecoder.decodeBinaryResponse(responses[i])
                        : protocol_1.ProtocolDecoder.decodeTextResponse(responses[i]);
                    results.push(this.convertToResponse(decoded));
                }
                catch (error) {
                    results.push({
                        success: false,
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
            }
            // Limpar comandos após execução
            this.clear();
            return results;
        }
        catch (error) {
            // Limpar comandos mesmo em caso de erro
            this.clear();
            throw error;
        }
        finally {
            // Liberar conexão se foi adquirida do pool
            if (shouldRelease && typeof this.connection.release === 'function') {
                this.connection.release(actualConnection);
            }
        }
    }
    /**
     * Executa o pipeline em lotes para otimizar performance
     */
    async executeBatched(batchSize = 100) {
        if (this.commands.length === 0) {
            return [];
        }
        const allResults = [];
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
    convertToResponse(decoded) {
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
exports.CrabCachePipeline = CrabCachePipeline;
class PipelineBatch {
    constructor(connection, useBinaryProtocol = false, maxBatchSize = 1000) {
        this.pipelines = [];
        this.connection = connection;
        this.useBinaryProtocol = useBinaryProtocol;
        this.maxBatchSize = maxBatchSize;
    }
    /**
     * Cria um novo pipeline
     */
    createPipeline() {
        const pipeline = new CrabCachePipeline(this.connection, this.useBinaryProtocol);
        this.pipelines.push(pipeline);
        return pipeline;
    }
    /**
     * Executa todos os pipelines em paralelo
     */
    async executeAll() {
        const promises = this.pipelines.map(pipeline => pipeline.executeBatched(this.maxBatchSize));
        const results = await Promise.all(promises);
        this.pipelines = []; // Limpar após execução
        return results;
    }
    /**
     * Executa todos os pipelines sequencialmente
     */
    async executeSequential() {
        const results = [];
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
    count() {
        return this.pipelines.length;
    }
    /**
     * Retorna o número total de comandos em todos os pipelines
     */
    totalCommands() {
        return this.pipelines.reduce((total, pipeline) => total + pipeline.length(), 0);
    }
}
exports.PipelineBatch = PipelineBatch;
//# sourceMappingURL=pipeline.js.map