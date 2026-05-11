import { useEffect, useMemo, useState, type DragEvent } from "react";
import { downloadBlob, fetchJson, postJson } from "../api";

type Field = { key: string; label: string; type: "text" | "money" | "boolean" | "date" };
type FilterRow = { field: string; operator: string; value: string; value2?: string };
type Preview = { totalRows: number; shownRows: number; columns: Field[]; rows: Record<string, any>[]; restrictedByMandante?: string | null };

const defaultColumns = ["mandante", "razon_social", "rut", "entidad", "estado_gestion", "monto_devolucion", "numero_solicitud"];
const emptyFilter: FilterRow = { field: "", operator: "contains", value: "", value2: "" };

function operatorOptions(type?: string) {
  if (type === "money") return [
    ["gt", "mayor que"], ["gte", "mayor o igual"], ["lt", "menor que"], ["lte", "menor o igual"], ["between", "entre"], ["empty", "vacío"], ["not_empty", "no vacío"],
  ];
  if (type === "date") return [["date_from", "desde"], ["date_to", "hasta"], ["date_between", "entre"], ["empty", "vacío"], ["not_empty", "no vacío"]];
  if (type === "boolean") return [["equals", "es"], ["not_equals", "no es"]];
  return [["contains", "contiene"], ["equals", "es"], ["not_equals", "no es"], ["in", "es uno de"], ["empty", "vacío"], ["not_empty", "no vacío"]];
}

