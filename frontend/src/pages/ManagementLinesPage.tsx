import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ModuleFilterPanel from "../components/ModuleFilterPanel";
import { fetchJson } from "../api";
import type { FilterFieldDefinition, FilterRule, ManagementLineAfp } from "../types";

function getValueByPath(obj: unknown, path: string) {
  return path.split(".").reduce<any>((acc, key) => acc?.[key], obj);
}

function matchRule(value: unknown, rule: FilterRule) {
  const normalized = String(value ?? "").toLowerCase();
  const query = String(rule.value ?? "").toLowerCase();

  switch (rule.operator) {
    case "equals":
      return normalized === query;
    case "not_equals":
      return normalized !== query;
    case "contains":
      return normalized.includes(query);
    case "not_contains":
      return !normalized.includes(query);
    case "starts_with":
      return normalized.startsWith(query);
    case "ends_with":
      return normalized.endsWith(query);
    case "includes_all":
      return query
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean)
        .every((part) => normalized.includes(part));
    case "includes_any":
      return query
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean)
        .some((part) => normalized.includes(part));
    default:
      return true;
  }
}

export default function ManagementLineAfpsPage() {
  const { lineId = "" } = useParams();
  const navigate = useNavigate();
  const [rows, setRows] = useState<ManagementLineAfp[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRules, setActiveRules] = useState<FilterRule[]>([]);
  const [quickSearch, setQuickSearch] = useState("");

  useEffect(() => {
    fetchJson<ManagementLineAfp[]>("/management-line-afps", {
      query: { line_id: lineId },
    })
      .then(setRows)
      .finally(() => setLoading(false));
  }, [lineId]);

  const fields: FilterFieldDefinition[] = [
    { field: "afp_name", label: "AFP", type: "text" },
    { field: "owner_name", label: "Propietario", type: "text" },
    { field: "current_status", label: "Estado actual", type: "text" },
    {
      field: "line.line_type",
      label: "Tipo línea",
      type: "select",
      options: [
        { label: "LM", value: "LM" },
        { label: "TP", value: "TP" },
      ],
    },
    { field: "line.company.razon_social", label: "Razón social", type: "text" },
    { field: "line.mandante.name", label: "Mandante", type: "text" },
  ];

  const filteredRows = useMemo(() => {
    let data = [...rows];

    if (quickSearch.trim()) {
      const q = quickSearch.toLowerCase();
      data = data.filter((row) =>
        [
          row.afp_name,
          row.owner_name,
          row.current_status,
          row.line?.company?.razon_social,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q))
      );
    }

    if (activeRules.length) {
      data = data.filter((row) =>
        activeRules.every((rule) => matchRule(getValueByPath(row, rule.field), rule))
      );
    }

    return data;
  }, [rows, activeRules, quickSearch]);

  return (
    <div className="zoho-module-page">
      <div className="zoho-module-header">
        <div>
          <h1>AFP por línea</h1>
          <p>Línea seleccionada → AFP → Gestión</p>
        </div>
        <div className="zoho-module-actions">
          <button className="zoho-btn zoho-btn-primary">Nueva AFP</button>
          <button className="zoho-btn" onClick={() => navigate("/management-lines")}>
            Volver a líneas
          </button>
        </div>
      </div>

      <div className="zoho-module-layout">
        <ModuleFilterPanel
          title="Filtrar AFP"
          fields={fields}
          onApply={(rules, search) => {
            setActiveRules(rules);
            setQuickSearch(search);
          }}
        />

        <section className="zoho-table-wrap">
          <div className="zoho-table-toolbar">
            <span>Registros totales {filteredRows.length}</span>
          </div>

          {loading ? (
            <div className="zoho-empty">Cargando...</div>
          ) : (
            <table className="zoho-table">
              <thead>
                <tr>
                  <th>AFP</th>
                  <th>Propietario</th>
                  <th>Estado</th>
                  <th>Tipo línea</th>
                  <th>Razón social</th>
                  <th>Mandante</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => navigate(`/managements?line_afp_id=${row.id}`)}
                    style={{ cursor: "pointer" }}
                  >
                    <td>{row.afp_name}</td>
                    <td>{row.owner_name || "—"}</td>
                    <td>{row.current_status || "—"}</td>
                    <td>{row.line?.line_type || "—"}</td>
                    <td>{row.line?.company?.razon_social || "—"}</td>
                    <td>{row.line?.mandante?.name || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}