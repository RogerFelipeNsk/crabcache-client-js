"use strict";
/**
 * CrabCache Client - Cliente Node.js oficial para CrabCache
 *
 * @author Roger Felipe <rogerfelipensk@gmail.com>
 * @version 1.0.0
 * @license MIT
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = exports.ProtocolManager = exports.ProtobufProtocol = exports.ToonProtocol = exports.ProtocolDecoder = exports.ProtocolEncoder = exports.CrabCacheConnection = exports.ConnectionPool = exports.PipelineBatch = exports.CrabCachePipeline = exports.CrabCacheClient = void 0;
var client_1 = require("./client");
Object.defineProperty(exports, "CrabCacheClient", { enumerable: true, get: function () { return client_1.CrabCacheClient; } });
var pipeline_1 = require("./pipeline");
Object.defineProperty(exports, "CrabCachePipeline", { enumerable: true, get: function () { return pipeline_1.CrabCachePipeline; } });
Object.defineProperty(exports, "PipelineBatch", { enumerable: true, get: function () { return pipeline_1.PipelineBatch; } });
var pool_1 = require("./pool");
Object.defineProperty(exports, "ConnectionPool", { enumerable: true, get: function () { return pool_1.ConnectionPool; } });
var connection_1 = require("./connection");
Object.defineProperty(exports, "CrabCacheConnection", { enumerable: true, get: function () { return connection_1.CrabCacheConnection; } });
var protocol_1 = require("./protocol");
Object.defineProperty(exports, "ProtocolEncoder", { enumerable: true, get: function () { return protocol_1.ProtocolEncoder; } });
Object.defineProperty(exports, "ProtocolDecoder", { enumerable: true, get: function () { return protocol_1.ProtocolDecoder; } });
// Export new protocol modules
var toon_1 = require("./protocols/toon");
Object.defineProperty(exports, "ToonProtocol", { enumerable: true, get: function () { return toon_1.ToonProtocol; } });
var protobuf_1 = require("./protocols/protobuf");
Object.defineProperty(exports, "ProtobufProtocol", { enumerable: true, get: function () { return protobuf_1.ProtobufProtocol; } });
var manager_1 = require("./protocols/manager");
Object.defineProperty(exports, "ProtocolManager", { enumerable: true, get: function () { return manager_1.ProtocolManager; } });
__exportStar(require("./types"), exports);
// Export default para compatibilidade
var client_2 = require("./client");
Object.defineProperty(exports, "default", { enumerable: true, get: function () { return client_2.CrabCacheClient; } });
//# sourceMappingURL=index.js.map