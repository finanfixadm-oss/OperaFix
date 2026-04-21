import { Link, Outlet, useLocation } from "react-router-dom";

const topSections = [
  { label: "Inicio", to: "/" },
  { label: "Módulos", to: "/registros-empresas" },
  { label: "Informes", to: "/documentos" },
  { label: "Análisis", to: "/grupos-lm" },
  { label: "Mis solicitudes", to: "/gestiones-tp" }
];

const moduleSections = [
  { title: "Datos", items: [
    { label: "Empresas", to: "/empresas" },
    { label: "Documentos", to: "/documentos" },
    { label: "Colaboradores", to: "/colaboradores" }
  ] },
  { title: "Gestiones LM - TP", items: [
    { label: "Registros de empresas", to: "/registros-empresas" },
    { label: "Grupos de empresas - LM", to: "/grupos-lm" }
  ] },
  { title: "Trabajo Pesado", items: [
    { label: "Gestiones - TP", to: "/gestiones-tp" },
    { label: "Grupos empresas - TP", to: "/grupos-tp" }
  ] }
];

export default function Layout() {
  const location = useLocation();

  return (
    <div className="app-frame">
      <header className="global-header">
        <div className="global-brand">
          <img src="/finanfix-logo.png" alt="Finanfix" className="global-logo" />
          <div>
            <strong>OperaFix</strong>
            <span>CRM Operativo</span>
          </div>
        </div>

        <nav className="global-nav">
          {topSections.map((item) => (
            <Link key={item.to} to={item.to} className={location.pathname === item.to ? "global-nav-link active" : "global-nav-link"}>
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <div className="app-shell">
        <aside className="sidebar">
          {moduleSections.map((group) => (
            <div key={group.title} className="sidebar-group">
              <h3>{group.title}</h3>
              <nav className="nav-list">
                {group.items.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={location.pathname === item.to ? "nav-item active" : "nav-item"}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          ))}
        </aside>

        <main className="main-content">
          <section className="content-panel">
            <Outlet />
          </section>
        </main>
      </div>
    </div>
  );
}
