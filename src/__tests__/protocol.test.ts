/**
 * Testes para o protocolo CrabCache
 */

import { ProtocolEncoder, ProtocolDecoder } from '../protocol';

describe('ProtocolEncoder', () => {
  describe('encodeTextCommand', () => {
    it('should encode PING command', () => {
      const encoded = ProtocolEncoder.encodeTextCommand('PING');
      expect(encoded.toString()).toBe('PING\r\n');
    });

    it('should encode PUT command', () => {
      const encoded = ProtocolEncoder.encodeTextCommand('PUT', ['key', 'value']);
      expect(encoded.toString()).toBe('PUT key value\r\n');
    });

    it('should encode PUT command with TTL', () => {
      const encoded = ProtocolEncoder.encodeTextCommand('PUT', ['key', 'value', '60']);
      expect(encoded.toString()).toBe('PUT key value 60\r\n');
    });

    it('should encode GET command', () => {
      const encoded = ProtocolEncoder.encodeTextCommand('GET', ['key']);
      expect(encoded.toString()).toBe('GET key\r\n');
    });

    it('should handle Buffer arguments', () => {
      const key = Buffer.from('key');
      const value = Buffer.from('value');
      const encoded = ProtocolEncoder.encodeTextCommand('PUT', [key, value]);
      expect(encoded.toString()).toBe('PUT key value\r\n');
    });
  });

  describe('encodeBinaryCommand', () => {
    it('should encode PING command', () => {
      const encoded = ProtocolEncoder.encodeBinaryCommand('PING');
      expect(encoded[0]).toBe(0x01); // CMD_PING
      expect(encoded.length).toBe(1);
    });

    it('should encode PUT command', () => {
      const encoded = ProtocolEncoder.encodeBinaryCommand('PUT', ['key', 'value']);
      expect(encoded[0]).toBe(0x02); // CMD_PUT
      expect(encoded.length).toBeGreaterThan(1);
    });

    it('should encode GET command', () => {
      const encoded = ProtocolEncoder.encodeBinaryCommand('GET', ['key']);
      expect(encoded[0]).toBe(0x03); // CMD_GET
      expect(encoded.length).toBeGreaterThan(1);
    });

    it('should throw error for unknown command', () => {
      expect(() => {
        ProtocolEncoder.encodeBinaryCommand('UNKNOWN');
      }).toThrow('Unknown command: UNKNOWN');
    });

    it('should throw error for PUT without arguments', () => {
      expect(() => {
        ProtocolEncoder.encodeBinaryCommand('PUT', []);
      }).toThrow('PUT requires key and value');
    });
  });
});

describe('ProtocolDecoder', () => {
  describe('decodeTextResponse', () => {
    it('should decode OK response', () => {
      const response = Buffer.from('OK');
      const decoded = ProtocolDecoder.decodeTextResponse(response);
      expect(decoded.type).toBe('ok');
    });

    it('should decode PONG response', () => {
      const response = Buffer.from('PONG');
      const decoded = ProtocolDecoder.decodeTextResponse(response);
      expect(decoded.type).toBe('pong');
    });

    it('should decode NULL response', () => {
      const response = Buffer.from('NULL');
      const decoded = ProtocolDecoder.decodeTextResponse(response);
      expect(decoded.type).toBe('null');
    });

    it('should decode ERROR response', () => {
      const response = Buffer.from('ERROR: Something went wrong');
      const decoded = ProtocolDecoder.decodeTextResponse(response);
      expect(decoded.type).toBe('error');
      expect(decoded.message).toBe('Something went wrong');
    });

    it('should decode STATS response', () => {
      const statsData = { operations: 100, hits: 80 };
      const response = Buffer.from(`STATS: ${JSON.stringify(statsData)}`);
      const decoded = ProtocolDecoder.decodeTextResponse(response);
      expect(decoded.type).toBe('stats');
      expect(decoded.data).toEqual(statsData);
    });

    it('should decode value response', () => {
      const response = Buffer.from('some value');
      const decoded = ProtocolDecoder.decodeTextResponse(response);
      expect(decoded.type).toBe('value');
      expect(decoded.data).toBe('some value');
    });
  });

  describe('decodeBinaryResponse', () => {
    it('should decode OK response', () => {
      const response = Buffer.from([0x10]); // RESP_OK
      const decoded = ProtocolDecoder.decodeBinaryResponse(response);
      expect(decoded.type).toBe('ok');
    });

    it('should decode PONG response', () => {
      const response = Buffer.from([0x11]); // RESP_PONG
      const decoded = ProtocolDecoder.decodeBinaryResponse(response);
      expect(decoded.type).toBe('pong');
    });

    it('should decode NULL response', () => {
      const response = Buffer.from([0x12]); // RESP_NULL
      const decoded = ProtocolDecoder.decodeBinaryResponse(response);
      expect(decoded.type).toBe('null');
    });

    it('should throw error for empty response', () => {
      const response = Buffer.from([]);
      expect(() => {
        ProtocolDecoder.decodeBinaryResponse(response);
      }).toThrow('Empty binary response');
    });

    it('should throw error for unknown response type', () => {
      const response = Buffer.from([0xFF]); // Unknown type
      expect(() => {
        ProtocolDecoder.decodeBinaryResponse(response);
      }).toThrow('Unknown binary response type: 255');
    });
  });
});