export default function ReportsBuilderPage() {
  const [fields, setFields] = useState<Field[]>([]);
  const [columns, setColumns] = useState<string[]>(defaultColumns);
  const [filters, setFilters] = useState<FilterRow[]>([{ ...emptyFilter }]);
  const [criteriaPattern, setCriteriaPattern] = useState("AND");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("informe_operafix.xlsx");
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);

  const fieldsByKey = useMemo(() => new Map(fields.map((f) => [f.key, f])), [fields]);

  useEffect(() => {
    fetchJson<{ fields: Field[] }>("/report-builder/fields")
      .then((data) => setFields(data.fields))
      .catch((err) => setError(err.message || "No se pudieron cargar los campos."));
  }, []);

  function toggleColumn(key: string) {
    setColumns((prev) => prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]);
  }

  function moveColumn(key: string, direction: -1 | 1) {
    setColumns((prev) => {
      const idx = prev.indexOf(key);
      const nextIdx = idx + direction;
      if (idx < 0 || nextIdx < 0 || nextIdx >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[nextIdx]] = [copy[nextIdx], copy[idx]];
      return copy;
    });
  }
  function handleColumnDragOver(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
  }

  function handleColumnDrop(targetKey: string) {
    if (!draggedColumn || draggedColumn === targetKey) {
      setDraggedColumn(null);
      return;
    }

    setColumns((prev) => {
      const sourceIndex = prev.indexOf(draggedColumn);
      const targetIndex = prev.indexOf(targetKey);
      if (sourceIndex < 0 || targetIndex < 0) return prev;
      const next = [...prev];
      const [removed] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, removed);
      return next;
    });
    setDraggedColumn(null);
  }


  async function runPreview() {
    setLoading(true);
    setError("");
    try {
      const data = await postJson<Preview>("/report-builder/preview", { columns, filters, criteriaPattern, limit: 100 });
      setPreview(data);
    } catch (err: any) {
      setError(err.message || "No se pudo generar la vista previa.");
    } finally {
      setLoading(false);
    }
  }

  async function downloadExcel() {
    setError("");
    try {
      await downloadBlob("/report-builder/download", { columns, filters, criteriaPattern, fileName }, fileName || "informe_operafix.xlsx");
    } catch (err: any) {
      setError(err.message || "No se pudo descargar el Excel.");
    }
  }

  function updateFilter(index: number, patch: Partial<FilterRow>) {
    setFilters((prev) => prev.map((filter, i) => i === index ? { ...filter, ...patch } : filter));
  }

  return (
    <div className="zoho-module-page reports-builder-page">
      <div className="zoho-page-header">
        <div>
          <p className="eyebrow">Informes</p>
          <h1>Constructor de informes Excel</h1>
          <p>Selecciona columnas, aplica filtros y descarga informes en Excel. Si el usuario es cliente, el backend limita automáticamente los datos a su mandante.</p>
        </div>
        <div className="report-form-actions">
          <button className="zoho-btn" onClick={runPreview} disabled={loading}>{loading ? "Generando..." : "Vista previa"}</button>
          <button className="zoho-btn primary" onClick={downloadExcel}>Descargar Excel</button>
        </div>
      </div>

      {error && <div className="zoho-alert danger">{error}</div>}
      {preview?.restrictedByMandante && <div className="zoho-alert">Vista restringida al mandante: {preview.restrictedByMandante}</div>}

      <section className="reports-grid">
        <div className="zoho-card">
          <h2>Columnas del informe</h2>
          <div className="report-form-actions compact">
            <button className="zoho-btn subtle" onClick={() => setColumns(fields.map((f) => f.key))}>Seleccionar todas</button>
            <button className="zoho-btn subtle" onClick={() => setColumns(defaultColumns)}>Vista estándar</button>
          </div>
          <div className="report-field-list">
            {fields.map((field) => {
              const checked = columns.includes(field.key);
              return (
                <label
                  key={field.key}
                  className={`report-field-card ${checked ? "selected" : ""} ${draggedColumn === field.key ? "dragging" : ""}`}
                  draggable={checked}
                  onDragStart={() => checked && setDraggedColumn(field.key)}
                  onDragOver={checked ? handleColumnDragOver : undefined}
                  onDrop={checked ? () => handleColumnDrop(field.key) : undefined}
                  onDragEnd={() => setDraggedColumn(null)}
                  title={checked ? "Arrastra esta casilla para mover la columna" : "Marca para incluir la columna"}
                >
                  <input type="checkbox" checked={checked} onChange={() => toggleColumn(field.key)} />
                  {checked && <span className="drag-handle" aria-hidden="true">☰</span>}
                  <span>{field.label}</span>
                  <small>{field.type}</small>
                  {checked && <span className="report-field-order"><button type="button" onClick={(e) => { e.preventDefault(); moveColumn(field.key, -1); }}>↑</button><button type="button" onClick={(e) => { e.preventDefault(); moveColumn(field.key, 1); }}>↓</button></span>}
                </label>
              );
            })}
          </div>
        </div>

        <div className="zoho-card">
          <h2>Filtros</h2>
          <label>Patrón de criterios
            <select className="zoho-select" value={criteriaPattern} onChange={(e) => setCriteriaPattern(e.target.value)}>
              <option value="AND">Todos los filtros (Y)</option>
              <option value="OR">Cualquier filtro (O)</option>
            </select>
          </label>
          <div className="report-filter-list">
            {filters.map((filter, index) => {
              const field = fieldsByKey.get(filter.field);
              return (
                <div className="report-filter-row" key={index}>
                  <select className="zoho-select" value={filter.field} onChange={(e) => updateFilter(index, { field: e.target.value, operator: operatorOptions(fieldsByKey.get(e.target.value)?.type)[0][0] })}>
                    <option value="">Seleccionar campo</option>
                    {fields.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                  </select>
                  <select className="zoho-select" value={filter.operator} onChange={(e) => updateFilter(index, { operator: e.target.value })}>
                    {operatorOptions(field?.type).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                  {!filter.operator.includes("empty") && <input className="zoho-input" type={field?.type === "date" ? "date" : "text"} placeholder="Valor" value={filter.value} onChange={(e) => updateFilter(index, { value: e.target.value })} />}
                  {(filter.operator === "between" || filter.operator === "date_between") && <input className="zoho-input" type={field?.type === "date" ? "date" : "text"} placeholder="Valor hasta" value={filter.value2 || ""} onChange={(e) => updateFilter(index, { value2: e.target.value })} />}
                  <button className="zoho-btn subtle" onClick={() => setFilters((prev) => prev.filter((_, i) => i !== index))}>Eliminar</button>
                </div>
              );
            })}
          </div>
          <button className="zoho-btn" onClick={() => setFilters((prev) => [...prev, { ...emptyFilter }])}>Agregar filtro</button>
          <hr />
          <label>Nombre archivo
            <input className="zoho-input" value={fileName} onChange={(e) => setFileName(e.target.value)} />
          </label>
        </div>
      </section>

      <section className="zoho-card">
        <div className="zoho-section-header">
          <div>
            <h2>Vista previa</h2>
            <p>{preview ? `${preview.totalRows} registros encontrados · ${preview.shownRows} mostrados` : "Genera una vista previa antes de descargar."}</p>
          </div>
        </div>
        {!preview ? <div className="zoho-empty">Sin vista previa generada.</div> : (
          <div className="zoho-table-scroll">
            <table className="zoho-table report-preview-table">
              <thead><tr>{preview.columns.map((c) => <th key={c.key}>{c.label}</th>)}</tr></thead>
              <tbody>
                {preview.rows.map((row, index) => <tr key={index}>{preview.columns.map((c) => <td key={c.key}>{String(row[c.label] ?? "")}</td>)}</tr>)}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
