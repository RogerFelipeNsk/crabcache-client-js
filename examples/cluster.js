/**
 * Exemplo de uso do CrabCache Client com clustering distribuído
 */

const { CrabCacheClient } = require('../lib/index');

async function clusterExample() {
  console.log('🦀 CrabCache Client - Exemplo de Clustering Distribuído\n');

  // Configuração do cluster
  const client = new CrabCacheClient({
    enableCluster: true,
    nodes: [
      { host: 'localhost', port: 8000, weight: 1 },
      { host: 'localhost', port: 8001, weight: 1 },
      { host: 'localhost', port: 8002, weight: 2 } // Peso maior
    ],
    loadBalancingStrategy: 'adaptive', // Estratégia inteligente
    enableFailover: true,
    healthCheckInterval: 5000, // 5 segundos
    poolSize: 5 // 5 conexões por nó
  });

  try {
    console.log('📡 Conectando ao cluster...');
    await client.connect();
    console.log('✅ Conectado ao cluster CrabCache!\n');

    // Mostrar status do cluster
    const status = client.getStatus();
    console.log('📊 Status do Cluster:');
    console.log(`   Modo Cluster: ${status.clusterMode}`);
    console.log(`   Conectado: ${status.connected}`);
    console.log(`   Nós Totais: ${status.clusterMetrics?.totalNodes}`);
    console.log(`   Nós Ativos: ${status.clusterMetrics?.activeNodes}`);
    console.log(`   Estratégia: ${status.clusterMetrics?.loadBalancingStrategy}\n`);

    // Operações básicas distribuídas
    console.log('🔄 Executando operações distribuídas...');
    
    // Armazenar dados (distribuído automaticamente)
    await client.put('user:alice', JSON.stringify({ 
      name: 'Alice', 
      role: 'admin',
      timestamp: Date.now()
    }));
    
    await client.put('user:bob', JSON.stringify({ 
      name: 'Bob', 
      role: 'user',
      timestamp: Date.now()
    }));
    
    await client.put('session:123', 'active', 3600); // Com TTL
    
    console.log('✅ Dados armazenados no cluster');

    // Recuperar dados
    const alice = await client.get('user:alice');
    const bob = await client.get('user:bob');
    const session = await client.get('session:123');
    
    console.log('📥 Dados recuperados:');
    console.log(`   Alice: ${alice}`);
    console.log(`   Bob: ${bob}`);
    console.log(`   Session: ${session}\n`);

    // Pipeline distribuído
    console.log('⚡ Executando pipeline distribuído...');
    const pipeline = client.pipeline();
    
    pipeline
      .put('product:1', JSON.stringify({ name: 'Laptop', price: 1200 }))
      .put('product:2', JSON.stringify({ name: 'Mouse', price: 25 }))
      .get('product:1')
      .get('product:2')
      .ping();
    
    const pipelineResults = await pipeline.execute();
    console.log(`✅ Pipeline executado: ${pipelineResults.length} comandos\n`);

    // Múltiplos comandos
    console.log('🔀 Executando múltiplos comandos...');
    const multiResults = await client.multi([
      { command: 'PUT', args: ['counter:views', '100'] },
      { command: 'PUT', args: ['counter:likes', '50'] },
      { command: 'GET', args: ['counter:views'] },
      { command: 'GET', args: ['counter:likes'] },
      { command: 'PING', args: [] }
    ]);
    
    console.log('✅ Múltiplos comandos executados:', multiResults.filter(r => r !== null).length, 'sucessos\n');

    // Estatísticas do cluster
    console.log('📈 Coletando estatísticas do cluster...');
    const clusterStats = await client.stats();
    console.log('📊 Estatísticas do Cluster:');
    console.log(`   Operações Totais: ${clusterStats.total_operations}`);
    console.log(`   Cache Hits: ${clusterStats.cache_hits}`);
    console.log(`   Hit Ratio: ${(clusterStats.hit_ratio * 100).toFixed(1)}%`);
    console.log(`   Memória Usada: ${(clusterStats.memory_usage / 1024 / 1024).toFixed(1)} MB`);
    
    if (clusterStats.cluster_nodes) {
      console.log(`   Nós do Cluster: ${clusterStats.cluster_nodes}`);
      console.log(`   Nós Ativos: ${clusterStats.cluster_active_nodes}`);
      console.log(`   Throughput: ${clusterStats.cluster_throughput.toFixed(0)} ops/sec`);
      console.log(`   Eficiência LB: ${(clusterStats.cluster_load_balance_efficiency * 100).toFixed(1)}%`);
      console.log(`   Tolerância a Falhas: ${(clusterStats.cluster_fault_tolerance_rate * 100).toFixed(1)}%`);
    }
    console.log();

    // Métricas do cliente
    const clientMetrics = client.getClientMetrics();
    console.log('📊 Métricas do Cliente:');
    console.log(`   Requisições Totais: ${clientMetrics.totalRequests}`);
    console.log(`   Taxa de Sucesso: ${((clientMetrics.successfulRequests / clientMetrics.totalRequests) * 100).toFixed(1)}%`);
    console.log(`   Latência Média: ${clientMetrics.averageLatency.toFixed(1)}ms`);
    console.log(`   Requisições Pipeline: ${clientMetrics.pipelineRequests}`);
    console.log(`   Requisições Cluster: ${clientMetrics.clusterRequests || 0}`);
    console.log(`   Eventos Failover: ${clientMetrics.failoverEvents || 0}`);
    console.log(`   Eficiência LB: ${((clientMetrics.loadBalancingEfficiency || 0) * 100).toFixed(1)}%\n`);

    // Métricas detalhadas do cluster
    const clusterMetrics = client.getClusterMetrics();
    if (clusterMetrics) {
      console.log('🔍 Métricas Detalhadas por Nó:');
      clusterMetrics.nodeMetrics.forEach(node => {
        console.log(`   📍 ${node.host}:${node.port}`);
        console.log(`      Status: ${node.active ? '🟢 Ativo' : '🔴 Inativo'}`);
        console.log(`      Peso: ${node.weight}`);
        console.log(`      Requisições: ${node.requestCount}`);
        console.log(`      Erros: ${node.errorCount}`);
        console.log(`      Latência: ${node.averageLatency.toFixed(1)}ms`);
        console.log(`      Health: ${node.healthCheckStatus}`);
        console.log(`      Última Verificação: ${node.lastHealthCheck.toLocaleTimeString()}`);
        console.log();
      });
    }

    // Demonstrar diferentes estratégias de load balancing
    console.log('⚖️ Testando diferentes estratégias de load balancing...');
    
    const strategies = ['round_robin', 'weighted', 'resource_based', 'adaptive'];
    
    for (const strategy of strategies) {
      console.log(`\n🔄 Testando estratégia: ${strategy}`);
      
      // Criar novo cliente com estratégia específica
      const testClient = new CrabCacheClient({
        enableCluster: true,
        nodes: [
          { host: 'localhost', port: 8000, weight: 1 },
          { host: 'localhost', port: 8001, weight: 2 },
          { host: 'localhost', port: 8002, weight: 3 }
        ],
        loadBalancingStrategy: strategy,
        enableFailover: true
      });
      
      try {
        await testClient.connect();
        
        // Executar algumas operações
        for (let i = 0; i < 5; i++) {
          await testClient.put(`test:${strategy}:${i}`, `value-${i}`);
        }
        
        const testMetrics = testClient.getClientMetrics();
        console.log(`   ✅ ${testMetrics.totalRequests} operações executadas`);
        console.log(`   📊 Eficiência: ${((testMetrics.loadBalancingEfficiency || 0) * 100).toFixed(1)}%`);
        
        await testClient.disconnect();
      } catch (error) {
        console.log(`   ❌ Erro ao testar ${strategy}: ${error.message}`);
      }
    }

    console.log('\n🎉 Exemplo de clustering concluído com sucesso!');
    console.log('💡 O cliente automaticamente:');
    console.log('   • Distribui requisições entre nós ativos');
    console.log('   • Monitora saúde dos nós');
    console.log('   • Realiza failover automático');
    console.log('   • Coleta métricas detalhadas');
    console.log('   • Otimiza performance com load balancing');

  } catch (error) {
    console.error('❌ Erro no exemplo de clustering:', error.message);
    
    // Mostrar informações de diagnóstico
    const status = client.getStatus();
    console.log('\n🔍 Informações de Diagnóstico:');
    console.log(`   Modo Cluster: ${status.clusterMode}`);
    console.log(`   Conectado: ${status.connected}`);
    
    if (status.clusterMetrics) {
      console.log(`   Nós Ativos: ${status.clusterMetrics.activeNodes}/${status.clusterMetrics.totalNodes}`);
      console.log(`   Eventos Failover: ${status.clusterMetrics.failoverEvents}`);
    }
    
    console.log('\n💡 Dicas de Troubleshooting:');
    console.log('   • Verifique se os nós do cluster estão rodando');
    console.log('   • Confirme os endereços e portas dos nós');
    console.log('   • Verifique conectividade de rede');
    console.log('   • Monitore logs de health check');
  } finally {
    await client.disconnect();
    console.log('\n👋 Cliente desconectado do cluster');
  }
}

// Executar exemplo se chamado diretamente
if (require.main === module) {
  clusterExample().catch(console.error);
}

module.exports = { clusterExample };