# Plano de Etapas

## Etapa 0 - Fundacao do Projeto

Objetivo: transformar os requisitos em uma base tecnica executavel.

- Definir arquitetura modular.
- Definir stack inicial.
- Separar requisitos por modulo.
- Criar modelo de dados inicial.
- Definir convencoes de API.
- Preparar backlog do MVP.

Entregavel: documentacao base e estrutura do repositorio.

## Etapa 1 - Plataforma Base

Objetivo: criar o nucleo que todos os modulos usam.

- Multiempresa.
- Usuarios.
- Perfis e permissoes.
- Autenticacao JWT.
- Auditoria.
- Soft delete.
- Logs operacionais.
- Configuracoes por empresa.

Entregavel: backend com autenticacao, autorizacao e base multiempresa.

## Etapa 2 - Cadastros Mestres

Objetivo: criar os cadastros que alimentam estoque, compras, vendas e financeiro.

- Produtos.
- Categorias e subcategorias.
- Marcas.
- Unidades.
- Fornecedores.
- Clientes.
- Funcionarios.
- Setores.

Entregavel: CRUDs com validacao, auditoria e filtros.

## Etapa 3 - Estoque e Almoxarifado

Objetivo: implementar o primeiro modulo operacional completo.

- Enderecamento por setor, corredor, prateleira e posicao.
- Lotes e validades.
- Saldos por empresa, estoque, localizacao e lote.
- Movimentacoes de entrada, saida, transferencia, ajuste, producao, consumo interno, perda e avaria.
- Requisicoes de almoxarifado.
- Controle de EPI.
- Controle de ferramentas.
- Inventario geral e contagem ciclica.

Entregavel: estoque rastreavel com saldo transacional.

## Etapa 4 - Compras

Objetivo: automatizar entrada de produtos a partir do processo de compra.

- Requisicao de compra.
- Cotacao.
- Aprovacao.
- Pedido de compra.
- Recebimento.
- Entrada automatica no estoque.
- Historico de fornecedores.

Entregavel: fluxo de compras integrado ao estoque.

## Etapa 5 - Caixa, Vendas e Financeiro

Objetivo: fechar o ciclo comercial e financeiro basico.

- Clientes e limite de credito.
- Orcamentos e pedidos.
- Operacoes de caixa.
- Recebimentos por dinheiro, PIX, cartao, transferencia e boleto.
- Contas a pagar.
- Contas a receber.
- Fluxo de caixa.
- Conciliacao bancaria inicial.

Entregavel: financeiro operacional com caixa e contas.

## Etapa 6 - Relatorios

Objetivo: dar visibilidade de gestao.

- Giro de estoque.
- Curva ABC.
- Produtos parados.
- Inventarios.
- Validades.
- Compras.
- Vendas.
- Lucro estimado.
- Fluxo de caixa.
- Historico de movimentacoes.
- Exportacao PDF, Excel e CSV.

Entregavel: relatorios gerenciais e operacionais.

## Etapa 7 - Modulos Industriais

Objetivo: expandir o ERP para operacao industrial.

- Producao.
- Estrutura de produto (BOM).
- Patrimonio.
- Manutencao corretiva, preventiva e preditiva.
- Ordens de servico.
- Logistica.
- Gestao documental.

Entregavel: ERP industrial modular.

## Etapa 8 - Antares IA

Objetivo: adicionar consulta em linguagem natural e inteligencia analitica.

- Consulta em linguagem natural sobre dados do ERP.
- Previsao de consumo.
- Previsao de compras.
- Sugestao de reposicao.
- Deteccao de anomalias.
- Geracao automatica de relatorios.

Entregavel: modulo de IA conectado aos dados autorizados do usuario.

