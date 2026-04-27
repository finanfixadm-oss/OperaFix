import type { PropsWithChildren } from "react";
import { NavLink } from "react-router-dom";

export default function Layout({ children }: PropsWithChildren) {
  return (
    <div className="crm-shell">
      <header className="crm-topbar">
        <div className="crm-topbar-left">
          <div className="crm-brand">OperaFix</div>
          <nav className="crm-main-nav">
            <NavLink to="/dashboard">Dashboard</NavLink>
            <NavLink to="/records">Registros</NavLink>
            <NavLink to="/portal-cliente">Portal cliente</NavLink>
            <NavLink to="/ia-gestiones">IA gestiones</NavLink>
            <NavLink to="/mandantes">Mandantes</NavLink>
          </nav>
        </div>
      </header>

      <div className="crm-body">
        <aside className="crm-sidebar">
          <div className="crm-sidebar-search">
            <input className="zoho-input" placeholder="Buscar" />
          </div>

          <nav className="crm-side-nav">
            <NavLink to="/dashboard">Dashboard ejecutivo</NavLink>
            <NavLink to="/records">Registros de empresas</NavLink>
            <NavLink to="/portal-cliente">Portal cliente</NavLink>
            <NavLink to="/ia-gestiones">IA para gestiones</NavLink>
            <NavLink to="/mandantes">Mandantes</NavLink>
          </nav>
        </aside>

        <main className="crm-content">{children}</main>
      </div>
    </div>
  );
}
