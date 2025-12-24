# 🚀 Guia de Instalação - CrabCache Client

Este guia mostra como instalar e configurar o cliente Node.js para CrabCache.

## 📋 Pré-requisitos

- **Node.js**: >= 16.0.0
- **npm** ou **yarn**
- **CrabCache Server**: >= 1.0.0 rodando

## 📦 Instalação

### Via npm

```bash
npm install crabcache-client
```

### Via yarn

```bash
yarn add crabcache-client
```

### Via pnpm

```bash
pnpm add crabcache-client
```

## 🔧 Configuração do Servidor CrabCache

Antes de usar o cliente, certifique-se de que o servidor CrabCache está rodando.

### Opção 1: Docker (Recomendado)

```bash
# Executar CrabCache com configuração padrão
docker run -p 8000:8000 -p 9090:9090 crabcache:latest

# Com persistência WAL
docker run -p 8000:8000 -p 9090:9090 \
  -e CRABCACHE_ENABLE_WAL=true \
  -v /data/wal:/app/data/wal \
  crabcache:latest

# Com autenticação
docker run -p 8000:8000 -p 9090:9090 \
  -e CRABCACHE_ENABLE_AUTH=true \
  -e CRABCACHE_AUTH_TOKEN=meu-token-secreto \
  crabcache:latest
```

### Opção 2: Código Fonte

```bash
# Clonar e compilar CrabCache
git clone https://github.com/RogerFelipeNsk/crabcache.git
cd crabcache
cargo build --release

# Executar
./target/release/crabcache
```

## 🎯 Teste Rápido

Crie um arquivo `test.js`:

```javascript
const { CrabCacheClient } = require('crabcache-client');

async function teste() {
  const client = new CrabCacheClient({
    host: 'localhost',
    port: 8000
  });

  try {
    await client.connect();
    console.log('✅ Conectado ao CrabCache!');
    
    await client.put('teste', 'funcionando');
    const valor = await client.get('teste');
    console.log('✅ Valor recuperado:', valor);
    
    const pong = await client.ping();
    console.log('✅ Ping:', pong);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.disconnect();
  }
}

teste();
```

Execute:

```bash
node test.js
```

## 🔧 Configurações Avançadas

### Cliente com Protocolo Binário

```javascript
const client = new CrabCacheClient({
  host: 'localhost',
  port: 8000,
  useBinaryProtocol: true,  // Melhor performance
  poolSize: 20,             // Mais conexões
  enablePipelining: true    // Pipelining habilitado
});
```

### Cliente com Autenticação

```javascript
const client = new CrabCacheClient({
  host: 'localhost',
  port: 8000,
  authToken: 'meu-token-secreto'
});
```

### Cliente para Produção

```javascript
const client = new CrabCacheClient({
  host: process.env.CRABCACHE_HOST || 'localhost',
  port: parseInt(process.env.CRABCACHE_PORT) || 8000,
  authToken: process.env.CRABCACHE_TOKEN,
  
  // Performance
  useBinaryProtocol: true,
  enablePipelining: true,
  pipelineBatchSize: 200,
  
  // Pool de conexões
  poolSize: 50,
  
  // Timeouts
  connectionTimeout: 3000,
  commandTimeout: 5000
});
```

## 🐛 Solução de Problemas

### Erro: "Connection refused"

```
❌ Error: connect ECONNREFUSED 127.0.0.1:8000
```

**Solução**: Verifique se o CrabCache está rodando na porta correta:

```bash
# Verificar se a porta está aberta
netstat -an | grep 8000

# Ou usar telnet
telnet localhost 8000
```

### Erro: "Connection timeout"

```
❌ Error: Connection timeout
```

**Soluções**:
1. Aumentar o timeout de conexão
2. Verificar conectividade de rede
3. Verificar firewall

```javascript
const client = new CrabCacheClient({
  connectionTimeout: 10000,  // 10 segundos
  commandTimeout: 15000      // 15 segundos
});
```

### Erro: "Authentication failed"

```
❌ Error: Authentication failed
```

**Solução**: Verificar se o token está correto:

```javascript
const client = new CrabCacheClient({
  authToken: 'token-correto-aqui'
});
```

### Performance Baixa

**Soluções**:
1. Habilitar protocolo binário
2. Usar pipelining
3. Aumentar pool de conexões

```javascript
const client = new CrabCacheClient({
  useBinaryProtocol: true,
  enablePipelining: true,
  poolSize: 20,
  pipelineBatchSize: 100
});
```

## 📊 Monitoramento

### Verificar Status do Cliente

```javascript
const status = client.getStatus();
console.log('Status:', status);
```

### Métricas do Cliente

```javascript
const metrics = client.getClientMetrics();
console.log('Métricas:', metrics);
```

### Métricas do Pool

```javascript
const poolMetrics = client.getPoolMetrics();
console.log('Pool:', poolMetrics);
```

## 🔗 Links Úteis

- [CrabCache Server](https://github.com/RogerFelipeNsk/crabcache)
- [Documentação Completa](README.md)
- [Exemplos](examples/)
- [Issues](https://github.com/RogerFelipeNsk/crabcache-client-js/issues)

## 📞 Suporte

Se encontrar problemas:

1. Verifique se o CrabCache Server está rodando
2. Consulte a [documentação](README.md)
3. Veja os [exemplos](examples/)
4. Abra uma [issue](https://github.com/RogerFelipeNsk/crabcache-client-js/issues)

---

**Pronto para usar o CrabCache!** 🦀⚡