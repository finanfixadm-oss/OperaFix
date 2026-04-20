import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { fetchJson, postJson, publicBaseUrl, uploadFile } from "../api";
import { CrmDocument, LmRecord, LmRecordDetailResponse, PaginatedLmRecords } from "../types";

type Filters = {
  search: string;
  entity: string;
  management_status: string;
  mandante: string;
  confirmation_cc: string;
  confirmation_power: string;
};

const initialForm: Partial<LmRecord> = {
  search_group: "",
  rut: "",
  business_name: "",
  entity: "",
  management_status: "Pendiente Gestión",
  refund_amount: 0,
  confirmation_cc: false,
  confirmation_power: false,
  mandante: "",
  request_number: "",
  portal_access: "Sí",
  worker_status: "",
  excess_type_reason: "",
  comment: ""
};

function money(value: unknown) {
  const num = Number(value || 0);
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(num);
}

function boolText(value: boolean | null | undefined) {
  return value ? "Sí" : "No";
}

function dateText(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString("es-CL");
}

export default function LmRecordsPage() {
  const [data, setData] = useState<PaginatedLmRecords | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<LmRecordDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    search: "",
    entity: "",
    management_status: "",
    mandante: "",
    confirmation_cc: "",
    confirmation_power: ""
  });
  const [page, setPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<Partial<LmRecord>>(initialForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [noteContent, setNoteContent] = useState("");
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<"summary" | "documents" | "notes" | "activity">("summary");

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: "15" });
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    return `?${params.toString()}`;
  }, [filters, page]);

  async function loadRecords() {
    setLoading(true);
    try {
      const response = await fetchJson<PaginatedLmRecords>(`/lm-records${queryString}`);
      setData(response);
      if (!selectedId && response.items[0]) {
        setSelectedId(response.items[0].id);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo cargar la tabla.");
    } finally {
      setLoading(false);
    }
  }

  async function loadDetail(id: string) {
    setDetailLoading(true);
    try {
      const response = await fetchJson<LmRecordDetailResponse>(`/lm-records/${id}`);
      setDetail(response);
      setForm(response.record);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo cargar el detalle.");
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    loadRecords();
  }, [queryString]);

  useEffect(() => {
    if (selectedId) {
      loadDetail(selectedId);
    }
  }, [selectedId]);

  function handleFilterChange(event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setPage(1);
    setFilters((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  }

  function handleFormChange(event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value, type } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (event.target as HTMLInputElement).checked : value
    }));
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      if (form.id) {
        await postJson(`/lm-records/${form.id}`, form, "PUT");
        setMessage("Registro actualizado correctamente.");
      } else {
        const created = await postJson<LmRecord>("/lm-records", form);
        setSelectedId(created.id);
        setMessage("Registro creado correctamente.");
      }
      setIsFormOpen(false);
      await loadRecords();
      if (selectedId) await loadDetail(selectedId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo guardar el registro.");
    } finally {
      setSaving(false);
    }
  }

  async function submitNote() {
    if (!selectedId || !noteContent.trim()) return;
    try {
      await postJson(`/lm-records/${selectedId}/notes`, { content: noteContent.trim() });
      setNoteContent("");
      await loadDetail(selectedId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo guardar la nota.");
    }
  }

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !selectedId) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", file.name);
    formData.append("related_module", "lm_records");
    formData.append("related_record_id", selectedId);
    setUploading(true);
    try {
      await uploadFile("/documents/upload", formData);
      await loadDetail(selectedId);
      setActiveTab("documents");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo subir el documento.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  const rows = data?.items ?? [];

  return (
    <div className="zoho-page">
      <div className="page-toolbar">
        <div>
          <span className="eyebrow">Módulos / Gestiones LM - TP</span>
          <h2 className="page-title">Registros de empresas</h2>
        </div>
        <div className="toolbar-actions">
          <button className="ghost-btn" onClick={() => { setForm(initialForm); setIsFormOpen(true); }}>Nuevo registro</button>
          <button className="primary-btn" onClick={() => selectedId && detail && (setForm(detail.record), setIsFormOpen(true))} disabled={!selectedId}>Editar seleccionado</button>
        </div>
      </div>

      {message ? <div className="inline-message">{message}</div> : null}

      <div className="zoho-layout">
        <aside className="filter-panel">
          <div className="panel-title-row"><h3>Filtros</h3><button className="link-btn" onClick={() => setFilters({ search: "", entity: "", management_status: "", mandante: "", confirmation_cc: "", confirmation_power: "" })}>Limpiar</button></div>
          <label className="field-block">
            <span>Buscar</span>
            <input name="search" value={filters.search} onChange={handleFilterChange} placeholder="RUT, razón social, grupo..." />
          </label>
          <label className="field-block">
            <span>Entidad</span>
            <select name="entity" value={filters.entity} onChange={handleFilterChange}>
              <option value="">Todas</option>
              {data?.filterOptions.entities.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="field-block">
            <span>Estado Gestión</span>
            <select name="management_status" value={filters.management_status} onChange={handleFilterChange}>
              <option value="">Todos</option>
              {data?.filterOptions.statuses.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="field-block">
            <span>Mandante</span>
            <select name="mandante" value={filters.mandante} onChange={handleFilterChange}>
              <option value="">Todos</option>
              {data?.filterOptions.mandantes.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="field-block">
            <span>Confirmación CC</span>
            <select name="confirmation_cc" value={filters.confirmation_cc} onChange={handleFilterChange}>
              <option value="">Todos</option>
              <option value="true">Sí</option>
              <option value="false">No</option>
            </select>
          </label>
          <label className="field-block">
            <span>Confirmación Poder</span>
            <select name="confirmation_power" value={filters.confirmation_power} onChange={handleFilterChange}>
              <option value="">Todos</option>
              <option value="true">Sí</option>
              <option value="false">No</option>
            </select>
          </label>
        </aside>

        <section className="table-panel">
          <div className="panel-title-row">
            <h3>Líneas filtradas</h3>
            <span className="records-counter">{data?.meta.total ?? 0} registros</span>
          </div>

          <div className="table-scroll">
            <table className="crm-table enhanced">
              <thead>
                <tr>
                  <th>Buscar Grupo</th>
                  <th>RUT</th>
                  <th>Entidad</th>
                  <th>Estado Gestión</th>
                  <th>Monto Devolución</th>
                  <th>Confirmación CC</th>
                  <th>Confirmación Poder</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7}>Cargando registros...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={7}>No hay resultados con esos filtros.</td></tr>
                ) : rows.map((row) => (
                  <tr key={row.id} className={row.id === selectedId ? "selected" : ""} onClick={() => setSelectedId(row.id)}>
                    <td>
                      <div className="row-primary">{row.search_group || row.business_name || "Sin grupo"}</div>
                      <div className="row-secondary">{row.business_name || "Sin razón social"}</div>
                    </td>
                    <td>{row.rut}</td>
                    <td>{row.entity || "-"}</td>
                    <td><span className="status-chip">{row.management_status || "Sin estado"}</span></td>
                    <td>{money(row.refund_amount)}</td>
                    <td>{boolText(row.confirmation_cc)}</td>
                    <td>{boolText(row.confirmation_power)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination-row">
            <button className="ghost-btn" disabled={(data?.meta.page || 1) <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Anterior</button>
            <span>Página {data?.meta.page || 1} de {data?.meta.totalPages || 1}</span>
            <button className="ghost-btn" disabled={(data?.meta.page || 1) >= (data?.meta.totalPages || 1)} onClick={() => setPage((p) => p + 1)}>Siguiente</button>
          </div>
        </section>

        <aside className="detail-panel">
          <div className="panel-title-row">
            <h3>Detalle</h3>
            {detailLoading ? <span className="records-counter">Cargando…</span> : null}
          </div>

          {detail?.record ? (
            <>
              <div className="detail-summary-card">
                <div className="detail-headline">{detail.record.business_name || "Sin razón social"}</div>
                <div className="detail-subline">{detail.record.rut} · {detail.record.entity || "Sin entidad"}</div>
                <div className="detail-metrics">
                  <div><span>Monto devolución</span><strong>{money(detail.record.refund_amount)}</strong></div>
                  <div><span>Estado</span><strong>{detail.record.management_status || "Sin estado"}</strong></div>
                </div>
              </div>

              <div className="detail-tabs">
                <button className={activeTab === "summary" ? "tab-btn active" : "tab-btn"} onClick={() => setActiveTab("summary")}>Resumen</button>
                <button className={activeTab === "documents" ? "tab-btn active" : "tab-btn"} onClick={() => setActiveTab("documents")}>Documentos</button>
                <button className={activeTab === "notes" ? "tab-btn active" : "tab-btn"} onClick={() => setActiveTab("notes")}>Notas</button>
                <button className={activeTab === "activity" ? "tab-btn active" : "tab-btn"} onClick={() => setActiveTab("activity")}>Actividad</button>
              </div>

              {activeTab === "summary" ? (
                <div className="detail-grid">
                  <Info label="Buscar Grupo" value={detail.record.search_group} />
                  <Info label="Razón Social" value={detail.record.business_name} />
                  <Info label="Mandante" value={detail.record.mandante} />
                  <Info label="N° Solicitud" value={detail.record.request_number} />
                  <Info label="Estado Trabajador" value={detail.record.worker_status} />
                  <Info label="Tipo de exceso" value={detail.record.excess_type_reason} />
                  <Info label="Confirmación CC" value={boolText(detail.record.confirmation_cc)} />
                  <Info label="Confirmación Poder" value={boolText(detail.record.confirmation_power)} />
                  <Info label="Acceso portal" value={detail.record.portal_access} />
                  <Info label="Última modificación" value={dateText(detail.record.updated_at)} />
                  <Info label="Comentario" value={detail.record.comment || "-"} full />
                </div>
              ) : null}

              {activeTab === "documents" ? (
                <div className="stack-block">
                  <label className="upload-box">
                    <span>{uploading ? "Subiendo documento..." : "Cargar documento al registro"}</span>
                    <input type="file" onChange={handleUpload} disabled={uploading} />
                  </label>
                  {detail.documents.length === 0 ? <p className="muted">No hay documentos vinculados.</p> : detail.documents.map((doc) => <DocumentRow key={doc.id} doc={doc} />)}
                </div>
              ) : null}

              {activeTab === "notes" ? (
                <div className="stack-block">
                  <textarea className="note-box" rows={4} placeholder="Escribe una nota sobre esta gestión..." value={noteContent} onChange={(e) => setNoteContent(e.target.value)} />
                  <button className="primary-btn" onClick={submitNote}>Guardar nota</button>
                  {detail.notes.length === 0 ? <p className="muted">Todavía no hay notas.</p> : detail.notes.map((note) => (
                    <article key={note.id} className="timeline-card">
                      <strong>{dateText(note.created_at)}</strong>
                      <p>{note.content}</p>
                    </article>
                  ))}
                </div>
              ) : null}

              {activeTab === "activity" ? (
                <div className="stack-block">
                  {detail.activities.length === 0 ? <p className="muted">No hay actividad registrada.</p> : detail.activities.map((activity) => (
                    <article key={activity.id} className="timeline-card">
                      <strong>{activity.description}</strong>
                      <span>{activity.activity_type} · {dateText(activity.created_at)}</span>
                    </article>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <div className="empty-detail">Selecciona una línea filtrada para ver toda la información.</div>
          )}
        </aside>
      </div>

      {isFormOpen ? (
        <div className="modal-overlay" onClick={() => setIsFormOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="panel-title-row"><h3>{form.id ? "Editar registro" : "Nuevo registro"}</h3><button className="link-btn" onClick={() => setIsFormOpen(false)}>Cerrar</button></div>
            <form className="form-grid" onSubmit={handleSave}>
              <label className="field-block"><span>Buscar Grupo</span><input name="search_group" value={form.search_group || ""} onChange={handleFormChange} /></label>
              <label className="field-block"><span>RUT</span><input name="rut" value={form.rut || ""} onChange={handleFormChange} required /></label>
              <label className="field-block"><span>Razón Social</span><input name="business_name" value={form.business_name || ""} onChange={handleFormChange} /></label>
              <label className="field-block"><span>Entidad</span><input name="entity" value={form.entity || ""} onChange={handleFormChange} /></label>
              <label className="field-block"><span>Estado Gestión</span>
                <select name="management_status" value={form.management_status || ""} onChange={handleFormChange}>
                  <option value="Pendiente Gestión">Pendiente Gestión</option>
                  <option value="Enviado AFP">Enviado AFP</option>
                  <option value="Observado">Observado</option>
                  <option value="Pagado">Pagado</option>
                  <option value="Rechazado">Rechazado</option>
                </select>
              </label>
              <label className="field-block"><span>Monto Devolución</span><input name="refund_amount" type="number" value={Number(form.refund_amount || 0)} onChange={handleFormChange} /></label>
              <label className="field-block"><span>Mandante</span><input name="mandante" value={form.mandante || ""} onChange={handleFormChange} /></label>
              <label className="field-block"><span>N° Solicitud</span><input name="request_number" value={form.request_number || ""} onChange={handleFormChange} /></label>
              <label className="field-block checkbox"><input name="confirmation_cc" type="checkbox" checked={Boolean(form.confirmation_cc)} onChange={handleFormChange} /><span>Confirmación CC</span></label>
              <label className="field-block checkbox"><input name="confirmation_power" type="checkbox" checked={Boolean(form.confirmation_power)} onChange={handleFormChange} /><span>Confirmación Poder</span></label>
              <label className="field-block form-full"><span>Comentario</span><textarea name="comment" rows={4} value={form.comment || ""} onChange={handleFormChange} /></label>
              <div className="modal-actions form-full">
                <button type="button" className="ghost-btn" onClick={() => setIsFormOpen(false)}>Cancelar</button>
                <button type="submit" className="primary-btn" disabled={saving}>{saving ? "Guardando..." : "Guardar"}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Info({ label, value, full = false }: { label: string; value?: string | null; full?: boolean }) {
  return (
    <div className={full ? "info-card info-full" : "info-card"}>
      <span>{label}</span>
      <strong>{value || "-"}</strong>
    </div>
  );
}

function DocumentRow({ doc }: { doc: CrmDocument }) {
  const fileUrl = `${publicBaseUrl}/storage/${doc.stored_filename}`;
  return (
    <a className="document-row" href={fileUrl} target="_blank" rel="noreferrer">
      <div>
        <strong>{doc.title}</strong>
        <span>{doc.original_filename}</span>
      </div>
      <small>{dateText(doc.created_at)}</small>
    </a>
  );
}
