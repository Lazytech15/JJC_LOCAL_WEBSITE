"use client"

import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { getStoredToken, verifyToken, clearTokens, storeTokens, storeEmployeeToken } from "../utils/auth"
import { clearLastRoute } from "../utils/sessionPersistence"
import { initSessionSync, broadcastAdminLogout, broadcastEmployeeLogout, broadcastAdminLogin, broadcastEmployeeLogin, cleanupSessionSync } from "../utils/sessionSync"

const AuthContext = createContext(null)

// Helper function to extract user ID from token payload (handles multiple field names)
const resolveUserId = (payload) => {
  if (!payload) return null
  return payload.id || payload.userId || payload.uid || payload.employeeId || null
}

// Helper function to extract access level from token payload (handles camelCase and snake_case)
const resolveAccessLevel = (payload, defaultLevel = 'user') => {
  if (!payload) return defaultLevel
  return payload.accessLevel || payload.access_level || defaultLevel
}

// Helper function to extract department from token payload
const resolveDepartment = (payload) => {
  if (!payload) return null
  return payload.department || payload.loginDepartment || null
}

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
  
  // Session timeout modal state
  const [sessionTimeoutInfo, setSessionTimeoutInfo] = useState({
    isOpen: false,
    reason: '',
    userType: 'employee'
  })

  // Handle logout from another tab (admin) - now clears BOTH sessions
  const handleRemoteAdminLogout = useCallback((data) => {
    console.log('🔐 Remote admin logout detected:', data)
    // Clear BOTH sessions since login/logout is now unified
    setUser(null)
    setEmployee(null)
    setSelectedDepartment(null)
    // Don't clear tokens here - they're already cleared by the originating tab
    // Show the session timeout modal
    setSessionTimeoutInfo({
      isOpen: true,
      reason: data?.reason || "You've been logged out from another tab",
      userType: 'admin'
    })
  }, [])

  // Handle logout from another tab (employee) - now clears BOTH sessions
  const handleRemoteEmployeeLogout = useCallback((data) => {
    console.log('🔐 Remote employee logout detected:', data)
    // Clear BOTH sessions since login/logout is now unified
    setUser(null)
    setEmployee(null)
    setSelectedDepartment(null)
    // Don't clear tokens here - they're already cleared by the originating tab
    // Show the session timeout modal
    setSessionTimeoutInfo({
      isOpen: true,
      reason: data?.reason || "You've been logged out from another tab",
      userType: 'employee'
    })
  }, [])

  // Handle login from another tab (admin) - update BOTH sessions
  const handleRemoteAdminLogin = useCallback((data) => {
    console.log('🔐 Remote admin login detected:', data)
    // Re-check tokens and update BOTH sessions
    const adminToken = getStoredToken(false)
    if (adminToken) {
      const payload = verifyToken(adminToken)
      if (payload) {
        // Set admin session
        setUser({
          id: resolveUserId(payload),
          username: payload.username,
          name: payload.name,
          role: payload.role,
          permissions: payload.permissions || [],
          access_level: resolveAccessLevel(payload),
          loginTime: payload.iat ? new Date(payload.iat * 1000).toISOString() : new Date().toISOString(),
        })
        setSelectedDepartment(resolveDepartment(payload))
        
        // Also set employee session
        setEmployee({
          id: resolveUserId(payload),
          username: payload.username,
          name: payload.name,
          employeeId: payload.employeeId || `JJC-${resolveUserId(payload)}`,
          department: resolveDepartment(payload),
          position: payload.position || payload.access_level,
          access_level: resolveAccessLevel(payload),
          role: payload.role,
          loginTime: payload.iat ? new Date(payload.iat * 1000).toISOString() : new Date().toISOString(),
        })
      }
    }
  }, [])

  // Handle login from another tab (employee) - update BOTH sessions if admin
  const handleRemoteEmployeeLogin = useCallback((data) => {
    console.log('🔐 Remote employee login detected:', data)
    // Re-check tokens and update state
    const employeeToken = getStoredToken(true)
    if (employeeToken) {
      const payload = verifyToken(employeeToken)
      if (payload) {
        // Set employee session
        setEmployee({
          id: resolveUserId(payload),
          username: payload.username,
          name: payload.name,
          employeeId: payload.employeeId || `JJC-${resolveUserId(payload)}`,
          department: resolveDepartment(payload),
          position: payload.position,
          access_level: resolveAccessLevel(payload),
          role: payload.role,
          loginTime: payload.iat ? new Date(payload.iat * 1000).toISOString() : new Date().toISOString(),
        })
        
        // Also set admin session if user has admin access
        if (payload.role === 'admin' || payload.role === 'manager' || resolveAccessLevel(payload) === 'admin') {
          setUser({
            id: resolveUserId(payload),
            username: payload.username,
            name: payload.name,
            role: payload.role,
            permissions: payload.permissions || [],
            access_level: resolveAccessLevel(payload),
            loginTime: payload.iat ? new Date(payload.iat * 1000).toISOString() : new Date().toISOString(),
          })
          setSelectedDepartment(resolveDepartment(payload))
        }
      }
    }
  }, [])

  // Close session timeout modal
  const closeSessionTimeoutModal = useCallback(() => {
    setSessionTimeoutInfo(prev => ({ ...prev, isOpen: false }))
  }, [])

  // Check for existing valid token on app initialization
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // If we're on toolbox route, don't interfere with its theme
        if (window.location.pathname === "/jjctoolbox") {
          setIsLoading(false)
          return
        }

        // Initialize session sync for cross-tab logout AND login
        initSessionSync({
          onAdminLogout: handleRemoteAdminLogout,
          onEmployeeLogout: handleRemoteEmployeeLogout,
          onAdminLogin: handleRemoteAdminLogin,
          onEmployeeLogin: handleRemoteEmployeeLogin
        })

        // Check for admin/department token
        const adminToken = getStoredToken(false)
        if (adminToken) {
          const payload = verifyToken(adminToken)
          if (payload && payload.role) {
            setUser({
              id: resolveUserId(payload),
              username: payload.username,
              name: payload.name,
              role: payload.role,
              permissions: payload.permissions || [],
              access_level: resolveAccessLevel(payload),
              loginTime: payload.iat ? new Date(payload.iat * 1000).toISOString() : new Date().toISOString(),
            })
            setSelectedDepartment(resolveDepartment(payload))
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
              id: resolveUserId(payload),
              username: payload.username,
              name: payload.name,
              employeeId: payload.employeeId,
              department: resolveDepartment(payload),
              position: payload.position,
              access_level: resolveAccessLevel(payload),
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

    // Cleanup on unmount
    return () => {
      cleanupSessionSync()
    }
  }, [handleRemoteAdminLogout, handleRemoteEmployeeLogout, handleRemoteAdminLogin, handleRemoteEmployeeLogin])

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

  // Admin login - also sets up employee session with same credentials
  const login = (userData, department, token) => {
    // Set admin session
    setUser(userData)
    setSelectedDepartment(department)
    if (token) {
      storeTokens(token)
      // Also store as employee token for dual-session
      storeEmployeeToken(token)
    }
    
    // Also set up employee session with the same user data
    setEmployee({
      id: userData.id,
      name: userData.name,
      username: userData.username,
      employeeId: `JJC-${userData.id}`,
      department: userData.department || department,
      position: userData.access_level || userData.role,
      role: userData.role,
      permissions: userData.permissions,
      access_level: userData.access_level,
      loginTime: new Date().toISOString(),
      hasValidToken: true
    })
    
    // Broadcast admin login to other tabs
    broadcastAdminLogin({ department, username: userData?.username })
    broadcastEmployeeLogin({ username: userData?.username, name: userData?.name })
  }

  // Employee login - also sets up admin session if user has admin access
  const employeeLogin = (employeeData, token) => {
    // Set employee session
    setEmployee(employeeData)
    if (token) {
      storeEmployeeToken(token)
      // Also store as admin token for dual-session
      storeTokens(token)
    }
    
    // Also set up admin session if user has admin/manager role
    if (employeeData.role === 'admin' || employeeData.role === 'manager' || employeeData.access_level === 'admin') {
      setUser({
        id: employeeData.id,
        name: employeeData.name,
        username: employeeData.username,
        department: employeeData.department,
        role: employeeData.role,
        permissions: employeeData.permissions,
        access_level: employeeData.access_level,
        loginTime: employeeData.loginTime || new Date().toISOString(),
        hasValidToken: true
      })
      setSelectedDepartment(employeeData.department)
    }
    
    // Broadcast employee login to other tabs
    broadcastEmployeeLogin({ username: employeeData?.username, name: employeeData?.name })
    if (employeeData.role === 'admin' || employeeData.role === 'manager' || employeeData.access_level === 'admin') {
      broadcastAdminLogin({ department: employeeData.department, username: employeeData?.username })
    }
  }

  // Logout now logs out BOTH sessions
  const logout = (broadcast = true) => {
    setUser(null)
    setEmployee(null)
    setSelectedDepartment(null)
    clearTokens()
    localStorage.removeItem("employeeToken")
    clearLastRoute()
    // Broadcast logout for BOTH sessions
    if (broadcast) {
      broadcastAdminLogout('You have been logged out')
      broadcastEmployeeLogout('You have been logged out')
    }
  }

  // Employee logout now also logs out admin session
  const employeeLogout = (broadcast = true) => {
    setUser(null)
    setEmployee(null)
    setSelectedDepartment(null)
    clearTokens()
    localStorage.removeItem("employeeToken")
    clearLastRoute()
    // Broadcast logout for BOTH sessions
    if (broadcast) {
      broadcastAdminLogout('You have been logged out')
      broadcastEmployeeLogout('You have been logged out')
    }
  }

  // Logout all sessions (both admin and employee) - use this for full sign out
  const logoutAll = (broadcast = true) => {
    setUser(null)
    setEmployee(null)
    setSelectedDepartment(null)
    clearTokens()
    localStorage.removeItem("employeeToken")
    clearLastRoute()
    if (broadcast) {
      broadcastAdminLogout('You have been logged out')
      broadcastEmployeeLogout('You have been logged out')
    }
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
    logoutAll,
    isAuthenticated: !!user,
    isEmployeeAuthenticated: !!employee,
    isDarkMode,
    toggleDarkMode,
    isSuperAdmin: user?.role === "admin",
    isLoading,
    // Session timeout modal
    sessionTimeoutInfo,
    closeSessionTimeoutModal,
  }

  return <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>
}