/**
 * Debug test for CrabCache client
 */

const { CrabCacheClient } = require('./lib');

async function debugTest() {
  console.log('🔍 Debug Test - CrabCache Client');
  console.log('================================');

  const client = new CrabCacheClient({
    host: 'localhost',
    port: 8000,
    useBinaryProtocol: false, // Use text protocol
    connectionTimeout: 5000,
    commandTimeout: 10000
  });

  try {
    console.log('📡 Connecting...');
    await client.connect();
    console.log('✅ Connected!');

    console.log('\n🏓 Testing PING...');
    const pong = await client.ping();
    console.log(`✅ PING response: ${pong}`);

    console.log('\n💾 Testing PUT with simple data...');
    try {
      await client.put('test_key', 'test_value');
      console.log('✅ PUT successful!');
    } catch (error) {
      console.error('❌ PUT failed:', error.message);
      console.error('Error details:', error);
    }

    console.log('\n📖 Testing GET...');
    try {
      const value = await client.get('test_key');
      console.log(`✅ GET response: ${value}`);
    } catch (error) {
      console.error('❌ GET failed:', error.message);
    }

    console.log('\n🗑️ Testing DEL...');
    try {
      const deleted = await client.del('test_key');
      console.log(`✅ DEL response: ${deleted}`);
    } catch (error) {
      console.error('❌ DEL failed:', error.message);
    }

  } catch (error) {
    console.error('❌ Connection error:', error.message);
  } finally {
    console.log('\n🔌 Disconnecting...');
    await client.disconnect();
    console.log('✅ Disconnected!');
  }
}

debugTest().catch(console.error);