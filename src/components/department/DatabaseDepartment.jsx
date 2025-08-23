"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../../App"
import axios from "axios"

function DatabaseDepartment() {
  const { user, logout } = useAuth()
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">🔄 Loading Database Server...</h2>
          <p className="text-gray-300">Connecting to your database...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-white max-w-md">
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-2">❌ Connection Error</h2>
            <p className="text-gray-300 mb-4">{error}</p>
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
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">🗃️ Database Management</h1>
          <p className="text-gray-300">Welcome back, {user?.username}!</p>
        </div>
        <button
          onClick={logout}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors duration-200"
        >
          Logout
        </button>
      </div>

      <div className="max-w-6xl mx-auto space-y-8">
        {/* Status Card */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
          <div className="flex items-center mb-4">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-3 animate-pulse"></div>
            <h2 className="text-xl font-semibold text-white">Database Status</h2>
          </div>
          <p className="text-green-400 font-medium">✅ Database server is running and ready!</p>
          <p className="text-gray-300 mt-2">Your database is now publicly accessible through this REST API.</p>
        </div>

        {/* Server Info */}
        {serverInfo && (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-4">🔧 Server Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Status:</span>
                <span className="text-green-400 ml-2 font-medium">{serverInfo.status}</span>
              </div>
              <div>
                <span className="text-gray-400">Database:</span>
                <span className="text-white ml-2">{serverInfo.database}</span>
              </div>
              <div>
                <span className="text-gray-400">Environment:</span>
                <span className="text-white ml-2">{serverInfo.environment}</span>
              </div>
              <div>
                <span className="text-gray-400">Process ID:</span>
                <span className="text-white ml-2">{serverInfo.processInfo?.pid}</span>
              </div>
            </div>
          </div>
        )}

        {/* API Endpoints */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
          <h2 className="text-lg font-semibold text-white mb-4">🔗 Available Endpoints</h2>
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
              <div key={index} className="bg-white/5 rounded-lg p-4 border border-white/10">
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
                  <code className="text-gray-300 text-sm">{endpoint.url}</code>
                </div>
                <p className="text-gray-400 text-sm">{endpoint.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DatabaseDepartment
