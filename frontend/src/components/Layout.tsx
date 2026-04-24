import type { PropsWithChildren } from "react";
import { NavLink } from "react-router-dom";

export default function Layout({ children }: PropsWithChildren) {
  return (
    <div className="crm-shell">
      <header className="crm-topbar">
        <div className="crm-topbar-left">
          <div className="crm-brand">OperaFix</div>
          <nav className="crm-main-nav">
            <NavLink to="/records">Inicio</NavLink>
            <NavLink to="/records">Registros de empresas</NavLink>
          </nav>
        </div>
      </header>

      <div className="crm-body">
        <aside className="crm-sidebar">
          <div className="crm-sidebar-search">
            <input className="zoho-input" placeholder="Buscar" />
          </div>

          <nav className="crm-side-nav">
            <NavLink to="/records">Registros de empresas</NavLink>
          </nav>
        </aside>

        <main className="crm-content">{children}</main>
      </div>
    </div>
  );
}
