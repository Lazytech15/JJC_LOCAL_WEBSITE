"use client"

import { createContext, useContext, useState, useEffect } from "react"
import { getStoredToken, verifyToken, clearTokens, storeTokens } from "../utils/auth"

const AuthContext = createContext(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

// Department slug to name mapping
export const DEPARTMENT_MAP = {
  "hr": "Human Resources",
  "operations": "Operations",
  "finance": "Finance",
  "procurement": "Procurement",
  "engineering": "Engineering",
  "superadmin": "superAdmin"
}

// Reverse mapping for name to slug
export const DEPARTMENT_SLUG_MAP = {
  "Human Resources": "hr",
  "Operations": "operations",
  "Finance": "finance",
  "Procurement": "procurement",
  "Engineering": "engineering",
  "superAdmin": "superadmin"
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [employee, setEmployee] = useState(null)
  const [selectedDepartment, setSelectedDepartment] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode")
    return saved ? JSON.parse(saved) : false
  })

  // Check for existing valid token on app initialization
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // If we're on toolbox route, don't interfere with its theme
        if (window.location.pathname === "/jjctoolbox") {
          setIsLoading(false)
          return
        }

        // Check for admin/department token
        const adminToken = getStoredToken(false)
        if (adminToken) {
          const payload = verifyToken(adminToken)
          if (payload && payload.role) {
            setUser({
              id: payload.id,
              username: payload.username,
              name: payload.name,
              role: payload.role,
              permissions: payload.permissions || [],
              access_level: payload.access_level,
              loginTime: payload.iat ? new Date(payload.iat * 1000).toISOString() : new Date().toISOString(),
            })
            setSelectedDepartment(payload.department)
          } else {
            // Token invalid, clear it
            clearTokens()
          }
        }

        // Check for employee token
        const employeeToken = getStoredToken(true)
        if (employeeToken) {
          const payload = verifyToken(employeeToken)
          if (payload) {
            setEmployee({
              id: payload.id || payload.userId,
              username: payload.username,
              name: payload.name,
              employeeId: payload.employeeId,
              department: payload.department,
              position: payload.position,
              access_level: payload.accessLevel || payload.access_level || 'user',
              loginTime: payload.iat ? new Date(payload.iat * 1000).toISOString() : new Date().toISOString(),
            })
          } else {
            localStorage.removeItem("employeeToken")
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
    
    console.log("🌓 AuthContext: isDarkMode changed to:", isDarkMode)
    console.log("🌓 AuthContext: Current pathname:", window.location.pathname)
    
    // Don't manage dark mode class for toolbox route - it has its own theme system
    if (window.location.pathname === "/jjctoolbox") {
      console.log("🌓 AuthContext: Skipping dark mode for toolbox route")
      return
    }
    
    if (isDarkMode) {
      console.log("🌓 AuthContext: Adding dark class")
      document.documentElement.classList.add("dark")
      document.body.classList.add("dark")
    } else {
      console.log("🌓 AuthContext: Removing dark class")
      document.documentElement.classList.remove("dark")
      document.body.classList.remove("dark")
    }
    
    console.log("🌓 AuthContext: HTML classes:", document.documentElement.className)
    console.log("🌓 AuthContext: Body classes:", document.body.className)
  }, [isDarkMode])

  const login = (userData, department, token) => {
    setUser(userData)
    setSelectedDepartment(department)
    if (token) {
      storeTokens(token, false)
    }
  }

  const employeeLogin = (employeeData, token) => {
    setEmployee(employeeData)
    if (token) {
      storeTokens(token, true)
    }
  }

  const logout = () => {
    setUser(null)
    setSelectedDepartment(null)
    clearTokens()
  }

  const employeeLogout = () => {
    setEmployee(null)
    localStorage.removeItem("employeeToken")
  }

  const toggleDarkMode = () => {
    console.log("🌓 toggleDarkMode called, current isDarkMode:", isDarkMode)
    setIsDarkMode(!isDarkMode)
    console.log("🌓 toggleDarkMode: will change to:", !isDarkMode)
  }

  const authValue = {
    user,
    employee,
    selectedDepartment,
    login,
    employeeLogin,
    logout,
    employeeLogout,
    isAuthenticated: !!user,
    isEmployeeAuthenticated: !!employee,
    isDarkMode,
    toggleDarkMode,
    isSuperAdmin: user?.role === "admin",
    isLoading,
  }

  return <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>
}