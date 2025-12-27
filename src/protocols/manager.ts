/**
 * Protocol Manager - Automatic protocol negotiation and fallback
 * Supports TOON, Protobuf, and Text protocols with intelligent selection
 */

import { Buffer } from 'buffer';
import { ToonProtocol, ToonNegotiationResult } from './toon';
import { ProtobufProtocol, ProtobufNegotiationResult } from './protobuf';
import { ProtocolEncoder, ProtocolDecoder } from '../protocol';

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

export class ProtocolManager {
  private toonProtocol: ToonProtocol;
  private protobufProtocol: ProtobufProtocol;
  private currentProtocol: ProtocolType = 'text';
  private negotiated: boolean = false;
  private stats: ProtocolStats = {
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
  private negotiationTimeSum: number = 0;

  constructor() {
    this.toonProtocol = new ToonProtocol();
    this.protobufProtocol = new ProtobufProtocol();
  }

  /**
   * Negotiate protocol with server
   * Tries TOON -> Protobuf -> Binary -> Text (fallback chain)
   */
  async negotiateProtocol(
    sendCommand: (data: Buffer) => Promise<Buffer>,
    preferredProtocol?: ProtocolType
  ): Promise<ProtocolNegotiationResult> {
    const startTime = Date.now();
    this.stats.negotiationAttempts++;
    
    const result: ProtocolNegotiationResult = {
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
        } catch (error) {
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
      
    } catch (error) {
      result.error = `Protocol negotiation failed: ${error}`;
      result.negotiationTime = Date.now() - startTime;
      return result;
    }
  }

  /**
   * Get negotiation order based on preference
   */
  private getNegotiationOrder(preferredProtocol?: ProtocolType): ProtocolType[] {
    const defaultOrder: ProtocolType[] = ['toon', 'protobuf', 'binary', 'text'];
    
    if (!preferredProtocol) {
      return defaultOrder;
    }
    
    // Move preferred protocol to front
    const order = defaultOrder.filter(p => p !== preferredProtocol);
    order.unshift(preferredProtocol);
    return order;
  }

  /**
   * Try specific protocol negotiation
   */
  private async tryProtocol(
    protocol: ProtocolType,
    sendCommand: (data: Buffer) => Promise<Buffer>,
    result: ProtocolNegotiationResult
  ): Promise<boolean> {
    switch (protocol) {
      case 'toon':
        return await this.tryToonNegotiation(sendCommand, result);
      case 'protobuf':
        return await this.tryProtobufNegotiation(sendCommand, result);
      case 'binary':
        return await this.tryBinaryNegotiation(sendCommand, result);
      case 'text':
        return await this.tryTextNegotiation(sendCommand, result);
      default:
        return false;
    }
  }

  /**
   * Try TOON protocol negotiation
   */
  private async tryToonNegotiation(
    sendCommand: (data: Buffer) => Promise<Buffer>,
    result: ProtocolNegotiationResult
  ): Promise<boolean> {
    try {
      const negotiationPacket = ToonProtocol.createNegotiationPacket();
      const response = await sendCommand(negotiationPacket);
      
      const toonResult = ToonProtocol.parseNegotiationResponse(response);
      result.toonResult = toonResult;
      
      if (toonResult.success && !toonResult.fallbackToText) {
        return true;
      }
      
      return false;
    } catch (error) {
      result.toonResult = {
        success: false,
        error: `TOON negotiation error: ${error}`
      };
      return false;
    }
  }

  /**
   * Try Protobuf protocol negotiation
   */
  private async tryProtobufNegotiation(
    sendCommand: (data: Buffer) => Promise<Buffer>,
    result: ProtocolNegotiationResult
  ): Promise<boolean> {
    try {
      const negotiationPacket = ProtobufProtocol.createNegotiationPacket();
      const response = await sendCommand(negotiationPacket);
      
      const protobufResult = ProtobufProtocol.parseNegotiationResponse(response);
      result.protobufResult = protobufResult;
      
      if (protobufResult.success && !protobufResult.fallbackToText) {
        return true;
      }
      
      return false;
    } catch (error) {
      result.protobufResult = {
        success: false,
        error: `Protobuf negotiation error: ${error}`
      };
      return false;
    }
  }

  /**
   * Try binary protocol negotiation
   */
  private async tryBinaryNegotiation(
    sendCommand: (data: Buffer) => Promise<Buffer>,
    result: ProtocolNegotiationResult
  ): Promise<boolean> {
    try {
      // Try a simple binary PING command
      const pingCommand = ProtocolEncoder.encodeBinaryCommand('PING', []);
      const response = await sendCommand(pingCommand);
      
      const decoded = ProtocolDecoder.decodeBinaryResponse(response);
      return decoded.type === 'pong';
    } catch (error) {
      return false;
    }
  }

  /**
   * Try text protocol negotiation
   */
  private async tryTextNegotiation(
    sendCommand: (data: Buffer) => Promise<Buffer>,
    result: ProtocolNegotiationResult
  ): Promise<boolean> {
    try {
      // Text protocol always works as fallback
      const pingCommand = ProtocolEncoder.encodeTextCommand('PING', []);
      const response = await sendCommand(pingCommand);
      
      const decoded = ProtocolDecoder.decodeTextResponse(response);
      return decoded.type === 'pong';
    } catch (error) {
      return false;
    }
  }

  /**
   * Encode command using current protocol
   */
  encodeCommand(command: string, args: (string | Buffer)[] = []): Buffer {
    this.updateUsageStats();
    
    switch (this.currentProtocol) {
      case 'toon':
        return this.toonProtocol.encodeCommand(command, args);
      case 'protobuf':
        return this.protobufProtocol.encodeCommand(command, args);
      case 'binary':
        return ProtocolEncoder.encodeBinaryCommand(command, args);
      case 'text':
      default:
        return ProtocolEncoder.encodeTextCommand(command, args);
    }
  }

  /**
   * Decode response using current protocol
   */
  decodeResponse(data: Buffer): any {
    switch (this.currentProtocol) {
      case 'toon':
        return this.toonProtocol.decodeResponse(data);
      case 'protobuf':
        return this.protobufProtocol.decodeResponse(data);
      case 'binary':
        return ProtocolDecoder.decodeBinaryResponse(data);
      case 'text':
      default:
        return ProtocolDecoder.decodeTextResponse(data);
    }
  }

  /**
   * Update usage statistics
   */
  private updateUsageStats(): void {
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
  getCurrentProtocol(): ProtocolType {
    return this.currentProtocol;
  }

  /**
   * Check if protocol has been negotiated
   */
  isNegotiated(): boolean {
    return this.negotiated;
  }

  /**
   * Force protocol selection (skip negotiation)
   */
  forceProtocol(protocol: ProtocolType): void {
    this.currentProtocol = protocol;
    this.negotiated = true;
    this.stats.selectedProtocol = protocol;
  }

  /**
   * Reset protocol state
   */
  reset(): void {
    this.currentProtocol = 'text';
    this.negotiated = false;
    this.toonProtocol.reset();
  }

  /**
   * Get protocol statistics
   */
  getStats(): ProtocolStats {
    // Update compression ratio based on current protocol
    if (this.currentProtocol === 'toon') {
      const toonStats = this.toonProtocol.getStats();
      this.stats.compressionRatio = toonStats.compressionRatio;
    } else if (this.currentProtocol === 'protobuf') {
      this.stats.compressionRatio = 0.67; // Protobuf typically 33% smaller than JSON
    } else if (this.currentProtocol === 'binary') {
      this.stats.compressionRatio = 0.8; // Binary typically 20% smaller than text
    } else {
      this.stats.compressionRatio = 1.0; // Text protocol baseline
    }
    
    this.stats.selectedProtocol = this.currentProtocol;
    return { ...this.stats };
  }

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
  } {
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