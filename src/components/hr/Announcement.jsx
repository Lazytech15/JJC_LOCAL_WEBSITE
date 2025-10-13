import { useState, useEffect } from "react"
import { useAuth } from "../../contexts/AuthContext"
import apiService from "../../utils/api/api-service"

function Announcement() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [employees, setEmployees] = useState([])
  const [departments, setDepartments] = useState([])
  const [announcements, setAnnouncements] = useState([])
  
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
      
      await apiService.announcements.createAnnouncement(announcementData)
      
      alert("Announcement sent successfully!")
      
      setFormData({
        title: "",
        message: "",
        recipientType: "all",
        selectedDepartments: [],
        selectedEmployees: [],
        priority: "normal",
        expiryDate: ""
      })
      
      fetchAnnouncements()
    } catch (err) {
      console.error("Error sending announcement:", err)
      alert(err.message || "Failed to send announcement")
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
    <div className="space-y-6">
      <div className="bg-white/30 dark:bg-gray-800/40 backdrop-blur-md rounded-2xl p-6 border border-white/30 dark:border-gray-700/30 shadow-lg">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-6">
          📣 Create Announcement
        </h2>

        <div className="space-y-6">
          <div>
            <label className="block text-gray-700 dark:text-gray-200 font-medium mb-2">
              Announcement Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="e.g., Company Holiday Notice"
              className="w-full px-4 py-2 rounded-lg bg-white/50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-gray-700 dark:text-gray-200 font-medium mb-2">
              Message *
            </label>
            <textarea
              name="message"
              value={formData.message}
              onChange={handleInputChange}
              placeholder="Enter your announcement message..."
              rows="5"
              className="w-full px-4 py-2 rounded-lg bg-white/50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-gray-100 resize-none"
            />
          </div>

          <div>
            <label className="block text-gray-700 dark:text-gray-200 font-medium mb-2">
              Priority
            </label>
            <select
              name="priority"
              value={formData.priority}
              onChange={handleInputChange}
              className="w-full px-4 py-2 rounded-lg bg-white/50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-gray-100"
            >
              <option value="normal">Normal</option>
              <option value="important">Important</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-700 dark:text-gray-200 font-medium mb-2">
              Expiry Date (Optional)
            </label>
            <input
              type="date"
              name="expiryDate"
              value={formData.expiryDate}
              onChange={handleInputChange}
              className="w-full px-4 py-2 rounded-lg bg-white/50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-gray-700 dark:text-gray-200 font-medium mb-3">
              Send To *
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => handleRecipientTypeChange("all")}
                className={`p-4 rounded-lg border-2 transition-all ${
                  formData.recipientType === "all"
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
                    : "border-gray-300 dark:border-gray-600 bg-white/30 dark:bg-gray-700/30"
                }`}
              >
                <div className="text-2xl mb-1">👥</div>
                <div className="font-medium text-gray-800 dark:text-gray-100">All Employees</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">{employees.length} employees</div>
              </button>

              <button
                type="button"
                onClick={() => handleRecipientTypeChange("department")}
                className={`p-4 rounded-lg border-2 transition-all ${
                  formData.recipientType === "department"
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
                    : "border-gray-300 dark:border-gray-600 bg-white/30 dark:bg-gray-700/30"
                }`}
              >
                <div className="text-2xl mb-1">🏢</div>
                <div className="font-medium text-gray-800 dark:text-gray-100">By Department</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">{departments.length} departments</div>
              </button>

              <button
                type="button"
                onClick={() => handleRecipientTypeChange("specific")}
                className={`p-4 rounded-lg border-2 transition-all ${
                  formData.recipientType === "specific"
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
                    : "border-gray-300 dark:border-gray-600 bg-white/30 dark:bg-gray-700/30"
                }`}
              >
                <div className="text-2xl mb-1">👤</div>
                <div className="font-medium text-gray-800 dark:text-gray-100">Specific Employees</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Select individuals</div>
              </button>
            </div>
          </div>

          {formData.recipientType === "department" && (
            <div className="bg-white/40 dark:bg-gray-700/40 rounded-lg p-4 border border-gray-300 dark:border-gray-600">
              <h3 className="font-medium text-gray-800 dark:text-gray-100 mb-3">
                Select Departments ({formData.selectedDepartments.length} selected)
              </h3>
              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                {departments.length === 0 ? (
                  <div className="col-span-2 text-center py-4 text-gray-500 dark:text-gray-400">
                    No departments available
                  </div>
                ) : (
                  departments.map((dept, index) => (
                    <label
                      key={index}
                      className="flex items-center p-3 rounded-lg bg-white/50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 hover:bg-white/70 dark:hover:bg-gray-700/70 cursor-pointer transition-all"
                    >
                      <input
                        type="checkbox"
                        checked={formData.selectedDepartments.includes(dept.name)}
                        onChange={() => handleDepartmentToggle(dept.name)}
                        className="mr-3 w-4 h-4"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-800 dark:text-gray-100">{dept.name}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                          {dept.totalCount || dept.employeeCount || 0} employees
                        </div>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          {formData.recipientType === "specific" && (
            <div className="bg-white/40 dark:bg-gray-700/40 rounded-lg p-4 border border-gray-300 dark:border-gray-600">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium text-gray-800 dark:text-gray-100">
                  Select Employees ({formData.selectedEmployees.length} selected)
                </h3>
                <button
                  type="button"
                  onClick={() => setShowEmployeeSelect(!showEmployeeSelect)}
                  className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
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
                    className="w-full px-4 py-2 rounded-lg bg-white/50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-gray-100 mb-3"
                  />

                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {filteredEmployees.length === 0 ? (
                      <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                        No employees found
                      </div>
                    ) : (
                      filteredEmployees.map((emp) => (
                        <label
                          key={emp.id}
                          className="flex items-center p-3 rounded-lg bg-white/50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 hover:bg-white/70 dark:hover:bg-gray-700/70 cursor-pointer transition-all"
                        >
                          <input
                            type="checkbox"
                            checked={formData.selectedEmployees.includes(emp.id)}
                            onChange={() => handleEmployeeToggle(emp.id)}
                            className="mr-3 w-4 h-4"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-gray-800 dark:text-gray-100">
                              {getEmployeeName(emp)}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-300">
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

          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-700 dark:text-gray-200 font-medium">
                Total Recipients:
              </span>
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {getRecipientCount()}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Sending..." : "Send Announcement"}
          </button>
        </div>
      </div>

      <div className="bg-white/30 dark:bg-gray-800/40 backdrop-blur-md rounded-2xl p-6 border border-white/30 dark:border-gray-700/30 shadow-lg">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-6">
          Recent Announcements
        </h2>

        <div className="space-y-3">
          {announcements.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No announcements yet. Create your first announcement above!
            </div>
          ) : (
            announcements.map((announcement) => (
              <div
                key={announcement.id}
                className="bg-white/40 dark:bg-gray-700/40 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-gray-800 dark:text-gray-100">
                    {announcement.title}
                  </h3>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    announcement.priority === "urgent"
                      ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                      : announcement.priority === "important"
                      ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  }`}>
                    {announcement.priority}
                  </span>
                </div>
                <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">
                  {announcement.message}
                </p>
                <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                  <span>
                    To: {announcement.recipientType === 'all' 
                      ? 'All Employees' 
                      : announcement.recipientType === 'department'
                      ? `${announcement.totalRecipients || 0} employee(s) in selected departments`
                      : `${announcement.totalRecipients || 0} specific employee(s)`
                    }
                  </span>
                  <span>{new Date(announcement.createdAt).toLocaleDateString()}</span>
                </div>
                {announcement.readCount !== undefined && announcement.totalRecipients && (
                  <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Read by {announcement.readCount} of {announcement.totalRecipients} recipients
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default Announcement