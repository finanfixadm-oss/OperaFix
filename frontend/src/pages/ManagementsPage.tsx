import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import ModuleFilterPanel from "../components/ModuleFilterPanel";
import ZohoModal from "../components/ZohoModal";
import { fetchJson, publicBaseUrl, uploadForm } from "../api";
import type { FilterFieldDefinition, FilterRule, ManagementDocument } from "../types";

const categories = [
  "Poder",
  "Comprobante pago",
  "Detalle de pago",
  "Comprobante rechazo",
  "Archivo AFP",
  "Carta explicativa",
  "Factura",
  "OC",
  "Archivo respuesta CEN",
  "Otro",
];

function getValueByPath(obj: unknown, path: string) {
  return path.split(".").reduce<any>((acc, key) => acc?.[key], obj);
}

function matchRule(value: unknown, rule: FilterRule) {
  const normalized = String(value ?? "").toLowerCase();
  const query = String(rule.value ?? "").toLowerCase();

  switch (rule.operator) {
    case "equals":
      return normalized === query;
    case "not_equals":
      return normalized !== query;
    case "contains":
      return normalized.includes(query);
    case "not_contains":
      return !normalized.includes(query);
    case "starts_with":
      return normalized.startsWith(query);
    case "ends_with":
      return normalized.endsWith(query);
    case "includes_all":
      return query.split(",").map((x) => x.trim()).filter(Boolean).every((p) => normalized.includes(p));
    case "includes_any":
      return query.split(",").map((x) => x.trim()).filter(Boolean).some((p) => normalized.includes(p));
    default:
      return true;
  }
}

export default function ManagementDocumentsPage() {
  const { managementId = "" } = useParams();

  const [rows, setRows] = useState<ManagementDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRules, setActiveRules] = useState<FilterRule[]>([]);
  const [quickSearch, setQuickSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [category, setCategory] = useState("Poder");
  const [file, setFile] = useState<File | null>(null);

  async function loadRows() {
    setLoading(true);
    fetchJson<ManagementDocument[]>("/management-documents", {
      query: { management_id: managementId },
    })
      .then(setRows)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadRows();
  }, [managementId]);

  async function uploadDocument() {
    if (!managementId) {
      alert("No se encontró la gestión.");
      return;
    }

    if (!file) {
      alert("Debes seleccionar un archivo.");
      return;
    }

    setSaving(true);

    try {
      const formData = new FormData();
      formData.append("management_id", managementId);
      formData.append("category", category);
      formData.append("file", file);

      await uploadForm<ManagementDocument>("/management-documents/upload", formData);

      setModalOpen(false);
      setFile(null);
      setCategory("Poder");
      await loadRows();
    } catch (error) {
      console.error(error);
      alert("No se pudo subir el documento.");
    } finally {
      setSaving(false);
    }
  }

  const fields: FilterFieldDefinition[] = [
    { field: "category", label: "Categoría", type: "text" },
    { field: "file_name", label: "Nombre archivo", type: "text" },
    { field: "mime_type", label: "Tipo MIME", type: "text" },
    { field: "related_module", label: "Módulo", type: "text" },
  ];

  const filteredRows = useMemo(() => {
    let data = [...rows];

    if (quickSearch.trim()) {
      const q = quickSearch.toLowerCase();
      data = data.filter((row) =>
        [row.category, row.file_name, row.mime_type, row.related_module]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q))
      );
    }

    if (activeRules.length) {
      data = data.filter((row) =>
        activeRules.every((rule) => matchRule(getValueByPath(row, rule.field), rule))
      );
    }

    return data;
  }, [rows, activeRules, quickSearch]);

  return (
    <div className="zoho-module-page">
      <div className="zoho-module-header">
        <div>
          <h1>Documentos por gestión</h1>
          <p>Archivos asociados directamente a la gestión</p>
        </div>

        <div className="zoho-module-actions">
          <button className="zoho-btn zoho-btn-primary" onClick={() => setModalOpen(true)}>
            Subir documento
          </button>
        </div>
      </div>

      <div className="zoho-module-layout">
        <ModuleFilterPanel
          title="Filtrar Documentos"
          fields={fields}
          onApply={(rules, search) => {
            setActiveRules(rules);
            setQuickSearch(search);
          }}
        />

        <section className="zoho-table-wrap">
          <div className="zoho-table-toolbar">
            <span>Registros totales {filteredRows.length}</span>
          </div>

          {loading ? (
            <div className="zoho-empty">Cargando...</div>
          ) : (
            <table className="zoho-table">
              <thead>
                <tr>
                  <th>Categoría</th>
                  <th>Archivo</th>
                  <th>Tipo</th>
                  <th>Tamaño</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={5}>Sin documentos cargados.</td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.category}</td>
                      <td>
                        <a
                          href={`${publicBaseUrl}${row.file_url}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {row.file_name}
                        </a>
                      </td>
                      <td>{row.mime_type || "—"}</td>
                      <td>{row.file_size ? `${Math.round(row.file_size / 1024)} KB` : "—"}</td>
                      <td>{new Date(row.created_at).toLocaleString("es-CL")}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <ZohoModal
        title="Subir documento a gestión"
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      >
        <div className="zoho-form-grid">
          <div className="zoho-form-field">
            <label>Tipo de documento</label>
            <select
              className="zoho-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="zoho-form-field">
            <label>Archivo</label>
            <input
              className="zoho-input"
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
        </div>

        <div className="zoho-form-actions">
          <button className="zoho-btn" onClick={() => setModalOpen(false)}>
            Cancelar
          </button>
          <button className="zoho-btn zoho-btn-primary" onClick={uploadDocument} disabled={saving}>
            {saving ? "Subiendo..." : "Subir documento"}
          </button>
        </div>
      </ZohoModal>
    </div>
  );
}