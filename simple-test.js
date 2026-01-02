/**
 * Simple test to validate basic functionality
 */

const { CrabCacheClient } = require('./lib');

async function simpleTest() {
  console.log('🔍 Simple Test - CrabCache Client');
  console.log('=================================');

  const client = new CrabCacheClient({
    host: 'localhost',
    port: 8000,
    useBinaryProtocol: false, // Use text protocol
    connectionTimeout: 5000,
    commandTimeout: 10000
  });

  try {
    await client.connect();
    console.log('✅ Connected!');

    // Test 1: Simple string
    console.log('\n1. Testing simple string...');
    await client.put('test1', 'simple_value');
    const value1 = await client.get('test1');
    console.log(`✅ Simple: ${value1}`);

    // Test 2: String with spaces (no quotes)
    console.log('\n2. Testing string with spaces...');
    await client.put('test2', 'value with spaces');
    const value2 = await client.get('test2');
    console.log(`✅ Spaces: ${value2}`);

    // Test 3: Simple JSON (no spaces in values)
    console.log('\n3. Testing simple JSON...');
    const simpleJson = '{"name":"John","age":30}';
    await client.put('test3', simpleJson);
    const value3 = await client.get('test3');
    console.log(`✅ Simple JSON: ${value3}`);

    // Test 4: JSON with spaces in values
    console.log('\n4. Testing JSON with spaces...');
    const jsonWithSpaces = '{"name":"John Doe","city":"New York"}';
    await client.put('test4', jsonWithSpaces);
    const value4 = await client.get('test4');
    console.log(`✅ JSON with spaces: ${value4}`);

    // Test 5: Complex JSON
    console.log('\n5. Testing complex JSON...');
    const complexJson = JSON.stringify({
      id: 123,
      name: 'João Silva',
      email: 'joao@example.com',
      active: true
    });
    await client.put('test5', complexJson);
    const value5 = await client.get('test5');
    console.log(`✅ Complex JSON: ${value5}`);

    // Test 6: TTL
    console.log('\n6. Testing TTL...');
    await client.put('test6', 'ttl_value', 60);
    const value6 = await client.get('test6');
    console.log(`✅ TTL: ${value6}`);

    // Test 7: Delete
    console.log('\n7. Testing DELETE...');
    const deleted = await client.del('test1');
    console.log(`✅ Deleted: ${deleted}`);

    // Test 8: Stats
    console.log('\n8. Testing STATS...');
    const stats = await client.stats();
    console.log(`✅ Stats: ${JSON.stringify(stats, null, 2)}`);

    console.log('\n🎉 All tests passed!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await client.disconnect();
    console.log('✅ Disconnected!');
  }
}

simpleTest().catch(console.error);