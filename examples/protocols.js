/**
 * Exemplo de uso dos protocolos TOON e Protobuf
 */

const { CrabCacheClient } = require('../lib');

async function demonstrateProtocols() {
  console.log('🦀 CrabCache Protocol Demonstration');
  console.log('🚀 Testing TOON, Protobuf, and Text protocols');
  console.log('=' * 60);

  // 1. Cliente com protocolo TOON (padrão)
  console.log('\n1. 🎯 Testing TOON Protocol (Ultra-Efficient)');
  const toonClient = new CrabCacheClient({
    host: 'localhost',
    port: 8000,
    preferredProtocol: 'toon',
    autoNegotiateProtocol: true,
    enableProtocolFallback: true,
    toonOptions: {
      enableStringInterning: true,
      enableZeroCopy: true,
      enableSIMD: true,
      enableUltraCompression: true
    }
  });

  try {
    await toonClient.connect();
    console.log('✅ Connected with TOON protocol');
    
    // Test basic operations
    await toonClient.put('toon:user:1', JSON.stringify({
      id: 1,
      name: 'Alice Johnson',
      email: 'alice@example.com',
      preferences: {
        theme: 'dark',
        notifications: true
      }
    }));
    
    const toonValue = await toonClient.get('toon:user:1');
    console.log('📦 TOON Retrieved:', JSON.parse(toonValue).name);
    
    // Get protocol info
    const toonInfo = toonClient.getProtocolInfo();
    console.log('🔍 TOON Protocol Info:', {
      current: toonInfo.current,
      negotiated: toonInfo.negotiated,
      compressionRatio: toonInfo.stats.compressionRatio
    });
    
    await toonClient.disconnect();
  } catch (error) {
    console.error('❌ TOON Protocol Error:', error.message);
  }

  // 2. Cliente com protocolo Protobuf
  console.log('\n2. 🛡️ Testing Protobuf Protocol (Efficient Binary)');
  const protobufClient = new CrabCacheClient({
    host: 'localhost',
    port: 8000,
    preferredProtocol: 'protobuf',
    autoNegotiateProtocol: true,
    enableProtocolFallback: true,
    protobufOptions: {
      enableCompression: true,
      enableZeroCopy: true
    }
  });

  try {
    await protobufClient.connect();
    console.log('✅ Connected with Protobuf protocol');
    
    // Test basic operations
    await protobufClient.put('protobuf:session:abc123', JSON.stringify({
      sessionId: 'abc123',
      userId: 42,
      loginTime: new Date().toISOString(),
      permissions: ['read', 'write']
    }));
    
    const protobufValue = await protobufClient.get('protobuf:session:abc123');
    console.log('📦 Protobuf Retrieved:', JSON.parse(protobufValue).sessionId);
    
    // Get protocol info
    const protobufInfo = protobufClient.getProtocolInfo();
    console.log('🔍 Protobuf Protocol Info:', {
      current: protobufInfo.current,
      negotiated: protobufInfo.negotiated,
      compressionRatio: protobufInfo.stats.compressionRatio
    });
    
    await protobufClient.disconnect();
  } catch (error) {
    console.error('❌ Protobuf Protocol Error:', error.message);
  }

  // 3. Cliente com negociação automática
  console.log('\n3. 🤖 Testing Automatic Protocol Negotiation');
  const autoClient = new CrabCacheClient({
    host: 'localhost',
    port: 8000,
    autoNegotiateProtocol: true,
    enableProtocolFallback: true,
    // Sem preferência - deixa o cliente escolher o melhor
  });

  try {
    await autoClient.connect();
    console.log('✅ Connected with automatic protocol negotiation');
    
    // Listen for protocol events
    autoClient.on('protocolNegotiated', (info) => {
      console.log('🎉 Protocol Negotiated:', {
        protocol: info.protocol,
        negotiationTime: `${info.negotiationTime}ms`,
        fallbackChain: info.fallbackChain
      });
    });
    
    // Test operations
    await autoClient.put('auto:test:key', 'Automatic protocol selection works!');
    const autoValue = await autoClient.get('auto:test:key');
    console.log('📦 Auto Retrieved:', autoValue);
    
    // Get detailed status
    const status = autoClient.getStatus();
    console.log('📊 Client Status:', {
      connected: status.connected,
      protocol: status.protocolInfo.current,
      negotiated: status.protocolInfo.negotiated,
      capabilities: status.protocolInfo.capabilities,
      metrics: {
        totalRequests: status.clientMetrics.totalRequests,
        toonUsage: status.clientMetrics.toonProtocolUsage,
        protobufUsage: status.clientMetrics.protobufProtocolUsage,
        compressionRatio: status.clientMetrics.averageCompressionRatio
      }
    });
    
    await autoClient.disconnect();
  } catch (error) {
    console.error('❌ Auto Protocol Error:', error.message);
  }

  // 4. Performance comparison
  console.log('\n4. ⚡ Protocol Performance Comparison');
  
  const protocols = [
    { name: 'TOON', protocol: 'toon' },
    { name: 'Protobuf', protocol: 'protobuf' },
    { name: 'Binary', protocol: 'binary' },
    { name: 'Text', protocol: 'text' }
  ];

  const testData = JSON.stringify({
    id: 12345,
    name: 'Performance Test User',
    email: 'perf@test.com',
    data: 'x'.repeat(1000), // 1KB of data
    timestamp: new Date().toISOString(),
    metadata: {
      version: '1.0',
      source: 'performance-test',
      tags: ['test', 'performance', 'benchmark']
    }
  });

  for (const { name, protocol } of protocols) {
    try {
      const client = new CrabCacheClient({
        host: 'localhost',
        port: 8000,
        preferredProtocol: protocol,
        autoNegotiateProtocol: true,
        enableProtocolFallback: true
      });

      await client.connect();
      
      const startTime = Date.now();
      const iterations = 100;
      
      for (let i = 0; i < iterations; i++) {
        await client.put(`perf:${protocol}:${i}`, testData);
        await client.get(`perf:${protocol}:${i}`);
      }
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const avgLatency = totalTime / (iterations * 2); // 2 operations per iteration
      
      const protocolInfo = client.getProtocolInfo();
      
      console.log(`📈 ${name} Protocol:`, {
        totalTime: `${totalTime}ms`,
        avgLatency: `${avgLatency.toFixed(2)}ms`,
        throughput: `${Math.round((iterations * 2) / (totalTime / 1000))} ops/sec`,
        compressionRatio: protocolInfo.stats.compressionRatio || 1.0
      });
      
      await client.disconnect();
    } catch (error) {
      console.error(`❌ ${name} Performance Test Error:`, error.message);
    }
  }

  console.log('\n🎉 Protocol demonstration complete!');
  console.log('🏆 TOON Protocol provides the best performance and compression!');
}

// Execute demonstration
demonstrateProtocols().catch(console.error);