import { useEffect, useMemo, useState } from "react";
import type { FilterFieldDefinition, FilterOperator, FilterRule } from "../types";

type Props = {
  title: string;
  fields: FilterFieldDefinition[];
  onApply: (rules: FilterRule[], quickSearch: string) => void;
  initialRules?: FilterRule[];
  initialQuickSearch?: string;
};

const operatorLabels: Record<FilterOperator, string> = {
  equals: "es",
  not_equals: "no está",
  contains: "contiene",
  not_contains: "no contiene",
  starts_with: "empieza por",
  ends_with: "termina por",
  includes_all: "incluir todo",
  includes_any: "incluir cualquiera",
};

function defaultOperator(type: FilterFieldDefinition["type"]): FilterOperator {
  if (type === "select" || type === "boolean") return "equals";
  return "contains";
}

export default function ModuleFilterPanel({ title, fields, onApply, initialRules = [], initialQuickSearch = "" }: Props) {
  const [quickSearch, setQuickSearch] = useState(initialQuickSearch);
  const [filterSearch, setFilterSearch] = useState("");
  function buildRules() {
    return fields.map((field) => {
      const saved = initialRules.find((rule) => rule.field === field.field);
      return {
        field: field.field,
        label: field.label,
        type: field.type,
        enabled: Boolean(saved?.enabled),
        operator: saved?.operator || defaultOperator(field.type),
        value: saved?.value || "",
      };
    });
  }

  const [rules, setRules] = useState<FilterRule[]>(() => buildRules());

  useEffect(() => {
    setRules(buildRules());
    setQuickSearch(initialQuickSearch);
  }, [fields, initialRules, initialQuickSearch]);

  const operatorsByType = useMemo(() => {
    return (type: FilterFieldDefinition["type"]): FilterOperator[] => {
      if (type === "select" || type === "boolean") {
        return ["equals", "not_equals", "includes_any"];
      }
      if (type === "number" || type === "date") {
        return ["equals", "not_equals", "contains"];
      }
      return [
        "equals",
        "not_equals",
        "contains",
        "not_contains",
        "starts_with",
        "ends_with",
        "includes_all",
        "includes_any",
      ];
    };
  }, []);

  function updateRule(field: string, patch: Partial<FilterRule>) {
    setRules((prev) =>
      prev.map((rule) => (rule.field === field ? { ...rule, ...patch } : rule))
    );
  }

  function clearAll() {
    const reset = fields.map((field) => ({
      field: field.field,
      label: field.label,
      type: field.type,
      enabled: false,
      operator: defaultOperator(field.type),
      value: "",
    }));
    setRules(reset);
    setQuickSearch("");
    onApply([], "");
  }

  function applyFilters() {
    onApply(rules.filter((rule) => rule.enabled), quickSearch);
  }

  function getFieldGroup(field: FilterFieldDefinition) {
    if (["mandante.name", "grupo_empresa", "group.name", "razon_social", "company.razon_social", "rut", "direccion"].includes(field.field)) return "Empresa y mandante";
    if (["entidad", "lineAfp.afp_name", "management_type", "estado_gestion", "envio_afp", "estado_contrato_cliente", "estado_trabajador", "motivo_tipo_exceso", "motivo_rechazo", "numero_solicitud", "owner_name", "acceso_portal"].includes(field.field)) return "Gestión";
    if (["confirmacion_cc", "confirmacion_poder", "consulta_cen", "contenido_cen", "respuesta_cen"].includes(field.field)) return "Confirmaciones y CEN";
    if (field.type === "number" || ["monto_devolucion", "monto_pagado", "monto_cliente", "monto_finanfix_solutions", "monto_real_cliente", "monto_real_finanfix_solutions", "fee"].includes(field.field)) return "Montos";
    if (field.type === "date" || field.field.includes("fecha") || field.field.includes("created_at") || field.field.includes("updated_at") || field.field.includes("last_activity_at")) return "Fechas";
    if (["banco", "tipo_cuenta", "numero_cuenta"].includes(field.field)) return "Datos bancarios";
    if (["facturado_finanfix", "facturado_cliente", "numero_factura", "numero_oc"].includes(field.field)) return "Facturación";
    return "Otros campos";
  }

  const groupedFields = useMemo(() => {
    const query = filterSearch.trim().toLowerCase();
    const base = query ? fields.filter((field) => `${field.label} ${field.field}`.toLowerCase().includes(query)) : fields;
    return base.reduce<Record<string, FilterFieldDefinition[]>>((acc, field) => {
      const group = getFieldGroup(field);
      acc[group] = acc[group] || [];
      acc[group].push(field);
      return acc;
    }, {});
  }, [fields, filterSearch]);

  const groupOrder = ["Empresa y mandante", "Gestión", "Confirmaciones y CEN", "Montos", "Fechas", "Datos bancarios", "Facturación", "Otros campos"];

  return (
    <aside className="zoho-filter-panel">
      <div className="zoho-filter-title">{title}</div>

      <div className="zoho-filter-actions zoho-filter-actions-top">
        <button className="zoho-btn zoho-btn-primary" onClick={applyFilters}>
          Aplicar filtro
        </button>
        <button className="zoho-btn" onClick={clearAll}>
          Borrar
        </button>
      </div>

      <div className="zoho-filter-search-grid">
        <label>
          <span>Búsqueda general en registros</span>
          <input
            className="zoho-input"
            placeholder="Buscar dentro de los registros"
            value={quickSearch}
            onChange={(e) => setQuickSearch(e.target.value)}
          />
        </label>
        <label>
          <span>Buscar filtro</span>
          <input
            className="zoho-input"
            placeholder="Ej: monto, fecha, AFP, RUT"
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
          />
        </label>
      </div>

      <div className="zoho-filter-section">
        <div className="zoho-filter-section-title">Filtros agrupados por tipo</div>

        {groupOrder.filter((group) => groupedFields[group]?.length).map((group) => (
          <details key={group} className="zoho-filter-group" open>
            <summary>{group} <span>{groupedFields[group].length}</span></summary>
            {groupedFields[group].map((field) => {
              const rule = rules.find((r) => r.field === field.field)!;
              return (
            <div key={field.field} className="zoho-filter-item">
              <label className="zoho-filter-item-label">
                <input
                  type="checkbox"
                  checked={rule.enabled}
                  onChange={(e) => updateRule(field.field, { enabled: e.target.checked })}
                />
                <span>{field.label}</span>
              </label>

              {rule.enabled && (
                <div className="zoho-filter-controls">
                  <select
                    className="zoho-select"
                    value={rule.operator}
                    onChange={(e) =>
                      updateRule(field.field, {
                        operator: e.target.value as FilterOperator,
                      })
                    }
                  >
                    {operatorsByType(field.type).map((operator) => (
                      <option key={operator} value={operator}>
                        {operatorLabels[operator]}
                      </option>
                    ))}
                  </select>

                  {field.type === "select" && field.options ? (
                    <select
                      className="zoho-select"
                      value={rule.value}
                      onChange={(e) =>
                        updateRule(field.field, {
                          value: e.target.value,
                        })
                      }
                    >
                      <option value="">Ninguno</option>
                      {field.options.map((opt) => (
                        <option key={`${field.field}-${opt.value}`} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : field.type === "boolean" ? (
                    <select
                      className="zoho-select"
                      value={rule.value}
                      onChange={(e) =>
                        updateRule(field.field, {
                          value: e.target.value,
                        })
                      }
                    >
                      <option value="">Ninguno</option>
                      <option value="true">Sí</option>
                      <option value="false">No</option>
                    </select>
                  ) : (
                    <input
                      className="zoho-input"
                      placeholder="Valor"
                      value={rule.value}
                      onChange={(e) =>
                        updateRule(field.field, {
                          value: e.target.value,
                        })
                      }
                    />
                  )}
                </div>
              )}
            </div>
              );
            })}
          </details>
        ))}
        {Object.keys(groupedFields).length === 0 && <div className="zoho-empty small">No se encontraron filtros con ese texto.</div>}
      </div>

      <div className="zoho-filter-actions">
        <button className="zoho-btn zoho-btn-primary" onClick={applyFilters}>
          Aplicar filtro
        </button>
        <button className="zoho-btn" onClick={clearAll}>
          Borrar
        </button>
      </div>
    </aside>
  );
}