# Arquitetura Funcional

## Nucleo Compartilhado

O nucleo compartilhado concentra recursos usados por todos os modulos:

- Empresas.
- Usuarios.
- Perfis.
- Permissoes.
- Auditoria.
- Logs.
- Soft delete.
- Anexos.
- Configuracoes.
- Numeradores e codigos internos.

## Modulos Operacionais

- Dashboard.
- Estoque.
- Compras.
- Vendas.
- Financeiro.
- Caixa.
- Fiscal.
- Producao.
- Almoxarifado.
- RH.
- Patrimonio.
- Manutencao.
- CRM.
- Logistica.
- Documentos.
- Relatorios.
- Administracao.
- Inteligencia Artificial.

## Dependencias Funcionais

O desenvolvimento deve priorizar modulos que destravam outros fluxos:

1. Administracao destrava usuarios, empresas e permissoes.
2. Cadastros mestres destravam compras, vendas, estoque e financeiro.
3. Estoque destrava almoxarifado, compras, vendas, producao e relatorios.
4. Financeiro depende de compras, vendas e caixa.
5. IA depende de dados confiaveis, permissoes e historico suficiente.

