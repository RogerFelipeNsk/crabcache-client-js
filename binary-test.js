/**
 * Binary protocol test for CrabCache client
 */

const { CrabCacheClient } = require('./lib');

async function binaryTest() {
  console.log('🔍 Binary Protocol Test - CrabCache Client');
  console.log('==========================================');

  const client = new CrabCacheClient({
    host: 'localhost',
    port: 8000,
    useBinaryProtocol: true, // Use binary protocol
    connectionTimeout: 5000,
    commandTimeout: 10000
  });

  try {
    await client.connect();
    console.log('✅ Connected with binary protocol!');

    console.log('\n🏓 Testing PING...');
    const pong = await client.ping();
    console.log(`✅ PING response: ${pong}`);

    // Test with JSON data
    const jsonData = JSON.stringify({
      nome: 'João Silva',
      email: 'joao@exemplo.com',
      idade: 30
    });

    console.log('\n💾 Testing PUT with JSON data (binary protocol)...');
    console.log(`Data: ${jsonData}`);
    
    try {
      await client.put('usuario:123', jsonData);
      console.log('✅ PUT with JSON successful!');
    } catch (error) {
      console.error('❌ PUT with JSON failed:', error.message);
    }

    console.log('\n📖 Testing GET JSON data...');
    try {
      const value = await client.get('usuario:123');
      console.log(`✅ GET response: ${value}`);
      
      if (value) {
        const parsed = JSON.parse(value.toString());
        console.log('✅ Parsed JSON:', parsed);
      }
    } catch (error) {
      console.error('❌ GET failed:', error.message);
    }

    console.log('\n🗑️ Testing DEL...');
    try {
      const deleted = await client.del('usuario:123');
      console.log(`✅ DEL response: ${deleted}`);
    } catch (error) {
      console.error('❌ DEL failed:', error.message);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.disconnect();
    console.log('✅ Disconnected!');
  }
}

binaryTest().catch(console.error);