import { FileDown, ScrollText } from "lucide-react";
import { useEffect, useState } from "react";
import { API_URL, api, getSession } from "../api/client";

type OperationsReport = {
  generatedAt: string;
  stock: {
    totalItems: number;
    estimatedValue: number;
    balances: Array<{ id: string; quantity: string; product: { description: string; internalCode: string }; warehouse: { name: string } }>;
  };
  expirations: Array<{ id: string; number: string; expiresAt?: string; product: { description: string } }>;
  finance: {
    payableOpen: number;
    payableCount: number;
    receivableOpen: number;
    receivableCount: number;
  };
  movements: Array<{ id: string; type: string; reason: string; createdAt: string }>;
  industrial: {
    assets: number;
    maintenanceOpen: number;
    toolLoansOpen: number;
    productionOpen: number;
    pendingRequisitions: number;
    maintenanceOrders: Array<{ id: string; number: string; type: string; status: string; description: string; asset: { name: string }; parts: Array<{ id: string; quantity: string; product: { description: string } }> }>;
    productionOrders: Array<{ id: string; number: string; plannedQuantity: string; status: string; finishedProduct: { description: string }; warehouse: { name: string } }>;
    toolLoans: Array<{ id: string; borrower: string; status: string; loanedAt: string; tool: { code: string; name: string } }>;
    ppeDeliveries: Array<{ id: string; deliveredAt: string; caNumber: string; quantity: string; employee: { name: string }; product?: { description: string } | null }>;
  };
};

export function Reports() {
  const [report, setReport] = useState<OperationsReport | null>(null);

  useEffect(() => {
    void api<OperationsReport>("/reports/operations").then(setReport);
  }, []);

  async function downloadCsv() {
    const session = getSession();
    const response = await fetch(`${API_URL}/reports/operations.csv`, {
      headers: session ? { Authorization: `Bearer ${session.accessToken}` } : undefined
    });
    if (!response.ok) throw new Error("Falha ao exportar CSV.");

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "antares-relatorio-operacional.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="stack">
      <section className="panel">
        <div className="panel-title">
          <ScrollText size={18} />
          <h2>Relatorio operacional</h2>
          <button className="secondary icon-text" onClick={() => void downloadCsv()}>
            <FileDown size={16} />
            CSV
          </button>
        </div>
        <div className="metrics-grid">
          <Metric label="Itens com saldo" value={report?.stock.totalItems ?? 0} />
          <Metric label="Valor estoque" value={money(report?.stock.estimatedValue ?? 0)} />
          <Metric label="A pagar aberto" value={money(report?.finance.payableOpen ?? 0)} />
          <Metric label="A receber aberto" value={money(report?.finance.receivableOpen ?? 0)} />
          <Metric label="Patrimonios" value={report?.industrial.assets ?? 0} />
          <Metric label="OS abertas" value={report?.industrial.maintenanceOpen ?? 0} />
          <Metric label="OP abertas" value={report?.industrial.productionOpen ?? 0} />
          <Metric label="Ferramentas fora" value={report?.industrial.toolLoansOpen ?? 0} />
        </div>
      </section>

      <div className="two-column">
        <section className="panel">
          <div className="panel-title">
            <FileDown size={18} />
            <h2>Saldos de estoque</h2>
          </div>
          <table>
            <thead>
              <tr>
                <th>Codigo</th>
                <th>Produto</th>
                <th>Estoque</th>
                <th>Qtd</th>
              </tr>
            </thead>
            <tbody>
              {(report?.stock.balances ?? []).map((balance) => (
                <tr key={balance.id}>
                  <td>{balance.product.internalCode}</td>
                  <td>{balance.product.description}</td>
                  <td>{balance.warehouse.name}</td>
                  <td>{Number(balance.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="panel">
          <h2>Proximos vencimentos</h2>
          <table>
            <thead>
              <tr>
                <th>Lote</th>
                <th>Produto</th>
                <th>Validade</th>
              </tr>
            </thead>
            <tbody>
              {(report?.expirations ?? []).map((batch) => (
                <tr key={batch.id}>
                  <td>{batch.number}</td>
                  <td>{batch.product.description}</td>
                  <td>{batch.expiresAt ? new Date(batch.expiresAt).toLocaleDateString("pt-BR") : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
      <div className="two-column">
        <section className="panel">
          <h2>Manutencoes</h2>
          <table>
            <thead>
              <tr>
                <th>OS</th>
                <th>Patrimonio</th>
                <th>Status</th>
                <th>Pecas</th>
              </tr>
            </thead>
            <tbody>
              {(report?.industrial.maintenanceOrders ?? []).map((order) => (
                <tr key={order.id}>
                  <td>{order.number}</td>
                  <td>{order.asset.name}</td>
                  <td><span className="status">{order.status}</span></td>
                  <td>{order.parts.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="panel">
          <h2>Producao</h2>
          <table>
            <thead>
              <tr>
                <th>OP</th>
                <th>Produto</th>
                <th>Qtd</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(report?.industrial.productionOrders ?? []).map((order) => (
                <tr key={order.id}>
                  <td>{order.number}</td>
                  <td>{order.finishedProduct.description}</td>
                  <td>{Number(order.plannedQuantity)}</td>
                  <td><span className="status">{order.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
      <div className="two-column">
        <section className="panel">
          <h2>Ferramentas emprestadas</h2>
          <table>
            <thead>
              <tr>
                <th>Ferramenta</th>
                <th>Responsavel</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(report?.industrial.toolLoans ?? []).map((loan) => (
                <tr key={loan.id}>
                  <td>{loan.tool.code} - {loan.tool.name}</td>
                  <td>{loan.borrower}</td>
                  <td><span className="status">{loan.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="panel">
          <h2>Entregas de EPI</h2>
          <table>
            <thead>
              <tr>
                <th>Funcionario</th>
                <th>Produto</th>
                <th>CA</th>
                <th>Qtd</th>
              </tr>
            </thead>
            <tbody>
              {(report?.industrial.ppeDeliveries ?? []).map((delivery) => (
                <tr key={delivery.id}>
                  <td>{delivery.employee.name}</td>
                  <td>{delivery.product?.description ?? ""}</td>
                  <td>{delivery.caNumber}</td>
                  <td>{Number(delivery.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="metric compact-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value));
}
