/**
 * Debug response test
 */

const { CrabCacheClient, ProtocolEncoder, ProtocolDecoder } = require('./lib');
const net = require('net');

async function debugResponse() {
  console.log('🔍 Debug Response Test');
  console.log('=====================');

  // Test direct connection to see what server returns
  const client = net.createConnection(8000, 'localhost');
  
  client.on('connect', () => {
    console.log('✅ Connected to server');
    
    // Test 1: Simple command
    console.log('\n1. Testing simple PUT...');
    client.write('PUT test1 simple_value\r\n');
  });

  let responseCount = 0;
  client.on('data', (data) => {
    responseCount++;
    console.log(`📥 Response ${responseCount}:`, JSON.stringify(data.toString()));
    console.log(`📥 Response ${responseCount} hex:`, data.toString('hex'));
    
    if (responseCount === 1) {
      // Test 2: PUT with spaces
      console.log('\n2. Testing PUT with spaces...');
      client.write('PUT test2 "value with spaces"\r\n');
    } else if (responseCount === 2) {
      // Test 3: GET
      console.log('\n3. Testing GET...');
      client.write('GET test1\r\n');
    } else if (responseCount === 3) {
      client.end();
    }
  });

  client.on('end', () => {
    console.log('✅ Connection ended');
  });

  client.on('error', (error) => {
    console.error('❌ Connection error:', error.message);
  });
}

debugResponse().catch(console.error);