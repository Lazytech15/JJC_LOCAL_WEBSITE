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
    hasDetails: false,
    activityType: "",
    department: "",
    status: ""
  })
  const [visibleCount, setVisibleCount] = useState(50)
  const [selectedLog, setSelectedLog] = useState(null)
  const [showLogModal, setShowLogModal] = useState(false)
  const [selectedLogs, setSelectedLogs] = useState([])
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [itemDetails, setItemDetails] = useState({})
  const [loadingItemDetails, setLoadingItemDetails] = useState(false)

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

      // Add activity type filter
      if (filters.activityType) {
        params.activity_type = filters.activityType
      }

      // Add department filter
      if (filters.department) {
        params.department = filters.department
      }

      // Add status filter
      if (filters.status) {
        params.status = filters.status
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
    setFilters({ username: "", hasDetails: false, activityType: "", department: "", status: "" })
    setCurrentPage(1)
  }

  const handleLogClick = (log) => {
    setSelectedLog(log)
    setShowLogModal(true)
    
    // Fetch item details for the items mentioned in the log
    const items = parseItemsFromDetails(log.details)
    if (items.length > 0) {
      fetchItemDetails(items)
    }
  }

  const closeLogModal = () => {
    setShowLogModal(false)
    setSelectedLog(null)
    setItemDetails({})
    setLoadingItemDetails(false)
  }

  const handleLogSelect = (logId, checked) => {
    if (checked) {
      setSelectedLogs(prev => [...prev, logId])
    } else {
      setSelectedLogs(prev => prev.filter(id => id !== logId))
    }
  }

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedLogs(logs.slice(0, visibleCount).map(log => log.id))
    } else {
      setSelectedLogs([])
    }
  }

  const handleBulkAction = async (action) => {
    if (selectedLogs.length === 0) return

    try {
      switch (action) {
        case 'markReviewed':
          // Implement mark as reviewed
          console.log('Marking logs as reviewed:', selectedLogs)
          break
        case 'archive':
          // Implement archive
          console.log('Archiving logs:', selectedLogs)
          break
        case 'delete':
          if (window.confirm(`Are you sure you want to delete ${selectedLogs.length} log(s)?`)) {
            console.log('Deleting logs:', selectedLogs)
          }
          break
        case 'export':
          exportSelectedLogs()
          break
      }
      setSelectedLogs([])
    } catch (error) {
      console.error('Bulk action failed:', error)
    }
  }

  const exportLogs = (format) => {
    const dataToExport = logs.slice(0, visibleCount)
    exportData(dataToExport, format)
  }

  const exportSelectedLogs = () => {
    const dataToExport = logs.filter(log => selectedLogs.includes(log.id))
    exportData(dataToExport, 'csv')
  }

  const exportData = (data, format) => {
    if (format === 'csv') {
      const headers = ['ID', 'Username', 'Activity', 'Date', 'Time', 'Details', 'Created At']
      const csvContent = [
        headers.join(','),
        ...data.map(log => [
          log.id,
          `"${log.username || 'N/A'}"`,
          `"${getActivityIcon(log.details)}"`,
          log.log_date || '',
          log.log_time || '',
          `"${log.details || ''}"`,
          log.created_at
        ].join(','))
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `employee_logs_${new Date().toISOString().split('T')[0]}.csv`
      link.click()
    }
  }

  const setTimeRange = (range) => {
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    
    switch (range) {
      case 'today':
        setDateFilter({ dateFrom: today, dateTo: today })
        break
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        setDateFilter({ dateFrom: weekAgo, dateTo: today })
        break
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        setDateFilter({ dateFrom: monthAgo, dateTo: today })
        break
      case 'clear':
        setDateFilter({ dateFrom: "", dateTo: "" })
        break
    }
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const parseItemsFromDetails = (details) => {
    if (!details) return []

    // Try to parse structured item data from details
    // Look for patterns like "Item: Name - Quantity: X" or similar
    const itemPatterns = [
      /Item:\s*([^-\n]+)\s*-\s*Quantity:\s*(\d+)/gi,
      /([^:]+):\s*(\d+)\s*(?:items?|pcs?|units?)/gi,
      /(\w+(?:\s+\w+)*)\s*-\s*(\d+)/gi
    ]

    const items = []

    for (const pattern of itemPatterns) {
      let match
      while ((match = pattern.exec(details)) !== null) {
        const itemName = match[1]?.trim()
        const quantity = parseInt(match[2])

        if (itemName && quantity && quantity > 0) {
          items.push({
            name: itemName,
            quantity: quantity
          })
        }
      }
    }

    // If no structured items found, try to extract any numbers that might be quantities
    if (items.length === 0) {
      const quantityMatches = details.match(/\b(\d+)\b/g)
      if (quantityMatches) {
        // Try to find item names around quantities
        const lines = details.split('\n')
        lines.forEach(line => {
          const quantityMatch = line.match(/\b(\d+)\b/)
          if (quantityMatch) {
            const quantity = parseInt(quantityMatch[1])
            const itemName = line.replace(/\b\d+\b/, '').replace(/[-:]/g, '').trim()
            if (itemName && quantity > 0) {
              items.push({
                name: itemName,
                quantity: quantity
              })
            }
          }
        })
      }
    }

    return items
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

  const getActivitySummary = (details) => {
    if (!details) return "General Activity"
    
    const detailsLower = details.toLowerCase()
    if (detailsLower.includes("checkout")) return "Item Checkout"
    if (detailsLower.includes("checkin")) return "Item Check-in"
    if (detailsLower.includes("stock")) return "Stock Management"
    if (detailsLower.includes("update")) return "Data Update"
    if (detailsLower.includes("create")) return "Item Creation"
    if (detailsLower.includes("delete")) return "Item Deletion"
    
    return "Activity"
  }

  const fetchItemDetails = async (items) => {
    if (!items || items.length === 0) return

    setLoadingItemDetails(true)
    const details = {}

    try {
      // Try to fetch items by name or ID
      for (const item of items) {
        try {
          // First try to fetch by item name (assuming item.name might be the item name)
          const result = await apiService.items.getItems({ search: item.name, limit: 1 })
          if (result.data && result.data.length > 0) {
            details[item.name] = result.data[0]
          } else {
            // If not found by name, try by item_no if it looks like an ID
            const itemNoMatch = item.name.match(/ID:\s*(\d+)/i) || item.name.match(/(\d+)/)
            if (itemNoMatch) {
              try {
                const itemResult = await apiService.items.getItem(itemNoMatch[1])
                if (itemResult.data) {
                  details[item.name] = itemResult.data
                }
              } catch (error) {
                console.log(`Could not fetch item with ID ${itemNoMatch[1]}:`, error)
              }
            }
          }
        } catch (error) {
          console.log(`Could not fetch item "${item.name}":`, error)
        }
      }
    } catch (error) {
      console.error('Error fetching item details:', error)
    } finally {
      setLoadingItemDetails(false)
    }

    setItemDetails(details)
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
            onClick={() => exportLogs('csv')}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white rounded-lg transition-colors text-sm"
            title="Export to CSV"
          >
            📊 CSV
          </button>
          <button
            onClick={() => exportLogs('pdf')}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white rounded-lg transition-colors text-sm"
            title="Export to PDF"
          >
            📄 PDF
          </button>
          <button
            onClick={clearFilters}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
            disabled={!searchTerm && !dateFilter.dateFrom && !dateFilter.dateTo && !filters.username && !filters.hasDetails && !filters.activityType && !filters.department && !filters.status}
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

          {/* Activity Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Activity Type
            </label>
            <select
              value={filters.activityType}
              onChange={(e) => handleFilterChange("activityType", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-black/20 text-gray-900 dark:text-white focus:ring-2 focus:ring-zinc-500 focus:border-transparent"
            >
              <option value="">All Activities</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
              <option value="checkout">Checkout</option>
              <option value="checkin">Check-in</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
              <option value="view">View</option>
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Department
            </label>
            <select
              value={filters.department}
              onChange={(e) => handleFilterChange("department", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-black/20 text-gray-900 dark:text-white focus:ring-2 focus:ring-zinc-500 focus:border-transparent"
            >
              <option value="">All Departments</option>
              <option value="procurement">Procurement</option>
              <option value="hr">HR</option>
              <option value="finance">Finance</option>
              <option value="operations">Operations</option>
              <option value="it">IT</option>
            </select>
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

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-black/20 text-gray-900 dark:text-white focus:ring-2 focus:ring-zinc-500 focus:border-transparent"
            >
              <option value="">All Status</option>
              <option value="success">Success</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
              <option value="info">Info</option>
            </select>
          </div>

          {/* Time Range Presets */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Quick Ranges
            </label>
            <div className="flex gap-1">
              <button
                onClick={() => setTimeRange('today')}
                className="px-2 py-1 text-xs bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-colors"
              >
                Today
              </button>
              <button
                onClick={() => setTimeRange('week')}
                className="px-2 py-1 text-xs bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-colors"
              >
                7 Days
              </button>
              <button
                onClick={() => setTimeRange('month')}
                className="px-2 py-1 text-xs bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-colors"
              >
                30 Days
              </button>
            </div>
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

      {/* Bulk Actions */}
      {selectedLogs.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-700 dark:text-blue-300">
              {selectedLogs.length} log(s) selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => handleBulkAction('markReviewed')}
                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors"
              >
                Mark Reviewed
              </button>
              <button
                onClick={() => handleBulkAction('archive')}
                className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-sm rounded transition-colors"
              >
                Archive
              </button>
              <button
                onClick={() => handleBulkAction('export')}
                className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded transition-colors"
              >
                Export Selected
              </button>
              <button
                onClick={() => handleBulkAction('delete')}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

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
                <th className="px-4 py-3 text-left font-semibold text-gray-800 dark:text-gray-200">
                  <input
                    type="checkbox"
                    checked={selectedLogs.length === logs.slice(0, visibleCount).length && logs.slice(0, visibleCount).length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-black/20 text-zinc-600 focus:ring-zinc-500"
                  />
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-800 dark:text-gray-200">Activity</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-800 dark:text-gray-200">User</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-800 dark:text-gray-200">Date & Time</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-800 dark:text-gray-200">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300/20 dark:divide-gray-700/20">
              {!loading && logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    No employee logs found
                  </td>
                </tr>
              ) : (
                logs.slice(0, visibleCount).map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-white/5 dark:hover:bg-black/10 transition-colors cursor-pointer"
                    onClick={() => handleLogClick(log)}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedLogs.includes(log.id)}
                        onChange={(e) => handleLogSelect(log.id, e.target.checked)}
                        className="rounded border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-black/20 text-zinc-600 focus:ring-zinc-500"
                      />
                    </td>
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

      {/* Detailed Log View Modal */}
      {showLogModal && selectedLog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-zinc-600 to-zinc-700 dark:from-zinc-700 dark:to-zinc-800 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Log Details</h2>
                  <p className="text-zinc-200 mt-1">Activity ID: {selectedLog.id}</p>
                </div>
                <button
                  onClick={closeLogModal}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-1 gap-6">
                {/* Employee Information */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Employee Name
                  </label>
                  <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="w-12 h-12 bg-zinc-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {(selectedLog.username || "N/A").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {selectedLog.username || "N/A"}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Employee ID: {selectedLog.id}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Items Taken */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Items Taken
                  </label>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    {(() => {
                      const items = parseItemsFromDetails(selectedLog.details)
                      if (items.length > 0) {
                        return (
                          <div className="space-y-4">
                            {items.map((item, index) => {
                              const itemDetail = itemDetails[item.name]
                              return (
                                <div key={index} className="bg-white dark:bg-gray-600 rounded-lg p-4 border border-gray-200 dark:border-gray-500">
                                  <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 bg-zinc-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                        {index + 1}
                                      </div>
                                      <div>
                                        <h4 className="font-semibold text-gray-900 dark:text-white text-lg">
                                          {item.name}
                                        </h4>
                                        {itemDetail && (
                                          <p className="text-sm text-gray-500 dark:text-gray-400">
                                            ID: {itemDetail.item_no}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Quantity Taken</div>
                                      <div className="text-2xl font-bold text-zinc-600 dark:text-zinc-400">
                                        {item.quantity}
                                      </div>
                                    </div>
                                  </div>

                                  {itemDetail ? (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-gray-200 dark:border-gray-500">
                                      <div className="text-center">
                                        <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Brand</div>
                                        <div className="font-medium text-gray-900 dark:text-white mt-1">
                                          {itemDetail.brand || 'N/A'}
                                        </div>
                                      </div>
                                      <div className="text-center">
                                        <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Location</div>
                                        <div className="font-medium text-gray-900 dark:text-white mt-1">
                                          {itemDetail.location || 'N/A'}
                                        </div>
                                      </div>
                                      <div className="text-center">
                                        <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Current Stock</div>
                                        <div className="font-medium text-gray-900 dark:text-white mt-1">
                                          {itemDetail.balance || 0} {itemDetail.unit_of_measure || 'units'}
                                        </div>
                                      </div>
                                      <div className="text-center">
                                        <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Unit Price</div>
                                        <div className="font-medium text-gray-900 dark:text-white mt-1">
                                          {itemDetail.price_per_unit ? `₱${itemDetail.price_per_unit.toFixed(2)}` : 'N/A'}
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="pt-3 border-t border-gray-200 dark:border-gray-500">
                                      {loadingItemDetails ? (
                                        <div className="flex items-center justify-center py-4">
                                          <div className="animate-spin w-6 h-6 border-2 border-zinc-600 dark:border-zinc-400 border-t-transparent rounded-full"></div>
                                          <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Loading item details...</span>
                                        </div>
                                      ) : (
                                        <div className="text-center py-4">
                                          <div className="text-sm text-gray-500 dark:text-gray-400">
                                            Item details not found in inventory
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )
                      } else {
                        return (
                          <div className="text-center py-8">
                            <div className="text-4xl mb-2">📦</div>
                            <p className="text-gray-500 dark:text-gray-400">
                              {selectedLog.details ? 
                                "No structured item data found in log details" : 
                                "No item information available"
                              }
                            </p>
                            {selectedLog.details && (
                              <div className="mt-4 p-3 bg-white dark:bg-gray-600 rounded-lg">
                                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                  {selectedLog.details}
                                </p>
                              </div>
                            )}
                          </div>
                        )
                      }
                    })()}
                  </div>
                </div>

                {/* Date and Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Date & Time
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">📅</span>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Activity Date</span>
                      </div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {selectedLog.log_date || "N/A"}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">🕐</span>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Activity Time</span>
                      </div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {selectedLog.log_time || "N/A"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                      <span>📝</span>
                      <span>Log created on {new Date(selectedLog.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 p-6 flex justify-end gap-3">
              <button
                onClick={closeLogModal}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  exportData([selectedLog], 'csv')
                  closeLogModal()
                }}
                className="px-4 py-2 bg-zinc-600 hover:bg-zinc-700 text-white rounded-lg transition-colors"
              >
                Export This Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EmployeeLogs