import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ModuleFilterPanel from "../components/ModuleFilterPanel";
import ZohoModal from "../components/ZohoModal";
import { fetchJson, postJson } from "../api";
import type { FilterFieldDefinition, FilterRule } from "../types";

type Management = {
  id: string;
  type?: string;
  company_name?: string;
  rut?: string;
  afp?: string;
  entity?: string;
  status?: string;
  request_number?: string;
  amount?: number;
  paid_amount?: number;
  bank?: string;
};

function getValueByPath(obj: any, path: string) {
  return path.split(".").reduce((acc, key) => acc?.[key], obj);
}

function matchRule(value: any, rule: FilterRule) {
  const v = String(value ?? "").toLowerCase();
  const q = String(rule.value ?? "").toLowerCase();

  switch (rule.operator) {
    case "equals":
      return v === q;
    case "contains":
      return v.includes(q);
    case "starts_with":
      return v.startsWith(q);
    case "ends_with":
      return v.endsWith(q);
    default:
      return true;
  }
}

export default function ManagementsPage() {
  const navigate = useNavigate();

  const [rows, setRows] = useState<Management[]>([]);
  const [loading, setLoading] = useState(true);
  const [rules, setRules] = useState<FilterRule[]>([]);
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchJson<Management[]>("/managements");
      setRows(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const fields: FilterFieldDefinition[] = [
    { field: "type", label: "Tipo", type: "text" },
    { field: "company_name", label: "Razón social", type: "text" },
    { field: "rut", label: "RUT", type: "text" },
    { field: "entity", label: "Entidad", type: "text" },
    { field: "status", label: "Estado Gestión", type: "text" },
    { field: "request_number", label: "N° Solicitud", type: "text" },
    { field: "bank", label: "Banco", type: "text" },
  ];

  const filtered = useMemo(() => {
    let data = [...rows];

    if (search) {
      const q = search.toLowerCase();
      data = data.filter((r) =>
        Object.values(r).some((v) =>
          String(v ?? "").toLowerCase().includes(q)
        )
      );
    }

    if (rules.length) {
      data = data.filter((row) =>
        rules.every((rule) =>
          matchRule(getValueByPath(row, rule.field), rule)
        )
      );
    }

    return data;
  }, [rows, rules, search]);

  return (
    <div className="zoho-module-page">
      <div className="zoho-module-header">
        <div>
          <h1>Gestiones</h1>
          <p>AFP → Gestión → Documentos por gestión</p>
        </div>

        <div className="zoho-module-actions">
          <button
            className="zoho-btn zoho-btn-primary"
            onClick={() => setModalOpen(true)}
          >
            Nueva gestión
          </button>
        </div>
      </div>

      <div className="zoho-module-layout">
        <ModuleFilterPanel
          title="Filtrar Gestiones"
          fields={fields}
          onApply={(r, s) => {
            setRules(r);
            setSearch(s);
          }}
        />

        <section className="zoho-table-wrap">
          <div className="zoho-table-toolbar">
            <span>Registros totales {filtered.length}</span>
          </div>

          {loading ? (
            <div className="zoho-empty">Cargando...</div>
          ) : (
            <table className="zoho-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Razón social</th>
                  <th>RUT</th>
                  <th>AFP</th>
                  <th>Entidad</th>
                  <th>Estado</th>
                  <th>N° Solicitud</th>
                  <th>Monto</th>
                  <th>Pagado</th>
                  <th>Banco</th>
                </tr>
              </thead>

              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10}>Sin registros</td>
                  </tr>
                ) : (
                  filtered.map((row) => (
                    <tr
                      key={row.id}
                      style={{ cursor: "pointer" }}
                      onClick={() =>
                        navigate(`/managements/${row.id}/documents`)
                      }
                    >
                      <td>{row.type}</td>
                      <td>{row.company_name}</td>
                      <td>{row.rut}</td>
                      <td>{row.afp}</td>
                      <td>{row.entity}</td>
                      <td>{row.status}</td>
                      <td>{row.request_number}</td>
                      <td>{row.amount ?? "—"}</td>
                      <td>{row.paid_amount ?? "—"}</td>
                      <td>{row.bank ?? "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <ZohoModal
        title="Crear Gestión"
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      >
        <div style={{ padding: 20 }}>
          Formulario de creación (ya lo tienes funcionando)
        </div>
      </ZohoModal>
    </div>
  );
}