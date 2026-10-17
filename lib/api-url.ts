const configuredOrigin = process.env.NEXT_PUBLIC_SAATHI_API_URL?.replace(/\/+$/u, "");

export function apiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return configuredOrigin ? `${configuredOrigin}${normalizedPath}` : normalizedPath;
}

export function apiFetch(path: string, init?: RequestInit) {
  return fetch(apiUrl(path), {
    ...init,
    credentials: "include",
  });
}
