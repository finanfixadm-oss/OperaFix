import { useMemo, useRef, useState } from "react";
import { fetchJson, uploadForm } from "../api";

type ImportStats = {
  total: number;
  ok: number;
  warnings: number;
  errors: number;
  duplicatesInFile: number;
  duplicatesInDb: number;
  monto: number;
  byMandante: Record<string, number>;
  byEstado: Record<string, number>;
};

type ImportRow = Record<string, any> & {
  rowNumber: number;
  validation_status: "OK" | "ADVERTENCIA" | "ERROR";
  validation_messages: string[];
  is_duplicate_in_file: boolean;
  exists_in_database: boolean;
};

type FieldCatalogItem = {
  field: string;
  label: string;
  type: "text" | "number" | "money" | "boolean" | "date" | "enum";
};

type PreviewResponse = {
  importId: string;
  fileName: string;
  sheetName: string;
  headers: string[];
  fieldCatalog: FieldCatalogItem[];
  mappedColumns: Array<{ header: string; field: string; label: string }>;
  unmappedHeaders: string[];
  stats: ImportStats;
  aiReview: string;
  rows: ImportRow[];
  totalRows: number;
};

type CommitResponse = {
  ok: boolean;
  created: number;
  skipped: number;
  errors: number;
  results: Array<{ status: string; reason?: string; rowNumber?: number }>;
};

function formatMoney(value: number | null | undefined) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(Number(value || 0));
}

function formatCell(value: unknown, type?: FieldCatalogItem["type"]) {
  if (value === undefined || value === null || value === "") return "—";
  if (type === "money") return formatMoney(Number(value || 0));
  if (type === "boolean") return value === true ? "Sí" : "No";
  if (type === "date") {
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("es-CL");
  }
  return String(value);
}

function StatusBadge({ status }: { status: ImportRow["validation_status"] }) {
  return <span className={`import-badge import-badge-${status.toLowerCase()}`}>{status}</span>;
}

const PRIORITY_FIELDS = [
  "mandante",
  "razon_social",
  "rut",
  "entidad",
  "estado_gestion",
  "monto_devolucion",
  "confirmacion_cc",
  "confirmacion_poder",
  "numero_solicitud",
  "mes_produccion_2026",
  "mes_ingreso_solicitud",
  "fecha_presentacion_afp",
  "fecha_ingreso_afp",
  "fecha_pago_afp",
  "facturado_finanfix",
  "facturado_cliente",
];

