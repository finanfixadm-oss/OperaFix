import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  addLmRecordNote,
  createLmRecord,
  fetchLmRecordDetail,
  fetchLmRecords,
  fileUrl,
  updateLmRecord,
  uploadDocument
} from "../api";
import type { DocumentItem, LmRecord, LmRecordDetail, LmRecordListResponse } from "../types";

const initialForm: Partial<LmRecord> = {
  rut: "",
  business_name: "",
  entity: "AFP CAPITAL",
  management_status: "Pendiente Gestión",
  refund_amount: 0,
  confirmation_cc: false,
  confirmation_power: false,
  mandante: "",
  comment: "",
  portal_access: "Sí"
};

const currency = (value: string | number | null | undefined) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(Number(value || 0));

function boolLabel(value?: boolean | null) {
  return value ? "Sí" : "No";
}

export default function LmRecordsPage() {
  const [data, setData] = useState<LmRecordListResponse | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<LmRecordDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"resumen" | "documentos" | "notas" | "actividad">("resumen");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<LmRecord | null>(null);
  const [form, setForm] = useState<Partial<LmRecord>>(initialForm);
  const [noteText, setNoteText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [filters, setFilters] = useState({
    q: "",
    entity: "",
    management_status: "",
    confirmation_cc: "",
    confirmation_power: "",
    page: 1,
    pageSize: 15
  });

  const loadRecords = async () => {
    setLoading(true);
    try {
      const response = await fetchLmRecords(filters);
      setData(response);
      if (!selectedId && response.items.length > 0) {
        setSelectedId(response.items[0].id);
      }
      if (selectedId && !response.items.some((item) => item.id === selectedId) && response.items[0]) {
        setSelectedId(response.items[0].id);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.page, filters.pageSize, filters.entity, filters.management_status, filters.confirmation_cc, filters.confirmation_power]);

  useEffect(() => {
    const timeout = setTimeout(() => loadRecords(), 350);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.q]);

  useEffect(() => {
    if (!selectedId) return;
    fetchLmRecordDetail(selectedId).then(setDetail).catch(() => setDetail(null));
  }, [selectedId]);

  const rows = data?.items || [];
  const currentPage = data?.pagination.page || 1;
  const totalPages = data?.pagination.totalPages || 1;

  const summaryCards = useMemo(() => {
    const items = rows;
    return {
      total: data?.pagination.total || 0,
      totalRefund: items.reduce((sum, item) => sum + Number(item.refund_amount || 0), 0),
      readyForAfp: items.filter((item) => item.confirmation_cc && item.confirmation_power).length
    };
  }, [data, rows]);

  const openCreate = () => {
    setEditing(null);
    setForm(initialForm);
    setShowModal(true);
  };

  const openEdit = () => {
    if (!detail) return;
    setEditing(detail);
    setForm(detail);
    setShowModal(true);
  };

  const submitForm = async (event: FormEvent) => {
    event.preventDefault();
    try {
      if (editing?.id) {
        await updateLmRecord(editing.id, form);
      } else {
        await createLmRecord(form);
      }
      setShowModal(false);
      await loadRecords();
      if (editing?.id) setSelectedId(editing.id);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const submitNote = async () => {
    if (!detail || !noteText.trim()) return;
    await addLmRecordNote(detail.id, noteText);
    setNoteText("");
    const updated = await fetchLmRecordDetail(detail.id);
    setDetail(updated);
    loadRecords();
  };

  const onUpload = async (file: File) => {
    if (!detail) return;
    setUploading(true);
    try {
      await uploadDocument(file, {
        title: file.name,
        related_module: "lm_records",
        related_record_id: detail.id
      });
      const updated = await fetchLmRecordDetail(detail.id);
      setDetail(updated);
      setActiveTab("documentos");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="page-stack">
      <div className="table-toolbar">
        <div>
          <h3>Registros de empresas</h3>
          <p>Filtra, revisa y abre el detalle completo del registro en una vista lateral.</p>
        </div>
        <div className="table-actions">
          <button className="ghost-btn" onClick={() => loadRecords()}>
            Actualizar
          </button>
          <button className="primary-btn" onClick={openCreate}>
            Crear registro
          </button>
        </div>
      </div>

      <div className="kpi-grid compact-3">
        <div className="mini-kpi"><span>Registros visibles</span><strong>{summaryCards.total}</strong></div>
        <div className="mini-kpi"><span>Monto devolución</span><strong>{currency(summaryCards.totalRefund)}</strong></div>
        <div className="mini-kpi"><span>Listos para AFP</span><strong>{summaryCards.readyForAfp}</strong></div>
      </div>

      <div className="records-layout">
        <aside className="filters-panel">
          <h4>Filtrar registros</h4>
          <label>
            Buscar
            <input
              value={filters.q}
              onChange={(e) => setFilters((s) => ({ ...s, q: e.target.value, page: 1 }))}
              placeholder="RUT, razón social, solicitud"
            />
          </label>
          <label>
            Entidad
            <select
              value={filters.entity}
              onChange={(e) => setFilters((s) => ({ ...s, entity: e.target.value, page: 1 }))}
            >
              <option value="">Todas</option>
              {(data?.filters.entities || []).map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            Estado Gestión
            <select
              value={filters.management_status}
              onChange={(e) => setFilters((s) => ({ ...s, management_status: e.target.value, page: 1 }))}
            >
              <option value="">Todos</option>
              {(data?.filters.statuses || []).map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            Confirmación CC
            <select value={filters.confirmation_cc} onChange={(e) => setFilters((s) => ({ ...s, confirmation_cc: e.target.value, page: 1 }))}>
              <option value="">Todos</option>
              <option value="true">Sí</option>
              <option value="false">No</option>
            </select>
          </label>
          <label>
            Confirmación Poder
            <select value={filters.confirmation_power} onChange={(e) => setFilters((s) => ({ ...s, confirmation_power: e.target.value, page: 1 }))}>
              <option value="">Todos</option>
              <option value="true">Sí</option>
              <option value="false">No</option>
            </select>
          </label>
          <button
            className="ghost-btn full"
            onClick={() => setFilters({ q: "", entity: "", management_status: "", confirmation_cc: "", confirmation_power: "", page: 1, pageSize: 15 })}
          >
            Limpiar filtros
          </button>
        </aside>

        <section className="records-table-panel">
          <div className="table-scroll">
            <table className="crm-table selectable">
              <thead>
                <tr>
                  <th>RUT</th>
                  <th>Razón Social</th>
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
                  <tr><td colSpan={7}>No hay resultados</td></tr>
                ) : rows.map((row) => (
                  <tr
                    key={row.id}
                    className={selectedId === row.id ? "active-row" : ""}
                    onClick={() => setSelectedId(row.id)}
                  >
                    <td>{row.rut}</td>
                    <td>{row.business_name || row.search_group || ""}</td>
                    <td>{row.entity || ""}</td>
                    <td><span className="status-chip">{row.management_status || "Sin estado"}</span></td>
                    <td>{currency(row.refund_amount)}</td>
                    <td>{boolLabel(row.confirmation_cc)}</td>
                    <td>{boolLabel(row.confirmation_power)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination-row">
            <span>Registros totales {data?.pagination.total || 0}</span>
            <div className="pagination-controls">
              <button className="ghost-btn" disabled={currentPage <= 1} onClick={() => setFilters((s) => ({ ...s, page: s.page - 1 }))}>Anterior</button>
              <span>{currentPage} / {totalPages}</span>
              <button className="ghost-btn" disabled={currentPage >= totalPages} onClick={() => setFilters((s) => ({ ...s, page: s.page + 1 }))}>Siguiente</button>
            </div>
          </div>
        </section>

        <aside className="detail-panel">
          {!detail ? (
            <div className="empty-detail">Selecciona una línea para ver toda la información del registro.</div>
          ) : (
            <>
              <div className="detail-header">
                <div>
                  <h4>{detail.business_name || detail.rut}</h4>
                  <p>{detail.entity || "Sin entidad"} · {detail.management_status || "Sin estado"}</p>
                </div>
                <button className="ghost-btn" onClick={openEdit}>Editar</button>
              </div>

              <div className="detail-tabs">
                {[
                  ["resumen", "Resumen"],
                  ["documentos", "Documentos"],
                  ["notas", "Notas"],
                  ["actividad", "Actividad"]
                ].map(([key, label]) => (
                  <button
                    key={key}
                    className={activeTab === key ? "tab-btn active" : "tab-btn"}
                    onClick={() => setActiveTab(key as any)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {activeTab === "resumen" ? (
                <div className="detail-body">
                  <DetailItem label="RUT" value={detail.rut} />
                  <DetailItem label="Razón Social" value={detail.business_name} />
                  <DetailItem label="Entidad" value={detail.entity} />
                  <DetailItem label="Estado Gestión" value={detail.management_status} />
                  <DetailItem label="Monto Devolución" value={currency(detail.refund_amount)} />
                  <DetailItem label="Confirmación CC" value={boolLabel(detail.confirmation_cc)} />
                  <DetailItem label="Confirmación Poder" value={boolLabel(detail.confirmation_power)} />
                  <DetailItem label="N° Solicitud" value={detail.request_number} />
                  <DetailItem label="Banco" value={detail.bank_name} />
                  <DetailItem label="Cuenta" value={detail.account_number} />
                  <DetailItem label="Tipo Cuenta" value={detail.account_type} />
                  <DetailItem label="Mandante" value={detail.mandante} />
                  <DetailItem label="Comentario" value={detail.comment} multiline />
                </div>
              ) : null}

              {activeTab === "documentos" ? (
                <div className="detail-body">
                  <label className="upload-box">
                    <span>{uploading ? "Cargando..." : "Subir documento al registro"}</span>
                    <input
                      type="file"
                      hidden
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) onUpload(file);
                      }}
                    />
                  </label>
                  <DocumentList documents={detail.documents} />
                </div>
              ) : null}

              {activeTab === "notas" ? (
                <div className="detail-body">
                  <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Escribe una nota" rows={4} />
                  <button className="primary-btn small" onClick={submitNote}>Guardar nota</button>
                  <div className="timeline-list">
                    {detail.notes.map((note) => (
                      <div key={note.id} className="timeline-item">
                        <strong>{new Date(note.created_at).toLocaleString("es-CL")}</strong>
                        <p>{note.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {activeTab === "actividad" ? (
                <div className="detail-body">
                  <div className="timeline-list">
                    {detail.activities.map((item) => (
                      <div key={item.id} className="timeline-item">
                        <strong>{item.activity_type}</strong>
                        <small>{new Date(item.created_at).toLocaleString("es-CL")}</small>
                        <p>{item.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </aside>
      </div>

      {showModal ? (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3>{editing ? "Editar registro" : "Crear registro"}</h3>
              <button className="ghost-btn" onClick={() => setShowModal(false)}>Cerrar</button>
            </div>
            <form className="form-grid" onSubmit={submitForm}>
              <label>RUT<input required value={form.rut || ""} onChange={(e) => setForm((s) => ({ ...s, rut: e.target.value }))} /></label>
              <label>Razón Social<input value={form.business_name || ""} onChange={(e) => setForm((s) => ({ ...s, business_name: e.target.value }))} /></label>
              <label>Entidad<select value={form.entity || ""} onChange={(e) => setForm((s) => ({ ...s, entity: e.target.value }))}><option>AFP CAPITAL</option><option>AFP MODELO</option><option>AFP CUPRUM</option></select></label>
              <label>Estado Gestión<select value={form.management_status || ""} onChange={(e) => setForm((s) => ({ ...s, management_status: e.target.value }))}><option>Pendiente Gestión</option><option>Enviado AFP</option><option>Observado</option><option>Pagado</option><option>Rechazado</option></select></label>
              <label>Monto Devolución<input type="number" value={Number(form.refund_amount || 0)} onChange={(e) => setForm((s) => ({ ...s, refund_amount: Number(e.target.value) }))} /></label>
              <label>Mandante<input value={form.mandante || ""} onChange={(e) => setForm((s) => ({ ...s, mandante: e.target.value }))} /></label>
              <label className="checkbox-field"><input type="checkbox" checked={Boolean(form.confirmation_cc)} onChange={(e) => setForm((s) => ({ ...s, confirmation_cc: e.target.checked }))} /> Confirmación CC</label>
              <label className="checkbox-field"><input type="checkbox" checked={Boolean(form.confirmation_power)} onChange={(e) => setForm((s) => ({ ...s, confirmation_power: e.target.checked }))} /> Confirmación Poder</label>
              <label className="full-width">Comentario<textarea rows={4} value={form.comment || ""} onChange={(e) => setForm((s) => ({ ...s, comment: e.target.value }))} /></label>
              <div className="form-actions full-width">
                <button type="button" className="ghost-btn" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="primary-btn">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DetailItem({ label, value, multiline = false }: { label: string; value?: string | null; multiline?: boolean }) {
  return (
    <div className={multiline ? "detail-item full-width" : "detail-item"}>
      <span>{label}</span>
      <strong>{value || "-"}</strong>
    </div>
  );
}

function DocumentList({ documents }: { documents: DocumentItem[] }) {
  if (!documents.length) return <div className="empty-inline">No hay documentos cargados.</div>;
  return (
    <div className="timeline-list">
      {documents.map((doc) => (
        <div key={doc.id} className="timeline-item">
          <strong>{doc.title}</strong>
          <small>{new Date(doc.created_at).toLocaleString("es-CL")}</small>
          <a href={fileUrl(doc)} target="_blank" rel="noreferrer" className="text-link">Abrir archivo</a>
        </div>
      ))}
    </div>
  );
}
