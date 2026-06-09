export type UserRole = "admin" | "interno" | "kam_admin" | "kam" | "cliente";

export type CurrentUser = {
  id: string;
  email: string;
  full_name?: string;
  role: UserRole | string;
  mandante_id?: string | null;
  mandante_name?: string | null;
  assigned_mandantes?: { id: string; name: string }[];
  assigned_mandante_ids?: string[];
  assigned_mandante_names?: string[];
};

export const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  interno: "Equipo interno",
  kam_admin: "KAM administrador",
  kam: "KAM vendedor",
  cliente: "Cliente / Mandante",
};

export const MODULE_PERMISSIONS: Record<string, UserRole[]> = {
  dashboard: ["admin", "interno"],
  records: ["admin", "interno"],
  portal: ["admin", "interno", "cliente"],
  ia: ["admin", "interno"],
  informes: ["admin", "interno", "cliente"],
  cargaMasiva: ["admin", "interno"],
  usuarios: ["admin", "kam_admin"],
  kamAsignacion: ["admin", "interno", "kam_admin", "kam"],
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
  const role = String(user.role || "").toLowerCase();
  if (role === "cliente") return "/portal-cliente";
  if (role === "kam" || role === "kam_admin") return "/kam-asignacion";
  return "/dashboard";
}
