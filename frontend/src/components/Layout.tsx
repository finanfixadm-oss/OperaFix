import type { PropsWithChildren } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { canAccess, defaultPathForUser, getCurrentUser, ROLE_LABELS } from "../auth";

const navItems = [
  { to: "/dashboard", label: "Dashboard", module: "dashboard" as const, side: "Dashboard ejecutivo" },
  { to: "/records", label: "Registros", module: "records" as const, side: "Registros de empresas" },
  { to: "/portal-cliente", label: "Portal cliente", module: "portal" as const, side: "Portal cliente" },
  { to: "/ia-gestiones", label: "IA gestiones", module: "ia" as const, side: "IA para gestiones" },
  { to: "/informes", label: "Informes", module: "informes" as const, side: "Informes Excel" },
  { to: "/carga-masiva", label: "Carga masiva", module: "cargaMasiva" as const, side: "Carga masiva inteligente" },
  { to: "/usuarios", label: "Usuarios", module: "usuarios" as const, side: "Control de usuarios" },
  { to: "/kam-asignacion", label: "KAM", module: "kamAsignacion" as const, side: "Asignación KAM" },
  { to: "/mandantes", label: "Mandantes", module: "mandantes" as const, side: "Mandantes" },
];

export default function Layout({ children }: PropsWithChildren) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getCurrentUser();
  const visibleItems = navItems.filter((item) => canAccess(item.module, user));
  const generalItems = visibleItems.filter((item) => item.module !== "kamAsignacion");
  const showKamMenu = visibleItems.some((item) => item.module === "kamAsignacion");
  const isLogin = location.pathname === "/login";
  const currentKamTab = new URLSearchParams(location.search).get("tab") || "tracking";
  const kamTabClass = (value: string) => location.pathname === "/kam-asignacion" && currentKamTab === value ? "active" : "";

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  if (isLogin) return <>{children}</>;

  return (
    <div className="crm-shell">
      <header className="crm-topbar">
        <div className="crm-topbar-left">
          <button className="crm-brand crm-brand-pro" type="button" onClick={() => navigate(defaultPathForUser(user))}><img src="/operafix-icon-white.png" alt="OperaFix" /><span>OperaFix</span></button>
          <nav className="crm-main-nav">
            {visibleItems.map((item) => <NavLink key={item.to} to={item.to}>{item.label}</NavLink>)}
          </nav>
        </div>
        <div className="crm-user-box">
          {user ? (
            <>
              <span>{user.full_name || user.email}</span>
              <span className="role-chip">{ROLE_LABELS[String(user.role)] || user.role}</span>
              {Array.isArray(user.assigned_mandante_names) && user.assigned_mandante_names.length > 0 ? (
                <span className="role-chip soft">{user.assigned_mandante_names.length === 1 ? user.assigned_mandante_names[0] : `${user.assigned_mandante_names.length} mandantes`}</span>
              ) : user.mandante_name ? (
                <span className="role-chip soft">{user.mandante_name}</span>
              ) : null}
              <button className="zoho-btn subtle" onClick={logout}>Salir</button>
            </>
          ) : (
            <NavLink to="/login">Ingresar</NavLink>
          )}
        </div>
      </header>

      <div className="crm-body">
        <aside className="crm-sidebar">
          <div className="crm-sidebar-logo"><img src="/operafix-icon-color.png" alt="OperaFix" /><div><strong>OperaFix CRM</strong><span>Gestión comercial</span></div></div>
          <div className="crm-sidebar-search">
            <input className="zoho-input" placeholder="Buscar módulo" />
          </div>

          <nav className="crm-side-nav crm-side-nav-pro">
            {generalItems.map((item) => <NavLink key={item.to} to={item.to}>{item.side}</NavLink>)}
            {showKamMenu && (
              <details className="crm-sidebar-group" open>
                <summary>Comercial KAM</summary>
                <NavLink to="/kam-asignacion?tab=tracking" className={() => kamTabClass("tracking")}>Dashboard KAM</NavLink>
                <NavLink to="/kam-asignacion?tab=companies" className={() => kamTabClass("companies")}>Empresas</NavLink>
                <NavLink to="/kam-asignacion?tab=kanban" className={() => kamTabClass("kanban")}>Kanban</NavLink>
                <NavLink to="/kam-asignacion?tab=agenda" className={() => kamTabClass("agenda")}>Agenda</NavLink>
              </details>
            )}
            {showKamMenu && (
              <details className="crm-sidebar-group" open>
                <summary>Análisis KAM</summary>
                <NavLink to="/kam-asignacion?tab=campaigns" className={() => kamTabClass("campaigns")}>Campañas / Excel</NavLink>
                <NavLink to="/kam-asignacion?tab=profiles" className={() => kamTabClass("profiles")}>Ranking KAM</NavLink>
              </details>
            )}
            {showKamMenu && (
              <details className="crm-sidebar-group">
                <summary>Configuración KAM</summary>
                <NavLink to="/kam-asignacion?tab=rules" className={() => kamTabClass("rules")}>Reglas</NavLink>
              </details>
            )}
          </nav>
        </aside>

        <main className="crm-content">{children}</main>
      </div>
    </div>
  );
}
