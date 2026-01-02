/**
 * Protocol debug test
 */

const { ProtocolEncoder } = require('./lib/protocol');

// Test encoding
const jsonData = JSON.stringify({
  nome: 'João Silva',
  email: 'joao@exemplo.com',
  idade: 30
});

console.log('Original JSON:', jsonData);

const encoded = ProtocolEncoder.encodeTextCommand('PUT', ['usuario:123', jsonData]);
console.log('Encoded command:', encoded.toString());
console.log('Encoded hex:', encoded.toString('hex'));
console.log('Encoded as string with escapes:', JSON.stringify(encoded.toString()));