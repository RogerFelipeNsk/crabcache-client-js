/**
 * Exemplo de uso de pipelining para alta performance
 */

const { CrabCacheClient } = require('../lib');

async function pipelineExample() {
  console.log('🚀 CrabCache Client - Exemplo de Pipelining');
  console.log('===========================================');

  const client = new CrabCacheClient({
    host: 'localhost',
    port: 8000,
    enablePipelining: true,
    pipelineBatchSize: 100
  });

  try {
    await client.connect();
    console.log('✅ Conectado ao CrabCache');

    // Exemplo 1: Pipeline básico
    console.log('\n📦 Exemplo 1: Pipeline Básico');
    const startTime1 = Date.now();
    
    const pipeline1 = client.pipeline();
    pipeline1
      .put('produto:1', JSON.stringify({ nome: 'Notebook', preco: 2500 }))
      .put('produto:2', JSON.stringify({ nome: 'Mouse', preco: 50 }))
      .put('produto:3', JSON.stringify({ nome: 'Teclado', preco: 150 }))
      .get('produto:1')
      .get('produto:2')
      .get('produto:3')
      .ping();

    const responses1 = await pipeline1.execute();
    const duration1 = Date.now() - startTime1;
    
    console.log(`✅ Pipeline executado em ${duration1}ms`);
    console.log(`📊 ${responses1.length} comandos processados`);
    
    // Analisar respostas
    let successCount = 0;
    responses1.forEach((resp, index) => {
      if (resp.success) {
        successCount++;
        if (resp.value && typeof resp.value === 'string' && resp.value.startsWith('{')) {
          console.log(`  Comando ${index + 1}: ${JSON.parse(resp.value).nome}`);
        } else {
          console.log(`  Comando ${index + 1}: ${resp.value}`);
        }
      } else {
        console.log(`  Comando ${index + 1}: ERRO - ${resp.error}`);
      }
    });
    console.log(`✅ ${successCount}/${responses1.length} comandos bem-sucedidos`);

    // Exemplo 2: Comparação de performance (individual vs pipeline)
    console.log('\n⚡ Exemplo 2: Comparação de Performance');
    
    // Comandos individuais
    console.log('  Executando 50 comandos individuais...');
    const startIndividual = Date.now();
    
    for (let i = 0; i < 50; i++) {
      await client.put(`individual:${i}`, `valor_${i}`);
    }
    
    const individualDuration = Date.now() - startIndividual;
    const individualOpsPerSec = 50 / (individualDuration / 1000);
    
    console.log(`  ⏱️ Comandos individuais: ${individualDuration}ms (${individualOpsPerSec.toFixed(0)} ops/sec)`);
    
    // Pipeline
    console.log('  Executando 50 comandos em pipeline...');
    const startPipeline = Date.now();
    
    const pipeline2 = client.pipeline();
    for (let i = 0; i < 50; i++) {
      pipeline2.put(`pipeline:${i}`, `valor_${i}`);
    }
    
    await pipeline2.execute();
    const pipelineDuration = Date.now() - startPipeline;
    const pipelineOpsPerSec = 50 / (pipelineDuration / 1000);
    
    console.log(`  🚀 Pipeline: ${pipelineDuration}ms (${pipelineOpsPerSec.toFixed(0)} ops/sec)`);
    
    const improvement = pipelineOpsPerSec / individualOpsPerSec;
    console.log(`  📈 Melhoria: ${improvement.toFixed(1)}x mais rápido`);

    // Exemplo 3: Pipeline com workload misto
    console.log('\n🔀 Exemplo 3: Workload Misto');
    const startMixed = Date.now();
    
    const pipeline3 = client.pipeline();
    
    // Adicionar dados
    for (let i = 0; i < 20; i++) {
      pipeline3.put(`misto:${i}`, `dados_${i}`, 300); // Com TTL
    }
    
    // Ler alguns dados
    for (let i = 0; i < 15; i++) {
      pipeline3.get(`misto:${i}`);
    }
    
    // Remover alguns dados
    for (let i = 0; i < 10; i++) {
      pipeline3.del(`misto:${i}`);
    }
    
    // Adicionar alguns pings
    for (let i = 0; i < 5; i++) {
      pipeline3.ping();
    }
    
    const mixedResponses = await pipeline3.execute();
    const mixedDuration = Date.now() - startMixed;
    const mixedOpsPerSec = mixedResponses.length / (mixedDuration / 1000);
    
    console.log(`✅ ${mixedResponses.length} comandos mistos em ${mixedDuration}ms`);
    console.log(`📊 Performance: ${mixedOpsPerSec.toFixed(0)} ops/sec`);
    
    // Analisar tipos de resposta
    const responseTypes = {
      ok: 0,
      value: 0,
      null: 0,
      pong: 0,
      error: 0
    };
    
    mixedResponses.forEach(resp => {
      if (resp.success) {
        if (resp.value === 'OK') responseTypes.ok++;
        else if (resp.value === 'PONG') responseTypes.pong++;
        else if (resp.value === null) responseTypes.null++;
        else responseTypes.value++;
      } else {
        responseTypes.error++;
      }
    });
    
    console.log('  Tipos de resposta:', responseTypes);

    // Exemplo 4: Pipeline em lotes grandes
    console.log('\n📊 Exemplo 4: Pipeline em Lotes Grandes');
    const startBatch = Date.now();
    
    const largePipeline = client.pipeline();
    
    // Adicionar 1000 comandos
    for (let i = 0; i < 1000; i++) {
      largePipeline.put(`lote:${i}`, `valor_lote_${i}`);
    }
    
    // Executar em lotes para otimizar
    const batchResponses = await largePipeline.executeBatched(100);
    const batchDuration = Date.now() - startBatch;
    const batchOpsPerSec = 1000 / (batchDuration / 1000);
    
    console.log(`✅ 1000 comandos em lotes de 100: ${batchDuration}ms`);
    console.log(`📊 Performance: ${batchOpsPerSec.toFixed(0)} ops/sec`);
    console.log(`✅ ${batchResponses.filter(r => r.success).length}/1000 comandos bem-sucedidos`);

    // Exemplo 5: Usando multi() para conveniência
    console.log('\n🎯 Exemplo 5: Método multi() Conveniente');
    const startMulti = Date.now();
    
    const multiCommands = [
      { command: 'PUT', args: ['multi:1', 'valor1'] },
      { command: 'PUT', args: ['multi:2', 'valor2'] },
      { command: 'GET', args: ['multi:1'] },
      { command: 'GET', args: ['multi:2'] },
      { command: 'PING', args: [] },
      { command: 'DEL', args: ['multi:1'] }
    ];
    
    const multiResults = await client.multi(multiCommands);
    const multiDuration = Date.now() - startMulti;
    
    console.log(`✅ Multi executado em ${multiDuration}ms`);
    console.log('  Resultados:', multiResults);

    // Mostrar métricas finais
    console.log('\n📈 Métricas Finais do Cliente:');
    const finalMetrics = client.getClientMetrics();
    console.log(`  Total de requisições: ${finalMetrics.totalRequests}`);
    console.log(`  Requisições de pipeline: ${finalMetrics.pipelineRequests}`);
    console.log(`  Taxa de sucesso: ${((finalMetrics.successfulRequests / finalMetrics.totalRequests) * 100).toFixed(1)}%`);
    console.log(`  Latência média: ${finalMetrics.averageLatency.toFixed(2)}ms`);

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.disconnect();
    console.log('\n✅ Exemplo de pipelining concluído!');
  }
}

// Executar exemplo
if (require.main === module) {
  pipelineExample().catch(console.error);
}

module.exports = pipelineExample;