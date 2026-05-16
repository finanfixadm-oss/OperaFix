import type { RecordItem } from "../../types-records";
import { boolLabel, formatMoney } from "../../utils-record-fields";
import RecordPriorityBadge, { isRecordReadyToManage } from "./RecordPriorityBadge";
import RecordStatusBadge from "./RecordStatusBadge";

function text(value: unknown, fallback = "—") {
  const raw = String(value ?? "").trim();
  return raw || fallback;
}

function normalizeText(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function toBool(value: unknown) {
  if (typeof value === "boolean") return value;
  const normalized = normalizeText(value);
  return normalized === "true" || normalized === "si" || normalized === "sí" || normalized === "1" || normalized === "confirmado" || normalized === "confirmada";
}

function toMoneyNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(
    String(value ?? "")
      .replace(/\$/g, "")
      .replace(/\./g, "")
      .replace(/,/g, ".")
      .replace(/[^0-9.-]/g, "")
  );
  return Number.isFinite(parsed) ? parsed : 0;
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

function buildMissing(record: RecordItem) {
  const row: any = record;
  const missing: string[] = [];
  const hasCc = toBool(row.confirmacion_cc ?? row.confirmation_cc);
  const hasPower = toBool(row.confirmacion_poder ?? row.confirmation_power);
  const amount = toMoneyNumber(row.monto_devolucion ?? row.refund_amount);
  const status = normalizeText(row.estado_gestion ?? row.management_status);

  if (!hasPower) missing.push("Poder confirmado");
  if (!hasCc) missing.push("Cuenta corriente confirmada");
  if (amount <= 0) missing.push("Monto devolución mayor a cero");
  if (!status.includes("pendiente")) missing.push("Estado pendiente de gestión");

  return missing;
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
  const ready = isRecordReadyToManage(record);
  const missing = buildMissing(record);

  return (
    <div className="record-detail-overlay-pro" onClick={onClose}>
      <aside className="record-detail-panel-pro" onClick={(event) => event.stopPropagation()}>
        <header className="record-panel-header record-panel-header-premium">
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
          <span className={ready ? "record-ready-pill ready" : "record-ready-pill blocked"}>{ready ? "Listo para gestionar" : "No listo"}</span>
        </div>

        <section className="record-panel-ai-card">
          <strong>Análisis OperaFix IA</strong>
          {ready ? (
            <p>Este caso está listo para gestionar: tiene poder confirmado, cuenta corriente confirmada, monto devolución mayor a cero y estado pendiente de gestión. Siguiente acción sugerida: validar antecedentes y avanzar gestión AFP.</p>
          ) : (
            <p>Este caso todavía no está listo para gestionar. Debes revisar: <strong>{missing.join(", ") || "antecedentes operacionales"}</strong>.</p>
          )}
        </section>

        <section className="record-panel-kpis">
          <div><span>Monto devolución</span><strong>{formatMoney(record.monto_devolucion)}</strong></div>
          <div><span>CC</span><strong>{boolLabel(record.confirmacion_cc)}</strong></div>
          <div><span>Poder</span><strong>{boolLabel(record.confirmacion_poder)}</strong></div>
        </section>

        <div className="record-panel-tabs-pro">
          <section>
            <h3>Resumen operacional</h3>
            <div className="record-panel-grid">
              <Field label="Mandante" value={record.mandante?.name || (record as any).mandante} />
              <Field label="Razón Social" value={record.razon_social || record.company?.razon_social} />
              <Field label="RUT" value={record.rut || record.company?.rut} />
              <Field label="AFP / Entidad" value={record.entidad || record.lineAfp?.afp_name} />
              <Field label="Estado Gestión" value={record.estado_gestion} />
              <Field label="N° Solicitud" value={record.numero_solicitud} />
            </div>
          </section>

          <section>
            <h3>Bloqueos y condiciones</h3>
            <div className="record-panel-grid">
              <Field label="Cuenta corriente" value={boolLabel(record.confirmacion_cc)} />
              <Field label="Poder" value={boolLabel(record.confirmacion_poder)} />
              <Field label="Monto válido" value={toMoneyNumber(record.monto_devolucion) > 0 ? "Sí" : "No"} />
              <Field label="Estado pendiente" value={normalizeText(record.estado_gestion).includes("pendiente") ? "Sí" : "No"} />
              <Field label="Documentos" value={docs.length ? `${docs.length} documento(s)` : "Sin documentos"} />
              <Field label="Resultado" value={ready ? "Listo para gestionar" : "No listo"} />
            </div>
          </section>

          <section>
            <h3>Datos principales</h3>
            <div className="record-panel-grid">
              <Field label="Grupo" value={record.grupo_empresa || record.group?.name} />
              <Field label="Tipo" value={record.management_type} />
              <Field label="Propietario" value={record.owner_name} />
              <Field label="Mes producción" value={record.mes_produccion_2026} />
              <Field label="Acceso portal" value={(record as any).acceso_portal} />
              <Field label="Envío AFP" value={(record as any).envio_afp} />
            </div>
          </section>

          <section>
            <h3>Montos y facturación</h3>
            <div className="record-panel-grid">
              <Field label="Monto pagado" value={formatMoney(record.monto_pagado)} />
              <Field label="Monto cliente" value={formatMoney(record.monto_cliente)} />
              <Field label="Monto Finanfix" value={formatMoney(record.monto_finanfix_solutions)} />
              <Field label="Monto real cliente" value={formatMoney(record.monto_real_cliente)} />
              <Field label="Monto real Finanfix" value={formatMoney(record.monto_real_finanfix_solutions)} />
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
              <Field label="Fecha rechazo" value={dateText(record.fecha_rechazo)} />
              <Field label="Última actividad" value={dateText(record.last_activity_at || record.updated_at)} />
              <Field label="Creación" value={dateText(record.created_at)} />
            </div>
          </section>

          <section>
            <h3>Documentos</h3>
            {docs.length ? (
              <div className="record-panel-list">
                {docs.slice(0, 12).map((doc) => (
                  <a key={doc.id} href={doc.file_url} target="_blank" rel="noreferrer">{doc.file_name || doc.category || "Documento"}</a>
                ))}
              </div>
            ) : <p className="record-panel-muted">No hay documentos asociados.</p>}
          </section>

          <section>
            <h3>Timeline y notas</h3>
            {activities.length || notes.length ? (
              <div className="record-panel-timeline">
                {activities.slice(0, 8).map((activity) => (
                  <div key={activity.id}><strong>{activity.activity_type || "Actividad"}</strong><span>{activity.description || activity.status || "—"}</span></div>
                ))}
                {notes.slice(0, 6).map((note) => (
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
