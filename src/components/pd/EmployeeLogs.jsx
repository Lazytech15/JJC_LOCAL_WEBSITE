import React, { useState, useEffect } from 'react'
import { useAuth } from "../../contexts/AuthContext"
import apiService from "../../utils/api/api-service"
import { EmployeeLogsSkeleton } from "../skeletons/ProcurementSkeletons"

function EmployeeLogs() {
  const { isDarkMode } = useAuth()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [dateFilter, setDateFilter] = useState({
    dateFrom: "",
    dateTo: ""
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [totalLogs, setTotalLogs] = useState(0)
  const [filters, setFilters] = useState({
    username: "",
    hasDetails: false
  })
  const [visibleCount, setVisibleCount] = useState(50)

  const logsPerPage = 50

  useEffect(() => {
    fetchEmployeeLogs()
  }, [currentPage, searchTerm, dateFilter, filters])

  const fetchEmployeeLogs = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = {
        offset: (currentPage - 1) * logsPerPage,
        limit: logsPerPage,
        sort_by: "created_at",
        sort_order: "DESC"
      }

      // Add search term
      if (searchTerm.trim()) {
        params.search = searchTerm.trim()
      }

      // Add date filters
      if (dateFilter.dateFrom) {
        params.date_from = dateFilter.dateFrom
      }
      if (dateFilter.dateTo) {
        params.date_to = dateFilter.dateTo
      }

      // Add username filter
      if (filters.username.trim()) {
        params.username = filters.username.trim()
      }

      // Add details filter
      if (filters.hasDetails) {
        params.has_details = true
      }

      const result = await apiService.employeeLogs.getEmployeeLogs(params)
      
      if (result.success) {
        setLogs(result.data || [])
        setTotalLogs(result.total || 0)
      } else {
        throw new Error(result.message || "Failed to fetch employee logs")
      }

    } catch (err) {
      setError(err.message)
      console.error("Employee logs fetch error:", err)
    } finally {
      setLoading(false)
      setInitialLoading(false)
    }
  }

  const handleSearch = (e) => {
    setSearchTerm(e.target.value)
    setCurrentPage(1) // Reset to first page when searching
  }

  const handleDateFilterChange = (field, value) => {
    setDateFilter(prev => ({
      ...prev,
      [field]: value
    }))
    setCurrentPage(1) // Reset to first page when filtering
  }

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }))
    setCurrentPage(1) // Reset to first page when filtering
  }

  const clearFilters = () => {
    setSearchTerm("")
    setDateFilter({ dateFrom: "", dateTo: "" })
    setFilters({ username: "", hasDetails: false })
    setCurrentPage(1)
  }

  const formatDateTime = (dateString, timeString) => {
    if (!dateString) return "N/A"
    
    const date = new Date(dateString)
    const formattedDate = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
    
    return timeString ? `${formattedDate} ${timeString}` : formattedDate
  }

  const getActivityIcon = (details) => {
    if (!details) return "📝"
    
    const detailsLower = details.toLowerCase()
    if (detailsLower.includes("checkout")) return "📤"
    if (detailsLower.includes("checkin")) return "📥"
    if (detailsLower.includes("stock")) return "📦"
    if (detailsLower.includes("update")) return "✏️"
    if (detailsLower.includes("create")) return "➕"
    if (detailsLower.includes("delete")) return "🗑️"
    
    return "📋"
  }

  const totalPages = Math.ceil(totalLogs / logsPerPage)

  if (initialLoading) {
    return <EmployeeLogsSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Employee Activity Logs</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track employee activities and transactions
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={clearFilters}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
            disabled={!searchTerm && !dateFilter.dateFrom && !dateFilter.dateTo && !filters.username && !filters.hasDetails}
          >
            Clear Filters
          </button>
          <button
            onClick={fetchEmployeeLogs}
            className="px-4 py-2 bg-zinc-600 hover:bg-zinc-700 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-white rounded-lg transition-colors text-sm"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/20 dark:bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-white/20 dark:border-gray-700/20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearch}
              placeholder="Search logs..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-black/20 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-zinc-500 focus:border-transparent"
            />
          </div>

          {/* Username Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Username
            </label>
            <input
              type="text"
              value={filters.username}
              onChange={(e) => handleFilterChange("username", e.target.value)}
              placeholder="Filter by username..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-black/20 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-zinc-500 focus:border-transparent"
            />
          </div>

          {/* Date From */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Date From
            </label>
            <input
              type="date"
              value={dateFilter.dateFrom}
              onChange={(e) => handleDateFilterChange("dateFrom", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-black/20 text-gray-900 dark:text-white focus:ring-2 focus:ring-zinc-500 focus:border-transparent"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Date To
            </label>
            <input
              type="date"
              value={dateFilter.dateTo}
              onChange={(e) => handleDateFilterChange("dateTo", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-black/20 text-gray-900 dark:text-white focus:ring-2 focus:ring-zinc-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Additional Filters */}
        <div className="mt-4 flex flex-wrap gap-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={filters.hasDetails}
              onChange={(e) => handleFilterChange("hasDetails", e.target.checked)}
              className="mr-2 rounded border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-black/20 text-zinc-600 focus:ring-zinc-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Show only logs with details</span>
          </label>
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
        <span>
          Showing {logs.length} of {totalLogs} logs
          {totalPages > 1 && ` (Page ${currentPage} of ${totalPages})`}
        </span>
        {loading && (
          <div className="flex items-center gap-2">
            <div className="animate-spin w-4 h-4 border-2 border-zinc-600 dark:border-zinc-400 border-t-transparent rounded-full"></div>
            <span>Loading...</span>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-400">Error: {error}</p>
        </div>
      )}

      {/* Logs Table */}
      <div className="bg-white/20 dark:bg-black/30 backdrop-blur-sm rounded-xl border border-white/20 dark:border-gray-700/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/10 dark:bg-black/20">
              <tr className="border-b border-gray-300/20 dark:border-gray-700/20">
                <th className="px-4 py-3 text-left font-semibold text-gray-800 dark:text-gray-200">Activity</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-800 dark:text-gray-200">User</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-800 dark:text-gray-200">Date & Time</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-800 dark:text-gray-200">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300/20 dark:divide-gray-700/20">
              {!loading && logs.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    No employee logs found
                  </td>
                </tr>
              ) : (
                logs.slice(0, visibleCount).map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-white/5 dark:hover:bg-black/10 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getActivityIcon(log.details)}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">ID: {log.id}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800 dark:text-gray-200">
                        {log.username || "N/A"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-700 dark:text-gray-300">
                        {formatDateTime(log.log_date, log.log_time)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Created: {new Date(log.created_at).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-700 dark:text-gray-300">
                        {log.details ? (
                          <div className="max-w-md">
                            <p className="break-words">{log.details}</p>
                          </div>
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400 italic">No details</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Load More Button */}
        {logs.length > visibleCount && (
          <div className="p-4 text-center border-t border-gray-300/20 dark:border-gray-700/20">
            <button
              onClick={() => setVisibleCount((c) => Math.min(c + 20, logs.length))}
              className="px-4 py-2 bg-zinc-600 hover:bg-zinc-700 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-white rounded-lg transition-colors"
            >
              Load more ({Math.min(20, logs.length - visibleCount)})
            </button>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1 || loading}
            className="px-3 py-2 bg-white/20 dark:bg-black/30 backdrop-blur-sm border border-white/20 dark:border-gray-700/20 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-white/30 dark:hover:bg-black/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          
          <div className="flex gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum
              if (totalPages <= 5) {
                pageNum = i + 1
              } else if (currentPage <= 3) {
                pageNum = i + 1
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i
              } else {
                pageNum = currentPage - 2 + i
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  disabled={loading}
                  className={`px-3 py-2 rounded-lg transition-colors ${
                    currentPage === pageNum
                      ? "bg-zinc-600 dark:bg-zinc-700 text-white"
                      : "bg-white/20 dark:bg-black/30 backdrop-blur-sm border border-white/20 dark:border-gray-700/20 text-gray-700 dark:text-gray-300 hover:bg-white/30 dark:hover:bg-black/40"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {pageNum}
                </button>
              )
            })}
          </div>

          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages || loading}
            className="px-3 py-2 bg-white/20 dark:bg-black/30 backdrop-blur-sm border border-white/20 dark:border-gray-700/20 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-white/30 dark:hover:bg-black/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}

export default EmployeeLogs