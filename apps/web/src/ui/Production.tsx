import { Factory, ListChecks, PlayCircle } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";

type Product = { id: string; internalCode: string; description: string };
type Warehouse = { id: string; name: string };
type Bom = {
  id: string;
  name: string;
  outputQuantity: string;
  finishedProduct: Product;
  items: Array<{ id: string; quantity: string; product: Product }>;
};
type ProductionOrder = {
  id: string;
  number: string;
  plannedQuantity: string;
  status: string;
  finishedProduct: Product;
  warehouse: Warehouse;
  bom?: Bom;
};

export function Production() {
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [boms, setBoms] = useState<Bom[]>([]);
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [bomForm, setBomForm] = useState({ name: "", finishedProductId: "", outputQuantity: "1", componentProductId: "", componentQuantity: "1" });
  const [orderForm, setOrderForm] = useState({ bomId: "", warehouseId: "", plannedQuantity: "1" });

  async function load() {
    const [productRows, warehouseRows, bomRows, orderRows] = await Promise.all([
      api<Product[]>("/catalog/products"),
      api<Warehouse[]>("/inventory/warehouses"),
      api<Bom[]>("/production/boms"),
      api<ProductionOrder[]>("/production/orders")
    ]);
    setProducts(productRows);
    setWarehouses(warehouseRows);
    setBoms(bomRows);
    setOrders(orderRows);
    setBomForm((current) => ({
      ...current,
      finishedProductId: current.finishedProductId || productRows[0]?.id || "",
      componentProductId: current.componentProductId || productRows[1]?.id || productRows[0]?.id || ""
    }));
    setOrderForm((current) => ({
      ...current,
      bomId: current.bomId || bomRows[0]?.id || "",
      warehouseId: current.warehouseId || warehouseRows[0]?.id || ""
    }));
  }

  useEffect(() => {
    void load();
  }, []);

  async function createBom(event: FormEvent) {
    event.preventDefault();
    await api("/production/boms", {
      method: "POST",
      body: JSON.stringify({
        name: bomForm.name,
        finishedProductId: bomForm.finishedProductId,
        outputQuantity: Number(bomForm.outputQuantity),
        items: [{ productId: bomForm.componentProductId, quantity: Number(bomForm.componentQuantity) }]
      })
    });
    setBomForm({ ...bomForm, name: "", componentQuantity: "1" });
    await load();
  }

  async function createOrder(event: FormEvent) {
    event.preventDefault();
    await api("/production/orders", {
      method: "POST",
      body: JSON.stringify({
        bomId: orderForm.bomId,
        warehouseId: orderForm.warehouseId,
        plannedQuantity: Number(orderForm.plannedQuantity)
      })
    });
    setOrderForm({ ...orderForm, plannedQuantity: "1" });
    await load();
  }

  async function completeOrder(id: string) {
    await api(`/production/orders/${id}/complete`, { method: "POST" });
    await load();
  }

  return (
    <div className="stack">
      <div className="two-column">
        <section className="panel">
          <div className="panel-title">
            <ListChecks size={18} />
            <h2>Estrutura do produto</h2>
          </div>
          <form className="form-grid compact" onSubmit={createBom}>
            <label>Nome<input value={bomForm.name} onChange={(event) => setBomForm({ ...bomForm, name: event.target.value })} required /></label>
            <label>Produto acabado<select value={bomForm.finishedProductId} onChange={(event) => setBomForm({ ...bomForm, finishedProductId: event.target.value })}>{products.map((product) => <option key={product.id} value={product.id}>{product.description}</option>)}</select></label>
            <label>Qtd produzida<input type="number" step="0.001" value={bomForm.outputQuantity} onChange={(event) => setBomForm({ ...bomForm, outputQuantity: event.target.value })} /></label>
            <label>Componente<select value={bomForm.componentProductId} onChange={(event) => setBomForm({ ...bomForm, componentProductId: event.target.value })}>{products.map((product) => <option key={product.id} value={product.id}>{product.description}</option>)}</select></label>
            <label>Qtd componente<input type="number" step="0.001" value={bomForm.componentQuantity} onChange={(event) => setBomForm({ ...bomForm, componentQuantity: event.target.value })} /></label>
            <button className="primary">Salvar BOM</button>
          </form>
        </section>
        <section className="panel">
          <div className="panel-title">
            <Factory size={18} />
            <h2>Ordem de producao</h2>
          </div>
          <form className="form-grid compact" onSubmit={createOrder}>
            <label>BOM<select value={orderForm.bomId} onChange={(event) => setOrderForm({ ...orderForm, bomId: event.target.value })}>{boms.map((bom) => <option key={bom.id} value={bom.id}>{bom.name}</option>)}</select></label>
            <label>Estoque<select value={orderForm.warehouseId} onChange={(event) => setOrderForm({ ...orderForm, warehouseId: event.target.value })}>{warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}</select></label>
            <label>Quantidade<input type="number" step="0.001" value={orderForm.plannedQuantity} onChange={(event) => setOrderForm({ ...orderForm, plannedQuantity: event.target.value })} /></label>
            <button className="primary" disabled={!orderForm.bomId || !orderForm.warehouseId}>Abrir OP</button>
          </form>
        </section>
      </div>

      <section className="panel">
        <h2>BOMs</h2>
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Produto</th>
              <th>Saida</th>
              <th>Componentes</th>
            </tr>
          </thead>
          <tbody>
            {boms.map((bom) => (
              <tr key={bom.id}>
                <td>{bom.name}</td>
                <td>{bom.finishedProduct.description}</td>
                <td>{Number(bom.outputQuantity)}</td>
                <td><div className="mini-list">{bom.items.map((item) => <span key={item.id}>{item.product.description}: {Number(item.quantity)}</span>)}</div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h2>Ordens</h2>
        <table>
          <thead>
            <tr>
              <th>Numero</th>
              <th>Produto</th>
              <th>Estoque</th>
              <th>Qtd</th>
              <th>Status</th>
              <th>Acoes</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>{order.number}</td>
                <td>{order.finishedProduct.description}</td>
                <td>{order.warehouse.name}</td>
                <td>{Number(order.plannedQuantity)}</td>
                <td><span className="status">{order.status}</span></td>
                <td>{order.status === "OPEN" ? <button className="secondary icon-text" onClick={() => void completeOrder(order.id)}><PlayCircle size={16} />Concluir</button> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
