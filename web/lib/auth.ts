export const TOKEN_KEY = "domely_token";
export const USER_KEY  = "domely_user";

export interface StoredUser {
  id: string;
  email: string;
  full_name: string;
  plan?: string;
  plan_status?: string;
  is_admin?: boolean;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch { return null; }
}

export function requireAuth(): boolean {
  const token = getToken();
  if (!token) { window.location.href = "/login"; return false; }
  return true;
}

export function logout(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.location.href = "/login";
}

export function getInitials(user: StoredUser | null): string {
  if (!user) return "?";
  if (user.full_name) {
    return user.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  }
  return (user.email?.[0] ?? "?").toUpperCase();
}
