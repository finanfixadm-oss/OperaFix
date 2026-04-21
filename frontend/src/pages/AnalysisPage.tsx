import { useEffect, useMemo, useState } from "react";
import axios from "axios";

type LmRecord = {
  id: string;
  rut?: string | null;
  business_name?: string | null;
  entity?: string | null;
  management_status?: string | null;
  mandante?: string | null;
  actual_paid_amount?: number | string | null;
  refund_amount?: number | string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type LmRecordsResponse = {
  items: LmRecord[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  filterOptions: {
    entities: string[];
    statuses: string[];
    mandantes: string[];
  };
};

const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

const currency = (value: number) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value || 0);

const safeNumber = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

export default function AnalysisPage() {
  const [rows, setRows] = useState<LmRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const { data } = await axios.get<LmRecordsResponse>(
          `${API_BASE}/api/lm-records?page=1&pageSize=200`
        );

        if (!cancelled) {
          setRows(Array.isArray(data.items) ? data.items : []);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setRows([]);
          setError("No se pudo cargar el análisis.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const totalRegistros = rows.length;

  const totalPagado = useMemo(() => {
    return rows.reduce((sum, item) => sum + safeNumber(item.actual_paid_amount), 0);
  }, [rows]);

  const totalDevolucion = useMemo(() => {
    return rows.reduce((sum, item) => sum + safeNumber(item.refund_amount), 0);
  }, [rows]);

  const porEntidad = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();

    rows.forEach((item) => {
      const key = item.entity?.trim() || "Sin entidad";
      const current = map.get(key) || { count: 0, total: 0 };

      current.count += 1;
      current.total += safeNumber(item.actual_paid_amount);

      map.set(key, current);
    });

    return Array.from(map.entries())
      .map(([entity, value]) => ({
        entity,
        count: value.count,
        total: value.total,
      }))
      .sort((a, b) => b.total - a.total);
  }, [rows]);

  const porEstado = useMemo(() => {
    const map = new Map<string, number>();

    rows.forEach((item) => {
      const key = item.management_status?.trim() || "Sin estado";
      map.set(key, (map.get(key) || 0) + 1);
    });

    return Array.from(map.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);
  }, [rows]);

  const porMandante = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();

    rows.forEach((item) => {
      const key = item.mandante?.trim() || "Sin mandante";
      const current = map.get(key) || { count: 0, total: 0 };

      current.count += 1;
      current.total += safeNumber(item.actual_paid_amount);

      map.set(key, current);
    });

    return Array.from(map.entries())
      .map(([mandante, value]) => ({
        mandante,
        count: value.count,
        total: value.total,
      }))
      .sort((a, b) => b.total - a.total);
  }, [rows]);

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginBottom: 8 }}>Análisis</h1>
      <p style={{ marginTop: 0, opacity: 0.8 }}>
        Resumen general de registros LM cargados en OperaFix.
      </p>

      {loading && <p>Cargando análisis...</p>}
      {error && <p style={{ color: "crimson" }}>{error}</p>}

      {!loading && !error && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(200px, 1fr))",
              gap: 16,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 16,
              }}
            >
              <div style={{ fontSize: 13, opacity: 0.7 }}>Total registros</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{totalRegistros}</div>
            </div>

            <div
              style={{
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 16,
              }}
            >
              <div style={{ fontSize: 13, opacity: 0.7 }}>Monto real pagado</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>
                {currency(totalPagado)}
              </div>
            </div>

            <div
              style={{
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 16,
              }}
            >
              <div style={{ fontSize: 13, opacity: 0.7 }}>Monto devolución</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>
                {currency(totalDevolucion)}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
              marginBottom: 24,
            }}
          >
            <section
              style={{
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 16,
              }}
            >
              <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 20 }}>
                Por entidad
              </h2>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Entidad</th>
                      <th style={thStyle}>Registros</th>
                      <th style={thStyle}>Monto pagado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {porEntidad.map((item) => (
                      <tr key={item.entity}>
                        <td style={tdStyle}>{item.entity}</td>
                        <td style={tdStyle}>{item.count}</td>
                        <td style={tdStyle}>{currency(item.total)}</td>
                      </tr>
                    ))}
                    {porEntidad.length === 0 && (
                      <tr>
                        <td style={tdStyle} colSpan={3}>
                          Sin datos.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section
              style={{
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 16,
              }}
            >
              <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 20 }}>
                Por estado de gestión
              </h2>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Estado</th>
                      <th style={thStyle}>Cantidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {porEstado.map((item) => (
                      <tr key={item.status}>
                        <td style={tdStyle}>{item.status}</td>
                        <td style={tdStyle}>{item.count}</td>
                      </tr>
                    ))}
                    {porEstado.length === 0 && (
                      <tr>
                        <td style={tdStyle} colSpan={2}>
                          Sin datos.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <section
            style={{
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: 16,
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 20 }}>
              Por mandante
            </h2>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Mandante</th>
                    <th style={thStyle}>Registros</th>
                    <th style={thStyle}>Monto pagado</th>
                  </tr>
                </thead>
                <tbody>
                  {porMandante.map((item) => (
                    <tr key={item.mandante}>
                      <td style={tdStyle}>{item.mandante}</td>
                      <td style={tdStyle}>{item.count}</td>
                      <td style={tdStyle}>{currency(item.total)}</td>
                    </tr>
                  ))}
                  {porMandante.length === 0 && (
                    <tr>
                      <td style={tdStyle} colSpan={3}>
                        Sin datos.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 12px",
  borderBottom: "1px solid #e5e7eb",
  fontWeight: 600,
  fontSize: 14,
};

const tdStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderBottom: "1px solid #f1f5f9",
  fontSize: 14,
};