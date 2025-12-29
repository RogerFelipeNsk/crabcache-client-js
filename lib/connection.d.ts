/**
 * Gerenciamento de conexões TCP para CrabCache
 */
import { EventEmitter } from 'events';
import { CrabCacheConfig } from './types';
export declare class CrabCacheConnection extends EventEmitter {
    private socket;
    private config;
    private connected;
    private connecting;
    private responseBuffer;
    private pendingResponses;
    constructor(config: Required<CrabCacheConfig>);
    private setupSocketEvents;
    connect(): Promise<void>;
    sendCommand(data: Buffer): Promise<Buffer>;
    sendPipelineCommands(commands: Buffer[]): Promise<Buffer[]>;
    private handleData;
    private extractResponse;
    private extractTextResponse;
    private extractBinaryResponse;
    private decodeVarint;
    private rejectPendingResponses;
    isConnected(): boolean;
    disconnect(): Promise<void>;
    destroy(): void;
}
//# sourceMappingURL=connection.d.ts.map