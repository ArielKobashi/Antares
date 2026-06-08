# Arquitetura Tecnica

## Stack Recomendada Inicial

Para acelerar o desenvolvimento com uma base consistente:

- Frontend: React com TypeScript.
- Backend: Node.js com TypeScript e arquitetura modular.
- API: REST com contratos por modulo.
- Banco de dados: PostgreSQL.
- ORM/migrations: Prisma ou equivalente.
- Autenticacao: JWT com refresh token.
- Autorizacao: RBAC por perfil, modulo e acao.
- Jobs: fila para rotinas de relatorios, alertas, backup e IA.
- Armazenamento de arquivos: disco local no desenvolvimento e storage externo em producao.

## Organizacao Sugerida do Monorepo

```text
apps/
  api/
  web/
packages/
  shared/
  database/
docs/
  requisitos/
```

## Camadas do Backend

- Controllers: recebem requisicoes REST e validam entrada superficial.
- Services: concentram regras de negocio.
- Repositories: isolam acesso ao banco.
- DTOs: definem entrada e saida da API.
- Policies/Guards: aplicam permissoes.
- Auditing: registra operacoes e alteracoes.
- Events: publica acontecimentos relevantes entre modulos.

## Modulos do Backend

- identity: autenticacao, usuarios e sessoes.
- companies: multiempresa.
- access-control: perfis e permissoes.
- catalog: produtos, categorias, marcas e unidades.
- inventory: estoques, saldos, lotes, enderecos e movimentacoes.
- warehouse: requisicoes, EPI e ferramentas.
- purchasing: fornecedores e compras.
- sales: clientes, orcamentos e pedidos.
- cash: caixas e recebimentos.
- finance: contas, fluxo de caixa e conciliacao.
- reports: relatorios e exportacoes.
- documents: anexos e documentos.
- ai: consultas em linguagem natural e analitica.

## Padroes Obrigatorios

- Toda tabela operacional deve ter `company_id`.
- Toda alteracao sensivel deve gerar auditoria.
- Exclusoes devem usar soft delete.
- Movimentacoes de estoque devem ser transacionais.
- Saldos nao devem ser editados diretamente fora de movimentos aprovados.
- APIs devem validar permissao por modulo e acao.

