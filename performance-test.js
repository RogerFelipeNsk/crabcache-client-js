/**
 * Comprehensive performance test for CrabCache client
 */

const { CrabCacheClient } = require('./lib');

async function performanceTest() {
  console.log('🚀 CrabCache Client - Performance Test');
  console.log('=====================================');

  const client = new CrabCacheClient({
    host: 'localhost',
    port: 8000,
    useBinaryProtocol: false, // Text protocol
    poolSize: 10,
    connectionTimeout: 5000,
    commandTimeout: 10000,
    enablePipelining: true,
    pipelineBatchSize: 100
  });

  try {
    await client.connect();
    console.log('✅ Connected to CrabCache server');

    // Test data sizes
    const testSizes = [
      { name: 'Small (100B)', size: 100 },
      { name: 'Medium (1KB)', size: 1024 },
      { name: 'Large (10KB)', size: 10240 }
    ];

    // Test operation counts
    const testCounts = [100, 500, 1000];

    console.log('\n📊 Performance Test Results');
    console.log('============================');

    for (const testSize of testSizes) {
      console.log(`\n🔍 Testing ${testSize.name} payloads:`);
      
      // Generate test data
      const testData = JSON.stringify({
        id: 12345,
        data: 'x'.repeat(testSize.size - 50), // Account for JSON overhead
        timestamp: new Date().toISOString()
      });

      for (const count of testCounts) {
        // Test individual operations
        console.log(`\n  📈 ${count} operations:`);
        
        // Individual PUT operations
        const individualStart = Date.now();
        for (let i = 0; i < count; i++) {
          await client.put(`perf:individual:${i}`, testData);
        }
        const individualPutTime = Date.now() - individualStart;
        const individualPutOps = Math.round(count / (individualPutTime / 1000));

        // Individual GET operations
        const getStart = Date.now();
        for (let i = 0; i < count; i++) {
          await client.get(`perf:individual:${i}`);
        }
        const individualGetTime = Date.now() - getStart;
        const individualGetOps = Math.round(count / (individualGetTime / 1000));

        // Pipeline PUT operations
        const pipelinePutStart = Date.now();
        const putPipeline = client.pipeline();
        for (let i = 0; i < count; i++) {
          putPipeline.put(`perf:pipeline:${i}`, testData);
        }
        await putPipeline.execute();
        const pipelinePutTime = Date.now() - pipelinePutStart;
        const pipelinePutOps = Math.round(count / (pipelinePutTime / 1000));

        // Pipeline GET operations
        const pipelineGetStart = Date.now();
        const getPipeline = client.pipeline();
        for (let i = 0; i < count; i++) {
          getPipeline.get(`perf:pipeline:${i}`);
        }
        await getPipeline.execute();
        const pipelineGetTime = Date.now() - pipelineGetStart;
        const pipelineGetOps = Math.round(count / (pipelineGetTime / 1000));

        console.log(`    Individual PUT: ${individualPutOps.toLocaleString()} ops/sec (${individualPutTime}ms)`);
        console.log(`    Individual GET: ${individualGetOps.toLocaleString()} ops/sec (${individualGetTime}ms)`);
        console.log(`    Pipeline PUT:   ${pipelinePutOps.toLocaleString()} ops/sec (${pipelinePutTime}ms) - ${Math.round(pipelinePutTime > 0 ? individualPutTime / pipelinePutTime : 0)}x faster`);
        console.log(`    Pipeline GET:   ${pipelineGetOps.toLocaleString()} ops/sec (${pipelineGetTime}ms) - ${Math.round(pipelineGetTime > 0 ? individualGetTime / pipelineGetTime : 0)}x faster`);
      }
    }

    // Mixed workload test
    console.log('\n🔀 Mixed Workload Test:');
    const mixedStart = Date.now();
    const mixedPipeline = client.pipeline();
    
    for (let i = 0; i < 1000; i++) {
      if (i % 3 === 0) {
        mixedPipeline.put(`mixed:${i}`, `value_${i}`);
      } else if (i % 3 === 1) {
        mixedPipeline.get(`mixed:${i - 1}`);
      } else {
        mixedPipeline.ping();
      }
    }
    
    const mixedResults = await mixedPipeline.execute();
    const mixedTime = Date.now() - mixedStart;
    const mixedOps = Math.round(mixedResults.length / (mixedTime / 1000));
    
    console.log(`  Mixed operations: ${mixedOps.toLocaleString()} ops/sec (${mixedResults.length} ops in ${mixedTime}ms)`);

    // Latency test
    console.log('\n⏱️ Latency Test (100 individual operations):');
    const latencies = [];
    for (let i = 0; i < 100; i++) {
      const start = Date.now();
      await client.ping();
      latencies.push(Date.now() - start);
    }
    
    latencies.sort((a, b) => a - b);
    const p50 = latencies[Math.floor(latencies.length * 0.5)];
    const p95 = latencies[Math.floor(latencies.length * 0.95)];
    const p99 = latencies[Math.floor(latencies.length * 0.99)];
    const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    
    console.log(`  Average: ${avg.toFixed(2)}ms`);
    console.log(`  P50: ${p50}ms`);
    console.log(`  P95: ${p95}ms`);
    console.log(`  P99: ${p99}ms`);

    // Final metrics
    console.log('\n📊 Final Client Metrics:');
    const finalMetrics = client.getClientMetrics();
    console.log(`  Total requests: ${finalMetrics.totalRequests.toLocaleString()}`);
    console.log(`  Success rate: ${((finalMetrics.successfulRequests / finalMetrics.totalRequests) * 100).toFixed(2)}%`);
    console.log(`  Average latency: ${finalMetrics.averageLatency.toFixed(2)}ms`);

    console.log('\n🎉 Performance test completed!');

  } catch (error) {
    console.error('❌ Performance test error:', error.message);
  } finally {
    await client.disconnect();
    console.log('✅ Disconnected from server');
  }
}

performanceTest().catch(console.error);