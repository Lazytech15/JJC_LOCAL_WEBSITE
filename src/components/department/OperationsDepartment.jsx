import { useAuth } from "../../contexts/AuthContext"
import { useState, useEffect } from "react"
import apiService from "../../utils/api/api-service"
import Dashboard from "../op/Dashboard.jsx"
import AddItems from "../op/AddItem.jsx"
import Checklist from "../op/CheckList.jsx"
import Reports from "../op/Report.jsx"

function OperationsDepartment() {
  const { user, logout, isDarkMode, toggleDarkMode } = useAuth()
  const [activeTab, setActiveTab] = useState("dashboard")
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statistics, setStatistics] = useState(null)
  
  // Form states - UPDATED: Added part_number
  const [newItem, setNewItem] = useState({ 
    part_number: "", 
    name: "", 
    description: "" 
  })
  const [newPhase, setNewPhase] = useState({ 
    partNumber: "", 
    name: "" 
  })
  const [newSubPhase, setNewSubPhase] = useState({ 
    partNumber: "", 
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
  // Load full item details when switching to tabs that need phase information
  if (items.length > 0) {
    const needsDetails = activeTab === "dashboard" || activeTab === "reports" || activeTab === "checklist"
    
    if (needsDetails) {
      const hasItemsWithoutDetails = items.some(item => 
        !item.phases || (item.phase_count > 0 && (!item.phases || item.phases.length === 0))
      )
      
      if (hasItemsWithoutDetails) {
        loadAllItemDetails()
      }
    }
  }
}, [activeTab, items.length])


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
        items.map(item => apiService.operations.getItem(item.part_number))
      )
      console.log('All items with details:', itemsWithDetails)
      setItems(itemsWithDetails)
    } catch (err) {
      console.error('Failed to load all item details:', err)
    }
  }

  // UPDATED: Load full item details using part_number
  const loadItemDetails = async (partNumber) => {
    try {
      console.log('Loading details for item:', partNumber)
      const fullItem = await apiService.operations.getItem(partNumber)
      console.log('Full item loaded:', fullItem)
      
      setItems(prevItems => {
        const newItems = prevItems.map(item => 
          item.part_number === partNumber ? fullItem : item
        )
        console.log('Updated items:', newItems)
        return newItems
      })
      
      return fullItem
    } catch (err) {
      console.error('Failed to load item details:', err)
      return null
    }
  }

  // UPDATED: Added part_number validation and creation
  const addItem = async () => {
    if (!newItem.part_number.trim()) {
      setError('Part number is required')
      return
    }
    
    if (!newItem.name.trim()) {
      setError('Item name is required')
      return
    }
    
    try {
      setSubmitting(true)
      setError(null)
      
      // Validate part number format
      if (!apiService.operations.validatePartNumber(newItem.part_number)) {
        setError('Invalid part number format')
        return
      }
      
      // Check if part number already exists
      const exists = await apiService.operations.itemExists(newItem.part_number)
      if (exists) {
        setError('Part number already exists')
        return
      }
      
      const result = await apiService.operations.createItem({
        part_number: newItem.part_number,
        name: newItem.name,
        description: newItem.description
      })
      
      console.log('Item created:', result)
      
      setNewItem({ part_number: "", name: "", description: "" })
      await loadData()
      
      alert('Item created successfully!')
    } catch (err) {
      console.error('Failed to create item:', err)
      setError('Failed to create item: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // UPDATED: Use part_number instead of item_id
  const addPhase = async () => {
    if (!newPhase.partNumber || !newPhase.name.trim()) {
      setError('Please select an item and enter phase name')
      return
    }
    
    try {
      setSubmitting(true)
      setError(null)
      
      await apiService.operations.createPhase({
        part_number: newPhase.partNumber,
        name: newPhase.name
      })
      
      setNewPhase({ partNumber: "", name: "" })
      await loadData()
      alert('Phase created successfully!')
    } catch (err) {
      console.error('Failed to create phase:', err)
      setError('Failed to create phase: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // UPDATED: Use part_number instead of item_id
  const addSubPhase = async () => {
    if (!newSubPhase.partNumber || !newSubPhase.phaseId || !newSubPhase.name.trim()) {
      setError('Please select item, phase and enter sub-phase name')
      return
    }
    
    try {
      setSubmitting(true)
      setError(null)
      
      await apiService.operations.createSubphase({
        part_number: newSubPhase.partNumber,
        phase_id: newSubPhase.phaseId,
        name: newSubPhase.name,
        condition: newSubPhase.condition,
        expected_duration: parseFloat(newSubPhase.expectedDuration) || 0
      })
      
      setNewSubPhase({ 
        partNumber: "", 
        phaseId: "", 
        name: "", 
        condition: "", 
        expectedDuration: "" 
      })
      await loadData()
      alert('Sub-phase created successfully!')
    } catch (err) {
      console.error('Failed to create sub-phase:', err)
      setError('Failed to create sub-phase: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // UPDATED: Use part_number for reloading item details
  const toggleSubPhase = async (partNumber, phaseId, subPhaseId, currentStatus) => {
    try {
      await apiService.operations.completeSubphase(subPhaseId, !currentStatus)
      
      // Instead of reloading all data (which loses phase details),
      // just reload the specific item's full details
      await loadItemDetails(partNumber)
    } catch (err) {
      console.error('Failed to toggle sub-phase:', err)
      setError('Failed to update sub-phase: ' + err.message)
    }
  }

  // UPDATED: Use part_number for item identification
  const updateActualHours = async (partNumber, phaseId, subPhaseId, hours) => {
    try {
      await apiService.operations.updateSubphase(subPhaseId, {
        actual_hours: parseFloat(hours) || 0
      })
      
      setItems(prevItems => 
        prevItems.map(item => {
          if (item.part_number === partNumber) {
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

  // UPDATED: Pass part_number in scanning state
  const handleBarcodeScan = (partNumber, phaseId, subPhaseId) => {
    setScanningFor({ partNumber, phaseId, subPhaseId })
    setBarcodeInput("")
  }

  // UPDATED: Use part_number for reloading
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
      await loadItemDetails(scanningFor.partNumber)
      
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

  // UPDATED: Use part_number for deletion
  const deleteItem = async (partNumber) => {
    if (window.confirm('Are you sure you want to delete this item? This will also delete all phases and sub-phases.')) {
      try {
        await apiService.operations.deleteItem(partNumber)
        await loadData()
      } catch (err) {
        console.error('Failed to delete item:', err)
        setError('Failed to delete item: ' + err.message)
      }
    }
  }

  // UPDATED: Use part_number for item expansion
  const toggleItemExpansion = async (partNumber) => {
    const isExpanding = !expandedItems[partNumber]
    setExpandedItems(prev => ({ ...prev, [partNumber]: !prev[partNumber] }))
    
    // Load full item details when expanding
    if (isExpanding) {
      const item = items.find(i => i.part_number === partNumber)
      if (!item.phases || item.phases.length === 0) {
        await loadItemDetails(partNumber)
      }
    }
  }

  const togglePhaseExpansion = (phaseId) => {
    setExpandedPhases(prev => ({ ...prev, [phaseId]: !prev[phaseId] }))
  }

  // UPDATED: Use part_number for phase selection
  const handleItemSelectForPhase = async (partNumber) => {
    setNewPhase({ ...newPhase, partNumber })
    const item = items.find(i => i.part_number === partNumber)
    if (item && !item.phases) {
      await loadItemDetails(partNumber)
    }
  }

  // UPDATED: Use part_number for subphase selection
  const handleItemSelectForSubphase = async (partNumber) => {
    console.log('Selected item for subphase:', partNumber)
    const item = items.find(i => i.part_number === partNumber)
    console.log('Current item data:', item)
    
    // Always load fresh details to ensure we have the latest phases
    const fullItem = await loadItemDetails(partNumber)
    
    // Update the state after loading
    setNewSubPhase({ ...newSubPhase, partNumber, phaseId: "" })
  }

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
              {activeTab === "dashboard" && (
                <Dashboard 
                  items={items}
                  calculateItemProgress={calculateItemProgress}
                  loading={loading}
                />
              )}

              {activeTab === "add-items" && (
                <AddItems
                  items={items}
                  submitting={submitting}
                  apiService={apiService}
                />
              )}

              {activeTab === "checklist" && (
                <Checklist
                  items={items}
                  expandedItems={expandedItems}
                  expandedPhases={expandedPhases}
                  scanningFor={scanningFor}
                  barcodeInput={barcodeInput}
                  setBarcodeInput={setBarcodeInput}
                  calculateItemProgress={calculateItemProgress}
                  calculatePhaseProgress={calculatePhaseProgress}
                  toggleItemExpansion={toggleItemExpansion}
                  togglePhaseExpansion={togglePhaseExpansion}
                  toggleSubPhase={toggleSubPhase}
                  updateActualHours={updateActualHours}
                  handleBarcodeScan={handleBarcodeScan}
                  submitBarcode={submitBarcode}
                  setScanningFor={setScanningFor}
                  deleteItem={deleteItem}
                  apiService={apiService}
                  loadData={loadData}
                />
              )}

              {activeTab === "reports" && (
                <Reports
                  items={items}
                  calculateItemProgress={calculateItemProgress}
                  calculatePhaseProgress={calculatePhaseProgress}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default OperationsDepartment