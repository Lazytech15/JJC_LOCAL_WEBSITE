// ============================================================================
// services/auth-service.js
// ============================================================================
import { BaseAPIService } from "../core/base-api.js"

export class AuthService extends BaseAPIService {
  async login(credentials) {
    const queryParams = new URLSearchParams(credentials).toString()
    return this.request(`/api/auth?${queryParams}`, {
      method: "GET",
    })
  }

  async refreshToken() {
    return this.request("/api/auth/refresh", {
      method: "POST",
    })
  }

  async getHRData() {
    return this.request("/api/employees")
  }
}