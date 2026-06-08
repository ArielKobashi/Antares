import { Building2, History, Plus, ShieldCheck, Users } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";

type Company = {
  id: string;
  name: string;
  document?: string;
  active: boolean;
};

type User = {
  id: string;
  name: string;
  email: string;
  status: string;
  createdAt: string;
  role?: { id: string; name: string } | null;
};

type Permission = {
  id: string;
  code: string;
  module: string;
  action: string;
  description?: string;
};

type Role = {
  id: string;
  name: string;
  permissions: Permission[];
};

type AuditLog = {
  id: string;
  operation: string;
  entity: string;
  entityId?: string;
  ip?: string;
  oldValues?: unknown;
  newValues?: unknown;
  createdAt: string;
  user?: { id: string; name: string; email: string } | null;
};

export function Administration() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [userForm, setUserForm] = useState({ name: "", email: "", password: "admin123", roleId: "" });
  const [roleForm, setRoleForm] = useState({ name: "", permissionCodes: ["dashboard:view", "estoque:view", "relatorios:view"] });

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    const [companyRows, userRows, roleRows, permissionRows, auditRows] = await Promise.all([
      api<Company[]>("/companies"),
      api<User[]>("/users"),
      api<Role[]>("/users/roles"),
      api<Permission[]>("/users/permissions"),
      api<AuditLog[]>("/audit/logs?limit=30")
    ]);
    setCompanies(companyRows);
    setUsers(userRows);
    setRoles(roleRows);
    setPermissions(permissionRows);
    setAuditLogs(auditRows);
    setUserForm((current) => ({ ...current, roleId: current.roleId || roleRows[0]?.id || "" }));
  }

  const groupedPermissions = useMemo(() => {
    return permissions.reduce<Record<string, Permission[]>>((groups, permission) => {
      groups[permission.module] = [...(groups[permission.module] ?? []), permission];
      return groups;
    }, {});
  }, [permissions]);

  async function createUser(event: FormEvent) {
    event.preventDefault();
    await api("/users", { method: "POST", body: JSON.stringify(userForm) });
    setUserForm({ name: "", email: "", password: "admin123", roleId: roles[0]?.id || "" });
    await load();
  }

  async function createRole(event: FormEvent) {
    event.preventDefault();
    await api("/users/roles", { method: "POST", body: JSON.stringify(roleForm) });
    setRoleForm({ name: "", permissionCodes: ["dashboard:view", "estoque:view", "relatorios:view"] });
    await load();
  }

  function togglePermission(code: string) {
    setRoleForm((current) => ({
      ...current,
      permissionCodes: current.permissionCodes.includes(code)
        ? current.permissionCodes.filter((item) => item !== code)
        : [...current.permissionCodes, code]
    }));
  }

  return (
    <div className="stack">
      <div className="two-column">
        <section className="panel">
          <div className="panel-title">
            <Plus size={18} />
            <h2>Novo usuario</h2>
          </div>
          <form className="form-grid compact" onSubmit={createUser}>
            <label>Nome<input value={userForm.name} onChange={(event) => setUserForm({ ...userForm, name: event.target.value })} required /></label>
            <label>Email<input type="email" value={userForm.email} onChange={(event) => setUserForm({ ...userForm, email: event.target.value })} required /></label>
            <label>Senha<input type="password" value={userForm.password} onChange={(event) => setUserForm({ ...userForm, password: event.target.value })} required /></label>
            <label>Papel<select value={userForm.roleId} onChange={(event) => setUserForm({ ...userForm, roleId: event.target.value })}>{roles.map((role) => <option value={role.id} key={role.id}>{role.name}</option>)}</select></label>
            <button className="primary">Criar usuario</button>
          </form>
        </section>
        <section className="panel">
          <div className="panel-title">
            <ShieldCheck size={18} />
            <h2>Novo papel</h2>
          </div>
          <form className="form-grid" onSubmit={createRole}>
            <label>Nome<input value={roleForm.name} onChange={(event) => setRoleForm({ ...roleForm, name: event.target.value })} required /></label>
            <div className="permission-grid">
              {Object.entries(groupedPermissions).map(([module, modulePermissions]) => (
                <fieldset key={module}>
                  <legend>{module}</legend>
                  {modulePermissions.map((permission) => (
                    <label className="check-row" key={permission.id}>
                      <input type="checkbox" checked={roleForm.permissionCodes.includes(permission.code)} onChange={() => togglePermission(permission.code)} />
                      <span>{permission.action}</span>
                    </label>
                  ))}
                </fieldset>
              ))}
            </div>
            <button className="primary">Criar papel</button>
          </form>
        </section>
      </div>

      <div className="two-column">
        <section className="panel">
          <div className="panel-title">
            <Building2 size={18} />
            <h2>Empresas</h2>
            <button className="secondary" onClick={load}>Atualizar</button>
          </div>
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Documento</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((company) => (
                <tr key={company.id}>
                  <td>{company.name}</td>
                  <td>{company.document ?? ""}</td>
                  <td><span className="status">{company.active ? "ACTIVE" : "INACTIVE"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="panel">
          <div className="panel-title">
            <Users size={18} />
            <h2>Usuarios</h2>
          </div>
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email</th>
                <th>Papel</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.role?.name ?? ""}</td>
                  <td><span className="status">{user.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <section className="panel">
        <div className="panel-title">
          <ShieldCheck size={18} />
          <h2>Papeis e permissoes</h2>
        </div>
        <table>
          <thead>
            <tr>
              <th>Papel</th>
              <th>Permissoes</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((role) => (
              <tr key={role.id}>
                <td>{role.name}</td>
                <td>
                  <div className="tag-list">
                    {role.permissions.map((permission) => <span key={permission.id}>{permission.code}</span>)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <div className="panel-title">
          <History size={18} />
          <h2>Auditoria recente</h2>
          <button className="secondary" onClick={load}>Atualizar</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Usuario</th>
              <th>Operacao</th>
              <th>Entidade</th>
              <th>IP</th>
              <th>Resumo</th>
            </tr>
          </thead>
          <tbody>
            {auditLogs.map((log) => (
              <tr key={log.id}>
                <td>{new Date(log.createdAt).toLocaleString("pt-BR")}</td>
                <td>{log.user?.name ?? ""}</td>
                <td><span className="status">{log.operation}</span></td>
                <td>{log.entity}</td>
                <td>{log.ip ?? ""}</td>
                <td><span className="audit-summary">{summarizeAudit(log.newValues)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function summarizeAudit(value: unknown) {
  if (!value || typeof value !== "object") return "";
  const record = value as Record<string, unknown>;
  const preferred = [record.name, record.email, record.status, record.type, record.reason, record.operation]
    .filter((item): item is string => typeof item === "string" && item.length > 0);
  if (preferred.length > 0) return preferred.slice(0, 2).join(" - ");
  const keys = Object.keys(record).slice(0, 3);
  return keys.join(", ");
}
