import type { PaginatedLmRecords } from "./types";

const rawApiUrl = (import.meta as any).env?.VITE_API_URL || "http://localhost:4000";
const API_URL = rawApiUrl.endsWith("/api") ? rawApiUrl : `${rawApiUrl.replace(/\/$/, "")}/api`;

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = "Error cargando datos";
    try {
      const payload = await response.json();
      message = payload.message || message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  return response.json();
}

export async function fetchJson<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`);
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

export async function fetchLmRecords(params: Record<string, string | number | boolean | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });
  return fetchJson<PaginatedLmRecords>(`/lm-records?${query.toString()}`);
}

export const publicBaseUrl = API_URL.replace(/\/api$/, "");
