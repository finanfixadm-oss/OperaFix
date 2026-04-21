const RAW_API_URL = (import.meta as any).env?.VITE_API_URL || "http://localhost:4000";
const API_BASE = RAW_API_URL.replace(/\/$/, "");
const API_URL = API_BASE.endsWith("/api") ? API_BASE : `${API_BASE}/api`;

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

export const publicBaseUrl = API_BASE;
