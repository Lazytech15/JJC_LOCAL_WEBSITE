import { useState, useEffect, useRef } from 'react'
import { Clock, User, CheckCircle, Flag, Package, Calendar, Pause, Play, RotateCcw, StopCircle, Search, Filter, FileText } from 'lucide-react'
import apiService from '../../utils/api/api-service'

// Simple authentication component
function PublicChecklistAuth({ onAuthenticate }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches

  const handleSubmit = () => {
    if (password === 'jjc2024') {
      onAuthenticate(true)
      localStorage.setItem('publicChecklistAuth', 'true')
    } else {
      setError('Invalid password')
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit()
    }
  }

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${
      isDarkMode ? 'bg-slate-900' : 'bg-slate-50'
    }`}>
      <div className={`max-w-md w-full rounded-lg shadow-lg p-8 ${
        isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'
      }`}>
        <h2 className={`text-2xl font-bold mb-6 text-center ${
          isDarkMode ? 'text-gray-200' : 'text-gray-800'
        }`}>
          Operations Checklist
        </h2>
        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Access Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError('')
              }}
              onKeyPress={handleKeyPress}
              className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-slate-500 ${
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-gray-200'
                  : 'bg-gray-50 border-gray-300 text-gray-800'
              }`}
              placeholder="Enter password"
              autoFocus
            />
          </div>
          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}
          <button
            onClick={handleSubmit}
            className="w-full bg-slate-600 hover:bg-slate-700 text-white font-medium py-3 rounded-lg transition-colors"
          >
            Access Checklist
          </button>
        </div>
      </div>
    </div>
  )
}

