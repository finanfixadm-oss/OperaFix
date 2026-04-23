import { useEffect, useMemo, useState } from "react";
import type { FilterFieldDefinition, FilterOperator, FilterRule } from "../types";

type Props = {
  title: string;
  fields: FilterFieldDefinition[];
  onApply: (rules: FilterRule[], quickSearch: string) => void;
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

export default function ModuleFilterPanel({ title, fields, onApply }: Props) {
  const [quickSearch, setQuickSearch] = useState("");
  const [rules, setRules] = useState<FilterRule[]>(
    fields.map((field) => ({
      field: field.field,
      label: field.label,
      type: field.type,
      enabled: false,
      operator: defaultOperator(field.type),
      value: "",
    }))
  );

  useEffect(() => {
    setRules(
      fields.map((field) => ({
        field: field.field,
        label: field.label,
        type: field.type,
        enabled: false,
        operator: defaultOperator(field.type),
        value: "",
      }))
    );
  }, [fields]);

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

  return (
    <aside className="zoho-filter-panel">
      <div className="zoho-filter-title">{title}</div>

      <div className="zoho-filter-search">
        <input
          className="zoho-input"
          placeholder="Buscar"
          value={quickSearch}
          onChange={(e) => setQuickSearch(e.target.value)}
        />
      </div>

      <div className="zoho-filter-section">
        <div className="zoho-filter-section-title">Filtrar por campos</div>

        {fields.map((field) => {
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