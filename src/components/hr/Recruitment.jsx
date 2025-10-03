import { useState, useEffect } from "react"
import { useAuth } from "../../contexts/AuthContext"
import apiService from "../../utils/api/api-service"

function Recruitment() {
  const { user, isDarkMode } = useAuth()
  const [formData, setFormData] = useState({
    // Personal Information
    firstName: "",
    middleName: "",
    lastName: "",
    age: "",
    birthDate: "",
    contactNumber: "",
    email: "",
    civilStatus: "",
    address: "",

    // Job Information
    position: "",
    department: "",
    salary: "",
    hireDate: "",
    status: "Active",

    // Government IDs (optional)
    tinNumber: "",
    sssNumber: "",
    pagibigNumber: "",
    philhealthNumber: "",

    // System fields
    username: "",
    accessLevel: "user",

    // Employee ID and Barcode (manual input)
    idNumber: "",
    idBarcode: "",
  })

  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingDepartments, setLoadingDepartments] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [validationErrors, setValidationErrors] = useState({})
  const [validationLoading, setValidationLoading] = useState({})

  // Updated profile picture state management
  const [profilePictureFile, setProfilePictureFile] = useState(null)
  const [uploadingProfile, setUploadingProfile] = useState(false)
  const [profilePreview, setProfilePreview] = useState(null)
  const [hasBeenValidated, setHasBeenValidated] = useState({})
  const [createdEmployeeUid, setCreatedEmployeeUid] = useState(null)

  // Upload documents
  const [documentFile, setDocumentFile] = useState(null)
  const [uploadingDocument, setUploadingDocument] = useState(false)
  const [documentPreview, setDocumentPreview] = useState(null)

  // Civil status options
  const civilStatusOptions = ["Single", "Married", "Divorced", "Widowed", "Separated"]

  // Access level options
  const accessLevelOptions = [
    { value: "user", label: "User" },
    { value: "admin", label: "Admin" },
    { value: "hr", label: "HR" },
    { value: "manager", label: "Manager" },
  ]

  // Fetch departments on component mount
  useEffect(() => {
    fetchDepartments()
  }, [])

  const fetchDepartments = async () => {
    setLoadingDepartments(true)
    try {
      const data = await apiService.employees.getDepartments()

      if (data.success) {
        setDepartments(data.data || [])
      } else {
        console.error("Failed to fetch departments:", data.error)
        // Fallback to predefined departments
        setDepartments([
          { name: "Human Resources", employee_count: 0, active_count: 0 },
          { name: "Engineering", employee_count: 0, active_count: 0 },
          { name: "Finance", employee_count: 0, active_count: 0 },
          { name: "Marketing", employee_count: 0, active_count: 0 },
          {
            name: "Information Technology",
            employee_count: 0,
            active_count: 0,
          },
          { name: "Operations", employee_count: 0, active_count: 0 },
          { name: "Procurement", employee_count: 0, active_count: 0 },
        ])
      }
    } catch (err) {
      console.error("Error fetching departments:", err)
      // Fallback to predefined departments
      setDepartments([
        { name: "Human Resources", employee_count: 0, active_count: 0 },
        { name: "Engineering", employee_count: 0, active_count: 0 },
        { name: "Finance", employee_count: 0, active_count: 0 },
        { name: "Marketing", employee_count: 0, active_count: 0 },
        { name: "Information Technology", employee_count: 0, active_count: 0 },
        { name: "Operations", employee_count: 0, active_count: 0 },
        { name: "Procurement", employee_count: 0, active_count: 0 },
      ])
    } finally {
      setLoadingDepartments(false)
    }
  }

  // Only email format validation for basic email structure
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Debounced validation function
const validationTimeouts = {}

