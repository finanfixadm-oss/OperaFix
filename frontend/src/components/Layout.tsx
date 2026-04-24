import { PropsWithChildren } from "react";
import { NavLink } from "react-router-dom";

export default function Layout({ children }: PropsWithChildren) {
  return (
    <div className="crm-shell">
      <header className="crm-topbar">
        <div className="crm-brand">OperaFix</div>

        <nav>
          <NavLink to="/">Inicio</NavLink>
          <NavLink to="/records">Registros de empresas</NavLink>
        </nav>
      </header>

      <div className="crm-body">
        <aside className="crm-sidebar">
          <input placeholder="Buscar" />

          <NavLink to="/records">Registros de empresas</NavLink>
        </aside>

        <main className="crm-content">{children}</main>
      </div>
    </div>
  );
}