import { AlertTriangle, ArrowRightLeft, CalendarClock, CheckCircle2, Factory, Package, Wrench, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../api/client";

type Summary = {
  products: number;
  lowStock: number;
  expiredBatches: number;
  payableOpen: number;
  receivableOpen: number;
  modules: Array<{ key: string; label: string; count: number }>;
  industrial: {
    productionOpen: number;
    maintenanceOpen: number;
    toolLoansOpen: number;
    pendingRequisitions: number;
    openCashSessions: number;
    alerts: Array<{ type: string; label: string; status: string }>;
  };
  recentMovements: Array<{ id: string; type: string; reason: string; createdAt: string }>;
};

export function Dashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setError("");
    try {
      setSummary(await api<Summary>("/dashboard/summary"));
    } catch (err) {
      setSummary(null);
      setError(err instanceof Error ? err.message : "Falha ao carregar dados.");
    }
  }

  return (
    <div className="stack">
      {error ? (
        <section className="panel notice">
          <strong>{error}</strong>
          <button className="secondary" onClick={load}>Tentar novamente</button>
        </section>
      ) : null}
      <div className="metrics-grid">
        <Metric icon={Package} label="Produtos" value={summary?.products ?? 0} />
        <Metric icon={AlertTriangle} label="Estoque baixo" value={summary?.lowStock ?? 0} />
        <Metric icon={CalendarClock} label="Lotes vencidos" value={summary?.expiredBatches ?? 0} />
        <Metric icon={Wallet} label="A receber" value={formatMoney(summary?.receivableOpen ?? 0)} />
        <Metric icon={Wallet} label="A pagar" value={formatMoney(summary?.payableOpen ?? 0)} />
        <Metric icon={Factory} label="OP abertas" value={summary?.industrial.productionOpen ?? 0} />
        <Metric icon={Wrench} label="OS abertas" value={summary?.industrial.maintenanceOpen ?? 0} />
        <Metric icon={AlertTriangle} label="Ferramentas" value={summary?.industrial.toolLoansOpen ?? 0} />
        <Metric icon={Package} label="Req. pendentes" value={summary?.industrial.pendingRequisitions ?? 0} />
        <Metric icon={Wallet} label="Caixas abertos" value={summary?.industrial.openCashSessions ?? 0} />
      </div>
      <section className="panel">
        <div className="panel-title">
          <CheckCircle2 size={18} />
          <h2>Funcoes ativas</h2>
        </div>
        <div className="module-grid">
          {(summary?.modules ?? []).map((module) => (
            <div className="module-status" key={module.key}>
              <span>{module.label}</span>
              <strong>{module.count}</strong>
            </div>
          ))}
        </div>
      </section>
      <section className="panel">
        <div className="panel-title">
          <AlertTriangle size={18} />
          <h2>Alertas operacionais</h2>
        </div>
        <table>
          <thead>
            <tr>
              <th>Modulo</th>
              <th>Item</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {(summary?.industrial.alerts ?? []).map((alert, index) => (
              <tr key={`${alert.type}-${index}`}>
                <td>{alert.type}</td>
                <td>{alert.label}</td>
                <td><span className="status">{alert.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="panel">
        <div className="panel-title">
          <ArrowRightLeft size={18} />
          <h2>Movimentacoes recentes</h2>
          <button className="secondary" onClick={load}>Atualizar</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Motivo</th>
              <th>Data</th>
            </tr>
          </thead>
          <tbody>
            {(summary?.recentMovements ?? []).map((movement) => (
              <tr key={movement.id}>
                <td>{movement.type}</td>
                <td>{movement.reason}</td>
                <td>{new Date(movement.createdAt).toLocaleString("pt-BR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string | number }) {
  return (
    <div className="metric">
      <Icon size={20} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value));
}
