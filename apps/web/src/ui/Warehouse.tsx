import { Check, ClipboardCheck, HardHat, Plus, RotateCcw, Truck, UserRound, Wrench } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";

type Product = { id: string; description: string };
type WarehouseRow = { id: string; name: string; code: string };
type Employee = { id: string; name: string; document?: string; department?: string };
type PpeDelivery = {
  id: string;
  deliveredAt: string;
  caNumber: string;
  size?: string;
  quantity: string;
  replacementReason?: string;
  employee: Employee;
  product?: Product | null;
};
type ToolAsset = {
  id: string;
  code: string;
  name: string;
  status: string;
  location?: string;
};
type ToolLoan = {
  id: string;
  borrower: string;
  reason?: string;
  status: string;
  loanedAt: string;
  returnedAt?: string;
  tool: ToolAsset;
  employee?: Employee | null;
};
type Requisition = {
  id: string;
  requester: string;
  department: string;
  priority: string;
  status: string;
  createdAt: string;
  items: Array<{ id: string; quantity: string; product: Product }>;
};

export function Warehouse() {
  const [tab, setTab] = useState<"requisitions" | "ppe" | "tools">("requisitions");
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseRow[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [ppeDeliveries, setPpeDeliveries] = useState<PpeDelivery[]>([]);
  const [tools, setTools] = useState<ToolAsset[]>([]);
  const [toolLoans, setToolLoans] = useState<ToolLoan[]>([]);
  const [rows, setRows] = useState<Requisition[]>([]);
  const [form, setForm] = useState({ requester: "", department: "", priority: "Normal", productId: "", quantity: "1" });
  const [employeeForm, setEmployeeForm] = useState({ name: "", document: "", department: "" });
  const [ppeForm, setPpeForm] = useState({ employeeId: "", productId: "", warehouseId: "", caNumber: "", size: "", quantity: "1", replacementReason: "" });
  const [toolForm, setToolForm] = useState({ code: "", name: "", location: "" });
  const [loanForm, setLoanForm] = useState({ toolId: "", employeeId: "", borrower: "", reason: "" });
  const [deliveryWarehouseId, setDeliveryWarehouseId] = useState("");

  async function load() {
    const [productRows, warehouseRows, employeeRows, ppeRows, toolRows, loanRows, requisitions] = await Promise.all([
      api<Product[]>("/catalog/products"),
      api<WarehouseRow[]>("/inventory/warehouses"),
      api<Employee[]>("/warehouse/employees"),
      api<PpeDelivery[]>("/warehouse/ppe-deliveries"),
      api<ToolAsset[]>("/warehouse/tools"),
      api<ToolLoan[]>("/warehouse/tool-loans"),
      api<Requisition[]>("/warehouse/requisitions")
    ]);
    setProducts(productRows);
    setWarehouses(warehouseRows);
    setEmployees(employeeRows);
    setPpeDeliveries(ppeRows);
    setTools(toolRows);
    setToolLoans(loanRows);
    setRows(requisitions);
    setForm((current) => ({ ...current, productId: current.productId || productRows[0]?.id || "" }));
    setDeliveryWarehouseId((current) => current || warehouseRows[0]?.id || "");
    setPpeForm((current) => ({
      ...current,
      employeeId: current.employeeId || employeeRows[0]?.id || "",
      productId: current.productId || productRows[0]?.id || "",
      warehouseId: current.warehouseId || warehouseRows[0]?.id || ""
    }));
    setLoanForm((current) => ({
      ...current,
      toolId: current.toolId || toolRows.find((tool) => tool.status === "AVAILABLE")?.id || "",
      employeeId: current.employeeId || employeeRows[0]?.id || "",
      borrower: current.borrower || employeeRows[0]?.name || ""
    }));
  }

  useEffect(() => {
    void load();
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    await api("/warehouse/requisitions", {
      method: "POST",
      body: JSON.stringify({
        requester: form.requester,
        department: form.department,
        priority: form.priority,
        items: [{ productId: form.productId, quantity: Number(form.quantity) }]
      })
    });
    setForm({ requester: "", department: "", priority: "Normal", productId: products[0]?.id ?? "", quantity: "1" });
    await load();
  }

  async function approve(id: string) {
    await api(`/warehouse/requisitions/${id}/approve`, { method: "POST" });
    await load();
  }

  async function deliver(id: string) {
    await api(`/warehouse/requisitions/${id}/deliver`, {
      method: "POST",
      body: JSON.stringify({ warehouseId: deliveryWarehouseId })
    });
    await load();
  }

  async function createEmployee(event: FormEvent) {
    event.preventDefault();
    await api("/warehouse/employees", {
      method: "POST",
      body: JSON.stringify({
        name: employeeForm.name,
        document: employeeForm.document || undefined,
        department: employeeForm.department || undefined
      })
    });
    setEmployeeForm({ name: "", document: "", department: "" });
    await load();
  }

  async function deliverPpe(event: FormEvent) {
    event.preventDefault();
    await api("/warehouse/ppe-deliveries", {
      method: "POST",
      body: JSON.stringify({
        employeeId: ppeForm.employeeId,
        productId: ppeForm.productId,
        warehouseId: ppeForm.warehouseId,
        caNumber: ppeForm.caNumber,
        size: ppeForm.size || undefined,
        quantity: Number(ppeForm.quantity),
        replacementReason: ppeForm.replacementReason || undefined
      })
    });
    setPpeForm({ ...ppeForm, caNumber: "", size: "", quantity: "1", replacementReason: "" });
    await load();
  }

  async function createTool(event: FormEvent) {
    event.preventDefault();
    await api("/warehouse/tools", {
      method: "POST",
      body: JSON.stringify({ code: toolForm.code, name: toolForm.name, location: toolForm.location || undefined })
    });
    setToolForm({ code: "", name: "", location: "" });
    await load();
  }

  async function loanTool(event: FormEvent) {
    event.preventDefault();
    await api(`/warehouse/tools/${loanForm.toolId}/loan`, {
      method: "POST",
      body: JSON.stringify({
        employeeId: loanForm.employeeId || undefined,
        borrower: loanForm.borrower,
        reason: loanForm.reason || undefined
      })
    });
    setLoanForm({ ...loanForm, reason: "" });
    await load();
  }

  async function returnTool(id: string) {
    await api(`/warehouse/tool-loans/${id}/return`, { method: "POST" });
    await load();
  }

  return (
    <div className="stack">
      <div className="segmented">
        <button className={tab === "requisitions" ? "active" : ""} onClick={() => setTab("requisitions")}>Requisicoes</button>
        <button className={tab === "ppe" ? "active" : ""} onClick={() => setTab("ppe")}>EPI</button>
        <button className={tab === "tools" ? "active" : ""} onClick={() => setTab("tools")}>Ferramentas</button>
      </div>

      {tab === "requisitions" ? (
      <>
      <div className="two-column">
        <section className="panel">
          <div className="panel-title">
            <ClipboardCheck size={18} />
            <h2>Nova requisicao</h2>
          </div>
          <form className="form-grid" onSubmit={submit}>
            <label>Solicitante<input value={form.requester} onChange={(event) => setForm({ ...form, requester: event.target.value })} required /></label>
            <label>Setor<input value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })} required /></label>
            <label>Prioridade<input value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })} /></label>
            <label>Produto<select value={form.productId} onChange={(event) => setForm({ ...form, productId: event.target.value })}>{products.map((product) => <option key={product.id} value={product.id}>{product.description}</option>)}</select></label>
            <label>Quantidade<input type="number" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} /></label>
            <button className="primary">Abrir requisicao</button>
          </form>
        </section>
        <section className="panel">
          <div className="panel-title">
            <Truck size={18} />
            <h2>Entrega</h2>
          </div>
          <label>Estoque de origem<select value={deliveryWarehouseId} onChange={(event) => setDeliveryWarehouseId(event.target.value)}>{warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}</select></label>
        </section>
      </div>

      <section className="panel">
        <h2>Requisicoes</h2>
        <table>
          <thead>
            <tr>
              <th>Solicitante</th>
              <th>Setor</th>
              <th>Prioridade</th>
              <th>Itens</th>
              <th>Status</th>
              <th>Acoes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.requester}</td>
                <td>{row.department}</td>
                <td>{row.priority}</td>
                <td>
                  <div className="mini-list">
                    {row.items.map((item) => <span key={item.id}>{item.product.description}: {Number(item.quantity)}</span>)}
                  </div>
                </td>
                <td><span className="status">{row.status}</span></td>
                <td>
                  <div className="row-actions">
                    {row.status === "PENDING_APPROVAL" ? (
                      <button className="secondary icon-text" onClick={() => void approve(row.id)}>
                        <Check size={16} />
                        Aprovar
                      </button>
                    ) : null}
                    {row.status === "APPROVED" ? (
                      <button className="secondary icon-text" onClick={() => void deliver(row.id)} disabled={!deliveryWarehouseId}>
                        <Truck size={16} />
                        Entregar
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      </>
      ) : null}

      {tab === "ppe" ? (
        <>
          <div className="two-column">
            <section className="panel">
              <div className="panel-title">
                <UserRound size={18} />
                <h2>Novo funcionario</h2>
              </div>
              <form className="form-grid compact" onSubmit={createEmployee}>
                <label>Nome<input value={employeeForm.name} onChange={(event) => setEmployeeForm({ ...employeeForm, name: event.target.value })} required /></label>
                <label>Documento<input value={employeeForm.document} onChange={(event) => setEmployeeForm({ ...employeeForm, document: event.target.value })} /></label>
                <label>Setor<input value={employeeForm.department} onChange={(event) => setEmployeeForm({ ...employeeForm, department: event.target.value })} /></label>
                <button className="primary">
                  <Plus size={16} />
                  Cadastrar
                </button>
              </form>
            </section>
            <section className="panel">
              <div className="panel-title">
                <HardHat size={18} />
                <h2>Entregar EPI</h2>
              </div>
              <form className="form-grid compact" onSubmit={deliverPpe}>
                <label>Funcionario<select value={ppeForm.employeeId} onChange={(event) => setPpeForm({ ...ppeForm, employeeId: event.target.value })}>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label>
                <label>Produto<select value={ppeForm.productId} onChange={(event) => setPpeForm({ ...ppeForm, productId: event.target.value })}>{products.map((product) => <option key={product.id} value={product.id}>{product.description}</option>)}</select></label>
                <label>Estoque<select value={ppeForm.warehouseId} onChange={(event) => setPpeForm({ ...ppeForm, warehouseId: event.target.value })}>{warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}</select></label>
                <label>CA<input value={ppeForm.caNumber} onChange={(event) => setPpeForm({ ...ppeForm, caNumber: event.target.value })} required /></label>
                <label>Tamanho<input value={ppeForm.size} onChange={(event) => setPpeForm({ ...ppeForm, size: event.target.value })} /></label>
                <label>Quantidade<input type="number" step="0.01" value={ppeForm.quantity} onChange={(event) => setPpeForm({ ...ppeForm, quantity: event.target.value })} /></label>
                <label>Motivo<input value={ppeForm.replacementReason} onChange={(event) => setPpeForm({ ...ppeForm, replacementReason: event.target.value })} /></label>
                <button className="primary" disabled={!ppeForm.employeeId || !ppeForm.productId || !ppeForm.warehouseId}>Entregar EPI</button>
              </form>
            </section>
          </div>
          <section className="panel">
            <h2>Entregas de EPI</h2>
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Funcionario</th>
                  <th>Setor</th>
                  <th>Produto</th>
                  <th>CA</th>
                  <th>Qtd</th>
                  <th>Motivo</th>
                </tr>
              </thead>
              <tbody>
                {ppeDeliveries.map((delivery) => (
                  <tr key={delivery.id}>
                    <td>{new Date(delivery.deliveredAt).toLocaleDateString("pt-BR")}</td>
                    <td>{delivery.employee.name}</td>
                    <td>{delivery.employee.department ?? ""}</td>
                    <td>{delivery.product?.description ?? ""}</td>
                    <td>{delivery.caNumber}</td>
                    <td>{Number(delivery.quantity)}</td>
                    <td>{delivery.replacementReason ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      ) : null}

      {tab === "tools" ? (
        <>
          <div className="two-column">
            <section className="panel">
              <div className="panel-title">
                <Wrench size={18} />
                <h2>Nova ferramenta</h2>
              </div>
              <form className="form-grid compact" onSubmit={createTool}>
                <label>Codigo<input value={toolForm.code} onChange={(event) => setToolForm({ ...toolForm, code: event.target.value })} required /></label>
                <label>Nome<input value={toolForm.name} onChange={(event) => setToolForm({ ...toolForm, name: event.target.value })} required /></label>
                <label>Local<input value={toolForm.location} onChange={(event) => setToolForm({ ...toolForm, location: event.target.value })} /></label>
                <button className="primary">Cadastrar ferramenta</button>
              </form>
            </section>
            <section className="panel">
              <div className="panel-title">
                <UserRound size={18} />
                <h2>Emprestimo</h2>
              </div>
              <form className="form-grid compact" onSubmit={loanTool}>
                <label>Ferramenta<select value={loanForm.toolId} onChange={(event) => setLoanForm({ ...loanForm, toolId: event.target.value })}>{tools.filter((tool) => tool.status === "AVAILABLE").map((tool) => <option value={tool.id} key={tool.id}>{tool.code} - {tool.name}</option>)}</select></label>
                <label>Funcionario<select value={loanForm.employeeId} onChange={(event) => {
                  const employee = employees.find((item) => item.id === event.target.value);
                  setLoanForm({ ...loanForm, employeeId: event.target.value, borrower: employee?.name ?? loanForm.borrower });
                }}>{employees.map((employee) => <option value={employee.id} key={employee.id}>{employee.name}</option>)}</select></label>
                <label>Responsavel<input value={loanForm.borrower} onChange={(event) => setLoanForm({ ...loanForm, borrower: event.target.value })} required /></label>
                <label>Motivo<input value={loanForm.reason} onChange={(event) => setLoanForm({ ...loanForm, reason: event.target.value })} /></label>
                <button className="primary" disabled={!loanForm.toolId || !loanForm.borrower}>Emprestar</button>
              </form>
            </section>
          </div>
          <section className="panel">
            <h2>Ferramentas</h2>
            <table>
              <thead>
                <tr>
                  <th>Codigo</th>
                  <th>Nome</th>
                  <th>Local</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {tools.map((tool) => (
                  <tr key={tool.id}>
                    <td>{tool.code}</td>
                    <td>{tool.name}</td>
                    <td>{tool.location ?? ""}</td>
                    <td><span className="status">{tool.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section className="panel">
            <h2>Historico de emprestimos</h2>
            <table>
              <thead>
                <tr>
                  <th>Ferramenta</th>
                  <th>Responsavel</th>
                  <th>Retirada</th>
                  <th>Devolucao</th>
                  <th>Status</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {toolLoans.map((loan) => (
                  <tr key={loan.id}>
                    <td>{loan.tool.code} - {loan.tool.name}</td>
                    <td>{loan.borrower}</td>
                    <td>{new Date(loan.loanedAt).toLocaleString("pt-BR")}</td>
                    <td>{loan.returnedAt ? new Date(loan.returnedAt).toLocaleString("pt-BR") : ""}</td>
                    <td><span className="status">{loan.status}</span></td>
                    <td>{loan.status === "OPEN" ? <button className="secondary icon-text" onClick={() => void returnTool(loan.id)}><RotateCcw size={16} />Devolver</button> : null}</td>
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
