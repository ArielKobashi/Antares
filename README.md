# ANTARES ERP

Sistema integrado de gestao empresarial modular, inicialmente focado em estoque, almoxarifado, caixa e financeiro, com evolucao planejada para um ERP industrial completo com auditoria, rastreabilidade e inteligencia artificial.

## Documentacao

- [Plano de etapas](docs/00-plano-etapas.md)
- [Visao geral do produto](docs/01-visao-geral.md)
- [Arquitetura funcional](docs/02-arquitetura-funcional.md)
- [Arquitetura tecnica](docs/03-arquitetura-tecnica.md)
- [Modelo de dados inicial](docs/04-modelo-dados.md)
- [API REST](docs/05-api-rest.md)
- [Seguranca e auditoria](docs/06-seguranca-auditoria.md)
- [Roadmap do MVP](docs/07-roadmap-mvp.md)
- [Decisoes de arquitetura](docs/08-decisoes-arquitetura.md)
- [Levar para outro PC](docs/09-levar-para-outro-pc.md)
- [Requisitos por modulo](docs/requisitos/README.md)

## Estrutura Inicial

```text
apps/
  api/
  web/
packages/
  database/
  shared/
docs/
  requisitos/
```

## Prioridade Inicial

O desenvolvimento comeca pelo nucleo compartilhado da plataforma:

1. Autenticacao, usuarios, empresas e permissoes.
2. Cadastros basicos de produtos, categorias, fornecedores e clientes.
3. Estoque com enderecamento, lotes, validade e movimentacoes.
4. Almoxarifado com requisicoes, EPI e ferramentas.
5. Caixa e financeiro basico.
6. Relatorios operacionais.

## Como Rodar

Pre-requisitos:

- Node.js 20 ou superior.
- npm.
- Docker ou PostgreSQL local para producao.

Para desenvolvimento sem permissao de administrador, o projeto usa SQLite por padrao.

Passos com Node/npm instalados no sistema:

```bash
cp .env.example .env
npm install
npm run db:generate
npm run db:seed
npm run dev
```

No Windows sem permissao de administrador, use os scripts portateis. Eles usam Node local em `.tools` quando existir, tambem funcionam com Node instalado no sistema, usam SQLite e nao exigem Docker:

```bat
scripts\portable-stop.cmd
scripts\portable-install.cmd
scripts\portable-db.cmd
scripts\portable-dev.cmd
```

Para parar API e web:

```bat
scripts\portable-stop.cmd
```

URLs padrao:

- API: `http://localhost:3333`
- Web: `http://localhost:5173`

Login de demonstracao criado pelo seed:

- Email: `admin@antares.local`
- Senha: `admin123`

## Escopo Implementado Nesta Base

- Monorepo com `apps/api`, `apps/web`, `packages/database` e `packages/shared`.
- API REST com Express.
- Banco relacional modelado com Prisma, usando SQLite no desenvolvimento local sem Docker.
- Autenticacao JWT.
- Multiempresa.
- Usuarios, perfis e permissoes.
- Auditoria com painel administrativo.
- Cadastros de produtos completos, categorias, marcas, unidades, fornecedores e clientes.
- Estoques, localizacoes, lotes, validades, saldos, inventario e movimentacoes.
- Compras com pedido, aprovacao e recebimento.
- Vendas com pedido, aprovacao e expedicao.
- Almoxarifado com requisicoes, EPI, funcionarios, ferramentas, emprestimos e devolucoes.
- Caixa com abertura, recebimento de titulos, PDV e fechamento.
- Financeiro com contas a pagar, contas a receber e baixa de titulos.
- Producao com BOM, ordem de producao, consumo de componentes e entrada de produto acabado.
- Patrimonio e manutencao com OS e baixa de pecas.
- Relatorios operacionais e industriais com exportacao CSV.
- Frontend React com telas para os modulos principais.

## Levar Para Outro PC

Para criar um pacote limpo do projeto:

```bat
scripts\package-project.cmd
```

Depois siga o guia em [docs/09-levar-para-outro-pc.md](docs/09-levar-para-outro-pc.md).
