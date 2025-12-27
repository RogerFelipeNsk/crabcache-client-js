/**
 * CrabCache Client - Cliente Node.js oficial para CrabCache
 * 
 * @author Roger Felipe <rogerfelipensk@gmail.com>
 * @version 1.0.0
 * @license MIT
 */

export { CrabCacheClient } from './client';
export { CrabCachePipeline, PipelineBatch } from './pipeline';
export { ConnectionPool } from './pool';
export { CrabCacheConnection } from './connection';
export { ProtocolEncoder, ProtocolDecoder } from './protocol';

// Export new protocol modules
export { ToonProtocol } from './protocols/toon';
export { ProtobufProtocol } from './protocols/protobuf';
export { ProtocolManager, ProtocolType } from './protocols/manager';

export * from './types';

// Export default para compatibilidade
export { CrabCacheClient as default } from './client';