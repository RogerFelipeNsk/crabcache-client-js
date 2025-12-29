/**
 * TOON Protocol Implementation for CrabCache Client
 * TOON (Tiny Optimized Object Notation) - World's most efficient binary protocol
 */
import { Buffer } from 'buffer';
export declare const TOON_MAGIC: Buffer<ArrayBuffer>;
export declare const TOON_VERSION = 1;
export declare const TOON_FLAGS: {
    ZERO_COPY: number;
    STRING_INTERNING: number;
    SIMD_OPTIMIZED: number;
    ULTRA_COMPRESSION: number;
    ALL_ENABLED: number;
};
export declare const TOON_COMMANDS: {
    PING: number;
    PUT: number;
    GET: number;
    DEL: number;
    EXPIRE: number;
    STATS: number;
    METRICS: number;
};
export declare const TOON_RESPONSES: {
    OK: number;
    PONG: number;
    NULL: number;
    ERROR: number;
    VALUE: number;
    STATS: number;
};
export interface ToonNegotiationResult {
    success: boolean;
    serverVersion?: number;
    serverFlags?: number;
    fallbackToText?: boolean;
    error?: string;
}
export declare class ToonProtocol {
    private stringInternMap;
    private stringInternCounter;
    private zeroCoopyEnabled;
    private simdOptimized;
    /**
     * Create TOON protocol negotiation packet
     */
    static createNegotiationPacket(): Buffer;
    /**
     * Parse TOON negotiation response
     */
    static parseNegotiationResponse(response: Buffer): ToonNegotiationResult;
    /**
     * Encode command using TOON protocol (ultra-compact)
     */
    encodeCommand(command: string, args?: (string | Buffer)[]): Buffer;
    /**
     * Decode TOON response (ultra-efficient)
     */
    decodeResponse(data: Buffer): any;
    /**
     * Encode string with interning for ultra-compression
     */
    private encodeString;
    /**
     * Encode length using ultra-compact varint
     */
    private encodeCompactLength;
    /**
     * Decode compact length
     */
    private decodeCompactLength;
    /**
     * Encode number using compact representation
     */
    private encodeCompactNumber;
    /**
     * Standard varint encoding (fallback)
     */
    private encodeVarint;
    /**
     * Standard varint decoding (fallback)
     */
    private decodeVarint;
    /**
     * Get protocol statistics
     */
    getStats(): {
        stringInternMapSize: number;
        zeroCoopyEnabled: boolean;
        simdOptimized: boolean;
        compressionRatio: number;
    };
    /**
     * Reset protocol state
     */
    reset(): void;
}
//# sourceMappingURL=toon.d.ts.map