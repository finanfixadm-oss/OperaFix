import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ModuleFilterPanel from "../components/ModuleFilterPanel";
import { fetchJson } from "../api";
import type { FilterFieldDefinition, FilterRule, ManagementLine } from "../types";

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

export default function ManagementLinesPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ManagementLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRules, setActiveRules] = useState<FilterRule[]>([]);
  const [quickSearch, setQuickSearch] = useState("");

  useEffect(() => {
    fetchJson<ManagementLine[]>("/management-lines")
      .then(setRows)
      .finally(() => setLoading(false));
  }, []);

  const fields: FilterFieldDefinition[] = [
    {
      field: "line_type",
      label: "Tipo de línea",
      type: "select",
      options: [
        { label: "LM", value: "LM" },
        { label: "TP", value: "TP" },
      ],
    },
    { field: "name", label: "Nombre línea", type: "text" },
    { field: "owner_name", label: "Propietario", type: "text" },
    { field: "portal_access", label: "Acceso portal", type: "text" },
    { field: "mes_produccion_2026", label: "Mes producción 2026", type: "text" },
    { field: "estado_contrato_cliente", label: "Estado contrato cliente", type: "text" },
    { field: "consulta_cen", label: "Consulta CEN", type: "text" },
    { field: "contenido_cen", label: "Contenido CEN", type: "text" },
    { field: "respuesta_cen", label: "Respuesta CEN", type: "text" },
    { field: "mandante.name", label: "Mandante", type: "text" },
    { field: "group.name", label: "Grupo", type: "text" },
    { field: "company.razon_social", label: "Razón social", type: "text" },
  ];

  const filteredRows = useMemo(() => {
    let data = [...rows];

    if (quickSearch.trim()) {
      const q = quickSearch.toLowerCase();
      data = data.filter((row) =>
        [
          row.name,
          row.owner_name,
          row.portal_access,
          row.company?.razon_social,
          row.group?.name,
          row.mandante?.name,
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
          <h1>Líneas LM / TP</h1>
          <p>Empresa → Línea → AFP → Gestión</p>
        </div>
        <div className="zoho-module-actions">
          <button className="zoho-btn zoho-btn-primary">Nueva línea</button>
          <button className="zoho-btn">Importar</button>
          <button className="zoho-btn">Exportar</button>
        </div>
      </div>

      <div className="zoho-module-layout">
        <ModuleFilterPanel
          title="Filtrar Líneas"
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
                  <th>Tipo</th>
                  <th>Nombre línea</th>
                  <th>Mandante</th>
                  <th>Grupo</th>
                  <th>Razón social</th>
                  <th>Propietario</th>
                  <th>Acceso portal</th>
                  <th>Mes producción</th>
                  <th>Estado contrato</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => navigate(`/management-lines/${row.id}/afps`)}
                    style={{ cursor: "pointer" }}
                  >
                    <td>{row.line_type}</td>
                    <td>{row.name || "—"}</td>
                    <td>{row.mandante?.name || "—"}</td>
                    <td>{row.group?.name || "—"}</td>
                    <td>{row.company?.razon_social || "—"}</td>
                    <td>{row.owner_name || "—"}</td>
                    <td>{row.portal_access || "—"}</td>
                    <td>{row.mes_produccion_2026 || "—"}</td>
                    <td>{row.estado_contrato_cliente || "—"}</td>
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