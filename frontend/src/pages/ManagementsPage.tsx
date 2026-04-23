import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import ModuleFilterPanel from "../components/ModuleFilterPanel";
import { fetchJson } from "../api";
import type { FilterFieldDefinition, FilterRule, Management } from "../types";

function getValueByPath(obj: any, path: string) {
  return path.split(".").reduce((acc, key) => acc?.[key], obj);
}

function matchRule(value: any, rule: FilterRule) {
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
      return query.split(",").map((x) => x.trim()).filter(Boolean).every((p) => normalized.includes(p));
    case "includes_any":
      return query.split(",").map((x) => x.trim()).filter(Boolean).some((p) => normalized.includes(p));
    default:
      return true;
  }
}

function formatMoney(value?: number | null) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export default function ManagementsPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const lineAfpId = params.get("line_afp_id") || "";
  const [rows, setRows] = useState<Management[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRules, setActiveRules] = useState<FilterRule[]>([]);
  const [quickSearch, setQuickSearch] = useState("");

  useEffect(() => {
    fetchJson<Management[]>("/managements", {
      query: { line_afp_id: lineAfpId || undefined },
    })
      .then(setRows)
      .finally(() => setLoading(false));
  }, [lineAfpId]);

  const fields: FilterFieldDefinition[] = [
    { field: "management_type", label: "Tipo", type: "select", options: [
      { label: "LM", value: "LM" },
      { label: "TP", value: "TP" },
    ]},
    { field: "razon_social", label: "Razón social", type: "text" },
    { field: "rut", label: "RUT", type: "text" },
    { field: "entidad", label: "Entidad", type: "text" },
    { field: "estado_gestion", label: "Estado Gestión", type: "text" },
    { field: "numero_solicitud", label: "N° Solicitud", type: "text" },
    { field: "banco", label: "Banco", type: "text" },
    { field: "numero_cuenta", label: "Número cuenta", type: "text" },
    { field: "tipo_cuenta", label: "Tipo cuenta", type: "text" },
    { field: "confirmacion_cc", label: "Confirmación CC", type: "boolean" },
    { field: "confirmacion_poder", label: "Confirmación Poder", type: "boolean" },
    { field: "mandante.name", label: "Mandante", type: "text" },
    { field: "company.razon_social", label: "Empresa", type: "text" },
    { field: "lineAfp.afp_name", label: "AFP", type: "text" },
  ];

  const filteredRows = useMemo(() => {
    let data = [...rows];

    if (quickSearch.trim()) {
      const q = quickSearch.toLowerCase();
      data = data.filter((row) =>
        [
          row.razon_social,
          row.rut,
          row.entidad,
          row.estado_gestion,
          row.numero_solicitud,
          row.lineAfp?.afp_name,
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
          <h1>Gestiones</h1>
          <p>AFP → Gestión → Documentos por gestión</p>
        </div>
        <div className="zoho-module-actions">
          <button className="zoho-btn zoho-btn-primary">Nueva gestión</button>
          <button className="zoho-btn">Importar</button>
          <button className="zoho-btn">Exportar</button>
        </div>
      </div>

      <div className="zoho-module-layout">
        <ModuleFilterPanel
          title="Filtrar Gestiones"
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
                  <th>Razón social</th>
                  <th>RUT</th>
                  <th>AFP</th>
                  <th>Entidad</th>
                  <th>Estado Gestión</th>
                  <th>N° Solicitud</th>
                  <th>Monto devolución</th>
                  <th>Monto pagado</th>
                  <th>Banco</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => navigate(`/managements/${row.id}/documents`)}
                    style={{ cursor: "pointer" }}
                  >
                    <td>{row.management_type}</td>
                    <td>{row.razon_social || "—"}</td>
                    <td>{row.rut || "—"}</td>
                    <td>{row.lineAfp?.afp_name || "—"}</td>
                    <td>{row.entidad || "—"}</td>
                    <td>{row.estado_gestion || "—"}</td>
                    <td>{row.numero_solicitud || "—"}</td>
                    <td>{formatMoney(row.monto_devolucion)}</td>
                    <td>{formatMoney(row.monto_pagado)}</td>
                    <td>{row.banco || "—"}</td>
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