import { getApiUrl } from "./config/api.js";

const TOKEN_KEY = "printflow_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(t) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

export async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = "Bearer " + token;
  if (options.body && typeof options.body === "object" && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(options.body);
  }
  const res = await fetch(getApiUrl(path), { ...options, headers });
  if (res.status === 401) {
    setToken(null);
    window.location.href = "/login";
    throw new Error("Session expired");
  }
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const msg = data && data.error ? data.error : res.statusText;
    throw new Error(msg);
  }
  return data;
}

export function downloadBlob(path, filename) {
  const token = getToken();
  return fetch(getApiUrl(path), {
    headers: token ? { Authorization: "Bearer " + token } : {},
  }).then(async (res) => {
    if (!res.ok) throw new Error("Download failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "download";
    a.click();
    URL.revokeObjectURL(url);
  });
}
