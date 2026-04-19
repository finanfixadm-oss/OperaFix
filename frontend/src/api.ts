const API_URL = "http://localhost:4000/api";

export async function fetchJson<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`);
  if (!response.ok) {
    throw new Error("Error cargando datos");
  }
  return response.json();
}
