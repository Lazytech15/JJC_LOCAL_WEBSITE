import { useAuth } from "../../contexts/AuthContext"
import { useState, useEffect } from "react"
import apiService from "../../utils/api/api-service"

function OperationsDepartment() {
  const { user, logout, isDarkMode, toggleDarkMode } = useAuth()
  const [activeTab, setActiveTab] = useState("dashboard")
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statistics, setStatistics] = useState(null)
  
  // Form states
  const [newItem, setNewItem] = useState({ name: "", description: "" })
  const [newPhase, setNewPhase] = useState({ itemId: "", name: "" })
  const [newSubPhase, setNewSubPhase] = useState({ 
    itemId: "", 
    phaseId: "", 
    name: "", 
    condition: "", 
    expectedDuration: "" 
  })
  const [scanningFor, setScanningFor] = useState(null)
  const [barcodeInput, setBarcodeInput] = useState("")
  
  // UI states
  const [expandedItems, setExpandedItems] = useState({})
  const [expandedPhases, setExpandedPhases] = useState({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
  // Load full item details when switching to checklist tab
  if (activeTab === "checklist" && items.length > 0) {
    const hasItemsWithoutDetails = items.some(item => !item.phases || item.phase_count > 0 && (!item.phases || item.phases.length === 0))
    if (hasItemsWithoutDetails) {
      loadAllItemDetails()
    }
  }
}, [activeTab])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('Loading items...')
      
      // Load items and statistics in parallel
      const [itemsResponse, statsResponse] = await Promise.all([
        apiService.operations.getItems(),
        apiService.operations.getStatistics()
      ])
      
      console.log('Items response:', itemsResponse)
      console.log('Stats response:', statsResponse)
      
      // FIX: Extract items array properly - handle both direct array and nested object responses
      let itemsArray = []
      if (Array.isArray(itemsResponse)) {
        itemsArray = itemsResponse
      } else if (itemsResponse && typeof itemsResponse === 'object') {
        // Check if response has numeric keys (0, 1, 2, etc.) - convert to array
        const numericKeys = Object.keys(itemsResponse).filter(key => !isNaN(key))
        if (numericKeys.length > 0) {
          // Convert object with numeric keys to array
          itemsArray = numericKeys.map(key => itemsResponse[key])
          console.log('Converted numeric-keyed object to array')
        } else {
          // Try common response structures
          itemsArray = itemsResponse.items || itemsResponse.data || itemsResponse.results || []
        }
      }
      
      console.log('Items array:', itemsArray)
      
      if (itemsArray.length === 0) {
        console.log('No items found')
        setItems([])
        setStatistics(statsResponse)
        return
      }
      
      // FIX: Instead of fetching full details for each item (which is slow),
      // just use the items array directly and fetch full details only when needed
      // This ensures dropdowns populate immediately
      setItems(itemsArray)
      setStatistics(statsResponse)
      
      console.log('Items loaded successfully:', itemsArray.length, 'items')
      
    } catch (err) {
      console.error('Failed to load operations data:', err)
      setError('Failed to load data: ' + err.message)
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  // Load full details for all items
const loadAllItemDetails = async () => {
  try {
    console.log('Loading full details for all items...')
    const itemsWithDetails = await Promise.all(
      items.map(item => apiService.operations.getItem(item.id))
    )
    console.log('All items with details:', itemsWithDetails)
    setItems(itemsWithDetails)
  } catch (err) {
    console.error('Failed to load all item details:', err)
  }
}

  const addItem = async () => {
    if (!newItem.name.trim()) {
      setError('Item name is required')
      return
    }
    
    try {
      setSubmitting(true)
      setError(null)
      
      const result = await apiService.operations.createItem({
        name: newItem.name,
        description: newItem.description
      })
      
      console.log('Item created:', result)
      
      setNewItem({ name: "", description: "" })
      await loadData()
      
      alert('Item created successfully!')
    } catch (err) {
      console.error('Failed to create item:', err)
      setError('Failed to create item: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const addPhase = async () => {
    if (!newPhase.itemId || !newPhase.name.trim()) {
      setError('Please select an item and enter phase name')
      return
    }
    
    try {
      setSubmitting(true)
      setError(null)
      
      await apiService.operations.createPhase({
        item_id: newPhase.itemId,
        name: newPhase.name
      })
      
      setNewPhase({ itemId: "", name: "" })
      await loadData()
      alert('Phase created successfully!')
    } catch (err) {
      console.error('Failed to create phase:', err)
      setError('Failed to create phase: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const addSubPhase = async () => {
    if (!newSubPhase.itemId || !newSubPhase.phaseId || !newSubPhase.name.trim()) {
      setError('Please select item, phase and enter sub-phase name')
      return
    }
    
    try {
      setSubmitting(true)
      setError(null)
      
      await apiService.operations.createSubphase({
        item_id: newSubPhase.itemId,
        phase_id: newSubPhase.phaseId,
        name: newSubPhase.name,
        condition: newSubPhase.condition,
        expected_duration: parseFloat(newSubPhase.expectedDuration) || 0
      })
      
      setNewSubPhase({ itemId: "", phaseId: "", name: "", condition: "", expectedDuration: "" })
      await loadData()
      alert('Sub-phase created successfully!')
    } catch (err) {
      console.error('Failed to create sub-phase:', err)
      setError('Failed to create sub-phase: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

const toggleSubPhase = async (itemId, phaseId, subPhaseId, currentStatus) => {
  try {
    await apiService.operations.completeSubphase(subPhaseId, !currentStatus)
    
    // Instead of reloading all data (which loses phase details),
    // just reload the specific item's full details
    await loadItemDetails(itemId)
  } catch (err) {
    console.error('Failed to toggle sub-phase:', err)
    setError('Failed to update sub-phase: ' + err.message)
  }
}

  const updateActualHours = async (itemId, phaseId, subPhaseId, hours) => {
    try {
      await apiService.operations.updateSubphase(subPhaseId, {
        actual_hours: parseFloat(hours) || 0
      })
      
      setItems(prevItems => 
        prevItems.map(item => {
          if (item.id === itemId) {
            return {
              ...item,
              phases: item.phases?.map(phase => {
                if (phase.id === phaseId) {
                  return {
                    ...phase,
                    subphases: phase.subphases?.map(subPhase => {
                      if (subPhase.id === subPhaseId) {
                        return { ...subPhase, actual_hours: parseFloat(hours) || 0 }
                      }
                      return subPhase
                    })
                  }
                }
                return phase
              })
            }
          }
          return item
        })
      )
    } catch (err) {
      console.error('Failed to update hours:', err)
      setError('Failed to update hours: ' + err.message)
    }
  }

  const handleBarcodeScan = (itemId, phaseId, subPhaseId) => {
    setScanningFor({ itemId, phaseId, subPhaseId })
    setBarcodeInput("")
  }

  const submitBarcode = async () => {
  if (!scanningFor || !barcodeInput.trim()) {
    setError('Please enter a barcode')
    return
  }

  try {
    setError(null)
    
    await apiService.operations.assignEmployee(
      scanningFor.subPhaseId, 
      barcodeInput.trim()
    )
    
    // Reload the specific item instead of all data
    await loadItemDetails(scanningFor.itemId)
    
    setScanningFor(null)
    setBarcodeInput("")
  } catch (err) {
    console.error('Failed to assign employee:', err)
    setError('Failed to assign employee: ' + err.message)
  }
}

  const calculatePhaseProgress = (phase) => {
    if (!phase.subphases || phase.subphases.length === 0) return 0
    const completed = phase.subphases.filter(sp => sp.completed == 1).length
    return Math.round((completed / phase.subphases.length) * 100)
  }

  const calculateItemProgress = (item) => {
    if (!item.phases || item.phases.length === 0) return 0
    const totalProgress = item.phases.reduce((sum, phase) => sum + calculatePhaseProgress(phase), 0)
    return Math.round(totalProgress / item.phases.length)
  }

  const getStatistics = () => {
    if (statistics && statistics.overall) {
      return {
        totalItems: parseInt(statistics.overall.total_items) || 0,
        completedItems: parseInt(statistics.overall.completed_items) || 0,
        inProgressItems: parseInt(statistics.overall.in_progress_items) || 0,
        notStartedItems: parseInt(statistics.overall.not_started_items) || 0,
        overallProgress: Math.round(parseFloat(statistics.overall.avg_progress) || 0)
      }
    }
    
    const totalItems = items.length
    const completedItems = items.filter(item => calculateItemProgress(item) === 100).length
    const inProgressItems = items.filter(item => {
      const progress = calculateItemProgress(item)
      return progress > 0 && progress < 100
    }).length
    const notStartedItems = items.filter(item => calculateItemProgress(item) === 0).length
    
    return {
      totalItems,
      completedItems,
      inProgressItems,
      notStartedItems,
      overallProgress: totalItems > 0 ? Math.round(items.reduce((sum, item) => sum + calculateItemProgress(item), 0) / totalItems) : 0
    }
  }

  const deleteItem = async (itemId) => {
    if (window.confirm('Are you sure you want to delete this item? This will also delete all phases and sub-phases.')) {
      try {
        await apiService.operations.deleteItem(itemId)
        await loadData()
      } catch (err) {
        console.error('Failed to delete item:', err)
        setError('Failed to delete item: ' + err.message)
      }
    }
  }

const toggleItemExpansion = async (itemId) => {
  const isExpanding = !expandedItems[itemId]
  setExpandedItems(prev => ({ ...prev, [itemId]: !prev[itemId] }))
  
  // Load full item details when expanding
  if (isExpanding) {
    const item = items.find(i => i.id === itemId)
    if (!item.phases || item.phases.length === 0) {
      await loadItemDetails(itemId)
    }
  }
}

  const togglePhaseExpansion = (phaseId) => {
    setExpandedPhases(prev => ({ ...prev, [phaseId]: !prev[phaseId] }))
  }

  // FIX: Load full item details when expanded or when needed
const loadItemDetails = async (itemId) => {
  try {
    console.log('Loading details for item:', itemId)
    const fullItem = await apiService.operations.getItem(itemId)
    console.log('Full item loaded:', fullItem)
    
    setItems(prevItems => {
      const newItems = prevItems.map(item => item.id == itemId ? fullItem : item)
      console.log('Updated items:', newItems)
      return newItems
    })
    
    return fullItem
  } catch (err) {
    console.error('Failed to load item details:', err)
    return null
  }
}

  // FIX: When selecting an item for phase, load its details if not already loaded
  const handleItemSelectForPhase = async (itemId) => {
    setNewPhase({ ...newPhase, itemId })
    const item = items.find(i => i.id == itemId)
    if (item && !item.phases) {
      await loadItemDetails(itemId)
    }
  }

// FIX: When selecting an item for subphase, load its details if not already loaded
const handleItemSelectForSubphase = async (itemId) => {
  console.log('Selected item for subphase:', itemId)
  const item = items.find(i => i.id == itemId)
  console.log('Current item data:', item)
  
  // Always load fresh details to ensure we have the latest phases
  const fullItem = await loadItemDetails(itemId)
  
  // Update the state after loading
  setNewSubPhase({ ...newSubPhase, itemId, phaseId: "" })
}

  const stats = getStatistics()

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-100 via-gray-50 to-stone-100 dark:from-slate-900 dark:via-gray-900 dark:to-stone-900 transition-colors duration-300 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white/10 dark:bg-black/20 backdrop-blur-md rounded-lg shadow-lg p-6 mb-6 border-l-4 border-slate-600 dark:border-slate-400">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">Operations Department</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">Welcome, {user?.name || "Operations Manager"}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg bg-white/10 dark:bg-black/20 backdrop-blur-sm border border-gray-300/20 dark:border-gray-700/20 hover:bg-white/20 dark:hover:bg-black/30 transition-all duration-300"
              >
                {isDarkMode ? "☀️" : "🌙"}
              </button>
              <button
                onClick={logout}
                className="bg-slate-600 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600 dark:border-slate-400 mx-auto"></div>
            <p className="text-gray-600 dark:text-gray-400 mt-4">Loading operations data...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg p-4 mb-6">
            <p className="text-red-700 dark:text-red-400">Error: {error}</p>
            <button onClick={() => setError(null)} className="mt-2 text-red-600 dark:text-red-400 hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {!loading && (
          <>
            {/* Navigation Tabs */}
            <div className="bg-white/10 dark:bg-black/20 backdrop-blur-md rounded-lg shadow-lg mb-6">
              <div className="flex border-b border-gray-300/20 dark:border-gray-700/20">
                {["dashboard", "add-items", "checklist", "reports"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-6 py-3 font-medium capitalize transition-colors ${
                      activeTab === tab
                        ? "border-b-2 border-slate-600 dark:border-slate-400 text-slate-700 dark:text-slate-300"
                        : "text-gray-600 dark:text-gray-400 hover:text-slate-600 dark:hover:text-slate-400"
                    }`}
                  >
                    {tab.replace("-", " ")}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="bg-white/10 dark:bg-black/20 backdrop-blur-md rounded-lg shadow-lg p-6">
              {/* DASHBOARD TAB */}
              {activeTab === "dashboard" && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-6">Operations Dashboard</h2>
                  
                  {/* Statistics Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                    <div className="bg-linear-to-br from-blue-500 to-blue-600 p-5 rounded-lg shadow-md text-white">
                      <h3 className="text-sm font-medium opacity-90">Total Items</h3>
                      <p className="text-3xl font-bold mt-2">{stats.totalItems}</p>
                    </div>
                    <div className="bg-linear-to-br from-green-500 to-green-600 p-5 rounded-lg shadow-md text-white">
                      <h3 className="text-sm font-medium opacity-90">Completed</h3>
                      <p className="text-3xl font-bold mt-2">{stats.completedItems}</p>
                    </div>
                    <div className="bg-linear-to-br from-yellow-500 to-yellow-600 p-5 rounded-lg shadow-md text-white">
                      <h3 className="text-sm font-medium opacity-90">In Progress</h3>
                      <p className="text-3xl font-bold mt-2">{stats.inProgressItems}</p>
                    </div>
                    <div className="bg-linear-to-br from-gray-500 to-gray-600 p-5 rounded-lg shadow-md text-white">
                      <h3 className="text-sm font-medium opacity-90">Not Started</h3>
                      <p className="text-3xl font-bold mt-2">{stats.notStartedItems}</p>
                    </div>
                    <div className="bg-linear-to-br from-purple-500 to-purple-600 p-5 rounded-lg shadow-md text-white">
                      <h3 className="text-sm font-medium opacity-90">Overall Progress</h3>
                      <p className="text-3xl font-bold mt-2">{stats.overallProgress}%</p>
                    </div>
                  </div>

                  {/* Items Progress List */}
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Items Overview</h3>
                    {items.length > 0 ? (
                      items.map(item => {
                        const progress = calculateItemProgress(item)
                        return (
                          <div key={item.id} className="bg-white/5 dark:bg-black/10 rounded-lg p-4 border border-gray-300/20 dark:border-gray-700/20">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h4 className="font-semibold text-gray-800 dark:text-gray-200">{item.name}</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{item.description}</p>
                              </div>
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                progress === 100 ? 'bg-green-500 text-white' :
                                progress > 0 ? 'bg-yellow-500 text-white' :
                                'bg-gray-500 text-white'
                              }`}>
                                {progress}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all duration-300 ${
                                  progress === 100 ? 'bg-green-500' :
                                  progress > 0 ? 'bg-yellow-500' :
                                  'bg-gray-500'
                                }`}
                                style={{ width: `${progress}%` }}
                              ></div>
                            </div>
                            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                              {item.phases?.length || 0} phases • Created {new Date(item.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <p className="text-gray-600 dark:text-gray-400 text-center py-8">No items yet. Go to "Add Items" to create your first item.</p>
                    )}
                  </div>
                </div>
              )}

              {/* ADD ITEMS TAB */}
              {activeTab === "add-items" && (
                <div className="space-y-8">
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Add Items, Phases & Sub-Phases</h2>
                  
                  {/* Add Item Section */}
                  <div className="bg-white/5 dark:bg-black/10 rounded-lg p-6 border border-gray-300/20 dark:border-gray-700/20">
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">1. Add New Item</h3>
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="Item Name"
                        value={newItem.name}
                        onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                        disabled={submitting}
                        className="w-full px-4 py-2 rounded-lg bg-white/10 dark:bg-black/20 border border-gray-300/20 dark:border-gray-700/20 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-50"
                      />
                      <textarea
                        placeholder="Item Description"
                        value={newItem.description}
                        onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                        disabled={submitting}
                        className="w-full px-4 py-2 rounded-lg bg-white/10 dark:bg-black/20 border border-gray-300/20 dark:border-gray-700/20 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-50"
                        rows="3"
                      />
                      <button
                        onClick={addItem}
                        disabled={submitting}
                        className="bg-slate-600 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white px-6 py-2 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submitting ? 'Adding...' : 'Add Item'}
                      </button>
                    </div>
                  </div>

                  {/* Add Phase Section */}
                  <div className="bg-white/5 dark:bg-black/10 rounded-lg p-6 border border-gray-300/20 dark:border-gray-700/20">
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">2. Add Phase to Item</h3>
                    <div className="space-y-3">
                      <select
                        value={newPhase.itemId}
                        onChange={(e) => handleItemSelectForPhase(e.target.value)}
                        disabled={submitting}
                        className="w-full px-4 py-2 rounded-lg bg-white/10 dark:bg-black/20 border border-gray-300/20 dark:border-gray-700/20 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-50"
                      >
                        <option value="">Select Item ({items.length} available)</option>
                        {items.map(item => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="Phase Name (e.g., Design, Development, Testing)"
                        value={newPhase.name}
                        onChange={(e) => setNewPhase({ ...newPhase, name: e.target.value })}
                        disabled={submitting}
                        className="w-full px-4 py-2 rounded-lg bg-white/10 dark:bg-black/20 border border-gray-300/20 dark:border-gray-700/20 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-50"
                      />
                      <button
                        onClick={addPhase}
                        disabled={submitting}
                        className="bg-slate-600 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white px-6 py-2 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submitting ? 'Adding...' : 'Add Phase'}
                      </button>
                    </div>
                  </div>

                  {/* Add Sub-Phase Section */}
                  <div className="bg-white/5 dark:bg-black/10 rounded-lg p-6 border border-gray-300/20 dark:border-gray-700/20">
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">3. Add Sub-Phase to Phase</h3>
                    <div className="space-y-3">
                      <select
                        value={newSubPhase.itemId}
                        onChange={(e) => handleItemSelectForSubphase(e.target.value)}
                        disabled={submitting}
                        className="w-full px-4 py-2 rounded-lg bg-white/10 dark:bg-black/20 border border-gray-300/20 dark:border-gray-700/20 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-50"
                      >
                        <option value="">Select Item ({items.length} available)</option>
                        {items.map(item => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                      </select>
                      <select
                        value={newSubPhase.phaseId}
                        onChange={(e) => setNewSubPhase({ ...newSubPhase, phaseId: e.target.value })}
                        disabled={!newSubPhase.itemId || submitting}
                        className="w-full px-4 py-2 rounded-lg bg-white/10 dark:bg-black/20 border border-gray-300/20 dark:border-gray-700/20 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-50"
                      >
                        <option value="">Select Phase</option>
                        {newSubPhase.itemId && items.find(i => i.id == newSubPhase.itemId)?.phases?.map(phase => (
                          <option key={phase.id} value={phase.id}>{phase.name}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="Sub-Phase Name (e.g., Create wireframes, Code review)"
                        value={newSubPhase.name}
                        onChange={(e) => setNewSubPhase({ ...newSubPhase, name: e.target.value })}
                        disabled={submitting}
                        className="w-full px-4 py-2 rounded-lg bg-white/10 dark:bg-black/20 border border-gray-300/20 dark:border-gray-700/20 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-50"
                      />
                      <input
                        type="text"
                        placeholder="Condition (optional, e.g., Requires approval, Must be tested)"
                        value={newSubPhase.condition}
                        onChange={(e) => setNewSubPhase({ ...newSubPhase, condition: e.target.value })}
                        disabled={submitting}
                        className="w-full px-4 py-2 rounded-lg bg-white/10 dark:bg-black/20 border border-gray-300/20 dark:border-gray-700/20 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-50"
                      />
                      <input
                        type="number"
                        step="0.5"
                        placeholder="Expected Duration (hours, e.g., 1.0 = 1 hour)"
                        value={newSubPhase.expectedDuration}
                        onChange={(e) => setNewSubPhase({ ...newSubPhase, expectedDuration: e.target.value })}
                        disabled={submitting}
                        className="w-full px-4 py-2 rounded-lg bg-white/10 dark:bg-black/20 border border-gray-300/20 dark:border-gray-700/20 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-50"
                      />
                      <button
                        onClick={addSubPhase}
                        disabled={submitting}
                        className="bg-slate-600 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white px-6 py-2 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submitting ? 'Adding...' : 'Add Sub-Phase'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* CHECKLIST TAB */}
              {activeTab === "checklist" && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-6">Progress Checklist</h2>
                  
                  {/* Barcode Scanner Modal */}
                  {scanningFor && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">Scan Employee Barcode</h3>
                        <input
                          type="text"
                          placeholder="Enter barcode or employee ID"
                          value={barcodeInput}
                          onChange={(e) => setBarcodeInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && submitBarcode()}
                          autoFocus
                          className="w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-500 mb-4"
                        />
                        <div className="flex gap-3">
                          <button
                            onClick={submitBarcode}
                            className="flex-1 bg-slate-600 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors font-medium"
                          >
                            Submit
                          </button>
                          <button
                            onClick={() => {
                              setScanningFor(null)
                              setBarcodeInput("")
                            }}
                            className="flex-1 bg-gray-500 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {items.length > 0 ? (
                    <div className="space-y-4">
                      {items.map(item => (
                        <div key={item.id} className="bg-white/5 dark:bg-black/10 rounded-lg border border-gray-300/20 dark:border-gray-700/20 overflow-hidden">
                          {/* Item Header */}
                          <div 
                            onClick={() => toggleItemExpansion(item.id)}
                            className="p-4 cursor-pointer hover:bg-white/5 dark:hover:bg-black/10 transition-colors"
                          >
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-3">
                                <span className="text-xl">{expandedItems[item.id] ? '▼' : '▶'}</span>
                                <div>
                                  <h3 className="font-semibold text-gray-800 dark:text-gray-200">{item.name}</h3>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">{item.phases?.length || 0} phases</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-lg font-bold text-gray-800 dark:text-gray-200">{calculateItemProgress(item)}%</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    deleteItem(item.id)
                                  }}
                                  className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 px-3 py-1 rounded transition-colors"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Phases */}
                          {expandedItems[item.id] && (
                            <div className="px-4 pb-4 space-y-3">
                              {item.phases && item.phases.length > 0 ? (
                                item.phases.map(phase => (
                                  <div key={phase.id} className="bg-white/5 dark:bg-black/10 rounded-lg border border-gray-300/10 dark:border-gray-700/10">
                                    {/* Phase Header */}
                                    <div 
                                      onClick={() => togglePhaseExpansion(phase.id)}
                                      className="p-3 cursor-pointer hover:bg-white/5 dark:hover:bg-black/10 transition-colors"
                                    >
                                      <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                          <span>{expandedPhases[phase.id] ? '▼' : '▶'}</span>
                                          <span className="font-medium text-gray-800 dark:text-gray-200">{phase.name}</span>
                                          <span className="text-sm text-gray-600 dark:text-gray-400">({phase.subphases?.length || 0} sub-phases)</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <div className="w-32 bg-gray-300 dark:bg-gray-700 rounded-full h-2">
                                            <div
                                              className="bg-slate-600 dark:bg-slate-400 h-2 rounded-full transition-all duration-300"
                                              style={{ width: `${calculatePhaseProgress(phase)}%` }}
                                            ></div>
                                          </div>
                                          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-12 text-right">
                                            {calculatePhaseProgress(phase)}%
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Sub-Phases */}
                                    {expandedPhases[phase.id] && (
                                      <div className="px-3 pb-3 space-y-2">
                                        {phase.subphases && phase.subphases.length > 0 ? (
                                          phase.subphases.map(subPhase => (
                                            <div key={subPhase.id} className="bg-white/5 dark:bg-black/10 p-3 rounded-lg border border-gray-300/10 dark:border-gray-700/10">
                                              <div className="flex items-start gap-3">
                                                <input
                                                  type="checkbox"
                                                  checked={subPhase.completed == 1}
                                                  onChange={() => toggleSubPhase(item.id, phase.id, subPhase.id, subPhase.completed == 1)}
                                                  className="mt-1 w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-slate-600 focus:ring-slate-500 cursor-pointer"
                                                />
                                                <div className="flex-1">
                                                  <p className={`text-gray-800 dark:text-gray-200 font-medium ${subPhase.completed == 1 ? 'line-through opacity-60' : ''}`}>
                                                    {subPhase.name}
                                                  </p>
                                                  {subPhase.subphase_condition && (
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 italic mt-1">
                                                      Condition: {subPhase.subphase_condition}
                                                    </p>
                                                  )}
                                                  
                                                  {/* Duration and Hours */}
                                                  <div className="mt-2 flex flex-wrap gap-2 items-center">
                                                    <span className="text-xs bg-blue-500/20 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                                                      Expected: {subPhase.expected_duration}h
                                                    </span>
                                                    {subPhase.actual_hours > 0 && (
                                                      <span className={`text-xs px-2 py-1 rounded ${
                                                        subPhase.actual_hours <= subPhase.expected_duration 
                                                          ? 'bg-green-500/20 text-green-700 dark:text-green-300'
                                                          : 'bg-red-500/20 text-red-700 dark:text-red-300'
                                                      }`}>
                                                        Actual: {subPhase.actual_hours}h
                                                      </span>
                                                    )}
                                                  </div>

                                                  {/* Employee Info */}
                                                  {subPhase.employee_barcode && (
                                                    <div className="mt-2 text-xs bg-slate-500/20 text-slate-700 dark:text-slate-300 px-2 py-1 rounded inline-block">
                                                      👤 {subPhase.employee_name} ({subPhase.employee_barcode})
                                                    </div>
                                                  )}

                                                  {/* Input Fields */}
                                                  <div className="mt-3 space-y-2">
                                                    <div className="flex gap-2 items-center">
                                                      <input
                                                        type="number"
                                                        step="0.5"
                                                        placeholder="Actual hours"
                                                        value={subPhase.actual_hours || ""}
                                                        onChange={(e) => updateActualHours(item.id, phase.id, subPhase.id, e.target.value)}
                                                        className="flex-1 px-3 py-1 text-sm rounded bg-white/10 dark:bg-black/20 border border-gray-300/20 dark:border-gray-700/20 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-500"
                                                      />
                                                      <button
                                                        onClick={() => handleBarcodeScan(item.id, phase.id, subPhase.id)}
                                                        className="px-3 py-1 text-sm bg-slate-600 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded transition-colors"
                                                      >
                                                        📷 Scan
                                                      </button>
                                                    </div>
                                                  </div>

                                                  {/* Completed Timestamp */}
                                                  {subPhase.completed_at && (
                                                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                                                      Completed: {new Date(subPhase.completed_at).toLocaleString()}
                                                    </p>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          ))
                                        ) : (
                                          <p className="text-gray-600 dark:text-gray-400 text-sm py-2">No sub-phases added yet.</p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ))
                              ) : (
                                <p className="text-gray-600 dark:text-gray-400 py-4">No phases added yet. Go to "Add Items" to add phases.</p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-600 dark:text-gray-400 text-center py-8">No items yet. Go to "Add Items" to create your first item.</p>
                  )}
                </div>
              )}

              {/* REPORTS TAB */}
              {activeTab === "reports" && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-6">Shipment & Reports</h2>
                  
                  {/* Summary Report */}
                  <div className="bg-white/5 dark:bg-black/10 rounded-lg p-6 border border-gray-300/20 dark:border-gray-700/20 mb-6">
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Summary Report</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-gray-600 dark:text-gray-400 mb-2">Total Items: <span className="font-bold text-gray-800 dark:text-gray-200">{stats.totalItems}</span></p>
                        <p className="text-gray-600 dark:text-gray-400 mb-2">Completed: <span className="font-bold text-green-600 dark:text-green-400">{stats.completedItems}</span></p>
                        <p className="text-gray-600 dark:text-gray-400 mb-2">In Progress: <span className="font-bold text-yellow-600 dark:text-yellow-400">{stats.inProgressItems}</span></p>
                        <p className="text-gray-600 dark:text-gray-400 mb-2">Not Started: <span className="font-bold text-gray-600 dark:text-gray-400">{stats.notStartedItems}</span></p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400 mb-2">Overall Progress: <span className="font-bold text-gray-800 dark:text-gray-200">{stats.overallProgress}%</span></p>
                        <p className="text-gray-600 dark:text-gray-400 mb-2">Generated: <span className="font-bold text-gray-800 dark:text-gray-200">{new Date().toLocaleString()}</span></p>
                      </div>
                    </div>
                  </div>

                  {/* Detailed Item Reports */}
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Detailed Item Reports</h3>
                    {items.length > 0 ? (
                      items.map(item => {
                        const progress = calculateItemProgress(item)
                        const completedPhases = item.phases?.filter(p => calculatePhaseProgress(p) === 100).length || 0
                        const totalSubPhases = item.phases?.reduce((sum, phase) => sum + (phase.subphases?.length || 0), 0) || 0
                        const completedSubPhases = item.phases?.reduce((sum, phase) => sum + (phase.subphases?.filter(sp => sp.completed == 1).length || 0), 0) || 0
                        
                        return (
                          <div key={item.id} className="bg-white/5 dark:bg-black/10 rounded-lg p-5 border border-gray-300/20 dark:border-gray-700/20">
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{item.name}</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{item.description}</p>
                              </div>
                              <span className={`px-4 py-2 rounded-lg text-lg font-bold ${
                                progress === 100 ? 'bg-green-500 text-white' :
                                progress >= 50 ? 'bg-yellow-500 text-white' :
                                'bg-gray-500 text-white'
                              }`}>
                                {progress}%
                              </span>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                              <div className="bg-white/5 dark:bg-black/10 p-3 rounded">
                                <p className="text-xs text-gray-600 dark:text-gray-400">Total Phases</p>
                                <p className="text-xl font-bold text-gray-800 dark:text-gray-200">{item.phases?.length || 0}</p>
                              </div>
                              <div className="bg-white/5 dark:bg-black/10 p-3 rounded">
                                <p className="text-xs text-gray-600 dark:text-gray-400">Completed Phases</p>
                                <p className="text-xl font-bold text-green-600 dark:text-green-400">{completedPhases}</p>
                              </div>
                              <div className="bg-white/5 dark:bg-black/10 p-3 rounded">
                                <p className="text-xs text-gray-600 dark:text-gray-400">Total Tasks</p>
                                <p className="text-xl font-bold text-gray-800 dark:text-gray-200">{totalSubPhases}</p>
                              </div>
                              <div className="bg-white/5 dark:bg-black/10 p-3 rounded">
                                <p className="text-xs text-gray-600 dark:text-gray-400">Completed Tasks</p>
                                <p className="text-xl font-bold text-green-600 dark:text-green-400">{completedSubPhases}</p>
                              </div>
                            </div>

                            {/* Phase Breakdown */}
                            <div className="space-y-2">
                              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Phase Breakdown:</p>
                              {item.phases?.map(phase => {
                                const phaseProgress = calculatePhaseProgress(phase)
                                const totalExpected = phase.subphases?.reduce((sum, sp) => sum + parseFloat(sp.expected_duration || 0), 0) || 0
                                const totalActual = phase.subphases?.reduce((sum, sp) => sum + parseFloat(sp.actual_hours || 0), 0) || 0
                                return (
                                  <div key={phase.id} className="space-y-1">
                                    <div className="flex items-center gap-3">
                                      <span className="text-sm text-gray-700 dark:text-gray-300 w-32 truncate">{phase.name}</span>
                                      <div className="flex-1 bg-gray-300 dark:bg-gray-700 rounded-full h-2">
                                        <div
                                          className={`h-2 rounded-full transition-all ${
                                            phaseProgress === 100 ? 'bg-green-500' :
                                            phaseProgress >= 50 ? 'bg-yellow-500' :
                                            'bg-gray-500'
                                          }`}
                                          style={{ width: `${phaseProgress}%` }}
                                        ></div>
                                      </div>
                                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 w-12 text-right">{phaseProgress}%</span>
                                    </div>
                                    <div className="text-xs text-gray-600 dark:text-gray-400 ml-36">
                                      Time: {totalActual}h / {totalExpected}h expected
                                    </div>
                                  </div>
                                )
                              })}
                            </div>

                            {/* Status Badge */}
                            <div className="mt-4 pt-4 border-t border-gray-300/20 dark:border-gray-700/20">
                              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                                progress === 100 ? 'bg-green-500/20 text-green-700 dark:text-green-300' :
                                progress > 0 ? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300' :
                                'bg-gray-500/20 text-gray-700 dark:text-gray-300'
                              }`}>
                                {progress === 100 ? 'Ready for Shipment' :
                                 progress > 0 ? 'In Progress' :
                                 'Not Started'}
                              </span>
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <p className="text-gray-600 dark:text-gray-400 text-center py-8">No items to report. Create items to see reports.</p>
                    )}
                  </div>

                  {/* Export Options */}
                  <div className="mt-6 bg-white/5 dark:bg-black/10 rounded-lg p-5 border border-gray-300/20 dark:border-gray-700/20">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">Export Options</h3>
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          const report = {
                            generatedAt: new Date().toISOString(),
                            statistics: stats,
                            items: items.map(item => ({
                              name: item.name,
                              description: item.description,
                              progress: calculateItemProgress(item),
                              phases: item.phases?.map(phase => ({
                                name: phase.name,
                                progress: calculatePhaseProgress(phase),
                                subphases: phase.subphases
                              })) || []
                            }))
                          }
                          const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url
                          a.download = `operations-report-${new Date().toISOString().split('T')[0]}.json`
                          a.click()
                          URL.revokeObjectURL(url)
                        }}
                        className="bg-slate-600 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white px-6 py-2 rounded-lg transition-colors font-medium"
                      >
                        Export as JSON
                      </button>
                      <button
                        onClick={() => {
                          let csvContent = "Item Name,Description,Progress,Total Phases,Completed Phases,Total Tasks,Completed Tasks,Status\n"
                          items.forEach(item => {
                            const progress = calculateItemProgress(item)
                            const completedPhases = item.phases?.filter(p => calculatePhaseProgress(p) === 100).length || 0
                            const totalSubPhases = item.phases?.reduce((sum, phase) => sum + (phase.subphases?.length || 0), 0) || 0
                            const completedSubPhases = item.phases?.reduce((sum, phase) => sum + (phase.subphases?.filter(sp => sp.completed == 1).length || 0), 0) || 0
                            const status = progress === 100 ? 'Ready for Shipment' : progress > 0 ? 'In Progress' : 'Not Started'
                            csvContent += `"${item.name}","${item.description}",${progress}%,${item.phases?.length || 0},${completedPhases},${totalSubPhases},${completedSubPhases},${status}\n`
                          })
                          const blob = new Blob([csvContent], { type: 'text/csv' })
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url
                          a.download = `operations-report-${new Date().toISOString().split('T')[0]}.csv`
                          a.click()
                          URL.revokeObjectURL(url)
                        }}
                        className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white px-6 py-2 rounded-lg transition-colors font-medium"
                      >
                        Export as CSV
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default OperationsDepartment