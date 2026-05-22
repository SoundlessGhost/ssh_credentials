// Auth API helpers. Cookies travel automatically thanks to credentials:include.

import { api } from "@/lib/api/client";

export type AuthUser = {
  id: string;
  email: string;
  email_verified_at: string | null;
  is_admin: boolean;
  created_at: string;
};

export type AuthResponse = { user: AuthUser };

export function signup(email: string, password: string) {
  return api<AuthResponse>("/auth/signup", {
    method: "POST",
    json: { email, password },
  });
}

export function login(email: string, password: string) {
  return api<AuthResponse>("/auth/login", {
    method: "POST",
    json: { email, password },
  });
}

export function logout() {
  return api<null>("/auth/logout", { method: "POST" });
}

export function refresh() {
  return api<AuthResponse>("/auth/refresh", { method: "POST" });
}

export function me() {
  return api<AuthUser>("/auth/me");
}

export function changePassword(
  old_password: string,
  new_password: string,
) {
  return api<null>("/auth/change-password", {
    method: "POST",
    json: { old_password, new_password },
  });
}

export function logoutAll() {
  return api<null>("/auth/logout-all", { method: "POST" });
}
