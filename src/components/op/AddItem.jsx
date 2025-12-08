import { useState, useEffect, useRef } from "react"
import { Trash2, Plus, Copy, Search, User, Flag, Package, AlertTriangle, Sheet, Clock, CheckCircle } from "lucide-react"
import { useAuth } from "../../contexts/AuthContext"
import ExcelImportModal from "./ImportExcelItem"

function AddItems({ items, submitting, setSubmitting, apiService }) {
  const [partNumber, setPartNumber] = useState("")
  const [itemName, setItemName] = useState("")
  const [clientName, setClientName] = useState("")
  const [priority, setPriority] = useState("Medium")
  const [qty, setQty] = useState(1)
  const [phases, setPhases] = useState([])
  const [loadingTemplate, setLoadingTemplate] = useState(false)
  const [batchNumber, setBatchNumber] = useState("")
  const [autoBatch, setAutoBatch] = useState(true)
  const [clients, setClients] = useState([])
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const [filteredClients, setFilteredClients] = useState([])

  // Dropdown states
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false)
  const [filteredItems, setFilteredItems] = useState([])
  const [selectedTemplateId, setSelectedTemplateId] = useState(null)
  const dropdownRef = useRef(null)
  const clientDropdownRef = useRef(null)

  const { isDarkMode, user } = useAuth()
  const [showImportModal, setShowImportModal] = useState(false)

  const [isTemplateSelected, setIsTemplateSelected] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [searchPagination, setSearchPagination] = useState({
    current_page: 1,
    per_page: 10,
    total_items: 0,
    total_pages: 0,
    has_next: false,
    has_previous: false
  })

  const [itemNameHasFocus, setItemNameHasFocus] = useState(false)
  const searchTimeoutRef = useRef(null)

  const [expectedCompletionHours, setExpectedCompletionHours] = useState("")
  const [distributeDuration, setDistributeDuration] = useState(false)


  // Load existing clients on mount
  useEffect(() => {
    loadClients()
  }, [])

  const loadClients = async () => {
    try {
      const clientList = await apiService.operations.getClients()
      setClients(clientList)
    } catch (error) {
      console.error("Error loading clients:", error)
    }
  }

  // Generate batch number automatically
  useEffect(() => {
    if (autoBatch && partNumber) {
      const timestamp = new Date().getTime()
      const randomSuffix = Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, "0")
      setBatchNumber(`BATCH-${timestamp}-${randomSuffix}`)
    }
  }, [partNumber, autoBatch])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowTemplateDropdown(false)
      }
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target)) {
        setShowClientDropdown(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (isTemplateSelected) {
      setIsTemplateSelected(false)
      return
    }

    // Don't search if input doesn't have focus
    if (!itemNameHasFocus) {
      return
    }

    const searchTerm = itemName.trim().toLowerCase()

    if (searchTerm.length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        searchItemsFromAPI(searchTerm)
      }, 500) // Increased delay to 500ms
    } else {
      setFilteredItems([])
      setShowTemplateDropdown(false)
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [itemName, itemNameHasFocus, isTemplateSelected])

  // Auto-compute phase expected_hours from subphases
  useEffect(() => {
    setPhases(prevPhases => {
      return prevPhases.map(phase => {
        // Calculate total minutes from all subphases
        const totalMinutes = phase.subphases.reduce((sum, sub) => {
          return sum + (parseFloat(sub.expectedDuration) || 0)
        }, 0)

        // Convert minutes to hours (rounded to 2 decimals)
        const calculatedHours = (totalMinutes / 60).toFixed(2)

        // Only update if different from current value to avoid infinite loops
        if (phase.expected_hours !== calculatedHours && totalMinutes > 0) {
          return {
            ...phase,
            expected_hours: calculatedHours
          }
        }

        return phase
      })
    })
  }, [phases.map(p =>
    p.subphases.map(s => s.expectedDuration).join(',')
  ).join('|')])

  // Auto-compute item expected_completion_hours from phases
  useEffect(() => {
    const totalPhaseHours = phases.reduce((sum, phase) => {
      return sum + (parseFloat(phase.expected_hours) || 0)
    }, 0)

    // Only update if we have phases and the total is different
    if (phases.length > 0 && totalPhaseHours > 0) {
      const calculatedHours = totalPhaseHours.toFixed(2)

      // Only update if different to avoid infinite loops
      if (expectedCompletionHours !== calculatedHours) {
        setExpectedCompletionHours(calculatedHours)
      }
    }
  }, [phases.map(p => p.expected_hours).join(',')])

  const searchItemsFromAPI = async (searchTerm, page = 1) => {
    setIsSearching(true)
    try {
      const response = await apiService.operations.getItemsPaginated(page, 10, {
        search: searchTerm
      })

      setFilteredItems(response.items || [])
      setSearchPagination(response.pagination || {
        current_page: page,
        per_page: 10,
        total_items: 0,
        total_pages: 0,
        has_next: false,
        has_previous: false
      })
      setShowTemplateDropdown((response.items || []).length > 0)
    } catch (error) {
      console.error("Error searching items:", error)
      setFilteredItems([])
      setShowTemplateDropdown(false)
    } finally {
      setIsSearching(false)
    }
  }

  // Filter clients based on input
  useEffect(() => {
    const searchTerm = clientName.trim().toLowerCase()

    if (!Array.isArray(clients)) {
      setFilteredClients([])
      setShowClientDropdown(false)
      return
    }

    if (searchTerm.length >= 1) {
      const matches = clients.filter((client) => client.toLowerCase().includes(searchTerm))
      setFilteredClients(matches)
      setShowClientDropdown(matches.length > 0)
    } else {
      setFilteredClients(clients)
      setShowClientDropdown(false)
    }
  }, [clientName, clients])

  // Calculate total allocated quantity across all subphases
  const getTotalAllocatedQuantity = () => {
    let total = 0
    phases.forEach((phase) => {
      phase.subphases.forEach((sub) => {
        const subQty = Number.parseInt(sub.expectedQuantity) || 0
        total += subQty
      })
    })
    return total
  }

  const loadTemplateFromItem = async (item) => {
    setLoadingTemplate(true)
    setShowTemplateDropdown(false)
    setSelectedTemplateId(item.id)
    setItemNameHasFocus(false)
    setIsTemplateSelected(true)

    try {
      const fullItem = await apiService.operations.getItem(item.part_number)

      setPartNumber(fullItem.part_number.split("-")[0] || fullItem.part_number)
      setItemName(fullItem.name || "")
      setClientName(fullItem.client_name || "")
      setPriority(fullItem.priority || "Medium")
      setQty(fullItem.qty || 1)

      setExpectedCompletionHours(fullItem.expected_completion_hours || "")

      if (fullItem.phases && fullItem.phases.length > 0) {
        const loadedPhases = fullItem.phases.map((phase) => ({
          id: Date.now() + Math.random(),
          name: phase.name || "",
          expected_hours: phase.expected_hours || "",
          subphases:
            phase.subphases?.map((sub) => ({
              id: Date.now() + Math.random(),
              name: sub.name || "",
              expectedDuration: sub.expected_duration ? (sub.expected_duration / 60).toString() : "",
              expectedQuantity: sub.expected_quantity || "",
            })) || [],
        }))
        setPhases(loadedPhases)
      }
    } catch (error) {
      console.error("Error loading template:", error)
      alert("Error loading template: " + error.message)
    } finally {
      setLoadingTemplate(false)
    }
  }

  const addNewPhase = () => {
    setPhases([
      ...phases,
      {
        id: Date.now(),
        name: "",
        subphases: [],
      },
    ])
  }

  const updatePhase = (phaseId, field, value) => {
    setPhases(phases.map((phase) => (phase.id === phaseId ? { ...phase, [field]: value } : phase)))
  }
  const removePhase = (phaseId) => {
    setPhases(phases.filter((phase) => phase.id !== phaseId))
  }

  const addSubphaseToPhase = (phaseId) => {
    setPhases(
      phases.map((phase) =>
        phase.id === phaseId
          ? {
            ...phase,
            subphases: [
              ...phase.subphases,
              {
                id: Date.now(),
                name: "",
                expectedDuration: "",
                expectedQuantity: "",
              },
            ],
          }
          : phase,
      ),
    )
  }


  const updateSubphase = (phaseId, subphaseId, field, value) => {
    setPhases(
      phases.map((phase) =>
        phase.id === phaseId
          ? {
            ...phase,
            subphases: phase.subphases.map((sub) => {
              if (sub.id === subphaseId) {
                // If updating expectedQuantity, validate against batch quantity
                if (field === "expectedQuantity") {
                  const newValue = Number.parseInt(value) || 0
                  const batchQty = Number.parseInt(qty) || 0

                  // Calculate total from other subphases (excluding current one)
                  let otherSubphasesTotal = 0
                  phases.forEach((p) => {
                    p.subphases.forEach((s) => {
                      if (!(p.id === phaseId && s.id === subphaseId)) {
                        otherSubphasesTotal += Number.parseInt(s.expectedQuantity) || 0
                      }
                    })
                  })

                  const totalIfUpdated = otherSubphasesTotal + newValue

                  if (totalIfUpdated > batchQty) {
                    alert(`Cannot exceed batch quantity of ${batchQty}. Current total would be ${totalIfUpdated}.`)
                    return sub
                  }
                }

                // NEW: If updating expectedDuration, validate against phase expected_hours
                if (field === "expectedDuration") {
                  const newMinutes = Number.parseFloat(value) || 0

                  // Check if phase has expected_hours set
                  if (phase.expected_hours) {
                    // Calculate total minutes from other subphases (excluding current one)
                    let otherSubphasesDuration = 0
                    phase.subphases.forEach((s) => {
                      if (s.id !== subphaseId) {
                        otherSubphasesDuration += Number.parseFloat(s.expectedDuration) || 0
                      }
                    })

                    const totalDurationIfUpdated = otherSubphasesDuration + newMinutes
                    const phaseMinutes = hoursToMinutes(phase.expected_hours)

                    if (totalDurationIfUpdated > phaseMinutes) {
                      const remainingMinutes = phaseMinutes - otherSubphasesDuration
                      alert(
                        `Cannot exceed phase allocation!\n\n` +
                        `Phase "${phase.name}" has ${phase.expected_hours} hours (${phaseMinutes.toFixed(0)} minutes).\n` +
                        `Current total: ${otherSubphasesDuration.toFixed(0)} minutes\n` +
                        `Remaining: ${remainingMinutes.toFixed(0)} minutes\n\n` +
                        `You can allocate up to ${remainingMinutes.toFixed(1)} minutes for this subphase.`
                      )
                      return sub
                    }
                  }
                }

                return { ...sub, [field]: value }
              }
              return sub
            }),
          }
          : phase,
      ),
    )
  }

  const removeSubphase = (phaseId, subphaseId) => {
    setPhases(
      phases.map((phase) =>
        phase.id === phaseId
          ? {
            ...phase,
            subphases: phase.subphases.filter((sub) => sub.id !== subphaseId),
          }
          : phase,
      ),
    )
  }

  const handleSave = async () => {
    if (!partNumber.trim()) {
      alert("Part Number is required")
      return
    }
    if (!itemName.trim()) {
      alert("Item Name is required")
      return
    }
    if (!batchNumber.trim()) {
      alert("Batch Number is required")
      return
    }
    if (!clientName.trim()) {
      alert("Client Name is required")
      return
    }

    const validPhases = phases.filter((p) => p.name.trim())
    if (validPhases.length === 0) {
      alert("Please add at least one phase")
      return
    }

    const totalQty = getTotalAllocatedQuantity()
    const batchQty = Number.parseInt(qty) || 0

    if (totalQty > batchQty) {
      alert(`Total allocated quantity (${totalQty}) cannot exceed batch quantity (${batchQty})`)
      return
    }

    for (const phase of validPhases) {
      if (phase.expected_hours) {
        const phaseStats = getPhaseRemainingDuration(phase)

        if (phaseStats.isOverAllocated) {
          alert(
            `Phase "${phase.name}" duration over-allocated!\n\n` +
            `Phase allocation: ${phase.expected_hours} hours (${phaseStats.totalMinutes.toFixed(0)} minutes)\n` +
            `Subphases total: ${phaseStats.allocatedMinutes.toFixed(0)} minutes\n` +
            `Over by: ${Math.abs(phaseStats.remainingMinutes).toFixed(0)} minutes\n\n` +
            `Please adjust subphase durations.`
          )
          return
        }
      }
    }

    const uniquePartNumber = `${partNumber.trim()}-${batchNumber.trim()}`
    const totalExpectedHours = getTotalAllocatedExpectedHours()
    const itemExpectedHours = Number.parseFloat(expectedCompletionHours) || null

    const itemData = {
      part_number: uniquePartNumber,
      name: itemName.trim(),
      client_name: clientName.trim(),
      priority: priority,
      qty: Number.parseInt(qty) || 1,
      total_qty: totalQty,
      expected_completion_hours: itemExpectedHours,
      performed_by_uid: user?.uid || null,
      performed_by_name: user?.name || null,
      phases: validPhases.map((phase) => ({
        name: phase.name.trim(),
        expected_hours: Number.parseFloat(phase.expected_hours) || null,
        subphases: phase.subphases
          .filter((sub) => sub.name.trim())
          .map((sub) => ({
            name: sub.name.trim(),
            expected_duration: (Number.parseFloat(sub.expectedDuration) || 0) * 60,
            expected_quantity: Number.parseInt(sub.expectedQuantity) || 0,
          })),
      })),
    }

    setSubmitting(true)

    try {
      // Step 1: Create the operations item
      console.log("📝 Creating operations item...")
      await apiService.operations.createItemWithStructure(itemData)
      console.log("✅ Operations item created successfully")

      // Step 3: Clear form and show success
      setPartNumber("")
      setItemName("")
      setClientName("")
      setPriority("Medium")
      setQty(1)
      setPhases([])
      setBatchNumber("")
      setSelectedTemplateId(null)
      setExpectedCompletionHours("")

      alert("✅ Item saved successfully!")
      window.location.reload()

    } catch (error) {
      console.error("❌ Error saving item:", error)
      alert("Error saving item: " + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleClear = () => {
    if (confirm("Clear all fields?")) {
      setPartNumber("")
      setItemName("")
      setClientName("")
      setPriority("Medium")
      setExpectedCompletionHours("")
      setDistributeDuration(false)
      setQty(1)
      setPhases([])
      setBatchNumber("")
      setSelectedTemplateId(null)
      setShowTemplateDropdown(false)
      setShowClientDropdown(false)
    }
  }

  const getTotalAllocatedExpectedHours = () => {
    let total = 0
    phases.forEach((phase) => {
      if (phase.expected_hours) {
        total += Number.parseFloat(phase.expected_hours) || 0
      } else {
        // Sum subphase expected durations if phase doesn't have expected_hours
        phase.subphases.forEach((sub) => {
          total += Number.parseFloat(sub.expectedDuration) || 0
        })
      }
    })
    return total
  }

  const handleDistributeDuration = () => {
    const totalHours = Number.parseFloat(expectedCompletionHours) || 0
    if (totalHours <= 0 || phases.length === 0) {
      alert("Please enter a valid expected completion time and add at least one phase")
      return
    }

    // Distribute hours equally across phases
    const hoursPerPhase = totalHours / phases.length

    const updatedPhases = phases.map((phase) => ({
      ...phase,
      expected_hours: hoursPerPhase.toFixed(2)
    }))

    setPhases(updatedPhases)
    alert(`Distributed ${totalHours} hours equally: ${hoursPerPhase.toFixed(2)} hours per phase`)
  }

  // Calculate total allocated subphase duration for a specific phase (in minutes)
  const getTotalSubphaseDurationForPhase = (phase) => {
    let total = 0
    phase.subphases.forEach((sub) => {
      const minutes = Number.parseFloat(sub.expectedDuration) || 0
      total += minutes
    })
    return total
  }

  // Convert minutes to hours for display
  const minutesToHours = (minutes) => {
    return (Number.parseFloat(minutes) / 60).toFixed(2)
  }

  // Check if phase has remaining duration available

  const getPhaseRemainingDuration = (phase) => {
    if (!phase.expected_hours) return null

    // Convert phase hours to minutes with proper rounding
    const phaseMinutes = Math.round(parseFloat(phase.expected_hours) * 60)

    // Calculate total allocated minutes from subphases
    const allocatedMinutes = getTotalSubphaseDurationForPhase(phase)

    // Calculate remaining with proper rounding
    const remaining = phaseMinutes - allocatedMinutes

    return {
      totalMinutes: phaseMinutes,
      allocatedMinutes: allocatedMinutes,
      remainingMinutes: remaining,
      remainingHours: minutesToHours(remaining),
      // Only consider over-allocated if truly exceeds (not just rounding difference)
      isOverAllocated: remaining < -0.5 // Allow 0.5 minute tolerance for rounding
    }
  }

  // Also update the hoursToMinutes helper function for consistency
  const hoursToMinutes = (hours) => {
    return Math.round(parseFloat(hours) * 60)
  }

  const getTotalPhaseHours = () => {
    return phases.reduce((sum, phase) => {
      return sum + (Number.parseFloat(phase.expected_hours) || 0)
    }, 0)
  }

  const getItemRemainingHours = () => {
    if (!expectedCompletionHours) return null

    const itemHours = Number.parseFloat(expectedCompletionHours)
    const allocatedHours = getTotalPhaseHours()
    const remaining = itemHours - allocatedHours

    return {
      itemHours: itemHours,
      allocatedHours: allocatedHours,
      remainingHours: remaining,
      isOverAllocated: remaining < 0
    }
  }

  const getPriorityColor = (priorityValue) => {
    switch (priorityValue) {
      case "High":
        return "bg-red-500/20 text-red-700 border-red-500"
      case "Medium":
        return "bg-yellow-500/20 text-yellow-700 border-yellow-500"
      case "Low":
        return "bg-green-500/20 text-green-700 border-green-500"
      default:
        return "bg-gray-500/20 text-gray-700 border-gray-500"
    }
  }

  const totalQty = getTotalAllocatedQuantity()
  const batchQty = Number.parseInt(qty) || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className={`text-2xl font-bold ${isDarkMode ? "text-gray-100" : "text-gray-800"}`}>
            Add Item with Phases & Sub-Phases
          </h2>
          {loadingTemplate && (
            <span className={`text-sm flex items-center gap-2 mt-2 ${isDarkMode ? "text-blue-400" : "text-blue-500"}`}>
              <div className={`animate-spin rounded-full h-4 w-4 border-b-2 ${isDarkMode ? "border-blue-400" : "border-blue-500"}`}></div>
              Loading template...
            </span>
          )}
        </div>

        {/* Import Button */}
        <button
          onClick={() => setShowImportModal(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg transition-all shadow-lg hover:shadow-xl font-medium text-sm sm:text-base w-full sm:w-auto justify-center"
        >
          <Sheet size={20} />
          Import from Excel
        </button>
      </div>

      {/* Item Basic Info */}
      <div
        className={`backdrop-blur-md rounded-lg p-4 sm:p-6 border transition-all shadow-sm ${isDarkMode ? "bg-gray-800/60 border-gray-700/50" : "bg-white/30 border-white/40"
          }`}
      >
        <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? "text-gray-100" : "text-gray-800"}`}>
          Item Information
        </h3>
        <div className="space-y-3">
          {/* Part Number */}
          <div>
            <label className={`block text-sm font-medium mb-1 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
              Part Number *{" "}
              <span className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>(Base part number)</span>
            </label>
            <input
              type="text"
              placeholder="Enter base part number (e.g., PN-001)"
              value={partNumber}
              onChange={(e) => setPartNumber(e.target.value)}
              disabled={submitting}
              className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-all ${isDarkMode
                ? "bg-gray-700/50 border border-gray-600/50 text-gray-100 placeholder-gray-400"
                : "bg-white/50 border border-gray-300/30 text-gray-800 placeholder-gray-500"
                }`}
            />
          </div>

          {/* Batch Number */}
          <div>
            <label className={`text-sm font-medium mb-1 flex items-center gap-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
              <Package size={16} />
              Batch Number *
              <span className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                (Unique identifier for this batch)
              </span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Batch number"
                value={batchNumber}
                onChange={(e) => {
                  setBatchNumber(e.target.value)
                  setAutoBatch(false)
                }}
                disabled={submitting || autoBatch}
                className={`flex-1 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-all ${isDarkMode
                  ? "bg-gray-700/50 border border-gray-600/50 text-gray-100 placeholder-gray-400"
                  : "bg-white/50 border border-gray-300/30 text-gray-800 placeholder-gray-500"
                  }`}
              />
              <button
                onClick={() => setAutoBatch(!autoBatch)}
                className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base ${autoBatch
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : isDarkMode
                    ? "bg-gray-700 hover:bg-gray-600 text-white"
                    : "bg-gray-600 hover:bg-gray-700 text-white"
                  }`}
                title={autoBatch ? "Auto-generate enabled" : "Auto-generate disabled"}
              >
                {autoBatch ? "Auto" : "Manual"}
              </button>
            </div>
            {partNumber && batchNumber && (
              <p className={`text-xs mt-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                Final Part Number:{" "}
                <span className={`font-mono font-bold ${isDarkMode ? "text-gray-100" : "text-gray-800"}`}>
                  {partNumber}-{batchNumber}
                </span>
              </p>
            )}
          </div>

          {/* Expected Completion Time */}
          <div>
            <label className={` text-sm font-medium mb-1 flex flex-wrap items-center gap-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
              <Clock size={16} />
              <span>Expected Completion Time (Hours)</span>
              <span className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                (Optional - Total hours to complete this item)
              </span>
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="number"
                step="0.5"
                min="0"
                placeholder="e.g., 24 hours or 1 day"
                value={expectedCompletionHours}
                readOnly
                disabled={submitting}
                className={`flex-1 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-all ${isDarkMode
                  ? "bg-gray-700/50 border border-gray-600/50 text-gray-100 placeholder-gray-400"
                  : "bg-white/50 border border-gray-300/30 text-gray-800 placeholder-gray-500"
                  }`}
              />

            </div>
            {expectedCompletionHours && (
              <p className={`text-xs mt-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                Total expected: <span className="font-bold">{expectedCompletionHours} hours</span>
                {phases.length > 0 && (
                  <>
                    {" "}• Average per phase:{" "}
                    <span className="font-bold">{(parseFloat(expectedCompletionHours) / phases.length).toFixed(2)} hours</span>
                  </>
                )}
              </p>
            )}
          </div>

          {/* Item Duration Allocation */}
          {expectedCompletionHours && phases.length > 0 && (
            <div
              className={`mt-4 p-3 sm:p-4 rounded-lg border-2 ${(() => {
                const stats = getItemRemainingHours()
                return stats?.isOverAllocated
                  ? isDarkMode
                    ? "bg-red-500/10 border-red-500/30"
                    : "bg-red-500/10 border-red-500/30"
                  : isDarkMode
                    ? "bg-purple-500/10 border-purple-500/30"
                    : "bg-purple-500/10 border-purple-500/30"
              })()}`}
            >
              <h4 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}>
                <Clock size={16} />
                Item Duration Allocation
              </h4>

              {(() => {
                const stats = getItemRemainingHours()
                if (!stats) return null

                return (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 text-xs sm:text-sm">
                      <div className="flex justify-between items-center">
                        <span className={isDarkMode ? "text-gray-300" : "text-gray-600"}>Item Expected:</span>
                        <span className={`font-bold ${isDarkMode ? "text-purple-300" : "text-purple-700"}`}>
                          {stats.itemHours} hrs
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className={isDarkMode ? "text-gray-300" : "text-gray-600"}>Phases Allocated:</span>
                        <span
                          className={`font-bold ${stats.isOverAllocated
                            ? isDarkMode
                              ? "text-red-300"
                              : "text-red-700"
                            : isDarkMode
                              ? "text-blue-300"
                              : "text-blue-700"
                            }`}
                        >
                          {stats.allocatedHours.toFixed(2)} hrs
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className={isDarkMode ? "text-gray-300" : "text-gray-600"}>Remaining:</span>
                        <span
                          className={`font-bold ${stats.isOverAllocated
                            ? isDarkMode
                              ? "text-red-300"
                              : "text-red-700"
                            : isDarkMode
                              ? "text-green-300"
                              : "text-green-700"
                            }`}
                        >
                          {stats.remainingHours.toFixed(2)} hrs
                        </span>
                      </div>
                    </div>

                    <div className={`mt-3 w-full rounded-full h-2 ${isDarkMode ? "bg-gray-700" : "bg-gray-300"}`}>
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${stats.isOverAllocated ? "bg-red-500" : "bg-purple-500"}`}
                        style={{
                          width: `${Math.min(100, (stats.allocatedHours / stats.itemHours) * 100)}%`,
                        }}
                      ></div>
                    </div>

                    {stats.isOverAllocated && (
                      <div className={`flex items-center gap-2 mt-3 ${isDarkMode ? "text-red-300" : "text-red-700"}`}>
                        <AlertTriangle size={16} />
                        <span className="text-xs font-medium">Over-allocated by {Math.abs(stats.remainingHours).toFixed(2)} hours!</span>
                      </div>
                    )}

                    {!stats.isOverAllocated && stats.remainingHours === 0 && (
                      <div className={`flex items-center gap-2 mt-3 ${isDarkMode ? "text-green-300" : "text-green-700"}`}>
                        <CheckCircle size={16} />
                        <span className="text-xs font-medium">Fully allocated</span>
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
          )}

          {/* Item Name with Template Search */}
          <div className="relative" ref={dropdownRef}>
            <label className={`block text-sm font-medium mb-1 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
              Item Name *
              {selectedTemplateId && (
                <span className="ml-2 text-xs bg-green-500 text-white px-2 py-0.5 rounded">Template Loaded</span>
              )}
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Enter item name or search existing to use as template..."
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                onFocus={() => setItemNameHasFocus(true)}
                onBlur={() => {
                  setTimeout(() => setItemNameHasFocus(false), 200)
                }}
                disabled={submitting}
                className={`w-full px-4 py-2 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-all ${isDarkMode
                  ? "bg-gray-700/50 border border-gray-600/50 text-gray-100 placeholder-gray-400"
                  : "bg-white/50 border border-gray-300/30 text-gray-800 placeholder-gray-500"
                  }`}
              />
              {isSearching ? (
                <div
                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 animate-spin rounded-full h-4 w-4 border-b-2 ${isDarkMode ? "border-blue-400" : "border-blue-600"
                    }`}
                ></div>
              ) : (
                <Search
                  size={18}
                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                />
              )}
            </div>

            {showTemplateDropdown && filteredItems.length > 0 && (
              <div
                className={`absolute z-10 w-full mt-1 rounded-lg shadow-lg border ${isDarkMode ? "bg-gray-800 border-gray-600" : "bg-white border-gray-300"
                  }`}
              >
                <div className={`p-2 border-b ${isDarkMode ? "bg-gray-700 border-gray-600" : "bg-gray-100 border-gray-300"}`}>
                  <div className="flex items-center justify-between">
                    <p className={`text-xs font-medium ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
                      {isSearching ? "Searching..." : `Select a template (${searchPagination.total_items} found)`}
                    </p>
                    {isSearching && (
                      <div
                        className={`animate-spin rounded-full h-3 w-3 border-b-2 ${isDarkMode ? "border-blue-400" : "border-blue-600"}`}
                      ></div>
                    )}
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto">
                  {filteredItems.map((item) => {
                    const itemKey = item.part_number || item.id
                    return (
                      <button
                        key={itemKey}
                        onClick={() => loadTemplateFromItem(item)}
                        disabled={loadingTemplate}
                        className={`w-full text-left px-4 py-3 border-b last:border-b-0 transition-colors disabled:opacity-50 ${isDarkMode
                          ? "hover:bg-gray-700 border-gray-700 text-gray-100"
                          : "hover:bg-gray-50 border-gray-200 text-gray-800"
                          }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className={`font-medium ${isDarkMode ? "text-gray-100" : "text-gray-800"}`}>{item.name}</p>
                            <p className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>Part #: {item.part_number}</p>
                            {item.client_name && (
                              <p className={`text-xs mt-1 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}>
                                Client: {item.client_name}
                              </p>
                            )}
                          </div>
                          <div className={`flex items-center gap-2 text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                            <span
                              className={`px-2 py-1 rounded ${isDarkMode ? "bg-blue-500/20 text-blue-300" : "bg-blue-500/20 text-blue-700"
                                }`}
                            >
                              {item.phases?.length || item.phase_count || 0} phases
                            </span>
                            <Copy size={14} />
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>

                {searchPagination.total_pages > 1 && (
                  <div className={`p-2 border-t ${isDarkMode ? "bg-gray-700 border-gray-600" : "bg-gray-100 border-gray-300"}`}>
                    <div className="flex items-center justify-between text-xs">
                      <button
                        onClick={() => searchItemsFromAPI(itemName.trim().toLowerCase(), searchPagination.current_page - 1)}
                        disabled={!searchPagination.has_previous || isSearching}
                        className={`px-2 py-1 rounded transition-colors ${searchPagination.has_previous && !isSearching
                          ? isDarkMode
                            ? "bg-gray-600 hover:bg-gray-500 text-gray-200"
                            : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                          : "opacity-50 cursor-not-allowed text-gray-500"
                          }`}
                      >
                        Previous
                      </button>

                      <span className={isDarkMode ? "text-gray-300" : "text-gray-600"}>
                        Page {searchPagination.current_page} of {searchPagination.total_pages}
                      </span>

                      <button
                        onClick={() => searchItemsFromAPI(itemName.trim().toLowerCase(), searchPagination.current_page + 1)}
                        disabled={!searchPagination.has_next || isSearching}
                        className={`px-2 py-1 rounded transition-colors ${searchPagination.has_next && !isSearching
                          ? isDarkMode
                            ? "bg-gray-600 hover:bg-gray-500 text-gray-200"
                            : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                          : "opacity-50 cursor-not-allowed text-gray-500"
                          }`}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Client Name with Dropdown */}
          <div className="relative" ref={clientDropdownRef}>
            <label className={` text-sm font-medium mb-1 flex items-center gap-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
              <User size={16} />
              Client Name *
            </label>
            <input
              type="text"
              placeholder="Enter or select client name"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              onFocus={() => setShowClientDropdown(clients.length > 0)}
              disabled={submitting}
              className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-all ${isDarkMode
                ? "bg-gray-700/50 border border-gray-600/50 text-gray-100 placeholder-gray-400"
                : "bg-white/50 border border-gray-300/30 text-gray-800 placeholder-gray-500"
                }`}
            />

            {showClientDropdown && filteredClients.length > 0 && (
              <div
                className={`absolute z-10 w-full mt-1 rounded-lg shadow-lg max-h-40 overflow-y-auto border ${isDarkMode ? "bg-gray-800 border-gray-600" : "bg-white border-gray-300"
                  }`}
              >
                {filteredClients.map((client, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setClientName(client)
                      setShowClientDropdown(false)
                    }}
                    className={`w-full text-left px-4 py-2 border-b last:border-b-0 transition-colors ${isDarkMode ? "hover:bg-gray-700 border-gray-700 text-gray-100" : "hover:bg-gray-50 border-gray-200 text-gray-800"
                      }`}
                  >
                    {client}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Priority */}
          <div>
            <label className={` text-sm font-medium mb-1 flex items-center gap-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
              <Flag size={16} />
              Priority *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {["High", "Medium", "Low"].map((p) => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`px-4 py-2 rounded-lg border-2 font-medium transition-colors text-sm sm:text-base ${priority === p
                    ? getPriorityColor(p)
                    : isDarkMode
                      ? "bg-gray-700/50 text-gray-300 border-gray-600 hover:bg-gray-700"
                      : "bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200"
                    }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Batch Quantity */}
          <div>
            <label className={` text-sm font-medium mb-1 flex flex-wrap items-center gap-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
              <Package size={16} />
              <span>Batch Quantity *</span>
              <span className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>(Items in this batch)</span>
            </label>
            <input
              type="number"
              min="1"
              placeholder="Enter batch quantity"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              disabled={submitting}
              className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-all ${isDarkMode
                ? "bg-gray-700/50 border border-gray-600/50 text-gray-100 placeholder-gray-400"
                : "bg-white/50 border border-gray-300/30 text-gray-800 placeholder-gray-500"
                }`}
            />
          </div>

          {/* Quantity Summary */}
          <div
            className={`mt-4 p-3 sm:p-4 rounded-lg border-2 ${isDarkMode ? "bg-blue-500/10 border-blue-500/30" : "bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/30"
              }`}
          >
            <h4 className={`text-sm font-semibold mb-3 ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}>Quantity Summary</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
              <div className="flex justify-between items-center">
                <span className={isDarkMode ? "text-gray-300" : "text-gray-600"}>Batch Quantity (qty):</span>
                <span className={`font-bold ${isDarkMode ? "text-blue-300" : "text-blue-700"}`}>{batchQty} units</span>
              </div>

              <div className="flex justify-between items-center">
                <span className={isDarkMode ? "text-gray-300" : "text-gray-600"}>Total Expected:</span>
                <span className={`font-bold ${isDarkMode ? "text-purple-300" : "text-purple-700"}`}>{totalQty} units</span>
              </div>
            </div>

            {totalQty > 0 && (
              <div className={`mt-3 pt-3 border-t ${isDarkMode ? "border-gray-600/30" : "border-gray-300/30"}`}>
                <p className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                  <strong>Note:</strong> qty = Expected batch quantity | total_qty = Sum of current completed quantities (updates as work
                  progresses)
                </p>
              </div>
            )}
          </div>

          {/* Total Quantity Display */}
          {phases.length > 0 && (
            <div
              className={`p-3 sm:p-4 rounded-lg border-2 ${totalQty > batchQty
                ? isDarkMode
                  ? "bg-red-500/10 border-red-500/40"
                  : "bg-red-500/10 border-red-500/30"
                : isDarkMode
                  ? "bg-blue-500/10 border-blue-500/40"
                  : "bg-blue-500/10 border-blue-500/30"
                }`}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-2">
                <span className={`text-sm font-semibold ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}>Total Quantity Allocation</span>
                <span
                  className={`text-lg font-bold ${totalQty > batchQty ? (isDarkMode ? "text-red-300" : "text-red-700") : isDarkMode ? "text-blue-300" : "text-blue-700"
                    }`}
                >
                  {totalQty} / {batchQty} units
                </span>
              </div>
              {totalQty > batchQty && (
                <div className={`flex items-center gap-2 mt-2 ${isDarkMode ? "text-red-300" : "text-red-600"}`}>
                  <AlertTriangle size={16} />
                  <p className="text-xs font-medium">Total exceeds batch quantity by {totalQty - batchQty} units!</p>
                </div>
              )}
              <p className={`text-xs mt-2 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                This is the total_qty field - calculated from all subphase expected quantities
              </p>
            </div>
          )}

          {/* Expected Duration Summary */}
          {(expectedCompletionHours || phases.some((p) => p.expected_hours || p.subphases.some((s) => s.expectedDuration))) && (
            <div
              className={`mt-4 p-3 sm:p-4 rounded-lg border-2 ${isDarkMode ? "bg-purple-500/10 border-purple-500/30" : "bg-purple-500/10 border-purple-500/30"
                }`}
            >
              <h4 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}>
                <Clock size={16} />
                Expected Duration Summary
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
                {expectedCompletionHours && (
                  <div className="flex justify-between items-center">
                    <span className={isDarkMode ? "text-gray-300" : "text-gray-600"}>Item Expected Completion:</span>
                    <span className={`font-bold ${isDarkMode ? "text-purple-300" : "text-purple-700"}`}>{expectedCompletionHours} hours</span>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className={isDarkMode ? "text-gray-300" : "text-gray-600"}>Total Allocated:</span>
                  <span className={`font-bold ${isDarkMode ? "text-blue-300" : "text-blue-700"}`}>
                    {getTotalAllocatedExpectedHours().toFixed(2)} hours
                  </span>
                </div>
              </div>

              <div className={`mt-3 pt-3 border-t ${isDarkMode ? "border-gray-600/30" : "border-gray-300/30"}`}>
                <p className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                  <strong>Note:</strong> Expected hours help track performance. Actual duration will be tracked automatically as work
                  progresses, allowing you to compare and improve estimates over time.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Phases Section */}
      <div
        className={`backdrop-blur-md rounded-lg p-4 sm:p-6 border transition-all shadow-sm ${isDarkMode ? "bg-gray-800/60 border-gray-700/50" : "bg-white/30 border-white/40"
          }`}
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <h3 className={`text-lg font-semibold ${isDarkMode ? "text-gray-100" : "text-gray-800"}`}>Phases</h3>
          <button
            onClick={addNewPhase}
            disabled={submitting}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium disabled:opacity-50 w-full sm:w-auto justify-center"
          >
            <Plus size={16} />
            Add Phase
          </button>
        </div>

        {phases.length === 0 ? (
          <p className={`text-center py-4 text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
            No phases added yet. Click "Add Phase" to get started or search for an existing item above to use as template.
          </p>
        ) : (
          <div className="space-y-4">
            {phases.map((phase, phaseIndex) => (
              <div
                key={phase.id}
                className={`rounded-lg p-3 sm:p-4 border ${isDarkMode ? "bg-gray-700/40 border-gray-600/50" : "bg-white/40 border-gray-300/30"}`}
              >
                {/* Phase Input Row */}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-3">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder={`Phase ${phaseIndex + 1} Name (e.g., Design, Development)`}
                      value={phase.name}
                      onChange={(e) => updatePhase(phase.id, "name", e.target.value)}
                      disabled={submitting}
                      className={`w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-all text-sm sm:text-base ${isDarkMode
                        ? "bg-gray-800/50 border border-gray-600/50 text-gray-100 placeholder-gray-400"
                        : "bg-white/50 border border-gray-300/30 text-gray-800 placeholder-gray-500"
                        }`}
                    />
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      placeholder="Expected hrs"
                      value={phase.expected_hours || ""}
                      readOnly
                      disabled={submitting}
                      className={`w-full sm:w-32 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 transition-all text-sm sm:text-base ${isDarkMode
                        ? "bg-gray-800/50 border border-gray-600/50 text-gray-100 placeholder-gray-400"
                        : "bg-white/50 border border-gray-300/30 text-gray-800 placeholder-gray-500"
                        }`}
                      title="Auto-calculated from subphases (read-only)"
                    />

                    <button
                      onClick={() => removePhase(phase.id)}
                      disabled={submitting}
                      className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${isDarkMode ? "text-red-400 hover:bg-red-500/20" : "text-red-500 hover:bg-red-500/10"
                        }`}
                      title="Remove phase"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {/* Phase Duration Allocation - PLACED AFTER INPUT ROW */}
                {phase.expected_hours && (
                  <div
                    className={`mb-3 p-3 rounded text-xs ${(() => {
                      const stats = getPhaseRemainingDuration(phase)
                      return stats?.isOverAllocated
                        ? isDarkMode
                          ? "bg-red-500/10 border border-red-500/30 text-red-300"
                          : "bg-red-500/10 border border-red-500/30 text-red-700"
                        : isDarkMode
                          ? "bg-purple-500/10 border border-purple-500/30 text-purple-300"
                          : "bg-purple-500/10 border border-purple-500/30 text-purple-700"
                    })()
                      }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-2">
                      <span className="font-medium text-sm">Phase Duration Allocation</span>
                      <span className="font-bold text-sm sm:text-base">
                        {Math.round(getTotalSubphaseDurationForPhase(phase))} / {Math.round(hoursToMinutes(phase.expected_hours))} min
                      </span>
                    </div>

                    {(() => {
                      const stats = getPhaseRemainingDuration(phase)
                      if (!stats) return null

                      return (
                        <>
                          <div className={`w-full rounded-full h-2 ${isDarkMode ? "bg-gray-700" : "bg-gray-300"}`}>
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${stats.isOverAllocated ? "bg-red-500" : "bg-purple-500"
                                }`}
                              style={{
                                width: `${Math.min(100, (stats.allocatedMinutes / stats.totalMinutes) * 100)}%`,
                              }}
                            ></div>
                          </div>

                          <div className="mt-2 space-y-1">
                            {stats.isOverAllocated ? (
                              <div className="flex items-start sm:items-center gap-2">
                                <AlertTriangle size={14} className="flex-shrink-0 mt-0.5 sm:mt-0" />
                                <span className="font-medium text-xs sm:text-sm break-words">
                                  Over-allocated by {Math.round(Math.abs(stats.remainingMinutes))} min ({Math.abs(parseFloat(stats.remainingHours)).toFixed(2)}h)
                                </span>
                              </div>
                            ) : Math.abs(stats.remainingMinutes) < 0.5 ? (
                              // When difference is less than 0.5 minutes, consider it fully allocated
                              <div className="flex items-center gap-2">
                                <CheckCircle size={14} className="flex-shrink-0" />
                                <span className="text-xs sm:text-sm font-medium">Fully allocated</span>
                              </div>
                            ) : stats.remainingMinutes > 0 ? (
                              <div className="text-xs sm:text-sm">
                                Remaining: <span className="font-semibold">{Math.round(stats.remainingMinutes)} min</span> (
                                {parseFloat(stats.remainingHours).toFixed(2)}h)
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <CheckCircle size={14} className="flex-shrink-0" />
                                <span className="text-xs sm:text-sm font-medium">Fully allocated</span>
                              </div>
                            )}
                          </div>
                        </>
                      )
                    })()}
                  </div>
                )}

                {/* Subphases Section */}
                <div className="ml-0 sm:ml-4 space-y-2">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
                    <span className={`text-sm font-medium ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}>Sub-Phases</span>
                    <button
                      onClick={() => addSubphaseToPhase(phase.id)}
                      disabled={submitting}
                      className={`flex items-center gap-1 text-sm px-3 py-1.5 rounded transition-colors disabled:opacity-50 w-full sm:w-auto justify-center ${isDarkMode ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-slate-600 hover:bg-slate-700 text-white"
                        }`}
                    >
                      <Plus size={14} />
                      Add Sub-Phase
                    </button>
                  </div>

                  {phase.subphases.length === 0 ? (
                    <p className={`text-sm italic ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>No sub-phases yet</p>
                  ) : (
                    phase.subphases.map((subphase, subIndex) => {
                      return (
                        <div key={subphase.id} className={`rounded p-3 space-y-2 ${isDarkMode ? "bg-gray-800/50" : "bg-white/50"}`}>
                          {/* Name Input */}
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder={`Sub-phase ${subIndex + 1} name`}
                              value={subphase.name}
                              onChange={(e) => updateSubphase(phase.id, subphase.id, "name", e.target.value)}
                              disabled={submitting}
                              className={`flex-1 px-3 py-1.5 text-sm rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-all ${isDarkMode
                                ? "bg-gray-700/50 border border-gray-600/50 text-gray-100 placeholder-gray-400"
                                : "bg-white/60 border border-gray-300/30 text-gray-800 placeholder-gray-500"
                                }`}
                            />
                            <button
                              onClick={() => removeSubphase(phase.id, subphase.id)}
                              disabled={submitting}
                              className={`p-1.5 rounded transition-colors disabled:opacity-50 ${isDarkMode ? "text-red-400 hover:bg-red-500/20" : "text-red-500 hover:bg-red-500/10"
                                }`}
                              title="Remove sub-phase"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>

                          {/* ✅ NEW: 2x2 Grid for Duration, Quantity */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {/* Duration Input */}
                            <div>
                              <div className="relative">
                                <input
                                  type="number"
                                  step="1"
                                  min="0"
                                  placeholder="Duration (minutes)"
                                  value={subphase.expectedDuration}
                                  onChange={(e) => {
                                    const newMinutes = e.target.value
                                    updateSubphase(phase.id, subphase.id, "expectedDuration", newMinutes)
                                  }}
                                  disabled={submitting}
                                  className={`w-full px-3 py-1.5 pr-12 text-sm rounded focus:outline-none focus:ring-2 ${(() => {
                                    if (phase.expected_hours && subphase.expectedDuration) {
                                      const currentMinutes = parseFloat(subphase.expectedDuration) || 0
                                      const otherSubphasesDuration = phase.subphases
                                        .filter((s) => s.id !== subphase.id)
                                        .reduce((sum, s) => sum + (parseFloat(s.expectedDuration) || 0), 0)
                                      const totalWithThis = otherSubphasesDuration + currentMinutes
                                      const phaseMinutes = hoursToMinutes(phase.expected_hours)

                                      if (totalWithThis > phaseMinutes) {
                                        return isDarkMode
                                          ? "bg-red-500/20 border border-red-500/50 text-red-300 focus:ring-red-500"
                                          : "bg-red-500/20 border border-red-500/50 text-red-700 focus:ring-red-500"
                                      }
                                    }
                                    return isDarkMode
                                      ? "bg-gray-700/50 border border-gray-600/50 text-gray-100 placeholder-gray-400 focus:ring-blue-500"
                                      : "bg-white/60 border border-gray-300/30 text-gray-800 placeholder-gray-500 focus:ring-blue-500"
                                  })()}disabled:opacity-50 transition-all`}
                                />
                                <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium ${isDarkMode ? "text-gray-400" : "text-gray-500"
                                  }`}>
                                  min
                                </span>
                              </div>
                            </div>

                            {/* Expected Quantity Input */}
                            <input
                              type="number"
                              min="0"
                              placeholder="Expected quantity"
                              value={subphase.expectedQuantity}
                              onChange={(e) => updateSubphase(phase.id, subphase.id, "expectedQuantity", e.target.value)}
                              disabled={submitting}
                              className={`px-3 py-1.5 text-sm rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-all ${isDarkMode
                                ? "bg-gray-700/50 border border-gray-600/50 text-gray-100 placeholder-gray-400"
                                : "bg-white/60 border border-gray-300/30 text-gray-800 placeholder-gray-500"
                                }`}
                            />
                           
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Save Button at Bottom */}
      <div className="flex flex-col sm:flex-row gap-3 justify-end">
        <button
          onClick={handleClear}
          disabled={submitting}
          className={`px-6 py-3 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed ${isDarkMode ? "bg-gray-700 hover:bg-gray-600 text-white" : "bg-gray-600 hover:bg-gray-700 text-white"
            }`}
        >
          Clear All
        </button>
        <button
          onClick={handleSave}
          disabled={submitting}
          className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Saving..." : "Save Item"}
        </button>
      </div>

      {/* Import Modal */}
      <ExcelImportModal
        isDarkMode={isDarkMode}
        apiService={apiService}
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportComplete={() => {
          setShowImportModal(false)
          window.location.reload()
        }}
      />
    </div>
  )
}

export default AddItems