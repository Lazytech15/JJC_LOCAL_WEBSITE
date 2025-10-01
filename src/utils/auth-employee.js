// Authentication utility functions

export const validateToken = (token) => {
  if (!token) return false

  try {
    // TODO: Implement actual JWT validation
    // For now, just check if token exists and is not expired
    return token.startsWith("mock-jwt-token-")
  } catch (error) {
    console.error("Token validation failed:", error)
    return false
  }
}

export const getStoredToken = () => {
  return localStorage.getItem("employeeToken") || sessionStorage.getItem("employeeToken")
}

export const getStoredUser = () => {
  const userStr = localStorage.getItem("employeeUser") || sessionStorage.getItem("employeeUser")
  if (!userStr) return null

  try {
    return JSON.parse(userStr)
  } catch (error) {
    console.error("Failed to parse stored user:", error)
    return null
  }
}

export const clearAuth = () => {
  localStorage.removeItem("employeeToken")
  localStorage.removeItem("employeeUser")
  sessionStorage.removeItem("employeeToken")
  sessionStorage.removeItem("employeeUser")
}
