// ============================================================================
// services/employee-service.js
// ============================================================================
import { BaseAPIService } from "../core/base-api.js"

export class EmployeeService extends BaseAPIService {
  async getEmployees(params = {}) {
    const queryParams = new URLSearchParams(params).toString()
    return this.request(`/api/employees?${queryParams}`)
  }

  async getEmployee(id) {
    return this.request(`/api/employees/${id}`)
  }

  async createEmployee(employeeData) {
    return this.request("/api/employees", {
      method: "POST",
      body: JSON.stringify(employeeData),
    })
  }

  async updateEmployee(id, employeeData) {
    return this.request(`/api/employees/${id}`, {
      method: "PUT",
      body: JSON.stringify(employeeData),
    })
  }

  async deleteEmployee(id) {
    return this.request(`/api/employees/${id}`, {
      method: "DELETE",
    })
  }


  async getDepartment() {
    return this.request(`/api/departments`, {
      method: "GET",
    })
  }

  async getValidate(params = {}) {
    const queryParams = new URLSearchParams(params).toString()
    return this.request(`/api/employees/validate?${queryParams}`)
  }

  // EMP_LIST methods
  async addEmployeeToEmpList(employeeData) {
    console.log("[API] Adding employee to emp_list:", employeeData)
    return this.request("/api/add", {
      method: "POST",
      body: JSON.stringify(employeeData),
    })
  }

  async getEmpListEmployees(params = {}) {
    const queryParams = new URLSearchParams(params).toString()
    return this.request(`/api/emp-list?${queryParams}`)
  }

  async getEmpListEmployee(uid) {
    return this.request(`/api/emp-list/${uid}`)
  }

  async updateEmpListEmployee(uid, employeeData) {
    return this.request(`/api/emp-list/${uid}`, {
      method: "PUT",
      body: JSON.stringify(employeeData),
    })
  }

  async deleteEmpListEmployee(uid) {
    return this.request(`/api/emp-list/${uid}`, {
      method: "DELETE",
    })
  }
}