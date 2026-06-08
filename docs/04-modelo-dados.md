# Modelo de Dados Inicial

Este modelo e uma primeira divisao das entidades. Os campos finais serao refinados durante a implementacao de cada modulo.

## Nucleo

- companies.
- users.
- user_sessions.
- roles.
- permissions.
- role_permissions.
- user_companies.
- audit_logs.
- attachments.
- app_settings.

## Catalogo

- products.
- product_images.
- categories.
- subcategories.
- brands.
- units.
- product_barcodes.

## Estoque

- warehouses.
- stock_locations.
- product_addresses.
- batches.
- stock_balances.
- stock_movements.
- stock_movement_items.
- inventories.
- inventory_counts.
- inventory_adjustments.

## Compras

- suppliers.
- purchase_requisitions.
- purchase_quotes.
- purchase_approvals.
- purchase_orders.
- purchase_receipts.

## Vendas

- customers.
- sales_quotes.
- sales_orders.
- picking_orders.
- shipments.
- deliveries.

## Caixa e Financeiro

- cash_registers.
- cash_sessions.
- cash_operations.
- payment_methods.
- receipts.
- accounts_payable.
- accounts_receivable.
- cash_flow_entries.
- bank_accounts.
- bank_statement_imports.
- bank_reconciliations.

## Almoxarifado

- warehouse_requisitions.
- warehouse_requisition_items.
- employee_ppe_deliveries.
- tools.
- tool_loans.

## Industrial e Administrativo

- employees.
- departments.
- positions.
- schedules.
- trainings.
- assets.
- maintenance_orders.
- bills_of_materials.
- production_orders.
- logistics_shipments.
- documents.

## Auditoria Padrao

Entidades de negocio devem possuir:

- id.
- company_id.
- created_at.
- created_by.
- updated_at.
- updated_by.
- deleted_at.
- deleted_by.

Registros de auditoria devem armazenar:

- usuario.
- IP.
- data e hora.
- operacao.
- entidade.
- id do registro.
- valores antigos.
- valores novos.

