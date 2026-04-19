import { Link, Outlet, useLocation } from "react-router-dom";

const sections = [
  { label: "Dashboard", to: "/" },
  { label: "Empresas", to: "/empresas" },
  { label: "Colaboradores", to: "/colaboradores" },
  { label: "Documentos", to: "/documentos" },
  { label: "Grupos empresas - LM", to: "/grupos-lm" },
  { label: "Registros de empresas", to: "/registros-empresas" },
  { label: "Grupos empresas - TP", to: "/grupos-tp" },
  { label: "Gestiones - TP", to: "/gestiones-tp" }
];

export default function Layout() {
  const location = useLocation();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <img src="/finanfix-logo.png" alt="Finanfix" className="logo" />
          <div>
            <h1>OperaFix</h1>
            <p>CRM Operativo</p>
          </div>
        </div>

        <nav className="nav-list">
          {sections.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={location.pathname === item.to ? "nav-item active" : "nav-item"}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <span className="eyebrow">Finanfix Solutions SpA</span>
            <h2>OperaFix CRM</h2>
          </div>

          <div className="topbar-actions">
            <button className="primary-btn">Nuevo registro</button>
          </div>
        </header>

        <section className="content-panel">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
