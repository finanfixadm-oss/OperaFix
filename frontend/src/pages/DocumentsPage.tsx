import { useMemo, useState } from "react";

const folders = [
  { id: '1', name: 'Grupos empresas - TP', updated_by: 'Luis Mendoza', updated_at: 'abr 13' },
  { id: '2', name: 'Empresas', updated_by: 'Luis Mendoza', updated_at: 'mar 18' },
  { id: '3', name: 'Grupos de empresas - LM', updated_by: 'Luis Mendoza', updated_at: 'feb 25' },
  { id: '4', name: 'Registros de empresas', updated_by: 'Luis Mendoza', updated_at: 'feb 20' },
];

export default function DocumentsPage() {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => folders.filter((f) => f.name.toLowerCase().includes(search.toLowerCase())), [search]);

  return (
    <div className="documents-workdrive">
      <div className="page-toolbar">
        <div><h2 className="page-title">Documentos</h2></div>
      </div>
      <div className="docs-layout">
        <aside className="docs-sidebar">
          <div className="docs-side-head">Mis carpetas</div>
          <div className="docs-tree-title">CARPETAS DE EQUIPO</div>
          <div className="docs-tree-item active">Zoho CRM</div>
        </aside>
        <section className="docs-main">
          <div className="docs-toolbar">
            <div className="docs-breadcrumb">Apps &gt; Zoho CRM</div>
            <input className="docs-search" placeholder="Buscar carpeta" value={search} onChange={(e)=>setSearch(e.target.value)} />
          </div>
          <div className="docs-list">
            {filtered.map((folder) => (
              <div className="docs-row" key={folder.id}>
                <div>
                  <strong>{folder.name}</strong>
                  <div>Cargado por {folder.updated_by}</div>
                </div>
                <div>{folder.updated_at} por {folder.updated_by}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
