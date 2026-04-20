// En producción Railway inyecta VITE_API_URL, ej: https://operafix-production.up.railway.app/api
// En desarrollo local apunta a localhost:4000/api
const API_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "http://localhost:4000/api";

export async function fetchJson<T>(endpoint: string): Promise<T> {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}${endpoint}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (response.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "/login";
    throw new Error("No autorizado");
  }
  if (!response.ok) {
    throw new Error("Error cargando datos");
  }
  return response.json();
}

export async function postJson<T>(endpoint: string, body: unknown): Promise<T> {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as any).message || "Error en la solicitud");
  }
  return response.json();
}
