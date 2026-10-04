const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

export class ApiError extends Error {
  constructor(message, status, requestId) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.requestId = requestId;
  }
}

export async function apiRequest(path, { params, method = "GET", body, signal } = {}) {
  const url = new URL(`${API_BASE}${path}`);
  for (const [key, value] of Object.entries(params || {})) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }
  let response;
  try {
    response = await fetch(url, {
      method,
      signal,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new ApiError("No fue posible conectar con la API. Revisa que Api/ esté ejecutándose.");
  }
  if (response.status === 204) return null;
  let payload;
  try { payload = await response.json(); } catch { payload = {}; }
  if (!response.ok) {
    throw new ApiError(payload?.error?.message || "La solicitud no pudo completarse.", response.status, payload?.requestId);
  }
  return payload;
}

export const queryApi = (path, params, options) => apiRequest(path, { params, ...options });
