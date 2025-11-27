import { useState } from "react"
import { ArrowLeft, FileText, Download, Mail, Phone, MapPin, Calendar, Users, Briefcase, Lock, X, Eye, EyeOff } from "lucide-react"
import apiService from "../../../utils/api/api-service"
import DigitalID from "./DigitalID"
import logo from "../../../assets/companyLogo.jpg"
import IDBackground from "../../../assets/DigitalIDBackground.png"

// UI Components
const Button = ({ children, variant = "default", size = "default", onClick, disabled, className = "", ...props }) => {
  const baseStyles = "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
  
  const variants = {
    default: "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100",
    outline: "border border-zinc-300 bg-transparent hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800",
    ghost: "hover:bg-zinc-100 dark:hover:bg-zinc-800",
    destructive: "bg-red-600 text-white hover:bg-red-700"
  }
  
  const sizes = {
    default: "px-4 py-2",
    sm: "px-3 py-1.5 text-sm",
    lg: "px-6 py-3",
    icon: "p-2"
  }
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

const Card = ({ children, className = "" }) => (
  <div className={`rounded-xl shadow-sm ${className}`}>{children}</div>
)

const CardContent = ({ children, className = "" }) => (
  <div className={className}>{children}</div>
)

const Avatar = ({ children, className = "" }) => (
  <div className={`relative flex shrink-0 overflow-hidden rounded-full ${className}`}>
    {children}
  </div>
)

const AvatarFallback = ({ children, className = "" }) => (
  <div className={`flex h-full w-full items-center justify-center rounded-full ${className}`}>
    {children}
  </div>
)

// Main Profile Component
export default function Profile({ employee, employeeData, handleLogout, profileData, profileImage, documentData, isDarkMode }) {
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [isDigitalIDModalOpen, setIsDigitalIDModalOpen] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  })
  const [passwordError, setPasswordError] = useState("")
  const [passwordSuccess, setPasswordSuccess] = useState("")
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  const fullEmployee = employeeData || employee

  const formatDate = (dateString) => {
    if (!dateString || dateString === "0000-00-00") return "N/A"
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return "N/A"
    if (bytes < 1024) return bytes + " B"
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
    return (bytes / (1024 * 1024)).toFixed(1) + " MB"
  }

  const handleDownload = async (doc) => {
    try {
      // Get employee ID from the employee data
      const employeeId = fullEmployee?.uid || fullEmployee?.id

      if (!employeeId) {
        throw new Error("Employee ID not found")
      }

      // Use the document service to download the document
      const blob = await apiService.document.downloadDocument(employeeId, doc.filename)
      
      // Create a download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = doc.filename
      document.body.appendChild(a)
      a.click()
      
      // Cleanup
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Download failed:', error)
      alert(`Failed to download document: ${error.message}`)
    }
  }

  const handlePasswordChange = async () => {
    setPasswordError("")
    setPasswordSuccess("")

    // Validation
    if (!passwordForm.currentPassword) {
      setPasswordError("Current password is required")
      return
    }

    if (!passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordError("Please fill in all password fields")
      return
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters long")
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("New passwords do not match")
      return
    }

    if (passwordForm.currentPassword === passwordForm.newPassword) {
      setPasswordError("New password must be different from current password")
      return
    }

    try {
      setIsChangingPassword(true)

      // Get employee ID from the employee data
      const employeeId = fullEmployee?.uid || fullEmployee?.id

      if (!employeeId) {
        throw new Error("Employee ID not found")
      }

      // Call the API to update password
      const response = await apiService.employees.updateEmployeePassword(employeeId, {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      })

      if (response.success) {
        setPasswordSuccess("Password changed successfully!")
        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: ""
        })

        setTimeout(() => {
          setIsPasswordModalOpen(false)
          setPasswordSuccess("")
        }, 2000)
      } else {
        throw new Error(response.error || "Failed to change password")
      }

    } catch (error) {
      console.error("Password change error:", error)
      setPasswordError(error.message || "Failed to change password")
    } finally {
      setIsChangingPassword(false)
    }
  }

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }))
  }

  const handleCloseDigitalID = () => {
    setIsDigitalIDModalOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className={`text-3xl font-bold ${isDarkMode ? "text-white" : "text-zinc-900"}`}>My Profile</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setIsDigitalIDModalOpen(true)}
            className={`${isDarkMode ? "border-zinc-700 text-zinc-300 hover:bg-zinc-800"  : ""}`}
          >
            <FileText className="w-4 h-4 mr-2" />
            View Digital ID
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsPasswordModalOpen(true)}
            className={`${isDarkMode ? "border-zinc-700 text-zinc-300 hover:bg-zinc-800" : ""}`}
          >
            <Lock className="w-4 h-4 mr-2" />
            Change Password
          </Button>
        </div>
      </div>

      {/* Profile Header Card */}
      <Card className={`border overflow-hidden ${isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"}`}>
        <CardContent className="p-8 relative">
          {profileImage && (
            <div
              className="absolute inset-0 opacity-40"
              style={{
                backgroundImage: `url(${profileImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'blur(5px)',
                transform: 'scale(1.1)'
              }}
            />
          )}

          <div className="relative z-10">
            <div className="flex flex-col items-center text-center mb-8">
              <Avatar className={`w-32 h-32 ring-4 mb-4 ${isDarkMode ? "ring-zinc-800" : "ring-zinc-200"}`}>
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt={employee?.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <AvatarFallback
                    className={`${isDarkMode ? "bg-zinc-800 text-white" : "bg-zinc-900 text-white"} text-2xl font-semibold`}
                  >
                    {employee?.name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                )}
              </Avatar>
              <h3 className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                {fullEmployee?.fullName || fullEmployee?.name}
              </h3>
              <p className={`text-sm mt-1 ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
                {fullEmployee?.position}
              </p>
              <p className={`text-xs mt-1 ${isDarkMode ? "text-zinc-500" : "text-zinc-500"}`}>
                {fullEmployee?.department}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className={`p-4 rounded-xl ${isDarkMode ? "bg-zinc-800/50" : "bg-zinc-50"}`}>
                <label className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
                  Employee ID
                </label>
                <p className={`mt-2 text-lg font-semibold ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                  {fullEmployee?.idNumber}
                </p>
              </div>
              <div className={`p-4 rounded-xl ${isDarkMode ? "bg-zinc-800/50" : "bg-zinc-50"}`}>
                <label className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
                  Status
                </label>
                <p className={`mt-2 text-lg font-semibold ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                  {fullEmployee?.status}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Information Card */}
      <Card className={`border ${isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"}`}>
        <CardContent className="p-6">
          <h3 className={`text-xl font-bold mb-6 ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
            Personal Information
          </h3>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Mail className={`w-5 h-5 mt-0.5 ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`} />
              <div className="flex-1">
                <p className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
                  Email Address
                </p>
                <p className={`mt-1 ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                  {fullEmployee?.email || "N/A"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Phone className={`w-5 h-5 mt-0.5 ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`} />
              <div className="flex-1">
                <p className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
                  Contact Number
                </p>
                <p className={`mt-1 ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                  {fullEmployee?.contactNumber || "N/A"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className={`w-5 h-5 mt-0.5 ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`} />
              <div className="flex-1">
                <p className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
                  Address
                </p>
                <p className={`mt-1 ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                  {fullEmployee?.address || "N/A"}
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 pt-2">
              <div className="flex items-start gap-3">
                <Calendar className={`w-5 h-5 mt-0.5 ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`} />
                <div className="flex-1">
                  <p className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
                    Birth Date
                  </p>
                  <p className={`mt-1 ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                    {formatDate(fullEmployee?.birthDate)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Users className={`w-5 h-5 mt-0.5 ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`} />
                <div className="flex-1">
                  <p className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
                    Age
                  </p>
                  <p className={`mt-1 ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                    {fullEmployee?.age || "N/A"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Users className={`w-5 h-5 mt-0.5 ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`} />
                <div className="flex-1">
                  <p className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
                    Civil Status
                  </p>
                  <p className={`mt-1 ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                    {fullEmployee?.civilStatus || "N/A"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Briefcase className={`w-5 h-5 mt-0.5 ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`} />
                <div className="flex-1">
                  <p className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
                    Hire Date
                  </p>
                  <p className={`mt-1 ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                    {formatDate(fullEmployee?.hireDate)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Government IDs Card */}
      <Card className={`border ${isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"}`}>
        <CardContent className="p-6">
          <h3 className={`text-xl font-bold mb-6 ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
            Government Identification Numbers
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className={`p-4 rounded-xl ${isDarkMode ? "bg-zinc-800/50" : "bg-zinc-50"}`}>
              <label className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
                SSS Number
              </label>
              <p className={`mt-2 font-mono ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                {fullEmployee?.sssNumber || "N/A"}
              </p>
            </div>

            <div className={`p-4 rounded-xl ${isDarkMode ? "bg-zinc-800/50" : "bg-zinc-50"}`}>
              <label className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
                PhilHealth Number
              </label>
              <p className={`mt-2 font-mono ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                {fullEmployee?.philhealthNumber || "N/A"}
              </p>
            </div>

            <div className={`p-4 rounded-xl ${isDarkMode ? "bg-zinc-800/50" : "bg-zinc-50"}`}>
              <label className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
                Pag-IBIG Number
              </label>
              <p className={`mt-2 font-mono ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                {fullEmployee?.pagibigNumber || "N/A"}
              </p>
            </div>

            <div className={`p-4 rounded-xl ${isDarkMode ? "bg-zinc-800/50" : "bg-zinc-50"}`}>
              <label className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
                TIN Number
              </label>
              <p className={`mt-2 font-mono ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                {fullEmployee?.tinNumber || "N/A"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents Card */}
      <Card className={`border ${isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className={`text-xl font-bold ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
              My Documents
            </h3>
            <span className={`text-sm ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
              {documentData?.document_count || 0} {documentData?.document_count === 1 ? 'document' : 'documents'}
            </span>
          </div>

          {documentData?.documents && documentData.documents.length > 0 ? (
            <div className="space-y-3">
              {documentData.documents.map((doc, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${isDarkMode
                    ? "bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800"
                    : "bg-zinc-50 border-zinc-200 hover:bg-zinc-100"
                    }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`p-2 rounded-lg ${isDarkMode ? "bg-zinc-700" : "bg-white"}`}>
                      <FileText className={`w-5 h-5 ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium truncate ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                        {doc.filename}
                      </p>
                      <div className={`flex items-center gap-3 text-xs mt-1 ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
                        <span>{doc.type}</span>
                        <span>•</span>
                        <span>{formatFileSize(doc.size)}</span>
                        <span>•</span>
                        <span>{formatDate(doc.modified)}</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDownload(doc)}
                    className={`ml-2 ${isDarkMode ? "hover:bg-zinc-700 text-zinc-400 hover:text-white" : "hover:bg-zinc-200"}`}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className={`text-center py-12 ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No documents available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Digital ID Modal */}
      {isDigitalIDModalOpen && (
        <DigitalID 
          employee={employeeData} 
          profileImage={profileImage}
          companyLogo={logo}
          backgroundImage={IDBackground}
          onClose={handleCloseDigitalID}
        />
      )}

      {/* Change Password Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl ${isDarkMode ? "bg-zinc-900" : "bg-white"}`}>
            <div className={`p-6 border-b ${isDarkMode ? "border-zinc-800" : "border-zinc-200"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isDarkMode ? "bg-blue-900/30" : "bg-blue-100"}`}>
                    <Lock className={`w-5 h-5 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`} />
                  </div>
                  <h2 className={`text-xl font-bold ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                    Change Password
                  </h2>
                </div>
                <button
                  onClick={() => setIsPasswordModalOpen(false)}
                  className={`p-2 rounded-lg transition-colors ${isDarkMode ? "hover:bg-zinc-800 text-zinc-400" : "hover:bg-zinc-100 text-zinc-600"}`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {passwordError && (
                <div className={`p-4 rounded-lg border ${isDarkMode ? "bg-red-900/20 border-red-800 text-red-400" : "bg-red-50 border-red-200 text-red-700"}`}>
                  <p className="text-sm">{passwordError}</p>
                </div>
              )}

              {passwordSuccess && (
                <div className={`p-4 rounded-lg border ${isDarkMode ? "bg-green-900/20 border-green-800 text-green-400" : "bg-green-50 border-green-200 text-green-700"}`}>
                  <p className="text-sm">{passwordSuccess}</p>
                </div>
              )}

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-zinc-300" : "text-zinc-700"}`}>
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.current ? "text" : "password"}
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    placeholder="Enter current password"
                    className={`w-full px-4 py-3 pr-10 rounded-lg border transition-colors ${isDarkMode 
                      ? "bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500 focus:border-blue-500" 
                      : "bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:border-blue-500"
                    } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('current')}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDarkMode ? "text-zinc-400 hover:text-zinc-300" : "text-zinc-500 hover:text-zinc-700"}`}
                  >
                    {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-zinc-300" : "text-zinc-700"}`}>
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.new ? "text" : "password"}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    placeholder="Minimum 8 characters"
                    className={`w-full px-4 py-3 pr-10 rounded-lg border transition-colors ${isDarkMode 
                      ? "bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500 focus:border-blue-500" 
                      : "bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:border-blue-500"
                    } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('new')}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDarkMode ? "text-zinc-400 hover:text-zinc-300" : "text-zinc-500 hover:text-zinc-700"}`}
                  >
                    {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-zinc-300" : "text-zinc-700"}`}>
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.confirm ? "text" : "password"}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    placeholder="Re-enter new password"
                    className={`w-full px-4 py-3 pr-10 rounded-lg border transition-colors ${isDarkMode 
                      ? "bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500 focus:border-blue-500" 
                      : "bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:border-blue-500"
                    } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('confirm')}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDarkMode ? "text-zinc-400 hover:text-zinc-300" : "text-zinc-500 hover:text-zinc-700"}`}
                  >
                    {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className={`flex justify-end gap-3 p-6 border-t ${isDarkMode ? "border-zinc-800 bg-zinc-900/50" : "border-zinc-200 bg-zinc-50"}`}>
              <Button
                variant="outline"
                onClick={() => setIsPasswordModalOpen(false)}
                disabled={isChangingPassword}
                className={isDarkMode ? "border-zinc-700 text-zinc-300 hover:bg-zinc-800" : ""}
              >
                Cancel
              </Button>
              <Button
                onClick={handlePasswordChange}
                disabled={isChangingPassword}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isChangingPassword ? "Updating..." : "Update Password"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}