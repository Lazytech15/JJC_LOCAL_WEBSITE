// JWT Authentication utilities
const JWT_SECRET = import.meta.env.VITE_JWT_SECRET
const TOKEN_KEY = "auth_token"
const REFRESH_TOKEN_KEY = "refresh_token"

// Enhanced JWT implementation with better error handling
export const createToken = (payload, expiresIn = "1h") => {
  try {
    const header = {
      alg: "HS256",
      typ: "JWT",
    }

    const now = Math.floor(Date.now() / 1000)
    let exp

    // Better expiration handling
    switch (expiresIn) {
      case "1h":
        exp = now + 3600
        break
      case "24h":
        exp = now + 86400
        break
      case "7d":
        exp = now + 604800
        break
      default:
        exp = now + 3600
    }

    const tokenPayload = {
      ...payload,
      iat: now,
      exp: exp,
    }

    // Simple base64 encoding for demo
    const encodedHeader = btoa(JSON.stringify(header))
    const encodedPayload = btoa(JSON.stringify(tokenPayload))

    // Simple signature for demo (in production, use proper HMAC)
    const signature = btoa(`${encodedHeader}.${encodedPayload}.${JWT_SECRET}`)

    return `${encodedHeader}.${encodedPayload}.${signature}`
  } catch (error) {
    console.error("Error creating token:", error)
    return null
  }
}

export const verifyToken = (token) => {
  try {
    if (!token || typeof token !== "string") return null

    const parts = token.split(".")
    if (parts.length !== 3) return null

    const payload = JSON.parse(atob(parts[1]))
    const now = Math.floor(Date.now() / 1000)

    // Check if token is expired
    if (payload.exp && payload.exp < now) {
      console.log("Token expired")
      return null
    }

    return payload
  } catch (error) {
    console.error("Error verifying token:", error)
    return null
  }
}

export const storeTokens = (accessToken, refreshToken) => {
  try {
    if (accessToken) {
      localStorage.setItem(TOKEN_KEY, accessToken)
    }
    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
    }
    // Store timestamp for additional validation
    localStorage.setItem("token_stored_at", Date.now().toString())
  } catch (error) {
    console.error("Error storing tokens:", error)
  }
}

// Store employee token separately
export const storeEmployeeToken = (token) => {
  try {
    if (token) {
      localStorage.setItem("employeeToken", token)
      localStorage.setItem("token_stored_at", Date.now().toString())
    }
  } catch (error) {
    console.error("Error storing employee token:", error)
  }
}

export const getStoredToken = (isEmployee = false) => {
  try {
    if (isEmployee) {
      return localStorage.getItem("employeeToken")
    }
    return localStorage.getItem(TOKEN_KEY)
  } catch (error) {
    console.error("Error retrieving token:", error)
    return null
  }
}

export const getStoredRefreshToken = () => {
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY)
  } catch (error) {
    console.error("Error retrieving refresh token:", error)
    return null
  }
}

export const clearTokens = () => {
  try {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem("token_stored_at")
    console.log("Tokens cleared successfully")
  } catch (error) {
    console.error("Error clearing tokens:", error)
  }
}

export const isTokenExpired = (token) => {
  const payload = verifyToken(token)
  return !payload
}

export const getUserFromToken = (token = null) => {
  const tokenToVerify = token || getStoredToken()
  if (!tokenToVerify) return null

  const payload = verifyToken(tokenToVerify)
  return payload
}

export const refreshAccessToken = async (refreshToken = null) => {
  try {
    const tokenToUse = refreshToken || getStoredRefreshToken()
    if (!tokenToUse) {
      throw new Error("No refresh token available")
    }

    const response = await fetch(`http://192.168.1.71:3001/api/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenToUse}`,
      },
      body: JSON.stringify({
        refreshToken: tokenToUse,
      }),
    })

    if (!response.ok) {
      throw new Error("Refresh failed")
    }

    const data = await response.json()

    if (data.success && data.accessToken) {
      // Store the new access token
      localStorage.setItem(TOKEN_KEY, data.accessToken)
      return data.accessToken
    }

    throw new Error("Invalid refresh response")
  } catch (error) {
    console.error("Error refreshing token:", error)
    // Clear tokens if refresh fails
    clearTokens()
    return null
  }
}

// Enhanced token validation with automatic refresh
export const validateAndRefreshToken = async () => {
  try {
    const accessToken = getStoredToken()
    const refreshToken = getStoredRefreshToken()

    if (!accessToken && !refreshToken) {
      return null // No tokens available
    }

    // Check if access token is valid
    if (accessToken && !isTokenExpired(accessToken)) {
      return accessToken // Access token is still valid
    }

    // Try to refresh the access token
    if (refreshToken && !isTokenExpired(refreshToken)) {
      console.log("Attempting to refresh access token...")
      const newAccessToken = await refreshAccessToken(refreshToken)
      return newAccessToken
    }

    // Both tokens are invalid
    console.log("Both tokens are invalid, clearing storage")
    clearTokens()
    return null
  } catch (error) {
    console.error("Error in validateAndRefreshToken:", error)
    clearTokens()
    return null
  }
}

// Utility to make authenticated API calls
export const makeAuthenticatedRequest = async (url, options = {}) => {
  const token = await validateAndRefreshToken()

  if (!token) {
    throw new Error("No valid authentication token")
  }

  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  })
}

// Check if user has specific permission
export const hasPermission = (permission, userPermissions = []) => {
  if (!userPermissions || !Array.isArray(userPermissions)) {
    return false
  }
  return userPermissions.includes(permission) || userPermissions.includes("admin")
}

// Get user role from token
export const getUserRole = (token = null) => {
  const user = getUserFromToken(token)
  return user?.role || null
}

// Check if user is super admin
export const isSuperAdmin = (token = null) => {
  const role = getUserRole(token)
  return role === "admin"
}
