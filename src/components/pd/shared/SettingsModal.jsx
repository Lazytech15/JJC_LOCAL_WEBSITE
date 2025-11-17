import { useState } from "react"
import { X, Eye, EyeOff, Moon, Sun } from "lucide-react"
import apiService from "../../../utils/api/api-service"
import { useAuth } from "../../../contexts/AuthContext"

export default function SettingsModal({ isOpen, onClose, user }) {
  const { isDarkMode, toggleDarkMode } = useAuth()
  const [activeTab, setActiveTab] = useState("appearance")
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

  if (!isOpen) return null

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

      const employeeId = user?.uid || user?.id

      if (!employeeId) {
        throw new Error("Employee ID not found")
      }

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
          setPasswordSuccess("")
        }, 3000)
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

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={`relative w-full max-w-2xl mx-2 sm:mx-4 max-h-[90vh] overflow-hidden rounded-lg sm:rounded-xl shadow-2xl ${
        isDarkMode ? "bg-slate-900 border border-slate-700" : "bg-white border border-slate-200"
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${
          isDarkMode ? "border-slate-700" : "border-slate-200"
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isDarkMode ? "bg-slate-800" : "bg-slate-100"}`}>
              <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h2 className={`text-xl font-bold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
              Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-100 text-slate-600"
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className={`flex border-b ${isDarkMode ? "border-slate-700 bg-slate-900/50" : "border-slate-200 bg-slate-50"}`}>
          <button
            onClick={() => setActiveTab("appearance")}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === "appearance"
                ? isDarkMode
                  ? "text-amber-400 border-b-2 border-amber-400 bg-slate-800/50"
                  : "text-amber-600 border-b-2 border-amber-600 bg-white"
                : isDarkMode
                ? "text-slate-400 hover:text-slate-300"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Appearance
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === "security"
                ? isDarkMode
                  ? "text-amber-400 border-b-2 border-amber-400 bg-slate-800/50"
                  : "text-amber-600 border-b-2 border-amber-600 bg-white"
                : isDarkMode
                ? "text-slate-400 hover:text-slate-300"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Security
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Appearance Tab */}
          {activeTab === "appearance" && (
            <div className="space-y-6">
              <div>
                <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                  Theme Preferences
                </h3>
                <div className={`p-4 rounded-lg border ${
                  isDarkMode ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200"
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isDarkMode ? "bg-slate-700" : "bg-white"}`}>
                        {isDarkMode ? (
                          <Moon className="w-5 h-5 text-blue-400" />
                        ) : (
                          <Sun className="w-5 h-5 text-amber-500" />
                        )}
                      </div>
                      <div>
                        <p className={`font-medium ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                          {isDarkMode ? "Dark Mode" : "Light Mode"}
                        </p>
                        <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                          {isDarkMode ? "Currently using dark theme" : "Currently using light theme"}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={toggleDarkMode}
                      className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                        isDarkMode ? "bg-blue-600" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                          isDarkMode ? "translate-x-7" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === "security" && (
            <div className="space-y-6">
              <div>
                <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                  Change Password
                </h3>

                {passwordError && (
                  <div className={`mb-4 p-4 rounded-lg border ${
                    isDarkMode 
                      ? "bg-red-900/20 border-red-800 text-red-400" 
                      : "bg-red-50 border-red-200 text-red-700"
                  }`}>
                    <p className="text-sm">{passwordError}</p>
                  </div>
                )}

                {passwordSuccess && (
                  <div className={`mb-4 p-4 rounded-lg border ${
                    isDarkMode 
                      ? "bg-green-900/20 border-green-800 text-green-400" 
                      : "bg-green-50 border-green-200 text-green-700"
                  }`}>
                    <p className="text-sm">{passwordSuccess}</p>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      isDarkMode ? "text-slate-300" : "text-slate-700"
                    }`}>
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.current ? "text" : "password"}
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                        placeholder="Enter current password"
                        className={`w-full px-4 py-3 pr-10 rounded-lg border transition-colors ${
                          isDarkMode 
                            ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500" 
                            : "bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-amber-500"
                        } focus:outline-none focus:ring-2 focus:ring-amber-500/20`}
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('current')}
                        className={`absolute right-3 top-1/2 -translate-y-1/2 ${
                          isDarkMode ? "text-slate-400 hover:text-slate-300" : "text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      isDarkMode ? "text-slate-300" : "text-slate-700"
                    }`}>
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.new ? "text" : "password"}
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        placeholder="Minimum 8 characters"
                        className={`w-full px-4 py-3 pr-10 rounded-lg border transition-colors ${
                          isDarkMode 
                            ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500" 
                            : "bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-amber-500"
                        } focus:outline-none focus:ring-2 focus:ring-amber-500/20`}
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('new')}
                        className={`absolute right-3 top-1/2 -translate-y-1/2 ${
                          isDarkMode ? "text-slate-400 hover:text-slate-300" : "text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      isDarkMode ? "text-slate-300" : "text-slate-700"
                    }`}>
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.confirm ? "text" : "password"}
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                        placeholder="Re-enter new password"
                        className={`w-full px-4 py-3 pr-10 rounded-lg border transition-colors ${
                          isDarkMode 
                            ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500" 
                            : "bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-amber-500"
                        } focus:outline-none focus:ring-2 focus:ring-amber-500/20`}
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('confirm')}
                        className={`absolute right-3 top-1/2 -translate-y-1/2 ${
                          isDarkMode ? "text-slate-400 hover:text-slate-300" : "text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handlePasswordChange}
                    disabled={isChangingPassword}
                    className="w-full px-4 py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                  >
                    {isChangingPassword ? "Updating Password..." : "Update Password"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
