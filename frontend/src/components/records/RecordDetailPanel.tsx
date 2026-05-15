import type { RecordItem } from "../../types-records";
import { boolLabel, formatMoney } from "../../utils-record-fields";
import RecordPriorityBadge from "./RecordPriorityBadge";
import RecordStatusBadge from "./RecordStatusBadge";

function text(value: unknown, fallback = "—") {
  const raw = String(value ?? "").trim();
  return raw || fallback;
}

function dateText(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("es-CL");
}

function Field({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="record-panel-field">
      <span>{label}</span>
      <strong>{text(value)}</strong>
    </div>
  );
}

export default function RecordDetailPanel({
  record,
  onClose,
  onOpenFull,
}: {
  record: RecordItem | null;
  onClose: () => void;
  onOpenFull: (record: RecordItem) => void;
}) {
  if (!record) return null;

  const docs = record.documents || [];
  const activities = record.activities || [];
  const notes = record.notes || [];
  const missing: string[] = [];
  if (record.confirmacion_cc !== true) missing.push("Cuenta corriente");
  if (record.confirmacion_poder !== true) missing.push("Poder");
  if (!docs.length) missing.push("Documentos");

  const ready = missing.length === 0 && Number(record.monto_devolucion || 0) > 0;

  return (
    <div className="record-detail-overlay-pro" onClick={onClose}>
      <aside className="record-detail-panel-pro" onClick={(event) => event.stopPropagation()}>
        <header className="record-panel-header">
          <div>
            <span className="record-panel-eyebrow">Ficha de gestión</span>
            <h2>{record.razon_social || record.company?.razon_social || "Registro sin empresa"}</h2>
            <p>{record.rut || record.company?.rut || "Sin RUT"} · {record.entidad || record.lineAfp?.afp_name || "Sin AFP"}</p>
          </div>
          <button className="record-panel-close" onClick={onClose} type="button">×</button>
        </header>

        <div className="record-panel-badges">
          <RecordStatusBadge status={record.estado_gestion} />
          <RecordPriorityBadge row={record} />
          <span className={ready ? "record-ready-pill ready" : "record-ready-pill blocked"}>{ready ? "Listo para gestionar" : "Bloqueado"}</span>
        </div>

        <section className="record-panel-ai-card">
          <strong>Análisis OperaFix IA</strong>
          {ready ? (
            <p>Este caso está en buenas condiciones operativas: tiene monto, cuenta corriente, poder y documentos asociados. Siguiente acción sugerida: revisar antecedentes y avanzar gestión AFP.</p>
          ) : (
            <p>Este caso requiere completar antecedentes antes de gestionarlo. Faltante principal: <strong>{missing.join(", ")}</strong>.</p>
          )}
        </section>

        <section className="record-panel-kpis">
          <div><span>Monto devolución</span><strong>{formatMoney(record.monto_devolucion)}</strong></div>
          <div><span>CC</span><strong>{boolLabel(record.confirmacion_cc)}</strong></div>
          <div><span>Poder</span><strong>{boolLabel(record.confirmacion_poder)}</strong></div>
        </section>

        <div className="record-panel-tabs-pro">
          <section>
            <h3>Datos principales</h3>
            <div className="record-panel-grid">
              <Field label="Mandante" value={record.mandante?.name || (record as any).mandante} />
              <Field label="Grupo" value={record.grupo_empresa || record.group?.name} />
              <Field label="N° Solicitud" value={record.numero_solicitud} />
              <Field label="Tipo" value={record.management_type} />
              <Field label="Propietario" value={record.owner_name} />
              <Field label="Mes producción" value={record.mes_produccion_2026} />
            </div>
          </section>

          <section>
            <h3>Montos y facturación</h3>
            <div className="record-panel-grid">
              <Field label="Monto pagado" value={formatMoney(record.monto_pagado)} />
              <Field label="Monto cliente" value={formatMoney(record.monto_cliente)} />
              <Field label="Monto Finanfix" value={formatMoney(record.monto_finanfix_solutions)} />
              <Field label="FEE" value={formatMoney(record.fee)} />
              <Field label="N° Factura" value={record.numero_factura} />
              <Field label="N° OC" value={record.numero_oc} />
            </div>
          </section>

          <section>
            <h3>Fechas operacionales</h3>
            <div className="record-panel-grid">
              <Field label="Presentación AFP" value={dateText(record.fecha_presentacion_afp)} />
              <Field label="Ingreso AFP" value={dateText(record.fecha_ingreso_afp)} />
              <Field label="Pago AFP" value={dateText(record.fecha_pago_afp)} />
              <Field label="Última actividad" value={dateText(record.last_activity_at || record.updated_at)} />
            </div>
          </section>

          <section>
            <h3>Documentos</h3>
            {docs.length ? (
              <div className="record-panel-list">
                {docs.slice(0, 8).map((doc) => (
                  <a key={doc.id} href={doc.file_url} target="_blank" rel="noreferrer">{doc.file_name || doc.category}</a>
                ))}
              </div>
            ) : <p className="record-panel-muted">No hay documentos asociados.</p>}
          </section>

          <section>
            <h3>Timeline</h3>
            {activities.length || notes.length ? (
              <div className="record-panel-timeline">
                {activities.slice(0, 6).map((activity) => (
                  <div key={activity.id}><strong>{activity.activity_type || "Actividad"}</strong><span>{activity.description || activity.status || "—"}</span></div>
                ))}
                {notes.slice(0, 4).map((note) => (
                  <div key={note.id}><strong>Nota</strong><span>{note.content}</span></div>
                ))}
              </div>
            ) : <p className="record-panel-muted">Sin trazabilidad cargada.</p>}
          </section>
        </div>

        <footer className="record-panel-footer">
          <button className="zoho-btn" onClick={onClose} type="button">Cerrar</button>
          <button className="zoho-btn zoho-btn-primary" onClick={() => onOpenFull(record)} type="button">Abrir ficha completa</button>
        </footer>
      </aside>
    </div>
  );
}
