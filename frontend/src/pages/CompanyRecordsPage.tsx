import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchJson } from "../api";

type CompanyRecord = {
  id: string;
  entidad?: string | null;
  rut?: string | null;
  estado_gestion?: string | null;
  monto_devolucion?: number | null;
  razon_social?: string | null;
  numero_solicitud?: string | null;
  mes_produccion_2026?: string | null;
  confirmacion_cc?: boolean | null;
  grupo_empresa?: string | null;
  mandante?: { id: string; name?: string | null; nombre?: string | null } | null;
  company?: { razon_social?: string | null; rut?: string | null } | null;
  lineAfp?: { afp_name?: string | null } | null;
};

function money(value?: number | null) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function yesNo(value?: boolean | null) {
  if (value === undefined || value === null) return "—";
  return value ? "Sí" : "No";
}

export default function CompanyRecordsPage() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<CompanyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState("Optimiza Consulting");
  const [search, setSearch] = useState("");

  async function fetchData() {
    setLoading(true);
    try {
      const data = await fetchJson<CompanyRecord[]>("/records");
      setRecords(data);
    } catch (error) {
      console.error(error);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let data = [...records];

    if (activeView === "Mis Registros") {
      data = data.filter((row) => row.estado_gestion !== "Cerrada");
    }

    if (q) {
      data = data.filter((row) =>
        [
          row.entidad,
          row.rut,
          row.estado_gestion,
          row.razon_social,
          row.company?.razon_social,
          row.numero_solicitud,
          row.mes_produccion_2026,
          row.grupo_empresa,
          row.lineAfp?.afp_name,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q))
      );
    }

    return data;
  }, [records, search, activeView]);

  return (
    <div className="zoho-module-page">
      <div className="zoho-module-header">
        <div>
          <h1>Registros de empresas</h1>
          <p>Lista de líneas/casos de gestión por empresa, AFP y mandante</p>
        </div>

        <div className="zoho-module-actions">
          <button className="zoho-btn">Filtrar</button>
          <button className="zoho-btn">Ordenar</button>
          <button className="zoho-btn zoho-btn-primary">Crear Registro de empresa</button>
        </div>
      </div>

      <div className="zoho-quick-tabs">
        {["Optimiza Consulting", "Mundo Previsional", "Mis Registros", "Todos los Registros"].map((tab) => (
          <button
            key={tab}
            className={activeView === tab ? "active" : ""}
            onClick={() => setActiveView(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="zoho-module-layout">
        <aside className="zoho-filter-panel">
          <h2>Filtrar Registros de empresas</h2>
          <input
            className="zoho-input"
            placeholder="Buscar"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <h3>Filtros definidos por el sistema</h3>
          <label><input type="checkbox" /> Acción en registro</label>
          <label><input type="checkbox" /> Actividades</label>
          <label><input type="checkbox" /> Registros modificados</label>
          <label><input type="checkbox" /> Registros no modificados</label>

          <h3>Filtrar por campos</h3>
          {[
            "Acceso portal",
            "Banco",
            "Buscar Grupo",
            "Comentario",
            "Confirmación CC",
            "Confirmación Poder",
            "Entidad",
            "Estado Gestión",
            "Razón Social",
            "RUT",
          ].map((field) => (
            <label key={field}><input type="checkbox" /> {field}</label>
          ))}
        </aside>

        <section className="zoho-table-wrap">
          <div className="zoho-table-toolbar">
            <span>Registros totales {filtered.length}</span>
          </div>

          {loading ? (
            <div className="zoho-empty">Cargando...</div>
          ) : (
            <table className="zoho-table">
              <thead>
                <tr>
                  <th><input type="checkbox" /></th>
                  <th>Entidad</th>
                  <th>Buscar Grupo</th>
                  <th>Confirmación CC</th>
                  <th>RUT</th>
                  <th>Estado Gestión</th>
                  <th>Monto Devolución</th>
                  <th>Razón Social</th>
                  <th>N° Solicitud</th>
                  <th>Mes producción</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10}>Sin registros creados.</td>
                  </tr>
                ) : (
                  filtered.map((row) => (
                    <tr key={row.id}>
                      <td><input type="checkbox" /></td>
                      <td
                        className="zoho-link-cell"
                        onClick={() => navigate(`/records/${row.id}`)}
                      >
                        {row.entidad || row.lineAfp?.afp_name || "—"}
                      </td>
                      <td>{row.grupo_empresa || "—"}</td>
                      <td>{yesNo(row.confirmacion_cc)}</td>
                      <td>{row.rut || row.company?.rut || "—"}</td>
                      <td>{row.estado_gestion || "—"}</td>
                      <td>{money(row.monto_devolucion)}</td>
                      <td
                        className="zoho-link-cell"
                        onClick={() => navigate(`/records/${row.id}`)}
                      >
                        {row.razon_social || row.company?.razon_social || "—"}
                      </td>
                      <td>{row.numero_solicitud || "—"}</td>
                      <td>{row.mes_produccion_2026 || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
