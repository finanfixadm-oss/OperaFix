import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchJson } from "../api";
import type { RecordItem } from "../types-records";

function money(value: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(value || 0);
}

function numberValue(value: unknown) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function keyText(value: unknown, fallback = "Sin información") {
  const text = String(value || "").trim();
  return text || fallback;
}

function groupSum(rows: RecordItem[], keyGetter: (row: RecordItem) => string, amountGetter: (row: RecordItem) => number) {
  const map = new Map<string, { name: string; count: number; amount: number }>();
  rows.forEach((row) => {
    const name = keyGetter(row);
    const current = map.get(name) || { name, count: 0, amount: 0 };
    current.count += 1;
    current.amount += amountGetter(row);
    map.set(name, current);
  });
  return Array.from(map.values()).sort((a, b) => b.amount - a.amount || b.count - a.count);
}

export default function DashboardExecutivePage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [mandante, setMandante] = useState("todos");

  async function load() {
    setLoading(true);
    try {
      setRows(await fetchJson<RecordItem[]>("/records"));
    } catch (error) {
      console.error(error);
      alert("No se pudo cargar el dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const mandantes = useMemo(() => Array.from(new Set(rows.map((row) => keyText(row.mandante?.name || (row as any).mandante, "Sin mandante")))).sort(), [rows]);
  const data = useMemo(() => mandante === "todos" ? rows : rows.filter((row) => keyText(row.mandante?.name || (row as any).mandante, "Sin mandante") === mandante), [rows, mandante]);

  const totalDevolucion = data.reduce((sum, row) => sum + numberValue(row.monto_devolucion), 0);
  const totalFinanfix = data.reduce((sum, row) => sum + numberValue(row.monto_real_finanfix_solutions || row.monto_finanfix_solutions), 0);
  const totalCliente = data.reduce((sum, row) => sum + numberValue(row.monto_real_cliente || row.monto_cliente), 0);
  const pendientes = data.filter((row) => !/cerrada|pagada|facturada/i.test(String(row.estado_gestion || ""))).length;
  const pagadas = data.filter((row) => /pagada|pago|facturada|cerrada/i.test(String(row.estado_gestion || ""))).length;
  const rechazadas = data.filter((row) => /rechaz/i.test(String(row.estado_gestion || ""))).length;

  const byMandante = groupSum(data, (row) => keyText(row.mandante?.name || (row as any).mandante, "Sin mandante"), (row) => numberValue(row.monto_devolucion));
  const byEntidad = groupSum(data, (row) => keyText(row.entidad || row.lineAfp?.afp_name, "Sin AFP"), (row) => numberValue(row.monto_devolucion));
  const byEstado = groupSum(data, (row) => keyText(row.estado_gestion, "Sin estado"), (row) => numberValue(row.monto_devolucion));
  const recent = [...data].sort((a, b) => String(b.updated_at || b.created_at || "").localeCompare(String(a.updated_at || a.created_at || ""))).slice(0, 12);

  return (
    <div className="zoho-module-page dashboard-page">
      <div className="zoho-module-header">
        <div>
          <h1>Dashboard ejecutivo</h1>
          <p>Control de recuperación por mandante, AFP, estado y montos.</p>
        </div>
        <div className="zoho-module-actions">
          <select className="zoho-select" value={mandante} onChange={(e) => setMandante(e.target.value)}>
            <option value="todos">Todos los mandantes</option>
            {mandantes.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
          <button className="zoho-btn" onClick={load}>Actualizar</button>
        </div>
      </div>

      {loading ? <div className="zoho-empty">Cargando dashboard...</div> : (
        <>
          <section className="dashboard-kpi-grid">
            <Kpi title="Total devolución" value={money(totalDevolucion)} helper="Monto total estimado/gestionado" />
            <Kpi title="Finanfix" value={money(totalFinanfix)} helper="Monto real/estimado Finanfix" />
            <Kpi title="Cliente" value={money(totalCliente)} helper="Monto real/estimado cliente" />
            <Kpi title="Pendientes" value={String(pendientes)} helper="Gestiones abiertas" />
            <Kpi title="Pagadas/Cerradas" value={String(pagadas)} helper="Gestiones con cierre positivo" />
            <Kpi title="Rechazadas" value={String(rechazadas)} helper="Gestiones rechazadas" />
          </section>

          <section className="dashboard-grid-3">
            <Ranking title="Monto por mandante" rows={byMandante.slice(0, 8)} />
            <Ranking title="Monto por AFP / entidad" rows={byEntidad.slice(0, 8)} />
            <Ranking title="Estados de gestión" rows={byEstado.slice(0, 8)} />
          </section>

          <section className="zoho-card">
            <div className="zoho-card-title-row"><h2>Últimas gestiones actualizadas</h2></div>
            <table className="zoho-table compact">
              <thead><tr><th>Mandante</th><th>Razón Social</th><th>RUT</th><th>AFP</th><th>Estado</th><th>Monto</th></tr></thead>
              <tbody>
                {recent.map((row) => (
                  <tr key={row.id} onClick={() => navigate(`/records/${row.id}`)} className="clickable-row">
                    <td>{row.mandante?.name || "—"}</td>
                    <td>{row.razon_social || row.company?.razon_social || "—"}</td>
                    <td>{row.rut || row.company?.rut || "—"}</td>
                    <td>{row.entidad || row.lineAfp?.afp_name || "—"}</td>
                    <td><span className="status-pill">{row.estado_gestion || "—"}</span></td>
                    <td>{money(numberValue(row.monto_devolucion))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}

function Kpi({ title, value, helper }: { title: string; value: string; helper: string }) {
  return <div className="dashboard-kpi"><span>{title}</span><strong>{value}</strong><small>{helper}</small></div>;
}

function Ranking({ title, rows }: { title: string; rows: { name: string; count: number; amount: number }[] }) {
  const max = Math.max(...rows.map((row) => row.amount), 1);
  return (
    <div className="zoho-card ranking-card">
      <div className="zoho-card-title-row"><h2>{title}</h2></div>
      {rows.length === 0 ? <div className="zoho-empty small">Sin datos</div> : rows.map((row) => (
        <div className="ranking-row" key={row.name}>
          <div className="ranking-head"><strong>{row.name}</strong><span>{money(row.amount)} · {row.count}</span></div>
          <div className="ranking-bar"><div style={{ width: `${Math.max(6, (row.amount / max) * 100)}%` }} /></div>
        </div>
      ))}
    </div>
  );
}
