import { AlertTriangle, ArrowRightLeft, Boxes, CalendarClock, ClipboardCheck, Warehouse as WarehouseIcon } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";

type Product = { id: string; internalCode: string; description: string };
type Warehouse = { id: string; name: string; code: string };
type Batch = { id: string; number: string; manufacturedAt?: string; expiresAt?: string; product: Product };
type Balance = {
  id: string;
  quantity: string;
  product: Product;
  warehouse: Warehouse;
  batch?: Batch;
};
type InventoryRow = {
  id: string;
  name: string;
  status: string;
  startedAt: string;
  warehouse: Warehouse;
  counts: Array<{ id: string; expectedQuantity: string; countedQuantity: string; difference: string; product: Product }>;
};

type Tab = "movement" | "batches" | "inventory";

export function Inventory() {
  const [tab, setTab] = useState<Tab>("movement");
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [alerts, setAlerts] = useState<{ expired: Batch[]; expiring: Batch[] }>({ expired: [], expiring: [] });
  const [inventories, setInventories] = useState<InventoryRow[]>([]);
  const [warehouseName, setWarehouseName] = useState("");
  const [movement, setMovement] = useState({ type: "ENTRADA", productId: "", warehouseId: "", batchId: "", quantity: "1", reason: "" });
  const [batchForm, setBatchForm] = useState({ productId: "", number: "", manufacturedAt: "", expiresAt: "" });
  const [inventoryForm, setInventoryForm] = useState({ name: "", warehouseId: "", productId: "", countedQuantity: "0" });

  async function load() {
    const [productRows, warehouseRows, balanceRows, batchRows, alertRows, inventoryRows] = await Promise.all([
      api<Product[]>("/catalog/products"),
      api<Warehouse[]>("/inventory/warehouses"),
      api<Balance[]>("/inventory/balances"),
      api<Batch[]>("/inventory/batches"),
      api<{ expired: Batch[]; expiring: Batch[] }>("/inventory/expiration-alerts?days=90"),
      api<InventoryRow[]>("/inventory/inventories")
    ]);
    setProducts(productRows);
    setWarehouses(warehouseRows);
    setBalances(balanceRows);
    setBatches(batchRows);
    setAlerts(alertRows);
    setInventories(inventoryRows);
    const firstProduct = productRows[0]?.id || "";
    const firstWarehouse = warehouseRows[0]?.id || "";
    setMovement((current) => ({ ...current, productId: current.productId || firstProduct, warehouseId: current.warehouseId || firstWarehouse }));
    setBatchForm((current) => ({ ...current, productId: current.productId || firstProduct }));
    setInventoryForm((current) => ({ ...current, productId: current.productId || firstProduct, warehouseId: current.warehouseId || firstWarehouse }));
  }

  useEffect(() => {
    void load();
  }, []);

  async function createWarehouse(event: FormEvent) {
    event.preventDefault();
    await api("/inventory/warehouses", {
      method: "POST",
      body: JSON.stringify({ name: warehouseName, code: warehouseName.toUpperCase().slice(0, 8) })
    });
    setWarehouseName("");
    await load();
  }

  async function createMovement(event: FormEvent) {
    event.preventDefault();
    await api("/inventory/movements", {
      method: "POST",
      body: JSON.stringify({
        type: movement.type,
        reason: movement.reason,
        fromWarehouseId: movement.type === "SAIDA" ? movement.warehouseId : undefined,
        toWarehouseId: movement.type === "ENTRADA" || movement.type === "AJUSTE" || movement.type === "PRODUCAO" ? movement.warehouseId : undefined,
        items: [{
          productId: movement.productId,
          batchId: movement.batchId || undefined,
          quantity: Number(movement.quantity)
        }]
      })
    });
    setMovement({ ...movement, quantity: "1", reason: "" });
    await load();
  }

  async function createBatch(event: FormEvent) {
    event.preventDefault();
    await api("/inventory/batches", {
      method: "POST",
      body: JSON.stringify({
        productId: batchForm.productId,
        number: batchForm.number,
        manufacturedAt: batchForm.manufacturedAt || undefined,
        expiresAt: batchForm.expiresAt || undefined
      })
    });
    setBatchForm({ ...batchForm, number: "", manufacturedAt: "", expiresAt: "" });
    await load();
  }

  async function createInventory(event: FormEvent) {
    event.preventDefault();
    await api("/inventory/inventories", {
      method: "POST",
      body: JSON.stringify({ name: inventoryForm.name, warehouseId: inventoryForm.warehouseId })
    });
    setInventoryForm({ ...inventoryForm, name: "" });
    await load();
  }

  async function addCount(inventoryId: string) {
    await api(`/inventory/inventories/${inventoryId}/counts`, {
      method: "POST",
      body: JSON.stringify({
        productId: inventoryForm.productId,
        countedQuantity: Number(inventoryForm.countedQuantity)
      })
    });
    setInventoryForm({ ...inventoryForm, countedQuantity: "0" });
    await load();
  }

  async function closeInventory(inventoryId: string) {
    await api(`/inventory/inventories/${inventoryId}/close`, { method: "POST" });
    await load();
  }

  return (
    <div className="stack">
      <div className="segmented">
        <button className={tab === "movement" ? "active" : ""} onClick={() => setTab("movement")}>Movimentacao</button>
        <button className={tab === "batches" ? "active" : ""} onClick={() => setTab("batches")}>Lotes</button>
        <button className={tab === "inventory" ? "active" : ""} onClick={() => setTab("inventory")}>Inventario</button>
      </div>

      {tab === "movement" ? (
        <MovementTab
          products={products}
          warehouses={warehouses}
          batches={batches}
          balances={balances}
          warehouseName={warehouseName}
          movement={movement}
          setWarehouseName={setWarehouseName}
          setMovement={setMovement}
          createWarehouse={createWarehouse}
          createMovement={createMovement}
        />
      ) : null}

      {tab === "batches" ? (
        <BatchesTab
          products={products}
          batches={batches}
          alerts={alerts}
          batchForm={batchForm}
          setBatchForm={setBatchForm}
          createBatch={createBatch}
        />
      ) : null}

      {tab === "inventory" ? (
        <InventoryTab
          products={products}
          warehouses={warehouses}
          inventories={inventories}
          inventoryForm={inventoryForm}
          setInventoryForm={setInventoryForm}
          createInventory={createInventory}
          addCount={addCount}
          closeInventory={closeInventory}
        />
      ) : null}
    </div>
  );
}

