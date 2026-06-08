import { CheckCircle2, PackageCheck, Plus } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";

type Product = { id: string; description: string; internalCode: string };
type Supplier = { id: string; legalName: string };
type Warehouse = { id: string; name: string };
type PurchaseOrder = {
  id: string;
  number: string;
  status: string;
  expectedAt?: string;
  supplier?: Supplier;
  items: Array<{ id: string; quantity: string; unitCost: string; product: Product }>;
};

export function Purchasing() {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [form, setForm] = useState({ supplierId: "", productId: "", quantity: "1", unitCost: "0", expectedAt: "", notes: "" });
  const [receiveWarehouseId, setReceiveWarehouseId] = useState("");

  async function load() {
    const [productRows, supplierRows, warehouseRows, orderRows] = await Promise.all([
      api<Product[]>("/catalog/products"),
      api<Supplier[]>("/catalog/suppliers"),
      api<Warehouse[]>("/inventory/warehouses"),
      api<PurchaseOrder[]>("/purchasing/orders")
    ]);
    setProducts(productRows);
    setSuppliers(supplierRows);
    setWarehouses(warehouseRows);
    setOrders(orderRows);
    setForm((current) => ({
      ...current,
      productId: current.productId || productRows[0]?.id || "",
      supplierId: current.supplierId || supplierRows[0]?.id || ""
    }));
    setReceiveWarehouseId((current) => current || warehouseRows[0]?.id || "");
  }

  useEffect(() => {
    void load();
  }, []);

  async function createOrder(event: FormEvent) {
    event.preventDefault();
    await api("/purchasing/orders", {
      method: "POST",
      body: JSON.stringify({
        supplierId: form.supplierId || undefined,
        expectedAt: form.expectedAt || undefined,
        notes: form.notes || undefined,
        items: [{ productId: form.productId, quantity: Number(form.quantity), unitCost: Number(form.unitCost) }]
      })
    });
    setForm({ ...form, quantity: "1", unitCost: "0", expectedAt: "", notes: "" });
    await load();
  }

  async function approveOrder(id: string) {
    await api(`/purchasing/orders/${id}/approve`, { method: "POST" });
    await load();
  }

  async function receiveOrder(id: string) {
    await api(`/purchasing/orders/${id}/receive`, {
      method: "POST",
      body: JSON.stringify({ warehouseId: receiveWarehouseId })
    });
    await load();
  }

  return (
    <div className="stack">
      <div className="two-column">
        <section className="panel">
          <div className="panel-title">
            <Plus size={18} />
            <h2>Novo pedido</h2>
          </div>
          <form className="form-grid" onSubmit={createOrder}>
            <label>Fornecedor<select value={form.supplierId} onChange={(event) => setForm({ ...form, supplierId: event.target.value })}><option value="">Sem fornecedor</option>{suppliers.map((supplier) => <option value={supplier.id} key={supplier.id}>{supplier.legalName}</option>)}</select></label>
            <label>Produto<select value={form.productId} onChange={(event) => setForm({ ...form, productId: event.target.value })}>{products.map((product) => <option value={product.id} key={product.id}>{product.description}</option>)}</select></label>
            <label>Quantidade<input type="number" step="0.01" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} /></label>
            <label>Custo unitario<input type="number" step="0.01" value={form.unitCost} onChange={(event) => setForm({ ...form, unitCost: event.target.value })} /></label>
            <label>Previsao<input type="date" value={form.expectedAt} onChange={(event) => setForm({ ...form, expectedAt: event.target.value })} /></label>
            <label>Observacoes<input value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>
            <button className="primary">Criar pedido</button>
          </form>
        </section>
        <section className="panel">
          <div className="panel-title">
            <PackageCheck size={18} />
            <h2>Recebimento</h2>
          </div>
          <label>Estoque de entrada<select value={receiveWarehouseId} onChange={(event) => setReceiveWarehouseId(event.target.value)}>{warehouses.map((warehouse) => <option value={warehouse.id} key={warehouse.id}>{warehouse.name}</option>)}</select></label>
        </section>
      </div>

      <section className="panel">
        <h2>Pedidos de compra</h2>
        <table>
          <thead>
            <tr>
              <th>Numero</th>
              <th>Fornecedor</th>
              <th>Status</th>
              <th>Itens</th>
              <th>Acoes</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>{order.number}</td>
                <td>{order.supplier?.legalName ?? ""}</td>
                <td><span className="status">{order.status}</span></td>
                <td>{order.items.map((item) => `${item.product.description} (${Number(item.quantity)})`).join(", ")}</td>
                <td className="row-actions">
                  {order.status === "OPEN" ? <button className="secondary" onClick={() => approveOrder(order.id)}><CheckCircle2 size={15} />Aprovar</button> : null}
                  {order.status === "APPROVED" ? <button className="secondary" onClick={() => receiveOrder(order.id)}><PackageCheck size={15} />Receber</button> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
