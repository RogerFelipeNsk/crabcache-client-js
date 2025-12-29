/**
 * Implementação do protocolo CrabCache
 */
import { Buffer } from 'buffer';
export declare class ProtocolEncoder {
    /**
     * Codifica um comando no formato de texto
     */
    static encodeTextCommand(command: string, args?: (string | Buffer)[]): Buffer;
    /**
     * Codifica um comando no formato binário (compatível com servidor Rust)
     */
    static encodeBinaryCommand(command: string, args?: (string | Buffer)[]): Buffer;
    /**
     * Codifica um número como u32 little-endian (compatível com servidor Rust)
     */
    private static encodeU32LE;
}
export declare class ProtocolDecoder {
    /**
     * Decodifica uma resposta no formato de texto
     */
    static decodeTextResponse(data: Buffer): any;
    /**
     * Decodifica uma resposta no formato binário (compatível com servidor Rust)
     */
    static decodeBinaryResponse(data: Buffer): any;
}
//# sourceMappingURL=protocol.d.ts.map