import { useEffect, useState } from "react";
import KpiCard from "../components/KpiCard";

// 1. Definimos la estructura de los datos para que TypeScript no dé error
interface KpiOverview {
  totalRecords: number;
  paidRecords: number;
  pendingCC: number;
  pendingPower: number;
  totalRefund: number;
  totalFinanfix: number;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-CL", { 
    style: "currency", 
    currency: "CLP", 
    maximumFractionDigits: 0 
  }).format(value || 0);

export default function HomePage() {
  // 2. Usamos la interfaz aquí
  const [overview, setOverview] = useState<KpiOverview | null>(null);

  // NOTA: Aquí deberías tener un useEffect que llame a tu API para llenar 'overview'
  // Si no tienes la llamada a la API todavía, el panel mostrará los guiones "-"

  return (
    <div className="page-stack">
      <div className="hero-banner">
        <div>
          <span className="eyebrow">Panel principal</span>
          <h3>OperaFix empieza a comportarse como un CRM operativo real</h3>
          <p>
            Ahora tienes una base para operar como Zoho: módulos, tablas, filtros, vista de detalle,
            documentos, notas, actividad e informes para el seguimiento de LM y TP.
          </p>
        </div>
      </div>

      <div className="kpi-grid">
        <KpiCard 
          title="Registros LM" 
          value={overview ? String(overview.totalRecords) : "-"} 
          hint="Operación total" 
        />
        <KpiCard 
          title="Pagados" 
          value={overview ? String(overview.paidRecords) : "-"} 
          hint="Estado Gestión = Pagado" 
        />
        <KpiCard 
          title="Pendientes CC" 
          value={overview ? String(overview.pendingCC) : "-"} 
          hint="Sin confirmación CC" 
        />
        <KpiCard 
          title="Pendientes Poder" 
          value={overview ? String(overview.pendingPower) : "-"} 
          hint="Sin confirmación poder" 
        />
        <KpiCard 
          title="Monto devolución" 
          value={formatCurrency(overview?.totalRefund ?? 0)} 
          hint="Suma total" 
        />
        <KpiCard 
          title="Monto Finanfix" 
          value={formatCurrency(overview?.totalFinanfix ?? 0)} 
          hint="Ganancia acumulada" 
        />
      </div>
    </div>
  );
}
