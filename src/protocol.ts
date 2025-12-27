/**
 * Implementação do protocolo CrabCache
 */

import { Buffer } from 'buffer';

// Constantes do protocolo binário
const CMD_PING = 0x01;
const CMD_PUT = 0x02;
const CMD_GET = 0x03;
const CMD_DEL = 0x04;
const CMD_EXPIRE = 0x05;
const CMD_STATS = 0x06;
const CMD_METRICS = 0x07;

const RESP_OK = 0x10;
const RESP_PONG = 0x11;
const RESP_NULL = 0x12;
const RESP_ERROR = 0x13;
const RESP_VALUE = 0x14;
const RESP_STATS = 0x15;

export class ProtocolEncoder {
  /**
   * Codifica um comando no formato de texto
   */
  static encodeTextCommand(command: string, args: (string | Buffer)[] = []): Buffer {
    const parts = [command, ...args.map(arg => 
      Buffer.isBuffer(arg) ? arg.toString() : arg
    )];
    return Buffer.from(parts.join(' ') + '\r\n');
  }

  /**
   * Codifica um comando no formato binário (compatível com servidor Rust)
   */
  static encodeBinaryCommand(command: string, args: (string | Buffer)[] = []): Buffer {
    const buffers: Buffer[] = [];
    
    switch (command.toUpperCase()) {
      case 'PING':
        buffers.push(Buffer.from([CMD_PING]));
        break;
        
      case 'PUT':
        if (args.length < 2) throw new Error('PUT requires key and value');
        const key = Buffer.isBuffer(args[0]) ? args[0] : Buffer.from(args[0]);
        const value = Buffer.isBuffer(args[1]) ? args[1] : Buffer.from(args[1]);
        const ttl = args[2] ? parseInt(args[2].toString()) : null;
        
        buffers.push(Buffer.from([CMD_PUT]));
        buffers.push(this.encodeU32LE(key.length));
        buffers.push(key);
        buffers.push(this.encodeU32LE(value.length));
        buffers.push(value);
        
        if (ttl !== null) {
          buffers.push(Buffer.from([1])); // TTL flag
          const ttlBuffer = Buffer.allocUnsafe(8);
          ttlBuffer.writeBigUInt64LE(BigInt(ttl), 0);
          buffers.push(ttlBuffer);
        } else {
          buffers.push(Buffer.from([0])); // No TTL flag
        }
        break;
        
      case 'GET':
        if (args.length < 1) throw new Error('GET requires key');
        const getKey = Buffer.isBuffer(args[0]) ? args[0] : Buffer.from(args[0]);
        buffers.push(Buffer.from([CMD_GET]));
        buffers.push(this.encodeU32LE(getKey.length));
        buffers.push(getKey);
        break;
        
      case 'DEL':
        if (args.length < 1) throw new Error('DEL requires key');
        const delKey = Buffer.isBuffer(args[0]) ? args[0] : Buffer.from(args[0]);
        buffers.push(Buffer.from([CMD_DEL]));
        buffers.push(this.encodeU32LE(delKey.length));
        buffers.push(delKey);
        break;
        
      case 'EXPIRE':
        if (args.length < 2) throw new Error('EXPIRE requires key and ttl');
        const expireKey = Buffer.isBuffer(args[0]) ? args[0] : Buffer.from(args[0]);
        const expireTtl = parseInt(args[1].toString());
        
        buffers.push(Buffer.from([CMD_EXPIRE]));
        buffers.push(this.encodeU32LE(expireKey.length));
        buffers.push(expireKey);
        
        const expireTtlBuffer = Buffer.allocUnsafe(8);
        expireTtlBuffer.writeBigUInt64LE(BigInt(expireTtl), 0);
        buffers.push(expireTtlBuffer);
        break;
        
      case 'STATS':
        buffers.push(Buffer.from([CMD_STATS]));
        break;
        
      case 'METRICS':
        buffers.push(Buffer.from([CMD_METRICS]));
        break;
        
      default:
        throw new Error(`Unknown command: ${command}`);
    }
    
    return Buffer.concat(buffers);
  }

  /**
   * Codifica um número como u32 little-endian (compatível com servidor Rust)
   */
  private static encodeU32LE(value: number): Buffer {
    const buffer = Buffer.allocUnsafe(4);
    buffer.writeUInt32LE(value, 0);
    return buffer;
  }
}

export class ProtocolDecoder {
  /**
   * Decodifica uma resposta no formato de texto
   */
  static decodeTextResponse(data: Buffer): any {
    const response = data.toString().trim();
    
    if (response === 'OK') return { type: 'ok' };
    if (response === 'PONG') return { type: 'pong' };
    if (response === 'NULL') return { type: 'null' };
    if (response.startsWith('ERROR:')) {
      return { type: 'error', message: response.substring(6).trim() };
    }
    if (response.startsWith('STATS:')) {
      try {
        const statsData = JSON.parse(response.substring(6).trim());
        return { type: 'stats', data: statsData };
      } catch {
        return { type: 'stats', data: response.substring(6).trim() };
      }
    }
    
    // Assume que é um valor
    return { type: 'value', data: response };
  }

  /**
   * Decodifica uma resposta no formato binário (compatível com servidor Rust)
   */
  static decodeBinaryResponse(data: Buffer): any {
    if (data.length === 0) {
      throw new Error('Empty binary response');
    }
    
    const responseType = data[0];
    let cursor = 1;
    
    switch (responseType) {
      case RESP_OK:
        return { type: 'ok' };
        
      case RESP_PONG:
        return { type: 'pong' };
        
      case RESP_NULL:
        return { type: 'null' };
        
      case RESP_ERROR:
        if (data.length < 5) throw new Error('Invalid error response: too short');
        const errorLen = data.readUInt32LE(cursor);
        cursor += 4;
        if (data.length < cursor + errorLen) throw new Error('Invalid error response: insufficient data');
        const errorMessage = data.slice(cursor, cursor + errorLen).toString();
        return { type: 'error', message: errorMessage };
        
      case RESP_VALUE:
        if (data.length < 5) throw new Error('Invalid value response: too short');
        const valueLen = data.readUInt32LE(cursor);
        cursor += 4;
        if (data.length < cursor + valueLen) throw new Error('Invalid value response: insufficient data');
        const value = data.slice(cursor, cursor + valueLen);
        return { type: 'value', data: value };
        
      case RESP_STATS:
        if (data.length < 5) throw new Error('Invalid stats response: too short');
        const statsLen = data.readUInt32LE(cursor);
        cursor += 4;
        if (data.length < cursor + statsLen) throw new Error('Invalid stats response: insufficient data');
        const statsStr = data.slice(cursor, cursor + statsLen).toString();
        try {
          const statsData = JSON.parse(statsStr);
          return { type: 'stats', data: statsData };
        } catch {
          return { type: 'stats', data: statsStr };
        }
        
      default:
        throw new Error(`Unknown binary response type: ${responseType}`);
    }
  }

}