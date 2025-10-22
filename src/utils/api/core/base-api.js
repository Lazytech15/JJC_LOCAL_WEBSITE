// ============================================================================
// core/base-api.js
// ============================================================================
import { getStoredToken, clearTokens } from "../../auth.js"
import { API_ENDPOINTS, DEFAULT_HEADERS } from "../config/api-config.js"

export class BaseAPIService {
  constructor() {
    this.baseURL = API_ENDPOINTS.public
    this.defaultHeaders = DEFAULT_HEADERS
    this.requestQueue = new Map()
    this.pendingRequests = new Set()
  }

  async request(endpoint, options = {}) {
    const requestId = `${options.method || "GET"}_${endpoint}_${Date.now()}`

    try {
      const pendingKey = `${options.method || "GET"}_${endpoint}`
      if (this.pendingRequests.has(pendingKey) && options.deduplicate !== false) {
        console.log(`[API] Deduplicating request: ${pendingKey}`)
        return await this.waitForPendingRequest(pendingKey)
      }

      this.pendingRequests.add(pendingKey)

      const url = `${this.baseURL}${endpoint}`
      const config = {
        method: "GET",
        headers: { ...this.defaultHeaders },
        ...options,
      }

      const token = getStoredToken()
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }

      console.log(`[API] Making request: ${config.method} ${url}`)

      const response = await fetch(url, config)

      if (response.status === 401) {
        console.warn("[API] Authentication failed, clearing tokens")
        clearTokens()
        throw new Error("Authentication required")
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        // If caller requests to suppress errors, return the parsed error object instead of throwing
        if (options.suppressErrors) {
          return { success: false, status: response.status, ...errorData }
        }
        throw new Error(errorData.message || errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      this.requestQueue.set(pendingKey, data)

      return data
    } catch (error) {
      console.error(`[API] Request failed: ${endpoint}`, error)
      throw error
    } finally {
      this.pendingRequests.delete(`${options.method || "GET"}_${endpoint}`)
    }
  }

  async waitForPendingRequest(pendingKey) {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (!this.pendingRequests.has(pendingKey)) {
          clearInterval(checkInterval)
          resolve(this.requestQueue.get(pendingKey))
        }
      }, 50)
    })
  }
}