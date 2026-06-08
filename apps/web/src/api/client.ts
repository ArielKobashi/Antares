export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3333/api/v1";

export type Session = {
  accessToken: string;
  refreshToken: string;
  user: { id: string; name: string; email: string };
  company: { id: string; name: string };
  permissions: string[];
};

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const session = getSession();
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(session ? { Authorization: `Bearer ${session.accessToken}` } : {}),
      ...options.headers
    }
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    if (response.status === 401) {
      clearSession();
      window.dispatchEvent(new Event("antares:session-expired"));
    }
    throw new Error(payload?.error?.message ?? "Erro na API.");
  }

  return response.json() as Promise<T>;
}

export function getSession(): Session | null {
  const raw = localStorage.getItem("antares.session");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    clearSession();
    return null;
  }
}

export function setSession(session: Session) {
  localStorage.setItem("antares.session", JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem("antares.session");
}
