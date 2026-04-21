import { useEffect, useMemo, useState } from "react";
import { fetchCollaborators } from "../api";
import type { Collaborator } from "../types";

export default function CollaboratorsPage() {
  const [rows, setRows] = useState<Collaborator[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchCollaborators().then(setRows).catch(() => setRows([]));
  }, []);

  const filtered = useMemo(() => rows.filter((row) => [row.full_name, row.position, row.email, row.company?.business_name].join(' ').toLowerCase().includes(search.toLowerCase())), [rows, search]);

  return (
    <div className="zoho-page">
      <div className="page-toolbar">
        <div><span className="eyebrow">Actividades</span><h2 className="page-title">Colaboradores</h2></div>
        <div className="toolbar-actions"><button className="ghost-btn">Filtrar</button><button className="ghost-btn">Ordenar</button><button className="primary-btn">Crear colaborador</button></div>
      </div>
      <div className="zoho-layout single-detailless">
        <aside className="filter-panel">
          <div className="panel-title-row"><h3>Filtrar Colaboradores</h3></div>
          <label className="field-block"><span>Buscar</span><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Nombre, cargo, correo o empresa" /></label>
        </aside>
        <section className="table-panel wide-panel">
          <div className="panel-title-row"><h3>Listado</h3><span className="records-counter">{filtered.length} registros</span></div>
          <div className="table-scroll">
            <table className="crm-table enhanced">
              <thead><tr><th>Nombre</th><th>Cargo</th><th>Correo</th><th>Teléfono</th><th>Empresa</th></tr></thead>
              <tbody>
                {filtered.length === 0 ? <tr><td colSpan={5}>Sin registros</td></tr> : filtered.map((row)=><tr key={row.id}><td>{row.full_name}</td><td>{row.position || '-'}</td><td>{row.email || '-'}</td><td>{row.phone || '-'}</td><td>{row.company?.business_name || '-'}</td></tr>)}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