const validateField = async (fieldName, value, delay = 800) => {
  // Clear existing timeout for this field
  if (validationTimeouts[fieldName]) {
    clearTimeout(validationTimeouts[fieldName])
  }

  // Clear previous error for immediate feedback
  setValidationErrors((prev) => ({
    ...prev,
    [fieldName]: null,
  }))

  // Reset validation completion status when user starts typing
  setHasBeenValidated((prev) => ({
    ...prev,
    [fieldName]: false,
  }))

  if (!value || !value.trim()) return

  // Only format validation for email
  if (fieldName === "email" && !isValidEmail(value)) {
    setValidationErrors((prev) => ({
      ...prev,
      [fieldName]: "Please enter a valid email address",
    }))
    return
  }

  // Set loading state for this field
  setValidationLoading((prev) => ({
    ...prev,
    [fieldName]: true,
  }))

  validationTimeouts[fieldName] = setTimeout(async () => {
    try {
      const params = { [fieldName]: value.trim() }
      
      const response = await apiService.employees.validateEmployee(params)
      console.log("Full validation response:", response)

      // Check if response is successful
      if (!response || !response.success) {
        console.error("Validation failed:", response)
        throw new Error(response?.message || "Validation failed")
      }

      // The validation data is directly on the response object, not nested in .data
      const validationData = response.data || response
      console.log("Validation data:", validationData)

      // Set validation error if field is not available
      setValidationErrors((prev) => ({
        ...prev,
        [fieldName]: getValidationMessage(fieldName, validationData),
      }))

      // Mark field as validated after successful API response
      setHasBeenValidated((prev) => ({
        ...prev,
        [fieldName]: true,
      }))

    } catch (err) {
      console.error(`Error validating ${fieldName}:`, err)
      setValidationErrors((prev) => ({
        ...prev,
        [fieldName]: `Error checking ${fieldName} availability`,
      }))
      setHasBeenValidated((prev) => ({
        ...prev,
        [fieldName]: true,
      }))
    } finally {
      setValidationLoading((prev) => ({
        ...prev,
        [fieldName]: false,
      }))
    }
  }, delay)
}

