import { useState, useEffect } from "react"
import { useAuth } from "../../contexts/AuthContext"
import apiService from "../../utils/api/api-service"

function Announcement() {
  const { user, isDarkMode } = useAuth()
  const [loading, setLoading] = useState(false)
  const [employees, setEmployees] = useState([])
  const [departments, setDepartments] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [attachments, setAttachments] = useState([])
  const [uploadingFiles, setUploadingFiles] = useState(false)
  
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    recipientType: "all",
    selectedDepartments: [],
    selectedEmployees: [],
    priority: "normal",
    expiryDate: ""
  })

  const [searchTerm, setSearchTerm] = useState("")
  const [showEmployeeSelect, setShowEmployeeSelect] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  useEffect(() => {
    fetchEmployeesAndDepartments()
    fetchAnnouncements()
  }, [])

  const fetchEmployeesAndDepartments = async () => {
    try {
      const data = await apiService.auth.getHRData()
      setEmployees(data.employees || [])
      setDepartments(data.departments || [])
    } catch (err) {
      console.error("Error fetching data:", err)
    }
  }

  const fetchAnnouncements = async () => {
    try {
      const response = await apiService.announcements.getAnnouncements({ 
        limit: 10, 
        status: 'active' 
      })
      setAnnouncements(response.announcements || [])
    } catch (err) {
      console.error("Error fetching announcements:", err)
      setAnnouncements([])
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleRecipientTypeChange = (type) => {
    setFormData(prev => ({
      ...prev,
      recipientType: type,
      selectedDepartments: [],
      selectedEmployees: []
    }))
  }

  const handleDepartmentToggle = (deptName) => {
    setFormData(prev => {
      const isSelected = prev.selectedDepartments.includes(deptName)
      return {
        ...prev,
        selectedDepartments: isSelected
          ? prev.selectedDepartments.filter(d => d !== deptName)
          : [...prev.selectedDepartments, deptName]
      }
    })
  }

  const handleEmployeeToggle = (empId) => {
    setFormData(prev => {
      const isSelected = prev.selectedEmployees.includes(empId)
      return {
        ...prev,
        selectedEmployees: isSelected
          ? prev.selectedEmployees.filter(id => id !== empId)
          : [...prev.selectedEmployees, empId]
      }
    })
  }

  // Add this handler function
const handleFileSelect = (e) => {
  const files = Array.from(e.target.files)
  
  // Validate files
  const validFiles = []
  const errors = []
  
  files.forEach(file => {
    // Check file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      errors.push(`${file.name}: File too large (max 10MB)`)
      return
    }
    
    // Check file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/zip'
    ]
    
    if (!allowedTypes.includes(file.type)) {
      errors.push(`${file.name}: Invalid file type`)
      return
    }
    
    validFiles.push(file)
  })
  
  if (errors.length > 0) {
    alert('Some files were not added:\n' + errors.join('\n'))
  }
  
  setAttachments(prev => [...prev, ...validFiles])
}

