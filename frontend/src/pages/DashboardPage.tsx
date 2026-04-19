import KpiCard from "../components/KpiCard";

export default function DashboardPage() {
  return (
    <div>
      <div className="hero-banner">
        <div>
          <span className="eyebrow">Panel principal</span>
          <h3>OperaFix con identidad Finanfix</h3>
          <p>
            CRM operativo para gestionar empresas, colaboradores, documentos, licencias médicas
            y trabajo pesado en una sola plataforma.
          </p>
        </div>
      </div>

      <div className="kpi-grid">
        <KpiCard title="Registros LM" value="1.536" hint="Control operativo central" />
        <KpiCard title="Colaboradores" value="37" hint="Contactos por empresa" />
        <KpiCard title="Documentos" value="2" hint="Repositorio inicial" />
        <KpiCard title="Entidades activas" value="2" hint="AFP Capital y AFP Modelo" />
      </div>
    </div>
  );
}