export default function MassImportPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [commitResult, setCommitResult] = useState<CommitResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showAllFields, setShowAllFields] = useState(false);

  const fieldMap = useMemo(() => {
    return new Map((preview?.fieldCatalog || []).map((field) => [field.field, field]));
  }, [preview]);

  const previewColumns = useMemo(() => {
    if (!preview) return [];
    const mapped = Array.from(new Set(preview.mappedColumns.map((item) => item.field)));
    const priority = PRIORITY_FIELDS.filter((field) => mapped.includes(field));
    const rest = mapped.filter((field) => !priority.includes(field));
    const fields = showAllFields ? [...priority, ...rest] : priority;
    return fields.map((field) => fieldMap.get(field) || { field, label: field, type: "text" as const });
  }, [preview, showAllFields, fieldMap]);

  const visibleRows = useMemo(() => {
    const rows = preview?.rows || [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      previewColumns.some((column) => String(row[column.field] || "").toLowerCase().includes(q)) ||
      String(row.validation_messages?.join(" ") || "").toLowerCase().includes(q)
    );
  }, [preview, previewColumns, search]);

  async function handleUpload(file: File) {
    setError(null);
    setCommitResult(null);
    setPreview(null);
    setFileName(file.name);
    setLoading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const result = await uploadForm<PreviewResponse>("/imports/records/preview", form);
      setPreview(result);
    } catch (err: any) {
      setError(err?.message || "No se pudo procesar el archivo.");
    } finally {
      setLoading(false);
    }
  }

  async function commitImport() {
    if (!preview) return;
    if (preview.stats.errors > 0) {
      const ok = confirm("Hay filas con error crítico. Esas filas se omitirán. ¿Quieres continuar?");
      if (!ok) return;
    }
    setCommitting(true);
    setError(null);
    try {
      const result = await fetchJson<CommitResponse>("/imports/records/commit", {
        method: "POST",
        body: JSON.stringify({ importId: preview.importId, skipDuplicates, batchSize: 25 }),
      });
      setCommitResult(result);
    } catch (err: any) {
      setError(err?.message || "No se pudo confirmar la carga.");
    } finally {
      setCommitting(false);
    }
  }

  return (
    <div className="zoho-page mass-import-page">
      <div className="zoho-page-header import-header">
        <div>
          <p className="zoho-breadcrumb">Herramientas / Carga masiva</p>
          <h1>Carga masiva inteligente</h1>
          <p className="zoho-muted">Sube el Excel BBDD CRM. La carga usa el mismo catálogo de campos que Registros de empresas, IA y Portal Cliente.</p>
        </div>
        <div className="zoho-actions-row">
          <button className="zoho-btn" onClick={() => fileInputRef.current?.click()} disabled={loading || committing}>
            Seleccionar Excel
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) handleUpload(file);
              event.currentTarget.value = "";
            }}
          />
        </div>
      </div>

      <section className="import-drop-card" onClick={() => fileInputRef.current?.click()}>
        <div className="import-drop-icon">⬆</div>
        <div>
          <h3>{fileName || "Selecciona el Excel oficial BBDD CRM"}</h3>
          <p>La carga detecta automáticamente todos los campos del archivo: mandante, empresa, AFP, estado, montos, fechas, facturación, CEN, banco, poder y cuenta corriente.</p>
          <p className="zoho-muted">Los campos no mapeados se informan antes de cargar. Los datos se guardan en Gestión, LM/TP, Línea y AFP asociada.</p>
        </div>
      </section>

      {loading && <div className="zoho-card import-loading">Procesando Excel, mapeando campos y validando duplicados...</div>}
      {error && <div className="zoho-card import-error">{error}</div>}

      {preview && (
        <>
          <div className="import-kpi-grid">
            <div className="import-kpi"><span>Total filas</span><strong>{preview.stats.total}</strong></div>
            <div className="import-kpi"><span>OK</span><strong>{preview.stats.ok}</strong></div>
            <div className="import-kpi"><span>Advertencias</span><strong>{preview.stats.warnings}</strong></div>
            <div className="import-kpi"><span>Errores</span><strong>{preview.stats.errors}</strong></div>
            <div className="import-kpi"><span>Duplicados</span><strong>{preview.stats.duplicatesInFile + preview.stats.duplicatesInDb}</strong></div>
            <div className="import-kpi"><span>Monto total</span><strong>{formatMoney(preview.stats.monto)}</strong></div>
          </div>

          <div className="import-two-columns">
            <section className="zoho-card">
              <div className="zoho-section-title">Revisión IA / Validación</div>
              <p className="import-ai-review">{preview.aiReview}</p>
            </section>
            <section className="zoho-card">
              <div className="zoho-section-title">Mapeo automático de columnas</div>
              <div className="import-summary-list">
                {(preview.mappedColumns || []).map((item) => (
                  <div key={`${item.header}-${item.field}`}><span>{item.header}</span><strong>{item.label || item.field}</strong></div>
                ))}
              </div>
              {(preview.unmappedHeaders || []).length > 0 && (
                <>
                  <div className="zoho-section-title import-state-title">Columnas no usadas</div>
                  <p className="zoho-muted">{preview.unmappedHeaders.join(" · ")}</p>
                </>
              )}
            </section>
            <section className="zoho-card">
              <div className="zoho-section-title">Resumen por mandante</div>
              <div className="import-summary-list">
                {Object.entries(preview.stats.byMandante).map(([name, count]) => (
                  <div key={name}><span>{name}</span><strong>{count}</strong></div>
                ))}
              </div>
              <div className="zoho-section-title import-state-title">Resumen por estado</div>
              <div className="import-summary-list">
                {Object.entries(preview.stats.byEstado).map(([name, count]) => (
                  <div key={name}><span>{name}</span><strong>{count}</strong></div>
                ))}
              </div>
            </section>
          </div>

          <section className="zoho-card">
            <div className="import-table-toolbar">
              <div>
                <div className="zoho-section-title">Vista previa con campos oficiales CRM</div>
                <p className="zoho-muted">Mostrando hasta 100 filas de {preview.totalRows}. Columnas mapeadas: {preview.mappedColumns.length}. Las filas con error crítico no se cargarán.</p>
              </div>
              <div className="zoho-actions-row">
                <label className="import-checkbox">
                  <input type="checkbox" checked={showAllFields} onChange={(e) => setShowAllFields(e.target.checked)} />
                  Mostrar todos los campos
                </label>
                <input className="zoho-input" placeholder="Buscar en vista previa" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
            <div className="records-table-scroll import-table-scroll">
              <table className="zoho-table import-preview-table">
                <thead>
                  <tr>
                    <th>Fila</th>
                    <th>Validación</th>
                    {previewColumns.map((column) => <th key={column.field}>{column.label}</th>)}
                    <th>Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row) => (
                    <tr key={`${row.rowNumber}-${row.rut || ""}`} className={row.validation_status === "ERROR" ? "import-row-error" : ""}>
                      <td>{row.rowNumber}</td>
                      <td><StatusBadge status={row.validation_status} /></td>
                      {previewColumns.map((column) => <td key={column.field}>{formatCell(row[column.field], column.type)}</td>)}
                      <td>{row.validation_messages.length ? row.validation_messages.join(" · ") : "Sin observaciones"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="zoho-card import-confirm-card">
            <label className="import-checkbox">
              <input type="checkbox" checked={skipDuplicates} onChange={(e) => setSkipDuplicates(e.target.checked)} />
              Omitir duplicados detectados en archivo o base de datos
            </label>
            <div className="zoho-actions-row">
              <button className="zoho-btn ghost" onClick={() => setPreview(null)} disabled={committing}>Cancelar vista previa</button>
              <button className="zoho-btn primary" onClick={commitImport} disabled={committing || preview.stats.total === 0}>
                {committing ? "Cargando..." : "Confirmar carga al CRM"}
              </button>
            </div>
          </section>
        </>
      )}

      {commitResult && (
        <section className={`zoho-card ${commitResult.errors ? "import-error" : "import-success"}`}>
          <h3>Resultado de carga</h3>
          <p>Creados: <strong>{commitResult.created}</strong> · Omitidos: <strong>{commitResult.skipped}</strong> · Errores: <strong>{commitResult.errors}</strong></p>
          <p className="zoho-muted">Ahora puedes revisar los registros en el módulo Registros de empresas.</p>
        </section>
      )}
    </div>
  );
}
