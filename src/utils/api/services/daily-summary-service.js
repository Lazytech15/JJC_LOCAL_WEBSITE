// ============================================================================
// services/daily-summary-service.js
// ============================================================================
import { BaseAPIService } from "../core/base-api.js"

export class DailySummaryService extends BaseAPIService {
  async getDailySummaryRecords(params = {}) {
    const queryParams = new URLSearchParams(params).toString()
    return this.request(`/api/dailysummary?${queryParams}`)
  }

  async getDailySummaryStats(params = {}) {
    const queryParams = new URLSearchParams(params).toString()
    return this.request(`/api/dailysummary/stats?${queryParams}`)
  }

  async getDailySummaryById(id) {
    return this.request(`/api/dailysummary/${id}`)
  }

  async getEmployeeDailySummary(employee_uid, params = {}) {
    const queryParams = new URLSearchParams(params).toString()
    return this.request(`/api/dailysummary/employee/${employee_uid}?${queryParams}`)
  }

  async syncDailySummaryRecords(daily_summary_data) {
    return this.request("/api/dailysummary", {
      method: "POST",
      body: JSON.stringify({ daily_summary_data }),
    })
  }

  async deleteDailySummaryRecord(id) {
    return this.request(`/api/dailysummary/${id}`, {
      method: "DELETE",
    })
  }

  async rebuildDailySummary(start_date, end_date) {
    return this.request("/api/dailysummary/rebuild", {
      method: "POST",
      body: JSON.stringify({ start_date, end_date }),
    })
  }
}