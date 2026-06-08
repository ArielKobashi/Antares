import { BarChart3, Boxes, CircleDollarSign, ClipboardList, Factory, Landmark, LogOut, Package, ScrollText, Settings, Shield, ShoppingCart, Tags, Users, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { clearSession, getSession, type Session } from "../api/client";
import { Dashboard } from "./Dashboard";
import { Cash } from "./Cash";
import { Administration } from "./Administration";
import { Finance } from "./Finance";
import { Inventory } from "./Inventory";
import { Login } from "./Login";
import { MasterData } from "./MasterData";
import { Maintenance } from "./Maintenance";
import { Products } from "./Products";
import { Purchasing } from "./Purchasing";
import { Production } from "./Production";
import { Reports } from "./Reports";
import { Sales } from "./Sales";
import { Warehouse } from "./Warehouse";

type View = "dashboard" | "products" | "master-data" | "inventory" | "purchasing" | "sales" | "cash" | "warehouse" | "production" | "maintenance" | "finance" | "reports" | "admin";

const navItems: Array<{ id: View; label: string; icon: LucideIcon }> = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "products", label: "Produtos", icon: Package },
  { id: "master-data", label: "Cadastros", icon: Users },
  { id: "inventory", label: "Estoque", icon: Boxes },
  { id: "purchasing", label: "Compras", icon: ShoppingCart },
  { id: "sales", label: "Vendas", icon: Tags },
  { id: "cash", label: "Caixa", icon: Landmark },
  { id: "warehouse", label: "Almoxarifado", icon: ClipboardList },
  { id: "production", label: "Producao", icon: Factory },
  { id: "maintenance", label: "Manutencao", icon: Wrench },
  { id: "finance", label: "Financeiro", icon: CircleDollarSign },
  { id: "reports", label: "Relatorios", icon: ScrollText },
  { id: "admin", label: "Administracao", icon: Settings }
];

export function App() {
  const [session, setSessionState] = useState<Session | null>(() => getSession());
  const [view, setView] = useState<View>("dashboard");

  useEffect(() => {
    document.title = session ? `ANTARES - ${session.company.name}` : "ANTARES ERP";
  }, [session]);

  useEffect(() => {
    const expire = () => setSessionState(null);
    window.addEventListener("antares:session-expired", expire);
    return () => window.removeEventListener("antares:session-expired", expire);
  }, []);

  const content = useMemo(() => {
    if (!session) return null;
    if (view === "dashboard") return <Dashboard />;
    if (view === "products") return <Products />;
    if (view === "master-data") return <MasterData />;
    if (view === "inventory") return <Inventory />;
    if (view === "purchasing") return <Purchasing />;
    if (view === "sales") return <Sales />;
    if (view === "cash") return <Cash />;
    if (view === "warehouse") return <Warehouse />;
    if (view === "production") return <Production />;
    if (view === "maintenance") return <Maintenance />;
    if (view === "finance") return <Finance />;
    if (view === "admin") return <Administration />;
    return <Reports />;
  }, [session, view]);

  if (!session) {
    return <Login onLogin={setSessionState} />;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">A</div>
          <div>
            <strong>ANTARES</strong>
            <span>ERP</span>
          </div>
        </div>
        <nav>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button className={view === item.id ? "active" : ""} key={item.id} onClick={() => setView(item.id)} title={item.label}>
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>
      <main className="main">
        <header className="topbar">
          <div>
            <h1>{navItems.find((item) => item.id === view)?.label}</h1>
            <span className="muted">{session.company.name}</span>
          </div>
          <div className="topbar-actions">
            <div className="user-pill">
              <Shield size={16} />
              <span>{session.user.name}</span>
            </div>
            <button
              className="icon-button"
              title="Sair"
              onClick={() => {
                clearSession();
                setSessionState(null);
              }}
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <section className="content">{content}</section>
      </main>
    </div>
  );
}
