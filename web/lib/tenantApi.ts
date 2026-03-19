// Tenant-specific API client — uses domely_tenant_token, redirects to /portail/login on 401
const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

async function tenantFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("domely_tenant_token") : null;

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });

  if (res.status === 401) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("domely_tenant_token");
      localStorage.removeItem("domely_tenant_user");
      window.location.href = "/portail/login";
    }
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const b = await res.json().catch(() => ({}));
    throw new Error((b as { detail?: string }).detail ?? `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

const body = (data: unknown) => ({ body: JSON.stringify(data) });

// ─── Auth ───────────────────────────────────────────────────────────────────
export function tenantRequestCode(email: string) {
  return fetch(`${BASE}/auth/tenant/request-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  }).then(async res => {
    if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error((b as any).detail ?? `HTTP ${res.status}`); }
    return res.json();
  });
}

export function tenantVerifyCode(email: string, code: string) {
  return fetch(`${BASE}/auth/tenant/verify-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code }),
  }).then(async res => {
    if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error((b as any).detail ?? `HTTP ${res.status}`); }
    return res.json() as Promise<{ access_token: string; tenant: Record<string, unknown> }>;
  });
}

// ─── Tenant helpers ──────────────────────────────────────────────────────────
export function getTenantToken() {
  return typeof window !== "undefined" ? localStorage.getItem("domely_tenant_token") : null;
}

export function getTenantUser() {
  try { return JSON.parse(localStorage.getItem("domely_tenant_user") ?? "null"); } catch { return null; }
}

export function tenantLogout() {
  localStorage.removeItem("domely_tenant_token");
  localStorage.removeItem("domely_tenant_user");
  window.location.href = "/portail/login";
}

export function requireTenantAuth(): boolean {
  if (typeof window === "undefined") return true;
  if (!getTenantToken()) { window.location.href = "/portail/login"; return false; }
  return true;
}

// ─── API calls ───────────────────────────────────────────────────────────────
export const tenantApi = {
  getProfile:          () => tenantFetch<any>("/tenant/profile"),
  getPayments:         () => tenantFetch<any[]>("/tenant/payments"),
  getMaintenance:      () => tenantFetch<any[]>("/tenant/maintenance"),
  createMaintenance:   (data: { title: string; description: string; urgency: string }) =>
    tenantFetch<any>("/tenant/maintenance", { method: "POST", ...body(data) }),
  getMessages:         () => tenantFetch<any[]>("/tenant/messages"),
  sendMessage:         (content: string) =>
    tenantFetch<any>("/tenant/messages", { method: "POST", ...body({ content }) }),
};
