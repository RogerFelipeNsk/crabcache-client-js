"use strict";
/**
 * Protocol Manager - Automatic protocol negotiation and fallback
 * Supports TOON, Protobuf, and Text protocols with intelligent selection
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProtocolManager = void 0;
const toon_1 = require("./toon");
const protobuf_1 = require("./protobuf");
const protocol_1 = require("../protocol");
class ProtocolManager {
    constructor() {
        this.currentProtocol = 'text';
        this.negotiated = false;
        this.stats = {
            selectedProtocol: 'text',
            negotiationAttempts: 0,
            successfulNegotiations: 0,
            fallbackCount: 0,
            toonUsage: 0,
            protobufUsage: 0,
            binaryUsage: 0,
            textUsage: 0,
            averageNegotiationTime: 0,
            compressionRatio: 1.0
        };
        this.negotiationTimeSum = 0;
        this.toonProtocol = new toon_1.ToonProtocol();
        this.protobufProtocol = new protobuf_1.ProtobufProtocol();
    }
    /**
     * Negotiate protocol with server
     * Tries TOON -> Protobuf -> Binary -> Text (fallback chain)
     */
    async negotiateProtocol(sendCommand, preferredProtocol) {
        const startTime = Date.now();
        this.stats.negotiationAttempts++;
        const result = {
            selectedProtocol: 'text',
            fallbackChain: [],
            negotiationTime: 0
        };
        try {
            // Define negotiation order based on preference
            const negotiationOrder = this.getNegotiationOrder(preferredProtocol);
            for (const protocol of negotiationOrder) {
                result.fallbackChain.push(protocol);
                try {
                    const success = await this.tryProtocol(protocol, sendCommand, result);
                    if (success) {
                        this.currentProtocol = protocol;
                        this.negotiated = true;
                        this.stats.successfulNegotiations++;
                        result.selectedProtocol = protocol;
                        break;
                    }
                }
                catch (error) {
                    // Continue to next protocol
                    continue;
                }
            }
            // Update stats
            result.negotiationTime = Date.now() - startTime;
            this.negotiationTimeSum += result.negotiationTime;
            this.stats.averageNegotiationTime = this.negotiationTimeSum / this.stats.negotiationAttempts;
            if (result.selectedProtocol !== (preferredProtocol || 'toon')) {
                this.stats.fallbackCount++;
            }
            return result;
        }
        catch (error) {
            result.error = `Protocol negotiation failed: ${error}`;
            result.negotiationTime = Date.now() - startTime;
            return result;
        }
    }
    /**
     * Get negotiation order based on preference
     */
    getNegotiationOrder(_preferredProtocol) {
        // For now, always use text protocol since TOON negotiation causes connection issues
        // TODO: Fix TOON negotiation connection handling
        return ['text'];
    }
    /**
     * Try specific protocol negotiation
     */
    async tryProtocol(protocol, sendCommand, _result) {
        switch (protocol) {
            case 'toon':
                return await this.tryToonNegotiation(sendCommand, _result);
            case 'protobuf':
                return await this.tryProtobufNegotiation(sendCommand, _result);
            case 'binary':
                return await this.tryBinaryNegotiation(sendCommand, _result);
            case 'text':
                return await this.tryTextNegotiation(sendCommand, _result);
            default:
                return false;
        }
    }
    /**
     * Try TOON protocol negotiation
     */
    async tryToonNegotiation(_sendCommand, _result) {
        try {
            // const negotiationPacket = ToonProtocol.createNegotiationPacket();
            // const response = await sendCommand(negotiationPacket);
            // const toonResult = ToonProtocol.parseNegotiationResponse(response);
            // result.toonResult = toonResult;
            // if (toonResult.success && !toonResult.fallbackToText) {
            //   // Server responded with TOON magic, but CrabCache server doesn't actually
            //   // switch to TOON protocol - it just acknowledges and continues with text
            //   // So we need to force text protocol for compatibility
            //   return false; // Force fallback to text
            // }
            return false;
        }
        catch (error) {
            // result.toonResult = {
            //   success: false,
            //   error: `TOON negotiation error: ${error}`
            // };
            return false;
        }
    }
    /**
     * Try Protobuf protocol negotiation
     */
    async tryProtobufNegotiation(_sendCommand, _result) {
        try {
            // const negotiationPacket = ProtobufProtocol.createNegotiationPacket();
            // const response = await sendCommand(negotiationPacket);
            // const protobufResult = ProtobufProtocol.parseNegotiationResponse(response);
            // result.protobufResult = protobufResult;
            // if (protobufResult.success && !protobufResult.fallbackToText) {
            //   return true;
            // }
            return false;
        }
        catch (error) {
            // result.protobufResult = {
            //   success: false,
            //   error: `Protobuf negotiation error: ${error}`
            // };
            return false;
        }
    }
    /**
     * Try binary protocol negotiation
     */
    async tryBinaryNegotiation(_sendCommand, _result) {
        try {
            // Try a simple binary PING command
            // const pingCommand = ProtocolEncoder.encodeBinaryCommand('PING', []);
            // const response = await sendCommand(pingCommand);
            // const decoded = ProtocolDecoder.decodeBinaryResponse(response);
            // return decoded.type === 'pong';
            return false;
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Try text protocol negotiation
     */
    async tryTextNegotiation(_sendCommand, _result) {
        try {
            // Text protocol always works as fallback
            // Don't send any negotiation packet for text protocol
            // Just return true to indicate text protocol is available
            return true;
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Encode command using current protocol
     */
    encodeCommand(command, args = []) {
        this.updateUsageStats();
        switch (this.currentProtocol) {
            case 'toon':
                return this.toonProtocol.encodeCommand(command, args);
            case 'protobuf':
                return this.protobufProtocol.encodeCommand(command, args);
            case 'binary':
                return protocol_1.ProtocolEncoder.encodeBinaryCommand(command, args);
            case 'text':
            default:
                return protocol_1.ProtocolEncoder.encodeTextCommand(command, args);
        }
    }
    /**
     * Decode response using current protocol
     */
    decodeResponse(data) {
        switch (this.currentProtocol) {
            case 'toon':
                return this.toonProtocol.decodeResponse(data);
            case 'protobuf':
                return this.protobufProtocol.decodeResponse(data);
            case 'binary':
                return protocol_1.ProtocolDecoder.decodeBinaryResponse(data);
            case 'text':
            default:
                return protocol_1.ProtocolDecoder.decodeTextResponse(data);
        }
    }
    /**
     * Update usage statistics
     */
    updateUsageStats() {
        switch (this.currentProtocol) {
            case 'toon':
                this.stats.toonUsage++;
                break;
            case 'protobuf':
                this.stats.protobufUsage++;
                break;
            case 'binary':
                this.stats.binaryUsage++;
                break;
            case 'text':
                this.stats.textUsage++;
                break;
        }
    }
    /**
     * Get current protocol
     */
    getCurrentProtocol() {
        return this.currentProtocol;
    }
    /**
     * Check if protocol has been negotiated
     */
    isNegotiated() {
        return this.negotiated;
    }
    /**
     * Force protocol selection (skip negotiation)
     */
    forceProtocol(protocol) {
        this.currentProtocol = protocol;
        this.negotiated = true;
        this.stats.selectedProtocol = protocol;
    }
    /**
     * Reset protocol state
     */
    reset() {
        this.currentProtocol = 'text';
        this.negotiated = false;
        this.toonProtocol.reset();
    }
    /**
     * Get protocol statistics
     */
    getStats() {
        // Update compression ratio based on current protocol
        if (this.currentProtocol === 'toon') {
            const toonStats = this.toonProtocol.getStats();
            this.stats.compressionRatio = toonStats.compressionRatio;
        }
        else if (this.currentProtocol === 'protobuf') {
            this.stats.compressionRatio = 0.67; // Protobuf typically 33% smaller than JSON
        }
        else if (this.currentProtocol === 'binary') {
            this.stats.compressionRatio = 0.8; // Binary typically 20% smaller than text
        }
        else {
            this.stats.compressionRatio = 1.0; // Text protocol baseline
        }
        this.stats.selectedProtocol = this.currentProtocol;
        return { ...this.stats };
    }
    /**
     * Get detailed protocol information
     */
    getProtocolInfo() {
        return {
            current: this.currentProtocol,
            negotiated: this.negotiated,
            capabilities: {
                toon: true,
                protobuf: true,
                binary: true,
                text: true
            },
            stats: this.getStats(),
            toonStats: this.toonProtocol.getStats(),
            protobufStats: this.protobufProtocol.getStats()
        };
    }
}
exports.ProtocolManager = ProtocolManager;
//# sourceMappingURL=manager.js.map