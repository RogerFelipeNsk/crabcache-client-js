/**
 * Protobuf Protocol Implementation for CrabCache Client
 * Native Protobuf support with zero-copy optimizations
 */
import { Buffer } from 'buffer';
export declare const PROTOBUF_MAGIC: Buffer<ArrayBuffer>;
export declare const PROTOBUF_VERSION = 1;
export declare const PROTOBUF_FLAGS: {
    ZERO_COPY: number;
    COMPRESSION: number;
    RESERVED: number;
    RESERVED2: number;
};
export interface ProtobufNegotiationResult {
    success: boolean;
    serverVersion?: number;
    serverFlags?: number;
    fallbackToText?: boolean;
    error?: string;
}
export declare class ProtobufProtocol {
    private compressionEnabled;
    private zeroCopyEnabled;
    /**
     * Create Protobuf protocol negotiation packet
     */
    static createNegotiationPacket(): Buffer;
    /**
     * Parse Protobuf negotiation response
     */
    static parseNegotiationResponse(response: Buffer): ProtobufNegotiationResult;
    /**
     * Encode command using Protobuf-wrapped format
     * This wraps text commands in Protobuf envelope for compatibility
     */
    encodeCommand(command: string, args?: (string | Buffer)[]): Buffer;
    /**
     * Create text command (for Protobuf wrapping)
     */
    private createTextCommand;
    /**
     * Decode Protobuf response
     */
    decodeResponse(data: Buffer): any;
    /**
     * Parse text response (wrapped in Protobuf or direct)
     */
    private parseTextResponse;
    /**
     * Encode varint
     */
    private encodeVarint;
    /**
     * Decode varint
     */
    private decodeVarint;
    /**
     * Get protocol statistics
     */
    getStats(): {
        compressionEnabled: boolean;
        zeroCopyEnabled: boolean;
        protocolVersion: number;
    };
    /**
     * Enable/disable compression
     */
    setCompression(enabled: boolean): void;
    /**
     * Enable/disable zero-copy
     */
    setZeroCopy(enabled: boolean): void;
}
//# sourceMappingURL=protobuf.d.ts.map