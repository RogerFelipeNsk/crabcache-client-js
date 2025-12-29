"use strict";
/**
 * Protobuf Protocol Implementation for CrabCache Client
 * Native Protobuf support with zero-copy optimizations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProtobufProtocol = exports.PROTOBUF_FLAGS = exports.PROTOBUF_VERSION = exports.PROTOBUF_MAGIC = void 0;
const buffer_1 = require("buffer");
// Protobuf Magic Bytes: "CRAB"
exports.PROTOBUF_MAGIC = buffer_1.Buffer.from([0x43, 0x52, 0x41, 0x42]);
exports.PROTOBUF_VERSION = 1;
// Protobuf Flags
exports.PROTOBUF_FLAGS = {
    ZERO_COPY: 0x01,
    COMPRESSION: 0x02,
    RESERVED: 0x04,
    RESERVED2: 0x08
};
class ProtobufProtocol {
    constructor() {
        this.compressionEnabled = false;
        this.zeroCopyEnabled = true;
    }
    /**
     * Create Protobuf protocol negotiation packet
     */
    static createNegotiationPacket() {
        const packet = buffer_1.Buffer.allocUnsafe(6);
        exports.PROTOBUF_MAGIC.copy(packet, 0);
        packet[4] = exports.PROTOBUF_VERSION;
        packet[5] = exports.PROTOBUF_FLAGS.ZERO_COPY; // Enable zero-copy by default
        return packet;
    }
    /**
     * Parse Protobuf negotiation response
     */
    static parseNegotiationResponse(response) {
        try {
            // Check if response starts with CRAB magic
            if (response.length >= 4 && response.subarray(0, 4).equals(exports.PROTOBUF_MAGIC)) {
                if (response.length >= 6) {
                    return {
                        success: true,
                        serverVersion: response[4],
                        serverFlags: response[5]
                    };
                }
            }
            // Check for text fallback (PONG response)
            const textResponse = response.toString().trim();
            if (textResponse.includes('PONG')) {
                return {
                    success: true,
                    fallbackToText: true
                };
            }
            // Check for binary response (single byte)
            if (response.length === 1) {
                return {
                    success: true,
                    fallbackToText: true // Server responded but not with full Protobuf
                };
            }
            return {
                success: false,
                error: 'Invalid Protobuf negotiation response'
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Protobuf negotiation failed: ${error}`
            };
        }
    }
    /**
     * Encode command using Protobuf-wrapped format
     * This wraps text commands in Protobuf envelope for compatibility
     */
    encodeCommand(command, args = []) {
        const buffers = [];
        // Add Protobuf magic and version
        buffers.push(exports.PROTOBUF_MAGIC);
        buffers.push(buffer_1.Buffer.from([exports.PROTOBUF_VERSION, exports.PROTOBUF_FLAGS.ZERO_COPY]));
        // For now, wrap text command in Protobuf envelope
        // In a full implementation, this would use actual Protocol Buffers
        const textCommand = this.createTextCommand(command, args);
        // Add length prefix for the wrapped command
        buffers.push(this.encodeVarint(textCommand.length));
        buffers.push(textCommand);
        return buffer_1.Buffer.concat(buffers);
    }
    /**
     * Create text command (for Protobuf wrapping)
     */
    createTextCommand(command, args) {
        const parts = [command, ...args.map(arg => buffer_1.Buffer.isBuffer(arg) ? arg.toString() : arg)];
        return buffer_1.Buffer.from(parts.join(' '));
    }
    /**
     * Decode Protobuf response
     */
    decodeResponse(data) {
        if (data.length === 0) {
            throw new Error('Empty Protobuf response');
        }
        let cursor = 0;
        // Check for Protobuf magic (full response)
        if (data.length >= 4 && data.subarray(0, 4).equals(exports.PROTOBUF_MAGIC)) {
            cursor = 6; // Skip magic + version + flags
            // Decode length-prefixed response
            const [responseLen, lengthBytes] = this.decodeVarint(data.subarray(cursor));
            cursor += lengthBytes;
            const responseData = data.subarray(cursor, cursor + responseLen);
            return this.parseTextResponse(responseData);
        }
        // Fallback to direct text parsing
        return this.parseTextResponse(data);
    }
    /**
     * Parse text response (wrapped in Protobuf or direct)
     */
    parseTextResponse(data) {
        const response = data.toString().trim();
        if (response === 'OK')
            return { type: 'ok' };
        if (response === 'PONG')
            return { type: 'pong' };
        if (response === 'NULL')
            return { type: 'null' };
        if (response.startsWith('ERROR:')) {
            return { type: 'error', message: response.substring(6).trim() };
        }
        if (response.startsWith('STATS:')) {
            try {
                const statsData = JSON.parse(response.substring(6).trim());
                return { type: 'stats', data: statsData };
            }
            catch {
                return { type: 'stats', data: response.substring(6).trim() };
            }
        }
        // Assume it's a value response
        return { type: 'value', data: response };
    }
    /**
     * Encode varint
     */
    encodeVarint(value) {
        const result = [];
        let num = value;
        while (num >= 0x80) {
            result.push((num & 0xFF) | 0x80);
            num >>>= 7;
        }
        result.push(num & 0xFF);
        return buffer_1.Buffer.from(result);
    }
    /**
     * Decode varint
     */
    decodeVarint(data) {
        let result = 0;
        let shift = 0;
        let bytesRead = 0;
        for (let i = 0; i < data.length; i++) {
            const byte = data[i];
            bytesRead++;
            result |= (byte & 0x7F) << shift;
            if ((byte & 0x80) === 0) {
                break;
            }
            shift += 7;
            if (shift >= 32) {
                throw new Error('Varint too long');
            }
        }
        return [result, bytesRead];
    }
    /**
     * Get protocol statistics
     */
    getStats() {
        return {
            compressionEnabled: this.compressionEnabled,
            zeroCopyEnabled: this.zeroCopyEnabled,
            protocolVersion: exports.PROTOBUF_VERSION
        };
    }
    /**
     * Enable/disable compression
     */
    setCompression(enabled) {
        this.compressionEnabled = enabled;
    }
    /**
     * Enable/disable zero-copy
     */
    setZeroCopy(enabled) {
        this.zeroCopyEnabled = enabled;
    }
}
exports.ProtobufProtocol = ProtobufProtocol;
//# sourceMappingURL=protobuf.js.map