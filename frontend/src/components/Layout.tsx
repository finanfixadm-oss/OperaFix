import { Link, Outlet, useLocation } from "react-router-dom";

const topSections = [
  { label: "Inicio", to: "/" },
  { label: "Módulos", to: "/jerarquia" },
  { label: "Informes", to: "/informes" },
  { label: "Análisis", to: "/analisis" },
  { label: "Mis solicitudes", to: "/mis-solicitudes" }
];

const moduleSections = [
  {
    title: "Jerarquía base",
    items: [
      { label: "Mandantes", to: "/mandantes" },
      { label: "Jerarquía", to: "/jerarquia" },
      { label: "Grupos de empresas", to: "/company-groups" },
      { label: "Empresas", to: "/empresas" }
    ]
  },
  {
    title: "Operación",
    items: [
      { label: "Documentos", to: "/documentos" },
      { label: "Grupos de empresas - LM", to: "/grupos-lm" },
      { label: "Registros de empresas", to: "/registros-empresas" },
      { label: "Colaboradores", to: "/colaboradores" },
      { label: "Grupos empresas - TP", to: "/grupos-tp" },
      { label: "Gestiones - TP", to: "/gestiones-tp" }
    ]
  }
];

export default function Layout() {
  const location = useLocation();

  return (
    <div className="app-frame">
      <header className="global-header zoho-topbar">
        <div className="global-brand">
          <img src="/finanfix-logo.png" alt="Finanfix" className="global-logo" />
          <div>
            <strong>OperaFix</strong>
            <span>CRM Operativo</span>
          </div>
        </div>

        <nav className="global-nav">
          {topSections.map((item) => {
            const active = item.to === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.to);
            return (
              <Link key={item.to} to={item.to} className={active ? "global-nav-link active" : "global-nav-link"}>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="topbar-icons">
          <span>⌕</span>
          <span>＋</span>
          <span>✉</span>
          <span>⚙</span>
        </div>
      </header>

      <div className="app-shell zoho-shell">
        <aside className="sidebar zoho-sidebar">
          <div className="workspace-switcher">Espacio de equipo de CRM</div>
          <input className="sidebar-search" placeholder="Buscar" />

          <div className="sidebar-group compact">
            <div className="sidebar-group-title">Cola de trabajo ✨</div>
          </div>

          {moduleSections.map((group) => (
            <div key={group.title} className="sidebar-group">
              <h3>{group.title}</h3>
              <nav className="nav-list">
                {group.items.map((item) => {
                  const active = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
                  return (
                    <Link key={item.to} to={item.to} className={active ? "nav-item active" : "nav-item"}>
                      {item.label}
                    </Link>
                  );
                })}
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
