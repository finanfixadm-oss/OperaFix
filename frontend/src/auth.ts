export type UserRole = "admin" | "interno" | "kam" | "cliente";

export type CurrentUser = {
  id: string;
  email: string;
  full_name?: string;
  role: UserRole | string;
  mandante_id?: string | null;
  mandante_name?: string | null;
};

export const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  interno: "Equipo interno",
  kam: "KAM",
  cliente: "Cliente / Mandante",
};

export const MODULE_PERMISSIONS: Record<string, UserRole[]> = {
  dashboard: ["admin", "interno", "kam"],
  records: ["admin", "interno", "kam"],
  portal: ["admin", "interno", "kam", "cliente"],
  ia: ["admin", "interno", "kam"],
  informes: ["admin", "interno", "kam", "cliente"],
  cargaMasiva: ["admin", "interno"],
  usuarios: ["admin", "interno"],
  mandantes: ["admin", "interno"],
};

export function getCurrentUser(): CurrentUser | null {
  try {
    return JSON.parse(localStorage.getItem("user") || "null") as CurrentUser | null;
  } catch {
    return null;
  }
}

export function hasRole(user: CurrentUser | null, roles: UserRole[]) {
  if (!user) return false;
  return roles.includes(String(user.role || "") as UserRole);
}

export function canAccess(module: keyof typeof MODULE_PERMISSIONS, user = getCurrentUser()) {
  return hasRole(user, MODULE_PERMISSIONS[module]);
}

export function defaultPathForUser(user: CurrentUser | null) {
  if (!user) return "/login";
  if (String(user.role).toLowerCase() === "cliente") return "/portal-cliente";
  return "/dashboard";
}
