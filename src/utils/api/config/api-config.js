// ============================================================================
// config/api-config.js
// ============================================================================
// Allow overriding base URL via Vite env; default to production domain (HTTPS)
let ENV_BASE = null
try {
  // import.meta.env is available in Vite at build time
  // Access in try/catch to avoid tooling complaints in non-Vite contexts
  // eslint-disable-next-line no-undef
  ENV_BASE = (import.meta && import.meta.env && import.meta.env.VITE_API_BASE_URL) ? import.meta.env.VITE_API_BASE_URL : null
} catch (e) {
  ENV_BASE = null
}

export const API_ENDPOINTS = {
  public: ENV_BASE || "https://qxw.2ee.mytemp.website",
}

export const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
}