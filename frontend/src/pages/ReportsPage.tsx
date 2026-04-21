import { useEffect, useMemo, useState } from "react";
import axios from "axios";

type LmRecord = {
  id: string;
  rut?: string | null;
  business_name?: string | null;
  entity?: string | null;
  management_status?: string | null;
  mandante?: string | null;
  confirmation_cc?: boolean | null;
  confirmation_power?: boolean | null;
  refund_amount?: number | string | null;
  actual_paid_amount?: number | string | null;
  request_number?: string | null;
  worker_status?: string | null;
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

const toNumber = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const toYesNo = (value: boolean | null | undefined) => (value ? "Sí" : "No");

export default function ReportsPage() {
  const [rows, setRows] = useState<LmRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [entity, setEntity] = useState("");
  const [status, setStatus] = useState("");
  const [mandante, setMandante] = useState("");

  const [filterOptions, setFilterOptions] = useState<{
    entities: string[];
    statuses: string[];
    mandantes: string[];
  }>({
    entities: [],
    statuses: [],
    mandantes: [],
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const params = new URLSearchParams();
        params.set("page", "1");
        params.set("pageSize", "100");

        if (search.trim()) params.set("search", search.trim());
        if (entity) params.set("entity", entity);
        if (status) params.set("management_status", status);
        if (mandante) params.set("mandante", mandante);

        const { data } = await axios.get<LmRecordsResponse>(
          `${API_BASE}/api/lm-records?${params.toString()}`
        );

        if (!cancelled) {
          setRows(Array.isArray(data.items) ? data.items : []);
          setFilterOptions({
            entities: data.filterOptions?.entities || [],
            statuses: data.filterOptions?.statuses || [],
            mandantes: data.filterOptions?.mandantes || [],
          });
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setRows([]);
          setError("No se pudieron cargar los informes.");
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
  }, [search, entity, status, mandante]);

  const totalMonto = useMemo(() => {
    return rows.reduce((sum, row) => sum + toNumber(row.actual_paid_amount), 0);
  }, [rows]);

  const exportCsv = () => {
    const headers = [
      "RUT",
      "Razón Social",
      "Entidad",
      "Estado Gestión",
      "Mandante",
      "Confirmación CC",
      "Confirmación Poder",
      "Monto Devolución",
      "Monto Pagado",
      "N° Solicitud",
      "Estado Trabajador",
    ];

    const lines = rows.map((row) =>
      [
        row.rut || "",
        row.business_name || "",
        row.entity || "",
        row.management_status || "",
        row.mandante || "",
        toYesNo(row.confirmation_cc),
        toYesNo(row.confirmation_power),
        toNumber(row.refund_amount),
        toNumber(row.actual_paid_amount),
        row.request_number || "",
        row.worker_status || "",
      ]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(",")
    );

    const csv = [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "reporte_lm_records.csv";
    a.click();

    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ marginBottom: 6 }}>Informes</h1>
          <p style={{ marginTop: 0, opacity: 0.8 }}>
            Reporte operacional de registros LM.
          </p>
        </div>

        <button
          onClick={exportCsv}
          style={{
            border: "none",
            background: "#1d4ed8",
            color: "#fff",
            padding: "10px 16px",
            borderRadius: 10,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Exportar CSV
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr 1fr 1fr",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por RUT, empresa, grupo o solicitud"
          style={inputStyle}
        />

        <select value={entity} onChange={(e) => setEntity(e.target.value)} style={inputStyle}>
          <option value="">Todas las entidades</option>
          {filterOptions.entities.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <select value={status} onChange={(e) => setStatus(e.target.value)} style={inputStyle}>
          <option value="">Todos los estados</option>
          {filterOptions.statuses.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <select
          value={mandante}
          onChange={(e) => setMandante(e.target.value)}
          style={inputStyle}
        >
          <option value="">Todos los mandantes</option>
          {filterOptions.mandantes.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      {loading && <p>Cargando informes...</p>}
      {error && <p style={{ color: "crimson" }}>{error}</p>}

      {!loading && !error && (
        <>
          <div
            style={{
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
            }}
          >
            <strong>Total registros:</strong> {rows.length} &nbsp; | &nbsp;
            <strong>Monto total pagado:</strong> {currency(totalMonto)}
          </div>

          <div
            style={{
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              overflow: "auto",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>RUT</th>
                  <th style={thStyle}>Razón Social</th>
                  <th style={thStyle}>Entidad</th>
                  <th style={thStyle}>Estado Gestión</th>
                  <th style={thStyle}>Mandante</th>
                  <th style={thStyle}>CC</th>
                  <th style={thStyle}>Poder</th>
                  <th style={thStyle}>Monto Devolución</th>
                  <th style={thStyle}>Monto Pagado</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td style={tdStyle}>{row.rut || "-"}</td>
                    <td style={tdStyle}>{row.business_name || "-"}</td>
                    <td style={tdStyle}>{row.entity || "-"}</td>
                    <td style={tdStyle}>{row.management_status || "-"}</td>
                    <td style={tdStyle}>{row.mandante || "-"}</td>
                    <td style={tdStyle}>{toYesNo(row.confirmation_cc)}</td>
                    <td style={tdStyle}>{toYesNo(row.confirmation_power)}</td>
                    <td style={tdStyle}>{currency(toNumber(row.refund_amount))}</td>
                    <td style={tdStyle}>{currency(toNumber(row.actual_paid_amount))}</td>
                  </tr>
                ))}

                {rows.length === 0 && (
                  <tr>
                    <td style={tdStyle} colSpan={9}>
                      No hay datos para mostrar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #d1d5db",
  background: "#fff",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "12px 14px",
  borderBottom: "1px solid #e5e7eb",
  background: "#f8fafc",
  fontSize: 14,
  fontWeight: 600,
};

const tdStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderBottom: "1px solid #f1f5f9",
  fontSize: 14,
};