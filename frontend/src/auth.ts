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
  dashboard: ["admin", "interno", "kam_admin", "kam"],
  records: ["admin", "interno", "kam_admin", "kam"],
  portal: ["admin", "interno", "kam_admin", "kam", "cliente"],
  ia: ["admin", "interno", "kam_admin", "kam"],
  informes: ["admin", "interno", "kam_admin", "kam", "cliente"],
  cargaMasiva: ["admin", "interno", "kam_admin", "kam"],
  usuarios: ["admin", "kam_admin"],
  kamAsignacion: ["admin", "interno", "kam_admin", "kam"],
  mandantes: ["admin", "interno", "kam_admin", "kam"],
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
