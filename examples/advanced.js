/**
 * Exemplo avançado com protocolo binário, pool de conexões e monitoramento
 */

const { CrabCacheClient } = require('../lib');

async function advancedExample() {
  console.log('🔬 CrabCache Client - Exemplo Avançado');
  console.log('=====================================');

  // Cliente com configuração avançada
  const client = new CrabCacheClient({
    host: 'localhost',
    port: 8000,
    useBinaryProtocol: true,  // Protocolo binário para melhor performance
    poolSize: 20,             // Pool maior para alta concorrência
    connectionTimeout: 3000,
    commandTimeout: 5000,
    enablePipelining: true,
    pipelineBatchSize: 200
  });

  // Configurar eventos do cliente
  client.on('connected', () => {
    console.log('🔗 Cliente conectado');
  });

  client.on('disconnected', () => {
    console.log('🔌 Cliente desconectado');
  });

  client.on('connectionError', (error) => {
    console.log('⚠️ Erro de conexão:', error.message);
  });

  client.on('connectionCreated', () => {
    console.log('➕ Nova conexão criada no pool');
  });

  client.on('connectionRemoved', () => {
    console.log('➖ Conexão removida do pool');
  });

  try {
    // Conectar com warm-up do pool
    console.log('🚀 Conectando com warm-up do pool...');
    await client.connect();
    
    // Aguardar um pouco para o warm-up
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('✅ Conectado com protocolo binário!');

    // Exemplo 1: Teste de performance com protocolo binário
    console.log('\n⚡ Exemplo 1: Performance com Protocolo Binário');
    
    const binaryTestStart = Date.now();
    const binaryPipeline = client.pipeline();
    
    // Adicionar muitos comandos para testar performance
    for (let i = 0; i < 500; i++) {
      binaryPipeline.put(`binary:${i}`, Buffer.from(`dados_binarios_${i}`));
    }
    
    const binaryResponses = await binaryPipeline.execute();
    const binaryDuration = Date.now() - binaryTestStart;
    const binaryOpsPerSec = 500 / (binaryDuration / 1000);
    
    console.log(`✅ 500 comandos binários em ${binaryDuration}ms`);
    console.log(`📊 Performance: ${binaryOpsPerSec.toFixed(0)} ops/sec`);
    console.log(`✅ ${binaryResponses.filter(r => r.success).length}/500 comandos bem-sucedidos`);

    // Exemplo 2: Teste de concorrência com múltiplas conexões
    console.log('\n🏃 Exemplo 2: Teste de Concorrência');
    
    const concurrentStart = Date.now();
    const concurrentPromises = [];
    
    // Criar 10 operações concorrentes
    for (let i = 0; i < 10; i++) {
      const promise = (async () => {
        const pipeline = client.pipeline();
        
        // Cada pipeline com 50 comandos
        for (let j = 0; j < 50; j++) {
          const key = `concurrent:${i}:${j}`;
          const value = { thread: i, index: j, timestamp: Date.now() };
          pipeline.put(key, JSON.stringify(value));
        }
        
        return await pipeline.execute();
      })();
      
      concurrentPromises.push(promise);
    }
    
    const concurrentResults = await Promise.all(concurrentPromises);
    const concurrentDuration = Date.now() - concurrentStart;
    const totalConcurrentOps = concurrentResults.reduce((sum, results) => sum + results.length, 0);
    const concurrentOpsPerSec = totalConcurrentOps / (concurrentDuration / 1000);
    
    console.log(`✅ ${totalConcurrentOps} comandos concorrentes em ${concurrentDuration}ms`);
    console.log(`📊 Performance: ${concurrentOpsPerSec.toFixed(0)} ops/sec`);
    
    // Verificar sucesso de cada thread
    concurrentResults.forEach((results, index) => {
      const successCount = results.filter(r => r.success).length;
      console.log(`  Thread ${index}: ${successCount}/${results.length} sucessos`);
    });

    // Exemplo 3: Monitoramento em tempo real
    console.log('\n📊 Exemplo 3: Monitoramento em Tempo Real');
    
    // Função para mostrar métricas
    const showMetrics = () => {
      const clientMetrics = client.getClientMetrics();
      const poolMetrics = client.getPoolMetrics();
      const status = client.getStatus();
      
      console.log('\n📈 Métricas Atuais:');
      console.log(`  Cliente:`);
      console.log(`    Total de requisições: ${clientMetrics.totalRequests}`);
      console.log(`    Taxa de sucesso: ${((clientMetrics.successfulRequests / clientMetrics.totalRequests) * 100).toFixed(1)}%`);
      console.log(`    Latência média: ${clientMetrics.averageLatency.toFixed(2)}ms`);
      console.log(`    Uso de protocolo binário: ${clientMetrics.binaryProtocolUsage}`);
      console.log(`    Requisições de pipeline: ${clientMetrics.pipelineRequests}`);
      
      console.log(`  Pool de Conexões:`);
      console.log(`    Conexões ativas: ${poolMetrics.activeConnections}`);
      console.log(`    Conexões idle: ${poolMetrics.idleConnections}`);
      console.log(`    Total criadas: ${poolMetrics.totalCreated}`);
      console.log(`    Pool hits: ${poolMetrics.poolHits}`);
      console.log(`    Pool misses: ${poolMetrics.poolMisses}`);
      console.log(`    Falhas de health check: ${poolMetrics.healthCheckFailures}`);
    };
    
    // Executar operações enquanto monitora
    const monitoringInterval = setInterval(showMetrics, 2000);
    
    // Simular carga de trabalho contínua
    console.log('🔄 Iniciando carga de trabalho contínua...');
    
    for (let batch = 0; batch < 5; batch++) {
      const batchPipeline = client.pipeline();
      
      // Mix de operações
      for (let i = 0; i < 100; i++) {
        const key = `monitoring:${batch}:${i}`;
        batchPipeline.put(key, `batch_${batch}_item_${i}`, 60);
      }
      
      for (let i = 0; i < 50; i++) {
        const key = `monitoring:${batch}:${i}`;
        batchPipeline.get(key);
      }
      
      for (let i = 0; i < 25; i++) {
        batchPipeline.ping();
      }
      
      await batchPipeline.execute();
      
      // Pequena pausa entre lotes
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    clearInterval(monitoringInterval);
    console.log('✅ Carga de trabalho concluída');

    // Exemplo 4: Teste de recuperação de falhas
    console.log('\n🛡️ Exemplo 4: Teste de Recuperação');
    
    try {
      // Tentar conectar a um servidor inexistente para testar recuperação
      const testClient = new CrabCacheClient({
        host: 'localhost',
        port: 9999, // Porta inexistente
        connectionTimeout: 1000
      });
      
      await testClient.connect();
    } catch (error) {
      console.log(`✅ Erro esperado capturado: ${error.message}`);
    }

    // Exemplo 5: Operações com dados binários
    console.log('\n🔢 Exemplo 5: Dados Binários');
    
    const binaryData = Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x20, 0x42, 0x69, 0x6e, 0x61, 0x72, 0x79]);
    const imageData = Buffer.alloc(1024, 0xFF); // Simular dados de imagem
    
    await client.put('binary:hello', binaryData);
    await client.put('binary:image', imageData);
    
    const retrievedBinary = await client.get('binary:hello');
    const retrievedImage = await client.get('binary:image');
    
    console.log(`✅ Dados binários: ${retrievedBinary ? retrievedBinary.toString() : 'null'}`);
    console.log(`✅ Dados de imagem: ${retrievedImage ? retrievedImage.length + ' bytes' : 'null'}`);

    // Exemplo 6: Estatísticas do servidor
    console.log('\n📊 Exemplo 6: Estatísticas do Servidor');
    
    try {
      const serverStats = await client.stats();
      console.log('📈 Estatísticas do CrabCache:');
      console.log(JSON.stringify(serverStats, null, 2));
    } catch (error) {
      console.log(`⚠️ Não foi possível obter estatísticas: ${error.message}`);
    }

    // Métricas finais
    console.log('\n🏁 Métricas Finais:');
    showMetrics();

  } catch (error) {
    console.error('❌ Erro no exemplo avançado:', error.message);
    console.error(error.stack);
  } finally {
    console.log('\n🔌 Desconectando...');
    await client.disconnect();
    console.log('✅ Exemplo avançado concluído!');
  }
}

// Executar exemplo
if (require.main === module) {
  advancedExample().catch(console.error);
}

module.exports = advancedExample;