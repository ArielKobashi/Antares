# Estoque

## Cadastro de Produtos

Campos:

- id.
- codigo interno.
- codigo de barras.
- descricao.
- categoria.
- subcategoria.
- marca.
- unidade.
- custo medio.
- preco de venda.
- estoque minimo.
- estoque maximo.
- peso.
- dimensoes.
- lote.
- validade.
- ativo/inativo.
- observacoes.
- imagem.

## Enderecamento

Estrutura:

```text
SETOR/CORREDOR/PRATELEIRA/POSICAO
```

Exemplo:

```text
ALM/PAR/02/B04
```

Um mesmo item pode possuir multiplos enderecos.

## Movimentacoes

Tipos:

- Entrada.
- Saida.
- Transferencia.
- Ajuste.
- Producao.
- Consumo interno.
- Perda.
- Avaria.

Cada movimentacao deve registrar:

- usuario.
- data.
- hora.
- quantidade.
- saldo anterior.
- saldo novo.
- motivo.
- documento relacionado.

## Inventario

- Inventario geral.
- Contagem ciclica.
- Divergencias.
- Ajustes.
- Aprovacoes.

## Controle de Validade

- Numero do lote.
- Data de fabricacao.
- Data de vencimento.
- Alertas configuraveis.
- Produtos vencidos.
- Produtos proximos do vencimento.

## Curva ABC

Classificacao automatica por:

- valor movimentado.
- quantidade movimentada.
- frequencia de uso.

