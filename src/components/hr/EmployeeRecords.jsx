"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../../App"
import { X } from "lucide-react"

function EmployeeRecords() {
  const { user, isDarkMode } = useAuth()
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [statistics, setStatistics] = useState({})
  const [departments, setDepartments] = useState([])
  const [pagination, setPagination] = useState({ total: 0, currentPage: 1, limit: 50 })
  
  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState(null)
  const [deleteEmployee, setDeleteEmployee] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  
  // Filters
  const [filterDepartment, setFilterDepartment] = useState("")
  const [filterStatus, setFilterStatus] = useState("Active")
  const [sortBy, setSortBy] = useState("hireDate")
  const [sortOrder, setSortOrder] = useState("DESC")

  useEffect(() => {
    fetchEmployees()
  }, [searchTerm, filterDepartment, filterStatus, sortBy, sortOrder, pagination.currentPage])

  const fetchEmployees = async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams({
        limit: pagination.limit.toString(),
        offset: ((pagination.currentPage - 1) * pagination.limit).toString(),
        search: searchTerm,
        department: filterDepartment,
        status: filterStatus,
        sortBy: sortBy,
        sortOrder: sortOrder
      })

      const response = await fetch(`http://192.168.68.140:3001/api/employees?${params}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) throw new Error("Failed to fetch employees")

      const result = await response.json()
      
      if (result.success) {
        setEmployees(result.data.employees || [])
        setStatistics(result.data.statistics || {})
        setDepartments(result.data.departments || [])
        setPagination(prev => ({ ...prev, total: result.data.pagination.total }))
      } else {
        throw new Error(result.error || "Failed to fetch employees")
      }
    } catch (err) {
      setError(err.message)
      console.error("Error fetching employees:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleEditEmployee = (employee) => {
    setEditingEmployee({
      ...employee,
      birthDate: employee.birthDate ? employee.birthDate.split('T')[0] : '',
      hireDate: employee.hireDate ? employee.hireDate.split('T')[0] : ''
    })
    setIsEditModalOpen(true)
  }

  const handleDeleteClick = (employee) => {
    setDeleteEmployee(employee)
    setIsDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    if (!deleteEmployee) return

    try {
      setIsSaving(true)
      const response = await fetch(`http://192.168.68.140:3001/api/employees/${deleteEmployee.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) throw new Error("Failed to delete employee")

      await fetchEmployees()
      setSelectedEmployee(null)
      setIsDeleteModalOpen(false)
      setDeleteEmployee(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveEmployee = async () => {
    if (!editingEmployee) return

    try {
      setIsSaving(true)
      const response = await fetch(`http://192.168.68.140:3001/api/employees/${editingEmployee.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editingEmployee)
      })

      if (!response.ok) throw new Error("Failed to update employee")

      await fetchEmployees()
      setIsEditModalOpen(false)
      setEditingEmployee(null)
      // Update selected employee if it was the one being edited
      if (selectedEmployee?.id === editingEmployee.id) {
        setSelectedEmployee(editingEmployee)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, currentPage: newPage }))
  }

  const formatPhoneNumber = (phone) => {
    if (!phone) return "N/A"
    return phone.replace(/(\+63)(\d{3})(\d{3})(\d{4})/, "$1 $2 $3 $4")
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A"
    return new Date(dateStr).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const handleInputChange = (field, value) => {
    setEditingEmployee(prev => ({
      ...prev,
      [field]: value
    }))
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600 dark:border-slate-400 mx-auto"></div>
        <p className="text-gray-600 dark:text-gray-300 mt-4">Loading employee records...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Statistics */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">👥 Employee Records</h2>
          <div className="flex gap-4 mt-2 text-sm text-gray-600 dark:text-gray-300">
            <span>Total: {statistics.totalEmployees || 0}</span>
            <span>Active: {statistics.activeEmployees || 0}</span>
            <span>New Hires (30d): {statistics.newHiresLast30Days || 0}</span>
            <span>Departments: {statistics.totalDepartments || 0}</span>
          </div>
        </div>
        <button
          onClick={fetchEmployees}
          className="bg-slate-600 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors duration-200"
        >
          Refresh
        </button>
      </div>

      {/* Filters and Search */}
      <div className="bg-white/20 dark:bg-gray-800/40 backdrop-blur-md rounded-2xl p-4 border border-white/30 dark:border-gray-700/30">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <input
            type="text"
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 rounded-lg bg-white/20 dark:bg-gray-800/60 backdrop-blur-sm border border-white/30 dark:border-gray-700/40 text-gray-800 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-500"
          />
          
          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="px-4 py-2 rounded-lg bg-white/20 dark:bg-gray-800/60 backdrop-blur-sm border border-white/30 dark:border-gray-700/40 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-slate-500"
          >
            <option value="">All Departments</option>
            {departments.map(dept => (
              <option key={dept.name} value={dept.name}>{dept.name} ({dept.totalCount})</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 rounded-lg bg-white/20 dark:bg-gray-800/60 backdrop-blur-sm border border-white/30 dark:border-gray-700/40 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-slate-500"
          >
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="On Leave">On Leave</option>
            <option value="Terminated">Terminated</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 rounded-lg bg-white/20 dark:bg-gray-800/60 backdrop-blur-sm border border-white/30 dark:border-gray-700/40 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-slate-500"
          >
            <option value="hire_date">Hire Date</option>
            <option value="last_name">Last Name</option>
            <option value="first_name">First Name</option>
            <option value="position">Position</option>
            <option value="salary">Salary</option>
            <option value="age">Age</option>
          </select>

          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="px-4 py-2 rounded-lg bg-white/20 dark:bg-gray-800/60 backdrop-blur-sm border border-white/30 dark:border-gray-700/40 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-slate-500"
          >
            <option value="DESC">Descending</option>
            <option value="ASC">Ascending</option>
          </select>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-100/80 dark:bg-red-900/30 backdrop-blur-sm border border-red-300 dark:border-red-700/50 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-300">Error: {error}</p>
        </div>
      )}

      {/* Employee Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Employee List */}
        <div className="bg-white/20 dark:bg-gray-800/40 backdrop-blur-md rounded-2xl p-6 border border-white/30 dark:border-gray-700/30 shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              Employees ({employees.length} of {pagination.total})
            </h3>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Page {pagination.currentPage} of {Math.ceil(pagination.total / pagination.limit)}
            </div>
          </div>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {employees.map((employee) => (
              <div
                key={employee.id}
                onClick={() => setSelectedEmployee(employee)}
                className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                  selectedEmployee?.id === employee.id
                    ? "bg-white/40 dark:bg-gray-700/60 border-slate-300 dark:border-slate-500"
                    : "bg-white/20 dark:bg-gray-700/30 border-white/20 dark:border-gray-600/30 hover:bg-white/30 dark:hover:bg-gray-700/50"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-gray-800 dark:text-gray-100">
                      {employee.fullName}
                      {employee.isNewHire && <span className="ml-2 text-xs bg-green-500 text-white px-2 py-1 rounded">NEW</span>}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{employee.position}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{employee.department}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">ID: {employee.idNumber}</p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      employee.status === "Active"
                        ? "bg-green-100/80 dark:bg-green-900/40 text-green-700 dark:text-green-300"
                        : employee.status === "On Leave"
                        ? "bg-yellow-100/80 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300"
                        : "bg-red-100/80 dark:bg-red-900/40 text-red-700 dark:text-red-300"
                    }`}
                  >
                    {employee.status}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex justify-center mt-4 gap-2">
            <button
              onClick={() => handlePageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage === 1}
              className="px-3 py-1 rounded bg-slate-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-gray-700 dark:text-gray-300">
              {pagination.currentPage} / {Math.ceil(pagination.total / pagination.limit)}
            </span>
            <button
              onClick={() => handlePageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage >= Math.ceil(pagination.total / pagination.limit)}
              className="px-3 py-1 rounded bg-slate-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>

        {/* Employee Details */}
        <div className="bg-white/20 dark:bg-gray-800/40 backdrop-blur-md rounded-2xl p-6 border border-white/30 dark:border-gray-700/30 shadow-lg">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Employee Details</h3>
          {selectedEmployee ? (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              <div className="text-center pb-4 border-b border-white/30 dark:border-gray-600/30">
                <h4 className="text-xl font-bold text-gray-800 dark:text-gray-100">{selectedEmployee.fullName}</h4>
                <p className="text-gray-600 dark:text-gray-300">{selectedEmployee.position}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{selectedEmployee.department}</p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {/* Personal Information */}
                <div className="border-b border-white/20 dark:border-gray-600/20 pb-3">
                  <h5 className="font-medium text-gray-700 dark:text-gray-200 mb-2">Personal Information</h5>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-300 block">Age</label>
                      <p className="text-gray-800 dark:text-gray-100">{selectedEmployee.age || "N/A"}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-300 block">Birth Date</label>
                      <p className="text-gray-800 dark:text-gray-100">{formatDate(selectedEmployee.birthDate)}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-300 block">Civil Status</label>
                      <p className="text-gray-800 dark:text-gray-100">{selectedEmployee.civilStatus || "N/A"}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-300 block">Contact</label>
                      <p className="text-gray-800 dark:text-gray-100">{formatPhoneNumber(selectedEmployee.contactNumber)}</p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-300 block">Email</label>
                    <p className="text-gray-800 dark:text-gray-100">{selectedEmployee.email || "N/A"}</p>
                  </div>
                  <div className="mt-2">
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-300 block">Address</label>
                    <p className="text-gray-800 dark:text-gray-100 text-sm">{selectedEmployee.address || "N/A"}</p>
                  </div>
                </div>

                {/* Employment Information */}
                <div className="border-b border-white/20 dark:border-gray-600/20 pb-3">
                  <h5 className="font-medium text-gray-700 dark:text-gray-200 mb-2">Employment Information</h5>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-300 block">Hire Date</label>
                      <p className="text-gray-800 dark:text-gray-100">{formatDate(selectedEmployee.hireDate)}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-300 block">Employee ID</label>
                      <p className="text-gray-800 dark:text-gray-100">{selectedEmployee.idNumber || "N/A"}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-300 block">Status</label>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                        selectedEmployee.status === "Active"
                          ? "bg-green-100/80 dark:bg-green-900/40 text-green-700 dark:text-green-300"
                          : selectedEmployee.status === "On Leave"
                          ? "bg-yellow-100/80 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300"
                          : "bg-red-100/80 dark:bg-red-900/40 text-red-700 dark:text-red-300"
                      }`}>
                        {selectedEmployee.status}
                      </span>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-300 block">Salary</label>
                      <p className="text-gray-800 dark:text-gray-100 font-medium">{selectedEmployee.salary || "N/A"}</p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-300 block">ID Barcode</label>
                    <p className="text-gray-800 dark:text-gray-100 font-mono text-xs">{selectedEmployee.idBarcode || "N/A"}</p>
                  </div>
                </div>

                {/* Government IDs */}
                <div className="pb-3">
                  <h5 className="font-medium text-gray-700 dark:text-gray-200 mb-2">Government IDs & Numbers</h5>
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    <div className="flex justify-between">
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-300">TIN Number:</label>
                      <p className="text-gray-800 dark:text-gray-100 font-mono">{selectedEmployee.tinNumber || "N/A"}</p>
                    </div>
                    <div className="flex justify-between">
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-300">SSS Number:</label>
                      <p className="text-gray-800 dark:text-gray-100 font-mono">{selectedEmployee.sssNumber || "N/A"}</p>
                    </div>
                    <div className="flex justify-between">
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Pag-IBIG Number:</label>
                      <p className="text-gray-800 dark:text-gray-100 font-mono">{selectedEmployee.pagibigNumber || "N/A"}</p>
                    </div>
                    <div className="flex justify-between">
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-300">PhilHealth Number:</label>
                      <p className="text-gray-800 dark:text-gray-100 font-mono">{selectedEmployee.philhealthNumber || "N/A"}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/30 dark:border-gray-600/30">
                <button 
                  onClick={() => handleEditEmployee(selectedEmployee)}
                  className="flex-1 bg-slate-600 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white py-2 rounded-lg transition-colors duration-200 text-sm"
                >
                  Edit Employee
                </button>
                <button
                  onClick={() => handleDeleteClick(selectedEmployee)}
                  className="flex-1 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white py-2 rounded-lg transition-colors duration-200 text-sm"
                >
                  Delete Employee
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">👤</div>
              <p className="text-gray-500 dark:text-gray-400">Select an employee to view detailed information</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Employee Modal */}
      {isEditModalOpen && editingEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Edit Employee</h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <form className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Personal Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2">
                    Personal Information
                  </h3>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name</label>
                      <input
                        type="text"
                        value={editingEmployee.firstName || ''}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Middle Name</label>
                      <input
                        type="text"
                        value={editingEmployee.middleName || ''}
                        onChange={(e) => handleInputChange('middleName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name</label>
                      <input
                        type="text"
                        value={editingEmployee.lastName || ''}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Age</label>
                        <input
                          type="number"
                          value={editingEmployee.age || ''}
                          onChange={(e) => handleInputChange('age', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Birth Date</label>
                        <input
                          type="date"
                          value={editingEmployee.birthDate || ''}
                          onChange={(e) => handleInputChange('birthDate', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Civil Status</label>
                      <select
                        value={editingEmployee.civilStatus || ''}
                        onChange={(e) => handleInputChange('civilStatus', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      >
                        <option value="">Select Status</option>
                        <option value="Single">Single</option>
                        <option value="Married">Married</option>
                        <option value="Divorced">Divorced</option>
                        <option value="Widowed">Widowed</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contact Number</label>
                      <input
                        type="tel"
                        value={editingEmployee.contactNumber || ''}
                        onChange={(e) => handleInputChange('contactNumber', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="+639123456789"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                      <input
                        type="email"
                        value={editingEmployee.email || ''}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
                      <textarea
                        value={editingEmployee.address || ''}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        rows="3"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                  </div>
                </div>

                {/* Employment Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2">
                    Employment Information
                  </h3>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Position</label>
                      <input
                        type="text"
                        value={editingEmployee.position || ''}
                        onChange={(e) => handleInputChange('position', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department</label>
                      <input
                        type="text"
                        value={editingEmployee.department || ''}
                        onChange={(e) => handleInputChange('department', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hire Date</label>
                      <input
                        type="date"
                        value={editingEmployee.hireDate || ''}
                        onChange={(e) => handleInputChange('hireDate', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Employee ID</label>
                      <input
                        type="text"
                        value={editingEmployee.idNumber || ''}
                        onChange={(e) => handleInputChange('idNumber', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                      <select
                        value={editingEmployee.status || ''}
                        onChange={(e) => handleInputChange('status', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      >
                        <option value="">Select Status</option>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                        <option value="On Leave">On Leave</option>
                        <option value="Terminated">Terminated</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Salary</label>
                      <input
                        type="text"
                        value={editingEmployee.salary || ''}
                        onChange={(e) => handleInputChange('salary', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="₱25,000"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ID Barcode</label>
                      <input
                        type="text"
                        value={editingEmployee.idBarcode || ''}
                        onChange={(e) => handleInputChange('idBarcode', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-mono text-sm"
                      />
                    </div>
                  </div>
                  
                  {/* Government IDs */}
                  <div className="mt-6">
                    <h4 className="text-md font-medium text-gray-800 dark:text-gray-100 mb-3 border-b border-gray-200 dark:border-gray-700 pb-1">
                      Government IDs & Numbers
                    </h4>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">TIN Number</label>
                        <input
                          type="text"
                          value={editingEmployee.tinNumber || ''}
                          onChange={(e) => handleInputChange('tinNumber', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-mono text-sm"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SSS Number</label>
                        <input
                          type="text"
                          value={editingEmployee.sssNumber || ''}
                          onChange={(e) => handleInputChange('sssNumber', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-mono text-sm"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pag-IBIG Number</label>
                        <input
                          type="text"
                          value={editingEmployee.pagibigNumber || ''}
                          onChange={(e) => handleInputChange('pagibigNumber', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-mono text-sm"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">PhilHealth Number</label>
                        <input
                          type="text"
                          value={editingEmployee.philhealthNumber || ''}
                          onChange={(e) => handleInputChange('philhealthNumber', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-mono text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </div>
            
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEmployee}
                disabled={isSaving}
                className="px-6 py-2 bg-slate-600 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && deleteEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full shadow-2xl">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 dark:bg-red-900/40 rounded-full">
                <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 text-center mb-2">
                Delete Employee Record
              </h2>
              
              <p className="text-gray-600 dark:text-gray-300 text-center mb-6">
                Are you sure you want to delete <strong>{deleteEmployee.fullName}</strong>? 
                This action cannot be undone and will permanently remove all employee data.
              </p>
              
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-red-500 dark:text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-red-700 dark:text-red-300">
                    <p className="font-medium">Warning: This action is irreversible</p>
                    <p>Employee ID: {deleteEmployee.idNumber}</p>
                    <p>Department: {deleteEmployee.department}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false)
                  setDeleteEmployee(null)
                }}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isSaving}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Deleting...' : 'Delete Employee'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EmployeeRecords