import { useEffect, useState } from "react";
import { fetchHierarchyOverview } from "../api";

export default function HierarchyPage() {
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => { fetchHierarchyOverview().then(setRows).catch(() => setRows([])); }, []);

  return (
    <div className="zoho-page">
      <div className="page-toolbar">
        <div><span className="eyebrow">Mapa de negocio</span><h2 className="page-title">Jerarquía base</h2></div>
        <div className="toolbar-actions"><button className="ghost-btn">Expandir todo</button><button className="ghost-btn">Exportar</button></div>
      </div>
      <div className="hierarchy-board">
        {rows.length === 0 && <div className="empty-state card">Sin datos jerárquicos aún.</div>}
        {rows.map((mandante) => (
          <div className="hierarchy-mandante" key={mandante.id}>
            <div className="hierarchy-head">
              <h3>{mandante.name}</h3>
              <span>{mandante._count?.groups || 0} grupos · {mandante._count?.companies || 0} empresas</span>
            </div>
            <div className="hierarchy-columns">
              {(mandante.groups || []).map((group: any) => (
                <div className="hierarchy-group-card" key={group.id}>
                  <div className="hierarchy-group-title">{group.name}</div>
                  <div className="hierarchy-group-meta">{group.kind} · {group._count?.companies || 0} empresas</div>
                  <div className="hierarchy-company-list">
                    {(group.companies || []).map((link: any) => (
                      <div className="hierarchy-company-item" key={link.id}>
                        <strong>{link.company?.business_name || 'Empresa'}</strong>
                        <span>{link.company?.rut || '-'}</span>
                        <small>{link.default_entity || 'Sin AFP base'}</small>
                      </div>
                    ))}
                    {(!group.companies || group.companies.length === 0) && <div className="empty-inline">Sin empresas asociadas</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
