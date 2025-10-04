// ============================================================================
// services/daily-summary-service.js
// ============================================================================
import { BaseAPIService } from "../core/base-api.js"

export class DailySummaryService extends BaseAPIService {
  async getDailySummaryRecords(params = {}) {
    const queryParams = new URLSearchParams(params).toString()
    return this.request(`/api/daily-summary?${queryParams}`)
  }

  async getDailySummaryStats(params = {}) {
    const queryParams = new URLSearchParams(params).toString()
    return this.request(`/api/daily-summary/stats?${queryParams}`)
  }

  async getDailySummaryById(id) {
    return this.request(`/api/daily-summary/${id}`)
  }

  async getEmployeeDailySummary(employee_uid, params = {}) {
    const queryParams = new URLSearchParams(params).toString()
    return this.request(`/api/daily-summary/employee/${employee_uid}?${queryParams}`)
  }

  async syncDailySummaryRecords(daily_summary_data) {
    return this.request("/api/daily-summary", {
      method: "POST",
      body: JSON.stringify({ daily_summary_data }),
    })
  }

  async deleteDailySummaryRecord(id) {
    return this.request(`/api/daily-summary/${id}`, {
      method: "DELETE",
    })
  }

  async rebuildDailySummary(start_date, end_date) {
    return this.request("/api/daily-summary/rebuild", {
      method: "POST",
      body: JSON.stringify({ start_date, end_date }),
    })
  }
}