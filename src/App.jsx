"use client"

import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { useState, createContext, useContext, useEffect } from "react"
import DepartmentSelector from "./components/DepartmentSelector"
import LoginForm from "./components/LoginForm"
import HRDepartment from "./components/department/HRDepartment"
import OperationsDepartment from "./components/department/OperationsDepartment"
import FinancePayrollDepartment from "./components/department/FinancePayrollDepartment"
import ProcurementDepartment from "./components/department/ProcurementDepartment"
import EngineeringDepartment from "./components/department/EngineeringDepartment"
import SuperAdminDashboard from "./components/SuperAdminDashboard"
import { getStoredToken, verifyToken, clearTokens } from "./utils/auth"

// Auth Context
const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

function App() {
  const [user, setUser] = useState(null)
  const [selectedDepartment, setSelectedDepartment] = useState(null)
  const [isLoading, setIsLoading] = useState(true) // Add loading state for token verification
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode")
    return saved ? JSON.parse(saved) : false
  })

  // Check for existing valid token on app initialization
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = getStoredToken()
        if (token) {
          const payload = verifyToken(token)
          if (payload) {
            // Token is valid, restore user session
            setUser({
              id: payload.id,
              username: payload.username,
              name: payload.name,
              role: payload.role,
              permissions: payload.permissions || [],
              access_level: payload.access_level,
              loginTime: payload.iat ? new Date(payload.iat * 1000).toISOString() : new Date().toISOString()
            })
            setSelectedDepartment(payload.department)
          } else {
            // Token is invalid or expired, clear it
            clearTokens()
          }
        }
      } catch (error) {
        console.error("Error initializing auth:", error)
        clearTokens()
      } finally {
        setIsLoading(false)
      }
    }

    initializeAuth()
  }, [])

  useEffect(() => {
    localStorage.setItem("darkMode", JSON.stringify(isDarkMode))
    if (isDarkMode) {
      document.documentElement.classList.add("dark")
      document.body.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
      document.body.classList.remove("dark")
    }
  }, [isDarkMode])

  const login = (userData, department) => {
    setUser(userData)
    setSelectedDepartment(department)
  }

  const logout = () => {
    setUser(null)
    setSelectedDepartment(null)
    clearTokens() // Clear JWT tokens on logout
  }

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode)
  }

  const authValue = {
    user,
    selectedDepartment,
    login,
    logout,
    isAuthenticated: !!user,
    isDarkMode,
    toggleDarkMode,
    isSuperAdmin: user?.role === "super-admin",
    isLoading
  }

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-all duration-300 ${
        isDarkMode
          ? "bg-gradient-to-br from-gray-900 via-slate-900 to-zinc-900 text-gray-100"
          : "bg-gradient-to-br from-slate-50 via-gray-50 to-stone-50 text-gray-900"
      }`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg font-medium">Verifying authentication...</p>
        </div>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={authValue}>
      <Router>
        <div
          className={`min-h-screen transition-all duration-300 ${
            isDarkMode
              ? "bg-gradient-to-br from-gray-900 via-slate-900 to-zinc-900 text-gray-100"
              : "bg-gradient-to-br from-slate-50 via-gray-50 to-stone-50 text-gray-900"
          }`}
        >
          <Routes>
            <Route path="/" element={<DepartmentSelector />} />
            <Route path="/login/:department" element={<LoginForm />} />
            <Route
              path="/super-admin"
              element={
                <ProtectedRoute department="super-admin" requireSuperAdmin={true}>
                  <SuperAdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/Human Resources"
              element={
                <ProtectedRoute department="Human Resources">
                  <HRDepartment />
                </ProtectedRoute>
              }
            />
            <Route
              path="/Operation"
              element={
                <ProtectedRoute department="Operation">
                  <OperationsDepartment />
                </ProtectedRoute>
              }
            />
            <Route
              path="/Finance"
              element={
                <ProtectedRoute department="Finance">
                  <FinancePayrollDepartment />
                </ProtectedRoute>
              }
            />
            <Route
              path="/Procurement"
              element={
                <ProtectedRoute department="Procurement">
                  <ProcurementDepartment />
                </ProtectedRoute>
              }
            />
            <Route
              path="/Engineering"
              element={
                <ProtectedRoute department="Engineering">
                  <EngineeringDepartment />
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </Router>
    </AuthContext.Provider>
  )
}

function ProtectedRoute({ children, department, requireSuperAdmin = false }) {
  const { isAuthenticated, selectedDepartment, isSuperAdmin, isLoading } = useAuth()

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to={`/login/${department}`} replace />
  }

  if (requireSuperAdmin && !isSuperAdmin) {
    return <Navigate to="/" replace />
  }

  if (!requireSuperAdmin && selectedDepartment !== department && !isSuperAdmin) {
    return <Navigate to={`/login/${department}`} replace />
  }

  return children
}

export default App