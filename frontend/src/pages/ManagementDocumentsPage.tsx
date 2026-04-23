import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import ModuleFilterPanel from "../components/ModuleFilterPanel";
import { fetchJson } from "../api";
import type { FilterFieldDefinition, FilterRule, ManagementDocument } from "../types";

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

export default function ManagementDocumentsPage() {
  const { managementId = "" } = useParams();
  const [rows, setRows] = useState<ManagementDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRules, setActiveRules] = useState<FilterRule[]>([]);
  const [quickSearch, setQuickSearch] = useState("");

  useEffect(() => {
    fetchJson<ManagementDocument[]>("/management-documents", {
      query: { management_id: managementId },
    })
      .then(setRows)
      .finally(() => setLoading(false));
  }, [managementId]);

  const fields: FilterFieldDefinition[] = [
    { field: "category", label: "Categoría", type: "text" },
    { field: "file_name", label: "Nombre archivo", type: "text" },
    { field: "mime_type", label: "Tipo MIME", type: "text" },
    { field: "related_module", label: "Módulo", type: "text" },
  ];

  const filteredRows = useMemo(() => {
    let data = [...rows];

    if (quickSearch.trim()) {
      const q = quickSearch.toLowerCase();
      data = data.filter((row) =>
        [row.category, row.file_name, row.mime_type, row.related_module]
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
          <h1>Documentos por gestión</h1>
          <p>Documentos asociados directamente a la gestión</p>
        </div>
        <div className="zoho-module-actions">
          <button className="zoho-btn zoho-btn-primary">Subir documento</button>
        </div>
      </div>

      <div className="zoho-module-layout">
        <ModuleFilterPanel
          title="Filtrar Documentos"
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
                  <th>Categoría</th>
                  <th>Archivo</th>
                  <th>Tipo</th>
                  <th>Módulo</th>
                  <th>Tamaño</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.category}</td>
                    <td>
                      <a href={row.file_url} target="_blank" rel="noreferrer">
                        {row.file_name}
                      </a>
                    </td>
                    <td>{row.mime_type || "—"}</td>
                    <td>{row.related_module}</td>
                    <td>{row.file_size || "—"}</td>
                    <td>{new Date(row.created_at).toLocaleString("es-CL")}</td>
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