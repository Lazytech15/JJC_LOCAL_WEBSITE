"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../../contexts/AuthContext"
import axios from "axios"

function DatabaseDepartment() {
  const { user, logout, isDarkMode, toggleDarkMode } = useAuth()
  const [serverInfo, setServerInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchServerInfo()
  }, [])

  const fetchServerInfo = async () => {
    try {
      setLoading(true)
      const response = await axios.get("/api/health")
      setServerInfo(response.data)
      setError(null)
    } catch (err) {
      setError("Failed to connect to database server")
      console.error("Error fetching server info:", err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${
        isDarkMode 
          ? "bg-gradient-to-br from-gray-900 via-slate-900 to-zinc-900" 
          : "bg-gradient-to-br from-slate-50 via-gray-50 to-stone-50"
      }`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className={`text-xl font-semibold mb-2 ${
            isDarkMode ? "text-white" : "text-gray-900"
          }`}>🔄 Loading Database Server...</h2>
          <p className={isDarkMode ? "text-gray-300" : "text-gray-700"}>Connecting to your database...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${
        isDarkMode 
          ? "bg-gradient-to-br from-gray-900 via-slate-900 to-zinc-900" 
          : "bg-gradient-to-br from-slate-50 via-gray-50 to-stone-50"
      }`}>
        <div className="text-center max-w-md">
          <div className={`rounded-lg p-6 border ${
            isDarkMode 
              ? "bg-red-500/20 border-red-500/50" 
              : "bg-red-50 border-red-300"
          }`}>
            <h2 className={`text-xl font-semibold mb-2 ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}>❌ Connection Error</h2>
            <p className={`mb-4 ${
              isDarkMode ? "text-gray-300" : "text-gray-700"
            }`}>{error}</p>
            <button
              onClick={fetchServerInfo}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors duration-200"
            >
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    )
  }

  const baseUrl = window.location.origin

  return (
    <div className={`min-h-screen p-8 transition-colors duration-300 ${
      isDarkMode 
        ? "bg-gradient-to-br from-gray-900 via-slate-900 to-zinc-900" 
        : "bg-gradient-to-br from-slate-50 via-gray-50 to-stone-50"
    }`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className={`text-3xl font-bold mb-2 ${
            isDarkMode ? "text-white" : "text-gray-900"
          }`}>🗃️ Database Management</h1>
          <p className={isDarkMode ? "text-gray-300" : "text-gray-700"}>Welcome back, {user?.username}!</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={toggleDarkMode}
            className={`p-2 rounded-lg transition-all duration-300 ${
              isDarkMode 
                ? "bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600/30" 
                : "bg-white/50 hover:bg-white/80 border border-gray-300"
            }`}
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            <div className="relative w-5 h-5">
              {isDarkMode ? (
                <svg className="w-full h-full text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-full h-full text-slate-700" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </div>
          </button>
          <button
            onClick={logout}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors duration-200"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto space-y-8">
        {/* Status Card */}
        <div className={`backdrop-blur-md rounded-2xl p-6 border shadow-lg ${
          isDarkMode 
            ? "bg-white/10 border-white/20" 
            : "bg-white/70 border-gray-200"
        }`}>
          <div className="flex items-center mb-4">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-3 animate-pulse"></div>
            <h2 className={`text-xl font-semibold ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}>Database Status</h2>
          </div>
          <p className="text-green-400 font-medium">✅ Database server is running and ready!</p>
          <p className={`mt-2 ${
            isDarkMode ? "text-gray-300" : "text-gray-700"
          }`}>Your database is now publicly accessible through this REST API.</p>
        </div>

        {/* Server Info */}
        {serverInfo && (
          <div className={`backdrop-blur-md rounded-2xl p-6 border shadow-lg ${
            isDarkMode 
              ? "bg-white/10 border-white/20" 
              : "bg-white/70 border-gray-200"
          }`}>
            <h3 className={`text-lg font-semibold mb-4 ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}>🔧 Server Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className={isDarkMode ? "text-gray-400" : "text-gray-600"}>Status:</span>
                <span className="text-green-400 ml-2 font-medium">{serverInfo.status}</span>
              </div>
              <div>
                <span className={isDarkMode ? "text-gray-400" : "text-gray-600"}>Database:</span>
                <span className={`ml-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}>{serverInfo.database}</span>
              </div>
              <div>
                <span className={isDarkMode ? "text-gray-400" : "text-gray-600"}>Environment:</span>
                <span className={`ml-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}>{serverInfo.environment}</span>
              </div>
              <div>
                <span className={isDarkMode ? "text-gray-400" : "text-gray-600"}>Process ID:</span>
                <span className={`ml-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}>{serverInfo.processInfo?.pid}</span>
              </div>
            </div>
          </div>
        )}

        {/* API Endpoints */}
        <div className={`backdrop-blur-md rounded-2xl p-6 border shadow-lg ${
          isDarkMode 
            ? "bg-white/10 border-white/20" 
            : "bg-white/70 border-gray-200"
        }`}>
          <h2 className={`text-lg font-semibold mb-4 ${
            isDarkMode ? "text-white" : "text-gray-900"
          }`}>🔗 Available Endpoints</h2>
          <div className="space-y-4">
            {[
              { method: "GET", url: "/api/health", desc: "Check if the database server is running and healthy" },
              { method: "GET", url: "/api/tables", desc: "Get a list of all tables in the database" },
              {
                method: "GET",
                url: "/api/tables/{tableName}/schema",
                desc: "Get schema information for a specific table",
              },
              { method: "GET", url: "/api/tables/{tableName}/data", desc: "Get all records from a table" },
              { method: "POST", url: "/api/tables/{tableName}/data", desc: "Insert a new record into a table" },
              { method: "PUT", url: "/api/tables/{tableName}/data/{id}", desc: "Update an existing record by ID" },
              { method: "DELETE", url: "/api/tables/{tableName}/data/{id}", desc: "Delete a record by ID" },
              { method: "POST", url: "/api/query", desc: "Execute custom SQL queries" },
            ].map((endpoint, index) => (
              <div key={index} className={`rounded-lg p-4 border ${
                isDarkMode 
                  ? "bg-white/5 border-white/10" 
                  : "bg-white border-gray-200"
              }`}>
                <div className="flex items-center mb-2">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium mr-3 ${
                      endpoint.method === "GET"
                        ? "bg-green-500/20 text-green-400"
                        : endpoint.method === "POST"
                          ? "bg-blue-500/20 text-blue-400"
                          : endpoint.method === "PUT"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {endpoint.method}
                  </span>
                  <code className={`text-sm ${
                    isDarkMode ? "text-gray-300" : "text-gray-700"
                  }`}>{endpoint.url}</code>
                </div>
                <p className={`text-sm ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}>{endpoint.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DatabaseDepartment
