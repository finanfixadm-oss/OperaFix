import { FormEvent, useEffect, useMemo, useState } from "react";
import { fetchJson, publicBaseUrl, uploadFile } from "../api";
import type { CrmDocument, PaginatedLmRecords } from "../types";

type LocalFolder = {
  id: string;
  name: string;
  module: string;
  mandante?: string;
};

const modules = [
  { label: "Zoho CRM", value: "documents" },
  { label: "Registros de empresas", value: "lm_records" },
  { label: "Empresas", value: "companies" },
  { label: "Grupos de empresas - LM", value: "lm_groups" },
  { label: "Grupos empresas - TP", value: "tp_groups" },
  { label: "Gestiones - TP", value: "tp_records" }
];

const storageKey = "operafix_local_folders";

function readFolders(): LocalFolder[] {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveFolders(items: LocalFolder[]) {
  localStorage.setItem(storageKey, JSON.stringify(items));
}

export default function DocumentsPage() {
  const [selectedModule, setSelectedModule] = useState("documents");
  const [documents, setDocuments] = useState<CrmDocument[]>([]);
  const [mandantes, setMandantes] = useState<string[]>([]);
  const [selectedMandante, setSelectedMandante] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [folders, setFolders] = useState<LocalFolder[]>(readFolders());
  const [selectedFolderId, setSelectedFolderId] = useState<string>("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchJson<PaginatedLmRecords>("/lm-records?page=1&pageSize=200")
      .then((data) => setMandantes(data.filterOptions.mandantes || []))
      .catch(() => setMandantes([]));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("related_module", selectedModule);
    fetchJson<CrmDocument[]>(`/documents?${params.toString()}`)
      .then(setDocuments)
      .catch(() => setDocuments([]));
  }, [selectedModule]);

  const visibleFolders = useMemo(
    () => folders.filter((item) => item.module === selectedModule && (!selectedMandante || item.mandante === selectedMandante)),
    [folders, selectedModule, selectedMandante]
  );

  async function createFolder(event: FormEvent) {
    event.preventDefault();
    if (!newFolderName.trim()) return;
    const next = [
      ...folders,
      {
        id: crypto.randomUUID(),
        name: newFolderName.trim(),
        module: selectedModule,
        mandante: selectedMandante || undefined,
      },
    ];
    setFolders(next);
    saveFolders(next);
    setNewFolderName("");
    setMessage("Carpeta creada localmente en el explorador.");
  }

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", file.name);
    formData.append("related_module", selectedModule);
    try {
      await uploadFile("/documents/upload", formData);
      setMessage("Documento cargado correctamente.");
      const params = new URLSearchParams();
      params.set("related_module", selectedModule);
      const data = await fetchJson<CrmDocument[]>(`/documents?${params.toString()}`);
      setDocuments(data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo cargar el documento.");
    } finally {
      event.target.value = "";
    }
  }

  return (
    <div className="documents-layout">
      <div className="documents-sidebar">
        <div className="folder-card">
          <div className="panel-title-row"><h3>Mis carpetas</h3></div>
          <div className="folder-module-selector">
            <select value={selectedModule} onChange={(e) => setSelectedModule(e.target.value)}>
              {modules.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
            <select value={selectedMandante} onChange={(e) => setSelectedMandante(e.target.value)}>
              <option value="">Todos los mandantes</option>
              {mandantes.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <form onSubmit={createFolder} className="folder-create-row">
            <input value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="Nueva carpeta" />
            <button className="ghost-btn" type="submit">Crear</button>
          </form>
          <div className="folder-list">
            {visibleFolders.map((folder) => (
              <button key={folder.id} className={selectedFolderId === folder.id ? "folder-item active" : "folder-item"} onClick={() => setSelectedFolderId(folder.id)}>
                <span>📁</span> {folder.name}
              </button>
            ))}
            {!visibleFolders.length && <div className="empty-state">No hay carpetas en este módulo.</div>}
          </div>
        </div>
      </div>

      <div className="documents-content widget-card span-full">
        <div className="table-header">
          <div>
            <span className="eyebrow">Documentos</span>
            <h3>{modules.find((item) => item.value === selectedModule)?.label || "Documentos"}</h3>
          </div>
          <div className="table-actions">
            <label className="ghost-btn upload-inline">
              Subir archivo
              <input type="file" hidden onChange={handleUpload} />
            </label>
          </div>
        </div>

        {message ? <div className="inline-message">{message}</div> : null}

        <div className="table-scroll">
          <table className="crm-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Módulo</th>
                <th>Carpeta</th>
                <th>Fecha</th>
                <th>Archivo</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id}>
                  <td>{doc.title}</td>
                  <td>{doc.related_module}</td>
                  <td>{visibleFolders.find((folder) => folder.id === selectedFolderId)?.name || "Sin carpeta"}</td>
                  <td>{doc.created_at ? new Date(doc.created_at).toLocaleDateString("es-CL") : "-"}</td>
                  <td>
                    <a href={`${publicBaseUrl}/storage/${doc.stored_filename}`} target="_blank" rel="noreferrer">Ver archivo</a>
                  </td>
                </tr>
              ))}
              {!documents.length && (
                <tr>
                  <td colSpan={5}>No hay documentos para este módulo.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
