import { Banknote, DoorClosed, Plus, ReceiptText, ShoppingBag } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";

type CashRegister = { id: string; name: string };
type Product = { id: string; description: string; salePrice?: string };
type WarehouseRow = { id: string; name: string };
type Receivable = { id: string; customerName: string; amount: string; status: string; dueDate: string };
type CashSession = {
  id: string;
  status: string;
  expectedAmount: string;
  informedAmount?: string;
  difference?: string;
  register: CashRegister;
  operations: Array<{ id: string; type: string; method: string; amount: string; description?: string }>;
};

export function Cash() {
  const [registers, setRegisters] = useState<CashRegister[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseRow[]>([]);
  const [sessions, setSessions] = useState<CashSession[]>([]);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [registerName, setRegisterName] = useState("");
  const [openForm, setOpenForm] = useState({ registerId: "", openingAmount: "0" });
  const [receiveForm, setReceiveForm] = useState({ receivableId: "", method: "PIX", amount: "0" });
  const [posForm, setPosForm] = useState({ productId: "", warehouseId: "", method: "PIX", quantity: "1", unitPrice: "0", customerName: "" });
  const [closeAmount, setCloseAmount] = useState("0");

  async function load() {
    const [registerRows, productRows, warehouseRows, sessionRows, receivableRows] = await Promise.all([
      api<CashRegister[]>("/cash/registers"),
      api<Product[]>("/catalog/products"),
      api<WarehouseRow[]>("/inventory/warehouses"),
      api<CashSession[]>("/cash/sessions"),
      api<Receivable[]>("/finance/accounts-receivable")
    ]);
    setRegisters(registerRows);
    setProducts(productRows);
    setWarehouses(warehouseRows);
    setSessions(sessionRows);
    setReceivables(receivableRows.filter((item) => item.status === "OPEN"));
    setOpenForm((current) => ({ ...current, registerId: current.registerId || registerRows[0]?.id || "" }));
    setReceiveForm((current) => {
      const receivable = receivableRows.find((item) => item.status === "OPEN");
      return {
        ...current,
        receivableId: current.receivableId || receivable?.id || "",
        amount: current.amount !== "0" ? current.amount : String(receivable?.amount ?? "0")
      };
    });
    setPosForm((current) => {
      const product = productRows.find((item) => item.id === current.productId) ?? productRows[0];
      return {
        ...current,
        productId: current.productId || product?.id || "",
        warehouseId: current.warehouseId || warehouseRows[0]?.id || "",
        unitPrice: current.unitPrice !== "0" ? current.unitPrice : String(product?.salePrice ?? "0")
      };
    });
  }

  useEffect(() => {
    void load();
  }, []);

  const openSession = useMemo(() => sessions.find((session) => session.status === "OPEN"), [sessions]);
  const posTotal = roundMoney(Number(posForm.quantity) * Number(posForm.unitPrice));
  const operations = sessions.flatMap((session) => session.operations.map((operation) => ({ ...operation, registerName: session.register.name })));

  async function createRegister(event: FormEvent) {
    event.preventDefault();
    await api("/cash/registers", { method: "POST", body: JSON.stringify({ name: registerName }) });
    setRegisterName("");
    await load();
  }

  async function openCash(event: FormEvent) {
    event.preventDefault();
    await api("/cash/sessions", {
      method: "POST",
      body: JSON.stringify({ registerId: openForm.registerId, openingAmount: Number(openForm.openingAmount) })
    });
    await load();
  }

  async function receive(event: FormEvent) {
    event.preventDefault();
    if (!openSession) return;
    await api(`/cash/sessions/${openSession.id}/receive`, {
      method: "POST",
      body: JSON.stringify({ receivableId: receiveForm.receivableId, method: receiveForm.method, amount: Number(receiveForm.amount) })
    });
    setReceiveForm({ ...receiveForm, amount: "0" });
    await load();
  }

  async function posSale(event: FormEvent) {
    event.preventDefault();
    if (!openSession) return;
    await api(`/cash/sessions/${openSession.id}/pos-sale`, {
      method: "POST",
      body: JSON.stringify({
        warehouseId: posForm.warehouseId,
        method: posForm.method,
        customerName: posForm.customerName || undefined,
        items: [{ productId: posForm.productId, quantity: Number(posForm.quantity), unitPrice: Number(posForm.unitPrice) }]
      })
    });
    setPosForm({ ...posForm, quantity: "1", customerName: "" });
    await load();
  }

  async function closeCash() {
    if (!openSession) return;
    await api(`/cash/sessions/${openSession.id}/close`, {
      method: "POST",
      body: JSON.stringify({ informedAmount: Number(closeAmount) })
    });
    setCloseAmount("0");
    await load();
  }

  return (
    <div className="stack">
      <div className="metrics-grid">
        <div className="metric compact-metric"><span>Caixa aberto</span><strong>{openSession ? openSession.register.name : "Nao"}</strong></div>
        <div className="metric compact-metric"><span>Valor esperado</span><strong>{money(openSession?.expectedAmount ?? 0)}</strong></div>
        <div className="metric compact-metric"><span>Recebiveis abertos</span><strong>{receivables.length}</strong></div>
        <div className="metric compact-metric"><span>Total PDV</span><strong>{money(posTotal)}</strong></div>
      </div>

      <div className="two-column">
        <section className="panel">
          <div className="panel-title">
            <Plus size={18} />
            <h2>Terminal</h2>
          </div>
          <form className="inline-form" onSubmit={createRegister}>
            <input placeholder="Nome do caixa" value={registerName} onChange={(event) => setRegisterName(event.target.value)} required />
            <button className="primary">Criar</button>
          </form>
          <form className="form-grid" onSubmit={openCash}>
            <label>Caixa<select value={openForm.registerId} onChange={(event) => setOpenForm({ ...openForm, registerId: event.target.value })}>{registers.map((register) => <option value={register.id} key={register.id}>{register.name}</option>)}</select></label>
            <label>Valor inicial<input type="number" step="0.01" value={openForm.openingAmount} onChange={(event) => setOpenForm({ ...openForm, openingAmount: event.target.value })} /></label>
            <button className="primary" disabled={Boolean(openSession)}>Abrir caixa</button>
          </form>
        </section>

        <section className="panel">
          <div className="panel-title">
            <ReceiptText size={18} />
            <h2>Receber titulo</h2>
          </div>
          <form className="form-grid" onSubmit={receive}>
            <label>Conta<select value={receiveForm.receivableId} onChange={(event) => {
              const receivable = receivables.find((item) => item.id === event.target.value);
              setReceiveForm({ ...receiveForm, receivableId: event.target.value, amount: String(receivable?.amount ?? receiveForm.amount) });
            }}>{receivables.map((item) => <option value={item.id} key={item.id}>{item.customerName} - {money(item.amount)}</option>)}</select></label>
            <label>Metodo<select value={receiveForm.method} onChange={(event) => setReceiveForm({ ...receiveForm, method: event.target.value })}>{paymentOptions()}</select></label>
            <label>Valor<input type="number" step="0.01" value={receiveForm.amount} onChange={(event) => setReceiveForm({ ...receiveForm, amount: event.target.value })} /></label>
            <button className="primary" disabled={!openSession || !receiveForm.receivableId}>Receber</button>
          </form>
        </section>
      </div>

      <section className="panel">
        <div className="panel-title">
          <ShoppingBag size={18} />
          <h2>PDV</h2>
        </div>
        <form className="form-grid compact" onSubmit={posSale}>
          <label>Produto<select value={posForm.productId} onChange={(event) => {
            const product = products.find((item) => item.id === event.target.value);
            setPosForm({ ...posForm, productId: event.target.value, unitPrice: String(product?.salePrice ?? posForm.unitPrice) });
          }}>{products.map((product) => <option value={product.id} key={product.id}>{product.description}</option>)}</select></label>
          <label>Estoque<select value={posForm.warehouseId} onChange={(event) => setPosForm({ ...posForm, warehouseId: event.target.value })}>{warehouses.map((warehouse) => <option value={warehouse.id} key={warehouse.id}>{warehouse.name}</option>)}</select></label>
          <label>Metodo<select value={posForm.method} onChange={(event) => setPosForm({ ...posForm, method: event.target.value })}>{paymentOptions()}</select></label>
          <label>Quantidade<input type="number" step="0.01" value={posForm.quantity} onChange={(event) => setPosForm({ ...posForm, quantity: event.target.value })} /></label>
          <label>Preco unitario<input type="number" step="0.01" value={posForm.unitPrice} onChange={(event) => setPosForm({ ...posForm, unitPrice: event.target.value })} /></label>
          <label>Cliente<input value={posForm.customerName} onChange={(event) => setPosForm({ ...posForm, customerName: event.target.value })} /></label>
          <button className="primary" disabled={!openSession || !posForm.productId || !posForm.warehouseId}>Finalizar {money(posTotal)}</button>
        </form>
      </section>

      <section className="panel">
        <div className="panel-title">
          <DoorClosed size={18} />
          <h2>Fechamento</h2>
        </div>
        <div className="inline-form">
          <input type="number" step="0.01" placeholder="Valor informado" value={closeAmount} onChange={(event) => setCloseAmount(event.target.value)} />
          <button className="secondary" disabled={!openSession} onClick={closeCash}>Fechar caixa</button>
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">
          <Banknote size={18} />
          <h2>Sessoes</h2>
        </div>
        <table>
          <thead>
            <tr>
              <th>Caixa</th>
              <th>Status</th>
              <th>Esperado</th>
              <th>Informado</th>
              <th>Diferenca</th>
              <th>Operacoes</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr key={session.id}>
                <td>{session.register.name}</td>
                <td><span className="status">{session.status}</span></td>
                <td>{money(session.expectedAmount)}</td>
                <td>{session.informedAmount ? money(session.informedAmount) : ""}</td>
                <td>{session.difference ? money(session.difference) : ""}</td>
                <td>{session.operations.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h2>Operacoes do caixa</h2>
        <table>
          <thead>
            <tr>
              <th>Caixa</th>
              <th>Tipo</th>
              <th>Metodo</th>
              <th>Valor</th>
              <th>Descricao</th>
            </tr>
          </thead>
          <tbody>
            {operations.map((operation) => (
              <tr key={operation.id}>
                <td>{operation.registerName}</td>
                <td><span className="status">{operation.type}</span></td>
                <td>{operation.method}</td>
                <td>{money(operation.amount)}</td>
                <td>{operation.description ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function paymentOptions() {
  return (
    <>
      <option value="DINHEIRO">Dinheiro</option>
      <option value="PIX">PIX</option>
      <option value="CARTAO">Cartao</option>
      <option value="TRANSFERENCIA">Transferencia</option>
      <option value="BOLETO">Boleto</option>
    </>
  );
}

function money(value: string | number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(roundMoney(Number(value)));
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
