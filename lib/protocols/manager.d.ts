/**
 * Protocol Manager - Automatic protocol negotiation and fallback
 * Supports TOON, Protobuf, and Text protocols with intelligent selection
 */
import { Buffer } from 'buffer';
import { ToonNegotiationResult } from './toon';
import { ProtobufNegotiationResult } from './protobuf';
export type ProtocolType = 'toon' | 'protobuf' | 'binary' | 'text';
export interface ProtocolNegotiationResult {
    selectedProtocol: ProtocolType;
    toonResult?: ToonNegotiationResult;
    protobufResult?: ProtobufNegotiationResult;
    fallbackChain: ProtocolType[];
    negotiationTime: number;
    error?: string;
}
export interface ProtocolStats {
    selectedProtocol: ProtocolType;
    negotiationAttempts: number;
    successfulNegotiations: number;
    fallbackCount: number;
    toonUsage: number;
    protobufUsage: number;
    binaryUsage: number;
    textUsage: number;
    averageNegotiationTime: number;
    compressionRatio: number;
}
export declare class ProtocolManager {
    private toonProtocol;
    private protobufProtocol;
    private currentProtocol;
    private negotiated;
    private stats;
    private negotiationTimeSum;
    constructor();
    /**
     * Negotiate protocol with server
     * Tries TOON -> Protobuf -> Binary -> Text (fallback chain)
     */
    negotiateProtocol(sendCommand: (data: Buffer) => Promise<Buffer>, preferredProtocol?: ProtocolType): Promise<ProtocolNegotiationResult>;
    /**
     * Get negotiation order based on preference
     */
    private getNegotiationOrder;
    /**
     * Try specific protocol negotiation
     */
    private tryProtocol;
    /**
     * Try TOON protocol negotiation
     */
    private tryToonNegotiation;
    /**
     * Try Protobuf protocol negotiation
     */
    private tryProtobufNegotiation;
    /**
     * Try binary protocol negotiation
     */
    private tryBinaryNegotiation;
    /**
     * Try text protocol negotiation
     */
    private tryTextNegotiation;
    /**
     * Encode command using current protocol
     */
    encodeCommand(command: string, args?: (string | Buffer)[]): Buffer;
    /**
     * Decode response using current protocol
     */
    decodeResponse(data: Buffer): any;
    /**
     * Update usage statistics
     */
    private updateUsageStats;
    /**
     * Get current protocol
     */
    getCurrentProtocol(): ProtocolType;
    /**
     * Check if protocol has been negotiated
     */
    isNegotiated(): boolean;
    /**
     * Force protocol selection (skip negotiation)
     */
    forceProtocol(protocol: ProtocolType): void;
    /**
     * Reset protocol state
     */
    reset(): void;
    /**
     * Get protocol statistics
     */
    getStats(): ProtocolStats;
    /**
     * Get detailed protocol information
     */
    getProtocolInfo(): {
        current: ProtocolType;
        negotiated: boolean;
        capabilities: {
            toon: boolean;
            protobuf: boolean;
            binary: boolean;
            text: boolean;
        };
        stats: ProtocolStats;
        toonStats?: any;
        protobufStats?: any;
    };
}
//# sourceMappingURL=manager.d.ts.map