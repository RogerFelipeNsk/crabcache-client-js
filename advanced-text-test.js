/**
 * Advanced example with text protocol, connection pool and monitoring
 */

const { CrabCacheClient } = require('./lib');

async function advancedTextExample() {
  console.log('🔬 CrabCache Client - Advanced Text Protocol Example');
  console.log('===================================================');

  // Client with advanced configuration using text protocol
  const client = new CrabCacheClient({
    host: 'localhost',
    port: 8000,
    useBinaryProtocol: false, // Use text protocol (works with current server)
    poolSize: 10,             // Reasonable pool size
    connectionTimeout: 3000,
    commandTimeout: 5000,
    enablePipelining: true,
    pipelineBatchSize: 50
  });

  // Configure client events
  client.on('connected', () => {
    console.log('🔗 Client connected');
  });

  client.on('disconnected', () => {
    console.log('🔌 Client disconnected');
  });

  client.on('connectionError', (error) => {
    console.log('⚠️ Connection error:', error.message);
  });

  client.on('connectionCreated', () => {
    console.log('➕ New connection created in pool');
  });

  client.on('connectionRemoved', () => {
    console.log('➖ Connection removed from pool');
  });

  try {
    console.log('🚀 Connecting with pool warm-up...');
    await client.connect();
    console.log('✅ Connected with text protocol!');

    // Example 1: Performance test with text protocol
    console.log('\n⚡ Example 1: Performance with Text Protocol');
    const startTime = Date.now();
    
    // Store test data
    const testData = JSON.stringify({
      id: 12345,
      name: 'Performance Test User',
      email: 'perf@test.com',
      data: 'x'.repeat(500), // 500 bytes of data
      timestamp: new Date().toISOString()
    });

    // Individual operations
    console.log('📊 Testing individual operations...');
    const individualStart = Date.now();
    for (let i = 0; i < 100; i++) {
      await client.put(`perf:individual:${i}`, testData);
    }
    const individualTime = Date.now() - individualStart;
    console.log(`✅ Individual: 100 PUTs in ${individualTime}ms (${Math.round(100 / (individualTime / 1000))} ops/sec)`);

    // Pipeline operations
    console.log('📊 Testing pipeline operations...');
    const pipelineStart = Date.now();
    const pipeline = client.pipeline();
    for (let i = 0; i < 100; i++) {
      pipeline.put(`perf:pipeline:${i}`, testData);
    }
    await pipeline.execute();
    const pipelineTime = Date.now() - pipelineStart;
    console.log(`✅ Pipeline: 100 PUTs in ${pipelineTime}ms (${Math.round(100 / (pipelineTime / 1000))} ops/sec)`);
    console.log(`📈 Pipeline is ${Math.round(individualTime / pipelineTime)}x faster`);

    // Example 2: Mixed workload
    console.log('\n🔀 Example 2: Mixed Workload');
    const mixedStart = Date.now();
    const mixedPipeline = client.pipeline();
    
    // Mix of operations
    for (let i = 0; i < 20; i++) {
      mixedPipeline.put(`mixed:${i}`, `value_${i}`);
      mixedPipeline.get(`mixed:${i}`);
      if (i % 5 === 0) {
        mixedPipeline.ping();
      }
    }
    
    const mixedResults = await mixedPipeline.execute();
    const mixedTime = Date.now() - mixedStart;
    console.log(`✅ Mixed workload: ${mixedResults.length} operations in ${mixedTime}ms`);
    console.log(`📊 Performance: ${Math.round(mixedResults.length / (mixedTime / 1000))} ops/sec`);

    // Example 3: Connection pool monitoring
    console.log('\n🏊 Example 3: Connection Pool Monitoring');
    const poolMetrics = client.getPoolMetrics();
    console.log('📊 Pool Metrics:', {
      activeConnections: poolMetrics.activeConnections,
      idleConnections: poolMetrics.idleConnections,
      totalCreated: poolMetrics.totalCreated,
      poolHits: poolMetrics.poolHits,
      poolMisses: poolMetrics.poolMisses
    });

    // Example 4: Client metrics
    console.log('\n📈 Example 4: Client Metrics');
    const clientMetrics = client.getClientMetrics();
    console.log('📊 Client Metrics:', {
      totalRequests: clientMetrics.totalRequests,
      successfulRequests: clientMetrics.successfulRequests,
      successRate: `${((clientMetrics.successfulRequests / clientMetrics.totalRequests) * 100).toFixed(2)}%`,
      averageLatency: `${clientMetrics.averageLatency.toFixed(2)}ms`,
      pipelineRequests: clientMetrics.pipelineRequests
    });

    // Example 5: Server stats
    console.log('\n📊 Example 5: Server Statistics');
    const stats = await client.stats();
    console.log('✅ Server Stats:', stats);

    // Example 6: Server metrics
    console.log('\n📈 Example 6: Server Metrics');
    const metrics = await client.serverMetrics();
    console.log('✅ Server Metrics:', metrics);

    // Example 7: Status overview
    console.log('\n🔍 Example 7: Client Status Overview');
    const status = client.getStatus();
    console.log('📊 Status:', {
      connected: status.connected,
      clusterMode: status.clusterMode,
      totalRequests: status.clientMetrics.totalRequests,
      poolConnections: `${status.poolMetrics.activeConnections} active, ${status.poolMetrics.idleConnections} idle`
    });

    console.log('\n🎉 All advanced examples completed successfully!');

  } catch (error) {
    console.error('❌ Error in advanced example:', error.message);
    console.error(error);
  } finally {
    console.log('\n🔌 Disconnecting...');
    await client.disconnect();
    console.log('✅ Advanced example completed!');
  }
}

advancedTextExample().catch(console.error);