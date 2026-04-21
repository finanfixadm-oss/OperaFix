import type {
  AnalyticsDashboard,
  Collaborator,
  Company,
  KpiOverview,
  LmGroup,
  LmRecord,
  PaginatedLmRecords,
  TpGroup,
  TpRecord,
  Mandante,
  CompanyGroup,
} from "./types";

const rawUrl = (import.meta as any).env?.VITE_API_URL || "http://localhost:4000/api";
const API_URL = rawUrl.endsWith("/api") ? rawUrl : `${rawUrl.replace(/\/$/, "")}/api`;

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = "Error cargando datos";
    try {
      const payload = await response.json();
      message = payload.message || payload.detalle || message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export async function fetchJson<T>(endpoint: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, init);
  return handleResponse<T>(response);
}

export async function postJson<T>(endpoint: string, body: unknown, method: "POST" | "PUT" = "POST"): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return handleResponse<T>(response);
}

export async function uploadFile<T>(endpoint: string, formData: FormData): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: "POST",
    body: formData
  });
  return handleResponse<T>(response);
}

export function fetchLmRecords(params: Record<string, string | number | boolean | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") search.set(key, String(value));
  });
  return fetchJson<PaginatedLmRecords>(`/lm-records?${search.toString()}`);
}

export const fetchDashboardOverview = () => fetchJson<KpiOverview>("/reports/overview");
export const fetchAnalyticsDashboard = () => fetchJson<AnalyticsDashboard>("/analytics/dashboard");
export const fetchCompanies = () => fetchJson<Company[]>("/companies");
export const fetchCollaborators = () => fetchJson<Collaborator[]>("/collaborators");
export const fetchLmGroups = () => fetchJson<LmGroup[]>("/lm-groups");
export const fetchTpGroups = () => fetchJson<TpGroup[]>("/tp-groups");
export const fetchTpRecords = () => fetchJson<TpRecord[]>("/tp-records");
export const fetchDocuments = () => fetchJson<any[]>("/documents");

export const publicBaseUrl = API_URL.replace(/\/api$/, "");

export const fetchMandantes = () => fetchJson<Mandante[]>("/mandantes");
export const fetchCompanyGroups = (params?: { kind?: string; mandante_id?: string }) => {
  const search = new URLSearchParams();
  if (params?.kind) search.set("kind", params.kind);
  if (params?.mandante_id) search.set("mandante_id", params.mandante_id);
  const suffix = search.toString() ? `?${search.toString()}` : "";
  return fetchJson<CompanyGroup[]>(`/company-groups${suffix}`);
};
export const fetchHierarchyOverview = () => fetchJson<any[]>("/hierarchy/overview");
