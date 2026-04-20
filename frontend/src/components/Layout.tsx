import { Link, NavLink, Outlet, useLocation } from "react-router-dom";

const topNav = [
  { label: "Inicio", to: "/" },
  { label: "Módulos", to: "/registros-empresas" },
  { label: "Informes", to: "/informes" },
  { label: "Análisis", to: "/analisis" },
  { label: "Mis solicitudes", to: "/solicitudes" }
];

const sections = [
  {
    title: "Datos",
    items: [
      { label: "Empresas", to: "/empresas" },
      { label: "Documentos", to: "/documentos" },
      { label: "Colaboradores", to: "/colaboradores" }
    ]
  },
  {
    title: "Gestiones LM - TP",
    items: [
      { label: "Registros de empresas", to: "/registros-empresas" },
      { label: "Grupos empresas - LM", to: "/grupos-lm" }
    ]
  },
  {
    title: "Trabajo Pesado",
    items: [
      { label: "Gestiones - TP", to: "/gestiones-tp" },
      { label: "Grupos empresas - TP", to: "/grupos-tp" }
    ]
  }
];

export default function Layout() {
  const location = useLocation();
  const currentTopNav = topNav.find((item) =>
    item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to)
  );

  return (
    <div className="operafix-shell">
      <header className="main-banner">
        <div className="banner-left">
          <img src="/finanfix-logo.png" alt="Finanfix" className="banner-logo" />
          <span className="workspace-chip">OperaFix CRM</span>
        </div>
        <nav className="top-navigation">
          {topNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                isActive || (item.to !== "/" && location.pathname.startsWith(item.to))
                  ? "top-link active"
                  : "top-link"
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <div className="app-shell">
        <aside className="sidebar">
          <div className="brand-block compact">
            <div>
              <h1>Gestiones LM y TP</h1>
              <p>Espacio de trabajo Finanfix</p>
            </div>
          </div>

          <div className="sidebar-search">
            <input placeholder="Buscar" />
          </div>

          <div className="sidebar-groups">
            {sections.map((section) => (
              <div key={section.title} className="sidebar-section">
                <h4>{section.title}</h4>
                <div className="nav-list">
                  {section.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </aside>

        <main className="main-content">
          <div className="section-head">
            <div>
              <span className="eyebrow">Finanfix Solutions SpA</span>
              <h2>{currentTopNav?.label || "OperaFix"}</h2>
            </div>
            <div className="section-head-actions">
              <Link className="ghost-btn" to="/analisis">
                Ver análisis
              </Link>
              <Link className="primary-btn" to="/registros-empresas">
                Abrir operación
              </Link>
            </div>
          </div>
          <section className="content-panel">
            <Outlet />
          </section>
        </main>
      </div>
    </div>
  );
}