function MovementTab(props: {
  products: Product[];
  warehouses: Warehouse[];
  batches: Batch[];
  balances: Balance[];
  warehouseName: string;
  movement: { type: string; productId: string; warehouseId: string; batchId: string; quantity: string; reason: string };
  setWarehouseName: (value: string) => void;
  setMovement: (value: { type: string; productId: string; warehouseId: string; batchId: string; quantity: string; reason: string }) => void;
  createWarehouse: (event: FormEvent) => void;
  createMovement: (event: FormEvent) => void;
}) {
  return (
    <div className="stack">
      <div className="two-column">
        <section className="panel">
          <div className="panel-title">
            <WarehouseIcon size={18} />
            <h2>Novo estoque</h2>
          </div>
          <form className="inline-form" onSubmit={props.createWarehouse}>
            <input placeholder="Nome do estoque" value={props.warehouseName} onChange={(event) => props.setWarehouseName(event.target.value)} required />
            <button className="primary">Criar</button>
          </form>
        </section>
        <section className="panel">
          <div className="panel-title">
            <ArrowRightLeft size={18} />
            <h2>Movimentar</h2>
          </div>
          <form className="form-grid compact" onSubmit={props.createMovement}>
            <select value={props.movement.type} onChange={(event) => props.setMovement({ ...props.movement, type: event.target.value })}>
              <option value="ENTRADA">Entrada</option>
              <option value="SAIDA">Saida</option>
              <option value="AJUSTE">Ajuste</option>
              <option value="PRODUCAO">Producao</option>
            </select>
            <select value={props.movement.productId} onChange={(event) => props.setMovement({ ...props.movement, productId: event.target.value })}>
              {props.products.map((product) => <option value={product.id} key={product.id}>{product.description}</option>)}
            </select>
            <select value={props.movement.warehouseId} onChange={(event) => props.setMovement({ ...props.movement, warehouseId: event.target.value })}>
              {props.warehouses.map((warehouse) => <option value={warehouse.id} key={warehouse.id}>{warehouse.name}</option>)}
            </select>
            <select value={props.movement.batchId} onChange={(event) => props.setMovement({ ...props.movement, batchId: event.target.value })}>
              <option value="">Sem lote</option>
              {props.batches.filter((batch) => batch.product.id === props.movement.productId).map((batch) => <option value={batch.id} key={batch.id}>{batch.number}</option>)}
            </select>
            <input type="number" step="0.01" value={props.movement.quantity} onChange={(event) => props.setMovement({ ...props.movement, quantity: event.target.value })} />
            <input placeholder="Motivo" value={props.movement.reason} onChange={(event) => props.setMovement({ ...props.movement, reason: event.target.value })} required />
            <button className="primary">Registrar</button>
          </form>
        </section>
      </div>
      <section className="panel">
        <h2>Saldos</h2>
        <table>
          <thead>
            <tr>
              <th>Produto</th>
              <th>Estoque</th>
              <th>Lote</th>
              <th>Quantidade</th>
            </tr>
          </thead>
          <tbody>
            {props.balances.map((balance) => (
              <tr key={balance.id}>
                <td>{balance.product.description}</td>
                <td>{balance.warehouse.name}</td>
                <td>{balance.batch?.number ?? ""}</td>
                <td>{Number(balance.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function BatchesTab(props: {
  products: Product[];
  batches: Batch[];
  alerts: { expired: Batch[]; expiring: Batch[] };
  batchForm: { productId: string; number: string; manufacturedAt: string; expiresAt: string };
  setBatchForm: (value: { productId: string; number: string; manufacturedAt: string; expiresAt: string }) => void;
  createBatch: (event: FormEvent) => void;
}) {
  return (
    <div className="stack">
      <div className="two-column">
        <section className="panel">
          <div className="panel-title">
            <CalendarClock size={18} />
            <h2>Novo lote</h2>
          </div>
          <form className="form-grid" onSubmit={props.createBatch}>
            <label>Produto<select value={props.batchForm.productId} onChange={(event) => props.setBatchForm({ ...props.batchForm, productId: event.target.value })}>{props.products.map((product) => <option value={product.id} key={product.id}>{product.description}</option>)}</select></label>
            <label>Lote<input value={props.batchForm.number} onChange={(event) => props.setBatchForm({ ...props.batchForm, number: event.target.value })} required /></label>
            <label>Fabricacao<input type="date" value={props.batchForm.manufacturedAt} onChange={(event) => props.setBatchForm({ ...props.batchForm, manufacturedAt: event.target.value })} /></label>
            <label>Validade<input type="date" value={props.batchForm.expiresAt} onChange={(event) => props.setBatchForm({ ...props.batchForm, expiresAt: event.target.value })} /></label>
            <button className="primary">Salvar lote</button>
          </form>
        </section>
        <section className="panel">
          <div className="panel-title">
            <AlertTriangle size={18} />
            <h2>Alertas de validade</h2>
          </div>
          <div className="metrics-grid">
            <div className="metric compact-metric"><span>Vencidos</span><strong>{props.alerts.expired.length}</strong></div>
            <div className="metric compact-metric"><span>Vencem em 90 dias</span><strong>{props.alerts.expiring.length}</strong></div>
          </div>
        </section>
      </div>
      <section className="panel">
        <h2>Lotes</h2>
        <table>
          <thead>
            <tr>
              <th>Produto</th>
              <th>Lote</th>
              <th>Fabricacao</th>
              <th>Validade</th>
            </tr>
          </thead>
          <tbody>
            {props.batches.map((batch) => (
              <tr key={batch.id}>
                <td>{batch.product.description}</td>
                <td>{batch.number}</td>
                <td>{batch.manufacturedAt ? new Date(batch.manufacturedAt).toLocaleDateString("pt-BR") : ""}</td>
                <td>{batch.expiresAt ? new Date(batch.expiresAt).toLocaleDateString("pt-BR") : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function InventoryTab(props: {
  products: Product[];
  warehouses: Warehouse[];
  inventories: InventoryRow[];
  inventoryForm: { name: string; warehouseId: string; productId: string; countedQuantity: string };
  setInventoryForm: (value: { name: string; warehouseId: string; productId: string; countedQuantity: string }) => void;
  createInventory: (event: FormEvent) => void;
  addCount: (inventoryId: string) => void;
  closeInventory: (inventoryId: string) => void;
}) {
  const openInventory = props.inventories.find((inventory) => inventory.status === "OPEN");

  return (
    <div className="stack">
      <div className="two-column">
        <section className="panel">
          <div className="panel-title">
            <ClipboardCheck size={18} />
            <h2>Novo inventario</h2>
          </div>
          <form className="form-grid" onSubmit={props.createInventory}>
            <label>Nome<input value={props.inventoryForm.name} onChange={(event) => props.setInventoryForm({ ...props.inventoryForm, name: event.target.value })} required /></label>
            <label>Estoque<select value={props.inventoryForm.warehouseId} onChange={(event) => props.setInventoryForm({ ...props.inventoryForm, warehouseId: event.target.value })}>{props.warehouses.map((warehouse) => <option value={warehouse.id} key={warehouse.id}>{warehouse.name}</option>)}</select></label>
            <button className="primary">Abrir inventario</button>
          </form>
        </section>
        <section className="panel">
          <div className="panel-title">
            <Boxes size={18} />
            <h2>Contagem</h2>
          </div>
          <div className="form-grid">
            <label>Produto<select value={props.inventoryForm.productId} onChange={(event) => props.setInventoryForm({ ...props.inventoryForm, productId: event.target.value })}>{props.products.map((product) => <option value={product.id} key={product.id}>{product.description}</option>)}</select></label>
            <label>Quantidade contada<input type="number" step="0.01" value={props.inventoryForm.countedQuantity} onChange={(event) => props.setInventoryForm({ ...props.inventoryForm, countedQuantity: event.target.value })} /></label>
            <button className="primary" disabled={!openInventory} onClick={() => openInventory && props.addCount(openInventory.id)}>Registrar contagem</button>
          </div>
        </section>
      </div>
      <section className="panel">
        <h2>Inventarios</h2>
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Estoque</th>
              <th>Status</th>
              <th>Divergencias</th>
              <th>Contagens</th>
              <th>Acoes</th>
            </tr>
          </thead>
          <tbody>
            {props.inventories.map((inventory) => (
              <tr key={inventory.id}>
                <td>{inventory.name}</td>
                <td>{inventory.warehouse.name}</td>
                <td><span className="status">{inventory.status}</span></td>
                <td>{inventory.counts.filter((count) => Number(count.difference) !== 0).length}</td>
                <td>
                  <div className="mini-list">
                    {inventory.counts.map((count) => (
                      <span key={count.id}>
                        {count.product.description}: {Number(count.countedQuantity)} ({Number(count.difference) > 0 ? "+" : ""}{Number(count.difference)})
                      </span>
                    ))}
                  </div>
                </td>
                <td>{inventory.status === "OPEN" ? <button className="secondary" onClick={() => props.closeInventory(inventory.id)}>Fechar e ajustar</button> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
