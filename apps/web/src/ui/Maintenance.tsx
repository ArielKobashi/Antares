import { ClipboardCheck, Cog, PackageCheck, Wrench } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";

type Product = { id: string; internalCode: string; description: string };
type Warehouse = { id: string; name: string };
type Asset = {
  id: string;
  assetNumber: string;
  name: string;
  type: string;
  location?: string;
  status: string;
  value?: string;
};
type MaintenanceOrder = {
  id: string;
  number: string;
  type: string;
  priority: string;
  status: string;
  responsible?: string;
  description: string;
  asset: Asset;
  parts: Array<{ id: string; quantity: string; product: Product; warehouse: Warehouse }>;
};

export function Maintenance() {
  const [tab, setTab] = useState<"assets" | "orders">("assets");
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [orders, setOrders] = useState<MaintenanceOrder[]>([]);
  const [assetForm, setAssetForm] = useState({ assetNumber: "", name: "", type: "Maquina", location: "", value: "0", usefulLifeMonths: "60" });
  const [orderForm, setOrderForm] = useState({ assetId: "", type: "CORRETIVA", priority: "NORMAL", responsible: "", description: "", productId: "", warehouseId: "", quantity: "1" });

  async function load() {
    const [productRows, warehouseRows, assetRows, orderRows] = await Promise.all([
      api<Product[]>("/catalog/products"),
      api<Warehouse[]>("/inventory/warehouses"),
      api<Asset[]>("/maintenance/assets"),
      api<MaintenanceOrder[]>("/maintenance/orders")
    ]);
    setProducts(productRows);
    setWarehouses(warehouseRows);
    setAssets(assetRows);
    setOrders(orderRows);
    setOrderForm((current) => ({
      ...current,
      assetId: current.assetId || assetRows[0]?.id || "",
      productId: current.productId || productRows[0]?.id || "",
      warehouseId: current.warehouseId || warehouseRows[0]?.id || ""
    }));
  }

  useEffect(() => {
    void load();
  }, []);

  async function createAsset(event: FormEvent) {
    event.preventDefault();
    await api("/maintenance/assets", {
      method: "POST",
      body: JSON.stringify({
        assetNumber: assetForm.assetNumber,
        name: assetForm.name,
        type: assetForm.type,
        location: assetForm.location || undefined,
        value: Number(assetForm.value),
        usefulLifeMonths: Number(assetForm.usefulLifeMonths)
      })
    });
    setAssetForm({ assetNumber: "", name: "", type: "Maquina", location: "", value: "0", usefulLifeMonths: "60" });
    await load();
  }

  async function createOrder(event: FormEvent) {
    event.preventDefault();
    await api("/maintenance/orders", {
      method: "POST",
      body: JSON.stringify({
        assetId: orderForm.assetId,
        type: orderForm.type,
        priority: orderForm.priority,
        responsible: orderForm.responsible || undefined,
        description: orderForm.description,
        parts: orderForm.productId && orderForm.warehouseId
          ? [{ productId: orderForm.productId, warehouseId: orderForm.warehouseId, quantity: Number(orderForm.quantity) }]
          : []
      })
    });
    setOrderForm({ ...orderForm, description: "", quantity: "1" });
    await load();
  }

  async function closeOrder(id: string) {
    await api(`/maintenance/orders/${id}/close`, { method: "POST" });
    await load();
  }

  return (
    <div className="stack">
      <div className="segmented">
        <button className={tab === "assets" ? "active" : ""} onClick={() => setTab("assets")}>Patrimonio</button>
        <button className={tab === "orders" ? "active" : ""} onClick={() => setTab("orders")}>Manutencao</button>
      </div>

      {tab === "assets" ? (
        <>
          <section className="panel">
            <div className="panel-title">
              <PackageCheck size={18} />
              <h2>Novo patrimonio</h2>
            </div>
            <form className="form-grid compact" onSubmit={createAsset}>
              <label>Numero<input value={assetForm.assetNumber} onChange={(event) => setAssetForm({ ...assetForm, assetNumber: event.target.value })} required /></label>
              <label>Nome<input value={assetForm.name} onChange={(event) => setAssetForm({ ...assetForm, name: event.target.value })} required /></label>
              <label>Tipo<input value={assetForm.type} onChange={(event) => setAssetForm({ ...assetForm, type: event.target.value })} required /></label>
              <label>Localizacao<input value={assetForm.location} onChange={(event) => setAssetForm({ ...assetForm, location: event.target.value })} /></label>
              <label>Valor<input type="number" step="0.01" value={assetForm.value} onChange={(event) => setAssetForm({ ...assetForm, value: event.target.value })} /></label>
              <label>Vida util (meses)<input type="number" value={assetForm.usefulLifeMonths} onChange={(event) => setAssetForm({ ...assetForm, usefulLifeMonths: event.target.value })} /></label>
              <button className="primary">Salvar patrimonio</button>
            </form>
          </section>
          <section className="panel">
            <h2>Patrimonios</h2>
            <table>
              <thead>
                <tr>
                  <th>Numero</th>
                  <th>Nome</th>
                  <th>Tipo</th>
                  <th>Local</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => (
                  <tr key={asset.id}>
                    <td>{asset.assetNumber}</td>
                    <td>{asset.name}</td>
                    <td>{asset.type}</td>
                    <td>{asset.location ?? ""}</td>
                    <td><span className="status">{asset.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      ) : null}

      {tab === "orders" ? (
        <>
          <section className="panel">
            <div className="panel-title">
              <Wrench size={18} />
              <h2>Nova OS</h2>
            </div>
            <form className="form-grid compact" onSubmit={createOrder}>
              <label>Patrimonio<select value={orderForm.assetId} onChange={(event) => setOrderForm({ ...orderForm, assetId: event.target.value })}>{assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.assetNumber} - {asset.name}</option>)}</select></label>
              <label>Tipo<select value={orderForm.type} onChange={(event) => setOrderForm({ ...orderForm, type: event.target.value })}><option value="CORRETIVA">Corretiva</option><option value="PREVENTIVA">Preventiva</option><option value="PREDITIVA">Preditiva</option></select></label>
              <label>Prioridade<input value={orderForm.priority} onChange={(event) => setOrderForm({ ...orderForm, priority: event.target.value })} /></label>
              <label>Responsavel<input value={orderForm.responsible} onChange={(event) => setOrderForm({ ...orderForm, responsible: event.target.value })} /></label>
              <label>Descricao<input value={orderForm.description} onChange={(event) => setOrderForm({ ...orderForm, description: event.target.value })} required /></label>
              <label>Peca<select value={orderForm.productId} onChange={(event) => setOrderForm({ ...orderForm, productId: event.target.value })}>{products.map((product) => <option key={product.id} value={product.id}>{product.description}</option>)}</select></label>
              <label>Estoque<select value={orderForm.warehouseId} onChange={(event) => setOrderForm({ ...orderForm, warehouseId: event.target.value })}>{warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}</select></label>
              <label>Qtd peca<input type="number" step="0.01" value={orderForm.quantity} onChange={(event) => setOrderForm({ ...orderForm, quantity: event.target.value })} /></label>
              <button className="primary" disabled={!orderForm.assetId}>Abrir OS</button>
            </form>
          </section>
          <section className="panel">
            <div className="panel-title">
              <ClipboardCheck size={18} />
              <h2>Ordens de servico</h2>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Numero</th>
                  <th>Patrimonio</th>
                  <th>Tipo</th>
                  <th>Status</th>
                  <th>Pecas</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>{order.number}</td>
                    <td>{order.asset.name}</td>
                    <td>{order.type}</td>
                    <td><span className="status">{order.status}</span></td>
                    <td><div className="mini-list">{order.parts.map((part) => <span key={part.id}>{part.product.description}: {Number(part.quantity)}</span>)}</div></td>
                    <td>{order.status !== "CLOSED" ? <button className="secondary icon-text" onClick={() => void closeOrder(order.id)}><Cog size={16} />Fechar OS</button> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      ) : null}
    </div>
  );
}
