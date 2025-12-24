/**
 * Exemplo básico de uso do CrabCache Client
 */

const { CrabCacheClient } = require('../lib');

async function basicExample() {
  console.log('🦀 CrabCache Client - Exemplo Básico');
  console.log('===================================');

  // Criar cliente
  const client = new CrabCacheClient({
    host: 'localhost',
    port: 8000,
    connectionTimeout: 5000,
    commandTimeout: 10000
  });

  try {
    // Conectar
    console.log('📡 Conectando ao CrabCache...');
    await client.connect();
    console.log('✅ Conectado com sucesso!');

    // Teste PING
    console.log('\n🏓 Testando PING...');
    const pong = await client.ping();
    console.log(`Resposta: ${pong}`);

    // Teste PUT
    console.log('\n💾 Armazenando dados...');
    await client.put('usuario:123', JSON.stringify({
      nome: 'João Silva',
      email: 'joao@exemplo.com',
      idade: 30
    }));
    console.log('✅ Dados armazenados com sucesso!');

    // Teste GET
    console.log('\n📖 Recuperando dados...');
    const userData = await client.get('usuario:123');
    if (userData) {
      const user = JSON.parse(userData.toString());
      console.log('✅ Dados recuperados:', user);
    } else {
      console.log('❌ Dados não encontrados');
    }

    // Teste PUT com TTL
    console.log('\n⏰ Armazenando dados com TTL (60 segundos)...');
    await client.put('sessao:abc123', 'dados_da_sessao', 60);
    console.log('✅ Dados com TTL armazenados!');

    // Teste EXPIRE
    console.log('\n⏱️ Definindo TTL para chave existente...');
    const expired = await client.expire('usuario:123', 300);
    console.log(`✅ TTL definido: ${expired}`);

    // Teste DEL
    console.log('\n🗑️ Removendo dados...');
    const deleted = await client.del('sessao:abc123');
    console.log(`✅ Dados removidos: ${deleted}`);

    // Teste STATS
    console.log('\n📊 Obtendo estatísticas do servidor...');
    const stats = await client.stats();
    console.log('✅ Estatísticas:', JSON.stringify(stats, null, 2));

    // Teste METRICS
    console.log('\n📈 Obtendo métricas do servidor...');
    const metrics = await client.serverMetrics();
    console.log('✅ Métricas:', JSON.stringify(metrics, null, 2));

    // Mostrar métricas do cliente
    console.log('\n📈 Métricas do Cliente:');
    const clientMetrics = client.getClientMetrics();
    console.log(`  Total de requisições: ${clientMetrics.totalRequests}`);
    console.log(`  Requisições bem-sucedidas: ${clientMetrics.successfulRequests}`);
    console.log(`  Latência média: ${clientMetrics.averageLatency.toFixed(2)}ms`);

    // Mostrar status do pool
    console.log('\n🏊 Status do Pool de Conexões:');
    const poolStatus = client.getPoolMetrics();
    console.log(`  Conexões ativas: ${poolStatus.activeConnections}`);
    console.log(`  Conexões idle: ${poolStatus.idleConnections}`);
    console.log(`  Total criadas: ${poolStatus.totalCreated}`);

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    // Desconectar
    console.log('\n🔌 Desconectando...');
    await client.disconnect();
    console.log('✅ Desconectado com sucesso!');
  }
}

// Executar exemplo
if (require.main === module) {
  basicExample().catch(console.error);
}

module.exports = basicExample;