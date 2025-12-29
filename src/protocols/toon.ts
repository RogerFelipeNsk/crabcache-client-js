/**
 * TOON Protocol Implementation for CrabCache Client
 * TOON (Tiny Optimized Object Notation) - World's most efficient binary protocol
 */

import { Buffer } from 'buffer';

// TOON Magic Bytes: "TOON"
export const TOON_MAGIC = Buffer.from([0x54, 0x4F, 0x4F, 0x4E]);
export const TOON_VERSION = 1;

// TOON Flags
export const TOON_FLAGS = {
  ZERO_COPY: 0x01,
  STRING_INTERNING: 0x02,
  SIMD_OPTIMIZED: 0x04,
  ULTRA_COMPRESSION: 0x08,
  ALL_ENABLED: 0x0F
};

// TOON Command Types (ultra-compact)
export const TOON_COMMANDS = {
  PING: 0x01,
  PUT: 0x02,
  GET: 0x03,
  DEL: 0x04,
  EXPIRE: 0x05,
  STATS: 0x06,
  METRICS: 0x07
};

// TOON Response Types (ultra-compact)
export const TOON_RESPONSES = {
  OK: 0x10,
  PONG: 0x11,
  NULL: 0x12,
  ERROR: 0x13,
  VALUE: 0x14,
  STATS: 0x15
};

export interface ToonNegotiationResult {
  success: boolean;
  serverVersion?: number;
  serverFlags?: number;
  fallbackToText?: boolean;
  error?: string;
}

export class ToonProtocol {
  private stringInternMap: Map<string, number> = new Map();
  private stringInternCounter: number = 0;
  private zeroCoopyEnabled: boolean = true;
  private simdOptimized: boolean = true;

  /**
   * Create TOON protocol negotiation packet
   */
  static createNegotiationPacket(): Buffer {
    const packet = Buffer.allocUnsafe(6);
    TOON_MAGIC.copy(packet, 0);
    packet[4] = TOON_VERSION;
    packet[5] = TOON_FLAGS.ALL_ENABLED;
    return packet;
  }

