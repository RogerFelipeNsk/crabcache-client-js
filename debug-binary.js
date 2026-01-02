/**
 * Debug binary protocol test
 */

const { ProtocolEncoder, ProtocolDecoder } = require('./lib');
const net = require('net');

async function debugBinary() {
  console.log('🔍 Debug Binary Protocol Test');
  console.log('=============================');

  const client = net.createConnection(8000, 'localhost');
  
  client.on('connect', () => {
    console.log('✅ Connected to server');
    
    // Test 1: Binary PING
    console.log('\n1. Testing binary PING...');
    const pingCommand = ProtocolEncoder.encodeBinaryCommand('PING', []);
    console.log('📤 Sending PING:', pingCommand.toString('hex'));
    client.write(pingCommand);
  });

  let responseCount = 0;
  client.on('data', (data) => {
    responseCount++;
    console.log(`📥 Binary Response ${responseCount}:`, data.toString('hex'));
    
    try {
      const decoded = ProtocolDecoder.decodeBinaryResponse(data);
      console.log(`📥 Decoded Response ${responseCount}:`, decoded);
    } catch (error) {
      console.log(`❌ Decode error ${responseCount}:`, error.message);
    }
    
    if (responseCount === 1) {
      // Test 2: Binary PUT
      console.log('\n2. Testing binary PUT...');
      const putCommand = ProtocolEncoder.encodeBinaryCommand('PUT', ['test_key', 'test_value']);
      console.log('📤 Sending PUT:', putCommand.toString('hex'));
      client.write(putCommand);
    } else if (responseCount === 2) {
      // Test 3: Binary GET
      console.log('\n3. Testing binary GET...');
      const getCommand = ProtocolEncoder.encodeBinaryCommand('GET', ['test_key']);
      console.log('📤 Sending GET:', getCommand.toString('hex'));
      client.write(getCommand);
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

debugBinary().catch(console.error);