import { Check, Plus } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";

type Entry = {
  id: string;
  supplierName?: string;
  customerName?: string;
  category?: string;
  amount: string;
  dueDate: string;
  status: string;
};

export function Finance() {
  const [payables, setPayables] = useState<Entry[]>([]);
  const [receivables, setReceivables] = useState<Entry[]>([]);
  const [mode, setMode] = useState<"payable" | "receivable">("payable");
  const [form, setForm] = useState({ name: "", category: "Geral", amount: "0", dueDate: "" });
  const [payingId, setPayingId] = useState("");

  async function load() {
    const [payableRows, receivableRows] = await Promise.all([
      api<Entry[]>("/finance/accounts-payable"),
      api<Entry[]>("/finance/accounts-receivable")
    ]);
    setPayables(payableRows);
    setReceivables(receivableRows);
  }

  useEffect(() => {
    void load();
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const path = mode === "payable" ? "/finance/accounts-payable" : "/finance/accounts-receivable";
    const body = mode === "payable"
      ? { supplierName: form.name, category: form.category, amount: Number(form.amount), dueDate: form.dueDate }
      : { customerName: form.name, amount: Number(form.amount), dueDate: form.dueDate };

    await api(path, { method: "POST", body: JSON.stringify(body) });
    setForm({ name: "", category: "Geral", amount: "0", dueDate: "" });
    await load();
  }

  async function payAccount(id: string) {
    setPayingId(id);
    try {
      await api(`/finance/accounts-payable/${id}/pay`, { method: "POST" });
      await load();
    } finally {
      setPayingId("");
    }
  }

  return (
    <div className="stack">
      <section className="panel">
        <div className="panel-title">
          <Plus size={18} />
          <h2>Novo titulo</h2>
        </div>
        <div className="segmented">
          <button className={mode === "payable" ? "active" : ""} onClick={() => setMode("payable")}>A pagar</button>
          <button className={mode === "receivable" ? "active" : ""} onClick={() => setMode("receivable")}>A receber</button>
        </div>
        <form className="form-grid compact" onSubmit={submit}>
          <label>{mode === "payable" ? "Fornecedor" : "Cliente"}<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
          {mode === "payable" ? <label>Categoria<input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} required /></label> : null}
          <label>Valor<input type="number" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} /></label>
          <label>Vencimento<input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} required /></label>
          <button className="primary">Salvar</button>
        </form>
      </section>
      <div className="two-column">
        <FinanceTable title="Contas a pagar" rows={payables} nameKey="supplierName" payingId={payingId} onPay={payAccount} />
        <FinanceTable title="Contas a receber" rows={receivables} nameKey="customerName" />
      </div>
    </div>
  );
}

function FinanceTable({
  title,
  rows,
  nameKey,
  payingId,
  onPay
}: {
  title: string;
  rows: Entry[];
  nameKey: "supplierName" | "customerName";
  payingId?: string;
  onPay?: (id: string) => Promise<void>;
}) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Valor</th>
            <th>Status</th>
            {onPay ? <th>Acoes</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row[nameKey]}</td>
              <td>{Number(row.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
              <td><span className="status">{row.status}</span></td>
              {onPay ? (
                <td>
                  {row.status === "OPEN" ? (
                    <button className="secondary icon-text" onClick={() => void onPay(row.id)} disabled={payingId === row.id}>
                      <Check size={16} />
                      {payingId === row.id ? "Baixando" : "Pagar"}
                    </button>
                  ) : (
                    <span className="muted">Baixada</span>
                  )}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