// Get validation message based on field and result
const getValidationMessage = (fieldName, validationData) => {
  console.log("Getting validation message for:", fieldName, validationData)
  
  // Safety check
  if (!validationData) {
    console.error("No validation data received")
    return null
  }

  switch (fieldName) {
    case "email":
      return validationData.emailAvailable === false ? "Email already exists" : null
    case "username":
      return validationData.usernameAvailable === false ? "Username already exists" : null
    case "idNumber":
      return validationData.employeeIdAvailable === false ? "ID Number already exists" : null
    case "idBarcode":
      return validationData.idBarcodeAvailable === false ? "ID Barcode already exists" : null
    default:
      return null
  }
}

  // Updated profile picture change handler using ProfileService validation
  const handleProfilePictureChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    try {
      // Use ProfileService validation method
      apiService.profiles.validateFile(file)

      // Store the file for later upload (after employee is created)
      setProfilePictureFile(file)

      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => setProfilePreview(e.target.result)
      reader.readAsDataURL(file)

      // Clear any previous errors
      setError(null)
      console.log("Profile picture selected:", file.name)
    } catch (validationError) {
      setError(validationError.message)
      setProfilePictureFile(null)
      setProfilePreview(null)
    }
  }

  // Updated document change handler using DocumentService validation
  const handleDocumentChange = async (e) => {
    const file = e.target.files[0]
    if (!file) {
      setDocumentFile(null)
      setDocumentPreview(null)
      return
    }

    try {
      // Use DocumentService validation method
      apiService.document.validateDocumentFile(file)

      // Store the file for later upload
      setDocumentFile(file)
      
      // Create preview info
      setDocumentPreview({
        name: file.name,
        size: file.size,
        type: file.type,
        formattedSize: apiService.document.formatFileSize(file.size),
        extension: apiService.document.getFileExtension(file.name)
      })

      // Clear any previous errors
      setError(null)
      console.log("Document selected:", file.name)
    } catch (validationError) {
      setError(validationError.message)
      setDocumentFile(null)
      setDocumentPreview(null)
    }
  }

  // Updated document upload using DocumentService
  const uploadDocumentForEmployee = async (employeeUid) => {
    if (!documentFile || !employeeUid) return

    setUploadingDocument(true)

    try {
      console.log("Uploading document for employee UID:", employeeUid)

      // Use DocumentService uploadDocuments method
      const result = await apiService.document.uploadDocuments(employeeUid, documentFile)

      if (result && result.success) {
        console.log("Document upload successful:", result)
        return result
      } else {
        throw new Error(result?.error || "Failed to upload document")
      }
    } catch (err) {
      console.error("Error uploading document:", err)
      setError(`Employee created successfully, but document upload failed: ${err.message}`)
      return null
    } finally {
      setUploadingDocument(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))

    // Clear previous validation errors
    if (validationErrors[name]) {
      setValidationErrors((prev) => ({
        ...prev,
        [name]: null,
      }))
    }

    // Auto-generate username from first and last name
    if (name === "firstName" || name === "lastName") {
      const firstName = name === "firstName" ? value : formData.firstName
      const lastName = name === "lastName" ? value : formData.lastName

      if (firstName && lastName && !formData.username) {
        const generatedUsername = `${firstName.toLowerCase()}${lastName.toLowerCase()}`.replace(/\s/g, "")
        setFormData((prev) => ({
          ...prev,
          username: generatedUsername,
        }))
      }
    }

    // Validate fields that require server-side validation
    if (["email", "username", "idNumber", "idBarcode"].includes(name) && value) {
      validateField(name, value)
    }
  }

  // Updated profile picture upload using ProfileService
  const uploadProfilePictureForEmployee = async (employeeUid) => {
    if (!profilePictureFile || !employeeUid) return

    setUploadingProfile(true)

    try {
      console.log("Uploading profile picture for employee UID:", employeeUid)

      // Use ProfileService uploadProfileByUid method
      const result = await apiService.profiles.uploadProfileByUid(employeeUid, profilePictureFile)

      console.log("Profile picture upload successful:", result)
      return result

    } catch (err) {
      console.error("Error uploading profile picture:", err)
      setError(`Employee created successfully, but profile picture upload failed: ${err.message}`)
      return null
    } finally {
      setUploadingProfile(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      // Final validation check
      const finalValidationErrors = {}

      // Check required fields
      if (!formData.firstName) finalValidationErrors.firstName = "First name is required"
      if (!formData.lastName) finalValidationErrors.lastName = "Last name is required"
      if (!formData.email) finalValidationErrors.email = "Email is required"
      if (!formData.position) finalValidationErrors.position = "Position is required"
      if (!formData.department) finalValidationErrors.department = "Department is required"
      if (!formData.idNumber) finalValidationErrors.idNumber = "ID Number is required"

      // Only check email format
      if (formData.email && !isValidEmail(formData.email)) {
        finalValidationErrors.email = "Please enter a valid email address"
      }

      if (Object.keys(finalValidationErrors).length > 0) {
        setValidationErrors(finalValidationErrors)
        throw new Error("Please correct the validation errors")
      }

      // Check for existing validation errors
      const hasExistingErrors = Object.values(validationErrors).some((error) => error !== null)
      if (hasExistingErrors) {
        throw new Error("Please resolve all validation errors before submitting")
      }

      // Prepare data to match your backend route structure
      const employeeData = {
        // Personal information - matching backend parameter names
        first_name: formData.firstName,
        middle_name: formData.middleName || null,
        last_name: formData.lastName,

        // Contact information
        email: formData.email,
        contact_number: formData.contactNumber || null,
        address: formData.address || null,

        // Personal details
        age: formData.age ? parseInt(formData.age) : null,
        birth_date: formData.birthDate || null,
        civil_status: formData.civilStatus || null,

        // Job information
        position: formData.position,
        department: formData.department,
        salary: formData.salary ? parseFloat(formData.salary.toString().replace(/[₱,]/g, "")) : null,
        hire_date: formData.hireDate || new Date().toISOString().split("T")[0],
        status: formData.status,

        // Government IDs
        tin_number: formData.tinNumber || null,
        sss_number: formData.sssNumber || null,
        pagibig_number: formData.pagibigNumber || null,
        philhealth_number: formData.philhealthNumber || null,

        // System information
        username: formData.username,
        access_level: formData.accessLevel,

        // Employee identification - matching backend parameter names
        id_number: formData.idNumber,
        id_barcode: formData.idBarcode || null,

        // File references - will be updated after uploads
        profile_picture: null,
        document: null,

        // Optional fields
        action: null,
        password: null
      }

      console.log("Sending employee data to backend:", employeeData)

      // Step 1: Create employee using your EmployeeService
      const result = await apiService.employees.addEmployeeToEmpList(employeeData)
      console.log("Server response:", result)

      if (result && result.success) {
        const employeeUid = result.data?.uid || result.data?.id

        if (employeeUid) {
          setCreatedEmployeeUid(employeeUid)

          // Step 2: Upload profile picture if one was selected
          if (profilePictureFile) {
            await uploadProfilePictureForEmployee(employeeUid)
          }

          // Step 3: Upload document if one was selected
          if (documentFile) {
            await uploadDocumentForEmployee(employeeUid)
          }
        }

        setSuccess(true)

        // Reset form
        setFormData({
          firstName: "",
          middleName: "",
          lastName: "",
          age: "",
          birthDate: "",
          contactNumber: "",
          email: "",
          civilStatus: "",
          address: "",
          position: "",
          department: "",
          salary: "",
          hireDate: "",
          status: "Active",
          tinNumber: "",
          sssNumber: "",
          pagibigNumber: "",
          philhealthNumber: "",
          username: "",
          accessLevel: "user",
          idNumber: "",
          idBarcode: "",
        })
        setValidationErrors({})
        setValidationLoading({})
        setHasBeenValidated({})
        setProfilePictureFile(null)
        setProfilePreview(null)
        setDocumentFile(null)
        setDocumentPreview(null)
        setCreatedEmployeeUid(null)

        setTimeout(() => setSuccess(false), 5000)
      } else {
        throw new Error(result?.error || "Failed to add employee")
      }
    } catch (err) {
      console.error("Error adding employee:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const validateForm = () => {
    const hasValidationErrors = Object.values(validationErrors).some((error) => error !== null)
    const hasValidationLoading = Object.values(validationLoading).some((loading) => loading === true)

    return (
      formData.firstName &&
      formData.lastName &&
      formData.email &&
      formData.position &&
      formData.department &&
      formData.idNumber &&
      !hasValidationErrors &&
      !hasValidationLoading
    )
  }

  const [validationVisible, setValidationVisible] = useState({})
  const [validationTimers, setValidationTimers] = useState({})

  useEffect(() => {
    // Start a 4s timer when a field becomes validated; show success only after timer elapses.
    Object.keys(hasBeenValidated).forEach((field) => {
      const validated = hasBeenValidated[field]
      const visible = validationVisible[field]
      const timerExists = !!validationTimers[field]

      if (validated && !visible && !timerExists) {
        const id = setTimeout(() => {
          setValidationVisible((prev) => ({ ...prev, [field]: true }))
          setValidationTimers((prev) => {
            const copy = { ...prev }
            delete copy[field]
            return copy
          })
        }, 4000) // 4 seconds

        setValidationTimers((prev) => ({ ...prev, [field]: id }))
      }

      // If validation flag is cleared, remove any pending timer and hide the indicator immediately
      if (!validated) {
        if (validationTimers[field]) {
          clearTimeout(validationTimers[field])
          setValidationTimers((prev) => {
            const copy = { ...prev }
            delete copy[field]
            return copy
          })
        }
        if (validationVisible[field]) {
          setValidationVisible((prev) => {
            const copy = { ...prev }
            delete copy[field]
            return copy
          })
        }
      }
    })

    // Cleanup timers on unmount
    return () => {
      Object.values(validationTimers).forEach(clearTimeout)
    }
  }, [hasBeenValidated])

  const renderValidationStatus = (fieldName) => {
    // Show loading spinner while validation is in progress
    if (validationLoading[fieldName]) {
      return (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
        </div>
      )
    }

    // Show error icon if there's a validation error
    if (validationErrors[fieldName]) {
      return (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <span className="text-red-500">❌</span>
        </div>
      )
    }

    // Show success only after the 4s delay once field has been validated
    if (
      formData[fieldName] &&
      ["email", "username", "idNumber", "idBarcode"].includes(fieldName) &&
      !validationLoading[fieldName] &&
      !validationErrors[fieldName] &&
      validationVisible[fieldName]
    ) {
      return (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <span className="text-green-500">✅</span>
        </div>
      )
    }

    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">🎯 Employee Recruitment</h2>
        <div className="text-sm text-gray-600 dark:text-gray-400">Required fields marked with *</div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="bg-green-100 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-lg p-4">
          <p className="text-green-700 dark:text-green-400">✅ Employee added successfully to the employee list!</p>
          {profilePictureFile && !uploadingProfile && (
            <p className="text-green-600 dark:text-green-400 text-sm mt-1">Profile picture uploaded successfully!</p>
          )}
          {documentFile && !uploadingDocument && (
            <p className="text-green-600 dark:text-green-400 text-sm mt-1">Document uploaded successfully!</p>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-400">❌ Error: {error}</p>
        </div>
      )}

      {/* Recruitment Form */}
      <div className="bg-white/10 dark:bg-black/20 backdrop-blur-md rounded-2xl p-6 border border-white/20 dark:border-gray-700/20">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-6">Add New Employee</h3>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 border-b border-gray-300/20 dark:border-gray-700/20 pb-2">
              File Uploads
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Profile Picture Upload */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Profile Picture</label>
                <div className="flex items-center space-x-4">
                  {profilePreview && (
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                      <img
                        src={profilePreview || "/placeholder.svg"}
                        alt="Profile preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProfilePictureChange}
                      disabled={uploadingProfile || loading}
                      className="w-full px-3 py-2 text-sm text-gray-600 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-slate-600 file:text-white hover:file:bg-slate-700 file:cursor-pointer"
                    />
                    {uploadingProfile && (
                      <div className="mt-2">
                        <p className="text-xs text-blue-600 dark:text-blue-400">Uploading profile picture...</p>
                      </div>
                    )}
                    {profilePictureFile && !uploadingProfile && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        ✅ {profilePictureFile.name} selected (will upload after employee creation)
                      </p>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Optional: Select employee profile picture (max 10MB, jpg/png/gif/webp/bmp)
                </p>
              </div>

              {/* Document Upload */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Document/Resume</label>
                <div className="space-y-2">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt,.rtf,.xls,.xlsx,.ppt,.pptx,.csv,.jpg,.jpeg,.png,.gif,.webp,.bmp,.zip,.rar"
                    onChange={handleDocumentChange}
                    disabled={uploadingDocument || loading}
                    className="w-full px-3 py-2 text-sm text-gray-600 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-slate-600 file:text-white hover:file:bg-slate-700 file:cursor-pointer"
                  />
                  {uploadingDocument && <p className="text-xs text-blue-600 dark:text-blue-400">Uploading document...</p>}
                  {documentPreview && (
                    <p className="text-xs text-green-600 dark:text-green-400">
                      ✅ {documentPreview.name} selected ({documentPreview.formattedSize}) - will upload after employee creation
                    </p>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Optional: Upload resume or documents (max 50MB, supports various formats)
                </p>
              </div>
            </div>
          </div>

          {/* Employee ID Section */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 border-b border-gray-300/20 dark:border-gray-700/20 pb-2">
              Employee Identification
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Employee ID *</label>
                <input
                  type="text"
                  name="idNumber"
                  value={formData.idNumber}
                  onChange={handleInputChange}
                  placeholder="Enter employee ID (e.g., EMP-2024-001)"
                  className={`w-full px-4 py-3 pr-12 rounded-lg bg-white/10 dark:bg-black/20 border ${validationErrors.idNumber
                      ? "border-red-500 dark:border-red-400"
                      : "border-gray-300/20 dark:border-gray-700/20"
                    } text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-500`}
                  required
                />
                {renderValidationStatus("idNumber")}
                {validationErrors.idNumber && (
                  <p className="text-red-500 dark:text-red-400 text-sm mt-1">{validationErrors.idNumber}</p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Optional: For ID card barcode printing</p>
              </div>
           

              <div className="relative">
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Employee Barcode *</label>
                <input
                  type="text"
                  name="idBarcode"
                  value={formData.idBarcode}
                  onChange={handleInputChange}
                  placeholder="Enter employee ID (e.g., EMP-2024-001)"
                  className={`w-full px-4 py-3 pr-12 rounded-lg bg-white/10 dark:bg-black/20 border ${validationErrors.idBarcode
                      ? "border-red-500 dark:border-red-400"
                      : "border-gray-300/20 dark:border-gray-700/20"
                    } text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-500`}
                  required
                />
                {renderValidationStatus("idBarcode")}
                {validationErrors.idBarcode && (
                  <p className="text-red-500 dark:text-red-400 text-sm mt-1">{validationErrors.idBarcode}</p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Optional: For ID card barcode printing</p>
              </div>
               </div>
          </div>

          {/* Personal Information Section */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 border-b border-gray-300/20 dark:border-gray-700/20 pb-2">
              Personal Information
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">First Name *</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  placeholder="John"
                  className={`w-full px-4 py-3 rounded-lg bg-white/10 dark:bg-black/20 border ${validationErrors.firstName
                      ? "border-red-500 dark:border-red-400"
                      : "border-gray-300/20 dark:border-gray-700/20"
                    } text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-500`}
                  required
                />
                {validationErrors.firstName && (
                  <p className="text-red-500 dark:text-red-400 text-sm mt-1">{validationErrors.firstName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Middle Name</label>
                <input
                  type="text"
                  name="middleName"
                  value={formData.middleName}
                  onChange={handleInputChange}
                  placeholder="Michael"
                  className="w-full px-4 py-3 rounded-lg bg-white/10 dark:bg-black/20 border border-gray-300/20 dark:border-gray-700/20 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Last Name *</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  placeholder="Doe"
                  className={`w-full px-4 py-3 rounded-lg bg-white/10 dark:bg-black/20 border ${validationErrors.lastName
                      ? "border-red-500 dark:border-red-400"
                      : "border-gray-300/20 dark:border-gray-700/20"
                    } text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-500`}
                  required
                />
                {validationErrors.lastName && (
                  <p className="text-red-500 dark:text-red-400 text-sm mt-1">{validationErrors.lastName}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Age</label>
                <input
                  type="number"
                  name="age"
                  value={formData.age}
                  onChange={handleInputChange}
                  placeholder="25"
                  min="18"
                  max="100"
                  className="w-full px-4 py-3 rounded-lg bg-white/10 dark:bg-black/20 border border-gray-300/20 dark:border-gray-700/20 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Birth Date</label>
                <input
                  type="date"
                  name="birthDate"
                  value={formData.birthDate}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-lg bg-white/10 dark:bg-black/20 border border-gray-300/20 dark:border-gray-700/20 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Civil Status</label>
                <select
                  name="civilStatus"
                  value={formData.civilStatus}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-lg bg-white/10 dark:bg-black/20 border border-gray-300/20 dark:border-gray-700/20 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-slate-500"
                >
                  <option value="" className="bg-white dark:bg-gray-800">
                    Select Status
                  </option>
                  {civilStatusOptions.map((status) => (
                    <option key={status} value={status} className="bg-white dark:bg-gray-800">
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Contact Number
                </label>
                <input
                  type="tel"
                  name="contactNumber"
                  value={formData.contactNumber}
                  onChange={handleInputChange}
                  placeholder="+639123456789"
                  className="w-full px-4 py-3 rounded-lg bg-white/10 dark:bg-black/20 border border-gray-300/20 dark:border-gray-700/20 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="john.doe@company.com"
                  className={`w-full px-4 py-3 pr-12 rounded-lg bg-white/10 dark:bg-black/20 border ${validationErrors.email
                      ? "border-red-500 dark:border-red-400"
                      : "border-gray-300/20 dark:border-gray-700/20"
                    } text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-500`}
                  required
                />
                {renderValidationStatus("email")}
                {validationErrors.email && (
                  <p className="text-red-500 dark:text-red-400 text-sm mt-1">{validationErrors.email}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Address</label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="123 Main Street, City, Province, ZIP Code"
                rows="3"
                className="w-full px-4 py-3 rounded-lg bg-white/10 dark:bg-black/20 border border-gray-300/20 dark:border-gray-700/20 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
            </div>
          </div>

          {/* Job Information Section */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 border-b border-gray-300/20 dark:border-gray-700/20 pb-2">
              Job Information
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Position *</label>
                <input
                  type="text"
                  name="position"
                  value={formData.position}
                  onChange={handleInputChange}
                  placeholder="Software Engineer"
                  className={`w-full px-4 py-3 rounded-lg bg-white/10 dark:bg-black/20 border ${validationErrors.position
                      ? "border-red-500 dark:border-red-400"
                      : "border-gray-300/20 dark:border-gray-700/20"
                    } text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-500`}
                  required
                />
                {validationErrors.position && (
                  <p className="text-red-500 dark:text-red-400 text-sm mt-1">{validationErrors.position}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Department *</label>
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 rounded-lg bg-white/10 dark:bg-black/20 border ${validationErrors.department
                      ? "border-red-500 dark:border-red-400"
                      : "border-gray-300/20 dark:border-gray-700/20"
                    } text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-slate-500`}
                  required
                  disabled={loadingDepartments}
                >
                  <option value="">{loadingDepartments ? "Loading departments..." : "Select Department"}</option>
                  {departments.map((dept) => (
                    <option key={dept.name} value={dept.name} className="bg-white dark:bg-gray-800">
                      {dept.name} {dept.employee_count > 0 && `(${dept.employee_count} employees)`}
                    </option>
                  ))}
                </select>
                {validationErrors.department && (
                  <p className="text-red-500 dark:text-red-400 text-sm mt-1">{validationErrors.department}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Monthly Salary (PHP)
                </label>
                <input
                  type="number"
                  name="salary"
                  value={formData.salary}
                  onChange={handleInputChange}
                  placeholder="45000"
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-3 rounded-lg bg-white/10 dark:bg-black/20 border border-gray-300/20 dark:border-gray-700/20 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Hire Date</label>
                <input
                  type="date"
                  name="hireDate"
                  value={formData.hireDate}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-lg bg-white/10 dark:bg-black/20 border border-gray-300/20 dark:border-gray-700/20 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-lg bg-white/10 dark:bg-black/20 border border-gray-300/20 dark:border-gray-700/20 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-slate-500"
                >
                  <option value="Active" className="bg-white dark:bg-gray-800">
                    Active
                  </option>
                  <option value="Inactive" className="bg-white dark:bg-gray-800">
                    Inactive
                  </option>
                  <option value="Probation" className="bg-white dark:bg-gray-800">
                    Probation
                  </option>
                </select>
              </div>
            </div>
          </div>

          {/* Government IDs Section */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 border-b border-gray-300/20 dark:border-gray-700/20 pb-2">
              Government IDs (Optional)
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">TIN Number</label>
                <input
                  type="text"
                  name="tinNumber"
                  value={formData.tinNumber}
                  onChange={handleInputChange}
                  placeholder="123-456-789-000"
                  className="w-full px-4 py-3 rounded-lg bg-white/10 dark:bg-black/20 border border-gray-300/20 dark:border-gray-700/20 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">SSS Number</label>
                <input
                  type="text"
                  name="sssNumber"
                  value={formData.sssNumber}
                  onChange={handleInputChange}
                  placeholder="12-3456789-0"
                  className="w-full px-4 py-3 rounded-lg bg-white/10 dark:bg-black/20 border border-gray-300/20 dark:border-gray-700/20 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  PAG-IBIG Number
                </label>
                <input
                  type="text"
                  name="pagibigNumber"
                  value={formData.pagibigNumber}
                  onChange={handleInputChange}
                  placeholder="1234-5678-9012"
                  className="w-full px-4 py-3 rounded-lg bg-white/10 dark:bg-black/20 border border-gray-300/20 dark:border-gray-700/20 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  PhilHealth Number
                </label>
                <input
                  type="text"
                  name="philhealthNumber"
                  value={formData.philhealthNumber}
                  onChange={handleInputChange}
                  placeholder="12-345678901-2"
                  className="w-full px-4 py-3 rounded-lg bg-white/10 dark:bg-black/20 border border-gray-300/20 dark:border-gray-700/20 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
              </div>
            </div>
          </div>

          {/* System Information Section */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 border-b border-gray-300/20 dark:border-gray-700/20 pb-2">
              System Access
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Username</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder="Auto-generated from name"
                  className={`w-full px-4 py-3 pr-12 rounded-lg bg-white/10 dark:bg-black/20 border ${validationErrors.username
                      ? "border-red-500 dark:border-red-400"
                      : "border-gray-300/20 dark:border-gray-700/20"
                    } text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-500`}
                />
                {renderValidationStatus("username")}
                {validationErrors.username && (
                  <p className="text-red-500 dark:text-red-400 text-sm mt-1">{validationErrors.username}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Access Level</label>
                <select
                  name="accessLevel"
                  value={formData.accessLevel}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-lg bg-white/10 dark:bg-black/20 border border-gray-300/20 dark:border-gray-700/20 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-slate-500"
                >
                  {accessLevelOptions.map((level) => (
                    <option key={level.value} value={level.value} className="bg-white dark:bg-gray-800">
                      {level.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-6 border-t border-gray-300/20 dark:border-gray-700/20">
            <button
              type="submit"
              disabled={!validateForm() || loading}
              className={`px-8 py-3 rounded-lg font-medium transition-all duration-200 ${validateForm() && !loading
                  ? "bg-slate-600 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white transform hover:scale-105"
                  : "bg-gray-400 dark:bg-gray-600 text-gray-200 cursor-not-allowed"
                }`}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Adding Employee...
                </div>
              ) : (
                "Add Employee"
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Department Statistics */}
      {departments.length > 0 && (
        <div className="bg-white/10 dark:bg-black/20 backdrop-blur-md rounded-2xl p-6 border border-white/20 dark:border-gray-700/20">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Department Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments
              .filter((dept) => dept.employee_count > 0)
              .sort((a, b) => b.employee_count - a.employee_count)
              .slice(0, 6)
              .map((dept) => (
                <div
                  key={dept.name}
                  className="p-4 bg-white/5 dark:bg-black/10 rounded-lg border border-white/10 dark:border-gray-700/10"
                >
                  <h4 className="text-gray-800 dark:text-gray-200 font-medium text-sm mb-2">{dept.name}</h4>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-600 dark:text-gray-400">Total: {dept.employee_count}</span>
                    <span className="text-green-600 dark:text-green-400">Active: {dept.active_count}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-2">
                    <div
                      className="bg-slate-600 dark:bg-slate-400 h-1.5 rounded-full transition-all duration-300"
                      style={{
                        width: dept.employee_count > 0 ? `${(dept.active_count / dept.employee_count) * 100}%` : "0%",
                      }}
                    ></div>
                  </div>
                </div>
              ))}
          </div>

          {departments.filter((dept) => dept.employee_count > 0).length === 0 && (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              <div className="text-4xl mb-2">👥</div>
              <p>No employees in departments yet</p>
              <p className="text-sm">Add your first employee to see department statistics</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Recruitment