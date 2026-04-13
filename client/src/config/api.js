function stripTrailingSlashes(s) {
  return String(s).replace(/\/+$/, "");
}

/**
 * Backend origin for API requests (no path).
 * - Development: "" so URLs stay same-origin and the Vite dev server proxy handles "/api".
 * - Production: VITE_API_URL (e.g. https://api.example.com).
 */
export const API_BASE_URL = import.meta.env.DEV
  ? ""
  : stripTrailingSlashes(import.meta.env.VITE_API_URL ?? "");

/**
 * Absolute URL for an API path. Pass paths like "/auth/login" (leading slash optional).
 */
export function getApiUrl(path) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const origin = API_BASE_URL;
  return origin ? `${origin}/api${normalized}` : `/api${normalized}`;
}
