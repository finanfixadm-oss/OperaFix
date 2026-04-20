import type {
  AnalyticsDashboard,
  Collaborator,
  Company,
  DocumentItem,
  KpiOverview,
  LmRecord,
  LmRecordDetail,
  LmRecordListResponse,
  Note
} from "./types";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:4000/api").replace(/\/$/, "");
const FILES_BASE_URL = (import.meta.env.VITE_FILES_URL || "http://localhost:4000").replace(/\/$/, "");

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, options);
  if (!response.ok) {
    let message = "Error cargando datos";
    try {
      const body = await response.json();
      message = body.message || message;
    } catch {
      // noop
    }
    throw new Error(message);
  }
  return response.json();
}

export async function fetchLmRecords(params: Record<string, string | number | boolean | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  return request<LmRecordListResponse>(`/lm-records?${query.toString()}`);
}

export const fetchLmRecordDetail = (id: string) => request<LmRecordDetail>(`/lm-records/${id}`);
export const createLmRecord = (payload: Partial<LmRecord>) =>
  request<LmRecord>("/lm-records", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

export const updateLmRecord = (id: string, payload: Partial<LmRecord>) =>
  request<LmRecord>(`/lm-records/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

export const addLmRecordNote = (id: string, content: string) =>
  request<Note>(`/lm-records/${id}/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content })
  });

export async function uploadDocument(file: File, payload: Record<string, string>) {
  const formData = new FormData();
  formData.append("file", file);
  Object.entries(payload).forEach(([key, value]) => formData.append(key, value));
  return request<DocumentItem>("/documents/upload", {
    method: "POST",
    body: formData
  });
}

export const fetchDashboardOverview = () => request<KpiOverview>("/reports/overview");
export const fetchAnalyticsDashboard = () => request<AnalyticsDashboard>("/analytics/dashboard");
export const fetchCompanies = () => request<Company[]>("/companies");
export const fetchCollaborators = () => request<Collaborator[]>("/collaborators");
export const fetchDocuments = () => request<DocumentItem[]>("/documents");

export function fileUrl(doc: DocumentItem) {
  if (!doc.storage_path) return "#";
  const filename = doc.stored_filename || doc.storage_path.split(/[\\/]/).pop();
  return `${FILES_BASE_URL}/storage/${filename}`;
}
