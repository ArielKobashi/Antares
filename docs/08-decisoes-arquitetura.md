# Decisoes de Arquitetura

Este arquivo registra decisoes tomadas no inicio do projeto. Ele deve ser atualizado quando uma decisao tecnica relevante mudar.

## ADR-001 - Monorepo

Decisao: organizar o projeto como monorepo.

Motivo:

- Facilita evoluir API, web e pacotes compartilhados juntos.
- Permite compartilhar tipos e constantes.
- Ajuda a manter contratos entre frontend e backend proximos.

Estrutura:

```text
apps/api
apps/web
packages/shared
packages/database
docs
```

## ADR-002 - API REST Modular

Decisao: expor API REST por modulo em `/api/v1`.

Motivo:

- Atende navegadores, aplicativos moveis, leitores de codigo de barras, coletores e integracoes futuras.
- Mantem contratos simples para o MVP.
- Permite separar responsabilidades por dominio.

## ADR-003 - Banco Relacional

Decisao: usar PostgreSQL como banco principal.

Motivo:

- Forte suporte transacional.
- Adequado para estoque, financeiro, auditoria e relatorios.
- Bom suporte a JSON para logs e auditoria sem abandonar modelo relacional.

## ADR-004 - Auditoria e Soft Delete como Padrao

Decisao: entidades de negocio devem nascer com auditoria e soft delete.

Motivo:

- Requisito central do ANTARES.
- Evita perda de rastreabilidade.
- Reduz retrabalho quando os modulos crescerem.