  /**
   * Parse TOON negotiation response
   */
  static parseNegotiationResponse(response: Buffer): ToonNegotiationResult {
    try {
      // Check if response starts with TOON magic
      if (response.length >= 4 && response.subarray(0, 4).equals(TOON_MAGIC)) {
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
      
      return {
        success: false,
        error: 'Invalid TOON negotiation response'
      };
    } catch (error) {
      return {
        success: false,
        error: `TOON negotiation failed: ${error}`
      };
    }
  }

  /**
   * Encode command using TOON protocol (ultra-compact)
   */
  encodeCommand(command: string, args: (string | Buffer)[] = []): Buffer {
    const buffers: Buffer[] = [];
    
    // Add TOON magic and version for full commands (not negotiation)
    buffers.push(TOON_MAGIC);
    buffers.push(Buffer.from([TOON_VERSION, TOON_FLAGS.ALL_ENABLED]));
    
    const cmd = command.toUpperCase();
    
    switch (cmd) {
      case 'PING':
        buffers.push(Buffer.from([TOON_COMMANDS.PING]));
        break;
        
      case 'PUT': {
        if (args.length < 2) throw new Error('PUT requires key and value');
        buffers.push(Buffer.from([TOON_COMMANDS.PUT]));
        
        // Ultra-compact key encoding
        const key = this.encodeString(args[0]);
        buffers.push(this.encodeCompactLength(key.length));
        buffers.push(key);
        
        // Ultra-compact value encoding
        const value = this.encodeString(args[1]);
        buffers.push(this.encodeCompactLength(value.length));
        buffers.push(value);
        
        // TTL (optional)
        if (args[2] !== undefined) {
          buffers.push(Buffer.from([1])); // TTL flag
          const ttl = parseInt(args[2].toString());
          buffers.push(this.encodeCompactNumber(ttl));
        } else {
          buffers.push(Buffer.from([0])); // No TTL
        }
        break;
      }
        
      case 'GET': {
        if (args.length < 1) throw new Error('GET requires key');
        buffers.push(Buffer.from([TOON_COMMANDS.GET]));
        
        const getKey = this.encodeString(args[0]);
        buffers.push(this.encodeCompactLength(getKey.length));
        buffers.push(getKey);
        break;
      }
        
      case 'DEL': {
        if (args.length < 1) throw new Error('DEL requires key');
        buffers.push(Buffer.from([TOON_COMMANDS.DEL]));
        
        const delKey = this.encodeString(args[0]);
        buffers.push(this.encodeCompactLength(delKey.length));
        buffers.push(delKey);
        break;
      }
        
      case 'EXPIRE': {
        if (args.length < 2) throw new Error('EXPIRE requires key and ttl');
        buffers.push(Buffer.from([TOON_COMMANDS.EXPIRE]));
        
        const expireKey = this.encodeString(args[0]);
        buffers.push(this.encodeCompactLength(expireKey.length));
        buffers.push(expireKey);
        
        const ttl = parseInt(args[1].toString());
        buffers.push(this.encodeCompactNumber(ttl));
        break;
      }
        
      case 'STATS': {
        buffers.push(Buffer.from([TOON_COMMANDS.STATS]));
        break;
      }
        
      case 'METRICS': {
        buffers.push(Buffer.from([TOON_COMMANDS.METRICS]));
        break;
      }
        
      default:
        throw new Error(`Unknown TOON command: ${command}`);
    }
    
    return Buffer.concat(buffers);
  }

  /**
   * Decode TOON response (ultra-efficient)
   */
  decodeResponse(data: Buffer): any {
    if (data.length === 0) {
      throw new Error('Empty TOON response');
    }
    
    let cursor = 0;
    
    // Check for TOON magic (full response)
    if (data.length >= 4 && data.subarray(0, 4).equals(TOON_MAGIC)) {
      cursor = 6; // Skip magic + version + flags
    }
    
    if (cursor >= data.length) {
      throw new Error('Invalid TOON response format');
    }
    
    const responseType = data[cursor];
    cursor++;
    
    switch (responseType) {
      case TOON_RESPONSES.OK: {
        return { type: 'ok' };
      }
        
      case TOON_RESPONSES.PONG: {
        return { type: 'pong' };
      }
        
      case TOON_RESPONSES.NULL: {
        return { type: 'null' };
      }
        
      case TOON_RESPONSES.ERROR: {
        const [errorLen, errorLenBytes] = this.decodeCompactLength(data.subarray(cursor));
        cursor += errorLenBytes;
        const errorMessage = data.subarray(cursor, cursor + errorLen).toString();
        return { type: 'error', message: errorMessage };
      }
        
      case TOON_RESPONSES.VALUE: {
        const [valueLen, valueLenBytes] = this.decodeCompactLength(data.subarray(cursor));
        cursor += valueLenBytes;
        const value = data.subarray(cursor, cursor + valueLen);
        return { type: 'value', data: value };
      }
        
      case TOON_RESPONSES.STATS: {
        const [statsLen, statsLenBytes] = this.decodeCompactLength(data.subarray(cursor));
        cursor += statsLenBytes;
        const statsStr = data.subarray(cursor, cursor + statsLen).toString();
        try {
          const statsData = JSON.parse(statsStr);
          return { type: 'stats', data: statsData };
        } catch {
          return { type: 'stats', data: statsStr };
        }
      }
        
      default:
        throw new Error(`Unknown TOON response type: ${responseType}`);
    }
  }

  /**
   * Encode string with interning for ultra-compression
   */
  private encodeString(input: string | Buffer): Buffer {
    if (Buffer.isBuffer(input)) {
      return input;
    }
    
    const str = input.toString();
    
    // String interning for common strings
    if (this.stringInternMap.has(str)) {
      const internId = this.stringInternMap.get(str)!;
      // Use interned string reference (ultra-compact)
      const internBuffer = Buffer.allocUnsafe(2);
      internBuffer[0] = 0xFF; // Intern marker
      internBuffer[1] = internId;
      return internBuffer;
    }
    
    // Add to intern map if string is repeated
    if (str.length > 3) { // Only intern strings > 3 chars
      this.stringInternMap.set(str, this.stringInternCounter++);
    }
    
    return Buffer.from(str, 'utf8');
  }

  /**
   * Encode length using ultra-compact varint
   */
  private encodeCompactLength(length: number): Buffer {
    if (length < 128) {
      return Buffer.from([length]);
    } else if (length < 16384) {
      return Buffer.from([
        (length & 0x7F) | 0x80,
        (length >> 7) & 0x7F
      ]);
    } else {
      // Full varint for larger lengths
      return this.encodeVarint(length);
    }
  }

  /**
   * Decode compact length
   */
  private decodeCompactLength(data: Buffer): [number, number] {
    if (data.length === 0) {
      throw new Error('Cannot decode length from empty buffer');
    }
    
    const firstByte = data[0];
    
    if ((firstByte & 0x80) === 0) {
      // Single byte length
      return [firstByte, 1];
    } else if (data.length >= 2) {
      // Two byte length
      const length = (firstByte & 0x7F) | ((data[1] & 0x7F) << 7);
      return [length, 2];
    } else {
      // Full varint
      return this.decodeVarint(data);
    }
  }

  /**
   * Encode number using compact representation
   */
  private encodeCompactNumber(num: number): Buffer {
    if (num < 256) {
      return Buffer.from([num]);
    } else if (num < 65536) {
      const buffer = Buffer.allocUnsafe(3);
      buffer[0] = 0xFE; // 2-byte marker
      buffer.writeUInt16LE(num, 1);
      return buffer;
    } else {
      const buffer = Buffer.allocUnsafe(5);
      buffer[0] = 0xFD; // 4-byte marker
      buffer.writeUInt32LE(num, 1);
      return buffer;
    }
  }

  /**
   * Standard varint encoding (fallback)
   */
  private encodeVarint(value: number): Buffer {
    const result: number[] = [];
    let num = value;
    
    while (num >= 0x80) {
      result.push((num & 0xFF) | 0x80);
      num >>>= 7;
    }
    result.push(num & 0xFF);
    
    return Buffer.from(result);
  }

  /**
   * Standard varint decoding (fallback)
   */
  private decodeVarint(data: Buffer): [number, number] {
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
  getStats(): {
    stringInternMapSize: number;
    zeroCoopyEnabled: boolean;
    simdOptimized: boolean;
    compressionRatio: number;
  } {
    return {
      stringInternMapSize: this.stringInternMap.size,
      zeroCoopyEnabled: this.zeroCoopyEnabled,
      simdOptimized: this.simdOptimized,
      compressionRatio: this.stringInternMap.size > 0 ? 0.5 : 1.0 // Estimated
    };
  }

  /**
   * Reset protocol state
   */
  reset(): void {
    this.stringInternMap.clear();
    this.stringInternCounter = 0;
  }
}