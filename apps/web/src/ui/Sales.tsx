import { CheckCircle2, PackageMinus, Plus } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";

type Product = { id: string; description: string; internalCode: string; salePrice?: string };
type Customer = { id: string; name: string };
type Warehouse = { id: string; name: string };
type SalesOrder = {
  id: string;
  number: string;
  status: string;
  expectedAt?: string;
  customer?: Customer;
  items: Array<{ id: string; quantity: string; unitPrice: string; product: Product }>;
};

export function Sales() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [form, setForm] = useState({ customerId: "", productId: "", quantity: "1", unitPrice: "0", expectedAt: "", notes: "" });
  const [shipWarehouseId, setShipWarehouseId] = useState("");
  const [dueDate, setDueDate] = useState("");

  async function load() {
    const [productRows, customerRows, warehouseRows, orderRows] = await Promise.all([
      api<Product[]>("/catalog/products"),
      api<Customer[]>("/catalog/customers"),
      api<Warehouse[]>("/inventory/warehouses"),
      api<SalesOrder[]>("/sales/orders")
    ]);
    setProducts(productRows);
    setCustomers(customerRows);
    setWarehouses(warehouseRows);
    setOrders(orderRows);
    setForm((current) => {
      const firstProduct = productRows[0];
      return {
        ...current,
        productId: current.productId || firstProduct?.id || "",
        customerId: current.customerId || customerRows[0]?.id || "",
        unitPrice: current.unitPrice !== "0" ? current.unitPrice : String(firstProduct?.salePrice ?? "0")
      };
    });
    setShipWarehouseId((current) => current || warehouseRows[0]?.id || "");
  }

  useEffect(() => {
    void load();
  }, []);

  async function createOrder(event: FormEvent) {
    event.preventDefault();
    await api("/sales/orders", {
      method: "POST",
      body: JSON.stringify({
        customerId: form.customerId || undefined,
        expectedAt: form.expectedAt || undefined,
        notes: form.notes || undefined,
        items: [{ productId: form.productId, quantity: Number(form.quantity), unitPrice: Number(form.unitPrice) }]
      })
    });
    setForm({ ...form, quantity: "1", expectedAt: "", notes: "" });
    await load();
  }

  async function approveOrder(id: string) {
    await api(`/sales/orders/${id}/approve`, { method: "POST" });
    await load();
  }

  async function shipOrder(id: string) {
    await api(`/sales/orders/${id}/ship`, {
      method: "POST",
      body: JSON.stringify({ warehouseId: shipWarehouseId, dueDate: dueDate || undefined })
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
            <label>Cliente<select value={form.customerId} onChange={(event) => setForm({ ...form, customerId: event.target.value })}><option value="">Sem cliente</option>{customers.map((customer) => <option value={customer.id} key={customer.id}>{customer.name}</option>)}</select></label>
            <label>Produto<select value={form.productId} onChange={(event) => {
              const product = products.find((item) => item.id === event.target.value);
              setForm({ ...form, productId: event.target.value, unitPrice: String(product?.salePrice ?? form.unitPrice) });
            }}>{products.map((product) => <option value={product.id} key={product.id}>{product.description}</option>)}</select></label>
            <label>Quantidade<input type="number" step="0.01" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} /></label>
            <label>Preco unitario<input type="number" step="0.01" value={form.unitPrice} onChange={(event) => setForm({ ...form, unitPrice: event.target.value })} /></label>
            <label>Previsao<input type="date" value={form.expectedAt} onChange={(event) => setForm({ ...form, expectedAt: event.target.value })} /></label>
            <label>Observacoes<input value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>
            <button className="primary">Criar pedido</button>
          </form>
        </section>
        <section className="panel">
          <div className="panel-title">
            <PackageMinus size={18} />
            <h2>Expedicao</h2>
          </div>
          <div className="form-grid">
            <label>Estoque de saida<select value={shipWarehouseId} onChange={(event) => setShipWarehouseId(event.target.value)}>{warehouses.map((warehouse) => <option value={warehouse.id} key={warehouse.id}>{warehouse.name}</option>)}</select></label>
            <label>Vencimento financeiro<input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label>
          </div>
        </section>
      </div>

      <section className="panel">
        <h2>Pedidos de venda</h2>
        <table>
          <thead>
            <tr>
              <th>Numero</th>
              <th>Cliente</th>
              <th>Status</th>
              <th>Itens</th>
              <th>Acoes</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>{order.number}</td>
                <td>{order.customer?.name ?? ""}</td>
                <td><span className="status">{order.status}</span></td>
                <td>{order.items.map((item) => `${item.product.description} (${Number(item.quantity)})`).join(", ")}</td>
                <td className="row-actions">
                  {order.status === "OPEN" ? <button className="secondary" onClick={() => approveOrder(order.id)}><CheckCircle2 size={15} />Aprovar</button> : null}
                  {order.status === "APPROVED" ? <button className="secondary" onClick={() => shipOrder(order.id)}><PackageMinus size={15} />Expedir</button> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
