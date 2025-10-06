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
  "operations": "Operation",
  "finance": "Finance",
  "procurement": "Procurement",
  "engineering": "Engineering",
  "super-admin": "super-admin"
}

// Reverse mapping for name to slug
export const DEPARTMENT_SLUG_MAP = {
  "Human Resources": "hr",
  "Operation": "operations",
  "Finance": "finance",
  "Procurement": "procurement",
  "Engineering": "engineering",
  "super-admin": "super-admin"
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
              id: payload.id,
              username: payload.username,
              name: payload.name,
              employeeId: payload.employeeId,
              department: payload.department,
              position: payload.position,
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
    
    // Don't manage dark mode class for toolbox route - it has its own theme system
    if (window.location.pathname === "/jjctoolbox") {
      return
    }
    
    if (isDarkMode) {
      document.documentElement.classList.add("dark")
      document.body.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
      document.body.classList.remove("dark")
    }
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
    setIsDarkMode(!isDarkMode)
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
    isSuperAdmin: user?.role === "super-admin",
    isLoading,
  }

  return <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>
}