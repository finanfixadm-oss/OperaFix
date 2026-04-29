export const apiBase =
  (import.meta as any).env?.VITE_API_URL?.replace(/\/$/, "") ||
  "https://operafix-production.up.railway.app/api";

const API_BASE =
  (import.meta as any).env?.VITE_API_URL?.replace(/\/$/, "") ||
  "https://operafix-production.up.railway.app/api";

export const publicBaseUrl = API_BASE.replace(/\/api$/, "");

type FetchOptions = RequestInit & {
  query?: Record<string, string | number | boolean | undefined | null>;
};

export function getStoredUser<T = any>(): T | null {
  try {
    return JSON.parse(localStorage.getItem("user") || "null") as T | null;
  } catch {
    return null;
  }
}

export function getToken() {
  return localStorage.getItem("token") || "";
}

export function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

export function buildHeaders(isJson = false, extraHeaders?: HeadersInit): HeadersInit {
  const headers: Record<string, string> = {};
  const token = getToken();

  if (isJson) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  if (extraHeaders instanceof Headers) {
    extraHeaders.forEach((value, key) => {
      if (value !== undefined && value !== null) headers[key] = value;
    });
  } else if (Array.isArray(extraHeaders)) {
    for (const [key, value] of extraHeaders) {
      if (value !== undefined && value !== null) headers[key] = value;
    }
  } else if (extraHeaders) {
    Object.entries(extraHeaders).forEach(([key, value]) => {
      if (value !== undefined && value !== null) headers[key] = String(value);
    });
  }

  return headers;
}

function buildUrl(path: string, query?: FetchOptions["query"]) {
  const cleanBase = API_BASE.replace(/\/$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${cleanBase}${cleanPath}`);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return url.toString();
}

async function parseError(response: Response) {
  const text = await response.text();
  try {
    const json = JSON.parse(text);
    return json?.message || json?.error || text || `HTTP ${response.status}`;
  } catch {
    return text || `HTTP ${response.status}`;
  }
}

export async function fetchJson<T>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { query, headers, ...rest } = options;

  const response = await fetch(buildUrl(path, query), {
    ...rest,
    headers: buildHeaders(true, headers),
  });

  if (response.status === 401) {
    clearSession();
  }

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function postJson<T>(path: string, body: unknown): Promise<T> {
  return fetchJson<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function putJson<T>(path: string, body: unknown): Promise<T> {
  return fetchJson<T>(path, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteJson<T>(path: string): Promise<T> {
  return fetchJson<T>(path, { method: "DELETE" });
}

export async function uploadForm<T>(path: string, formData: FormData): Promise<T> {
  const response = await fetch(buildUrl(path), {
    method: "POST",
    headers: buildHeaders(false),
    body: formData,
  });

  if (response.status === 401) clearSession();
  if (!response.ok) throw new Error(await parseError(response));

  return response.json() as Promise<T>;
}

export async function downloadBlob(path: string, body: unknown, fileName: string) {
  const response = await fetch(buildUrl(path), {
    method: "POST",
    headers: buildHeaders(true),
    body: JSON.stringify(body),
  });
  if (response.status === 401) clearSession();
  if (!response.ok) throw new Error(await parseError(response));

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
