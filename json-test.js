/**
 * JSON test for CrabCache client
 */

const { CrabCacheClient } = require('./lib');

async function jsonTest() {
  console.log('🔍 JSON Test - CrabCache Client');
  console.log('===============================');

  const client = new CrabCacheClient({
    host: 'localhost',
    port: 8000,
    useBinaryProtocol: false,
    connectionTimeout: 5000,
    commandTimeout: 10000
  });

  try {
    await client.connect();
    console.log('✅ Connected!');

    // Test with JSON data like in the original example
    const jsonData = JSON.stringify({
      nome: 'João Silva',
      email: 'joao@exemplo.com',
      idade: 30
    });

    console.log('\n💾 Testing PUT with JSON data...');
    console.log(`Data: ${jsonData}`);
    
    try {
      await client.put('usuario:123', jsonData);
      console.log('✅ PUT with JSON successful!');
    } catch (error) {
      console.error('❌ PUT with JSON failed:', error.message);
      console.error('Error details:', error);
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

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.disconnect();
    console.log('✅ Disconnected!');
  }
}

jsonTest().catch(console.error);