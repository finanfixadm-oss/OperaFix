import { useEffect, useMemo, useState } from "react";
import { fetchCompanies } from "../api";
import type { Company } from "../types";

export default function CompaniesPage() {
  const [rows, setRows] = useState<Company[]>([]);
  const [search, setSearch] = useState("");
  const [mandante, setMandante] = useState("");

  useEffect(() => {
    fetchCompanies().then(setRows).catch(() => setRows([]));
  }, []);

  const mandantes = useMemo(() => Array.from(new Set(rows.map((r) => r.mandante).filter(Boolean))) as string[], [rows]);
  const filtered = useMemo(() => rows.filter((row) => {
    const matchesText = !search || [row.rut, row.business_name, row.email].join(" ").toLowerCase().includes(search.toLowerCase());
    const matchesMandante = !mandante || row.mandante === mandante;
    return matchesText && matchesMandante;
  }), [rows, search, mandante]);

  return (
    <div className="zoho-page">
      <div className="page-toolbar">
        <div><span className="eyebrow">Actividades</span><h2 className="page-title">Empresas</h2></div>
        <div className="toolbar-actions"><button className="ghost-btn">Filtrar</button><button className="ghost-btn">Ordenar</button><button className="primary-btn">Crear Empresa</button></div>
      </div>
      <div className="zoho-layout single-detailless">
        <aside className="filter-panel">
          <div className="panel-title-row"><h3>Filtrar Empresas</h3></div>
          <label className="field-block"><span>Buscar</span><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="RUT, razón social o correo" /></label>
          <label className="field-block"><span>Mandante</span><select value={mandante} onChange={(e)=>setMandante(e.target.value)}><option value="">Todos</option>{mandantes.map((m)=><option key={m} value={m}>{m}</option>)}</select></label>
        </aside>
        <section className="table-panel wide-panel">
          <div className="panel-title-row"><h3>Listado</h3><span className="records-counter">{filtered.length} registros</span></div>
          <div className="table-scroll">
            <table className="crm-table enhanced">
              <thead><tr><th>RUT</th><th>Razón social</th><th>Mandante</th><th>Correo</th><th>Monto estimado</th></tr></thead>
              <tbody>
                {filtered.length === 0 ? <tr><td colSpan={5}>Sin registros</td></tr> : filtered.map((row)=><tr key={row.id}><td>{row.rut}</td><td>{row.business_name}</td><td>{row.mandante || '-'}</td><td>{row.email || '-'}</td><td>{Number(row.estimated_amount || 0).toLocaleString('es-CL')}</td></tr>)}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
