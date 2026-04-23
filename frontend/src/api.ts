const API_BASE =
  (import.meta as any).env?.VITE_API_URL?.replace(/\/$/, "") ||
  "https://operafix-production.up.railway.app/api";

type FetchOptions = RequestInit & {
  query?: Record<string, string | number | boolean | undefined | null>;
};

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

export async function fetchJson<T>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { query, headers, ...rest } = options;

  const response = await fetch(buildUrl(path, query), {
    headers: {
      "Content-Type": "application/json",
      ...(headers || {}),
    },
    ...rest,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}