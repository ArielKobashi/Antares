import { Building2, Lock, Mail } from "lucide-react";
import { FormEvent, useState } from "react";
import { setSession, type Session } from "../api/client";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3333/api/v1";

export function Login({ onLogin }: { onLogin: (session: Session) => void }) {
  const [email, setEmail] = useState("admin@antares.local");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    await login(email, password);
  }

  async function login(loginEmail: string, loginPassword: string) {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? "Falha ao entrar.");
      setSession(payload);
      onLogin(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-screen">
      <form className="login-panel" onSubmit={submit}>
        <div className="brand large">
          <div className="brand-mark">A</div>
          <div>
            <strong>ANTARES</strong>
            <span>ERP</span>
          </div>
        </div>
        <label>
          <span>Email</span>
          <div className="input-icon">
            <Mail size={17} />
            <input value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
        </label>
        <label>
          <span>Senha</span>
          <div className="input-icon">
            <Lock size={17} />
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </div>
        </label>
        <div className="demo-company">
          <Building2 size={16} />
          <span>Empresa Demonstracao</span>
        </div>
        {error ? <p className="error">{error}</p> : null}
        <button className="primary" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
        <button
          type="button"
          className="secondary"
          disabled={loading}
          onClick={() => login("admin@antares.local", "admin123")}
        >
          Entrar com demo
        </button>
      </form>
    </div>
  );
}
