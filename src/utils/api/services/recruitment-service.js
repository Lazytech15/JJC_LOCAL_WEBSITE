// ============================================================================
// services/recruitment-service.js
// ============================================================================
import { BaseAPIService } from "../core/base-api.js"

export class RecruitmentService extends BaseAPIService {
  async getJobPostings(params = {}) {
    const queryParams = new URLSearchParams(params).toString()
    return this.request(`/api/recruitment/jobs?${queryParams}`)
  }

  async createJobPosting(jobData) {
    return this.request("/api/recruitment/jobs", {
      method: "POST",
      body: JSON.stringify(jobData),
    })
  }

  async updateJobPosting(id, jobData) {
    return this.request(`/api/recruitment/jobs/${id}`, {
      method: "PUT",
      body: JSON.stringify(jobData),
    })
  }

  async deleteJobPosting(id) {
    return this.request(`/api/recruitment/jobs/${id}`, {
      method: "DELETE",
    })
  }

  async getApplications(params = {}) {
    const queryParams = new URLSearchParams(params).toString()
    return this.request(`/api/recruitment/applications?${queryParams}`)
  }

  async updateApplicationStatus(id, status) {
    return this.request(`/api/recruitment/applications/${id}`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    })
  }
}