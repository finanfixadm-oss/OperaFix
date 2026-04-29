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

type ImportRow = {
  rowNumber: number;
  mandante: string | null;
  razon_social: string | null;
  rut: string | null;
  entidad: string | null;
  estado_gestion: string | null;
  monto_devolucion: number | null;
  numero_solicitud: string | null;
  validation_status: "OK" | "ADVERTENCIA" | "ERROR";
  validation_messages: string[];
  is_duplicate_in_file: boolean;
  exists_in_database: boolean;
};

type PreviewResponse = {
  importId: string;
  fileName: string;
  sheetName: string;
  headers: string[];
  mappedColumns: Array<{ header: string; field: string }>;
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
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(value || 0);
}

function StatusBadge({ status }: { status: ImportRow["validation_status"] }) {
  return <span className={`import-badge import-badge-${status.toLowerCase()}`}>{status}</span>;
}

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

  const visibleRows = useMemo(() => {
    const rows = preview?.rows || [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      [row.mandante, row.razon_social, row.rut, row.entidad, row.estado_gestion, row.numero_solicitud]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [preview, search]);

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
          <p className="zoho-muted">Sube un Excel, revisa la vista previa, valida duplicados y confirma la creación de gestiones.</p>
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
          <h3>{fileName || "Arrastra visualmente tu proceso acá: primero selecciona el Excel"}</h3>
          <p>El chat IA del CRM no permite adjuntar archivos. Por eso esta pantalla carga el archivo y luego la IA valida la estructura.</p>
          <p className="zoho-muted">Formato esperado: Mandante, Razón Social, RUT, Entidad, Estado Gestión, Monto Devolución, N° Solicitud y demás campos operativos.</p>
        </div>
      </section>

      {loading && <div className="zoho-card import-loading">Procesando Excel y validando información...</div>}
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
                  <div key={`${item.header}-${item.field}`}><span>{item.header}</span><strong>{item.field}</strong></div>
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
                <div className="zoho-section-title">Vista previa tipo Zoho</div>
                <p className="zoho-muted">Mostrando hasta 100 filas de {preview.totalRows}. Las filas con error crítico no se cargarán.</p>
              </div>
              <input className="zoho-input" placeholder="Buscar en vista previa" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="records-table-scroll import-table-scroll">
              <table className="zoho-table import-preview-table">
                <thead>
                  <tr>
                    <th>Fila</th>
                    <th>Validación</th>
                    <th>Mandante</th>
                    <th>Razón Social</th>
                    <th>RUT</th>
                    <th>Entidad</th>
                    <th>Estado</th>
                    <th>Monto</th>
                    <th>N° Solicitud</th>
                    <th>Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row) => (
                    <tr key={`${row.rowNumber}-${row.rut || ""}`} className={row.validation_status === "ERROR" ? "import-row-error" : ""}>
                      <td>{row.rowNumber}</td>
                      <td><StatusBadge status={row.validation_status} /></td>
                      <td>{row.mandante || "—"}</td>
                      <td>{row.razon_social || "—"}</td>
                      <td>{row.rut || "—"}</td>
                      <td>{row.entidad || "—"}</td>
                      <td>{row.estado_gestion || "—"}</td>
                      <td>{formatMoney(row.monto_devolucion)}</td>
                      <td>{row.numero_solicitud || "—"}</td>
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