// Main Public Checklist Component
function PublicChecklist() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [items, setItems] = useState([])
  const [expandedItems, setExpandedItems] = useState({})
  const [expandedPhases, setExpandedPhases] = useState({})
  const [filterClient, setFilterClient] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [sortBy, setSortBy] = useState('name-asc')
  const [, forceUpdate] = useState(0)
  const [scanningFor, setScanningFor] = useState(null)
  const [barcodeInput, setBarcodeInput] = useState('')
  const [quantityModalOpen, setQuantityModalOpen] = useState(false)
  const [quantityModalData, setQuantityModalData] = useState(null)
  const [tempQuantity, setTempQuantity] = useState('')
  const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches
  const barcodeInputRef = useRef(null)

  const toggleItemExpansion = (partNumber) => {
    setExpandedItems(prev => ({
      ...prev,
      [partNumber]: !prev[partNumber]
    }))
  }

  const togglePhaseExpansion = (phaseId) => {
    setExpandedPhases(prev => ({
      ...prev,
      [phaseId]: !prev[phaseId]
    }))
  }

  useEffect(() => {
    const auth = localStorage.getItem('publicChecklistAuth')
    if (auth === 'true') {
      setIsAuthenticated(true)
    }
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      const hasActivePhases = items.some(item =>
        item.phases?.some(phase => 
          phase.start_time && !phase.end_time && !phase.pause_time
        )
      )
      if (hasActivePhases) {
        forceUpdate(prev => prev + 1)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [items])

  useEffect(() => {
    if (isAuthenticated) {
      loadData()
      const interval = setInterval(loadData, 30000)
      return () => clearInterval(interval)
    }
  }, [isAuthenticated])

  const loadData = async () => {
    try {
      setIsLoading(true)
      
      // Fetch items with in_progress status
      const response = await apiService.operations.getItems({ status: 'in_progress' })
      
      let allItems = []
      if (response.items && Array.isArray(response.items)) {
        allItems = response.items
      } else if (Array.isArray(response)) {
        allItems = response
      }
      
      // Fetch full details (phases and subphases) for each item
      const itemsWithDetails = await Promise.all(
        allItems.map(async (item) => {
          try {
            // Fetch complete item hierarchy
            const fullItem = await apiService.operations.getItem(item.part_number)
            return fullItem
          } catch (error) {
            console.error(`Failed to load details for ${item.part_number}:`, error)
            return item // Return basic item if details fail
          }
        })
      )
      
      // Filter out completed items
      const inProgressItems = itemsWithDetails.filter(item => {
        const progress = calculateItemProgress(item)
        return progress < 100
      })
      
      setItems(inProgressItems)
    } catch (error) {
      console.error('Failed to load items:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const calculateItemProgress = (item) => {
    if (!item.phases || item.phases.length === 0) return 0
    const totalSubphases = item.phases.reduce((acc, phase) => 
      acc + (phase.subphases?.length || 0), 0)
    if (totalSubphases === 0) return 0
    const completedSubphases = item.phases.reduce((acc, phase) => 
      acc + (phase.subphases?.filter(s => s.completed == 1).length || 0), 0)
    return Math.round((completedSubphases / totalSubphases) * 100)
  }

  const calculatePhaseProgress = (phase) => {
    if (!phase.subphases || phase.subphases.length === 0) return 0
    const completed = phase.subphases.filter(s => s.completed == 1).length
    return Math.round((completed / phase.subphases.length) * 100)
  }

  const getPhaseElapsedTime = (phase) => {
    if (!phase.start_time) return 0
    const start = new Date(phase.start_time)
    
    if (phase.end_time) {
      const end = new Date(phase.end_time)
      let elapsed = Math.floor((end - start) / 1000)
      if (phase.paused_duration) {
        elapsed -= parseInt(phase.paused_duration)
      }
      return Math.max(0, elapsed)
    }
    
    if (phase.pause_time) {
      const pause = new Date(phase.pause_time)
      let elapsed = Math.floor((pause - start) / 1000)
      if (phase.paused_duration) {
        elapsed -= parseInt(phase.paused_duration)
      }
      return Math.max(0, elapsed)
    }
    
    const now = new Date()
    let elapsed = Math.floor((now - start) / 1000)
    if (phase.paused_duration) {
      elapsed -= parseInt(phase.paused_duration)
    }
    return Math.max(0, elapsed)
  }

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const formatDuration = (minutes) => {
    const h = Math.floor(minutes / 60)
    const m = Math.round(minutes % 60)
    if (h > 0 && m > 0) return `${h}h ${m}m`
    if (h > 0) return `${h} hour${h > 1 ? 's' : ''}`
    if (m > 0) return `${m} minute${m !== 1 ? 's' : ''}`
    return '0 minutes'
  }

  const formatDateTime = (isoString) => {
    if (!isoString) return 'Not started'
    return new Date(isoString).toLocaleString('en-PH', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    })
  }

  const handleBarcodeScan = (partNumber, phaseId, subphaseId) => {
    setScanningFor({ partNumber, phaseId, subphaseId })
    setBarcodeInput('')
    setTimeout(() => barcodeInputRef.current?.focus(), 100)
  }

  const submitBarcode = async () => {
    if (!scanningFor || !barcodeInput.trim()) return

    try {
      const { subphaseId } = scanningFor
      await apiService.operations.assignEmployeeToSubphase(subphaseId, barcodeInput)
      
      setScanningFor(null)
      setBarcodeInput('')
      await loadData()
    } catch (error) {
      console.error('Error assigning employee:', error)
      alert('Failed to assign employee: ' + error.message)
    }
  }

  const openQuantityModal = (item, phase, subphase) => {
    setQuantityModalData({ item, phase, subphase })
    setTempQuantity(subphase.current_completed_quantity || "")
    setQuantityModalOpen(true)
  }

  const handleUpdateCompletedQuantity = async () => {
    if (!quantityModalData) return

    try {
      const { subphase } = quantityModalData
      const newQuantity = Number.parseInt(tempQuantity) || 0

      if (newQuantity > subphase.expected_quantity) {
        alert(`Cannot exceed expected quantity of ${subphase.expected_quantity}`)
        return
      }

      await apiService.operations.updateSubphaseCompletedQuantity(subphase.id, newQuantity)

      // Auto-uncheck if quantity drops below expected
      if (subphase.completed == 1 && newQuantity < subphase.expected_quantity) {
        await apiService.operations.completeSubphaseWithDuration(subphase.id, false)
      }

      setQuantityModalOpen(false)
      setQuantityModalData(null)
      setTempQuantity("")
      await loadData()
    } catch (error) {
      console.error("Error updating completed quantity:", error)
      alert("Failed to update completed quantity: " + error.message)
      await loadData()
    }
  }

  const handleToggleSubPhase = async (partNumber, phaseId, subphaseId, currentStatus) => {
    try {
      await apiService.operations.completeSubphaseWithDuration(subphaseId, !currentStatus)
      await loadData()
    } catch (error) {
      console.error('Error toggling subphase:', error)
      alert('Failed to toggle subphase: ' + error.message)
    }
  }

  const handleStartPhase = async (partNumber, phaseId) => {
    try {
      await apiService.operations.startPhaseProcess(partNumber, phaseId)
      await loadData()
    } catch (error) {
      console.error('Error starting phase:', error)
      alert('Failed to start phase: ' + error.message)
    }
  }

  const handleStopPhase = async (partNumber, phaseId) => {
    try {
      await apiService.operations.stopPhaseProcess(partNumber, phaseId)
      await loadData()
    } catch (error) {
      console.error('Error stopping phase:', error)
      alert('Failed to stop phase: ' + error.message)
    }
  }

  const handlePausePhase = async (partNumber, phaseId) => {
    try {
      await apiService.operations.pausePhaseProcess(partNumber, phaseId)
      await loadData()
    } catch (error) {
      console.error('Error pausing phase:', error)
      alert('Failed to pause phase: ' + error.message)
    }
  }

  const handleResumePhase = async (partNumber, phaseId) => {
    try {
      await apiService.operations.resumePhaseProcess(partNumber, phaseId)
      await loadData()
    } catch (error) {
      console.error('Error resuming phase:', error)
      alert('Failed to resume phase: ' + error.message)
    }
  }

  const handleResetPhase = async (partNumber, phaseId) => {
    if (window.confirm('Reset process times for this phase?')) {
      try {
        await apiService.operations.resetPhaseProcess(partNumber, phaseId)
        await loadData()
      } catch (error) {
        console.error('Error resetting phase:', error)
        alert('Failed to reset phase: ' + error.message)
      }
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return 'text-red-500 bg-red-500/10 border-red-500'
      case 'Medium': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500'
      case 'Low': return 'text-green-500 bg-green-500/10 border-green-500'
      default: return 'text-gray-500 bg-gray-500/10 border-gray-500'
    }
  }

  const filteredItems = items.filter(item => {
    const matchesSearch = !searchTerm || 
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.part_number?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesClient = !filterClient || item.client_name === filterClient
    const matchesPriority = !filterPriority || item.priority === filterPriority
    const matchesStatus = !filterStatus || (() => {
      const progress = calculateItemProgress(item)
      if (filterStatus === 'not-started') return progress === 0
      if (filterStatus === 'in-progress') return progress > 0 && progress < 100
      if (filterStatus === 'completed') return progress === 100
      return true
    })()
    return matchesSearch && matchesClient && matchesPriority && matchesStatus
  })

  const sortedItems = [...filteredItems].sort((a, b) => {
    if (sortBy === 'name-asc') return (a.name || '').localeCompare(b.name || '')
    if (sortBy === 'name-desc') return (b.name || '').localeCompare(a.name || '')
    if (sortBy === 'date-newest') return new Date(b.created_at || 0) - new Date(a.created_at || 0)
    if (sortBy === 'date-oldest') return new Date(a.created_at || 0) - new Date(b.created_at || 0)
    const priorityOrder = { High: 0, Medium: 1, Low: 2 }
    return (priorityOrder[a.priority || 'Medium'] || 3) - (priorityOrder[b.priority || 'Medium'] || 3)
  })

  const uniqueClients = [...new Set(items.filter(i => i.client_name).map(i => i.client_name))]

  const isPreviousSubphaseCompleted = (item, phase, currentSubphaseIndex) => {
    if (currentSubphaseIndex === 0) return true
    const previousSubphase = phase.subphases[currentSubphaseIndex - 1]
    return previousSubphase && previousSubphase.completed == 1
  }

  const isSubphaseConditionMet = (item, phase, subphase, subphaseIndex) => {
    if (!isPreviousSubphaseCompleted(item, phase, subphaseIndex)) {
      return false
    }

    if (subphase.expected_quantity > 0) {
      const currentQty = subphase.current_completed_quantity || 0
      if (currentQty < subphase.expected_quantity) {
        return false
      }
      if (!subphase.employee_barcode) {
        return false
      }
      return true
    }

    if (!phase.start_time || phase.pause_time || phase.end_time) {
      return false
    }

    if (!subphase.employee_barcode) {
      return false
    }

    return true
  }

  if (!isAuthenticated) {
    return <PublicChecklistAuth onAuthenticate={setIsAuthenticated} />
  }

  return (
    <div className={`min-h-screen p-4 pb-20 ${isDarkMode ? 'bg-slate-900 text-gray-100' : 'bg-slate-50 text-gray-900'}`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex justify-between items-start">
          <div>
            <h1 className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
              Operations Checklist
            </h1>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Last updated: {new Date().toLocaleTimeString()}
            </p>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem('publicChecklistAuth')
              setIsAuthenticated(false)
            }}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm"
          >
            Logout
          </button>
        </div>

        {/* Search and Filter */}
        <div className={`rounded-lg p-4 mb-6 border ${
          isDarkMode ? 'bg-gray-800/60 border-gray-700/50' : 'bg-white/30 border-white/40'
        }`}>
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 ${
                  isDarkMode
                    ? 'bg-gray-700/50 border border-gray-600/50 text-gray-100'
                    : 'bg-white/50 border border-gray-300/30 text-gray-800'
                }`}
              />
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
              <Filter size={18} />
              Filters
            </button>
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="mt-3 pt-3 border-t border-gray-300/20 dark:border-gray-700/20 grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Client
                </label>
                <select
                  value={filterClient}
                  onChange={(e) => setFilterClient(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 ${
                    isDarkMode
                      ? 'bg-gray-700/50 border border-gray-600/50 text-gray-100'
                      : 'bg-white/50 border border-gray-300/30 text-gray-800'
                  }`}
                >
                  <option value="">All Clients</option>
                  {uniqueClients.map(client => (
                    <option key={client} value={client}>{client}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Priority
                </label>
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 ${
                    isDarkMode
                      ? 'bg-gray-700/50 border border-gray-600/50 text-gray-100'
                      : 'bg-white/50 border border-gray-300/30 text-gray-800'
                  }`}
                >
                  <option value="">All Priorities</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 ${
                    isDarkMode
                      ? 'bg-gray-700/50 border border-gray-600/50 text-gray-100'
                      : 'bg-white/50 border border-gray-300/30 text-gray-800'
                  }`}
                >
                  <option value="">All Statuses</option>
                  <option value="not-started">Not Started</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Sort by
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 ${
                    isDarkMode
                      ? 'bg-gray-700/50 border border-gray-600/50 text-gray-100'
                      : 'bg-white/50 border border-gray-300/30 text-gray-800'
                  }`}
                >
                  <option value="name-asc">Name (A-Z)</option>
                  <option value="name-desc">Name (Z-A)</option>
                  <option value="date-newest">Newest</option>
                  <option value="date-oldest">Oldest</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className={`rounded-lg p-4 ${isDarkMode ? 'bg-blue-500/10 border border-blue-500/30' : 'bg-blue-500/10 border border-blue-500/30'}`}>
            <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
              In Progress
            </h3>
            <p className={`text-3xl font-bold mt-2 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
              {sortedItems.length}
            </p>
          </div>
        </div>

        {/* Items List */}
        {isLoading ? (
          <div className="text-center py-8">
            <div className={`animate-spin rounded-full h-8 w-8 border-b-2 mx-auto ${
              isDarkMode ? 'border-slate-400' : 'border-slate-600'
            }`}></div>
            <p className="mt-4">Loading items...</p>
          </div>
        ) : sortedItems.length === 0 ? (
          <p className="text-center py-8">No items match your filters.</p>
        ) : (
          <div className="space-y-4">
            {sortedItems.map(item => {
              const progress = calculateItemProgress(item)
              return (
                <div
                  key={item.part_number}
                  className={`rounded-lg border overflow-hidden ${
                    isDarkMode ? 'bg-gray-800/60 border-gray-700/50' : 'bg-white/30 border-white/40'
                  }`}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <button
                            onClick={() => toggleItemExpansion(item.part_number)}
                            className="p-1 hover:bg-gray-200/20 rounded"
                          >
                            <span className="text-xl">
                              {expandedItems[item.part_number] ? '▼' : '▶'}
                            </span>
                          </button>
                          <h3 className="font-semibold text-lg">{item.name}</h3>
                        </div>
                        <p className={`text-sm ml-9 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Part #: {item.part_number}
                        </p>
                        <div className="flex flex-wrap gap-2 ml-9 mt-2">
                          <span className={`text-xs px-2 py-1 rounded-full border flex items-center gap-1 ${getPriorityColor(item.priority || 'Medium')}`}>
                            <Flag size={12} />
                            {item.priority || 'Medium'}
                          </span>
                          {item.client_name && (
                            <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500 flex items-center gap-1">
                              <User size={12} />
                              {item.client_name}
                            </span>
                          )}
                        </div>
                        {item.remarks && (
                          <p className={`text-xs mt-2 ml-9 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} italic flex items-start gap-1`}>
                            <FileText size={12} className="mt-0.5 shrink-0" />
                            <span className="line-clamp-2">{item.remarks}</span>
                          </p>
                        )}
                      </div>
                      <span className="text-xl font-bold">{progress}%</span>
                    </div>

                    {/* Phases */}
                    {expandedItems[item.part_number] && item.phases && item.phases.length > 0 && (
                      <div className="space-y-3 ml-9">
                        {item.phases.map((phase, phaseIndex) => {
                          const phaseProgress = calculatePhaseProgress(phase)
                          return (
                            <div
                              key={phase.id}
                              className={`rounded-lg border p-4 ${
                                isDarkMode ? 'bg-gray-700/30 border-gray-600/30' : 'bg-gray-100/50 border-gray-300/30'
                              }`}
                            >
                              {/* Phase Header */}
                              <div className="flex items-center justify-between mb-3">
                                <button
                                  onClick={() => togglePhaseExpansion(phase.id)}
                                  className="flex items-center gap-2 flex-1"
                                >
                                  <span className="text-lg">{expandedPhases[phase.id] ? '▼' : '▶'}</span>
                                  <span className="font-semibold text-base">{phase.name}</span>
                                  <span className={`text-xs px-2 py-0.5 rounded ${
                                    isDarkMode ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-500/20 text-blue-700'
                                  }`}>
                                    Phase {phaseIndex + 1}
                                  </span>
                                  <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                    ({phase.subphases?.length || 0} sub)
                                  </span>
                                </button>
                                <span className="text-lg font-bold ml-4">{phaseProgress}%</span>
                              </div>

                              {/* Progress Bar */}
                              <div className="mb-4">
                                <div className={`w-full rounded-full h-3 ${
                                  isDarkMode ? 'bg-gray-600' : 'bg-gray-300'
                                }`}>
                                  <div
                                    className="bg-slate-500 h-3 rounded-full transition-all duration-300"
                                    style={{ width: `${phaseProgress}%` }}
                                  ></div>
                                </div>
                              </div>

                              {/* Duration Tracker */}
                              <div className={`rounded-lg p-4 mb-4 ${
                                isDarkMode ? 'bg-slate-500/20 border border-slate-500/30' : 'bg-slate-500/10 border border-slate-500/30'
                              }`}>
                                <div className="flex items-center justify-between mb-3">
                                  <span className={`text-sm font-semibold flex items-center gap-2 ${
                                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                  }`}>
                                    <Calendar size={16} />
                                    Duration
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <Clock size={20} className="text-slate-600 dark:text-slate-400" />
                                    <span className={`text-2xl font-mono font-bold ${
                                      isDarkMode ? 'text-gray-200' : 'text-gray-800'
                                    }`}>
                                      {formatTime(getPhaseElapsedTime(phase))}
                                    </span>
                                  </div>
                                </div>

                                {/* Start/End Times */}
                            <div className="space-y-1 text-xs mb-3">
                              <div className="flex justify-between">
                                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Start:</span>
                                <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                  {formatDateTime(phase.start_time)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>End:</span>
                                <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                  {phase.end_time ? formatDateTime(phase.end_time) : phase.pause_time ? 'Paused' : 'In progress'}
                                </span>
                              </div>
                            </div>

                            {/* Control Buttons */}
                            <div className="grid grid-cols-1 gap-2">
                              {!phase.start_time ? (
                                <button
                                  onClick={() => handleStartPhase(item.part_number, phase.id)}
                                  className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium"
                                >
                                  <Play size={16} />
                                  Start Phase
                                </button>
                              ) : phase.pause_time && !phase.end_time ? (
                                <button
                                  onClick={() => handleResumePhase(item.part_number, phase.id)}
                                  className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium"
                                >
                                  <Play size={16} />
                                  Resume Phase
                                </button>
                              ) : !phase.end_time ? (
                                <div className="grid grid-cols-2 gap-2">
                                  <button
                                    onClick={() => handlePausePhase(item.part_number, phase.id)}
                                    className="flex items-center justify-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-2 rounded-lg text-sm font-medium"
                                  >
                                    <Pause size={16} />
                                    Pause
                                  </button>
                                  <button
                                    onClick={() => handleStopPhase(item.part_number, phase.id)}
                                    className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                                    disabled={phaseProgress < 100}
                                  >
                                    <StopCircle size={16} />
                                    {phaseProgress === 100 ? 'Stop' : 'Complete First'}
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center gap-2 bg-green-600/80 text-white px-3 py-2 rounded-lg text-sm font-medium">
                                  <CheckCircle size={16} />
                                  Phase Completed
                                </div>
                              )}

                              {phase.start_time && (
                                <button
                                  onClick={() => handleResetPhase(item.part_number, phase.id)}
                                  className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                                >
                                  <RotateCcw size={16} />
                                  Reset Duration
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Subphases */}
                          {expandedPhases[phase.id] && phase.subphases && phase.subphases.length > 0 && (
                            <div className="space-y-2">
                              {phase.subphases.map((subphase, subphaseIndex) => {
                                const conditionMet = isSubphaseConditionMet(item, phase, subphase, subphaseIndex)
                                const isDisabled = !conditionMet && subphase.completed != 1

                                return (
                                  <div
                                    key={subphase.id}
                                    className={`p-3 rounded-lg ${
                                      isDarkMode ? 'bg-gray-800/50 border border-gray-700/30' : 'bg-white/50 border border-gray-300/30'
                                    }`}
                                  >
                                    <div className="flex items-start gap-3">
                                      <input
                                        type="checkbox"
                                        checked={subphase.completed == 1}
                                        disabled={isDisabled}
                                        onChange={() => {
                                          if (!isDisabled) {
                                            handleToggleSubPhase(
                                              item.part_number,
                                              phase.id,
                                              subphase.id,
                                              subphase.completed == 1
                                            )
                                          }
                                        }}
                                        className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-slate-600 focus:ring-slate-500 mt-0.5"
                                      />
                                      <div className="flex-1">
                                        <p className={`font-medium text-sm ${subphase.completed == 1 ? 'line-through opacity-60' : isDisabled ? 'opacity-50' : ''}`}>
                                          {subphase.name}
                                        </p>

                                        {/* Condition Warning */}
                                        {isDisabled && (
                                          <div
                                            className={`mb-2 mt-2 p-2 rounded text-xs ${
                                              isDarkMode
                                                ? "text-yellow-400 bg-yellow-500/10 border border-yellow-500/30"
                                                : "text-yellow-700 bg-yellow-500/10 border border-yellow-500/30"
                                            }`}
                                          >
                                            {!subphase.employee_barcode ? (
                                              <>⚠️ Assign employee first</>
                                            ) : subphaseIndex > 0 &&
                                              !isPreviousSubphaseCompleted(item, phase, subphaseIndex) ? (
                                              <>⚠️ Complete previous first</>
                                            ) : subphase.expected_quantity > 0 &&
                                              (subphase.current_completed_quantity || 0) < subphase.expected_quantity ? (
                                              <>
                                                ⚠️ Need {subphase.expected_quantity} units (have:{" "}
                                                {subphase.current_completed_quantity || 0})
                                              </>
                                            ) : !phase.start_time ? (
                                              <>⚠️ Start phase first</>
                                            ) : phase.pause_time ? (
                                              <>⚠️ Phase paused</>
                                            ) : phase.end_time ? (
                                              <>⚠️ Phase completed</>
                                            ) : (
                                              <>⚠️ Conditions not met</>
                                            )}
                                          </div>
                                        )}

                                        {subphase.time_duration > 0 && (
                                          <p className={`text-xs mt-1 flex items-center gap-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                            <Clock size={12} />
                                            {formatDuration(subphase.time_duration / 60)}
                                          </p>
                                        )}

                                        <div className="flex flex-wrap gap-2 mt-2">
                                          {subphase.expected_duration > 0 && (
                                            <span className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${isDarkMode ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-500/20 text-blue-700'}`}>
                                              <Clock size={12} />
                                              {formatDuration(subphase.expected_duration)}
                                            </span>
                                          )}
                                          {subphase.expected_quantity > 0 && (
                                            <>
                                              <span className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${isDarkMode ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-500/20 text-purple-700'}`}>
                                                <Package size={12} />
                                                {subphase.current_completed_quantity || 0} / {subphase.expected_quantity}
                                              </span>
                                              <button
                                                onClick={() => openQuantityModal(item, phase, subphase)}
                                                className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded transition-colors"
                                              >
                                                Update
                                              </button>
                                            </>
                                          )}
                                        </div>
                                      </div>

                                      {subphase.employee_barcode && (
                                        <div className={`text-xs px-2 py-1 rounded inline-flex items-center gap-1 mt-2 ${isDarkMode ? 'bg-slate-500/20 text-slate-300' : 'bg-slate-500/20 text-slate-700'}`}>
                                          <User size={12} />
                                          {subphase.employee_name || 'Unknown'} ({subphase.employee_barcode})
                                        </div>
                                      )}

                                      {/* Assign Employee Button */}
                                      <button
                                        onClick={() => handleBarcodeScan(item.part_number, phase.id, subphase.id)}
                                        className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-500/10 rounded transition-colors"
                                        title="Assign employee"
                                      >
                                        <User size={16} />
                                      </button>
                                    </div>

                                    {/* Barcode Input */}
                                    {scanningFor?.subphaseId === subphase.id && (
                                      <div className="mt-3 flex gap-2">
                                        <input
                                          ref={barcodeInputRef}
                                          type="text"
                                          placeholder="Scan employee barcode..."
                                          value={barcodeInput}
                                          onChange={(e) => setBarcodeInput(e.target.value)}
                                          onKeyPress={(e) => e.key === 'Enter' && submitBarcode()}
                                          className={`flex-1 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 ${
                                            isDarkMode
                                              ? 'bg-gray-700 border border-gray-600 text-gray-200'
                                              : 'bg-gray-100 border border-gray-300 text-gray-800'
                                          }`}
                                          autoFocus
                                        />
                                        <button
                                          onClick={submitBarcode}
                                          className="px-3 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg text-sm font-medium"
                                        >
                                          Submit
                                        </button>
                                        <button
                                          onClick={() => setScanningFor(null)}
                                          className="px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm font-medium"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )}

    {/* Quantity Update Modal */}
    {quantityModalOpen && quantityModalData && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div
          className={`rounded-lg max-w-md w-full p-6 ${
            isDarkMode ? "bg-gray-800" : "bg-white"
          }`}
        >
          <h3
            className={`text-xl font-bold mb-4 flex items-center gap-2 ${
              isDarkMode ? "text-gray-200" : "text-gray-800"
            }`}
          >
            <Package size={20} />
            Update Quantity
          </h3>

          <div
            className={`mb-4 p-3 rounded-lg space-y-2 ${
              isDarkMode ? "bg-gray-700" : "bg-gray-100"
            }`}
          >
            <div>
              <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                Item:
              </p>
              <p className={`font-semibold ${isDarkMode ? "text-gray-200" : "text-gray-800"}`}>
                {quantityModalData.item.name}
              </p>
            </div>
            <div>
              <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                Phase / Subphase:
              </p>
              <p className={`font-medium ${isDarkMode ? "text-gray-200" : "text-gray-800"}`}>
                {quantityModalData.phase.name} → {quantityModalData.subphase.name}
              </p>
            </div>
            <div>
              <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                Expected:
              </p>
              <p className={`font-bold ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}>
                {quantityModalData.subphase.expected_quantity}
              </p>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Completed Quantity
            </label>
            <input
              type="number"
              min="0"
              max={quantityModalData.subphase.expected_quantity}
              value={tempQuantity}
              onChange={(e) => setTempQuantity(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleUpdateCompletedQuantity()}
              autoFocus
              className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-slate-500 ${
                isDarkMode
                  ? "bg-gray-700 border-gray-600 text-gray-200"
                  : "bg-gray-100 border-gray-300 text-gray-800"
              }`}
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleUpdateCompletedQuantity}
              className="flex-1 bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
            >
              Update
            </button>
            <button
              onClick={() => {
                setQuantityModalOpen(false)
                setQuantityModalData(null)
                setTempQuantity("")
              }}
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
</div>
  )
}

export default PublicChecklist