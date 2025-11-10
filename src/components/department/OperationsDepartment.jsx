import { useAuth } from "../../contexts/AuthContext"
import { useState, useEffect, useRef } from "react"
import apiService from "../../utils/api/api-service"
import Dashboard from "../op/Dashboard.jsx"
import AddItems from "../op/AddItem.jsx"
import Checklist from "../op/CheckList.jsx"
import Reports from "../op/Report.jsx"
import ItemComparison from "../op/ItemComparison.jsx"
import { Menu, X, ArrowUp } from 'lucide-react'

function OperationsDepartment() {
  const { user, logout, isDarkMode, toggleDarkMode } = useAuth()
  const [activeTab, setActiveTab] = useState("dashboard")
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statistics, setStatistics] = useState(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [scanningFor, setScanningFor] = useState(null)
  const [barcodeInput, setBarcodeInput] = useState("")

  // UI states
  const [expandedItems, setExpandedItems] = useState({})
  const [expandedPhases, setExpandedPhases] = useState({})
  const [submitting, setSubmitting] = useState(false)

  // Ref to track if component is mounted
  const isMountedRef = useRef(true)
  const refreshIntervalRef = useRef(null)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
    }
  }, [])

  // Scroll to top button visibility
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShowScrollTop(true)
      } else {
        setShowScrollTop(false)
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }


  useEffect(() => {
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
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current)
      refreshIntervalRef.current = null
    }

    const needsRefresh = activeTab === "dashboard" || activeTab === "reports" || activeTab === "checklist"

    if (needsRefresh && items.length > 0) {
      const hasActivePhases = items.some(item =>
        item.phases?.some(phase =>
          phase.start_time && !phase.end_time
        )
      )

      if (hasActivePhases) {
        refreshIntervalRef.current = setInterval(() => {
          if (isMountedRef.current) {
            refreshActiveData()
          }
        }, 30000)
      }
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
        refreshIntervalRef.current = null
      }
    }
  }, [activeTab, items])

  useEffect(() => {
    loadData()
  }, [])

  const refreshActiveData = async () => {
    try {
      console.log('Refreshing active data...')

      const activeItems = items.filter(item =>
        item.phases?.some(phase => phase.start_time && !phase.end_time)
      )

      if (activeItems.length === 0) return

      const freshItems = await Promise.all(
        activeItems.map(item => apiService.operations.getItem(item.part_number))
      )

      if (isMountedRef.current) {
        setItems(prevItems => {
          const updatedItems = [...prevItems]
          freshItems.forEach(freshItem => {
            const index = updatedItems.findIndex(i => i.part_number === freshItem.part_number)
            if (index !== -1) {
              updatedItems[index] = freshItem
            }
          })
          return updatedItems
        })

        const statsResponse = await apiService.operations.getStatistics()
        setStatistics(statsResponse)
      }
    } catch (err) {
      console.error('Failed to refresh active data:', err)
    }
  }

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log('Loading items...')

      const [itemsResponse, statsResponse] = await Promise.all([
        apiService.operations.getItems(),
        apiService.operations.getStatistics()
      ])

      console.log('Items response:', itemsResponse)
      console.log('Stats response:', statsResponse)

      let itemsArray = []
      if (Array.isArray(itemsResponse)) {
        itemsArray = itemsResponse
      } else if (itemsResponse && typeof itemsResponse === 'object') {
        const numericKeys = Object.keys(itemsResponse).filter(key => !isNaN(key))
        if (numericKeys.length > 0) {
          itemsArray = numericKeys.map(key => itemsResponse[key])
          console.log('Converted numeric-keyed object to array')
        } else {
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

  const loadAllItemDetails = async () => {
    try {
      console.log('Loading full details for all items...')
      const itemsWithDetails = await Promise.all(
        items.map(item => apiService.operations.getItem(item.part_number))
      )
      console.log('All items with details:', itemsWithDetails)
      if (isMountedRef.current) {
        setItems(itemsWithDetails)
      }
    } catch (err) {
      console.error('Failed to load all item details:', err)
    }
  }

  const loadItemDetails = async (partNumber) => {
    try {
      console.log('Loading details for item:', partNumber)
      const fullItem = await apiService.operations.getItem(partNumber)
      console.log('Full item loaded:', fullItem)

      if (isMountedRef.current) {
        setItems(prevItems => {
          const newItems = prevItems.map(item =>
            item.part_number === partNumber ? fullItem : item
          )
          console.log('Updated items:', newItems)
          return newItems
        })
      }

      return fullItem
    } catch (err) {
      console.error('Failed to load item details:', err)
      return null
    }
  }

  const getItemElapsedTime = (item) => {
    if (!item.start_time) return 0;
    const start = new Date(item.start_time);
    const end = item.end_time ? new Date(item.end_time) : new Date();
    return Math.floor((end - start) / 1000);
  };

  const formatTime = (seconds) => {
    const totalSeconds = Math.floor(Number(seconds)); // 👈 Ensures clean integer input

    if (!totalSeconds || totalSeconds <= 0) {
      return "Not Started";
    }

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    if (hours === 0 && minutes === 0 && secs === 0) {
      return "Not Started";
    }

    const parts = [];

    if (hours > 0) {
      parts.push(`${hours} hour${hours !== 1 ? "s" : ""}`);
    }

    if (minutes > 0) {
      parts.push(`${minutes} minute${minutes !== 1 ? "s" : ""}`);
    }

    if (secs > 0) {
      parts.push(`${secs} second${secs !== 1 ? "s" : ""}`);
    }

    return parts.length > 0 ? parts.join(" ") : "Not Started";
  };

  function formatActionDuration(hours) {
    const totalSeconds = Math.round(hours * 3600);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (seconds === 0) {
      return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
    }

    return `${minutes} minute${minutes !== 1 ? "s" : ""} ${seconds} second${seconds !== 1 ? "s" : ""}`;
  }

  const getPhaseElapsedTime = (phase) => {
    if (!phase.start_time) return 0;

    const start = new Date(phase.start_time);

    if (phase.end_time) {
      const end = new Date(phase.end_time);
      let elapsed = Math.floor((end - start) / 1000);
      if (phase.paused_duration) {
        elapsed -= phase.paused_duration;
      }
      return Math.max(0, elapsed);
    }

    if (phase.pause_time) {
      const pause = new Date(phase.pause_time);
      let elapsed = Math.floor((pause - start) / 1000);
      if (phase.paused_duration) {
        elapsed -= phase.paused_duration;
      }
      return Math.max(0, elapsed);
    }

    const now = new Date();
    let elapsed = Math.floor((now - start) / 1000);
    if (phase.paused_duration) {
      elapsed -= phase.paused_duration;
    }
    return Math.max(0, elapsed);
  };

  const toggleSubPhase = async (partNumber, phaseId, subPhaseId, currentStatus) => {
    try {
      await apiService.operations.completeSubphase(subPhaseId, !currentStatus)
      await loadItemDetails(partNumber)
    } catch (err) {
      console.error('Failed to toggle sub-phase:', err)
      setError('Failed to update sub-phase: ' + err.message)
    }
  }

  const updateActualHours = async (partNumber, phaseId, subPhaseId, hours) => {
    try {
      await apiService.operations.updateSubphase(subPhaseId, {
        actual_hours: parseFloat(hours) || 0
      })

      if (isMountedRef.current) {
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
      }
    } catch (err) {
      console.error('Failed to update hours:', err)
      setError('Failed to update hours: ' + err.message)
    }
  }

  const handleBarcodeScan = (partNumber, phaseId, subPhaseId) => {
    setScanningFor({ partNumber, phaseId, subPhaseId })
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

  const toggleItemExpansion = async (partNumber) => {
    const isExpanding = !expandedItems[partNumber]
    setExpandedItems(prev => ({ ...prev, [partNumber]: !prev[partNumber] }))

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

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    setMobileMenuOpen(false)
  }

  const tabs = [
    { id: "dashboard", label: "Dashboard" },
    { id: "add-items", label: "Add Items" },
    { id: "checklist", label: "Checklist" },
    { id: "comparison", label: "Comparison" },
    { id: "reports", label: "Reports" }
  ]

  const cardClass = isDarkMode
    ? "bg-gray-800/60 border-gray-700/50"
    : "bg-white/20 border-white/30"

  const textPrimaryClass = isDarkMode ? "text-gray-100" : "text-gray-800"
  const textSecondaryClass = isDarkMode ? "text-gray-300" : "text-gray-600"

  return (
    <div className={`min-h-screen p-8 transition-colors duration-300 ${isDarkMode
      ? "bg-linear-to-br from-gray-950 via-gray-900 to-gray-950"
      : "bg-linear-to-br from-gray-50 via-slate-50 to-stone-50"
      }`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className={`backdrop-blur-md rounded-2xl p-6 mb-6 border shadow-lg transition-all duration-300 ${cardClass}`}>
          <div className="flex justify-between items-start sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <h1 className={`text-2xl md:text-3xl font-bold ${textPrimaryClass}`}>
                ⚙️ Operations Department
              </h1>
              <p className={`text-sm sm:text-base mt-2 ${textSecondaryClass}`}>
                Welcome, {user?.name || "Operations Manager"}
              </p>
            </div>
            <div className="flex gap-2 sm:gap-3 flex-shrink-0">
              <button
                onClick={toggleDarkMode}
                className={`p-2 rounded-lg backdrop-blur-sm border transition-all duration-300 ${isDarkMode
                  ? "bg-gray-800/60 border-gray-700/50 hover:bg-gray-800/80 text-yellow-400"
                  : "bg-white/20 border-white/30 hover:bg-white/30 text-gray-700"
                  }`}
                aria-label="Toggle dark mode"
              >
                {isDarkMode ? "☀️" : "🌙"}
              </button>
              <button
                onClick={logout}
                className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${isDarkMode
                  ? "bg-slate-700 hover:bg-slate-600 text-white"
                  : "bg-slate-600 hover:bg-slate-700 text-white"
                  }`}
              >
                <span className="hidden sm:inline">Logout</span>
                <span className="sm:hidden">Exit</span>
              </button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <div className={`animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 mx-auto ${isDarkMode ? "border-slate-400" : "border-slate-600"
              }`}></div>
            <p className={`text-sm sm:text-base mt-4 ${textSecondaryClass}`}>Loading operations data...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className={`backdrop-blur-sm border rounded-lg p-4 mb-6 transition-all duration-300 ${isDarkMode
            ? "bg-red-950/50 border-red-800/60 text-red-300"
            : "bg-red-100/80 border-red-300 text-red-700"
            }`}>
            <p className="text-sm sm:text-base break-words font-medium">Error: {error}</p>
            <button
              onClick={() => setError(null)}
              className={`mt-2 text-sm hover:underline font-medium ${isDarkMode ? "text-red-300" : "text-red-600"
                }`}
            >
              Dismiss
            </button>
          </div>
        )}

        {!loading && (
          <>
            {/* Navigation Tabs - Desktop */}
            <div className={`hidden md:block backdrop-blur-md rounded-2xl shadow-lg mb-6 border transition-all duration-300 ${cardClass}`}>
              <div className={`flex border-b ${isDarkMode ? "border-gray-700/50" : "border-gray-300/20"}`}>
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`flex-1 px-4 py-3 font-medium transition-colors ${activeTab === tab.id
                      ? isDarkMode
                        ? "border-b-2 border-slate-400 text-slate-300"
                        : "border-b-2 border-slate-600 text-slate-700"
                      : isDarkMode
                        ? "text-gray-400 hover:text-slate-400"
                        : "text-gray-600 hover:text-slate-600"
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Navigation Tabs - Mobile */}
            <div className={`md:hidden backdrop-blur-md rounded-2xl shadow-lg mb-4 border transition-all duration-300 ${cardClass}`}>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={`w-full flex items-center justify-between p-4 ${textPrimaryClass}`}
              >
                <span className="font-medium capitalize">
                  {tabs.find(t => t.id === activeTab)?.label}
                </span>
                {mobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>

              {mobileMenuOpen && (
                <div className={`border-t ${isDarkMode ? "border-gray-700/50" : "border-gray-300/20"}`}>
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id)}
                      className={`w-full text-left px-4 py-3 transition-colors ${activeTab === tab.id
                        ? isDarkMode
                          ? "bg-slate-700/40 text-slate-300 font-medium"
                          : "bg-slate-500/20 text-slate-700 font-medium"
                        : isDarkMode
                          ? "text-gray-400 hover:bg-gray-800/40"
                          : "text-gray-600 hover:bg-white/30"
                        }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Content */}
            <div className={`backdrop-blur-md rounded-2xl shadow-lg p-4 md:p-6 border transition-all duration-300 ${cardClass}`}>
              {activeTab === "dashboard" && (
                <Dashboard
                  items={items}
                  isDarkMode={isDarkMode}
                  calculateItemProgress={calculateItemProgress}
                  loading={loading}
                  apiService={apiService}
                />
              )}

              {activeTab === "add-items" && (
                <AddItems
                  items={items}
                  submitting={submitting}
                  apiService={apiService}
                  isDarkMode={isDarkMode}
                />
              )}

              {activeTab === "checklist" && (
                <Checklist
                  items={items}
                  setItems={setItems}
                  formatTime={formatTime}
                  formatActionDuration={formatActionDuration}
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
                  isDarkMode={isDarkMode}
                />
              )}

              {activeTab === "comparison" && (
                <ItemComparison
                  items={items}
                  isDarkMode={isDarkMode}
                  apiService={apiService}
                  formatTime={formatTime}
                  calculateItemProgress={calculateItemProgress}
                />
              )}

              {activeTab === "reports" && (
                <Reports
                  items={items}
                  isDarkMode={isDarkMode}
                  calculateItemProgress={calculateItemProgress}
                  calculatePhaseProgress={calculatePhaseProgress}
                  getItemElapsedTime={getItemElapsedTime}
                  formatTime={formatTime}
                  formatActionDuration={formatActionDuration}
                  getPhaseElapsedTime={getPhaseElapsedTime}
                  apiService={apiService}
                />
              )}
            </div>
          </>
        )}
      </div>
      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-40 w-14 h-14 bg-zinc-900 hover:bg-zinc-800 text-white rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
          aria-label="Scroll to top"
        >
          <ArrowUp className="w-6 h-6" />
        </button>
      )}
    </div>
  )
}

export default OperationsDepartment