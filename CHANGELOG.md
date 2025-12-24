# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-12-23

### Adicionado
- Cliente Node.js completo para CrabCache
- Suporte a protocolo de texto e binário
- Sistema de pipelining para alta performance
- Pool de conexões com gerenciamento inteligente
- Métricas detalhadas de cliente e servidor
- Recuperação automática de falhas
- Suporte completo ao TypeScript
- Exemplos de uso básico, pipelining e configuração avançada
- Testes unitários
- Documentação completa

### Características
- **Comandos suportados**: PING, PUT, GET, DEL, EXPIRE, STATS, METRICS
- **Performance**: Pipelining com lotes configuráveis
- **Confiabilidade**: Pool de conexões com health checks
- **Monitoramento**: Métricas em tempo real
- **Flexibilidade**: Configuração avançada para diferentes cenários
- **Compatibilidade**: Node.js >= 16.0.0

### Exemplos
- `examples/basic.js` - Uso básico do cliente
- `examples/pipeline.js` - Pipelining para alta performance  
- `examples/advanced.js` - Configuração avançada e monitoramento

### Testes
- Testes unitários para protocolo
- Testes de integração para cliente
- Cobertura de código configurada

### Documentação
- README completo com exemplos
- Documentação da API
- Guias de configuração
- Exemplos de uso