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
  { to: "/mandantes", label: "Mandantes", module: "mandantes" as const, side: "Mandantes" },
];

export default function Layout({ children }: PropsWithChildren) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getCurrentUser();
  const visibleItems = navItems.filter((item) => canAccess(item.module, user));
  const isLogin = location.pathname === "/login";

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
          <button className="crm-brand" type="button" onClick={() => navigate(defaultPathForUser(user))}>OperaFix</button>
          <nav className="crm-main-nav">
            {visibleItems.map((item) => <NavLink key={item.to} to={item.to}>{item.label}</NavLink>)}
          </nav>
        </div>
        <div className="crm-user-box">
          {user ? (
            <>
              <span>{user.full_name || user.email}</span>
              <span className="role-chip">{ROLE_LABELS[String(user.role)] || user.role}</span>
              {user.mandante_name && <span className="role-chip soft">{user.mandante_name}</span>}
              <button className="zoho-btn subtle" onClick={logout}>Salir</button>
            </>
          ) : (
            <NavLink to="/login">Ingresar</NavLink>
          )}
        </div>
      </header>

      <div className="crm-body">
        <aside className="crm-sidebar">
          <div className="crm-sidebar-search">
            <input className="zoho-input" placeholder="Buscar" />
          </div>

          <nav className="crm-side-nav">
            {visibleItems.map((item) => <NavLink key={item.to} to={item.to}>{item.side}</NavLink>)}
          </nav>
        </aside>

        <main className="crm-content">{children}</main>
      </div>
    </div>
  );
}
