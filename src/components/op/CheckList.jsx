import { useState, useEffect, useRef } from "react"
import {
  Clock,
  User,
  Play,
  CheckCircle,
  Flag,
  StopCircle,
  Calendar,
  RotateCcw,
  ArrowRightLeft,
  Search,
  Filter,
  Package,
  FileText,
  Pause,
  Edit2,
  Plus,
  Trash2,
} from "lucide-react"
import { useAuth } from "../../contexts/AuthContext"
import { pollingManager } from "../../utils/api/websocket/polling-manager.jsx"

function Checklist({
  items,
  setItems,
  expandedItems,
  expandedPhases,
  scanningFor,
  barcodeInput,
  setBarcodeInput,
  calculateItemProgress,
  calculatePhaseProgress,
  toggleItemExpansion,
  togglePhaseExpansion,
  handleBarcodeScan,
  submitBarcode,
  setScanningFor,
  apiService,
  formatTime,
  loadData,
  // ADD THESE NEW PROPS:
  setShowEditItemModal,
  setShowEditPhaseModal,
  setShowEditSubphaseModal,
  setShowAddPhaseModal,
  setShowAddSubphaseModal,
  setShowBulkEditModal,
  setSelectedItemForEdit,
  setSelectedPhaseForEdit,
  setSelectedSubphaseForEdit,
  setSelectedItemsForBulk,
  clients,
}) {
  const { isDarkMode } = useAuth()
  const pollingSubscriptionsRef = useRef([])
  const isMountedRef = useRef(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterClient, setFilterClient] = useState("")
  const [filterPriority, setFilterPriority] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [sortBy, setSortBy] = useState("name-asc")
  const [filterStatus, setFilterStatus] = useState("")
  const [transferModalOpen, setTransferModalOpen] = useState(false)
  const [selectedSubphase, setSelectedSubphase] = useState(null)
  const [selectedItem, setSelectedItem] = useState(null)
  const [selectedPhase, setSelectedPhase] = useState(null)
  const [newClient, setNewClient] = useState("")
  const [transferQuantity, setTransferQuantity] = useState("")
  const [transferRemarks, setTransferRemarks] = useState("")
  const [clientItems, setClientItems] = useState([])
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const [quantityModalOpen, setQuantityModalOpen] = useState(false)
  const [quantityModalData, setQuantityModalData] = useState(null)
  const [tempQuantity, setTempQuantity] = useState("")
  const [selectedTargetItem, setSelectedTargetItem] = useState(null)
  const [selectedTargetPhase, setSelectedTargetPhase] = useState(null)
  const [selectedTargetSubphase, setSelectedTargetSubphase] = useState(null)
  const [, forceUpdate] = useState(0)
  const [itemCheckboxes, setItemCheckboxes] = useState({})

  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [isFiltering, setIsFiltering] = useState(false)
  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: 20,
    total_items: 0,
    total_pages: 0,
    has_next: false,
    has_previous: false
  })


  // Optimistic update helpers - update local state without full reload
  const updateItemInState = (partNumber, updates) => {
    setItems((prevItems) => prevItems.map((item) => (item.part_number === partNumber ? { ...item, ...updates } : item)))
  }

  const updatePhaseInState = (partNumber, phaseId, updates) => {
    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.part_number === partNumber && item.phases) {
          return {
            ...item,
            phases: item.phases.map((phase) => (phase.id === phaseId ? { ...phase, ...updates } : phase)),
          }
        }
        return item
      }),
    )
  }

  const updateSubphaseInState = (partNumber, phaseId, subphaseId, updates) => {
    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.part_number === partNumber && item.phases) {
          return {
            ...item,
            phases: item.phases.map((phase) => {
              if (phase.id === phaseId && phase.subphases) {
                return {
                  ...phase,
                  subphases: phase.subphases.map((subphase) =>
                    subphase.id === subphaseId ? { ...subphase, ...updates } : subphase,
                  ),
                }
              }
              return phase
            }),
          }
        }
        return item
      }),
    )
  }

  useEffect(() => {
    isMountedRef.current = true

    // Setup polling listeners
    setupPollingListeners()

    return () => {
      isMountedRef.current = false
      // Cleanup polling subscriptions
      pollingSubscriptionsRef.current.forEach(unsubscribe => unsubscribe())
      pollingSubscriptionsRef.current = []
    }
  }, [])

  const setupPollingListeners = () => {
    console.log('📡 Setting up Checklist polling listeners...')

    // Subscribe to all operations refresh events
    const unsubRefresh = pollingManager.subscribeToUpdates('operations:refresh', (event) => {
      console.log('🔄 Checklist refresh event:', event.type)
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

      // Optimistically remove from UI
      if (isMountedRef.current) {
        setItems(prevItems => prevItems.filter(item => item.part_number !== data.part_number))
      }
    })

    const unsubPhaseUpdated = pollingManager.subscribeToUpdates('operations:phase_updated', (data) => {
      console.log('🔄 Phase updated:', data.phase_id)
      if (data.part_number) {
        loadItemDetails(data.part_number)
      }
    })

    const unsubSubphaseCompleted = pollingManager.subscribeToUpdates('operations:subphase_completed', (data) => {
      console.log('✅ Subphase completed:', data.subphase_id)
      if (data.part_number) {
        loadItemDetails(data.part_number)
      }
    })

    const unsubEmployeeAssigned = pollingManager.subscribeToUpdates('operations:employee_assigned', (data) => {
      console.log('👤 Employee assigned:', data.employee_barcode)
      if (data.part_number) {
        loadItemDetails(data.part_number)
      }
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
      unsubPhaseUpdated,
      unsubSubphaseCompleted,
      unsubEmployeeAssigned,
      unsubGoogleSheets
    ]

    // Join operations room
    pollingManager.joinRoom('operations')
  }

  // Auto-stop item when it reaches 100%
  useEffect(() => {
    items.forEach((item) => {
      // ADD SAFETY CHECK HERE
      if (!item || !item.phases) return;

      if (item.phases) {
        item.phases.forEach((phase) => {
          const phaseProgress = calculatePhaseProgress(phase)
          // Auto-stop phase when all subphases are complete
          if (phaseProgress === 100 && phase.start_time && !phase.end_time && !phase.pause_time) {
            // Use silent completion (no reload) and auto-start next phase
            handleStopPhase(item.part_number, phase.id)
          }
        })
      }
    })
  }, [items])

  useEffect(() => {
    const interval = setInterval(() => {
      const hasActivePhases = items.some((item) =>
        item.phases?.some(
          (phase) => phase.start_time && !phase.end_time && !phase.pause_time, // Only active, not paused
        ),
      )

      if (hasActivePhases) {
        forceUpdate((prev) => prev + 1) // Force component to re-render
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [items])

  // Auto-stop item when it reaches 100%
  useEffect(() => {
    items.forEach((item) => {
      if (item.phases) {
        item.phases.forEach((phase) => {
          const phaseProgress = calculatePhaseProgress(phase)
          // Auto-stop phase when all subphases are complete
          if (phaseProgress === 100 && phase.start_time && !phase.end_time && !phase.pause_time) {
            // Use silent completion (no reload)
            handleStopPhase(item.part_number, phase.id)
          }
        })
      }
    })
  }, [items])

  // Load items for selected client
  useEffect(() => {
    if (newClient.trim() && transferModalOpen) {
      const basePartNumber = getBasePartNumber(selectedItem?.part_number);
      const filtered = items.filter((item) => {
        const itemBasePartNumber = getBasePartNumber(item.part_number);
        return item.client_name === newClient.trim() && itemBasePartNumber === basePartNumber;
      });
      setClientItems(filtered)
    } else {
      setClientItems([])
    }
  }, [newClient, items, selectedItem, transferModalOpen])

  // Filter clients for dropdown
  useEffect(() => {
    if (!Array.isArray(clients)) {
      setShowClientDropdown(false)
      return
    }

    const searchValue = newClient.trim().toLowerCase()
    if (searchValue.length >= 1) {
      const matches = clients.filter(
        (client) => client.toLowerCase().includes(searchValue) && client !== selectedItem?.client_name,
      )
      setShowClientDropdown(matches.length > 0)
    } else {
      setShowClientDropdown(false)
    }
  }, [newClient, clients, selectedItem])

  const openQuantityModal = (item, phase, subphase) => {
    setQuantityModalData({ item, phase, subphase })
    setTempQuantity(subphase.current_completed_quantity || "")
    setQuantityModalOpen(true)
  }

  const handleUpdateCompletedQuantity = async () => {
    if (!quantityModalData) return

    try {
      const { item, phase, subphase } = quantityModalData
      const newQuantity = Number.parseInt(tempQuantity) || 0

      if (newQuantity > subphase.expected_quantity) {
        alert(`Cannot exceed expected quantity of ${subphase.expected_quantity}`)
        return
      }

      // Optimistic update
      updateSubphaseInState(item.part_number, phase.id, subphase.id, {
        current_completed_quantity: newQuantity,
      })

      // ADD THIS NEW CODE:
      // Auto-uncheck if quantity drops below expected
      if (subphase.completed == 1 && newQuantity < subphase.expected_quantity) {
        updateSubphaseInState(item.part_number, phase.id, subphase.id, {
          current_completed_quantity: newQuantity,
          completed: 0,
          completed_at: null,
        })
      }

      // Close modal immediately
      setQuantityModalOpen(false)
      setQuantityModalData(null)
      setTempQuantity("")

      // API call in background
      await apiService.operations.updateSubphaseCompletedQuantity(subphase.id, newQuantity)

      // ADD THIS NEW CODE:
      // If auto-unchecked, update via API
      if (subphase.completed == 1 && newQuantity < subphase.expected_quantity) {
        await apiService.operations.completeSubphaseWithDuration(subphase.id, false)
      }
    } catch (error) {
      console.error("Error updating completed quantity:", error)
      alert("Failed to update completed quantity: " + error.message)
      await loadData()
    }
  }

  const openTransferModal = (item, phase, subphase) => {
    setSelectedItem(item)
    setSelectedPhase(phase)
    setSelectedSubphase(subphase)
    setNewClient("")
    setTransferQuantity("")
    setTransferRemarks("")
    setSelectedTargetItem(null)
    setSelectedTargetPhase(null)
    setSelectedTargetSubphase(null)
    setTransferModalOpen(true)
    setClientItems([])
  }
  const handleTransferClient = async () => {
    if (!newClient.trim()) {
      alert("Please enter a client name")
      return
    }

    if (!selectedTargetItem) {
      alert("Please select a target item")
      return
    }

    if (!selectedTargetPhase) {
      alert("Please select a target phase")
      return
    }

    if (!selectedTargetSubphase) {
      alert("Please select a target subphase")
      return
    }

    const transferQty = Number.parseInt(transferQuantity)
    if (!transferQty || transferQty < 1) {
      alert("Please enter a valid transfer quantity")
      return
    }

    const currentQty = selectedSubphase.current_completed_quantity || 0
    if (transferQty > currentQty) {
      alert(`Transfer quantity (${transferQty}) cannot exceed current completed quantity (${currentQty})`)
      return
    }

    try {
      const timestamp = new Date().toLocaleString("en-PH", {
        timeZone: "Asia/Manila",
      })

      // Get full target item details
      const targetItem = await apiService.operations.getItem(selectedTargetItem.part_number)
      const targetPhase = targetItem.phases?.find((p) => p.id === Number.parseInt(selectedTargetPhase))
      const targetSubphase = targetPhase?.subphases?.find((s) => s.id === Number.parseInt(selectedTargetSubphase))

      if (!targetSubphase) {
        alert("Could not find target subphase")
        return
      }

      // Calculate new quantities
      const newSourceQty = currentQty - transferQty
      const targetCurrentQty = targetSubphase.current_completed_quantity || 0
      const newTargetQty = targetCurrentQty + transferQty

      // Optimistic update for source subphase quantity
      updateSubphaseInState(selectedItem.part_number, selectedPhase.id, selectedSubphase.id, {
        current_completed_quantity: newSourceQty,
      })

      // *** NEW CODE: Auto-uncheck if quantity drops below expected ***
      if (selectedSubphase.completed == 1 && newSourceQty < selectedSubphase.expected_quantity) {
        updateSubphaseInState(selectedItem.part_number, selectedPhase.id, selectedSubphase.id, {
          current_completed_quantity: newSourceQty,
          completed: 0,
          completed_at: null,
        })
      }

      // Optimistic update for target subphase quantity
      updateSubphaseInState(
        selectedTargetItem.part_number,
        Number.parseInt(selectedTargetPhase),
        Number.parseInt(selectedTargetSubphase),
        { current_completed_quantity: newTargetQty },
      )

      // Close modal immediately
      setTransferModalOpen(false)
      setSelectedItem(null)
      setSelectedPhase(null)
      setSelectedSubphase(null)
      setNewClient("")
      setTransferQuantity("")
      setTransferRemarks("")
      setSelectedTargetItem(null)
      setSelectedTargetPhase(null)
      setSelectedTargetSubphase(null)

      // Show success message
      alert(`Successfully transferred ${transferQty} units to ${targetPhase.name} > ${targetSubphase.name}!`)

      // API call to update source quantity
      await apiService.operations.updateSubphaseCompletedQuantity(selectedSubphase.id, newSourceQty)

      // *** NEW CODE: If subphase was marked complete and now quantity is insufficient, uncheck it ***
      if (selectedSubphase.completed == 1 && newSourceQty < selectedSubphase.expected_quantity) {
        await apiService.operations.completeSubphaseWithDuration(selectedSubphase.id, false)
      }

      // API call to update target quantity
      await apiService.operations.updateSubphaseCompletedQuantity(targetSubphase.id, newTargetQty)

      // Add remarks with transfer details
      const transferRemark = `[${timestamp}] Transferred OUT ${transferQty} units to ${newClient} (${selectedTargetItem.part_number}) - ${targetPhase.name} > ${targetSubphase.name} | From: ${selectedPhase.name} > ${selectedSubphase.name}: ${transferRemarks.trim() || "No remarks"}`
      const receiveRemark = `[${timestamp}] Received IN ${transferQty} units from ${selectedItem.client_name} (${selectedItem.part_number}) - ${selectedPhase.name} > ${selectedSubphase.name} | To: ${targetPhase.name} > ${targetSubphase.name}: ${transferRemarks.trim() || "No remarks"}`

      await apiService.operations.updateItem(selectedItem.part_number, {
        remarks: selectedItem.remarks ? `${selectedItem.remarks}\n${transferRemark}` : transferRemark,
      })

      await apiService.operations.updateItem(selectedTargetItem.part_number, {
        remarks: selectedTargetItem.remarks ? `${selectedTargetItem.remarks}\n${receiveRemark}` : receiveRemark,
      })

      // Reload data in background to sync all changes
      loadData()
    } catch (error) {
      console.error("Error transferring:", error)
      alert("Failed to transfer: " + error.message)
      await loadData() // Reload on error
    }
  }

  const handleOperationsRefresh = async (event) => {
    if (!isMountedRef.current) return

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

  const loadItemDetails = async (partNumber) => {
    if (!isMountedRef.current) return

    try {
      console.log('🔄 Loading details for item:', partNumber)
      const fullItem = await apiService.operations.getItem(partNumber)

      if (isMountedRef.current) {
        setItems(prevItems => {
          return prevItems.map(item =>
            item.part_number === partNumber ? fullItem : item
          )
        })
      }
    } catch (error) {
      console.error('❌ Failed to load item details:', error)
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

    // You can also integrate a toast library here
    const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : '📢'
    console.log(`${emoji} ${message}`)
  }

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('Notification permission:', permission)
      })
    }
  }, [])

  const handleUpdatePriority = async (partNumber, newPriority) => {
    try {
      // Optimistic update
      updateItemInState(partNumber, { priority: newPriority })

      await apiService.operations.updateItem(partNumber, {
        priority: newPriority,
      })
    } catch (error) {
      console.error("Error updating priority:", error)
      alert("Failed to update priority: " + error.message)
      await loadData()
    }
  }

  const formatDuration = (seconds) => {
    // Convert seconds to total minutes
    const totalMinutes = Math.floor(seconds / 60)
    const h = Math.floor(totalMinutes / 60)
    const m = totalMinutes % 60
    const s = seconds % 60

    if (h > 0 && m > 0) return `${h}h ${m}m ${s}s`
    if (h > 0) return `${h} hour${h > 1 ? "s" : ""} ${m}m ${s}s`
    if (m > 0) return `${m} minute${m !== 1 ? "s" : ""} ${s}s`
    return `${s} second${s !== 1 ? "s" : ""}`
  }

  function getPhaseElapsedTime(phase) {
    if (!phase.start_time) return 0

    const start = new Date(phase.start_time)

    // If phase is completed, calculate total time minus pauses
    if (phase.end_time) {
      const end = new Date(phase.end_time)
      let elapsed = Math.floor((end - start) / 1000)

      // Subtract accumulated paused duration
      if (phase.paused_duration) {
        elapsed -= Number.parseInt(phase.paused_duration)
      }

      return Math.max(0, elapsed)
    }

    // If phase is currently paused, show time up to pause (frozen)
    if (phase.pause_time) {
      const pause = new Date(phase.pause_time)
      let elapsed = Math.floor((pause - start) / 1000)

      // Subtract accumulated paused duration from BEFORE this pause
      if (phase.paused_duration) {
        elapsed -= Number.parseInt(phase.paused_duration)
      }

      return Math.max(0, elapsed)
    }

    // Phase is running - calculate from start to now minus ALL pauses
    const now = new Date()
    let elapsed = Math.floor((now - start) / 1000)

    // Subtract accumulated paused duration
    if (phase.paused_duration) {
      elapsed -= Number.parseInt(phase.paused_duration)
    }

    return Math.max(0, elapsed)
  }

  const handleStartPhase = async (partNumber, phaseId) => {
    try {
      const now = new Date().toISOString()
      // Optimistic update
      updatePhaseInState(partNumber, phaseId, {
        start_time: now,
        pause_time: null,
      })

      await apiService.operations.startPhaseProcess(partNumber, phaseId)
      // Only reload if there's an error in the optimistic update
    } catch (error) {
      console.error("Error starting phase:", error)
      alert("Failed to start phase: " + error.message)
      await loadData() // Reload to fix state
    }
  }

  const handleStopPhase = async (partNumber, phaseId) => {
    try {
      const now = new Date().toISOString()
      // Optimistic update
      updatePhaseInState(partNumber, phaseId, {
        end_time: now,
      })

      await apiService.operations.stopPhaseProcess(partNumber, phaseId)

      // *** ADD THIS LINE: Auto-start next phase ***
      await handleAutoStartNextPhase(partNumber, phaseId)
    } catch (error) {
      console.error("Error stopping phase:", error)
      alert("Failed to stop phase: " + error.message)
      await loadData()
    }
  }

  const handlePausePhase = async (partNumber, phaseId) => {
    try {
      const now = new Date().toISOString()
      // Optimistic update
      updatePhaseInState(partNumber, phaseId, {
        pause_time: now,
      })

      await apiService.operations.pausePhaseProcess(partNumber, phaseId)
    } catch (error) {
      console.error("Error pausing phase:", error)
      alert("Failed to pause phase: " + error.message)
      await loadData()
    }
  }

  const handleResumePhase = async (partNumber, phaseId) => {
    try {
      const item = items.find((i) => i.part_number === partNumber)
      const phase = item?.phases?.find((p) => p.id === phaseId)

      if (!phase || !phase.pause_time) return

      // Calculate pause duration
      const pauseStart = new Date(phase.pause_time)
      const now = new Date()
      const pauseDurationSeconds = Math.floor((now - pauseStart) / 1000)
      const currentPausedDuration = Number.parseInt(phase.paused_duration) || 0
      const newPausedDuration = currentPausedDuration + pauseDurationSeconds

      // Optimistic update - clear pause_time and update paused_duration
      updatePhaseInState(partNumber, phaseId, {
        pause_time: null,
        paused_duration: newPausedDuration,
      })

      await apiService.operations.resumePhaseProcess(partNumber, phaseId)
    } catch (error) {
      console.error("Error resuming phase:", error)
      alert("Failed to resume phase: " + error.message)
      await loadData()
    }
  }

  const handleResetPhase = async (partNumber, phaseId) => {
    if (window.confirm("Reset process times for this phase?")) {
      try {
        // Optimistic update
        updatePhaseInState(partNumber, phaseId, {
          start_time: null,
          pause_time: null,
          end_time: null,
        })

        await apiService.operations.resetPhaseProcess(partNumber, phaseId)
      } catch (error) {
        console.error("Error resetting phase:", error)
        alert("Failed to reset phase: " + error.message)
        await loadData()
      }
    }
  }

  const handleAutoStartNextPhase = async (partNumber, currentPhaseId) => {
    try {
      const item = items.find((i) => i.part_number === partNumber)
      if (!item || !item.phases) return

      const currentPhaseIndex = item.phases.findIndex((p) => p.id === currentPhaseId)
      if (currentPhaseIndex === -1 || currentPhaseIndex === item.phases.length - 1) {
        // No next phase exists
        return
      }

      const nextPhase = item.phases[currentPhaseIndex + 1]

      // Check if next phase hasn't been started yet
      if (!nextPhase.start_time) {
        const now = new Date().toISOString()

        // Optimistic update for next phase
        updatePhaseInState(partNumber, nextPhase.id, {
          start_time: now,
          pause_time: null,
        })

        // API call to start next phase
        await apiService.operations.startPhaseProcess(partNumber, nextPhase.id)
      }
    } catch (error) {
      console.error("Error auto-starting next phase:", error)
      await loadData()
    }
  }

  const getItemElapsedTime = (item) => {
    if (!item.start_time) return 0
    const start = new Date(item.start_time)
    const end = item.end_time ? new Date(item.end_time) : new Date()
    return Math.floor((end - start) / 1000)
  }
  const formatDateTime = (isoString) => {
    if (!isoString) return "Not started"
    return new Date(isoString).toLocaleString("en-PH", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    })
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "High":
        return "text-red-500 bg-red-500/10 border-red-500"
      case "Medium":
        return "text-yellow-500 bg-yellow-500/10 border-yellow-500"
      case "Low":
        return "text-green-500 bg-green-500/10 border-green-500"
      default:
        return "text-gray-500 bg-gray-500/10 border-gray-500"
    }
  }

  const applyFilters = async (page = 1) => {
    setIsFiltering(true)
    try {
      // Build filter params
      const params = {
        page,
        limit: itemsPerPage
      }

      // Map dashboard filters to API filters - FIX status mapping
      if (filterStatus && filterStatus !== 'all') {
        if (filterStatus === 'completed') {
          params.status = 'completed'
        } else if (filterStatus === 'in-progress') {
          params.status = 'in_progress'
        } else if (filterStatus === 'not-started') {
          params.status = 'not_started'
        }
      }

      if (filterPriority && filterPriority !== 'all') {
        params.priority = filterPriority
      }

      if (filterClient && filterClient !== 'all') {
        params.client_name = filterClient
      }

      if (searchTerm && searchTerm.trim()) {
        params.search = searchTerm.trim()
      }

      const response = await apiService.operations.getItemsPaginated(page, itemsPerPage, params)

      setItems(response.items || [])
      setPagination(response.pagination || {
        current_page: page,
        per_page: itemsPerPage,
        total_items: 0,
        total_pages: 0,
        has_next: false,
        has_previous: false
      })
    } catch (error) {
      console.error('Failed to apply filters:', error)
      setItems([])
    } finally {
      setIsFiltering(false)
    }
  }

  useEffect(() => {
    applyFilters(1) // Reset to page 1 when filters change
  }, [filterStatus, filterPriority, filterClient, searchTerm])

  const completedItems = items.filter((item) => {
    if (!item) return false
    try {
      return calculateItemProgress(item) === 100
    } catch (err) {
      console.warn('Error calculating progress for item:', item?.part_number, err)
      return false
    }
  })

  const inProgressItems = items.filter((item) => {
    if (!item) return false
    try {
      return calculateItemProgress(item) < 100
    } catch (err) {
      console.warn('Error calculating progress for item:', item?.part_number, err)
      return true
    }
  })

  // Sort in-progress items (keep existing sorting logic)
  const sortedInProgressItems = [...inProgressItems].sort((a, b) => {
    if (sortBy === "name-asc") return (a.name || "").localeCompare(b.name || "")
    if (sortBy === "name-desc") return (b.name || "").localeCompare(a.name || "")
    if (sortBy === "date-newest") return new Date(b.created_at || 0) - new Date(a.created_at || 0)
    if (sortBy === "date-oldest") return new Date(a.created_at || 0) - new Date(b.created_at || 0)

    const priorityOrder = { High: 0, Medium: 1, Low: 2 }
    return priorityOrder[a.priority || "Medium"] - priorityOrder[b.priority || "Medium"]
  })

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.total_pages) {
      setCurrentPage(newPage) // ADD THIS LINE
      applyFilters(newPage)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }
  const handlePreviousPage = () => {
    if (pagination.has_previous) {
      handlePageChange(currentPage - 1)
    }
  }

  const handleNextPage = () => {
    if (pagination.has_next) {
      handlePageChange(currentPage + 1)
    }
  }

  // Get unique clients for filter
  const uniqueClients = [...new Set(
    items
      .filter(item => item && item.client_name)
      .map((item) => item.client_name)
  )]

  // Helper function to check if previous subphase is completed
  const isPreviousSubphaseCompleted = (item, phase, currentSubphaseIndex) => {
    if (currentSubphaseIndex === 0) return true // First subphase is always available

    const previousSubphase = phase.subphases[currentSubphaseIndex - 1]
    return previousSubphase && previousSubphase.completed == 1
  }

  // Helper function to check if condition is met
  const isSubphaseConditionMet = (item, phase, subphase, subphaseIndex) => {
    // Check if previous subphase is completed
    if (!isPreviousSubphaseCompleted(item, phase, subphaseIndex)) {
      return false
    }

    // *** NEW: If subphase has quantity tracking, only check quantity requirement ***
    if (subphase.expected_quantity > 0) {
      const currentQty = subphase.current_completed_quantity || 0
      if (currentQty < subphase.expected_quantity) {
        return false
      }

      // For quantity-based subphases, employee assignment is still required
      if (!subphase.employee_barcode) {
        return false
      }

      // ✅ Quantity-based subphases don't need phase to be started
      return true
    }

    // *** For time-based subphases (no quantity), require phase to be running ***
    // Check if phase is started and not paused/stopped
    if (!phase.start_time || phase.pause_time || phase.end_time) {
      return false
    }

    // Check if employee is assigned
    if (!subphase.employee_barcode) {
      return false
    }

    return true
  }

  const handleToggleSubPhase = async (partNumber, phaseId, subphaseId, currentStatus) => {
    const item = items.find((i) => i.part_number === partNumber)
    const phase = item?.phases?.find((p) => p.id === phaseId)
    const subphase = phase?.subphases?.find((s) => s.id === subphaseId)

    if (!currentStatus) {
      // If trying to mark as complete
      // Check if it's a quantity-based subphase
      const isQuantityBased = subphase && subphase.expected_quantity > 0

      // For TIME-BASED subphases only, check phase conditions
      if (!isQuantityBased) {
        // Prevent completing subphases while phase is paused
        if (phase && phase.pause_time && !phase.end_time) {
          alert("Cannot mark subphase as complete while the phase is paused. Please resume the phase first.")
          return
        }

        // Prevent completing subphases if phase hasn't started
        if (phase && !phase.start_time) {
          alert("Cannot mark subphase as complete. Please start the phase first.")
          return
        }

        // Prevent completing subphases if phase is already completed
        if (phase && phase.end_time) {
          alert("Cannot mark subphase as complete. This phase is already completed.")
          return
        }
      }

      // For QUANTITY-BASED subphases, only check quantity requirement
      if (isQuantityBased) {
        const currentQty = subphase.current_completed_quantity || 0
        if (currentQty < subphase.expected_quantity) {
          alert(
            `Cannot mark as complete. Current quantity (${currentQty}) is less than expected quantity (${subphase.expected_quantity}).`,
          )
          return
        }
      }
    }

    try {
      const now = new Date().toISOString()

      // Re-check if it's quantity-based for the try block
      const isQuantityBased = subphase && subphase.expected_quantity > 0

      // Check if phase has time tracking (for duration calculation)
      const hasPhaseTimeTracking = phase && phase.start_time && !isQuantityBased

      if (hasPhaseTimeTracking) {
        // Get current subphase index
        const currentSubphaseIndex = phase.subphases.findIndex((sp) => sp.id === subphaseId)

        // Calculate time_duration for THIS subphase when marking as complete
        if (!currentStatus) {
          // If marking as complete
          // Get the current phase elapsed time in SECONDS (from the stopwatch)
          const currentPhaseElapsedSeconds = getPhaseElapsedTime(phase)

          // Calculate the CUMULATIVE time of ALL previous completed subphases
          let allPreviousCumulativeSeconds = 0
          for (let i = 0; i < currentSubphaseIndex; i++) {
            const prevSubphase = phase.subphases[i]
            if (prevSubphase.time_duration) {
              // Add each previous subphase's duration
              allPreviousCumulativeSeconds += Number.parseInt(prevSubphase.time_duration) || 0
            }
          }

          // This subphase duration = current total elapsed time - sum of all previous durations
          const thisSubphaseSeconds = Math.max(0, currentPhaseElapsedSeconds - allPreviousCumulativeSeconds)

          // Update this subphase with its time_duration IN SECONDS
          updateSubphaseInState(partNumber, phaseId, subphaseId, {
            completed: 1,
            completed_at: now,
            time_duration: thisSubphaseSeconds, // Store as integer seconds
          })
        } else {
          // If unchecking, clear the time_duration for this subphase
          updateSubphaseInState(partNumber, phaseId, subphaseId, {
            completed: 0,
            completed_at: null,
            time_duration: 0,
          })
        }
      } else {
        // If phase not started OR quantity-based, just toggle completion without duration
        updateSubphaseInState(partNumber, phaseId, subphaseId, {
          completed: currentStatus ? 0 : 1,
          completed_at: currentStatus ? null : now,
        })
      }

      // API call in background
      if (!currentStatus && hasPhaseTimeTracking) {
        // If marking as complete and phase has started, calculate and send time_duration IN SECONDS
        const currentPhaseElapsedSeconds = getPhaseElapsedTime(phase)
        const currentSubphaseIndex = phase.subphases.findIndex((sp) => sp.id === subphaseId)

        // Calculate cumulative time of ALL previous subphases
        let allPreviousCumulativeSeconds = 0
        for (let i = 0; i < currentSubphaseIndex; i++) {
          const prevSubphase = phase.subphases[i]
          if (prevSubphase.time_duration) {
            allPreviousCumulativeSeconds += Number.parseInt(prevSubphase.time_duration) || 0
          }
        }

        const thisSubphaseSeconds = Math.max(0, currentPhaseElapsedSeconds - allPreviousCumulativeSeconds)

        // Complete subphase with calculated time_duration IN SECONDS
        await apiService.operations.completeSubphaseWithDuration(subphaseId, true, thisSubphaseSeconds)
      } else {
        // Just toggle completion status without duration
        await apiService.operations.completeSubphaseWithDuration(subphaseId, !currentStatus)
      }
    } catch (error) {
      console.error("Error toggling subphase:", error)
      alert("Failed to toggle subphase: " + error.message)
      await loadData()
    }
  }

  // Helper function to check if previous phase is completed
  const isPreviousPhaseCompleted = (item, currentPhaseIndex) => {
    if (currentPhaseIndex === 0) return true // First phase is always available

    const previousPhase = item.phases[currentPhaseIndex - 1]
    if (!previousPhase) return true

    // Previous phase must be completed (100% progress)
    return calculatePhaseProgress(previousPhase) === 100 && previousPhase.end_time
  }

  // Helper function to extract base part number (remove batch suffix)
  const getBasePartNumber = (partNumber) => {
    if (!partNumber) return '';
    // Extract only the numeric part before "-BATCH-"
    const match = partNumber.match(/^(\d+)/);
    return match ? match[1] : partNumber;
  };

  // Toggle Item Checkbox
  const toggleItemCheckbox = (partNumber) => {
    setItemCheckboxes(prev => ({
      ...prev,
      [partNumber]: !prev[partNumber]
    }))
  }

  // Get checked items count
  const getCheckedItemsCount = () => {
    return Object.values(itemCheckboxes).filter(Boolean).length
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h2 className={`text-2xl font-bold ${isDarkMode ? "text-gray-200" : "text-gray-800"}`}>
          Progress Checklist
        </h2>
      </div>

      {/* Search and Filter Bar */}
      <div
        className={`backdrop-blur-md rounded-lg p-4 mb-6 border transition-all shadow-sm ${isDarkMode ? "bg-gray-800/60 border-gray-700/50" : "bg-white/30 border-white/40"
          }`}
      >
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, part number, or client..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1) // ADD THIS LINE
              }}
              className={`w-full pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 transition-all ${isDarkMode
                ? "bg-gray-700/50 border border-gray-600/50 text-gray-100 placeholder-gray-400"
                : "bg-white/50 border border-gray-300/30 text-gray-800 placeholder-gray-500"
                }`}
            />
          </div>

          {/* Filter Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
          >
            <Filter size={18} />
            <span className="hidden sm:inline">Filters</span>
            {(filterClient || filterPriority || filterStatus || sortBy) &&
              `(${[filterClient, filterPriority, filterStatus, sortBy].filter(Boolean).length})`
            }
          </button>
        </div>

        {/* Filter Options */}
        {showFilters && (
          <div className="mt-3 pt-3 border-t border-gray-300/20 dark:border-gray-700/20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Filter by Client
              </label>
              <select
                value={filterClient}
                onChange={(e) => setFilterClient(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 transition-all ${isDarkMode
                  ? "bg-gray-700/50 border border-gray-600/50 text-gray-100"
                  : "bg-white/50 border border-gray-300/30 text-gray-800"
                  }`}
              >
                <option value="">All Clients</option>
                {uniqueClients.map((client) => (
                  <option key={client} value={client}>
                    {client}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Filter by Priority
              </label>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 transition-all ${isDarkMode
                  ? "bg-gray-700/50 border border-gray-600/50 text-gray-100"
                  : "bg-white/50 border border-gray-300/30 text-gray-800"
                  }`}
              >
                <option value="">All Priorities</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            {/* NEW: Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Filter by Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 transition-all ${isDarkMode
                  ? "bg-gray-700/50 border border-gray-600/50 text-gray-100"
                  : "bg-white/50 border border-gray-300/30 text-gray-800"
                  }`}
              >
                <option value="">All Statuses</option>
                <option value="not-started">Not Started</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sort by
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 transition-all ${isDarkMode
                  ? "bg-gray-700/50 border border-gray-600/50 text-gray-100"
                  : "bg-white/50 border border-gray-300/30 text-gray-800"
                  }`}
              >
                <option value="">Default</option>
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="date-newest">Date Added (Newest)</option>
                <option value="date-oldest">Date Added (Oldest)</option>
              </select>
            </div>

            {/* UPDATE: Clear filters to include status */}
            {(filterClient || filterPriority || filterStatus || sortBy) && (
              <div className="sm:col-span-2 lg:col-span-4">
                <button
                  onClick={() => {
                    setFilterClient("")
                    setFilterPriority("")
                    setFilterStatus("")
                    setSortBy("")
                    setCurrentPage(1)
                  }}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      {isFiltering && (
        <div className="text-center py-8">
          <div className={`animate-spin rounded-full h-8 w-8 border-b-2 mx-auto ${isDarkMode ? "border-slate-400" : "border-slate-600"
            }`}></div>
          <p className={`mt-4 text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
            Filtering items...
          </p>
        </div>
      )}

      {/* Bulk Edit Section */}
      {getCheckedItemsCount() > 0 && (
        <div className={`backdrop-blur-md rounded-lg p-4 mb-4 border transition-all shadow-sm ${isDarkMode ? "bg-purple-500/10 border-purple-500/30" : "bg-purple-500/10 border-purple-500/30"
          }`}>
          <div className="flex items-center justify-between">
            <span className={`text-sm font-medium ${isDarkMode ? "text-purple-300" : "text-purple-700"}`}>
              {getCheckedItemsCount()} item(s) selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const selected = Object.keys(itemCheckboxes)
                    .filter(partNumber => itemCheckboxes[partNumber])
                    .map(partNumber => items.find(item => item.part_number === partNumber))
                    .filter(Boolean)
                  setSelectedItemsForBulk(selected)
                  setShowBulkEditModal(true)
                }}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
              >
                <Edit2 size={16} />
                Bulk Edit
              </button>
              <button
                onClick={() => setItemCheckboxes({})}
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm font-medium"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div
          className={`backdrop-blur-md rounded-lg p-4 border transition-all shadow-sm ${isDarkMode ? "bg-blue-500/10 border-blue-500/30" : "bg-gradient-to-r from-blue-500/10 to-blue-400/10 border-blue-500/30"
            }`}
        >
          <h3 className={`text-lg font-semibold ${isDarkMode ? "text-blue-300" : "text-blue-700"}`}>In Progress</h3>
          <p className={`text-3xl font-bold mt-2 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}>
            {inProgressItems.length}
          </p>
        </div>
        <div
          className={`backdrop-blur-md rounded-lg p-4 border transition-all shadow-sm ${isDarkMode ? "bg-green-500/10 border-green-500/30" : "bg-gradient-to-r from-green-500/10 to-green-400/10 border-green-500/30"
            }`}
        >
          <h3 className={`text-lg font-semibold ${isDarkMode ? "text-green-300" : "text-green-700"}`}>Completed</h3>
          <p className={`text-3xl font-bold mt-2 ${isDarkMode ? "text-green-400" : "text-green-600"}`}>
            {completedItems.length}
          </p>
        </div>
      </div>

      {/* Transfer Modal */}
      {transferModalOpen && selectedItem && selectedSubphase && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className={`rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto ${isDarkMode ? "bg-gray-800" : "bg-white"
              }`}
          >
            <h3
              className={`text-xl font-bold mb-4 flex items-center gap-2 ${isDarkMode ? "text-gray-200" : "text-gray-800"
                }`}
            >
              <ArrowRightLeft size={20} />
              Transfer Subphase Quantity
            </h3>

            <div className={`mb-4 p-3 rounded-lg space-y-2 ${isDarkMode ? "bg-gray-700" : "bg-gray-100"}`}>
              <div>
                <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>From Item:</p>
                <p className={`font-semibold ${isDarkMode ? "text-gray-200" : "text-gray-800"}`}>{selectedItem.name}</p>
                <p className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                  Client: {selectedItem.client_name}
                </p>
              </div>
              <div>
                <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>Phase / Subphase:</p>
                <p className={`font-medium ${isDarkMode ? "text-gray-200" : "text-gray-800"}`}>
                  {selectedPhase.name} → {selectedSubphase.name}
                </p>
              </div>
              <div>
                <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>Available to Transfer:</p>
                <p className={`font-bold ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}>
                  {selectedSubphase.current_completed_quantity || 0} units
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Client Selection */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Target Client *
                </label>
                <input
                  type="text"
                  placeholder="Enter client name"
                  value={newClient}
                  onChange={(e) => {
                    setNewClient(e.target.value)
                    setSelectedTargetItem(null)
                    setSelectedTargetPhase(null)
                    setSelectedTargetSubphase(null)
                  }}
                  autoFocus
                  className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-slate-500 ${isDarkMode
                    ? "bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400"
                    : "bg-gray-100 border-gray-300 text-gray-800 placeholder-gray-500"
                    }`}
                />

                {showClientDropdown && (
                  <div
                    className={`absolute z-10 w-full mt-1 border rounded-lg shadow-lg max-h-40 overflow-y-auto ${isDarkMode ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"
                      }`}
                  >
                    {clients
                      .filter(
                        (c) => c !== selectedItem?.client_name && c.toLowerCase().includes(newClient.toLowerCase()),
                      )
                      .map((client, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setNewClient(client)
                            setShowClientDropdown(false)
                          }}
                          className={`w-full text-left px-4 py-2 border-b transition-colors ${isDarkMode
                            ? "hover:bg-gray-600 border-gray-600 text-gray-200"
                            : "hover:bg-gray-100 border-gray-200 text-gray-800"
                            } last:border-b-0`}
                        >
                          {client}
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {/* Target Item Selection */}
              {newClient.trim() && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Target Item *
                    </label>
                    {clientItems.length > 0 ? (
                      <select
                        value={selectedTargetItem?.part_number || ""}
                        onChange={(e) => {
                          const item = clientItems.find((i) => i.part_number === e.target.value)
                          setSelectedTargetItem(item || null)
                          setSelectedTargetPhase(null)
                          setSelectedTargetSubphase(null)
                        }}
                        className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-slate-500 ${isDarkMode
                          ? "bg-gray-700 border-gray-600 text-gray-200"
                          : "bg-gray-100 border-gray-300 text-gray-800"
                          }`}
                      >
                        <option value="">Select target item</option>
                        {clientItems.map((item) => (
                          <option key={item.part_number} value={item.part_number}>
                            {item.part_number} ({item.quantity || 0} qty)
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p
                        className={`text-sm p-3 rounded ${isDarkMode ? "text-yellow-400 bg-yellow-500/10" : "text-yellow-600 bg-yellow-500/10"
                          }`}
                      >
                        No matching items found for part number "{getBasePartNumber(selectedItem?.part_number)}" under client "{newClient}"
                      </p>
                    )}
                  </div>

                  {/* Target Phase Selection */}
                  {selectedTargetItem && selectedTargetItem.phases && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Target Phase *
                      </label>
                      <select
                        value={selectedTargetPhase || ""}
                        onChange={(e) => {
                          setSelectedTargetPhase(e.target.value)
                          setSelectedTargetSubphase(null)
                        }}
                        className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-slate-500 ${isDarkMode
                          ? "bg-gray-700 border-gray-600 text-gray-200"
                          : "bg-gray-100 border-gray-300 text-gray-800"
                          }`}
                      >
                        <option value="">Select target phase</option>
                        {selectedTargetItem.phases.map((phase) => (
                          <option key={phase.id} value={phase.id}>
                            {phase.name} ({phase.subphases?.length || 0} subphases)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Target Subphase Selection */}
                  {selectedTargetItem && selectedTargetPhase && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Target Subphase *
                      </label>
                      <select
                        value={selectedTargetSubphase || ""}
                        onChange={(e) => {
                          setSelectedTargetSubphase(e.target.value)
                        }}
                        className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-slate-500 ${isDarkMode
                          ? "bg-gray-700 border-gray-600 text-gray-200"
                          : "bg-gray-100 border-gray-300 text-gray-800"
                          }`}
                      >
                        <option value="">Select target subphase</option>
                        {selectedTargetItem.phases
                          .find((p) => p.id === Number.parseInt(selectedTargetPhase))
                          ?.subphases?.map((subphase) => (
                            <option key={subphase.id} value={subphase.id}>
                              {subphase.name} (Current: {subphase.current_completed_quantity || 0} / Expected:{" "}
                              {subphase.expected_quantity})
                            </option>
                          ))}
                      </select>
                    </div>
                  )}

                  {/* Show selected target info */}
                  {selectedTargetItem && selectedTargetPhase && selectedTargetSubphase && (
                    <div
                      className={`p-3 rounded-lg border ${isDarkMode ? "bg-green-500/10 border-green-500/30" : "bg-green-500/10 border-green-500/30"
                        }`}
                    >
                      <p className={`text-sm font-medium ${isDarkMode ? "text-green-300" : "text-green-700"}`}>
                        ✓ Transfer destination selected
                      </p>
                      <p className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-600"} mt-1`}>
                        {selectedTargetItem.phases.find((p) => p.id === Number.parseInt(selectedTargetPhase))?.name} →{" "}
                        {
                          selectedTargetItem.phases
                            .find((p) => p.id === Number.parseInt(selectedTargetPhase))
                            ?.subphases?.find((s) => s.id === Number.parseInt(selectedTargetSubphase))?.name
                        }
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Transfer Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
                  <Package size={16} />
                  Quantity to Transfer *
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedSubphase.current_completed_quantity || 0}
                  value={transferQuantity}
                  onChange={(e) => setTransferQuantity(e.target.value)}
                  className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-slate-500 ${isDarkMode
                    ? "bg-gray-700 border-gray-600 text-gray-200"
                    : "bg-gray-100 border-gray-300 text-gray-800"
                    }`}
                />
              </div>

              {/* Transfer Remarks */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
                  <FileText size={16} />
                  Transfer Remarks
                </label>
                <textarea
                  placeholder="Enter reason for transfer..."
                  value={transferRemarks}
                  onChange={(e) => setTransferRemarks(e.target.value)}
                  rows={3}
                  className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-slate-500 resize-none ${isDarkMode
                    ? "bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400"
                    : "bg-gray-100 border-gray-300 text-gray-800 placeholder-gray-500"
                    }`}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleTransferClient}
                disabled={!selectedTargetItem || !selectedTargetPhase || !selectedTargetSubphase || !transferQuantity}
                className="flex-1 bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Transfer
              </button>
              <button
                onClick={() => {
                  setTransferModalOpen(false)
                  setSelectedItem(null)
                  setSelectedPhase(null)
                  setSelectedSubphase(null)
                  setNewClient("")
                  setTransferQuantity("")
                  setTransferRemarks("")
                  setSelectedTargetItem(null)
                  setSelectedTargetPhase(null)
                  setSelectedTargetSubphase(null)
                  setShowClientDropdown(false)
                }}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal */}
      {scanningFor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`rounded-lg p-6 max-w-md w-full mx-4 ${isDarkMode ? "bg-gray-800" : "bg-white"}`}>
            <h3 className={`text-xl font-bold mb-4 ${isDarkMode ? "text-gray-200" : "text-gray-800"}`}>
              Scan Employee Barcode
            </h3>
            <input
              type="text"
              placeholder="Enter barcode or employee ID"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && submitBarcode()}
              autoFocus
              className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-slate-500 mb-4 ${isDarkMode
                ? "bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400"
                : "bg-gray-100 border-gray-300 text-gray-800 placeholder-gray-500"
                }`}
            />
            <div className="flex gap-3">
              <button
                onClick={submitBarcode}
                className="flex-1 bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
              >
                Submit
              </button>
              <button
                onClick={() => {
                  setScanningFor(null)
                  setBarcodeInput("")
                }}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {!isFiltering && items.length > 0 ? (
        <div className="space-y-8">
          {/* In Progress Items */}
          {inProgressItems.length > 0 && (
            <div>
              <h3
                className={`text-2xl font-bold mb-4 flex items-center gap-2 ${isDarkMode ? "text-gray-200" : "text-gray-800"
                  }`}
              >
                <Clock size={20} />
                In Progress Items ({inProgressItems.length})
              </h3>
              <div className="space-y-4">
                {sortedInProgressItems.map((item) => {
                  const itemKey = item.part_number || item.id
                  const priority = item.priority || "Medium"
                  const elapsedSeconds = getItemElapsedTime(item)
                  const progress = calculateItemProgress(item)

                  return (
                    <div
                      key={itemKey}
                      className={`backdrop-blur-md rounded-lg border overflow-hidden transition-all shadow-sm ${isDarkMode ? "bg-gray-800/60 border-gray-700/50" : "bg-white/30 border-white/40"
                        }`}
                    >
                      {/* Item Header */}
                      <div className="p-4">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-3">
                          <div
                            onClick={() => toggleItemExpansion(item.part_number)}
                            className="flex items-center gap-3 cursor-pointer flex-1"
                          >
                            <span className="text-xl shrink-0">{expandedItems[item.part_number] ? "▼" : "▶"}</span>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3
                                  className={`font-semibold text-lg sm:text-xl ${isDarkMode ? "text-gray-200" : "text-gray-800"}`}
                                >
                                  {item.name}
                                </h3>
                                <div
                                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${getPriorityColor(priority)}`}
                                >
                                  <Flag size={12} />
                                  {priority}
                                </div>
                                {item.client_name && (
                                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500">
                                    <User size={12} />
                                    {item.client_name}
                                  </div>
                                )}
                                {item.quantity && item.quantity > 1 && (
                                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500">
                                    <Package size={12} />
                                    Qty: {item.quantity}
                                  </div>
                                )}
                              </div>
                              <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"} mt-1`}>
                                Part #: {item.part_number} • {item.phases?.length || 0} phases
                              </p>
                              {item.remarks && (
                                <p
                                  className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"} mt-1 italic flex items-start gap-1`}
                                >
                                  <FileText size={12} className="mt-0.5 shrink-0" />
                                  <span className="line-clamp-2">{item.remarks}</span>
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 justify-end sm:justify-start w-full sm:w-auto">
                            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                              {["High", "Medium", "Low"].map((p) => (
                                <button
                                  key={p}
                                  onClick={() => handleUpdatePriority(item.part_number, p)}
                                  className={`px-2 py-1 text-xs rounded transition-colors ${priority === p
                                    ? getPriorityColor(p)
                                    : isDarkMode
                                      ? "text-gray-400 hover:text-gray-300"
                                      : "text-gray-400 hover:text-gray-600"
                                    }`}
                                  title={`Set ${p} priority`}
                                >
                                  <Flag size={14} />
                                </button>
                              ))}
                            </div>
                            <div className="flex items-center gap-2 justify-end sm:justify-start w-full sm:w-auto">
                              {/* ADD CHECKBOX FOR BULK SELECTION */}
                              <input
                                type="checkbox"
                                checked={itemCheckboxes[item.part_number] || false}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  toggleItemCheckbox(item.part_number);
                                }}
                                className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                title="Select for bulk edit"
                              />

                              {/* EDIT ITEM BUTTON */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedItemForEdit(item);
                                  setShowEditItemModal(true);
                                }}
                                className="px-2 py-1 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 rounded transition-colors"
                                title="Edit item details"
                              >
                                <Edit2 size={16} />
                              </button>

                              {/* ADD PHASE BUTTON */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedItemForEdit(item);
                                  setShowAddPhaseModal(true);
                                }}
                                className="px-2 py-1 text-green-600 dark:text-green-400 hover:bg-green-500/10 rounded transition-colors"
                                title="Add phase"
                              >
                                <Plus size={16} />
                              </button>

                              {/* DELETE ITEM BUTTON */}
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (window.confirm(`Delete "${item.name}" (${item.part_number})?\n\nThis will permanently delete all phases and subphases. This action cannot be undone.`)) {
                                    try {
                                      // Optimistically remove from UI
                                      setItems(prevItems => prevItems.filter(i => i.part_number !== item.part_number));

                                      // API call in background
                                      await apiService.operations.deleteItem(item.part_number);

                                      alert(`"${item.name}" has been deleted successfully.`);
                                    } catch (error) {
                                      console.error("Error deleting item:", error);
                                      alert("Failed to delete item: " + error.message);
                                      // Reload on error to restore state
                                      await loadData();
                                    }
                                  }
                                }}
                                className="px-2 py-1 text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                title="Delete item"
                              >
                                <Trash2 size={16} />
                              </button>

                              {/* TRANSFER BUTTON */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openTransferModal(item);
                                }}
                                className="px-2 py-1 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 rounded transition-colors"
                                title="Transfer to another client"
                              >
                                <ArrowRightLeft size={16} />
                              </button>


                              {/* PROGRESS */}
                              <span className={`text-lg font-bold ${isDarkMode ? "text-gray-200" : "text-gray-800"}`}>
                                {progress}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Phases */}
                      {expandedItems[item.part_number] && (
                        <div className="px-4 pb-4 space-y-3">
                          {item.phases && item.phases.length > 0 ? (
                            item.phases.map((phase, phaseIndex) => {
                              const phaseKey = phase.id
                              const isFirstPhase = phaseIndex === 0
                              const isPreviousPhaseComplete = isPreviousPhaseCompleted(item, phaseIndex)
                              const isPhaseDisabled = !isFirstPhase && !isPreviousPhaseComplete

                              return (
                                <div
                                  key={phaseKey}
                                  className={`rounded-lg border ${isPhaseDisabled
                                    ? "border-yellow-500/30 opacity-60"
                                    : isDarkMode
                                      ? "border-gray-700/10"
                                      : "border-gray-300/10"
                                    }`}
                                >
                                  {/* Add warning if phase is disabled */}
                                  {isPhaseDisabled && (
                                    <div className="px-3 pt-3">
                                      <div
                                        className={`p-2 rounded text-xs ${isDarkMode
                                          ? "text-yellow-400 bg-yellow-500/10 border border-yellow-500/30"
                                          : "text-yellow-700 bg-yellow-500/10 border border-yellow-500/30"
                                          }`}
                                      >
                                        ⚠️ Complete previous phase first
                                      </div>
                                    </div>
                                  )}

                                  {/* Phase Header */}
                                  <div className="p-3">
                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-3">
                                      <div
                                        onClick={() => togglePhaseExpansion(phase.id)}
                                        className="flex items-center gap-2 cursor-pointer flex-1"
                                      >
                                        <span className="shrink-0">{expandedPhases[phase.id] ? "▼" : "▶"}</span>
                                        <span
                                          className={`font-medium text-base sm:text-lg ${isDarkMode ? "text-gray-200" : "text-gray-800"
                                            }`}
                                        >
                                          {phase.name}
                                          {isFirstPhase && (
                                            <span className="ml-2 text-xs bg-blue-500 text-white px-2 py-0.5 rounded">
                                              Phase 1
                                            </span>
                                          )}
                                        </span>

                                        <span className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                                          ({phase.subphases?.length || 0} sub-phases)
                                        </span>
                                      </div>
                                      <div className="flex gap-1 ml-auto" onClick={(e) => e.stopPropagation()}>
                                        <button
                                          onClick={() => {
                                            setSelectedItemForEdit(item)
                                            setSelectedPhaseForEdit(phase)
                                            setShowEditPhaseModal(true)
                                          }}
                                          className="px-2 py-1 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 rounded transition-colors"
                                          title="Edit phase"
                                        >
                                          <Edit2 size={14} />
                                        </button>
                                        <button
                                          onClick={() => {
                                            setSelectedItemForEdit(item)
                                            setSelectedPhaseForEdit(phase)
                                            setShowAddSubphaseModal(true)
                                          }}
                                          className="px-2 py-1 text-green-600 dark:text-green-400 hover:bg-green-500/10 rounded transition-colors"
                                          title="Add subphase"
                                        >
                                          <Plus size={14} />
                                        </button>
                                      </div>
                                      <div className="flex items-center gap-3 w-full sm:w-auto">
                                        <div
                                          className={`w-full sm:w-32 rounded-full h-2 ${isDarkMode ? "bg-gray-700" : "bg-gray-300"
                                            }`}
                                        >
                                          <div
                                            className="bg-slate-600 dark:bg-slate-400 h-2 rounded-full transition-all duration-300"
                                            style={{
                                              width: `${calculatePhaseProgress(phase)}%`,
                                            }}
                                          ></div>
                                        </div>
                                        <span
                                          className={`text-sm font-semibold w-12 text-right ${isDarkMode ? "text-gray-200" : "text-gray-800"
                                            }`}
                                        >
                                          {calculatePhaseProgress(phase)}%
                                        </span>
                                      </div>
                                    </div>

                                    {/* Phase Duration Tracker */}
                                    <div className={`rounded-lg p-3 ${isDarkMode ? "bg-slate-500/20" : "bg-slate-500/10"}`}>
                                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-2">
                                        <span className={`text-sm font-semibold flex items-center gap-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"
                                          }`}>
                                          <Calendar size={16} />
                                          Phase Duration
                                          {phase.expected_hours && (
                                            <span className={`text-xs px-2 py-0.5 rounded ${isDarkMode ? "bg-purple-500/20 text-purple-300" : "bg-purple-500/20 text-purple-700"
                                              }`}>
                                              Expected: {Number.parseFloat(phase.expected_hours).toFixed(1)}h
                                            </span>
                                          )}
                                        </span>
                                        <div className="flex items-center gap-2">
                                          <Clock size={16} className="text-slate-600 dark:text-slate-400" />
                                          <span className={`text-lg font-mono font-bold ${isDarkMode ? "text-gray-200" : "text-gray-800"
                                            }`}>
                                            {formatTime(getPhaseElapsedTime(phase))}
                                          </span>
                                          {/* Show variance indicator if phase is complete and has expected hours */}
                                          {phase.end_time && phase.expected_hours && phase.actual_hours && (
                                            <span className={`text-xs px-2 py-0.5 rounded font-medium ${phase.actual_hours > phase.expected_hours
                                                ? "bg-red-500/20 text-red-700 dark:text-red-300"
                                                : "bg-green-500/20 text-green-700 dark:text-green-300"
                                              }`}>
                                              {phase.actual_hours > phase.expected_hours ? "+" : ""}
                                              {(phase.actual_hours - phase.expected_hours).toFixed(1)}h
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      {/* Show progress bar for expected vs actual if expected hours set */}
                                      {phase.expected_hours && phase.start_time && !phase.end_time && (
                                        <div className="mb-2">
                                          <div className="flex justify-between text-xs mb-1">
                                            <span className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
                                              Progress vs Expected
                                            </span>
                                            <span className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
                                              {((getPhaseElapsedTime(phase) / 3600) / phase.expected_hours * 100).toFixed(0)}%
                                            </span>
                                          </div>
                                          <div className={`w-full rounded-full h-2 ${isDarkMode ? "bg-gray-700" : "bg-gray-300"}`}>
                                            <div
                                              className={`h-2 rounded-full transition-all duration-300 ${(getPhaseElapsedTime(phase) / 3600) > phase.expected_hours
                                                  ? "bg-red-500"
                                                  : "bg-purple-500"
                                                }`}
                                              style={{
                                                width: `${Math.min(100, ((getPhaseElapsedTime(phase) / 3600) / phase.expected_hours * 100))}%`,
                                              }}
                                            ></div>
                                          </div>
                                          <p className={`text-xs mt-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                                            {(getPhaseElapsedTime(phase) / 3600).toFixed(2)}h of {phase.expected_hours}h expected
                                          </p>
                                        </div>
                                      )}

                                      <div className="flex justify-between items-center text-xs mb-3">
                                        <div>
                                          <span className={`text-gray-600 ${isDarkMode ? "dark:text-gray-400" : ""}`}>Start: </span>
                                          <span className={`font-medium ${isDarkMode ? "text-gray-200" : "text-gray-800"}`}>
                                            {formatDateTime(phase.start_time)}
                                          </span>
                                        </div>
                                        <div>
                                          <span className={`text-gray-600 ${isDarkMode ? "dark:text-gray-400" : ""}`}>End: </span>
                                          <span className={`font-medium ${isDarkMode ? "text-gray-200" : "text-gray-800"}`}>
                                            {phase.end_time
                                              ? formatDateTime(phase.end_time)
                                              : phase.pause_time
                                                ? "Paused"
                                                : "In progress"}
                                          </span>
                                        </div>
                                      </div>

                                      <div
                                        className={`grid gap-2 w-full ${!phase.start_time || (phase.pause_time && !phase.end_time && calculatePhaseProgress(phase) < 100)
                                          ? "grid-flow-col justify-center"
                                          : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                                          }`}
                                      >
                                        {!phase.start_time ? (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleStartPhase(item.part_number, phase.id);
                                            }}
                                            className="flex w-full items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                                          >
                                            <Play size={16} />
                                            Start Phase
                                          </button>
                                        ) : phase.pause_time && !phase.end_time ? (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleResumePhase(item.part_number, phase.id);
                                            }}
                                            className="flex-1 flexs w-2xl items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                                          >
                                            <Play size={16} />
                                            Resume Phase
                                          </button>
                                        ) : !phase.end_time ? (
                                          <>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handlePausePhase(item.part_number, phase.id);
                                              }}
                                              className="flex-1 flex items-center justify-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                                            >
                                              <Pause size={16} />
                                              Pause Phase
                                            </button>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleStopPhase(item.part_number, phase.id);
                                              }}
                                              className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                                              disabled={calculatePhaseProgress(phase) < 100}
                                              title={
                                                calculatePhaseProgress(phase) < 100
                                                  ? "Complete all subphases to stop"
                                                  : "Stop phase"
                                              }
                                            >
                                              <StopCircle size={16} />
                                              {calculatePhaseProgress(phase) === 100 ? "Stop Phase" : "Complete to Stop"}
                                            </button>
                                          </>
                                        ) : (
                                          <div className="flex-1 flex items-center justify-center gap-2 bg-green-600/80 text-white px-3 py-2 rounded-lg text-sm font-medium">
                                            <CheckCircle size={16} />

                                            Phase Completed
                                          </div>
                                        )}

                                        {phase.start_time && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleResetPhase(item.part_number, phase.id);
                                            }}
                                            className="px-3 py-2 bg-gray-600 justify-center hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                                            title="Reset duration"
                                          >
                                            <RotateCcw size={14} />
                                            Reset
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Sub-Phases */}
                                  {expandedPhases[phase.id] && (
                                    <div className="px-3 pb-3 space-y-2">
                                      {phase.subphases && phase.subphases.length > 0 ? (
                                        phase.subphases.map((subphase, subphaseIndex) => {
                                          const subPhaseKey = subphase.id
                                          const conditionMet = isSubphaseConditionMet(
                                            item,
                                            phase,
                                            subphase,
                                            subphaseIndex,
                                          )
                                          const isDisabled = !conditionMet && subphase.completed != 1

                                          return (
                                            <div
                                              key={subPhaseKey}
                                              className={`p-3 rounded-lg border ${isDarkMode
                                                ? "bg-black/10 border-gray-700/10"
                                                : "bg-white/5 border-gray-300/10"
                                                }`}
                                            >
                                              <div className="flex items-start gap-3">
                                                <div className="relative shrink-0">
                                                  <input
                                                    type="checkbox"
                                                    checked={subphase.completed == 1}
                                                    disabled={isDisabled}
                                                    onChange={() => {
                                                      if (!isDisabled) {
                                                        const action =
                                                          subphase.completed != 1 ? "complete" : "incomplete"
                                                        if (window.confirm(`Mark "${subphase.name}" as ${action}?`)) {
                                                          handleToggleSubPhase(
                                                            item.part_number,
                                                            phase.id,
                                                            subphase.id,
                                                            subphase.completed == 1,
                                                          )
                                                        }
                                                      }
                                                    }}
                                                    className={`mt-1 w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-slate-600 focus:ring-slate-500 ${isDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                                                      }`}
                                                    title={
                                                      isDisabled
                                                        ? !phase.start_time
                                                          ? "Phase not started yet"
                                                          : phase.pause_time
                                                            ? "Phase is paused - resume to continue"
                                                            : phase.end_time
                                                              ? "Phase already completed"
                                                              : !subphase.employee_barcode
                                                                ? "Assign employee first"
                                                                : subphaseIndex > 0 &&
                                                                  !isPreviousSubphaseCompleted(
                                                                    item,
                                                                    phase,
                                                                    subphaseIndex,
                                                                  )
                                                                  ? "Complete previous subphase first"
                                                                  : subphase.expected_quantity > 0 &&
                                                                    (subphase.current_completed_quantity || 0) < subphase.expected_quantity
                                                                    ? `Complete ${subphase.expected_quantity} units first (current: ${subphase.current_completed_quantity || 0})`
                                                                    : "Conditions not met"
                                                        : subphase.completed == 1
                                                          ? "Mark as incomplete"
                                                          : "Mark as complete"
                                                    }
                                                  />
                                                  {isDisabled && (
                                                    <div
                                                      className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-gray-800"
                                                      title="Conditions not met"
                                                    />
                                                  )}
                                                </div>
                                                <div className="flex-1">
                                                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                                                    <div className="flex items-center gap-2">
                                                      <p className={`font-medium ${subphase.completed == 1
                                                        ? "line-through opacity-60"
                                                        : isDisabled
                                                          ? "opacity-50"
                                                          : ""
                                                        } ${isDarkMode ? "text-gray-200" : "text-gray-800"}`}>
                                                        {subphase.name}
                                                      </p>

                                                      {/* ADD EDIT SUBPHASE BUTTON */}
                                                      <button
                                                        onClick={() => {
                                                          setSelectedItemForEdit(item)
                                                          setSelectedPhaseForEdit(phase)
                                                          setSelectedSubphaseForEdit(subphase)
                                                          setShowEditSubphaseModal(true)
                                                        }}
                                                        className="px-1.5 py-0.5 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 rounded transition-colors"
                                                        title="Edit subphase"
                                                      >
                                                        <Edit2 size={12} />
                                                      </button>
                                                    </div>
                                                    {subphase.completed == 1 && (
                                                      <CheckCircle size={18} className="text-green-500 shrink-0 ml-2" />
                                                    )}
                                                  </div>

                                                  {/* Show condition warning if not met */}
                                                  {isDisabled && (
                                                    <div
                                                      className={`mt-2 p-2 rounded text-xs ${isDarkMode
                                                        ? "text-yellow-400 bg-yellow-500/10 border border-yellow-500/30"
                                                        : "text-yellow-700 bg-yellow-500/10 border border-yellow-500/30"
                                                        }`}
                                                    >
                                                      {!subphase.employee_barcode ? (
                                                        <>⚠️ Assign an employee first before marking complete</>
                                                      ) : subphaseIndex > 0 &&
                                                        !isPreviousSubphaseCompleted(item, phase, subphaseIndex) ? (
                                                        <>⚠️ Complete previous subphase first</>
                                                      ) : subphase.expected_quantity > 0 &&
                                                        (subphase.current_completed_quantity || 0) < subphase.expected_quantity ? (
                                                        <>
                                                          ⚠️ Complete {subphase.expected_quantity} units first (current:{" "}
                                                          {subphase.current_completed_quantity || 0})
                                                        </>
                                                      ) : !phase.start_time ? (
                                                        <>
                                                          ⚠️ Start the phase first before marking subphases (time-based)
                                                        </>
                                                      ) : phase.pause_time ? (
                                                        <>⚠️ Phase is paused - resume to continue marking subphases</>
                                                      ) : phase.end_time ? (
                                                        <>⚠️ Phase is already completed</>
                                                      ) : (
                                                        <>⚠️ Conditions not met</>
                                                      )}
                                                    </div>
                                                  )}

                                                  {subphase.time_duration > 0 && (
                                                    <p
                                                      className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"
                                                        } italic mt-1 flex items-center gap-1`}
                                                    >
                                                      <Clock size={12} />
                                                      Duration: {formatDuration(subphase.time_duration)} completion
                                                    </p>
                                                  )}

                                                  <div className="mt-2 flex flex-wrap gap-2 items-center">
                                                    <span className="text-xs bg-blue-500/20 text-blue-700 dark:text-blue-300 px-2 py-1 rounded flex items-center gap-1">
                                                      <Clock size={12} />
                                                      Expected: {formatTime(subphase.expected_duration)}
                                                    </span>

                                                    {/* Quantity Tracking */}
                                                    {subphase.expected_quantity !== undefined &&
                                                      subphase.expected_quantity !== null &&
                                                      subphase.expected_quantity > 0 && (
                                                        <div className="flex items-center gap-2">
                                                          <span className="text-xs bg-purple-500/20 text-purple-700 dark:text-purple-300 px-2 py-1 rounded flex items-center gap-1">
                                                            <Package size={12} />
                                                            Current: {subphase.current_completed_quantity || 0} /{" "}
                                                            {subphase.expected_quantity}
                                                          </span>
                                                          <div className="flex items-center gap-1">
                                                            <button
                                                              onClick={() => openQuantityModal(item, phase, subphase)}
                                                              className="px-3 py-1 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
                                                            >
                                                              Update
                                                            </button>
                                                          </div>
                                                          {/* Quantity Update Modal */}
                                                          {quantityModalOpen && quantityModalData && (
                                                            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                                                              <div
                                                                className={`rounded-lg p-6 max-w-md w-full ${isDarkMode ? "bg-gray-800" : "bg-white"
                                                                  }`}
                                                              >
                                                                <h3
                                                                  className={`text-xl font-bold mb-4 flex items-center gap-2 ${isDarkMode ? "text-gray-200" : "text-gray-800"
                                                                    }`}
                                                                >
                                                                  <Package size={20} />
                                                                  Update Completed Quantity
                                                                </h3>

                                                                <div
                                                                  className={`mb-4 p-3 rounded-lg space-y-2 ${isDarkMode ? "bg-gray-700" : "bg-gray-100"
                                                                    }`}
                                                                >
                                                                  <div>
                                                                    <p
                                                                      className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"
                                                                        }`}
                                                                    >
                                                                      Item:
                                                                    </p>
                                                                    <p
                                                                      className={`font-semibold ${isDarkMode ? "text-gray-200" : "text-gray-800"
                                                                        }`}
                                                                    >
                                                                      {quantityModalData.item.name}
                                                                    </p>
                                                                  </div>
                                                                  <div>
                                                                    <p
                                                                      className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"
                                                                        }`}
                                                                    >
                                                                      Phase / Subphase:
                                                                    </p>
                                                                    <p
                                                                      className={`font-medium ${isDarkMode ? "text-gray-200" : "text-gray-800"
                                                                        }`}
                                                                    >
                                                                      {quantityModalData.phase.name} →{" "}
                                                                      {quantityModalData.subphase.name}
                                                                    </p>
                                                                  </div>
                                                                  <div>
                                                                    <p
                                                                      className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"
                                                                        }`}
                                                                    >
                                                                      Expected Quantity:
                                                                    </p>
                                                                    <p
                                                                      className={`font-bold ${isDarkMode ? "text-blue-400" : "text-blue-600"
                                                                        }`}
                                                                    >
                                                                      {quantityModalData.subphase.expected_quantity}
                                                                    </p>
                                                                  </div>
                                                                </div>

                                                                <div className="mb-4">
                                                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                                    Current Completed Quantity
                                                                  </label>
                                                                  <input
                                                                    type="number"
                                                                    min="0"
                                                                    max={quantityModalData.subphase.expected_quantity}
                                                                    value={tempQuantity}
                                                                    onChange={(e) => setTempQuantity(e.target.value)}
                                                                    onKeyPress={(e) =>
                                                                      e.key === "Enter" &&
                                                                      handleUpdateCompletedQuantity()
                                                                    }
                                                                    autoFocus
                                                                    className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-slate-500 ${isDarkMode
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
                                                          {subphase.current_completed_quantity > 0 && (
                                                            <button
                                                              onClick={() => openTransferModal(item, phase, subphase)}
                                                              className="flex items-center gap-1 px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                                                            >
                                                              <ArrowRightLeft size={12} />
                                                              Transfer ({subphase.current_completed_quantity} available)
                                                            </button>
                                                          )}
                                                        </div>
                                                      )}
                                                  </div>

                                                  {subphase.employee_barcode && (
                                                    <div
                                                      className={`mt-2 text-xs px-2 py-1 rounded inline-flex items-center gap-1 ${isDarkMode
                                                        ? "bg-slate-500/20 text-slate-300"
                                                        : "bg-slate-500/20 text-slate-700"
                                                        }`}
                                                    >
                                                      <User size={12} />
                                                      {subphase.employee_name || "Unknown"} ({subphase.employee_barcode}
                                                      )
                                                    </div>
                                                  )}

                                                  <div className="mt-3">
                                                    <button
                                                      onClick={() =>
                                                        handleBarcodeScan(item.part_number, phase.id, subphase.id)
                                                      }
                                                      className="w-full px-3 py-1.5 text-sm bg-slate-600 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded transition-colors flex items-center justify-center gap-1"
                                                    >
                                                      <User size={14} />
                                                      Assign Employee
                                                    </button>
                                                  </div>

                                                  {/* Show completion time with duration */}
                                                  {subphase.completed_at && (
                                                    <div
                                                      className={`text-xs mt-2 space-y-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"
                                                        }`}
                                                    >
                                                      <p className="flex items-center gap-1">
                                                        <CheckCircle size={12} />
                                                        Completed: {new Date(subphase.completed_at).toLocaleString()}
                                                      </p>
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          )
                                        })
                                      ) : (
                                        <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"} py-2`}>
                                          No sub-phases added yet.
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )
                            })
                          ) : (
                            <p className={`text-gray-600 ${isDarkMode ? "dark:text-gray-400" : ""} py-4`}>
                              No phases added yet. Go to "Add Items" to add phases.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Completed Items */}
          {completedItems.length > 0 && (
            <div>
              <h3
                className={`text-2xl font-bold mb-4 flex items-center gap-2 ${isDarkMode ? "text-green-300" : "text-green-700"
                  }`}
              >
                <CheckCircle size={20} />
                Completed Items ({completedItems.length})
              </h3>
              <div className="space-y-4 opacity-75">
                {completedItems.map((item) => {
                  const itemKey = item.part_number || item.id
                  const elapsedSeconds = getItemElapsedTime(item)

                  return (
                    <div
                      key={itemKey}
                      className={`backdrop-blur-md rounded-lg border overflow-hidden transition-all shadow-sm ${isDarkMode ? "bg-green-500/10 border-green-500/30" : "bg-gradient-to-r from-green-500/10 to-green-400/10 border-green-500/30"
                        }`}
                    >
                      <div className="p-4">
                        <div onClick={() => toggleItemExpansion(item.part_number)} className="cursor-pointer">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 gap-3">
                            <div className="flex items-center gap-3 flex-1">
                              <span className="text-xl shrink-0">{expandedItems[item.part_number] ? "▼" : "▶"}</span>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3
                                    className={`font-semibold text-lg sm:text-xl ${isDarkMode ? "text-gray-200" : "text-gray-800"
                                      }`}
                                  >
                                    {item.name}
                                  </h3>
                                  <CheckCircle size={16} className="text-green-500" />
                                  {item.client_name && (
                                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500">
                                      <User size={12} />
                                      {item.client_name}
                                    </div>
                                  )}
                                  {item.quantity && item.quantity > 1 && (
                                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500">
                                      <Package size={12} />
                                      Qty: {item.quantity}
                                    </div>
                                  )}
                                </div>
                                <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                                  Part #: {item.part_number} • {item.phases?.length || 0} phases
                                </p>
                                {item.remarks && (
                                  <p
                                    className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"
                                      } mt-1 italic flex items-start gap-1`}
                                  >
                                    <FileText size={12} className="mt-0.5 shrink-0" />
                                    <span className="line-clamp-2">{item.remarks}</span>
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 justify-end sm:justify-start w-full sm:w-auto">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (!expandedItems[item.part_number]) {
                                    toggleItemExpansion(item.part_number)
                                  }
                                  alert("Please expand phases below and select a specific subphase to transfer from")
                                }}
                                className="px-2 py-1 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 rounded transition-colors"
                                title="Expand to transfer quantities"
                              >
                                <ArrowRightLeft size={16} />
                              </button>
                              <span className={`text-lg font-bold ${isDarkMode ? "text-green-400" : "text-green-600"}`}>
                                100%
                              </span>
                            </div>
                          </div>
                        </div>

                        {item.start_time && (
                          <div className={`rounded-lg p-3 ${isDarkMode ? "bg-green-500/20" : "bg-green-500/10"}`}>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-2">
                              <span
                                className={`text-sm font-semibold flex items-center gap-2 ${isDarkMode ? "text-green-300" : "text-green-700"
                                  }`}
                              >
                                <CheckCircle size={16} />
                                Process Completed
                              </span>
                              <div className="flex items-center gap-2">
                                <Clock size={16} className="text-green-600 dark:text-green-400" />
                                <span
                                  className={`text-lg font-mono font-bold ${isDarkMode ? "text-green-400" : "text-green-700"
                                    }`}
                                >
                                  {formatTime(elapsedSeconds)}
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className={`text-gray-600 ${isDarkMode ? "dark:text-gray-400" : ""}`}>
                                  Started:{" "}
                                </span>
                                <span className={`font-medium ${isDarkMode ? "text-gray-200" : "text-gray-800"}`}>
                                  {formatDateTime(item.start_time)}
                                </span>
                              </div>
                              <div>
                                <span className={`text-gray-600 ${isDarkMode ? "dark:text-gray-400" : ""}`}>
                                  Completed:{" "}
                                </span>
                                <span className={`font-medium ${isDarkMode ? "text-gray-200" : "text-gray-800"}`}>
                                  {formatDateTime(item.end_time)}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {expandedItems[item.part_number] && (
                        <div className="px-4 pb-4 space-y-3">
                          {item.phases && item.phases.length > 0 ? (
                            item.phases.map((phase) => {
                              const phaseKey = phase.id

                              return (
                                <div
                                  key={phaseKey}
                                  className={`rounded-lg border ${isDarkMode ? "border-gray-700/10" : "border-gray-300/10"
                                    }`}
                                >
                                  <div className="p-3">
                                    <div
                                      className="flex justify-between items-center cursor-pointer"
                                      onClick={() => togglePhaseExpansion(phase.id)}
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="shrink-0">{expandedPhases[phase.id] ? "▼" : "▶"}</span>
                                        <span
                                          className={`font-medium text-base sm:text-lg ${isDarkMode ? "text-gray-200" : "text-gray-800"
                                            }`}
                                        >
                                          {phase.name}
                                        </span>
                                      </div>
                                      <span
                                        className={`text-sm font-semibold ${isDarkMode ? "text-green-400" : "text-green-600"
                                          }`}
                                      >
                                        100%
                                      </span>
                                    </div>

                                    {/* ADD THIS: Show subphases when phase is expanded */}
                                    {expandedPhases[phase.id] && phase.subphases && phase.subphases.length > 0 && (
                                      <div className="mt-3 space-y-2 pl-4 border-l-2 dark:border-gray-700/20 border-gray-300/20">
                                        {phase.subphases.map((subphase) => (
                                          <div
                                            key={subphase.id}
                                            className={`p-3 rounded-lg ${isDarkMode ? "bg-black/10" : "bg-white/5"}`}
                                          >
                                            <div className="flex items-start justify-between">
                                              <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                  <CheckCircle size={14} className="text-green-500 shrink-0" />
                                                  <span
                                                    className={`text-sm font-medium ${isDarkMode ? "text-gray-200" : "text-gray-800"
                                                      }`}
                                                  >
                                                    {subphase.name}
                                                  </span>
                                                </div>

                                                {/* Show quantity info if available */}
                                                {subphase.expected_quantity > 0 && (
                                                  <div className="mt-2 flex flex-wrap gap-2 items-center">
                                                    <span className={`text-xs bg-purple-500/20 ${isDarkMode ? "text-purple-300" : "text-purple-800"} px-2 py-1 rounded flex items-center gap-1`}>
                                                      <Package size={12} />
                                                      Completed: {subphase.current_completed_quantity || 0} /{" "}
                                                      {subphase.expected_quantity}
                                                    </span>

                                                    {/* ADD TRANSFER BUTTON HERE */}
                                                    {(subphase.current_completed_quantity || 0) > 0 && (
                                                      <button
                                                        onClick={() => openTransferModal(item, phase, subphase)}
                                                        className="flex items-center gap-1 px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                                                      >
                                                        <ArrowRightLeft size={12} />
                                                        Transfer ({subphase.current_completed_quantity} available)
                                                      </button>
                                                    )}
                                                  </div>
                                                )}

                                                {/* Show employee info if available */}
                                                {subphase.employee_barcode && (
                                                  <div
                                                    className={`mt-2 text-xs px-2 py-1 rounded inline-flex items-center gap-1 ${isDarkMode
                                                      ? "bg-slate-500/20 text-slate-300"
                                                      : "bg-slate-500/20 text-slate-700"
                                                      }`}
                                                  >
                                                    <User size={12} />
                                                    {subphase.employee_name || "Unknown"} ({subphase.employee_barcode})
                                                  </div>
                                                )}

                                                {/* Show completion time */}
                                                {subphase.completed_at && (
                                                  <div
                                                    className={`text-xs mt-2 ${isDarkMode ? "text-gray-400" : "text-gray-600"
                                                      }`}
                                                  >
                                                    <p className=" flex items-center gap-1">
                                                      <CheckCircle size={12} />
                                                      Completed: {new Date(subphase.completed_at).toLocaleString()}
                                                    </p>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {item.expected_completion_hours && item.actual_completion_hours && (
                                      <div className={`mt-3 p-3 rounded-lg border ${isDarkMode ? "bg-purple-500/10 border-purple-500/30" : "bg-purple-500/10 border-purple-500/30"
                                        }`}>
                                        <div className="flex items-center justify-between mb-2">
                                          <span className={`text-sm font-semibold flex items-center gap-2 ${isDarkMode ? "text-purple-300" : "text-purple-700"
                                            }`}>
                                            <Clock size={14} />
                                            Duration Analysis
                                          </span>
                                          <span className={`text-xs px-2 py-1 rounded font-bold ${item.actual_completion_hours > item.expected_completion_hours
                                              ? "bg-red-500/20 text-red-700 dark:text-red-300"
                                              : "bg-green-500/20 text-green-700 dark:text-green-300"
                                            }`}>
                                            {item.actual_completion_hours > item.expected_completion_hours ? "Over" : "Under"} by{" "}
                                            {Math.abs(item.actual_completion_hours - item.expected_completion_hours).toFixed(1)}h
                                          </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                          <div>
                                            <span className={isDarkMode ? "text-gray-400" : "text-gray-600"}>Expected: </span>
                                            <span className={`font-bold ${isDarkMode ? "text-purple-300" : "text-purple-700"}`}>
                                              {Number.parseFloat(item.expected_completion_hours).toFixed(1)}h
                                            </span>
                                          </div>
                                          <div>
                                            <span className={isDarkMode ? "text-gray-400" : "text-gray-600"}>Actual: </span>
                                            <span className={`font-bold ${isDarkMode ? "text-blue-300" : "text-blue-700"}`}>
                                              {Number.parseFloat(item.actual_completion_hours).toFixed(1)}h
                                            </span>
                                          </div>
                                        </div>
                                        <div className={`mt-2 w-full rounded-full h-2 ${isDarkMode ? "bg-gray-700" : "bg-gray-300"}`}>
                                          <div
                                            className={`h-2 rounded-full ${item.actual_completion_hours > item.expected_completion_hours
                                                ? "bg-red-500"
                                                : "bg-green-500"
                                              }`}
                                            style={{
                                              width: `${Math.min(100, (item.actual_completion_hours / item.expected_completion_hours * 100))}%`,
                                            }}
                                          ></div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )
                            })
                          ) : (
                            <p className={`text-gray-600 ${isDarkMode ? "dark:text-gray-400" : ""} py-4`}>No phases.</p>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className={`text-center py-8 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
          {!isFiltering && items.length === 0 ? (
            <p className={`text-center py-8 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
              {searchTerm || filterClient || filterPriority || filterStatus
                ? "No items match your search or filters."
                : 'No items yet. Go to "Add Items" to create your first item.'}
            </p>
          ) : null}
        </p>
      )}

      {/* Pagination Controls */}
      {!isFiltering && pagination.total_pages > 1 && (
        <div className={`backdrop-blur-md rounded-lg p-4 mt-6 border transition-all shadow-sm ${isDarkMode ? "bg-gray-800/60 border-gray-700/50" : "bg-white/30 border-white/40"
          }`}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Page Info */}
            <div className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
              Showing {((pagination.current_page - 1) * pagination.per_page) + 1} - {Math.min(pagination.current_page * pagination.per_page, pagination.total_items)} of {pagination.total_items} items
            </div>

            {/* Pagination Buttons */}
            <div className="flex items-center gap-2">
              {/* First Page */}
              <button
                onClick={() => handlePageChange(1)}
                disabled={!pagination.has_previous}
                className={`px-3 py-2 rounded-lg font-medium transition-colors ${pagination.has_previous
                    ? isDarkMode
                      ? "bg-gray-700 hover:bg-gray-600 text-gray-200"
                      : "bg-white/50 hover:bg-white/70 text-gray-700"
                    : "opacity-50 cursor-not-allowed"
                  }`}
              >
                ««
              </button>

              {/* Previous */}
              <button
                onClick={handlePreviousPage}
                disabled={!pagination.has_previous}
                className={`px-3 py-2 rounded-lg font-medium transition-colors ${pagination.has_previous
                    ? isDarkMode
                      ? "bg-gray-700 hover:bg-gray-600 text-gray-200"
                      : "bg-white/50 hover:bg-white/70 text-gray-700"
                    : "opacity-50 cursor-not-allowed"
                  }`}
              >
                « Previous
              </button>

              {/* Page Numbers */}
              <div className="flex gap-1">
                {(() => {
                  const pages = []
                  const showPages = 5
                  let startPage = Math.max(1, pagination.current_page - Math.floor(showPages / 2))
                  let endPage = Math.min(pagination.total_pages, startPage + showPages - 1)

                  if (endPage - startPage < showPages - 1) {
                    startPage = Math.max(1, endPage - showPages + 1)
                  }

                  for (let i = startPage; i <= endPage; i++) {
                    pages.push(
                      <button
                        key={i}
                        onClick={() => handlePageChange(i)}
                        className={`px-3 py-2 rounded-lg font-medium transition-colors ${pagination.current_page === i
                            ? isDarkMode ? "bg-slate-600 text-white" : "bg-slate-600 text-white"
                            : isDarkMode ? "bg-gray-700 hover:bg-gray-600 text-gray-200" : "bg-white/50 hover:bg-white/70 text-gray-700"
                          }`}
                      >
                        {i}
                      </button>
                    )
                  }
                  return pages
                })()}
              </div>

              {/* Next */}
              <button
                onClick={handleNextPage}
                disabled={!pagination.has_next}
                className={`px-3 py-2 rounded-lg font-medium transition-colors ${pagination.has_next
                    ? isDarkMode
                      ? "bg-gray-700 hover:bg-gray-600 text-gray-200"
                      : "bg-white/50 hover:bg-white/70 text-gray-700"
                    : "opacity-50 cursor-not-allowed"
                  }`}
              >
                Next »
              </button>

              {/* Last Page */}
              <button
                onClick={() => handlePageChange(pagination.total_pages)}
                disabled={!pagination.has_next}
                className={`px-3 py-2 rounded-lg font-medium transition-colors ${pagination.has_next
                    ? isDarkMode
                      ? "bg-gray-700 hover:bg-gray-600 text-gray-200"
                      : "bg-white/50 hover:bg-white/70 text-gray-700"
                    : "opacity-50 cursor-not-allowed"
                  }`}
              >
                »»
              </button>
            </div>

            {/* Items per page selector */}
            <div className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
              Page {pagination.current_page} of {pagination.total_pages}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Checklist
