import { useAuth } from "../../contexts/AuthContext"
import { useState, useEffect, useRef, lazy } from "react"
import apiService from "../../utils/api/api-service"
import Dashboard from "../op/Dashboard.jsx"
import AddItems from "../op/AddItem.jsx"
import Checklist from "../op/CheckList.jsx"
import Reports from "../op/Report.jsx"
import ItemComparison from "../op/ItemComparison.jsx"
import { pollingManager } from "../../utils/api/websocket/polling-manager.jsx"
import {
  EditItemModal,
  EditPhaseModal,
  EditSubphaseModal,
  AddPhaseModal,
  AddSubphaseModal,
  BulkEditModal
} from "../op/EditItems.jsx"
const GearLoadingSpinner = lazy(() => import("../../../public/LoadingGear.jsx"))
import { Menu, X, ArrowUp, RefreshCw } from 'lucide-react'

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
  const [initialLoadComplete, setInitialLoadComplete] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0, message: '' })

  // UI states
  const [expandedItems, setExpandedItems] = useState({})
  const [expandedPhases, setExpandedPhases] = useState({})
  const [submitting, setSubmitting] = useState(false)

  // Ref to track if component is mounted
  const isMountedRef = useRef(true)
  const refreshIntervalRef = useRef(null)

  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdateCheck, setLastUpdateCheck] = useState(null)
  const pollIntervalRef = useRef(null)

  // WebSocket Polling for new items added via Google Sheets
  const pollingSubscriptionsRef = useRef([])

  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: 20,
    total_items: 0,
    total_pages: 0,
    has_next: false,
    has_previous: false
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)

  const [showEditItemModal, setShowEditItemModal] = useState(false)
  const [showEditPhaseModal, setShowEditPhaseModal] = useState(false)
  const [showEditSubphaseModal, setShowEditSubphaseModal] = useState(false)
  const [showAddPhaseModal, setShowAddPhaseModal] = useState(false)
  const [showAddSubphaseModal, setShowAddSubphaseModal] = useState(false)
  const [showBulkEditModal, setShowBulkEditModal] = useState(false)

  const [selectedItemForEdit, setSelectedItemForEdit] = useState(null)
  const [selectedPhaseForEdit, setSelectedPhaseForEdit] = useState(null)
  const [selectedSubphaseForEdit, setSelectedSubphaseForEdit] = useState(null)
  const [selectedItemsForBulk, setSelectedItemsForBulk] = useState([])
  const [clients, setClients] = useState([])

  useEffect(() => {
  const needsPolling = activeTab === "dashboard" || activeTab === "reports" || activeTab === "checklist"

  if (!needsPolling) {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
      console.log('⏸️ Polling stopped - not on relevant tab')
    }
    return
  }

  // ✅ FIXED: Simplified polling that just checks item count
  const startPolling = () => {
    pollIntervalRef.current = setInterval(async () => {
      try {
        console.log('🔄 Polling for new items...')

        const currentCount = items.length
        const currentPage = pagination.current_page || 1

        // Fetch fresh data from the current page
        const freshResponse = await apiService.operations.getItemsPaginated(
          currentPage,
          pagination.per_page || 20,
          { _t: Date.now() } // Cache buster
        )

        if (freshResponse && freshResponse.items) {
          const freshCount = freshResponse.pagination.total_items || freshResponse.items.length

          // Check if total items increased
          if (freshCount > pagination.total_items) {
            const newCount = freshCount - pagination.total_items
            console.log(`✅ Found ${newCount} new item(s)!`)

            showNotification(`${newCount} new item(s) added!`, 'success')

            // Reload all data to get the new items
            await loadData(currentPage, pagination.per_page)
          } else {
            console.log('✅ No new items detected')
          }
        }

        setLastUpdateCheck(new Date())
      } catch (error) {
        console.warn('⚠️ Polling check failed:', error.message)
        // Don't show error to user, just log it
      }
    }, 30000) // Poll every 30 seconds
  }

  // ✅ Only poll when tab is visible
  const handleVisibilityChange = () => {
    if (document.hidden) {
      console.log('⏸️ Tab hidden - stopping polling')
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    } else {
      console.log('▶️ Tab visible - starting polling')
      if (!pollIntervalRef.current) {
        startPolling()
      }
    }
  }

  // Start polling if tab is visible
  if (!document.hidden) {
    startPolling()
  }

  // Listen for visibility changes
  document.addEventListener('visibilitychange', handleVisibilityChange)

  return () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  }
}, [activeTab, pagination.current_page, pagination.per_page, pagination.total_items])

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
    if (items.length > 0 && !initialLoadComplete) {
      const needsDetails = activeTab === "dashboard" || activeTab === "reports" || activeTab === "checklist"

      if (needsDetails) {
        const hasItemsWithoutDetails = items.some(item =>
          !item.phases || !Array.isArray(item.phases) ||
          (item.phase_count > 0 && item.phases.length === 0)
        )

        if (hasItemsWithoutDetails) {
          loadAllItemDetails()
        } else {
          setInitialLoadComplete(true)
        }
      }
    }
  }, [activeTab, items.length, initialLoadComplete])

  useEffect(() => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current)
      refreshIntervalRef.current = null
    }

    const needsRefresh = activeTab === "dashboard" || activeTab === "reports" || activeTab === "checklist"

    if (needsRefresh && items.length > 0) {
      const hasActivePhases = items.some(item =>
        item && Array.isArray(item.phases) && item.phases.some(phase =>
          phase && phase.start_time && !phase.end_time
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

  const loadClients = async () => {
  try {
    const clientList = await apiService.operations.getClients()
    setClients(Array.isArray(clientList) ? clientList : [])
  } catch (error) {
    console.error("Error loading clients:", error)
    setClients([])
  }
}

useEffect(() => {
  loadData()
  loadClients() // ADD THIS LINE

  // Setup polling subscriptions
  setupPollingListeners()

  return () => {
    // Cleanup polling subscriptions
    pollingSubscriptionsRef.current.forEach(unsubscribe => unsubscribe())
    pollingSubscriptionsRef.current = []
  }
}, [])

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      // Request permission silently
      Notification.requestPermission().then(permission => {
        console.log('Notification permission:', permission)
      })
    }
  }, [])

  const setupPollingListeners = () => {
    console.log('📡 Setting up Operations polling listeners...')

    // Subscribe to all operations refresh events
    const unsubRefresh = pollingManager.subscribeToUpdates('operations:refresh', (event) => {
      console.log('🔄 Operations refresh event:', event.type)
      handleOperationsRefresh(event)
    })

    // Subscribe to specific item events
    const unsubItemCreated = pollingManager.subscribeToUpdates('operations:item_created', (data) => {
      console.log('✨ New item created:', data.part_number)
      showNotification(`New item created: ${data.part_number}`)
      loadData() // Reload all data
    })

    const unsubItemUpdated = pollingManager.subscribeToUpdates('operations:item_updated', (data) => {
      console.log('🔄 Item updated:', data.part_number)
      loadItemDetails(data.part_number) // Reload specific item
    })

    const unsubItemDeleted = pollingManager.subscribeToUpdates('operations:item_deleted', (data) => {
      console.log('🗑️ Item deleted:', data.part_number)
      showNotification(`Item deleted: ${data.part_number}`)
      loadData() // Reload all data
    })

    const unsubGoogleSheets = pollingManager.subscribeToUpdates('operations:google_sheets_import', (data) => {
      console.log('📊 Google Sheets import:', data.part_number)
      showNotification(`New item imported: ${data.part_number}`)
      loadData() // Reload all data
    })

    // Store unsubscribe functions
    pollingSubscriptionsRef.current = [
      unsubRefresh,
      unsubItemCreated,
      unsubItemUpdated,
      unsubItemDeleted,
      unsubGoogleSheets
    ]

    // Join operations room
    pollingManager.joinRoom('operations')
  }

  // ADD: Handle operations refresh events
  const handleOperationsRefresh = async (event) => {
    const { type, data } = event

    switch (type) {
      case 'item_created':
      case 'item_deleted':
      case 'google_sheets_import':
        // Full reload for these events
        await loadData()
        break

      case 'item_updated':
      case 'phase_created':
      case 'phase_updated':
      case 'phase_status':
      case 'subphase_completed':
      case 'employee_assigned':
        // Reload specific item
        if (data.part_number) {
          await loadItemDetails(data.part_number)
        }
        break

      default:
        console.log('Unknown refresh type:', type)
    }
  }

  const refreshActiveData = async () => {
    try {
      console.log('Refreshing active data...')

      const activeItems = items.filter(item =>
        item && Array.isArray(item.phases) && item.phases.some(phase =>
          phase && phase.start_time && !phase.end_time
        )
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

  const loadData = async (page = 1, limit = 20) => {
    try {
      setLoading(true)
      setError(null)

      console.log(`📥 Loading items page ${page} with limit ${limit}...`)

      // Load items with pagination
      const [itemsResponse, statsResponse] = await Promise.all([
        apiService.operations.getItemsPaginated(page, limit).catch(err => {
          console.error('Failed to load items:', err)
          return { items: [], pagination: {} }
        }),
        apiService.operations.getStatistics().catch(err => {
          console.error('Failed to load statistics:', err)
          return null
        })
      ])

      // Handle paginated response
      const itemsArray = itemsResponse.items || []
      const paginationInfo = itemsResponse.pagination || {
        current_page: 1,
        per_page: limit,
        total_items: itemsArray.length,
        total_pages: 1,
        has_next: false,
        has_previous: false
      }

      console.log(`✅ Loaded ${itemsArray.length} items from page ${page}`)
      console.log(`📊 Pagination:`, paginationInfo)

      setItems(itemsArray)
      setPagination(paginationInfo)
      setCurrentPage(page)
      setStatistics(statsResponse)

    } catch (err) {
      console.error('❌ Failed to load operations data:', err)
      setError(`Failed to load data: ${err.message}`)
      setItems([])
    } finally {
      setLoading(false)
    }
  }


  const handleManualRefresh = async () => {
  try {
    setIsRefreshing(true)
    setError(null)

    console.log('🔄 Manual refresh triggered...')

    showNotification('Refreshing data...', 'info')

    // Reload data from current page with cache buster
    await loadData(pagination.current_page || 1, pagination.per_page || 20)

    setLastUpdateCheck(new Date())

    showNotification('✅ Data refreshed successfully!', 'success')
  } catch (error) {
    console.error('❌ Failed to refresh:', error)
    setError(`Failed to refresh: ${error.message}`)
    showNotification('❌ Failed to refresh data', 'error')
  } finally {
    setIsRefreshing(false)
  }
}

  const showNotification = (message, type = 'info') => {
  console.log('📢 Notification:', message)

  // Show browser notification if permitted
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Operations Update', {
      body: message,
      icon: '/icons/icon-192.jpg',
      tag: 'operations-update',
      badge: '/icons/icon-192.jpg'
    })
  }

  // Visual feedback emoji
  const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : '📢'
  console.log(`${emoji} ${message}`)

  // ✅ OPTIONAL: If you have a toast library, use it here
  // Example with react-hot-toast:
  // if (type === 'success') toast.success(message)
  // else if (type === 'error') toast.error(message)
  // else toast(message)

  return message
}

  const loadAllItemDetails = async () => {
    // Only load details for items that are currently displayed
    // This prevents loading all items at once
    const needsDetails = activeTab === "dashboard" || activeTab === "reports" || activeTab === "checklist"

    if (!needsDetails || items.length === 0) {
      console.log('[LoadDetails] Skipping - not needed or no items')
      return
    }

    // Filter items that actually need details loaded
    const itemsNeedingDetails = items.filter(item =>
      !item.phases || !Array.isArray(item.phases) ||
      (item.phase_count > 0 && item.phases.length === 0)
    )

    if (itemsNeedingDetails.length === 0) {
      setInitialLoadComplete(true)
      return
    }

    try {
      console.log(`[LoadDetails] Loading details for ${itemsNeedingDetails.length} items`)
      setLoadingProgress({
        current: 0,
        total: itemsNeedingDetails.length,
        message: 'Starting to load item details...'
      })

      // Process in smaller batches
      const batchSize = 3 // Reduced batch size
      const batches = []

      for (let i = 0; i < itemsNeedingDetails.length; i += batchSize) {
        batches.push(itemsNeedingDetails.slice(i, i + batchSize))
      }

      const allItemsWithDetails = []
      const failedItems = []

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex]

        console.log(`[Batch ${batchIndex + 1}/${batches.length}] Processing ${batch.length} items`)

        setLoadingProgress({
          current: allItemsWithDetails.length,
          total: itemsNeedingDetails.length,
          message: `Loading batch ${batchIndex + 1} of ${batches.length}...`
        })

        const batchResults = await Promise.allSettled(
          batch.map(item => loadItemWithRetry(item.part_number, 2)) // Reduced retries
        )

        batchResults.forEach((result, index) => {
          const item = batch[index]

          if (result.status === 'fulfilled' && result.value) {
            allItemsWithDetails.push(result.value)
            console.log(`[Success] ${item.part_number} loaded`)
          } else {
            console.warn(`[Failed] ${item.part_number}:`, result.reason?.message)

            allItemsWithDetails.push({
              ...item,
              _loadError: true,
              _errorMessage: result.reason?.message || 'Failed to load details'
            })

            failedItems.push({
              part_number: item.part_number,
              error: result.reason?.message
            })
          }
        })

        // Update items incrementally
        if (isMountedRef.current && allItemsWithDetails.length > 0) {
          setItems(prevItems => {
            const updatedItems = [...prevItems]
            allItemsWithDetails.forEach(detailedItem => {
              const index = updatedItems.findIndex(i => i.part_number === detailedItem.part_number)
              if (index !== -1) {
                updatedItems[index] = detailedItem
              }
            })
            return updatedItems
          })
        }

        setLoadingProgress({
          current: allItemsWithDetails.length,
          total: itemsNeedingDetails.length,
          message: `Loaded ${allItemsWithDetails.length} of ${itemsNeedingDetails.length} items...`
        })

        // Wait between batches
        if (batchIndex < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }

      console.log(`[LoadDetails] Complete: ${allItemsWithDetails.length} items loaded`)

      if (failedItems.length > 0) {
        console.warn(`[LoadDetails] ${failedItems.length} items failed to load details:`, failedItems)
        setError(`Loaded ${allItemsWithDetails.length - failedItems.length} of ${itemsNeedingDetails.length} items. ${failedItems.length} items have limited details.`)
      }

      if (isMountedRef.current) {
        setLoadingProgress({
          current: allItemsWithDetails.length,
          total: itemsNeedingDetails.length,
          message: failedItems.length > 0
            ? `Complete with ${failedItems.length} warnings`
            : 'Complete! Preparing dashboard...'
        })

        setTimeout(() => {
          setInitialLoadComplete(true)
        }, 300)
      }
    } catch (err) {
      console.error('[LoadDetails] Critical error:', err)
      setError('Failed to load item details: ' + err.message)
      setInitialLoadComplete(true)
    }
  }

  const loadItemWithRetry = async (partNumber, maxRetries = 3) => {
    let lastError

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Attempt ${attempt}/${maxRetries}] Loading ${partNumber}`)
        const result = await apiService.operations.getItem(partNumber)
        console.log(`[Success] Loaded ${partNumber}`)
        return result
      } catch (error) {
        lastError = error
        console.warn(`[Attempt ${attempt}/${maxRetries}] Failed for ${partNumber}:`, error.message)

        // If it's a 404 or item not found, don't retry
        if (error.message && (error.message.includes('404') || error.message.includes('not found'))) {
          console.log(`[Skip] Item ${partNumber} not found, skipping retries`)
          throw error
        }

        // Only retry if we haven't exhausted attempts
        if (attempt < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, attempt - 1) * 1000
          console.log(`[Wait] Retrying ${partNumber} in ${delay}ms...`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    console.error(`[Failed] All retries exhausted for ${partNumber}`)
    throw lastError
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
    if (!phase || !Array.isArray(phase.subphases) || phase.subphases.length === 0) return 0

    const completed = phase.subphases.filter(sp => sp.completed == 1).length
    return Math.round((completed / phase.subphases.length) * 100)
  }

  const calculateItemProgress = (item) => {
    // First check if API already provided overall_progress
    if (item && item.overall_progress !== undefined && item.overall_progress !== null) {
      return Math.round(parseFloat(item.overall_progress))
    }

    // Fallback: calculate from phases if available
    if (!item || !Array.isArray(item.phases) || item.phases.length === 0) return 0

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
    if (!initialLoadComplete && (tab === "checklist" || tab === "dashboard" || tab === "reports")) {
      alert("Please wait for all items to finish loading...")
      return
    }
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

// Edit Item Handler
const handleEditItem = async (itemData) => {
  try {
    setItems(prevItems =>
      prevItems.map(item =>
        item.part_number === selectedItemForEdit.part_number
          ? { ...item, ...itemData }
          : item
      )
    )
    setShowEditItemModal(false)
    setSelectedItemForEdit(null)
    await apiService.operations.updateItem(selectedItemForEdit.part_number, itemData)
  } catch (error) {
    console.error("Error updating item:", error)
    alert("Failed to update item: " + error.message)
    await loadData()
  }
}

// Edit Phase Handler
const handleEditPhase = async (phaseData) => {
  try {
    setItems(prevItems =>
      prevItems.map(item => {
        if (item.phases) {
          return {
            ...item,
            phases: item.phases.map(phase =>
              phase.id === selectedPhaseForEdit.id
                ? { ...phase, ...phaseData }
                : phase
            )
          }
        }
        return item
      })
    )
    setShowEditPhaseModal(false)
    setSelectedPhaseForEdit(null)
    await apiService.operations.updatePhase(selectedPhaseForEdit.id, phaseData)
  } catch (error) {
    console.error("Error updating phase:", error)
    alert("Failed to update phase: " + error.message)
    await loadData()
  }
}

// Delete Phase Handler
const handleDeletePhase = async () => {
  try {
    const phaseId = selectedPhaseForEdit.id
    setItems(prevItems =>
      prevItems.map(item => {
        if (item.phases) {
          return {
            ...item,
            phases: item.phases.filter(phase => phase.id !== phaseId)
          }
        }
        return item
      })
    )
    setShowEditPhaseModal(false)
    setSelectedPhaseForEdit(null)
    await apiService.operations.deletePhase(phaseId)
  } catch (error) {
    console.error("Error deleting phase:", error)
    alert("Failed to delete phase: " + error.message)
    await loadData()
  }
}

// Edit Subphase Handler
const handleEditSubphase = async (subphaseData) => {
  try {
    setItems(prevItems =>
      prevItems.map(item => {
        if (item.phases) {
          return {
            ...item,
            phases: item.phases.map(phase => {
              if (phase.subphases) {
                return {
                  ...phase,
                  subphases: phase.subphases.map(subphase =>
                    subphase.id === selectedSubphaseForEdit.id
                      ? { ...subphase, ...subphaseData }
                      : subphase
                  )
                }
              }
              return phase
            })
          }
        }
        return item
      })
    )
    setShowEditSubphaseModal(false)
    setSelectedSubphaseForEdit(null)
    await apiService.operations.updateSubphase(selectedSubphaseForEdit.id, subphaseData)
  } catch (error) {
    console.error("Error updating subphase:", error)
    alert("Failed to update subphase: " + error.message)
    await loadData()
  }
}

// Delete Subphase Handler
const handleDeleteSubphase = async () => {
  try {
    const subphaseId = selectedSubphaseForEdit.id
    setItems(prevItems =>
      prevItems.map(item => {
        if (item.phases) {
          return {
            ...item,
            phases: item.phases.map(phase => {
              if (phase.subphases) {
                return {
                  ...phase,
                  subphases: phase.subphases.filter(subphase => subphase.id !== subphaseId)
                }
              }
              return phase
            })
          }
        }
        return item
      })
    )
    setShowEditSubphaseModal(false)
    setSelectedSubphaseForEdit(null)
    await apiService.operations.deleteSubphase(subphaseId)
  } catch (error) {
    console.error("Error deleting subphase:", error)
    alert("Failed to delete subphase: " + error.message)
    await loadData()
  }
}

// Add Phase Handler
const handleAddPhase = async (phaseData) => {
  try {
    const partNumber = selectedItemForEdit.part_number
    const tempPhase = {
      id: Date.now(),
      name: phaseData.name,
      phase_order: phaseData.phase_order,
      subphases: []
    }
    setItems(prevItems =>
      prevItems.map(item =>
        item.part_number === partNumber
          ? { ...item, phases: [...(item.phases || []), tempPhase] }
          : item
      )
    )
    setShowAddPhaseModal(false)
    setSelectedItemForEdit(null)
    const response = await apiService.operations.createPhase({
      part_number: partNumber,
      name: phaseData.name,
      phase_order: phaseData.phase_order
    })
    if (response && response.id) {
      setItems(prevItems =>
        prevItems.map(item =>
          item.part_number === partNumber
            ? {
              ...item,
              phases: item.phases.map(phase =>
                phase.id === tempPhase.id ? { ...phase, id: response.id } : phase
              )
            }
            : item
        )
      )
    }
  } catch (error) {
    console.error("Error adding phase:", error)
    alert("Failed to add phase: " + error.message)
    await loadData()
  }
}

// Add Subphase Handler
const handleAddSubphase = async (subphaseData) => {
  try {
    const partNumber = selectedItemForEdit.part_number
    const phaseId = selectedPhaseForEdit.id
    const tempSubphase = {
      id: Date.now(),
      name: subphaseData.name,
      expected_duration: parseFloat(subphaseData.expected_duration) || 0,
      expected_quantity: parseInt(subphaseData.expected_quantity) || 0,
      subphase_order: parseInt(subphaseData.subphase_order) || 0,
      completed: 0,
      current_completed_quantity: 0
    }
    setItems(prevItems =>
      prevItems.map(item =>
        item.part_number === partNumber
          ? {
            ...item,
            phases: item.phases.map(phase =>
              phase.id === phaseId
                ? { ...phase, subphases: [...(phase.subphases || []), tempSubphase] }
                : phase
            )
          }
          : item
      )
    )
    setShowAddSubphaseModal(false)
    setSelectedPhaseForEdit(null)
    setSelectedItemForEdit(null)
    const response = await apiService.operations.createSubphase({
      part_number: partNumber,
      phase_id: phaseId,
      name: subphaseData.name,
      expected_duration: parseFloat(subphaseData.expected_duration) || 0,
      expected_quantity: parseInt(subphaseData.expected_quantity) || 0,
      subphase_order: parseInt(subphaseData.subphase_order) || 0
    })
    if (response && response.id) {
      setItems(prevItems =>
        prevItems.map(item =>
          item.part_number === partNumber
            ? {
              ...item,
              phases: item.phases.map(phase =>
                phase.id === phaseId
                  ? {
                    ...phase,
                    subphases: phase.subphases.map(subphase =>
                      subphase.id === tempSubphase.id
                        ? { ...subphase, id: response.id }
                        : subphase
                    )
                  }
                  : phase
              )
            }
            : item
        )
      )
    }
  } catch (error) {
    console.error("Error adding subphase:", error)
    alert("Failed to add subphase: " + error.message)
    await loadData()
  }
}

// Bulk Edit Handler
const handleBulkEdit = async (updates, itemCheckboxes) => {
  try {
    const itemsToUpdate = Object.keys(itemCheckboxes)
      .filter(partNumber => itemCheckboxes[partNumber])
      .map(partNumber => items.find(item => item.part_number === partNumber))
      .filter(Boolean)

    setItems(prevItems =>
      prevItems.map(item => {
        if (itemCheckboxes[item.part_number]) {
          const updateData = { ...updates }
          if (updates.remarks && item.remarks) {
            updateData.remarks = `${item.remarks}\n${updates.remarks}`
          }
          return { ...item, ...updateData }
        }
        return item
      })
    )
    setShowBulkEditModal(false)

    for (const item of itemsToUpdate) {
      const updateData = { ...updates }
      if (updates.remarks && item.remarks) {
        updateData.remarks = `${item.remarks}\n${updates.remarks}`
      }
      await apiService.operations.updateItem(item.part_number, updateData)
    }
  } catch (error) {
    console.error("Error in bulk edit:", error)
    alert("Failed to update items: " + error.message)
    await loadData()
  }
}

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
              {/* ✅ NEW: Refresh button */}
              <button
                onClick={handleManualRefresh}
                disabled={isRefreshing || loading}
                className={`p-2 rounded-lg backdrop-blur-sm border transition-all duration-300 ${isDarkMode
                  ? "bg-gray-800/60 border-gray-700/50 hover:bg-gray-800/80 text-cyan-400"
                  : "bg-white/20 border-white/30 hover:bg-white/30 text-blue-700"
                  } ${(isRefreshing || loading) ? 'opacity-50 cursor-not-allowed' : ''}`}
                aria-label="Refresh data"
                title={lastUpdateCheck ? `Last checked: ${lastUpdateCheck.toLocaleTimeString()}` : 'Refresh data'}
              >
                <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>

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

            {lastUpdateCheck && (
              <p className={`text-xs mt-1 ${textSecondaryClass}`}>
                Last updated: {lastUpdateCheck.toLocaleTimeString()}
              </p>
            )}

          </div>
        </div>

        {/* Custom Gear Loading State - Show while initial data loads */}
        {loading && (
          <GearLoadingSpinner isDarkMode={isDarkMode} />
        )}

        {/* Loading Progress for Item Details - Show after initial load */}
        {!loading && !initialLoadComplete && loadingProgress.total > 0 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/30">
            <div className={`max-w-md w-full mx-4 backdrop-blur-md rounded-2xl p-8 border shadow-2xl transition-all duration-300 ${isDarkMode
              ? "bg-gray-800/90 border-gray-700/50"
              : "bg-white/90 border-white/50"
              }`}>
              {/* Gear Animation */}
              <div className="flex justify-center mb-6">
                <div className="relative flex items-center justify-center">
                  {/* Left Small Gear */}
                  <div className="absolute -left-6 bottom-2">
                    <svg
                      className="w-12 h-12 animate-spin"
                      style={{ animationDuration: '2s' }}
                      viewBox="0 0 120 120"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <g transform="translate(60, 60)">
                        {[...Array(8)].map((_, i) => {
                          const angle = (i * 360) / 8;
                          return (
                            <rect
                              key={i}
                              x="-6"
                              y="-40"
                              width="12"
                              height="15"
                              fill={isDarkMode ? "#64748B" : "#546E7A"}
                              transform={`rotate(${angle})`}
                            />
                          );
                        })}
                        <circle cx="0" cy="0" r="32" fill={isDarkMode ? "#64748B" : "#546E7A"} />
                        <circle cx="0" cy="0" r="20" fill="none" stroke={isDarkMode ? "#38BDF8" : "#7DD3C0"} strokeWidth="3" />
                        <circle cx="0" cy="0" r="20" fill={isDarkMode ? "#1E293B" : "#F3F4F6"} />
                      </g>
                    </svg>
                  </div>

                  {/* Center Large Gear */}
                  <div className="z-10">
                    <svg
                      className="w-28 h-28 animate-spin"
                      style={{ animationDuration: '3s', animationDirection: 'reverse' }}
                      viewBox="0 0 140 140"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <g transform="translate(70, 70)">
                        {[...Array(12)].map((_, i) => {
                          const angle = (i * 360) / 12;
                          return (
                            <rect
                              key={i}
                              x="-8"
                              y="-55"
                              width="16"
                              height="20"
                              fill="#546E7A"
                              transform={`rotate(${angle})`}
                            />
                          );
                        })}
                        <circle cx="0" cy="0" r="45" fill={isDarkMode ? "#64748B" : "#546E7A"} />
                        <circle cx="0" cy="0" r="28" fill="none" stroke={isDarkMode ? "#38BDF8" : "#7DD3C0"} strokeWidth="4" />
                        <circle cx="0" cy="0" r="28" fill={isDarkMode ? "#1E293B" : "#F3F4F6"} />
                      </g>
                    </svg>
                  </div>

                  {/* Right Small Gear */}
                  <div className="absolute -right-6 bottom-2">
                    <svg
                      className="w-12 h-12 animate-spin"
                      style={{ animationDuration: '2s' }}
                      viewBox="0 0 120 120"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <g transform="translate(60, 60)">
                        {[...Array(8)].map((_, i) => {
                          const angle = (i * 360) / 8;
                          return (
                            <rect
                              key={i}
                              x="-6"
                              y="-40"
                              width="12"
                              height="15"
                              fill={isDarkMode ? "#64748B" : "#546E7A"}
                              transform={`rotate(${angle})`}
                            />
                          );
                        })}
                        <circle cx="0" cy="0" r="32" fill={isDarkMode ? "#64748B" : "#546E7A"} />
                        <circle cx="0" cy="0" r="20" fill="none" stroke={isDarkMode ? "#38BDF8" : "#7DD3C0"} strokeWidth="3" />
                        <circle cx="0" cy="0" r="20" fill={isDarkMode ? "#1E293B" : "#F3F4F6"} />
                      </g>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Loading Text */}
              <h3 className={`text-xl font-bold text-center mb-3 ${textPrimaryClass}`}>
                Loading Item Details
              </h3>

              <p className={`text-center mb-4 ${textSecondaryClass}`}>
                {loadingProgress.message || `Processing ${loadingProgress.current} of ${loadingProgress.total} items...`}
              </p>

              {/* Progress Bar */}
              <div className={`w-full rounded-full h-3 mb-2 ${isDarkMode ? "bg-gray-700" : "bg-gray-300"}`}>
                <div
                  className="bg-gradient-to-r from-blue-500 to-cyan-500 h-3 rounded-full transition-all duration-300 relative overflow-hidden"
                  style={{ width: `${(loadingProgress.current / loadingProgress.total) * 100}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                </div>
              </div>

              {/* Percentage */}
              <p className={`text-center text-sm font-mono ${textSecondaryClass}`}>
                {Math.round((loadingProgress.current / loadingProgress.total) * 100)}%
              </p>

              {/* Warning Message */}
              <div className={`mt-4 p-3 rounded-lg ${isDarkMode ? "bg-yellow-900/20 border border-yellow-700/50" : "bg-yellow-50 border border-yellow-300"
                }`}>
                <p className={`text-xs text-center ${isDarkMode ? "text-yellow-300" : "text-yellow-700"}`}>
                  ⏳ Please wait... Do not close or refresh the page
                </p>
              </div>
            </div>
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
                    disabled={!initialLoadComplete && (tab.id === "checklist" || tab.id === "dashboard" || tab.id === "reports")}
                    className={`flex-1 px-4 py-3 font-medium transition-colors ${activeTab === tab.id
                      ? isDarkMode
                        ? "border-b-2 border-slate-400 text-slate-300"
                        : "border-b-2 border-slate-600 text-slate-700"
                      : isDarkMode
                        ? "text-gray-400 hover:text-slate-400"
                        : "text-gray-600 hover:text-slate-600"
                      } ${!initialLoadComplete && (tab.id === "checklist" || tab.id === "dashboard" || tab.id === "reports")
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                      }`}
                  >
                    {tab.label}
                    {!initialLoadComplete && (tab.id === "checklist" || tab.id === "dashboard" || tab.id === "reports") && (
                      <span className="ml-2 text-xs">⏳</span>
                    )}
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
                      disabled={!initialLoadComplete && (tab.id === "checklist" || tab.id === "dashboard" || tab.id === "reports")}
                      className={`flex-1 px-4 py-3 font-medium transition-colors ${activeTab === tab.id
                        ? isDarkMode
                          ? "border-b-2 border-slate-400 text-slate-300"
                          : "border-b-2 border-slate-600 text-slate-700"
                        : isDarkMode
                          ? "text-gray-400 hover:text-slate-400"
                          : "text-gray-600 hover:text-slate-600"
                        } ${!initialLoadComplete && (tab.id === "checklist" || tab.id === "dashboard" || tab.id === "reports")
                          ? "opacity-50 cursor-not-allowed"
                          : ""
                        }`}
                    >
                      {tab.label}
                      {!initialLoadComplete && (tab.id === "checklist" || tab.id === "dashboard" || tab.id === "reports") && (
                        <span className="ml-2 text-xs">⏳</span>
                      )}
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
                  formatTime={formatTime}
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
    // ADD THESE NEW PROPS:
    setShowEditItemModal={setShowEditItemModal}
    setShowEditPhaseModal={setShowEditPhaseModal}
    setShowEditSubphaseModal={setShowEditSubphaseModal}
    setShowAddPhaseModal={setShowAddPhaseModal}
    setShowAddSubphaseModal={setShowAddSubphaseModal}
    setShowBulkEditModal={setShowBulkEditModal}
    setSelectedItemForEdit={setSelectedItemForEdit}
    setSelectedPhaseForEdit={setSelectedPhaseForEdit}
    setSelectedSubphaseForEdit={setSelectedSubphaseForEdit}
    setSelectedItemsForBulk={setSelectedItemsForBulk}
    clients={clients}
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

      {/* ADD ALL THESE MODALS HERE: */}
      
      {/* Edit Item Modal */}
      {showEditItemModal && selectedItemForEdit && (
        <EditItemModal
          item={selectedItemForEdit}
          clients={clients}
          isDarkMode={isDarkMode}
          onClose={() => {
            setShowEditItemModal(false)
            setSelectedItemForEdit(null)
          }}
          onSave={handleEditItem}
        />
      )}

      {/* Edit Phase Modal */}
      {showEditPhaseModal && selectedPhaseForEdit && (
        <EditPhaseModal
          phase={selectedPhaseForEdit}
          isDarkMode={isDarkMode}
          onClose={() => {
            setShowEditPhaseModal(false)
            setSelectedPhaseForEdit(null)
          }}
          onSave={handleEditPhase}
          onDelete={handleDeletePhase}
        />
      )}

      {/* Edit Subphase Modal */}
      {showEditSubphaseModal && selectedSubphaseForEdit && selectedItemForEdit && (
        <EditSubphaseModal
          subphase={selectedSubphaseForEdit}
          batchQty={selectedItemForEdit.qty}
          isDarkMode={isDarkMode}
          onClose={() => {
            setShowEditSubphaseModal(false)
            setSelectedSubphaseForEdit(null)
            setSelectedPhaseForEdit(null)
            setSelectedItemForEdit(null)
          }}
          onSave={handleEditSubphase}
          onDelete={handleDeleteSubphase}
        />
      )}

      {/* Add Phase Modal */}
      {showAddPhaseModal && selectedItemForEdit && (
        <AddPhaseModal
          item={selectedItemForEdit}
          isDarkMode={isDarkMode}
          onClose={() => {
            setShowAddPhaseModal(false)
            setSelectedItemForEdit(null)
          }}
          onSave={handleAddPhase}
        />
      )}

      {/* Add Subphase Modal */}
      {showAddSubphaseModal && selectedPhaseForEdit && selectedItemForEdit && (
        <AddSubphaseModal
          item={selectedItemForEdit}
          phase={selectedPhaseForEdit}
          batchQty={selectedItemForEdit.qty}
          isDarkMode={isDarkMode}
          onClose={() => {
            setShowAddSubphaseModal(false)
            setSelectedPhaseForEdit(null)
            setSelectedItemForEdit(null)
          }}
          onSave={handleAddSubphase}
        />
      )}

      {/* Bulk Edit Modal */}
      {showBulkEditModal && selectedItemsForBulk.length > 0 && (
        <BulkEditModal
          selectedItems={selectedItemsForBulk}
          clients={clients}
          isDarkMode={isDarkMode}
          onClose={() => {
            setShowBulkEditModal(false)
            setSelectedItemsForBulk([])
          }}
          onSave={handleBulkEdit}
        />
      )}
    </div>
  )
}

export default OperationsDepartment