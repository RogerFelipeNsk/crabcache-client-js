/**
 * Testes para o cliente CrabCache
 */

import { CrabCacheClient } from '../client';

// Mock do pool
const mockPool = {
  getMetrics: jest.fn().mockReturnValue({
    activeConnections: 0,
    idleConnections: 0,
    totalCreated: 0,
    poolHits: 0,
    poolMisses: 0,
    healthCheckFailures: 0
  }),
  getStatus: jest.fn().mockReturnValue({
    totalConnections: 0,
    activeConnections: 0,
    idleConnections: 0
  }),
  warmUp: jest.fn().mockResolvedValue(undefined),
  close: jest.fn().mockResolvedValue(undefined),
  on: jest.fn(),
  emit: jest.fn()
};

// Mock do módulo de pool
jest.mock('../pool', () => ({
  ConnectionPool: jest.fn().mockImplementation(() => mockPool)
}));

describe('CrabCacheClient', () => {
  let client: CrabCacheClient;

  beforeEach(() => {
    client = new CrabCacheClient({
      host: 'localhost',
      port: 8000
    });
  });

  afterEach(async () => {
    if (client) {
      await client.disconnect();
    }
  });

  describe('constructor', () => {
    it('should create client with default config', () => {
      const defaultClient = new CrabCacheClient();
      const status = defaultClient.getStatus();
      
      expect(status.config.host).toBe('localhost');
      expect(status.config.port).toBe(8000);
      expect(status.config.poolSize).toBe(10);
      expect(status.config.useBinaryProtocol).toBe(false);
    });

    it('should create client with custom config', () => {
      const customClient = new CrabCacheClient({
        host: '192.168.1.100',
        port: 9000,
        poolSize: 20,
        useBinaryProtocol: true,
        connectionTimeout: 3000
      });
      
      const status = customClient.getStatus();
      
      expect(status.config.host).toBe('192.168.1.100');
      expect(status.config.port).toBe(9000);
      expect(status.config.poolSize).toBe(20);
      expect(status.config.useBinaryProtocol).toBe(true);
      expect(status.config.connectionTimeout).toBe(3000);
    });
  });

  describe('events', () => {
    it('should emit events', (done) => {
      let eventCount = 0;
      const expectedEvents = ['connected', 'disconnected'];
      
      client.on('connected', () => {
        eventCount++;
        if (eventCount === expectedEvents.length) done();
      });
      
      client.on('disconnected', () => {
        eventCount++;
        if (eventCount === expectedEvents.length) done();
      });
      
      // Simular eventos
      client.emit('connected');
      client.emit('disconnected');
    });
  });

  describe('metrics', () => {
    it('should return initial client metrics', () => {
      const metrics = client.getClientMetrics();
      
      expect(metrics.totalRequests).toBe(0);
      expect(metrics.successfulRequests).toBe(0);
      expect(metrics.failedRequests).toBe(0);
      expect(metrics.averageLatency).toBe(0);
      expect(metrics.pipelineRequests).toBe(0);
      expect(metrics.binaryProtocolUsage).toBe(0);
    });

    it('should return pool metrics', () => {
      const poolMetrics = client.getPoolMetrics();
      
      expect(poolMetrics).toBeDefined();
      expect(typeof poolMetrics.activeConnections).toBe('number');
      expect(typeof poolMetrics.idleConnections).toBe('number');
      expect(typeof poolMetrics.totalCreated).toBe('number');
    });

    it('should return status', () => {
      const status = client.getStatus();
      
      expect(status).toBeDefined();
      expect(status.config).toBeDefined();
      expect(status.clientMetrics).toBeDefined();
      expect(status.poolMetrics).toBeDefined();
      expect(status.poolStatus).toBeDefined();
      expect(typeof status.connected).toBe('boolean');
    });
  });

  describe('pipeline', () => {
    it('should create pipeline', () => {
      const pipeline = client.pipeline();
      expect(pipeline).toBeDefined();
      expect(typeof pipeline.ping).toBe('function');
      expect(typeof pipeline.put).toBe('function');
      expect(typeof pipeline.get).toBe('function');
      expect(typeof pipeline.del).toBe('function');
      expect(typeof pipeline.execute).toBe('function');
    });

    it('should create batch', () => {
      const batch = client.createBatch();
      expect(batch).toBeDefined();
      expect(typeof batch.createPipeline).toBe('function');
      expect(typeof batch.executeAll).toBe('function');
    });
  });

  describe('multi command', () => {
    it('should handle empty commands array', async () => {
      // Mock do executeCommand para não fazer chamadas reais
      const mockExecuteCommand = jest.fn();
      (client as any).executeCommand = mockExecuteCommand;
      
      const pipeline = client.pipeline();
      const mockExecute = jest.fn().mockResolvedValue([]);
      pipeline.execute = mockExecute;
      
      (client as any).pipeline = jest.fn().mockReturnValue(pipeline);
      
      const results = await client.multi([]);
      expect(results).toEqual([]);
    });
  });
});