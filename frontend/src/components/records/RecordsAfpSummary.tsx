export type RecordsAfpSummaryGroup = {
  entity: string;
  amount: number;
  count: number;
  ready: number;
  pending: number;
  paid: number;
  blockedPower: number;
  blockedCc: number;
};

function money(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function RecordsAfpSummary({
  groups,
  selectedAfp,
  onSelect,
  onClear,
}: {
  groups: RecordsAfpSummaryGroup[];
  selectedAfp: string;
  onSelect: (entity: string) => void;
  onClear: () => void;
}) {
  const totalAmount = groups.reduce((sum, group) => sum + group.amount, 0);
  const totalCount = groups.reduce((sum, group) => sum + group.count, 0);

  return (
    <section className="records-afp-summary">
      <div className="records-afp-summary-head">
        <div>
          <span className="records-afp-eyebrow">Resumen por AFP</span>
          <h3>Montos agrupados por entidad</h3>
          <p>
            Los montos respetan la vista, búsqueda y filtros rápidos activos. Haz click en una AFP
            o en su monto para ver el detalle en la tabla.
          </p>
        </div>

        <div className="records-afp-total">
          <span>Total visible</span>
          <strong>{money(totalAmount)}</strong>
          <small>{totalCount} casos</small>
        </div>

        {selectedAfp && (
          <button className="zoho-btn" onClick={onClear}>
            Limpiar AFP
          </button>
        )}
      </div>

      {groups.length === 0 ? (
        <div className="records-afp-empty">No hay registros para agrupar con los filtros actuales.</div>
      ) : (
        <div className="records-afp-grid">
          {groups.map((group) => {
            const active = selectedAfp === group.entity;

            return (
              <button
                key={group.entity}
                type="button"
                className={`records-afp-card ${active ? "active" : ""}`}
                onClick={() => onSelect(group.entity)}
                title={`Ver detalle de ${group.entity}`}
              >
                <div className="records-afp-card-top">
                  <strong>{group.entity}</strong>
                  <span>{group.count} casos</span>
                </div>

                <div className="records-afp-amount">{money(group.amount)}</div>

                <div className="records-afp-metrics">
                  <span><b>{group.ready}</b> listos</span>
                  <span><b>{group.pending}</b> pendientes</span>
                  <span><b>{group.paid}</b> pagados</span>
                  <span><b>{group.blockedPower}</b> sin poder</span>
                  <span><b>{group.blockedCc}</b> sin CC</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
