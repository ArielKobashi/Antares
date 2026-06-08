import { Building2, UserRoundPlus } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";

type Supplier = {
  id: string;
  document?: string;
  legalName: string;
  contacts?: string;
  address?: string;
  rating?: number;
};

type Customer = {
  id: string;
  document?: string;
  name: string;
  contacts?: string;
  address?: string;
  creditLimit?: string;
};

export function MasterData() {
  const [mode, setMode] = useState<"suppliers" | "customers">("suppliers");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [supplierForm, setSupplierForm] = useState({ document: "", legalName: "", contacts: "", address: "", rating: "5" });
  const [customerForm, setCustomerForm] = useState({ document: "", name: "", contacts: "", address: "", creditLimit: "0" });

  async function load() {
    const [supplierRows, customerRows] = await Promise.all([
      api<Supplier[]>("/catalog/suppliers"),
      api<Customer[]>("/catalog/customers")
    ]);
    setSuppliers(supplierRows);
    setCustomers(customerRows);
  }

  useEffect(() => {
    void load();
  }, []);

  async function saveSupplier(event: FormEvent) {
    event.preventDefault();
    await api("/catalog/suppliers", {
      method: "POST",
      body: JSON.stringify({ ...supplierForm, rating: Number(supplierForm.rating) })
    });
    setSupplierForm({ document: "", legalName: "", contacts: "", address: "", rating: "5" });
    await load();
  }

  async function saveCustomer(event: FormEvent) {
    event.preventDefault();
    await api("/catalog/customers", {
      method: "POST",
      body: JSON.stringify({ ...customerForm, creditLimit: Number(customerForm.creditLimit) })
    });
    setCustomerForm({ document: "", name: "", contacts: "", address: "", creditLimit: "0" });
    await load();
  }

  return (
    <div className="stack">
      <div className="segmented">
        <button className={mode === "suppliers" ? "active" : ""} onClick={() => setMode("suppliers")}>Fornecedores</button>
        <button className={mode === "customers" ? "active" : ""} onClick={() => setMode("customers")}>Clientes</button>
      </div>
      {mode === "suppliers" ? (
        <div className="two-column">
          <section className="panel">
            <div className="panel-title">
              <Building2 size={18} />
              <h2>Novo fornecedor</h2>
            </div>
            <form className="form-grid" onSubmit={saveSupplier}>
              <label>CNPJ<input value={supplierForm.document} onChange={(event) => setSupplierForm({ ...supplierForm, document: event.target.value })} /></label>
              <label>Razao social<input value={supplierForm.legalName} onChange={(event) => setSupplierForm({ ...supplierForm, legalName: event.target.value })} required /></label>
              <label>Contato<input value={supplierForm.contacts} onChange={(event) => setSupplierForm({ ...supplierForm, contacts: event.target.value })} /></label>
              <label>Endereco<input value={supplierForm.address} onChange={(event) => setSupplierForm({ ...supplierForm, address: event.target.value })} /></label>
              <label>Avaliacao<input type="number" min="1" max="5" value={supplierForm.rating} onChange={(event) => setSupplierForm({ ...supplierForm, rating: event.target.value })} /></label>
              <button className="primary">Salvar fornecedor</button>
            </form>
          </section>
          <MasterTable
            title="Fornecedores"
            headers={["Documento", "Razao social", "Contato", "Endereco", "Avaliacao"]}
            rows={suppliers.map((supplier) => [supplier.document ?? "", supplier.legalName, supplier.contacts ?? "", supplier.address ?? "", supplier.rating ?? ""])}
          />
        </div>
      ) : (
        <div className="two-column">
          <section className="panel">
            <div className="panel-title">
              <UserRoundPlus size={18} />
              <h2>Novo cliente</h2>
            </div>
            <form className="form-grid" onSubmit={saveCustomer}>
              <label>CPF/CNPJ<input value={customerForm.document} onChange={(event) => setCustomerForm({ ...customerForm, document: event.target.value })} /></label>
              <label>Nome<input value={customerForm.name} onChange={(event) => setCustomerForm({ ...customerForm, name: event.target.value })} required /></label>
              <label>Contato<input value={customerForm.contacts} onChange={(event) => setCustomerForm({ ...customerForm, contacts: event.target.value })} /></label>
              <label>Endereco<input value={customerForm.address} onChange={(event) => setCustomerForm({ ...customerForm, address: event.target.value })} /></label>
              <label>Limite de credito<input type="number" step="0.01" value={customerForm.creditLimit} onChange={(event) => setCustomerForm({ ...customerForm, creditLimit: event.target.value })} /></label>
              <button className="primary">Salvar cliente</button>
            </form>
          </section>
          <MasterTable
            title="Clientes"
            headers={["Documento", "Nome", "Contato", "Endereco", "Limite"]}
            rows={customers.map((customer) => [
              customer.document ?? "",
              customer.name,
              customer.contacts ?? "",
              customer.address ?? "",
              Number(customer.creditLimit ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
            ])}
          />
        </div>
      )}
    </div>
  );
}

function MasterTable({ title, headers, rows }: { title: string; headers: string[]; rows: Array<Array<string | number>> }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      <table>
        <thead>
          <tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
