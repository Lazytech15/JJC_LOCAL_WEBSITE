"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../../App"
import { API_ENDPOINTS } from "../../utils/public_api"

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

    // Employee ID and Barcode (manual input) - CHANGED from employeeId to idNumber
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

  const [profilePicture, setProfilePicture] = useState(null)
  const [document, setDocument] = useState(null)
  const [uploadingProfile, setUploadingProfile] = useState(false)
  const [uploadingDocument, setUploadingDocument] = useState(false)
  const [profilePreview, setProfilePreview] = useState(null)
  const [hasBeenValidated, setHasBeenValidated] = useState({})

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
      const response = await fetch(`${API_ENDPOINTS.public}/api/departments`)
      const data = await response.json()

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
      const queryParams = new URLSearchParams()
      queryParams.append(fieldName, value.trim())

      const url = `${API_ENDPOINTS.public}/api/employees/validate?${queryParams}`
      console.log("Making validation request:", { fieldName, value: value.trim(), url })

      const response = await fetch(url)
      console.log("Validation response status:", response.status)

      if (!response.ok) {
        let errorDetails
        try {
          const errorJson = await response.json()
          errorDetails = errorJson.error || errorJson.message || "Unknown error"
          console.error("Validation error response (JSON):", errorJson)

          if (errorJson.error === "Invalid ID number" && fieldName === "idNumber") {
            console.warn("Backend reported invalid ID number format, but proceeding with form submission")
            setValidationErrors((prev) => ({
              ...prev,
              [fieldName]: null,
            }))
            // Mark as validated even if backend has format issues
            setHasBeenValidated((prev) => ({
              ...prev,
              [fieldName]: true,
            }))
            return
          }
        } catch (jsonError) {
          errorDetails = await response.text()
          console.error("Validation error response (Text):", errorDetails)
        }
        throw new Error(`HTTP error! status: ${response.status}, details: ${errorDetails}`)
      }

      const data = await response.json()
      console.log("Validation response data:", data)

      if (data.success) {
        setValidationErrors((prev) => ({
          ...prev,
          [fieldName]: getValidationMessage(fieldName, data.data),
        }))
        
        // Mark field as validated after successful API response
        setHasBeenValidated((prev) => ({
          ...prev,
          [fieldName]: true,
        }))
      } else {
        throw new Error(data.error || "Validation failed")
      }
    } catch (err) {
      console.error(`Error validating ${fieldName}:`, err)

      if (fieldName === "idNumber" && err.message.includes("Invalid ID number")) {
        console.warn("ID number format validation failed on backend, but allowing form submission")
        setValidationErrors((prev) => ({
          ...prev,
          [fieldName]: null,
        }))
        setHasBeenValidated((prev) => ({
          ...prev,
          [fieldName]: true,
        }))
      } else {
        setValidationErrors((prev) => ({
          ...prev,
          [fieldName]: `Error checking ${fieldName} availability`,
        }))
        setHasBeenValidated((prev) => ({
          ...prev,
          [fieldName]: true,
        }))
      }
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
    console.log(fieldName, validationData)
    switch (fieldName) {
      case "email":
        return !validationData.emailAvailable ? "Email already exists" : null
      case "username":
        return !validationData.usernameAvailable ? "Username already exists" : null
      case "idNumber": // CHANGED from employeeId to idNumber
        return !validationData.idNumberAvailable && !validationData.employeeIdAvailable
          ? "ID Number already exists"
          : null
      case "idBarcode":
        return !validationData.idBarcodeAvailable ? "ID Barcode already exists" : null
      default:
        return null
    }
  }

  const handleProfilePictureChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => setProfilePreview(e.target.result)
    reader.readAsDataURL(file)

    setUploadingProfile(true)
    try {
      const formData = new FormData()
      formData.append("profilePicture", file)

      const response = await fetch(`${API_ENDPOINTS.public}/api/uploads/profile-picture`, {
        method: "POST",
        body: formData,
      })

      const result = await response.json()
      if (result.success) {
        setProfilePicture(result.data)
      } else {
        throw new Error(result.error || "Failed to upload profile picture")
      }
    } catch (err) {
      console.error("Error uploading profile picture:", err)
      setError(err.message)
      setProfilePreview(null)
    } finally {
      setUploadingProfile(false)
    }
  }

  const handleDocumentChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setUploadingDocument(true)
    try {
      const formData = new FormData()
      formData.append("document", file)

      const response = await fetch(`${API_ENDPOINTS.public}/api/uploads/document`, {
        method: "POST",
        body: formData,
      })

      const result = await response.json()
      if (result.success) {
        setDocument(result.data)
      } else {
        throw new Error(result.error || "Failed to upload document")
      }
    } catch (err) {
      console.error("Error uploading document:", err)
      setError(err.message)
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

    // Validate fields that require server-side validation - UPDATED field name
    if (["email", "username", "idNumber", "idBarcode"].includes(name) && value) {
      validateField(name, value)
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
      if (!formData.idNumber) finalValidationErrors.idNumber = "ID Number is required" // CHANGED

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

      // Prepare data according to API structure
      const employeeData = {
        firstName: formData.firstName,
        middleName: formData.middleName || null,
        lastName: formData.lastName,
        age: formData.age ? Number.parseInt(formData.age) : null,
        birthDate: formData.birthDate || null,
        contactNumber: formData.contactNumber || null,
        email: formData.email,
        civilStatus: formData.civilStatus || null,
        address: formData.address || null,
        position: formData.position,
        department: formData.department,
        salary: formData.salary ? Number.parseFloat(formData.salary.toString().replace(/[₱,]/g, "")) : null,
        hireDate: formData.hireDate || new Date().toISOString().split("T")[0],
        status: formData.status,
        tinNumber: formData.tinNumber || null,
        sssNumber: formData.sssNumber || null,
        pagibigNumber: formData.pagibigNumber || null,
        philhealthNumber: formData.philhealthNumber || null,
        username: formData.username,
        accessLevel: formData.accessLevel,
        // Send the ID number and barcode to the server - UPDATED field name
        idNumber: formData.idNumber || null, // Keep as employeeId for backend compatibility
        idBarcode: formData.idBarcode || null,
        profilePicture: profilePicture?.filename || null,
        document: document?.filename || null,
      }

      console.log("Sending employee data:", employeeData) // Debug log

      const response = await fetch(`${API_ENDPOINTS.public}/api/employees`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(employeeData),
      })

      const result = await response.json()
      console.log("Server response:", result) // Debug log

      if (!response.ok) {
        throw new Error(result.error || "Failed to add employee")
      }

      if (result.success) {
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
          idNumber: "", // CHANGED
          idBarcode: "",
        })
        setValidationErrors({})
        setValidationLoading({})
        setProfilePicture(null)
        setDocument(null)
        setProfilePreview(null)

        setTimeout(() => setSuccess(false), 5000)
      } else {
        throw new Error(result.error || "Failed to add employee")
      }
    } catch (err) {
      setError(err.message)
      console.error("Error adding employee:", err)
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
  }, [hasBeenValidated]) // run whenever validation completion flags change

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
          <p className="text-green-700 dark:text-green-400">✅ Employee added successfully!</p>
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
                      disabled={uploadingProfile}
                      className="w-full px-3 py-2 text-sm text-gray-600 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-slate-600 file:text-white hover:file:bg-slate-700 file:cursor-pointer"
                    />
                    {uploadingProfile && <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Uploading...</p>}
                    {profilePicture && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        ✅ {profilePicture.originalName} uploaded
                      </p>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Optional: Upload employee profile picture (max 5MB, jpg/png/gif/webp)
                </p>
              </div>

              {/* Document Upload */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Document/Resume</label>
                <div className="space-y-2">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt,.rtf,.xls,.xlsx,.ppt,.pptx"
                    onChange={handleDocumentChange}
                    disabled={uploadingDocument}
                    className="w-full px-3 py-2 text-sm text-gray-600 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-slate-600 file:text-white hover:file:bg-slate-700 file:cursor-pointer"
                  />
                  {uploadingDocument && <p className="text-xs text-blue-600 dark:text-blue-400">Uploading...</p>}
                  {document && (
                    <p className="text-xs text-green-600 dark:text-green-400">✅ {document.originalName} uploaded</p>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Optional: Upload resume or other documents (max 10MB, pdf/doc/docx/txt/rtf/xls/xlsx/ppt/pptx)
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
                  className={`w-full px-4 py-3 pr-12 rounded-lg bg-white/10 dark:bg-black/20 border ${
                    validationErrors.idNumber
                      ? "border-red-500 dark:border-red-400"
                      : "border-gray-300/20 dark:border-gray-700/20"
                  } text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-500`}
                  required
                />
                {renderValidationStatus("idNumber")}
                {validationErrors.idNumber && (
                  <p className="text-red-500 dark:text-red-400 text-sm mt-1">{validationErrors.idNumber}</p>
                )}
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">ID Barcode</label>
                <input
                  type="text"
                  name="idBarcode"
                  value={formData.idBarcode}
                  onChange={handleInputChange}
                  placeholder="Enter barcode (e.g., *EMP001* or 123456789)"
                  className={`w-full px-4 py-3 pr-12 rounded-lg bg-white/10 dark:bg-black/20 border ${
                    validationErrors.idBarcode
                      ? "border-red-500 dark:border-red-400"
                      : "border-gray-300/20 dark:border-gray-700/20"
                  } text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-500`}
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
                  className={`w-full px-4 py-3 rounded-lg bg-white/10 dark:bg-black/20 border ${
                    validationErrors.firstName
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
                  className={`w-full px-4 py-3 rounded-lg bg-white/10 dark:bg-black/20 border ${
                    validationErrors.lastName
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
                  className={`w-full px-4 py-3 pr-12 rounded-lg bg-white/10 dark:bg-black/20 border ${
                    validationErrors.email
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
                  className={`w-full px-4 py-3 rounded-lg bg-white/10 dark:bg-black/20 border ${
                    validationErrors.position
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
                  className={`w-full px-4 py-3 rounded-lg bg-white/10 dark:bg-black/20 border ${
                    validationErrors.department
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
                  className={`w-full px-4 py-3 pr-12 rounded-lg bg-white/10 dark:bg-black/20 border ${
                    validationErrors.username
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
              className={`px-8 py-3 rounded-lg font-medium transition-all duration-200 ${
                validateForm() && !loading
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

      {/* Quick Actions */}
      <div className="bg-white/10 dark:bg-black/20 backdrop-blur-md rounded-2xl p-6 border border-white/20 dark:border-gray-700/20">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 bg-white/5 dark:bg-black/10 rounded-lg border border-white/10 dark:border-gray-700/10 hover:bg-white/10 dark:hover:bg-black/20 transition-colors duration-200">
            <div className="text-2xl mb-2">📄</div>
            <h4 className="text-gray-800 dark:text-gray-200 font-medium">Bulk Import</h4>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Import multiple employees from CSV</p>
          </button>
          <button className="p-4 bg-white/5 dark:bg-black/10 rounded-lg border border-white/10 dark:border-gray-700/10 hover:bg-white/10 dark:hover:bg-black/20 transition-colors duration-200">
            <div className="text-2xl mb-2">📋</div>
            <h4 className="text-gray-800 dark:text-gray-200 font-medium">Job Templates</h4>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Use predefined job templates</p>
          </button>
          <button className="p-4 bg-white/5 dark:bg-black/10 rounded-lg border border-white/10 dark:border-gray-700/10 hover:bg-white/10 dark:hover:bg-black/20 transition-colors duration-200">
            <div className="text-2xl mb-2">📊</div>
            <h4 className="text-gray-800 dark:text-gray-200 font-medium">Reports</h4>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Generate recruitment reports</p>
          </button>
        </div>
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
