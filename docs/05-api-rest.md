# API REST

## Convencoes

- Base path: `/api/v1`.
- Autenticacao: Bearer JWT.
- Retornos em JSON.
- Paginacao padrao com `page`, `pageSize`, `sort` e `filter`.
- Respostas de erro padronizadas.
- Endpoints separados por modulo.

## Estrutura de Erro

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dados invalidos.",
    "details": []
  }
}
```

## Endpoints Iniciais

### Identidade

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/me`

### Administracao

- `GET /api/v1/companies`
- `POST /api/v1/companies`
- `GET /api/v1/users`
- `POST /api/v1/users`
- `GET /api/v1/roles`
- `POST /api/v1/roles`
- `PUT /api/v1/roles/{id}/permissions`

### Catalogo

- `GET /api/v1/products`
- `POST /api/v1/products`
- `GET /api/v1/products/{id}`
- `PUT /api/v1/products/{id}`
- `DELETE /api/v1/products/{id}`
- `GET /api/v1/categories`
- `GET /api/v1/brands`
- `GET /api/v1/units`

### Estoque

- `GET /api/v1/warehouses`
- `POST /api/v1/warehouses`
- `GET /api/v1/stock-locations`
- `POST /api/v1/stock-locations`
- `GET /api/v1/stock-balances`
- `GET /api/v1/stock-movements`
- `POST /api/v1/stock-movements`
- `GET /api/v1/batches`
- `POST /api/v1/inventories`

### Almoxarifado

- `GET /api/v1/warehouse-requisitions`
- `POST /api/v1/warehouse-requisitions`
- `POST /api/v1/warehouse-requisitions/{id}/approve`
- `POST /api/v1/warehouse-requisitions/{id}/deliver`
- `GET /api/v1/ppe-deliveries`
- `POST /api/v1/ppe-deliveries`
- `GET /api/v1/tool-loans`
- `POST /api/v1/tool-loans`

## Contratos de Modulo

Cada modulo deve documentar:

- Recursos.
- Campos obrigatorios.
- Regras de validacao.
- Permissoes necessarias.
- Eventos gerados.
- Impactos em auditoria.