const removeAttachment = (index) => {
  setAttachments(prev => prev.filter((_, i) => i !== index))
}

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const handleSubmit = async () => {
  if (!formData.title || !formData.message) {
    alert("Please fill in title and message")
    return
  }

  if (formData.recipientType === "department" && formData.selectedDepartments.length === 0) {
    alert("Please select at least one department")
    return
  }

  if (formData.recipientType === "specific" && formData.selectedEmployees.length === 0) {
    alert("Please select at least one employee")
    return
  }

  setLoading(true)
  try {
    const userId = user?.uid || user?.id || 1
    
    const announcementData = {
      title: formData.title,
      message: formData.message,
      recipientType: formData.recipientType,
      priority: formData.priority,
      expiryDate: formData.expiryDate || null,
      createdBy: userId,
      selectedDepartments: formData.selectedDepartments,
      selectedEmployees: formData.selectedEmployees
    }
    
    console.log("📢 Creating announcement with data:", announcementData)
    
    let announcementId
    
    if (editingId) {
      const updateResult = await apiService.announcements.updateAnnouncement(editingId, announcementData)
      announcementId = editingId
      console.log("✅ Announcement updated, ID:", announcementId)
    } else {
      const result = await apiService.announcements.createAnnouncement(announcementData)
      console.log("📋 Create announcement result:", result)
      
      // Try different possible locations for the ID
      announcementId = result?.data?.id || result?.id || result?.data?.announcement?.id
      
      console.log("✅ Announcement created, ID:", announcementId)
    }
    
    // Verify we have an announcement ID
    if (!announcementId) {
      console.error("❌ No announcement ID received from server!")
      console.error("Server response was:", result)
      throw new Error("Server did not return an announcement ID")
    }
    
    // Upload attachments if any
    if (attachments.length > 0) {
      console.log(`📎 Uploading ${attachments.length} attachments for announcement ${announcementId}`)
      console.log("📎 Attachments to upload:", attachments.map(f => ({
        name: f.name,
        size: f.size,
        type: f.type
      })))
      
      setUploadingFiles(true)
      try {
        const uploadResult = await apiService.announcements.uploadAnnouncementAttachments(
          announcementId, 
          attachments
        )
        console.log("✅ Attachments uploaded successfully:", uploadResult)
        alert(editingId ? "Announcement and attachments updated successfully!" : "Announcement and attachments created successfully!")
      } catch (err) {
        console.error("❌ Error uploading attachments:", err)
        console.error("Error details:", {
          message: err.message,
          response: err.response,
          stack: err.stack
        })
        alert("Announcement created but attachments failed to upload: " + (err.message || "Unknown error"))
      } finally {
        setUploadingFiles(false)
      }
    } else {
      console.log("ℹ️ No attachments to upload")
      alert(editingId ? "Announcement updated successfully!" : "Announcement created successfully!")
    }
    
    // Reset form
    setFormData({
      title: "",
      message: "",
      recipientType: "all",
      selectedDepartments: [],
      selectedEmployees: [],
      priority: "normal",
      expiryDate: ""
    })
    setAttachments([])
    setEditingId(null)
    
    fetchAnnouncements()
  } catch (err) {
    console.error("❌ Error in handleSubmit:", err)
    console.error("Error details:", {
      message: err.message,
      response: err.response,
      stack: err.stack
    })
    alert(err.message || "Failed to send announcement")
  } finally {
    setLoading(false)
  }
}

  const handleEdit = (announcement) => {
    setEditingId(announcement.id)
    
    setFormData({
      title: announcement.title,
      message: announcement.message,
      recipientType: announcement.recipientType,
      priority: announcement.priority,
      expiryDate: announcement.expiryDate || "",
      selectedDepartments: announcement.recipients
        ?.filter(r => r.recipient_type === 'department')
        .map(r => r.department_name) || [],
      selectedEmployees: announcement.recipients
        ?.filter(r => r.recipient_type === 'employee')
        .map(r => r.employee_id) || []
    })
    
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setFormData({
      title: "",
      message: "",
      recipientType: "all",
      selectedDepartments: [],
      selectedEmployees: [],
      priority: "normal",
      expiryDate: ""
    })
  }

  const handleDelete = async (id) => {
    try {
      setLoading(true)
      await apiService.announcements.deleteAnnouncement(id)
      alert("Announcement deleted successfully!")
      setDeleteConfirm(null)
      fetchAnnouncements()
    } catch (err) {
      console.error("Error deleting announcement:", err)
      alert(err.message || "Failed to delete announcement")
    } finally {
      setLoading(false)
    }
  }

  const filteredEmployees = employees.filter(emp =>
    emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.position?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.department?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getRecipientCount = () => {
    if (formData.recipientType === "all") return employees.length
    if (formData.recipientType === "department") {
      return employees.filter(emp => 
        formData.selectedDepartments.includes(emp.department)
      ).length
    }
    return formData.selectedEmployees.length
  }

  const getEmployeeName = (emp) => {
    if (emp.name) return emp.name
    if (emp.firstName && emp.lastName) {
      return `${emp.firstName} ${emp.lastName}`
    }
    return `Employee ${emp.id}`
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDarkMode
        ? "bg-linear-to-br from-gray-950 via-gray-900 to-gray-950"
        : "bg-linear-to-br from-gray-50 via-slate-50 to-stone-50"
    }`}>
      <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6">
        {/* Create/Edit Announcement Form */}
        <div className={`rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 shadow-xl border transition-all ${
          isDarkMode 
            ? "bg-gray-800/90 backdrop-blur-xl border-gray-700/50" 
            : "bg-white/90 backdrop-blur-xl border-white/50"
        }`}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3 sm:gap-0">
            <h2 className={`text-xl sm:text-2xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
              📣 {editingId ? "Edit Announcement" : "Create Announcement"}
            </h2>
            {editingId && (
              <button
                onClick={handleCancelEdit}
                className={`px-4 py-2 rounded-lg font-medium transition-all text-sm sm:text-base ${
                  isDarkMode
                    ? "text-gray-300 hover:text-white hover:bg-gray-700/50"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                Cancel Edit
              </button>
            )}
          </div>

          <div className="space-y-4 sm:space-y-6">
            {/* Title Input */}
            <div>
              <label className={`block font-medium mb-2 text-sm sm:text-base ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}>
                Announcement Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="e.g., Company Holiday Notice"
                className={`w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg border-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm sm:text-base ${
                  isDarkMode
                    ? "bg-gray-900/50 border-gray-700 text-white placeholder-gray-500"
                    : "bg-white border-gray-200 text-gray-900 placeholder-gray-400"
                }`}
              />
            </div>

            {/* Message Textarea */}
            <div>
              <label className={`block font-medium mb-2 text-sm sm:text-base ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}>
                Message *
              </label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleInputChange}
                placeholder="Enter your announcement message..."
                rows="5"
                className={`w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg border-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none transition-all text-sm sm:text-base ${
                  isDarkMode
                    ? "bg-gray-900/50 border-gray-700 text-white placeholder-gray-500"
                    : "bg-white border-gray-200 text-gray-900 placeholder-gray-400"
                }`}
              />
            </div>

            {/* Priority and Expiry Date - Side by Side on Desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {/* Priority Select */}
              <div>
                <label className={`block font-medium mb-2 text-sm sm:text-base ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}>
                  Priority
                </label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleInputChange}
                  className={`w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg border-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm sm:text-base ${
                    isDarkMode
                      ? "bg-gray-900/50 border-gray-700 text-white"
                      : "bg-white border-gray-200 text-gray-900"
                  }`}
                >
                  <option value="normal">Normal</option>
                  <option value="important">Important</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              {/* Expiry Date */}
              <div>
                <label className={`block font-medium mb-2 text-sm sm:text-base ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}>
                  Expiry Date (Optional)
                </label>
                <input
                  type="date"
                  name="expiryDate"
                  value={formData.expiryDate}
                  onChange={handleInputChange}
                  className={`w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg border-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm sm:text-base ${
                    isDarkMode
                      ? "bg-gray-900/50 border-gray-700 text-white"
                      : "bg-white border-gray-200 text-gray-900"
                  }`}
                />
              </div>
            </div>

            {/* File Attachments */}
<div>
  <label className={`block font-medium mb-2 text-sm sm:text-base ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}>
    Attachments (Optional)
  </label>
  
  <div className={`border-2 border-dashed rounded-xl p-4 transition-all ${
    isDarkMode 
      ? "border-gray-700 bg-gray-900/50 hover:border-gray-600" 
      : "border-gray-300 bg-gray-50 hover:border-gray-400"
  }`}>
    <input
      type="file"
      id="file-upload"
      multiple
      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp,.zip"
      onChange={handleFileSelect}
      className="hidden"
    />
    
    <label
      htmlFor="file-upload"
      className="cursor-pointer flex flex-col items-center justify-center py-4"
    >
      <svg className={`w-10 h-10 mb-2 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
      <span className={`text-sm font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
        Click to upload files
      </span>
      <span className={`text-xs mt-1 ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>
        PDF, DOC, XLS, Images, ZIP (max 10MB each)
      </span>
    </label>
    
    {attachments.length > 0 && (
      <div className="mt-4 space-y-2">
        <p className={`text-xs font-medium ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
          {attachments.length} file(s) selected
        </p>
        {attachments.map((file, index) => (
          <div
            key={index}
            className={`flex items-center justify-between p-3 rounded-lg ${
              isDarkMode ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-200"
            }`}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <svg className={`w-5 h-5 shrink-0 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                  {file.name}
                </p>
                <p className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>
                  {formatFileSize(file.size)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => removeAttachment(index)}
              className={`p-2 rounded-lg transition-all shrink-0 ${
                isDarkMode
                  ? "text-red-400 hover:bg-red-500/20"
                  : "text-red-600 hover:bg-red-50"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    )}
  </div>
  
  <p className={`text-xs mt-2 ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>
    💡 Tip: You can attach documents, images, or files to support your announcement
  </p>
</div>

            {/* Recipient Type Selection */}
            <div>
              <label className={`block font-medium mb-3 text-sm sm:text-base ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}>
                Send To *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => handleRecipientTypeChange("all")}
                  className={`p-3 sm:p-4 rounded-xl border-2 transition-all ${
                    formData.recipientType === "all"
                      ? isDarkMode
                        ? "border-blue-500 bg-blue-500/20 shadow-lg shadow-blue-500/20"
                        : "border-blue-500 bg-blue-50 shadow-lg shadow-blue-500/10"
                      : isDarkMode
                      ? "border-gray-700 bg-gray-800/50 hover:border-gray-600"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="text-2xl sm:text-3xl mb-1 sm:mb-2">👥</div>
                  <div className={`font-semibold text-sm sm:text-base ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                    All Employees
                  </div>
                  <div className={`text-xs sm:text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                    {employees.length} employees
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleRecipientTypeChange("department")}
                  className={`p-3 sm:p-4 rounded-xl border-2 transition-all ${
                    formData.recipientType === "department"
                      ? isDarkMode
                        ? "border-blue-500 bg-blue-500/20 shadow-lg shadow-blue-500/20"
                        : "border-blue-500 bg-blue-50 shadow-lg shadow-blue-500/10"
                      : isDarkMode
                      ? "border-gray-700 bg-gray-800/50 hover:border-gray-600"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="text-2xl sm:text-3xl mb-1 sm:mb-2">🏢</div>
                  <div className={`font-semibold text-sm sm:text-base ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                    By Department
                  </div>
                  <div className={`text-xs sm:text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                    {departments.length} departments
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleRecipientTypeChange("specific")}
                  className={`p-3 sm:p-4 rounded-xl border-2 transition-all ${
                    formData.recipientType === "specific"
                      ? isDarkMode
                        ? "border-blue-500 bg-blue-500/20 shadow-lg shadow-blue-500/20"
                        : "border-blue-500 bg-blue-50 shadow-lg shadow-blue-500/10"
                      : isDarkMode
                      ? "border-gray-700 bg-gray-800/50 hover:border-gray-600"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="text-2xl sm:text-3xl mb-1 sm:mb-2">👤</div>
                  <div className={`font-semibold text-sm sm:text-base ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                    Specific Employees
                  </div>
                  <div className={`text-xs sm:text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                    Select individuals
                  </div>
                </button>
              </div>
            </div>

            {/* Department Selection */}
            {formData.recipientType === "department" && (
              <div className={`rounded-xl p-3 sm:p-4 border-2 ${
                isDarkMode ? "bg-gray-800/50 border-gray-700" : "bg-gray-50 border-gray-200"
              }`}>
                <h3 className={`font-semibold mb-3 text-sm sm:text-base ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                  Select Departments ({formData.selectedDepartments.length} selected)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                  {departments.length === 0 ? (
                    <div className={`col-span-2 text-center py-4 text-sm ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                      No departments available
                    </div>
                  ) : (
                    departments.map((dept, index) => (
                      <label
                        key={index}
                        className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                          isDarkMode
                            ? "bg-gray-900/50 border-gray-700 hover:bg-gray-900/70"
                            : "bg-white border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={formData.selectedDepartments.includes(dept.name)}
                          onChange={() => handleDepartmentToggle(dept.name)}
                          className="mr-3 w-4 h-4 accent-blue-500 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className={`font-medium text-sm sm:text-base truncate ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                            {dept.name}
                          </div>
                          <div className={`text-xs sm:text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                            {dept.totalCount || dept.employeeCount || 0} employees
                          </div>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Employee Selection */}
            {formData.recipientType === "specific" && (
              <div className={`rounded-xl p-3 sm:p-4 border-2 ${
                isDarkMode ? "bg-gray-800/50 border-gray-700" : "bg-gray-50 border-gray-200"
              }`}>
                <div className="flex justify-between items-center mb-3">
                  <h3 className={`font-semibold text-sm sm:text-base ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                    Select Employees ({formData.selectedEmployees.length} selected)
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowEmployeeSelect(!showEmployeeSelect)}
                    className="text-blue-500 hover:text-blue-600 font-medium text-xs sm:text-sm transition-colors"
                  >
                    {showEmployeeSelect ? "Hide" : "Show"} List
                  </button>
                </div>

                {showEmployeeSelect && (
                  <>
                    <input
                      type="text"
                      placeholder="Search employees..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={`w-full px-3 sm:px-4 py-2 rounded-lg border-2 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3 transition-all text-sm sm:text-base ${
                        isDarkMode
                          ? "bg-gray-900/50 border-gray-700 text-white placeholder-gray-500"
                          : "bg-white border-gray-200 text-gray-900 placeholder-gray-400"
                      }`}
                    />

                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {filteredEmployees.length === 0 ? (
                        <div className={`text-center py-4 text-sm ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                          No employees found
                        </div>
                      ) : (
                        filteredEmployees.map((emp) => (
                          <label
                            key={emp.id}
                            className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                              isDarkMode
                                ? "bg-gray-900/50 border-gray-700 hover:bg-gray-900/70"
                                : "bg-white border-gray-200 hover:bg-gray-50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={formData.selectedEmployees.includes(emp.id)}
                              onChange={() => handleEmployeeToggle(emp.id)}
                              className="mr-3 w-4 h-4 accent-blue-500 shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className={`font-medium text-sm sm:text-base truncate ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                                {getEmployeeName(emp)}
                              </div>
                              <div className={`text-xs sm:text-sm truncate ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                                {emp.position || 'N/A'} - {emp.department || 'N/A'}
                              </div>
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Recipient Count */}
            <div className={`rounded-xl p-3 sm:p-4 border-2 ${
              isDarkMode 
                ? "bg-blue-500/10 border-blue-500/30" 
                : "bg-blue-50 border-blue-200"
            }`}>
              <div className="flex items-center justify-between">
                <span className={`font-semibold text-sm sm:text-base ${isDarkMode ? "text-blue-300" : "text-blue-900"}`}>
                  Total Recipients:
                </span>
                <span className={`text-2xl sm:text-3xl font-bold ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}>
                  {getRecipientCount()}
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="w-full `bg-linear-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30 text-sm sm:text-base"
            >
              {loading ? "Processing..." : editingId ? "Update Announcement" : "Send Announcement"}
            </button>
          </div>
        </div>

        {/* Recent Announcements */}
        <div className={`rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 shadow-xl border transition-all ${
          isDarkMode 
            ? "bg-gray-800/90 backdrop-blur-xl border-gray-700/50" 
            : "bg-white/90 backdrop-blur-xl border-white/50"
        }`}>
          <h2 className={`text-xl sm:text-2xl font-bold mb-4 sm:mb-6 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
            Recent Announcements
          </h2>

          <div className="space-y-3 sm:space-y-4">
            {announcements.length === 0 ? (
              <div className={`text-center py-12 text-sm sm:text-base ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                No announcements yet. Create your first announcement above!
              </div>
            ) : (
              announcements.map((announcement) => (
                <div
                  key={announcement.id}
                  className={`rounded-xl p-4 sm:p-5 border-2 transition-all ${
                    isDarkMode
                      ? "bg-gray-900/50 border-gray-700 hover:border-gray-600"
                      : "bg-white border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex justify-between items-start mb-3 gap-2">
                    <h3 className={`font-bold text-base sm:text-lg flex-1 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                      {announcement.title}
                    </h3>
                    <div className="flex items-center gap-1 sm:gap-2 fshrink-0">
                      <span className={`text-xs px-2 sm:px-3 py-1 rounded-full font-medium whitespace-nowrap ${
                        announcement.priority === "urgent"
                          ? isDarkMode
                            ? "bg-red-500/20 text-red-300 border border-red-500/30"
                            : "bg-red-100 text-red-700 border border-red-200"
                          : announcement.priority === "important"
                          ? isDarkMode
                            ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
                            : "bg-yellow-100 text-yellow-700 border border-yellow-200"
                          : isDarkMode
                          ? "bg-gray-700 text-gray-300 border border-gray-600"
                          : "bg-gray-100 text-gray-700 border border-gray-200"
                      }`}>
                        {announcement.priority}
                      </span>
                      <button
                        onClick={() => handleEdit(announcement)}
                        className={`p-1.5 sm:p-2 rounded-lg transition-all ${
                          isDarkMode
                            ? "text-blue-400 hover:bg-blue-500/20"
                            : "text-blue-600 hover:bg-blue-100"
                        }`}
                        title="Edit"
                      >
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(announcement.id)}
                        className={`p-1.5 sm:p-2 rounded-lg transition-all ${
                          isDarkMode
                            ? "text-red-400 hover:bg-red-500/20"
                            : "text-red-600 hover:bg-red-100"
                        }`}
                        title="Delete"
                      >
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <p className={`mb-4 leading-relaxed text-sm sm:text-base ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
                    {announcement.message}
                  </p>

                  {announcement.attachments && announcement.attachments.length > 0 && (
                    <div className={`mt-3 pt-3 border-t ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}>
                      <p className={`text-xs font-medium mb-2 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                        📎 {announcement.attachments.length} attachment(s)
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {announcement.attachments.map((att, idx) => (
                          <span
                            key={idx}
                            className={`text-xs px-2 py-1 rounded ${
                              isDarkMode ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {att.original_name || att.filename}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className={`flex flex-col sm:flex-row justify-between sm:items-center gap-2 text-xs sm:text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                    <span className="wrap-break-word">
                      📨 To: {announcement.recipientType === 'all' 
                        ? 'All Employees' 
                        : announcement.recipientType === 'department'
                        ? `${announcement.totalRecipients || 0} employee(s) in selected departments`
                        : `${announcement.totalRecipients || 0} specific employee(s)`
                      }
                    </span>
                    <span className="whitespace-nowrap">📅 {new Date(announcement.createdAt).toLocaleDateString()}</span>
                  </div>

                  {announcement.readCount !== undefined && announcement.totalRecipients && (
                    <div className={`mt-3 pt-3 border-t ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}>
                      <div className={`text-xs sm:text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                        ✓ Read by {announcement.readCount} of {announcement.totalRecipients} recipients
                      </div>
                    </div>
                  )}

                  {/* Delete Confirmation Modal */}
                  {deleteConfirm === announcement.id && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                      <div className={`rounded-xl sm:rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-2xl ${
                        isDarkMode ? "bg-gray-800 border border-gray-700" : "bg-white"
                      }`}>
                        <h3 className={`text-lg sm:text-xl font-bold mb-3 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                          Delete Announcement?
                        </h3>
                        <p className={`mb-6 text-sm sm:text-base ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
                          Are you sure you want to delete <strong>"{announcement.title}"</strong>? This action cannot be undone.
                        </p>
                        <div className="flex gap-3 justify-end">
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className={`px-4 sm:px-5 py-2 rounded-lg font-medium transition-all text-sm sm:text-base ${
                              isDarkMode
                                ? "text-gray-300 hover:bg-gray-700"
                                : "text-gray-600 hover:bg-gray-100"
                            }`}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleDelete(announcement.id)}
                            disabled={loading}
                            className="px-4 sm:px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-all disabled:opacity-50 shadow-lg shadow-red-500/30 text-sm sm:text-base"
                          >
                            {loading ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Announcement