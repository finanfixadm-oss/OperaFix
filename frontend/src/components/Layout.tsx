import type { PropsWithChildren } from "react";
import { NavLink } from "react-router-dom";

export default function Layout({ children }: PropsWithChildren) {
  return (
    <div className="crm-shell">
      <header className="crm-topbar">
        <div className="crm-topbar-left">
          <div className="crm-brand">OperaFix</div>
          <nav className="crm-main-nav">
            <NavLink to="/">Inicio</NavLink>
            <NavLink to="/company-groups">Módulos</NavLink>
            <NavLink to="/reports">Informes</NavLink>
            <NavLink to="/analysis">Análisis</NavLink>
            <NavLink to="/documents">Mis solicitudes</NavLink>
          </nav>
        </div>
      </header>

      <div className="crm-body">
        <aside className="crm-sidebar">
          <div className="crm-sidebar-search">
            <input className="zoho-input" placeholder="Buscar" />
          </div>

          <nav className="crm-side-nav">
            <NavLink to="/mandantes">Mandantes</NavLink>
            <NavLink to="/company-groups">Grupos de empresas</NavLink>
            <NavLink to="/companies">Empresas</NavLink>
            <NavLink to="/management-lines">Líneas LM / TP</NavLink>
            <NavLink to="/documents">Documentos</NavLink>
            <NavLink to="/jerarquia">Jerarquía</NavLink>
          </nav>
        </aside>

        <main className="crm-content">{children}</main>
      </div>
    </div>
  );
}