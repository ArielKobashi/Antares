# Seguranca e Auditoria

## Autenticacao

- Login com email/usuario e senha.
- Senhas com hash forte.
- JWT de curta duracao.
- Refresh token revogavel.
- Registro de sessoes.

## Autorizacao

O modelo inicial sera RBAC:

- Perfil.
- Modulo.
- Acao.
- Empresa.

Acoes padrao:

- view.
- create.
- update.
- delete.
- approve.
- export.
- admin.

## Multiempresa

- Toda consulta operacional deve ser filtrada por empresa.
- Usuarios podem estar vinculados a uma ou mais empresas.
- Permissoes podem variar por empresa.

## Auditoria

Toda alteracao de dados sensiveis deve registrar:

- Usuario.
- Empresa.
- IP.
- Data e hora.
- Operacao.
- Entidade afetada.
- Valores antigos.
- Valores novos.

## Soft Delete

Registros de negocio nao devem ser apagados fisicamente. A exclusao deve preencher:

- deleted_at.
- deleted_by.

Consultas comuns devem ignorar registros apagados por padrao.

## Regras Criticas

- Saldos de estoque nao podem ser alterados diretamente.
- Movimentacoes devem ocorrer dentro de transacoes.
- Aprovacoes devem registrar responsavel e horario.
- Exportacoes sensiveis devem ser auditadas.

