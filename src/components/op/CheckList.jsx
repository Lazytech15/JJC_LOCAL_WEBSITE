import { useState, useEffect, useRef } from "react";
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
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { pollingManager } from "../../utils/api/websocket/polling-manager.jsx";

function Checklist({
  items,
  setItems,
  expandedItems,
  expandedPhases,
  calculateItemProgress,
  calculatePhaseProgress,
  toggleItemExpansion,
  togglePhaseExpansion,
  handleBarcodeScan,
  apiService,
  formatTime,
  loadData,

  openTransferModal,
  newClient,
  setShowClientDropdown,
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
  const { isDarkMode } = useAuth();
  const pollingSubscriptionsRef = useRef([]);
  const isMountedRef = useRef(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterClient, setFilterClient] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState("name-asc");
  const [filterStatus, setFilterStatus] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [quantityModalOpen, setQuantityModalOpen] = useState(false);
  const [quantityModalData, setQuantityModalData] = useState(null);
  const [tempQuantity, setTempQuantity] = useState("");
  const [, forceUpdate] = useState(0);
  const [itemCheckboxes, setItemCheckboxes] = useState({});

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [isFiltering, setIsFiltering] = useState(false);
  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: 20,
    total_items: 0,
    total_pages: 0,
    has_next: false,
    has_previous: false,
  });

  // Optimistic update helpers - update local state without full reload
  const updateItemInState = (partNumber, updates) => {
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.part_number === partNumber ? { ...item, ...updates } : item
      )
    );
  };

  const formatMySQLDateTime = (date = new Date()) => {
    const pad = (num) => String(num).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate()
    )} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
      date.getSeconds()
    )}`;
  };

  const updatePhaseInState = (partNumber, phaseId, updates) => {
    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.part_number === partNumber && item.phases) {
          return {
            ...item,
            phases: item.phases.map((phase) =>
              phase.id === phaseId ? { ...phase, ...updates } : phase
            ),
          };
        }
        return item;
      })
    );
  };

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
                    subphase.id === subphaseId
                      ? { ...subphase, ...updates }
                      : subphase
                  ),
                };
              }
              return phase;
            }),
          };
        }
        return item;
      })
    );
  };

  useEffect(() => {
    // When items change, ensure materials are loaded for visible subphases
    items.forEach((item) => {
      if (expandedItems[item.part_number] && item.phases) {
        item.phases.forEach((phase) => {
          if (expandedPhases[phase.id] && phase.subphases) {
            phase.subphases.forEach(async (subphase) => {
              if (
                !subphase._materialsLoaded ||
                !subphase.materials ||
                subphase.materials.length === 0
              ) {
                try {
                  console.log(`🔄 Loading materials for subphase ${subphase.id}`);

                  // ✅ CHANGED: Use materials service
                  const response = await apiService.materials.getSubphaseMaterials(subphase.id);

                  // ✅ Handle response format
                  let materials = [];
                  if (response?.success && Array.isArray(response.data)) {
                    materials = response.data;
                  } else if (Array.isArray(response)) {
                    materials = response;
                  }

                  // ✅ CHANGED: Filter for active materials only (checked_out, in_use)
                  const activeMaterials = materials.filter(
                    (m) => m.status === 'checked_out' || m.status === 'in_use'
                  );

                  console.log(
                    `✅ Subphase ${subphase.id}: ${activeMaterials.length} active (${materials.length - activeMaterials.length
                    } filtered)`
                  );

                  setItems((prevItems) =>
                    prevItems.map((i) =>
                      i.part_number === item.part_number && i.phases
                        ? {
                          ...i,
                          phases: i.phases.map((p) =>
                            p.id === phase.id && p.subphases
                              ? {
                                ...p,
                                subphases: p.subphases.map((s) =>
                                  s.id === subphase.id
                                    ? {
                                      ...s,
                                      materials: activeMaterials,
                                      _materialsLoaded: true,
                                    }
                                    : s
                                ),
                              }
                              : p
                          ),
                        }
                        : i
                    )
                  );
                } catch (error) {
                  console.error(
                    `❌ Failed to load materials for subphase ${subphase.id}:`,
                    error
                  );
                }
              }
            });
          }
        });
      }
    });
  }, [expandedItems, expandedPhases, items.length]);

  useEffect(() => {
    isMountedRef.current = true;

    // Setup polling listeners
    setupPollingListeners();

    return () => {
      isMountedRef.current = false;
      // Cleanup polling subscriptions
      pollingSubscriptionsRef.current.forEach((unsubscribe) => unsubscribe());
      pollingSubscriptionsRef.current = [];
    };
  }, []);

  const setupPollingListeners = () => {
    console.log("📡 Setting up Checklist polling listeners...");

    // Subscribe to all operations refresh events
    const unsubRefresh = pollingManager.subscribeToUpdates(
      "operations:refresh",
      (event) => {
        console.log("🔄 Checklist refresh event:", event.type);
        handleOperationsRefresh(event);
      }
    );

    // Subscribe to specific item events
    const unsubItemCreated = pollingManager.subscribeToUpdates(
      "operations:item_created",
      (data) => {
        console.log("✨ New item created:", data.part_number);
        showNotification(`New item created: ${data.part_number}`);
        loadData(); // Reload all data
      }
    );

    const unsubItemUpdated = pollingManager.subscribeToUpdates(
      "operations:item_updated",
      (data) => {
        console.log("🔄 Item updated:", data.part_number);
        loadItemDetails(data.part_number); // Reload specific item
      }
    );

    const unsubItemDeleted = pollingManager.subscribeToUpdates(
      "operations:item_deleted",
      (data) => {
        console.log("🗑️ Item deleted:", data.part_number);
        showNotification(`Item deleted: ${data.part_number}`);

        // Optimistically remove from UI
        if (isMountedRef.current) {
          setItems((prevItems) =>
            prevItems.filter((item) => item.part_number !== data.part_number)
          );
        }
      }
    );

    const unsubPhaseUpdated = pollingManager.subscribeToUpdates(
      "operations:phase_updated",
      (data) => {
        console.log("🔄 Phase updated:", data.phase_id);
        if (data.part_number) {
          loadItemDetails(data.part_number);
        }
      }
    );

    const unsubSubphaseCompleted = pollingManager.subscribeToUpdates(
      "operations:subphase_completed",
      (data) => {
        console.log("✅ Subphase completed:", data.subphase_id);
        if (data.part_number) {
          loadItemDetails(data.part_number);
        }
      }
    );

    const unsubEmployeeAssigned = pollingManager.subscribeToUpdates(
      "operations:employee_assigned",
      (data) => {
        console.log("👤 Employee assigned:", data.employee_barcode);
        if (data.part_number) {
          loadItemDetails(data.part_number);
        }
      }
    );

    const unsubGoogleSheets = pollingManager.subscribeToUpdates(
      "operations:google_sheets_import",
      (data) => {
        console.log("📊 Google Sheets import:", data.part_number);
        showNotification(`New item imported: ${data.part_number}`);
        loadData(); // Reload all data
      }
    );

    // Store unsubscribe functions
    pollingSubscriptionsRef.current = [
      unsubRefresh,
      unsubItemCreated,
      unsubItemUpdated,
      unsubItemDeleted,
      unsubPhaseUpdated,
      unsubSubphaseCompleted,
      unsubEmployeeAssigned,
      unsubGoogleSheets,
    ];

    // Join operations room
    pollingManager.joinRoom("operations");
  };

  // Auto-stop item when it reaches 100%
  useEffect(() => {
    items.forEach((item) => {
      // ADD SAFETY CHECK HERE
      if (!item || !item.phases) return;

      if (item.phases) {
        item.phases.forEach((phase) => {
          const phaseProgress = calculatePhaseProgress(phase);
          // Auto-stop phase when all subphases are complete
          if (
            phaseProgress === 100 &&
            phase.start_time &&
            !phase.end_time &&
            !phase.pause_time
          ) {
            // Use silent completion (no reload) and auto-start next phase
            handleStopPhase(item.part_number, phase.id);
          }
        });
      }
    });
  }, [items]);

  useEffect(() => {
    const interval = setInterval(() => {
      const hasActivePhases = items.some((item) =>
        item.phases?.some(
          (phase) => phase.start_time && !phase.end_time && !phase.pause_time // Only active, not paused
        )
      );

      if (hasActivePhases) {
        forceUpdate((prev) => prev + 1); // Force component to re-render
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [items]);

  // Auto-stop item when it reaches 100%
  useEffect(() => {
    items.forEach((item) => {
      if (item.phases) {
        item.phases.forEach((phase) => {
          const phaseProgress = calculatePhaseProgress(phase);
          // Auto-stop phase when all subphases are complete
          if (
            phaseProgress === 100 &&
            phase.start_time &&
            !phase.end_time &&
            !phase.pause_time
          ) {
            // Use silent completion (no reload)
            handleStopPhase(item.part_number, phase.id);
          }
        });
      }
    });
  }, [items]);

  // Filter clients for dropdown
  useEffect(() => {
    if (!Array.isArray(clients)) {
      setShowClientDropdown(false);
      return;
    }

    const searchValue = newClient.trim().toLowerCase();
    if (searchValue.length >= 1) {
      const matches = clients.filter(
        (client) =>
          client.toLowerCase().includes(searchValue) &&
          client !== selectedItem?.client_name
      );
      setShowClientDropdown(matches.length > 0);
    } else {
      setShowClientDropdown(false);
    }
  }, [newClient, clients, selectedItem]);

  const openQuantityModal = (item, phase, subphase) => {
    setQuantityModalData({ item, phase, subphase });
    setTempQuantity(subphase.current_completed_quantity || "");
    setQuantityModalOpen(true);
  };

  const handleUpdateCompletedQuantity = async () => {
    if (!quantityModalData) return;

    try {
      const { item, phase, subphase } = quantityModalData;
      const newQuantity = Number.parseInt(tempQuantity) || 0;

      if (newQuantity > subphase.expected_quantity) {
        alert(
          `Cannot exceed expected quantity of ${subphase.expected_quantity}`
        );
        return;
      }

      // Optimistic update
      updateSubphaseInState(item.part_number, phase.id, subphase.id, {
        current_completed_quantity: newQuantity,
      });

      // ADD THIS NEW CODE:
      // Auto-uncheck if quantity drops below expected
      if (subphase.completed == 1 && newQuantity < subphase.expected_quantity) {
        updateSubphaseInState(item.part_number, phase.id, subphase.id, {
          current_completed_quantity: newQuantity,
          completed: 0,
          completed_at: null,
        });
      }

      // Close modal immediately
      setQuantityModalOpen(false);
      setQuantityModalData(null);
      setTempQuantity("");

      // API call in background
      await apiService.operations.updateSubphaseCompletedQuantity(
        subphase.id,
        newQuantity
      );

      // ADD THIS NEW CODE:
      // If auto-unchecked, update via API
      if (subphase.completed == 1 && newQuantity < subphase.expected_quantity) {
        await apiService.operations.completeSubphaseWithDuration(
          subphase.id,
          false
        );
      }
    } catch (error) {
      console.error("Error updating completed quantity:", error);
      alert("Failed to update completed quantity: " + error.message);
      await loadData();
    }
  };

  const handleOperationsRefresh = async (event) => {
    if (!isMountedRef.current) return;

    const { type, data } = event;

    switch (type) {
      case "item_created":
      case "item_deleted":
      case "google_sheets_import":
        // Full reload for these events
        await loadData();
        break;

      case "item_updated":
      case "phase_created":
      case "phase_updated":
      case "phase_status":
      case "subphase_completed":
      case "employee_assigned":
        // Reload specific item
        if (data.part_number) {
          await loadItemDetails(data.part_number);
        }
        break;

      default:
        console.log("Unknown refresh type:", type);
    }
  };

  const loadItemDetails = async (partNumber) => {
    try {
      console.log("🔄 Loading details for item:", partNumber);
      const fullItem = await apiService.operations.getItem(partNumber);

      // ✅ Load materials for each subphase
      if (fullItem.phases) {
        for (const phase of fullItem.phases) {
          if (phase.subphases) {
            for (const subphase of phase.subphases) {
              try {
                console.log(`🔄 Loading materials for subphase ${subphase.id}`);

                // ✅ CHANGED: Use materials service
                const materialsResponse = await apiService.materials.getSubphaseMaterials(subphase.id);

                // ✅ Handle response format
                let materials = [];
                if (materialsResponse?.success && Array.isArray(materialsResponse.data)) {
                  materials = materialsResponse.data;
                } else if (Array.isArray(materialsResponse)) {
                  materials = materialsResponse;
                }

                // ✅ CHANGED: Filter for active materials only (checked_out, in_use)
                const activeMaterials = materials.filter(
                  (m) => m.status === 'checked_out' || m.status === 'in_use'
                );

                // Attach active materials to subphase
                subphase.materials = activeMaterials;

                console.log(
                  `✅ Loaded ${activeMaterials.length} active materials (${materials.length - activeMaterials.length
                  } filtered) for subphase ${subphase.id}`
                );
              } catch (error) {
                console.warn(
                  `⚠️ Failed to load materials for subphase ${subphase.id}:`,
                  error
                );
                subphase.materials = [];
              }
            }
          }
        }
      }

      console.log("✅ Full item loaded with materials:", fullItem);

      if (isMountedRef.current) {
        setItems((prevItems) => {
          const newItems = prevItems.map((item) =>
            item.part_number === partNumber ? fullItem : item
          );
          console.log("✅ Updated items state");
          return newItems;
        });
      }

      return fullItem;
    } catch (err) {
      console.error("❌ Failed to load item details:", err);
      return null;
    }
  };

  const showNotification = (message, type = "info") => {
    console.log("📢 Notification:", message);

    // Show browser notification if permitted
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Operations Update", {
        body: message,
        icon: "/icons/icon-192.jpg",
        tag: "operations-update",
        badge: "/icons/icon-192.jpg",
      });
    }

    // You can also integrate a toast library here
    const emoji = type === "success" ? "✅" : type === "error" ? "❌" : "📢";
    console.log(`${emoji} ${message}`);
  };

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then((permission) => {
        console.log("Notification permission:", permission);
      });
    }
  }, []);

  const handleUpdatePriority = async (partNumber, newPriority) => {
    try {
      // Optimistic update
      updateItemInState(partNumber, { priority: newPriority });

      await apiService.operations.updateItem(partNumber, {
        priority: newPriority,
      });
    } catch (error) {
      console.error("Error updating priority:", error);
      alert("Failed to update priority: " + error.message);
      await loadData();
    }
  };

  const formatDuration = (minutes) => {
    // Input is already in minutes
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);

    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h} hour${h > 1 ? "s" : ""}`;
    if (m > 0) return `${m} minute${m !== 1 ? "s" : ""}`;
    return "0 minutes";
  };

  function getPhaseElapsedTime(phase) {
    if (!phase.start_time) return 0;

    const start = new Date(phase.start_time);

    // If phase is completed, calculate total time minus pauses
    if (phase.end_time) {
      const end = new Date(phase.end_time);
      let elapsed = Math.floor((end - start) / 1000);

      // Subtract accumulated paused duration
      if (phase.paused_duration) {
        elapsed -= Number.parseInt(phase.paused_duration);
      }

      return Math.max(0, elapsed);
    }

    // If phase is currently paused, show time up to pause (frozen)
    if (phase.pause_time) {
      const pause = new Date(phase.pause_time);
      let elapsed = Math.floor((pause - start) / 1000);

      // Subtract accumulated paused duration from BEFORE this pause
      if (phase.paused_duration) {
        elapsed -= Number.parseInt(phase.paused_duration);
      }

      return Math.max(0, elapsed);
    }

    // Phase is running - calculate from start to now minus ALL pauses
    const now = new Date();
    let elapsed = Math.floor((now - start) / 1000);

    // Subtract accumulated paused duration
    if (phase.paused_duration) {
      elapsed -= Number.parseInt(phase.paused_duration);
    }

    return Math.max(0, elapsed);
  }

  const handleStartPhase = async (partNumber, phaseId) => {
    try {
      const now = new Date().toISOString();
      // Optimistic update
      updatePhaseInState(partNumber, phaseId, {
        start_time: now,
        pause_time: null,
      });

      await apiService.operations.startPhaseProcess(partNumber, phaseId);
      // Only reload if there's an error in the optimistic update
    } catch (error) {
      console.error("Error starting phase:", error);
      alert("Failed to start phase: " + error.message);
      await loadData(); // Reload to fix state
    }
  };

  const handleStopPhase = async (partNumber, phaseId) => {
    try {
      const now = new Date().toISOString();
      // Optimistic update
      updatePhaseInState(partNumber, phaseId, {
        end_time: now,
      });

      await apiService.operations.stopPhaseProcess(partNumber, phaseId);

      // *** ADD THIS LINE: Auto-start next phase ***
      await handleAutoStartNextPhase(partNumber, phaseId);
    } catch (error) {
      console.error("Error stopping phase:", error);
      alert("Failed to stop phase: " + error.message);
      await loadData();
    }
  };

  const handlePausePhase = async (partNumber, phaseId) => {
    try {
      const now = new Date().toISOString();
      // Optimistic update
      updatePhaseInState(partNumber, phaseId, {
        pause_time: now,
      });

      await apiService.operations.pausePhaseProcess(partNumber, phaseId);
    } catch (error) {
      console.error("Error pausing phase:", error);
      alert("Failed to pause phase: " + error.message);
      await loadData();
    }
  };

  const handleResumePhase = async (partNumber, phaseId) => {
    try {
      const item = items.find((i) => i.part_number === partNumber);
      const phase = item?.phases?.find((p) => p.id === phaseId);

      if (!phase || !phase.pause_time) return;

      // Calculate pause duration
      const pauseStart = new Date(phase.pause_time);
      const now = new Date();
      const pauseDurationSeconds = Math.floor((now - pauseStart) / 1000);
      const currentPausedDuration = Number.parseInt(phase.paused_duration) || 0;
      const newPausedDuration = currentPausedDuration + pauseDurationSeconds;

      // Optimistic update - clear pause_time and update paused_duration
      updatePhaseInState(partNumber, phaseId, {
        pause_time: null,
        paused_duration: newPausedDuration,
      });

      await apiService.operations.resumePhaseProcess(partNumber, phaseId);
    } catch (error) {
      console.error("Error resuming phase:", error);
      alert("Failed to resume phase: " + error.message);
      await loadData();
    }
  };

  const handleResetPhase = async (partNumber, phaseId) => {
    if (window.confirm("Reset process times for this phase?")) {
      try {
        // Optimistic update
        updatePhaseInState(partNumber, phaseId, {
          start_time: null,
          pause_time: null,
          end_time: null,
        });

        await apiService.operations.resetPhaseProcess(partNumber, phaseId);
      } catch (error) {
        console.error("Error resetting phase:", error);
        alert("Failed to reset phase: " + error.message);
        await loadData();
      }
    }
  };

   const handleItemExpansion = (partNumber) => {
    setExpandedItems((prev) => {
      // If clicking the same item, just toggle it
      if (prev[partNumber]) {
        return { ...prev, [partNumber]: false };
      }
      // Otherwise, close all others and open this one
      return { [partNumber]: true };
    });
  };

  const handleAutoStartNextPhase = async (partNumber, currentPhaseId) => {
    try {
      const item = items.find((i) => i.part_number === partNumber);
      if (!item || !item.phases) return;

      const currentPhaseIndex = item.phases.findIndex(
        (p) => p.id === currentPhaseId
      );
      if (
        currentPhaseIndex === -1 ||
        currentPhaseIndex === item.phases.length - 1
      ) {
        // No next phase exists
        return;
      }

      const nextPhase = item.phases[currentPhaseIndex + 1];

      // Check if next phase hasn't been started yet
      if (!nextPhase.start_time) {
        const now = new Date().toISOString();

        // Optimistic update for next phase
        updatePhaseInState(partNumber, nextPhase.id, {
          start_time: now,
          pause_time: null,
        });

        // API call to start next phase
        await apiService.operations.startPhaseProcess(partNumber, nextPhase.id);
      }
    } catch (error) {
      console.error("Error auto-starting next phase:", error);
      await loadData();
    }
  };

  const getItemElapsedTime = (item) => {
    if (!item.start_time) return 0;
    const start = new Date(item.start_time);
    const end = item.end_time ? new Date(item.end_time) : new Date();
    return Math.floor((end - start) / 1000);
  };
  const formatDateTime = (isoString) => {
    if (!isoString) return "Not started";
    return new Date(isoString).toLocaleString("en-PH", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "High":
        return "text-red-500 bg-red-500/10 border-red-500";
      case "Medium":
        return "text-yellow-500 bg-yellow-500/10 border-yellow-500";
      case "Low":
        return "text-green-500 bg-green-500/10 border-green-500";
      default:
        return "text-gray-500 bg-gray-500/10 border-gray-500";
    }
  };

  const applyFilters = async (page = 1) => {
    setIsFiltering(true);
    try {
      // Build filter params
      const params = {
        page,
        limit: itemsPerPage,
      };

      // Map dashboard filters to API filters - FIX status mapping
      if (filterStatus && filterStatus !== "all") {
        if (filterStatus === "completed") {
          params.status = "completed";
        } else if (filterStatus === "in-progress") {
          params.status = "in_progress";
        } else if (filterStatus === "not-started") {
          params.status = "not_started";
        }
      }

      if (filterPriority && filterPriority !== "all") {
        params.priority = filterPriority;
      }

      if (filterClient && filterClient !== "all") {
        params.client_name = filterClient;
      }

      if (searchTerm && searchTerm.trim()) {
        params.search = searchTerm.trim();
      }

      const response = await apiService.operations.getItemsPaginated(
        page,
        itemsPerPage,
        params
      );

      setItems(response.items || []);
      setPagination(
        response.pagination || {
          current_page: page,
          per_page: itemsPerPage,
          total_items: 0,
          total_pages: 0,
          has_next: false,
          has_previous: false,
        }
      );
    } catch (error) {
      console.error("Failed to apply filters:", error);
      setItems([]);
    } finally {
      setIsFiltering(false);
    }
  };

  useEffect(() => {
    applyFilters(1); // Reset to page 1 when filters change
  }, [filterStatus, filterPriority, filterClient, searchTerm]);

  const completedItems = items.filter((item) => {
    if (!item) return false;
    try {
      return calculateItemProgress(item) === 100;
    } catch (err) {
      console.warn(
        "Error calculating progress for item:",
        item?.part_number,
        err
      );
      return false;
    }
  });

  const inProgressItems = items.filter((item) => {
    if (!item) return false;
    try {
      return calculateItemProgress(item) < 100;
    } catch (err) {
      console.warn(
        "Error calculating progress for item:",
        item?.part_number,
        err
      );
      return true;
    }
  });

  // Sort in-progress items (keep existing sorting logic)
  const sortedInProgressItems = [...inProgressItems].sort((a, b) => {
    if (sortBy === "name-asc")
      return (a.name || "").localeCompare(b.name || "");
    if (sortBy === "name-desc")
      return (b.name || "").localeCompare(a.name || "");
    if (sortBy === "date-newest")
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    if (sortBy === "date-oldest")
      return new Date(a.created_at || 0) - new Date(b.created_at || 0);

    const priorityOrder = { High: 0, Medium: 1, Low: 2 };
    return (
      priorityOrder[a.priority || "Medium"] -
      priorityOrder[b.priority || "Medium"]
    );
  });

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.total_pages) {
      setCurrentPage(newPage); // ADD THIS LINE
      applyFilters(newPage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };
  const handlePreviousPage = () => {
    if (pagination.has_previous) {
      handlePageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (pagination.has_next) {
      handlePageChange(currentPage + 1);
    }
  };

  // Get unique clients for filter
  const uniqueClients = [
    ...new Set(
      items
        .filter((item) => item && item.client_name)
        .map((item) => item.client_name)
    ),
  ];

  // Helper function to check if previous subphase is completed
  const isPreviousSubphaseCompleted = (item, phase, currentSubphaseIndex) => {
    if (currentSubphaseIndex === 0) return true; // First subphase is always available

    const previousSubphase = phase.subphases[currentSubphaseIndex - 1];
    return previousSubphase && previousSubphase.completed == 1;
  };

  // Helper function to check if condition is met
  const isSubphaseConditionMet = (item, phase, subphase, subphaseIndex) => {
    // Check if previous subphase is completed
    if (!isPreviousSubphaseCompleted(item, phase, subphaseIndex)) {
      return false;
    }

    // *** NEW: If subphase has quantity tracking, only check quantity requirement ***
    if (subphase.expected_quantity > 0) {
      const currentQty = subphase.current_completed_quantity || 0;
      if (currentQty < subphase.expected_quantity) {
        return false;
      }

      // For quantity-based subphases, employee assignment is still required
      if (!subphase.employee_barcode) {
        return false;
      }

      // ✅ Quantity-based subphases don't need phase to be started
      return true;
    }

    // *** For time-based subphases (no quantity), require phase to be running ***
    // Check if phase is started and not paused/stopped
    if (!phase.start_time || phase.pause_time || phase.end_time) {
      return false;
    }

    // Check if employee is assigned
    if (!subphase.employee_barcode) {
      return false;
    }

    return true;
  };

  const handleToggleSubPhase = async (
    partNumber,
    phaseId,
    subphaseId,
    currentStatus
  ) => {
    const item = items.find((i) => i.part_number === partNumber);
    const phase = item?.phases?.find((p) => p.id === phaseId);
    const subphase = phase?.subphases?.find((s) => s.id === subphaseId);

    if (!currentStatus) {
      // If trying to mark as complete
      // Check if it's a quantity-based subphase
      const isQuantityBased = subphase && subphase.expected_quantity > 0;

      // For TIME-BASED subphases only, check phase conditions
      if (!isQuantityBased) {
        // Prevent completing subphases while phase is paused
        if (phase && phase.pause_time && !phase.end_time) {
          alert(
            "Cannot mark subphase as complete while the phase is paused. Please resume the phase first."
          );
          return;
        }

        // Prevent completing subphases if phase hasn't started
        if (phase && !phase.start_time) {
          alert(
            "Cannot mark subphase as complete. Please start the phase first."
          );
          return;
        }

        // Prevent completing subphases if phase is already completed
        if (phase && phase.end_time) {
          alert(
            "Cannot mark subphase as complete. This phase is already completed."
          );
          return;
        }
      }

      // For QUANTITY-BASED subphases, only check quantity requirement
      if (isQuantityBased) {
        const currentQty = subphase.current_completed_quantity || 0;
        if (currentQty < subphase.expected_quantity) {
          alert(
            `Cannot mark as complete. Current quantity (${currentQty}) is less than expected quantity (${subphase.expected_quantity}).`
          );
          return;
        }
      }
    }

    try {
      const now = formatMySQLDateTime(new Date());

      // Re-check if it's quantity-based for the try block
      const isQuantityBased = subphase && subphase.expected_quantity > 0;

      // Check if phase has time tracking (for duration calculation)
      const hasPhaseTimeTracking =
        phase && phase.start_time && !isQuantityBased;

      if (hasPhaseTimeTracking) {
        // Get current subphase index
        const currentSubphaseIndex = phase.subphases.findIndex(
          (sp) => sp.id === subphaseId
        );

        // Calculate time_duration for THIS subphase when marking as complete
        if (!currentStatus) {
          // If marking as complete
          // Get the current phase elapsed time in SECONDS (from the stopwatch)
          const currentPhaseElapsedSeconds = getPhaseElapsedTime(phase);

          // Calculate the CUMULATIVE time of ALL previous completed subphases (convert minutes back to seconds for calculation)
          let allPreviousCumulativeSeconds = 0;
          for (let i = 0; i < currentSubphaseIndex; i++) {
            const prevSubphase = phase.subphases[i];
            if (prevSubphase.time_duration) {
              // time_duration is stored in minutes, convert to seconds for calculation
              const prevMinutes =
                Number.parseInt(prevSubphase.time_duration) || 0;
              allPreviousCumulativeSeconds += prevMinutes * 60;
            }
          }

          // This subphase duration = current total elapsed time - sum of all previous durations
          const thisSubphaseSeconds = Math.max(
            0,
            currentPhaseElapsedSeconds - allPreviousCumulativeSeconds
          );
          const thisSubphaseMinutes = Math.round(thisSubphaseSeconds / 60); // Convert to minutes

          // Update this subphase with its time_duration IN MINUTES
          updateSubphaseInState(partNumber, phaseId, subphaseId, {
            completed: 1,
            completed_at: now,
            time_duration: thisSubphaseMinutes, // Store as integer minutes
          });
        } else {
          // If unchecking, clear the time_duration for this subphase
          updateSubphaseInState(partNumber, phaseId, subphaseId, {
            completed: 0,
            completed_at: null,
            time_duration: 0,
          });
        }
      } else {
        // If phase not started OR quantity-based, just toggle completion without duration
        updateSubphaseInState(partNumber, phaseId, subphaseId, {
          completed: currentStatus ? 0 : 1,
          completed_at: currentStatus ? null : now,
        });
      }

      // API call in background
      if (!currentStatus && hasPhaseTimeTracking) {
        // If marking as complete and phase has started, calculate and send time_duration IN SECONDS
        const currentPhaseElapsedSeconds = getPhaseElapsedTime(phase);
        const currentSubphaseIndex = phase.subphases.findIndex(
          (sp) => sp.id === subphaseId
        );

        // Calculate cumulative time of ALL previous subphases (convert minutes back to seconds)
        let allPreviousCumulativeSeconds = 0;
        for (let i = 0; i < currentSubphaseIndex; i++) {
          const prevSubphase = phase.subphases[i];
          if (prevSubphase.time_duration) {
            // time_duration is stored in minutes, convert to seconds for calculation
            const prevMinutes =
              Number.parseInt(prevSubphase.time_duration) || 0;
            allPreviousCumulativeSeconds += prevMinutes * 60;
          }
        }

        const thisSubphaseSeconds = Math.max(
          0,
          currentPhaseElapsedSeconds - allPreviousCumulativeSeconds
        );
        const thisSubphaseMinutes = Math.round(thisSubphaseSeconds / 60); // Convert to minutes

        // Complete subphase with calculated time_duration IN MINUTES
        await apiService.operations.completeSubphaseWithDuration(
          subphaseId,
          true,
          thisSubphaseMinutes
        );
      } else {
        // Just toggle completion status without duration
        await apiService.operations.completeSubphaseWithDuration(
          subphaseId,
          !currentStatus
        );
      }
    } catch (error) {
      console.error("Error toggling subphase:", error);
      alert("Failed to toggle subphase: " + error.message);
      await loadData();
    }
  };

  /**
   * Format multiple materials into a readable string for employee logs
   * Example: "Checkout: 3 items - Common Nail #4 x2 (pcs), Wire 18AWG x50 (meters), Bolt M8 x10 (pcs)"
   */
  const formatMaterialsCheckoutDetails = (materials) => {
    if (!materials || materials.length === 0) {
      return "Checkout: 0 items";
    }

    const itemCount = materials.length;
    const itemsList = materials
      .map((m) => `${m.item_name} x${m.quantity} (${m.unit || "pcs"})`)
      .join(", ");

    return `Checkout: ${itemCount} item${itemCount > 1 ? "s" : ""
      } - ${itemsList}`;
  };

  const getEmployeeData = async (employeeUid, apiService) => {
    try {
      console.log("🔍 Fetching employee data for UID:", employeeUid);
      const response = await apiService.employees.getEmployee(employeeUid);
      console.log("📦 Employee API response:", response);

      if (response.success) {
        // ✅ CORRECT MAPPING to match employee_logs table structure
        return {
          // username column = username from API
          username: response.username || "unknown",

          // id_number column = idNumber from API
          id_number: response.idNumber || "UNKNOWN",

          // id_barcode column = idBarcode from API
          id_barcode: response.idBarcode || "UNKNOWN",

          // Additional fields for display (not in employee_logs table)
          fullName: response.fullName || "Unknown",
          department: response.department,
          position: response.position,
          uid: String(employeeUid), // Keep UID for reference
        };
      }

      throw new Error("Invalid employee response");
    } catch (error) {
      console.error("❌ Failed to fetch employee data:", error);
      // Return minimal fallback data matching table structure
      return {
        username: "unknown",
        id_number: "UNKNOWN",
        id_barcode: "UNKNOWN",
        fullName: "Unknown Employee",
        department: null,
        position: null,
        uid: String(employeeUid),
      };
    }
  };

  const createMaterialCheckoutLog = async (
    materials,
    employeeData,
    operationContext,
    apiService
  ) => {
    try {
      // Format the details text
      const detailsText = formatMaterialsCheckoutDetails(materials);

      // Build the purpose string
      const purpose = operationContext.subphase_name
        ? `Material Checkout for ${operationContext.item_name} - ${operationContext.phase_name} - ${operationContext.subphase_name}`
        : operationContext.phase_name
          ? `Material Checkout for ${operationContext.item_name} - ${operationContext.phase_name}`
          : `Material Checkout for ${operationContext.item_name}`;

      // Prepare items_json with full context
      const itemsJson = materials.map((m) => ({
        item_no: m.item_no,
        item_name: m.item_name,
        quantity: m.quantity,
        unit: m.unit || "pcs",
        operation_item: operationContext.part_number,
        operation_phase: operationContext.phase_name,
        operation_subphase: operationContext.subphase_name,
      }));

      // ✅ CORRECT: Map to actual employee_logs table columns
      const logData = {
        // Column: username (varchar 100) = username from employee
        username: employeeData.username,

        // Column: id_number (varchar 50) = idNumber from employee
        id_number: employeeData.id_number,

        // Column: id_barcode (varchar 100) = idBarcode from employee
        id_barcode: employeeData.id_barcode,

        // Column: details (text) = formatted checkout details
        details: detailsText,

        // Column: purpose (text) = operation context
        purpose: purpose,

        // Column: item_no (varchar 50) = first material's item_no
        item_no: materials[0]?.item_no,

        // Column: items_json (text) = JSON array of all materials
        items_json: JSON.stringify(itemsJson),

        // Note: log_date and log_time are set by PHP backend using server time
        // Note: created_at has DEFAULT current_timestamp()
      };

      console.log(
        "📝 Creating employee log with correct column mapping:",
        logData
      );

      const result = await apiService.employeeLogs.createEmployeeLog(logData);
      console.log("✅ Employee log created successfully:", result);

      return {
        success: true,
        logId: result.id,
        data: result,
      };
    } catch (error) {
      console.error("❌ Failed to create employee log:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  };

  const handleCheckoutSubphaseMaterials = async (item, phase, subphase) => {
    try {
      // ✅ Get assigned employee from subphase (REQUIRED)
      if (!subphase.employee_uid || !subphase.employee_barcode || !subphase.employee_name) {
        throw new Error("No employee assigned to this subphase. Please assign an employee first.");
      }

      const checkoutByUid = subphase.employee_uid;
      const checkoutBy = subphase.employee_barcode;
      const checkoutByName = subphase.employee_name;

      console.log(`✅ Using assigned employee: ${checkoutByName} (UID: ${checkoutByUid}, Barcode: ${checkoutBy})`);

      // ✅ CHANGED: Load fresh materials from database using materials service
      console.log("📥 Loading materials for subphase:", subphase.id);
      const materialsResponse = await apiService.materials.getSubphaseMaterials(subphase.id);

      // ✅ Robust response parsing
      let materialsArray = [];
      if (Array.isArray(materialsResponse)) {
        materialsArray = materialsResponse;
      } else if (materialsResponse?.success && Array.isArray(materialsResponse.data)) {
        materialsArray = materialsResponse.data;
      } else if (materialsResponse?.data && Array.isArray(materialsResponse.data)) {
        materialsArray = materialsResponse.data;
      } else {
        console.warn("⚠️ Unexpected materials response format:", materialsResponse);
        materialsArray = [];
      }

      console.log(`✅ Parsed ${materialsArray.length} materials from response`);

      if (materialsArray.length === 0) {
        alert("No materials found for this subphase");
        return;
      }

      // ✅ CHANGED: Filter unchecked materials (status = 'checked_out' but is_checked_out = false)
      const uncheckedMaterials = materialsArray.filter((m) =>
        m.status === 'checked_out' &&
        (!m.checked_out_by_uid || m.checked_out_by_uid === 'SYSTEM')
      );

      if (uncheckedMaterials.length === 0) {
        alert("All materials have already been checked out to employees");
        return;
      }

      // ✅ Confirm checkout
      const materialsList = uncheckedMaterials
        .map((m) => `• ${m.material_name}: ${m.material_quantity} ${m.unit_of_measure || "pcs"}`)
        .join("\n");

      const confirmMsg =
        `Checkout ${uncheckedMaterials.length} material(s):\n\n${materialsList}\n\n` +
        `For: ${item.name} → ${phase.name} → ${subphase.name}\n` +
        `✅ Checked out by: ${checkoutByName} (${checkoutBy})\n\n` +
        `Proceed?`;

      if (!window.confirm(confirmMsg)) return;

      // ✅ Process each material
      let successCount = 0;
      let failCount = 0;
      const errors = [];

      for (const material of uncheckedMaterials) {
        try {
          console.log(`🔄 Processing material: ${material.material_name}`);

          // ✅ Find material in inventory
          const inventoryResponse = await apiService.items.getItems({
            item_type: "OPERATION PARTICULARS",
            search: material.material_name,
            limit: 10,
          });

          // ✅ Robust inventory response parsing
          let inventoryItems = [];
          if (Array.isArray(inventoryResponse)) {
            inventoryItems = inventoryResponse;
          } else if (inventoryResponse?.items && Array.isArray(inventoryResponse.items)) {
            inventoryItems = inventoryResponse.items;
          } else if (inventoryResponse?.data && Array.isArray(inventoryResponse.data)) {
            inventoryItems = inventoryResponse.data;
          } else if (inventoryResponse?.success && Array.isArray(inventoryResponse.data)) {
            inventoryItems = inventoryResponse.data;
          }

          console.log(`📋 Found ${inventoryItems.length} inventory items for "${material.material_name}"`);

          const inventoryItem = inventoryItems.find(
            (m) => m.item_name?.toLowerCase() === material.material_name.toLowerCase()
          );

          if (!inventoryItem) {
            throw new Error(`Material "${material.material_name}" not found in inventory`);
          }

          const requestedQty = parseFloat(material.material_quantity);

          // ✅ Check stock availability (warning only)
          if (inventoryItem.balance < requestedQty) {
            console.warn(
              `⚠️ Insufficient stock: ${inventoryItem.item_name} (${inventoryItem.balance} < ${requestedQty})`
            );
          }

          // ✅ Deduct from inventory (KEEP THIS - DO NOT REPLACE)
          console.log(`📦 Deducting ${requestedQty} ${material.unit_of_measure} from inventory...`);

          const deductResult = await apiService.items.removeStock(
            inventoryItem.item_no,
            requestedQty,
            `Material checkout for operations\n` +
            `Item: ${item.name} (${item.part_number})\n` +
            `Phase: ${phase.name}\n` +
            `Subphase: ${subphase.name}\n` +
            `Material: ${material.material_name}\n` +
            `Checked out by: ${checkoutByName}`,
            checkoutBy
          );

          console.log(`✅ Inventory deducted:`, deductResult);

          // ✅ CHANGED: Update material record using materials service
          await apiService.materials.updateMaterial(material.id, {
            checked_out_by: checkoutBy,
            checked_out_by_name: checkoutByName,
            checked_out_by_uid: checkoutByUid,
            checkout_date: formatMySQLDateTime(new Date()),
            status: 'in_use'
          });

          console.log(`✅ Material ${material.id} updated with employee info`);

          // ✅ Create employee log (unchanged)
          try {
            const fullEmployeeData = await getEmployeeData(checkoutByUid, apiService);

            const materialsArray = [
              {
                item_no: inventoryItem.item_no,
                item_name: inventoryItem.item_name,
                quantity: requestedQty,
                unit: material.unit_of_measure || "pcs",
              },
            ];

            const operationContext = {
              item_name: item.name,
              part_number: item.part_number,
              phase_name: phase.name,
              subphase_name: subphase.name,
            };

            const logResult = await createMaterialCheckoutLog(
              materialsArray,
              fullEmployeeData,
              operationContext,
              apiService
            );

            if (logResult.success) {
              console.log("✅ Employee log created:", logResult.logId);
            }
          } catch (logError) {
            console.warn("⚠️ Failed to create employee log (non-critical):", logError);
          }

          successCount++;
        } catch (matError) {
          console.error(`❌ Failed to checkout ${material.material_name}:`, matError);
          failCount++;
          errors.push(`${material.material_name}: ${matError.message}`);
        }
      }

      // ✅ Show results
      let resultMsg = "";
      if (successCount > 0) {
        resultMsg += `✅ Successfully checked out ${successCount} material(s)\n`;
      }
      if (failCount > 0) {
        resultMsg += `\n❌ Failed to checkout ${failCount} material(s):\n${errors.join("\n")}`;
      }

      alert(resultMsg);

      // ✅ Reload item details to show updated materials
      await loadItemDetails(item.part_number);
    } catch (error) {
      console.error("❌ Failed to checkout materials:", error);
      alert(`Failed to checkout materials:\n\n${error.message}`);
    }
  };

  // ============================================================================
  // ALSO FIX: handleCheckoutSingleMaterial
  // ============================================================================

  const handleCheckoutSingleMaterial = async (item, phase, subphase, material) => {

    if (material.checked_out_by_uid && material.checked_out_by_uid !== 'SYSTEM') {
      alert(`This material is already checked out to: ${material.checked_out_by_name || 'Unknown'}`);
      return;
    }
    try {
      // ✅ Get assigned employee from subphase
      if (!subphase.employee_uid || !subphase.employee_barcode || !subphase.employee_name) {
        throw new Error("No employee assigned to this subphase. Please assign an employee first.");
      }

      const checkoutByUid = subphase.employee_uid;
      const checkoutBy = subphase.employee_barcode;
      const checkoutByName = subphase.employee_name;

      // ✅ Find material in inventory
      const inventoryResponse = await apiService.items.getItems({
        item_type: "OPERATION PARTICULARS",
        search: material.material_name,
        limit: 10,
      });

      let inventoryItems = [];
      if (Array.isArray(inventoryResponse)) {
        inventoryItems = inventoryResponse;
      } else if (inventoryResponse?.items && Array.isArray(inventoryResponse.items)) {
        inventoryItems = inventoryResponse.items;
      } else if (inventoryResponse?.data && Array.isArray(inventoryResponse.data)) {
        inventoryItems = inventoryResponse.data;
      } else if (inventoryResponse?.success && Array.isArray(inventoryResponse.data)) {
        inventoryItems = inventoryResponse.data;
      }

      const inventoryItem = inventoryItems.find(
        (m) => m.item_name?.toLowerCase() === material.material_name.toLowerCase()
      );

      if (!inventoryItem) {
        throw new Error(`Material "${material.material_name}" not found in inventory`);
      }

      const requestedQty = parseFloat(material.material_quantity);

      // ✅ Confirm checkout
      const confirmMsg =
        `Checkout material:\n\n` +
        `Material: ${inventoryItem.item_name}\n` +
        `Quantity: ${requestedQty} ${material.unit_of_measure || "units"}\n` +
        `Available: ${inventoryItem.balance} ${inventoryItem.unit_of_measure || "units"}\n\n` +
        `For: ${item.name} → ${phase.name} → ${subphase.name}\n` +
        `✅ Checked out by: ${checkoutByName} (${checkoutBy})\n\n` +
        `Proceed?`;

      if (!window.confirm(confirmMsg)) return;

      // ✅ Deduct from inventory
      console.log(`📦 Deducting ${requestedQty} ${material.unit_of_measure} from inventory...`);

      await apiService.items.removeStock(
        inventoryItem.item_no,
        requestedQty,
        `Material checkout for operations\n` +
        `Item: ${item.name} (${item.part_number})\n` +
        `Phase: ${phase.name}\n` +
        `Subphase: ${subphase.name}\n` +
        `Material: ${material.material_name}\n` +
        `Checked out by: ${checkoutByName}`,
        checkoutBy
      );

      console.log(`✅ Inventory deducted successfully`);

      // ✅ Update material checkout status in database
      await apiService.materials.updateMaterial(material.id, {
        checked_out_by: checkoutBy,
        checked_out_by_name: checkoutByName,
        checked_out_by_uid: checkoutByUid,
        checkout_date: formatMySQLDateTime(new Date()),
        status: 'in_use'
      });

      console.log(`✅ Material ${material.id} updated with employee info`);

      // ✅ Create employee log
      try {
        const fullEmployeeData = await getEmployeeData(checkoutByUid, apiService);

        const materialsArray = [
          {
            item_no: inventoryItem.item_no,
            item_name: inventoryItem.item_name,
            quantity: requestedQty,
            unit: material.unit_of_measure || "pcs",
          },
        ];

        const operationContext = {
          item_name: item.name,
          part_number: item.part_number,
          phase_name: phase.name,
          subphase_name: subphase.name,
        };

        const logResult = await createMaterialCheckoutLog(
          materialsArray,
          fullEmployeeData,
          operationContext,
          apiService
        );

        if (logResult.success) {
          console.log("✅ Employee log created:", logResult.logId);
        }
      } catch (logError) {
        console.warn("⚠️ Failed to create employee log (non-critical):", logError);
      }

      // ✅ Reload item details
      await loadItemDetails(item.part_number);

      alert(
        `✅ Material checked out successfully!\n\n` +
        `${material.material_name}: ${requestedQty} ${material.unit_of_measure}\n` +
        `Checked out by: ${checkoutByName}`
      );
    } catch (error) {
      console.error("❌ Failed to checkout material:", error);
      alert(`Failed to checkout material:\n\n${error.message}`);
    }
  };

  const handleUpdateScrapAssignment = async (item, phase, subphase, material) => {
    try {
      // ✅ Get current assigned employee from subphase
      if (!subphase.employee_uid || !subphase.employee_barcode || !subphase.employee_name) {
        alert(
          `⚠️ No employee assigned to this subphase!\n\n` +
          `Please assign an employee to "${subphase.name}" first.`
        )
        return
      }

      // ✅ Confirm update
      const currentEmployee = material.checked_out_by_name || 'Unknown'
      const newEmployee = subphase.employee_name

      if (currentEmployee === newEmployee) {
        alert(`This scrap material is already assigned to ${newEmployee}`)
        return
      }

      if (!window.confirm(
        `Update scrap material assignment?\n\n` +
        `Material: ${material.material_name}\n` +
        `Current: ${currentEmployee}\n` +
        `New: ${newEmployee}\n\n` +
        `This will update the tracking data for this reused scrap material.`
      )) {
        return
      }

      // ✅ Update the material assignment
      await apiService.materials.updateMaterial(material.id, {
        checked_out_by: subphase.employee_barcode,
        checked_out_by_name: subphase.employee_name,
        checked_out_by_uid: subphase.employee_uid,
        checkout_date: new Date().toISOString(),

        // ✅ Append update note to existing notes
        notes: material.notes +
          `\n\n📝 ASSIGNMENT UPDATED:\n` +
          `   • From: ${currentEmployee}\n` +
          `   • To: ${newEmployee}\n` +
          `   • Updated: ${new Date().toLocaleString()}`
      })

      console.log('✅ Scrap material assignment updated')

      // ✅ Reload item details
      await loadItemDetails(item.part_number)

      alert(
        `✅ Assignment updated successfully!\n\n` +
        `${material.material_name}\n` +
        `Now assigned to: ${newEmployee}`
      )

    } catch (error) {
      console.error('❌ Error updating scrap assignment:', error)
      alert('Failed to update assignment: ' + error.message)
    }
  }

  // Helper function to check if previous phase is completed
  const isPreviousPhaseCompleted = (item, currentPhaseIndex) => {
    if (currentPhaseIndex === 0) return true; // First phase is always available

    const previousPhase = item.phases[currentPhaseIndex - 1];
    if (!previousPhase) return true;

    // Previous phase must be completed (100% progress)
    return (
      calculatePhaseProgress(previousPhase) === 100 && previousPhase.end_time
    );
  };

  // Toggle Item Checkbox
  const toggleItemCheckbox = (partNumber) => {
    setItemCheckboxes((prev) => ({
      ...prev,
      [partNumber]: !prev[partNumber],
    }));
  };

  // Get checked items count
  const getCheckedItemsCount = () => {
    return Object.values(itemCheckboxes).filter(Boolean).length;
  };

  return (
    <div className="pb-20 sm:pb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
        <h2
          className={`text-xl sm:text-2xl font-bold ${isDarkMode ? "text-gray-200" : "text-gray-800"
            }`}
        >
          Progress Checklist
        </h2>
      </div>

      {/* Search and Filter Bar - Mobile Optimized */}
      <div
        className={`backdrop-blur-md rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 border transition-all shadow-sm ${isDarkMode
          ? "bg-gray-800/60 border-gray-700/50"
          : "bg-white/30 border-white/40"
          }`}
      >
        <div className="flex flex-col gap-3">
          {/* Search - Full width on mobile */}
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none z-10"
            />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className={`w-full pl-10 pr-4 py-3 sm:py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 transition-all text-base ${isDarkMode
                ? "bg-gray-700/50 border border-gray-600/50 text-gray-100 placeholder-gray-400"
                : "bg-white/50 border border-gray-300/30 text-gray-800 placeholder-gray-500"
                }`}
            />
          </div>

          {/* Filter Button - Full width on mobile */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center justify-center gap-2 px-4 py-3 sm:py-2 bg-slate-600 hover:bg-slate-700 active:bg-slate-800 text-white rounded-lg transition-colors text-base sm:text-sm font-medium w-full sm:w-auto"
          >
            <Filter size={18} />
            <span>Filters</span>
            {(filterClient || filterPriority || filterStatus || sortBy) &&
              ` (${[filterClient, filterPriority, filterStatus, sortBy].filter(
                Boolean
              ).length
              })`}
          </button>
        </div>

        {/* Filter Options - Mobile Optimized */}
        {showFilters && (
          <div className="mt-3 pt-3 border-t border-gray-300/20 dark:border-gray-700/20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Filter by Client
              </label>
              <select
                value={filterClient}
                onChange={(e) => setFilterClient(e.target.value)}
                className={`w-full px-3 py-3 sm:py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 transition-all text-base ${isDarkMode
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Filter by Priority
              </label>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className={`w-full px-3 py-3 sm:py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 transition-all text-base ${isDarkMode
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

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Filter by Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className={`w-full px-3 py-3 sm:py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 transition-all text-base ${isDarkMode
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sort by
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className={`w-full px-3 py-3 sm:py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 transition-all text-base ${isDarkMode
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

            {(filterClient || filterPriority || filterStatus || sortBy) && (
              <div className="sm:col-span-2 lg:col-span-4">
                <button
                  onClick={() => {
                    setFilterClient("");
                    setFilterPriority("");
                    setFilterStatus("");
                    setSortBy("");
                    setCurrentPage(1);
                  }}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline active:text-blue-700 py-2"
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
          <div
            className={`animate-spin rounded-full h-8 w-8 border-b-2 mx-auto ${isDarkMode ? "border-slate-400" : "border-slate-600"
              }`}
          ></div>
          <p
            className={`mt-4 text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"
              }`}
          >
            Filtering items...
          </p>
        </div>
      )}

      {/* Bulk Edit Section - Mobile Optimized */}
      {getCheckedItemsCount() > 0 && (
        <div
          className={`backdrop-blur-md rounded-lg p-3 sm:p-4 mb-4 border transition-all shadow-sm ${isDarkMode
            ? "bg-purple-500/10 border-purple-500/30"
            : "bg-purple-500/10 border-purple-500/30"
            }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <span
              className={`text-sm font-medium ${isDarkMode ? "text-purple-300" : "text-purple-700"
                }`}
            >
              {getCheckedItemsCount()} item(s) selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const selected = Object.keys(itemCheckboxes)
                    .filter((partNumber) => itemCheckboxes[partNumber])
                    .map((partNumber) =>
                      items.find((item) => item.part_number === partNumber)
                    )
                    .filter(Boolean);
                  setSelectedItemsForBulk(selected);
                  setShowBulkEditModal(true);
                }}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white px-4 py-2.5 sm:py-2 rounded-lg transition-colors text-sm font-medium"
              >
                <Edit2 size={16} />
                <span>Bulk Edit</span>
              </button>
              <button
                onClick={() => setItemCheckboxes({})}
                className="flex-1 sm:flex-none px-4 py-2.5 sm:py-2 bg-gray-500 hover:bg-gray-600 active:bg-gray-700 text-white rounded-lg transition-colors text-sm font-medium"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats - Mobile Optimized */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div
          className={`backdrop-blur-md rounded-lg p-3 sm:p-4 border transition-all shadow-sm ${isDarkMode
            ? "bg-blue-500/10 border-blue-500/30"
            : "bg-gradient-to-r from-blue-500/10 to-blue-400/10 border-blue-500/30"
            }`}
        >
          <h3
            className={`text-sm sm:text-lg font-semibold ${isDarkMode ? "text-blue-300" : "text-blue-700"
              }`}
          >
            In Progress
          </h3>
          <p
            className={`text-2xl sm:text-3xl font-bold mt-1 sm:mt-2 ${isDarkMode ? "text-blue-400" : "text-blue-600"
              }`}
          >
            {inProgressItems.length}
          </p>
        </div>
        <div
          className={`backdrop-blur-md rounded-lg p-3 sm:p-4 border transition-all shadow-sm ${isDarkMode
            ? "bg-green-500/10 border-green-500/30"
            : "bg-gradient-to-r from-green-500/10 to-green-400/10 border-green-500/30"
            }`}
        >
          <h3
            className={`text-sm sm:text-lg font-semibold ${isDarkMode ? "text-green-300" : "text-green-700"
              }`}
          >
            Completed
          </h3>
          <p
            className={`text-2xl sm:text-3xl font-bold mt-1 sm:mt-2 ${isDarkMode ? "text-green-400" : "text-green-600"
              }`}
          >
            {completedItems.length}
          </p>
        </div>
      </div>

      {!isFiltering && items.length > 0 ? (
        <div className="space-y-6 sm:space-y-8">
          {/* In Progress Items */}
          {inProgressItems.length > 0 && (
            <div>
              <h3
                className={`text-xl sm:text-2xl font-bold mb-3 sm:mb-4 flex items-center gap-2 ${isDarkMode ? "text-gray-200" : "text-gray-800"
                  }`}
              >
                <Clock size={20} />
                In Progress ({inProgressItems.length})
              </h3>
              <div className="space-y-3 sm:space-y-4">
                {sortedInProgressItems.map((item) => {
                  const itemKey = item.part_number || item.id;
                  const priority = item.priority || "Medium";
                  const elapsedSeconds = getItemElapsedTime(item);
                  const progress = calculateItemProgress(item);

                  return (
                    <div
                      key={itemKey}
                      className={`backdrop-blur-md rounded-lg border overflow-hidden transition-all shadow-sm ${isDarkMode
                        ? "bg-gray-800/60 border-gray-700/50"
                        : "bg-white/30 border-white/40"
                        }`}
                    >
                      {/* Item Header - Mobile Optimized */}
                      <div className="p-3 sm:p-4">
                        <div className="flex flex-col gap-3 mb-3">
                          {/* Top Row: Expand + Title + Progress */}
                          <div className="flex items-start gap-3">
                            <button
                              onClick={() =>
                                toggleItemExpansion(item.part_number)
                              }
                              className="shrink-0 p-1 hover:bg-gray-200/20 active:bg-gray-200/30 rounded transition-colors mt-0.5"
                            >
                              <span className="text-xl">
                                {expandedItems[item.part_number] ? "▼" : "▶"}
                              </span>
                            </button>

                            <div className="flex-1 min-w-0">
                              <h3
                                className={`font-semibold text-base sm:text-lg lg:text-xl ${isDarkMode ? "text-gray-200" : "text-gray-800"
                                  } break-words`}
                              >
                                {item.name}
                              </h3>
                              <p
                                className={`text-xs sm:text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"
                                  } mt-1`}
                              >
                                Part #: {item.part_number}
                              </p>
                            </div>

                            <span
                              className={`text-lg sm:text-xl font-bold shrink-0 ${isDarkMode ? "text-gray-200" : "text-gray-800"
                                }`}
                            >
                              {progress}%
                            </span>
                          </div>

                          {/* Badges Row */}
                          <div className="flex flex-wrap gap-2 pl-10">
                            <div
                              className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${getPriorityColor(
                                priority
                              )}`}
                            >
                              <Flag size={12} />
                              {priority}
                            </div>
                            {item.client_name && (
                              <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500">
                                <User size={12} />
                                <span className="max-w-[150px] sm:max-w-none truncate">
                                  {item.client_name}
                                </span>
                              </div>
                            )}
                            {item.quantity && item.quantity > 1 && (
                              <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500">
                                <Package size={12} />
                                Qty: {item.quantity}
                              </div>
                            )}
                          </div>

                          {/* Action Buttons Row */}
                          <div className="flex flex-wrap items-center gap-2 pl-10">
                            {/* Priority Buttons */}
                            <div
                              className="flex gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {["High", "Medium", "Low"].map((p) => (
                                <button
                                  key={p}
                                  onClick={() =>
                                    handleUpdatePriority(item.part_number, p)
                                  }
                                  className={`p-2 text-xs rounded transition-colors active:scale-95 ${priority === p
                                    ? getPriorityColor(p)
                                    : isDarkMode
                                      ? "text-gray-400 hover:text-gray-300 active:bg-gray-700"
                                      : "text-gray-400 hover:text-gray-600 active:bg-gray-200"
                                    }`}
                                  title={`Set ${p} priority`}
                                >
                                  <Flag size={16} />
                                </button>
                              ))}
                            </div>

                            {/* Checkbox */}
                            <label
                              className="flex items-center"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                type="checkbox"
                                checked={
                                  itemCheckboxes[item.part_number] || false
                                }
                                onChange={() =>
                                  toggleItemCheckbox(item.part_number)
                                }
                                className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                title="Select for bulk edit"
                              />
                            </label>

                            {/* Action Buttons */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedItemForEdit(item);
                                setShowEditItemModal(true);
                              }}
                              className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 active:bg-blue-500/20 rounded transition-colors"
                              title="Edit item"
                            >
                              <Edit2 size={16} />
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedItemForEdit(item);
                                setShowAddPhaseModal(true);
                              }}
                              className="p-2 text-green-600 dark:text-green-400 hover:bg-green-500/10 active:bg-green-500/20 rounded transition-colors"
                              title="Add phase"
                            >
                              <Plus size={16} />
                            </button>

                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (
                                  window.confirm(
                                    `Delete "${item.name}" (${item.part_number})?\n\nThis will permanently delete all phases and subphases. This action cannot be undone.`
                                  )
                                ) {
                                  try {
                                    setItems((prevItems) =>
                                      prevItems.filter(
                                        (i) =>
                                          i.part_number !== item.part_number
                                      )
                                    );
                                    await apiService.operations.deleteItem(
                                      item.part_number
                                    );
                                    alert(
                                      `"${item.name}" has been deleted successfully.`
                                    );
                                  } catch (error) {
                                    console.error(
                                      "Error deleting item:",
                                      error
                                    );
                                    alert(
                                      "Failed to delete item: " + error.message
                                    );
                                    await loadData();
                                  }
                                }
                              }}
                              className="p-2 text-red-600 dark:text-red-400 hover:bg-red-500/10 active:bg-red-500/20 rounded transition-colors"
                              title="Delete item"
                            >
                              <Trash2 size={16} />
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openTransferModal(item);
                              }}
                              className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 active:bg-blue-500/20 rounded transition-colors"
                              title="Transfer"
                            >
                              <ArrowRightLeft size={16} />
                            </button>
                          </div>

                          {/* Remarks */}
                          {item.remarks && (
                            <div className="pl-10">
                              <p
                                className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"
                                  } italic flex items-start gap-1`}
                              >
                                <FileText
                                  size={12}
                                  className="mt-0.5 shrink-0"
                                />
                                <span className="line-clamp-2">
                                  {item.remarks}
                                </span>
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Phases - Mobile Optimized */}
                      {expandedItems[item.part_number] && (
                        <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-3">
                          {item.phases && item.phases.length > 0 ? (
                            item.phases.map((phase, phaseIndex) => {
                              const phaseKey = phase.id;
                              const isFirstPhase = phaseIndex === 0;
                              const isPreviousPhaseComplete =
                                isPreviousPhaseCompleted(item, phaseIndex);
                              const isPhaseDisabled =
                                !isFirstPhase && !isPreviousPhaseComplete;

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

                                  {/* Phase Header - Mobile Optimized */}
                                  <div className="p-3">
                                    <div className="flex flex-col gap-3">
                                      {/* Phase Title Row */}
                                      <div className="flex items-start gap-2">
                                        <button
                                          onClick={() =>
                                            togglePhaseExpansion(phase.id)
                                          }
                                          className="shrink-0 p-1 hover:bg-gray-200/20 active:bg-gray-200/30 rounded transition-colors"
                                        >
                                          <span className="text-base">
                                            {expandedPhases[phase.id]
                                              ? "▼"
                                              : "▶"}
                                          </span>
                                        </button>

                                        <div className="flex-1 min-w-0">
                                          <div className="flex flex-wrap items-center gap-2">
                                            <span
                                              className={`font-medium text-base sm:text-lg ${isDarkMode
                                                ? "text-gray-200"
                                                : "text-gray-800"
                                                }`}
                                            >
                                              {phase.name}
                                            </span>
                                            {isFirstPhase && (
                                              <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded">
                                                Phase 1
                                              </span>
                                            )}
                                            <span
                                              className={`text-xs sm:text-sm ${isDarkMode
                                                ? "text-gray-400"
                                                : "text-gray-600"
                                                }`}
                                            >
                                              ({phase.subphases?.length || 0}{" "}
                                              sub)
                                            </span>
                                          </div>
                                        </div>

                                        {/* Edit/Add Buttons */}
                                        <div
                                          className="flex gap-1 shrink-0"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <button
                                            onClick={() => {
                                              setSelectedItemForEdit(item);
                                              setSelectedPhaseForEdit(phase);
                                              setShowEditPhaseModal(true);
                                            }}
                                            className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 active:bg-blue-500/20 rounded transition-colors"
                                            title="Edit phase"
                                          >
                                            <Edit2 size={14} />
                                          </button>
                                          <button
                                            onClick={() => {
                                              setSelectedItemForEdit(item);
                                              setSelectedPhaseForEdit(phase);
                                              setShowAddSubphaseModal(true);
                                            }}
                                            className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-500/10 active:bg-green-500/20 rounded transition-colors"
                                            title="Add subphase"
                                          >
                                            <Plus size={14} />
                                          </button>
                                        </div>
                                      </div>

                                      {/* Progress Bar */}
                                      <div className="flex items-center gap-3">
                                        <div
                                          className={`flex-1 rounded-full h-2 ${isDarkMode
                                            ? "bg-gray-700"
                                            : "bg-gray-300"
                                            }`}
                                        >
                                          <div
                                            className="bg-slate-600 dark:bg-slate-400 h-2 rounded-full transition-all duration-300"
                                            style={{
                                              width: `${calculatePhaseProgress(
                                                phase
                                              )}%`,
                                            }}
                                          ></div>
                                        </div>
                                        <span
                                          className={`text-sm font-semibold w-12 text-right ${isDarkMode
                                            ? "text-gray-200"
                                            : "text-gray-800"
                                            }`}
                                        >
                                          {calculatePhaseProgress(phase)}%
                                        </span>
                                      </div>
                                    </div>

                                    {/* Phase Duration Tracker - Mobile Optimized */}
                                    <div
                                      className={`rounded-lg p-3 mt-3 ${isDarkMode
                                        ? "bg-slate-500/20"
                                        : "bg-slate-500/10"
                                        }`}
                                    >
                                      <div className="flex flex-col gap-2 mb-3">
                                        <div className="flex items-center justify-between">
                                          <span
                                            className={`text-sm font-semibold flex items-center gap-2 ${isDarkMode
                                              ? "text-gray-300"
                                              : "text-gray-700"
                                              }`}
                                          >
                                            <Calendar size={16} />
                                            Duration
                                          </span>
                                          {phase.expected_hours && (
                                            <span
                                              className={`text-xs px-2 py-1 rounded ${isDarkMode
                                                ? "bg-purple-500/20 text-purple-300"
                                                : "bg-purple-500/20 text-purple-700"
                                                }`}
                                            >
                                              Expected:{" "}
                                              {Number.parseFloat(
                                                phase.expected_hours
                                              ).toFixed(1)}
                                              h
                                            </span>
                                          )}
                                        </div>

                                        <div className="flex items-center justify-between">
                                          <Clock
                                            size={18}
                                            className="text-slate-600 dark:text-slate-400"
                                          />
                                          <span
                                            className={`text-lg sm:text-xl font-mono font-bold ${isDarkMode
                                              ? "text-gray-200"
                                              : "text-gray-800"
                                              }`}
                                          >
                                            {formatTime(
                                              getPhaseElapsedTime(phase)
                                            )}
                                          </span>
                                          {phase.end_time &&
                                            phase.expected_hours &&
                                            phase.actual_hours && (
                                              <span
                                                className={`text-xs px-2 py-1 rounded font-medium ${phase.actual_hours >
                                                  phase.expected_hours
                                                  ? "bg-red-500/20 text-red-700 dark:text-red-300"
                                                  : "bg-green-500/20 text-green-700 dark:text-green-300"
                                                  }`}
                                              >
                                                {phase.actual_hours >
                                                  phase.expected_hours
                                                  ? "+"
                                                  : ""}
                                                {(
                                                  phase.actual_hours -
                                                  phase.expected_hours
                                                ).toFixed(1)}
                                                h
                                              </span>
                                            )}
                                        </div>
                                      </div>

                                      {/* Progress vs Expected */}
                                      {phase.expected_hours &&
                                        phase.start_time &&
                                        !phase.end_time && (
                                          <div className="mb-3">
                                            <div className="flex justify-between text-xs mb-1">
                                              <span
                                                className={
                                                  isDarkMode
                                                    ? "text-gray-400"
                                                    : "text-gray-600"
                                                }
                                              >
                                                Progress vs Expected
                                              </span>
                                              <span
                                                className={
                                                  isDarkMode
                                                    ? "text-gray-400"
                                                    : "text-gray-600"
                                                }
                                              >
                                                {(
                                                  (getPhaseElapsedTime(phase) /
                                                    3600 /
                                                    phase.expected_hours) *
                                                  100
                                                ).toFixed(0)}
                                                %
                                              </span>
                                            </div>
                                            <div
                                              className={`w-full rounded-full h-2 ${isDarkMode
                                                ? "bg-gray-700"
                                                : "bg-gray-300"
                                                }`}
                                            >
                                              <div
                                                className={`h-2 rounded-full transition-all duration-300 ${getPhaseElapsedTime(phase) /
                                                  3600 >
                                                  phase.expected_hours
                                                  ? "bg-red-500"
                                                  : "bg-purple-500"
                                                  }`}
                                                style={{
                                                  width: `${Math.min(
                                                    100,
                                                    (getPhaseElapsedTime(
                                                      phase
                                                    ) /
                                                      3600 /
                                                      phase.expected_hours) *
                                                    100
                                                  )}%`,
                                                }}
                                              ></div>
                                            </div>
                                            <p
                                              className={`text-xs mt-1 ${isDarkMode
                                                ? "text-gray-400"
                                                : "text-gray-600"
                                                }`}
                                            >
                                              {(
                                                getPhaseElapsedTime(phase) /
                                                3600
                                              ).toFixed(2)}
                                              h of {phase.expected_hours}h
                                            </p>
                                          </div>
                                        )}

                                      {/* Start/End Times - Mobile Optimized */}
                                      <div className="space-y-1 text-xs mb-3">
                                        <div className="flex justify-between">
                                          <span
                                            className={
                                              isDarkMode
                                                ? "text-gray-400"
                                                : "text-gray-600"
                                            }
                                          >
                                            Start:
                                          </span>
                                          <span
                                            className={`font-medium ${isDarkMode
                                              ? "text-gray-200"
                                              : "text-gray-800"
                                              }`}
                                          >
                                            {formatDateTime(phase.start_time)}
                                          </span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span
                                            className={
                                              isDarkMode
                                                ? "text-gray-400"
                                                : "text-gray-600"
                                            }
                                          >
                                            End:
                                          </span>
                                          <span
                                            className={`font-medium ${isDarkMode
                                              ? "text-gray-200"
                                              : "text-gray-800"
                                              }`}
                                          >
                                            {phase.end_time
                                              ? formatDateTime(phase.end_time)
                                              : phase.pause_time
                                                ? "Paused"
                                                : "In progress"}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Action Buttons - Mobile Optimized */}
                                      <div className="grid grid-cols-1 gap-2">
                                        {!phase.start_time ? (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleStartPhase(
                                                item.part_number,
                                                phase.id
                                              );
                                            }}
                                            className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
                                          >
                                            <Play size={16} />
                                            Start Phase
                                          </button>
                                        ) : phase.pause_time &&
                                          !phase.end_time ? (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleResumePhase(
                                                item.part_number,
                                                phase.id
                                              );
                                            }}
                                            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
                                          >
                                            <Play size={16} />
                                            Resume Phase
                                          </button>
                                        ) : !phase.end_time ? (
                                          <div className="grid grid-cols-2 gap-2">
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handlePausePhase(
                                                  item.part_number,
                                                  phase.id
                                                );
                                              }}
                                              className="flex items-center justify-center gap-2 bg-yellow-600 hover:bg-yellow-700 active:bg-yellow-800 text-white px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
                                            >
                                              <Pause size={16} />
                                              Pause
                                            </button>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleStopPhase(
                                                  item.part_number,
                                                  phase.id
                                                );
                                              }}
                                              className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white px-3 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                                              disabled={
                                                calculatePhaseProgress(phase) <
                                                100
                                              }
                                            >
                                              <StopCircle size={16} />
                                              {calculatePhaseProgress(phase) ===
                                                100
                                                ? "Stop"
                                                : "Complete First"}
                                            </button>
                                          </div>
                                        ) : (
                                          <div className="flex items-center justify-center gap-2 bg-green-600/80 text-white px-3 py-2.5 rounded-lg text-sm font-medium">
                                            <CheckCircle size={16} />
                                            Phase Completed
                                          </div>
                                        )}

                                        {phase.start_time && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleResetPhase(
                                                item.part_number,
                                                phase.id
                                              );
                                            }}
                                            className="px-3 py-2.5 bg-gray-600 hover:bg-gray-700 active:bg-gray-800 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                          >
                                            <RotateCcw size={16} />
                                            Reset Duration
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Sub-Phases - Mobile Optimized */}
                                  {expandedPhases[phase.id] && (
                                    <div className="px-3 pb-3 space-y-2">
                                      {phase.subphases &&
                                        phase.subphases.length > 0 ? (
                                        phase.subphases.map(
                                          (subphase, subphaseIndex) => {
                                            const subPhaseKey = subphase.id;
                                            const conditionMet =
                                              isSubphaseConditionMet(
                                                item,
                                                phase,
                                                subphase,
                                                subphaseIndex
                                              );
                                            const isDisabled =
                                              !conditionMet &&
                                              subphase.completed != 1;

                                            return (
                                              <div
                                                key={subPhaseKey}
                                                className={`p-3 rounded-lg border ${isDarkMode
                                                  ? "bg-black/10 border-gray-700/10"
                                                  : "bg-white/5 border-gray-300/10"
                                                  }`}
                                              >
                                                <div className="flex items-start gap-3">
                                                  {/* Checkbox - Larger touch target */}
                                                  <div className="relative shrink-0 pt-0.5">
                                                    <input
                                                      type="checkbox"
                                                      checked={
                                                        subphase.completed == 1
                                                      }
                                                      disabled={isDisabled}
                                                      onChange={() => {
                                                        if (!isDisabled) {
                                                          const action =
                                                            subphase.completed !=
                                                              1
                                                              ? "complete"
                                                              : "incomplete";
                                                          if (
                                                            window.confirm(
                                                              `Mark "${subphase.name}" as ${action}?`
                                                            )
                                                          ) {
                                                            handleToggleSubPhase(
                                                              item.part_number,
                                                              phase.id,
                                                              subphase.id,
                                                              subphase.completed ==
                                                              1
                                                            );
                                                          }
                                                        }
                                                      }}
                                                      className={`w-6 h-6 rounded border-gray-300 dark:border-gray-600 text-slate-600 focus:ring-slate-500 focus:ring-2 ${isDisabled
                                                        ? "cursor-not-allowed opacity-50"
                                                        : "cursor-pointer"
                                                        }`}
                                                      title={
                                                        isDisabled
                                                          ? !phase.start_time
                                                            ? "Phase not started"
                                                            : phase.pause_time
                                                              ? "Phase paused"
                                                              : phase.end_time
                                                                ? "Phase completed"
                                                                : !subphase.employee_barcode
                                                                  ? "Assign employee first"
                                                                  : "Conditions not met"
                                                          : subphase.completed ==
                                                            1
                                                            ? "Mark incomplete"
                                                            : "Mark complete"
                                                      }
                                                    />
                                                    {isDisabled && (
                                                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-gray-800" />
                                                    )}
                                                  </div>

                                                  <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2 mb-2">
                                                      <div className="flex items-center gap-2 flex-1 min-w-0">
                                                        <p
                                                          className={`font-medium text-sm sm:text-base break-words ${subphase.completed ==
                                                            1
                                                            ? "line-through opacity-60"
                                                            : isDisabled
                                                              ? "opacity-50"
                                                              : ""
                                                            } ${isDarkMode
                                                              ? "text-gray-200"
                                                              : "text-gray-800"
                                                            }`}
                                                        >
                                                          {subphase.name}
                                                        </p>
                                                        <button
                                                          onClick={() => {
                                                            setSelectedItemForEdit(
                                                              item
                                                            );
                                                            setSelectedPhaseForEdit(
                                                              phase
                                                            );
                                                            setSelectedSubphaseForEdit(
                                                              subphase
                                                            );
                                                            setShowEditSubphaseModal(
                                                              true
                                                            );
                                                          }}
                                                          className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 active:bg-blue-500/20 rounded transition-colors shrink-0"
                                                          title="Edit"
                                                        >
                                                          <Edit2 size={14} />
                                                        </button>
                                                      </div>
                                                      {subphase.completed ==
                                                        1 && (
                                                          <CheckCircle
                                                            size={18}
                                                            className="text-green-500 shrink-0"
                                                          />
                                                        )}
                                                    </div>

                                                    {/* Condition Warning */}
                                                    {isDisabled && (
                                                      <div
                                                        className={`mb-2 p-2 rounded text-xs ${isDarkMode
                                                          ? "text-yellow-400 bg-yellow-500/10 border border-yellow-500/30"
                                                          : "text-yellow-700 bg-yellow-500/10 border border-yellow-500/30"
                                                          }`}
                                                      >
                                                        {!subphase.employee_barcode ? (
                                                          <>
                                                            ⚠️ Assign employee
                                                            first
                                                          </>
                                                        ) : subphaseIndex > 0 &&
                                                          !isPreviousSubphaseCompleted(
                                                            item,
                                                            phase,
                                                            subphaseIndex
                                                          ) ? (
                                                          <>
                                                            ⚠️ Complete previous
                                                            first
                                                          </>
                                                        ) : subphase.expected_quantity >
                                                          0 &&
                                                          (subphase.current_completed_quantity ||
                                                            0) <
                                                          subphase.expected_quantity ? (
                                                          <>
                                                            ⚠️ Need{" "}
                                                            {
                                                              subphase.expected_quantity
                                                            }{" "}
                                                            units (have:{" "}
                                                            {subphase.current_completed_quantity ||
                                                              0}
                                                            )
                                                          </>
                                                        ) : !phase.start_time ? (
                                                          <>
                                                            ⚠️ Start phase first
                                                          </>
                                                        ) : phase.pause_time ? (
                                                          <>⚠️ Phase paused</>
                                                        ) : phase.end_time ? (
                                                          <>
                                                            ⚠️ Phase completed
                                                          </>
                                                        ) : (
                                                          <>
                                                            ⚠️ Conditions not
                                                            met
                                                          </>
                                                        )}
                                                      </div>
                                                    )}

                                                    {/* Time Duration */}
                                                    {subphase.time_duration >
                                                      0 && (
                                                        <p
                                                          className={`text-xs sm:text-sm ${isDarkMode
                                                            ? "text-gray-400"
                                                            : "text-gray-600"
                                                            } italic flex items-center gap-1 mb-2`}
                                                        >
                                                          <Clock size={12} />
                                                          {formatDuration(
                                                            subphase.time_duration /
                                                            60
                                                          )}{" "}
                                                          {/* Convert seconds to minutes */}
                                                        </p>
                                                      )}

                                                    {/* Expected Duration & Quantity */}
                                                    <div className="flex flex-wrap gap-2 items-center mb-2">
                                                      <span className="text-xs bg-blue-500/20 text-blue-700 dark:text-blue-300 px-2 py-1 rounded flex items-center gap-1">
                                                        <Clock size={12} />
                                                        {formatDuration(
                                                          subphase.expected_duration
                                                        )}{" "}
                                                        {/* Convert seconds to minutes */}
                                                      </span>

                                                      {/* Quantity Tracking */}
                                                      {subphase.expected_quantity !==
                                                        undefined &&
                                                        subphase.expected_quantity !==
                                                        null &&
                                                        subphase.expected_quantity >
                                                        0 && (
                                                          <>
                                                            <span className="text-xs bg-purple-500/20 text-purple-700 dark:text-purple-300 px-2 py-1 rounded flex items-center gap-1">
                                                              <Package
                                                                size={12}
                                                              />
                                                              {subphase.current_completed_quantity ||
                                                                0}{" "}
                                                              /{" "}
                                                              {
                                                                subphase.expected_quantity
                                                              }
                                                            </span>
                                                            <button
                                                              onClick={() =>
                                                                openQuantityModal(
                                                                  item,
                                                                  phase,
                                                                  subphase
                                                                )
                                                              }
                                                              className="text-xs bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white px-3 py-1.5 rounded transition-colors"
                                                            >
                                                              Update
                                                            </button>
                                                            <button
                                                              onClick={() =>
                                                                openTransferModal(
                                                                  item,
                                                                  phase,
                                                                  subphase
                                                                )
                                                              }
                                                              className="flex items-center gap-1 text-xs bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-3 py-1.5 rounded transition-colors"
                                                            >
                                                              <ArrowRightLeft
                                                                size={12}
                                                              />
                                                              Transfer
                                                            </button>
                                                          </>
                                                        )}
                                                    </div>

                                                    {/* ✅ Enhanced Materials Display - RESPONSIVE VERSION */}
{(() => {
  // ✅ Get materials from loaded data
  let materialsArray = [];

  if (subphase.materials && Array.isArray(subphase.materials)) {
    materialsArray = subphase.materials;
  }

  console.log(`🔍 Materials for ${subphase.name}:`, materialsArray.length);

  if (materialsArray.length > 0) {
    return (
      <div className="space-y-2 mb-2">
        {/* Header with Checkout Button - Mobile Optimized */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="text-xs font-semibold text-gray-600 dark:text-gray-400">
            Required Materials ({materialsArray.length}):
          </div>
          {/* Checkout button - only show if there are unchecked materials */}
          {materialsArray.some((m) => !m.checked_out_by_uid || m.checked_out_by_uid === 'SYSTEM') && (
            <button
              onClick={() => handleCheckoutSubphaseMaterials(item, phase, subphase)}
              className="w-full sm:w-auto flex items-center justify-center gap-1 text-xs bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-3 py-2 rounded transition-colors"
            >
              <Package size={12} />
              Checkout All
            </button>
          )}
        </div>

        {/* Materials List - Mobile Optimized */}
        {materialsArray.map((material, idx) => (
          <div key={material.id || idx} className="space-y-2">
            {/* Material Card - Stacked Layout for Mobile */}
            <div
              className={`rounded-lg border overflow-hidden ${
                isDarkMode
                  ? "bg-blue-500/10 border-blue-500/30"
                  : "bg-blue-500/10 border-blue-500/30"
              }`}
            >
              {/* Material Info Section */}
              <div className="p-2.5">
                <div className="flex items-start gap-2 mb-2">
                  <Package size={14} className="text-blue-500 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-gray-700 dark:text-gray-300 break-words">
                      {material.material_name}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                      {material.material_quantity} {material.unit_of_measure || "pcs"}
                    </div>
                  </div>
                </div>

                {/* Status & Action Buttons - Mobile Optimized */}
                <div className="flex flex-col gap-2 mt-2">
                  {/* ✅ Check if it's a scrap-reuse material */}
                  {material.notes && material.notes.includes('SCRAP-REUSE') ? (
                    // ✅ For scrap-reuse materials
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-xs ${
                        isDarkMode
                          ? "bg-orange-500/20 text-orange-300 border border-orange-500/30"
                          : "bg-orange-500/20 text-orange-700 border border-orange-500/30"
                      }`}>
                        <CheckCircle size={12} />
                        <span className="font-medium">SCRAP-REUSE</span>
                      </div>
                      {/* ✅ Update Assignment Button */}
                      <button
                        onClick={() => handleUpdateScrapAssignment(item, phase, subphase, material)}
                        className="flex items-center justify-center gap-1 text-xs bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white px-3 py-2 rounded transition-colors"
                        title="Update employee assignment"
                      >
                        <User size={12} />
                        <span>Update Assignment</span>
                      </button>
                    </div>
                  ) : (
                    // ✅ For regular warehouse materials
                    material.checked_out_by_uid && material.checked_out_by_uid !== 'SYSTEM' ? (
                      <div className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded text-xs ${
                        isDarkMode
                          ? "bg-green-500/20 text-green-300 border border-green-500/30"
                          : "bg-green-500/20 text-green-700 border border-green-500/30"
                      }`}>
                        <CheckCircle size={12} />
                        <span className="font-medium">Checked Out</span>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <div className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-xs ${
                          isDarkMode
                            ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
                            : "bg-yellow-500/20 text-yellow-700 border border-yellow-500/30"
                        }`}>
                          <Clock size={12} />
                          <span className="font-medium">Pending Checkout</span>
                        </div>
                        <button
                          onClick={() => handleCheckoutSingleMaterial(item, phase, subphase, material)}
                          className="flex items-center justify-center gap-1 text-xs bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-3 py-2 rounded transition-colors"
                        >
                          <Package size={12} />
                          <span>Checkout Now</span>
                        </button>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Checkout Details Section - Collapsible on Mobile */}
              {(() => {
                const isScrapReuse = material.notes && material.notes.includes('SCRAP-REUSE');
                const hasCheckoutInfo = material.checked_out_by_name || material.checked_out_by;
                
                if (!hasCheckoutInfo) return null;

                return (
                  <div className={`border-t p-2.5 text-xs ${
                    isScrapReuse
                      ? isDarkMode
                        ? "bg-orange-700/20 border-orange-600/30"
                        : "bg-orange-100/80 border-orange-300/30"
                      : isDarkMode
                      ? "bg-gray-700/30 border-gray-600/30"
                      : "bg-gray-100/80 border-gray-300/30"
                  }`}>
                    {isScrapReuse ? (
                      // Scrap-reuse details
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1 font-semibold text-orange-700 dark:text-orange-300">
                          <AlertTriangle size={12} />
                          <span>REUSED SCRAP MATERIAL</span>
                        </div>
                        <div className="space-y-1 pl-3 text-gray-700 dark:text-gray-300">
                          <div className="flex items-start gap-1">
                            <span className="shrink-0">⚠️</span>
                            <span>No warehouse deduction (reused from scrap)</span>
                          </div>
                          {material.checked_out_by_name && (
                            <div className="flex items-start gap-1">
                              <span className="shrink-0">👤</span>
                              <span>Assigned to: <strong>{material.checked_out_by_name}</strong></span>
                            </div>
                          )}
                          {material.checked_out_by && (
                            <div className="flex items-start gap-1">
                              <span className="shrink-0">🆔</span>
                              <span className="break-all">{material.checked_out_by}</span>
                            </div>
                          )}
                          {material.checkout_date && (
                            <div className="flex items-start gap-1">
                              <span className="shrink-0">📅</span>
                              <span className="text-xs">{new Date(material.checkout_date).toLocaleString()}</span>
                            </div>
                          )}
                          <button
                            onClick={() => alert(material.notes)}
                            className="text-blue-600 dark:text-blue-400 hover:underline text-xs mt-1 flex items-center gap-1"
                          >
                            <span>View Full Details</span>
                            <span>→</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Regular checkout details
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1 font-semibold text-gray-700 dark:text-gray-300">
                          <User size={12} />
                          <span>Checked out by:</span>
                        </div>
                        <div className="pl-3 space-y-1">
                          <div className="font-medium text-gray-800 dark:text-gray-200">
                            {material.checked_out_by_name}
                          </div>
                          {material.checked_out_by && (
                            <div className="text-gray-600 dark:text-gray-400 break-all">
                              ID: {material.checked_out_by}
                            </div>
                          )}
                          {material.checkout_date && (
                            <div className="text-gray-600 dark:text-gray-400">
                              {new Date(material.checkout_date).toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return null;
})()}

                                                    {/* Quantity Update Modal - Mobile Optimized */}
                                                    {quantityModalOpen &&
                                                      quantityModalData && (
                                                        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
                                                          <div
                                                            className={`rounded-t-2xl sm:rounded-lg w-full sm:max-w-md sm:w-full p-4 sm:p-6 ${isDarkMode
                                                              ? "bg-gray-800"
                                                              : "bg-white"
                                                              }`}
                                                          >
                                                            <h3
                                                              className={`text-lg sm:text-xl font-bold mb-4 flex items-center gap-2 ${isDarkMode
                                                                ? "text-gray-200"
                                                                : "text-gray-800"
                                                                }`}
                                                            >
                                                              <Package
                                                                size={20}
                                                              />
                                                              Update Quantity
                                                            </h3>

                                                            <div
                                                              className={`mb-4 p-3 rounded-lg space-y-2 ${isDarkMode
                                                                ? "bg-gray-700"
                                                                : "bg-gray-100"
                                                                }`}
                                                            >
                                                              <div>
                                                                <p
                                                                  className={`text-sm ${isDarkMode
                                                                    ? "text-gray-400"
                                                                    : "text-gray-600"
                                                                    }`}
                                                                >
                                                                  Item:
                                                                </p>
                                                                <p
                                                                  className={`font-semibold ${isDarkMode
                                                                    ? "text-gray-200"
                                                                    : "text-gray-800"
                                                                    }`}
                                                                >
                                                                  {
                                                                    quantityModalData
                                                                      .item.name
                                                                  }
                                                                </p>
                                                              </div>
                                                              <div>
                                                                <p
                                                                  className={`text-sm ${isDarkMode
                                                                    ? "text-gray-400"
                                                                    : "text-gray-600"
                                                                    }`}
                                                                >
                                                                  Phase /
                                                                  Subphase:
                                                                </p>
                                                                <p
                                                                  className={`font-medium ${isDarkMode
                                                                    ? "text-gray-200"
                                                                    : "text-gray-800"
                                                                    }`}
                                                                >
                                                                  {
                                                                    quantityModalData
                                                                      .phase
                                                                      .name
                                                                  }{" "}
                                                                  →{" "}
                                                                  {
                                                                    quantityModalData
                                                                      .subphase
                                                                      .name
                                                                  }
                                                                </p>
                                                              </div>
                                                              <div>
                                                                <p
                                                                  className={`text-sm ${isDarkMode
                                                                    ? "text-gray-400"
                                                                    : "text-gray-600"
                                                                    }`}
                                                                >
                                                                  Expected:
                                                                </p>
                                                                <p
                                                                  className={`font-bold ${isDarkMode
                                                                    ? "text-blue-400"
                                                                    : "text-blue-600"
                                                                    }`}
                                                                >
                                                                  {
                                                                    quantityModalData
                                                                      .subphase
                                                                      .expected_quantity
                                                                  }
                                                                </p>
                                                              </div>
                                                            </div>

                                                            <div className="mb-4">
                                                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                                Completed
                                                                Quantity
                                                              </label>
                                                              <input
                                                                type="number"
                                                                min="0"
                                                                max={
                                                                  quantityModalData
                                                                    .subphase
                                                                    .expected_quantity
                                                                }
                                                                value={
                                                                  tempQuantity
                                                                }
                                                                onChange={(e) =>
                                                                  setTempQuantity(
                                                                    e.target
                                                                      .value
                                                                  )
                                                                }
                                                                onKeyPress={(
                                                                  e
                                                                ) =>
                                                                  e.key ===
                                                                  "Enter" &&
                                                                  handleUpdateCompletedQuantity()
                                                                }
                                                                autoFocus
                                                                className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-slate-500 text-base ${isDarkMode
                                                                  ? "bg-gray-700 border-gray-600 text-gray-200"
                                                                  : "bg-gray-100 border-gray-300 text-gray-800"
                                                                  }`}
                                                              />
                                                            </div>

                                                            <div className="flex flex-col sm:flex-row gap-3">
                                                              <button
                                                                onClick={
                                                                  handleUpdateCompletedQuantity
                                                                }
                                                                className="flex-1 bg-slate-600 hover:bg-slate-700 active:bg-slate-800 text-white px-4 py-3 sm:py-2 rounded-lg transition-colors font-medium text-base"
                                                              >
                                                                Update
                                                              </button>
                                                              <button
                                                                onClick={() => {
                                                                  setQuantityModalOpen(
                                                                    false
                                                                  );
                                                                  setQuantityModalData(
                                                                    null
                                                                  );
                                                                  setTempQuantity(
                                                                    ""
                                                                  );
                                                                }}
                                                                className="flex-1 bg-gray-500 hover:bg-gray-600 active:bg-gray-700 text-white px-4 py-3 sm:py-2 rounded-lg transition-colors font-medium text-base"
                                                              >
                                                                Cancel
                                                              </button>
                                                            </div>
                                                          </div>
                                                        </div>
                                                      )}

                                                    {/* Employee Badge */}
                                                    {subphase.employee_barcode && (
                                                      <div
                                                        className={`text-xs px-2 py-1 rounded inline-flex items-center gap-1 mb-2 ${isDarkMode
                                                          ? "bg-slate-500/20 text-slate-300"
                                                          : "bg-slate-500/20 text-slate-700"
                                                          }`}
                                                      >
                                                        <User size={12} />
                                                        {subphase.employee_name ||
                                                          "Unknown"}{" "}
                                                        (
                                                        {
                                                          subphase.employee_barcode
                                                        }
                                                        )
                                                      </div>
                                                    )}

                                                    {/* Assign Employee Button - Full Width on Mobile */}
                                                    <button
                                                      onClick={() =>
                                                        handleBarcodeScan(
                                                          item.part_number,
                                                          phase.id,
                                                          subphase.id
                                                        )
                                                      }
                                                      className="w-full px-3 py-2.5 text-sm bg-slate-600 hover:bg-slate-700 active:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded transition-colors flex items-center justify-center gap-2 mt-2"
                                                    >
                                                      <User size={14} />
                                                      Assign Employee
                                                    </button>

                                                    {/* Completion Time */}
                                                    {subphase.completed_at && (
                                                      <div
                                                        className={`text-xs mt-2 ${isDarkMode
                                                          ? "text-gray-400"
                                                          : "text-gray-600"
                                                          }`}
                                                      >
                                                        <p className="flex items-center gap-1">
                                                          <CheckCircle
                                                            size={12}
                                                          />
                                                          {new Date(
                                                            subphase.completed_at
                                                          ).toLocaleString()}
                                                        </p>
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          }
                                        )
                                      ) : (
                                        <p
                                          className={`text-sm ${isDarkMode
                                            ? "text-gray-400"
                                            : "text-gray-600"
                                            } py-2`}
                                        >
                                          No sub-phases yet.
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <p
                              className={`text-gray-600 ${isDarkMode ? "dark:text-gray-400" : ""
                                } py-4`}
                            >
                              No phases added yet.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Completed Items - Mobile Optimized */}
          {completedItems.length > 0 && (
            <div>
              <h3
                className={`text-xl sm:text-2xl font-bold mb-3 sm:mb-4 flex items-center gap-2 ${isDarkMode ? "text-green-300" : "text-green-700"
                  }`}
              >
                <CheckCircle size={20} />
                Completed ({completedItems.length})
              </h3>
              <div className="space-y-3 sm:space-y-4 opacity-75">
                {completedItems.map((item) => {
                  const itemKey = item.part_number || item.id;
                  const elapsedSeconds = getItemElapsedTime(item);

                  return (
                    <div
                      key={itemKey}
                      className={`backdrop-blur-md rounded-lg border overflow-hidden transition-all shadow-sm ${isDarkMode
                        ? "bg-green-500/10 border-green-500/30"
                        : "bg-gradient-to-r from-green-500/10 to-green-400/10 border-green-500/30"
                        }`}
                    >
                      <div className="p-3 sm:p-4">
                        <div className="flex items-start gap-3 mb-3">
                          <button
                            onClick={() =>
                              toggleItemExpansion(item.part_number)
                            }
                            className="shrink-0 p-1 hover:bg-gray-200/20 active:bg-gray-200/30 rounded transition-colors"
                          >
                            <span className="text-xl">
                              {expandedItems[item.part_number] ? "▼" : "▶"}
                            </span>
                          </button>

                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <h3
                                className={`font-semibold text-base sm:text-lg lg:text-xl ${isDarkMode ? "text-gray-200" : "text-gray-800"
                                  }`}
                              >
                                {item.name}
                              </h3>
                              <CheckCircle
                                size={16}
                                className="text-green-500"
                              />
                              {item.client_name && (
                                <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500">
                                  <User size={12} />
                                  <span className="max-w-[150px] sm:max-w-none truncate">
                                    {item.client_name}
                                  </span>
                                </div>
                              )}
                              {item.quantity && item.quantity > 1 && (
                                <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500">
                                  <Package size={12} />
                                  Qty: {item.quantity}
                                </div>
                              )}
                            </div>
                            <p
                              className={`text-xs sm:text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"
                                }`}
                            >
                              Part #: {item.part_number} •{" "}
                              {item.phases?.length || 0} phases
                            </p>
                            {item.remarks && (
                              <p
                                className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"
                                  } mt-1 italic flex items-start gap-1`}
                              >
                                <FileText
                                  size={12}
                                  className="mt-0.5 shrink-0"
                                />
                                <span className="line-clamp-2">
                                  {item.remarks}
                                </span>
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!expandedItems[item.part_number]) {
                                  toggleItemExpansion(item.part_number);
                                }
                                alert(
                                  "Please expand phases below and select a specific subphase to transfer from"
                                );
                              }}
                              className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 active:bg-blue-500/20 rounded transition-colors"
                              title="Transfer"
                            >
                              <ArrowRightLeft size={16} />
                            </button>
                            <span
                              className={`text-lg font-bold ${isDarkMode ? "text-green-400" : "text-green-600"
                                }`}
                            >
                              100%
                            </span>
                          </div>
                        </div>

                        {item.start_time && (
                          <div
                            className={`rounded-lg p-3 ${isDarkMode ? "bg-green-500/20" : "bg-green-500/10"
                              }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-2">
                              <span
                                className={`text-sm font-semibold flex items-center gap-2 ${isDarkMode
                                  ? "text-green-300"
                                  : "text-green-700"
                                  }`}
                              >
                                <CheckCircle size={16} />
                                Completed
                              </span>
                              <div className="flex items-center gap-2">
                                <Clock
                                  size={16}
                                  className="text-green-600 dark:text-green-400"
                                />
                                <span
                                  className={`text-lg font-mono font-bold ${isDarkMode
                                    ? "text-green-400"
                                    : "text-green-700"
                                    }`}
                                >
                                  {formatTime(elapsedSeconds)}
                                </span>
                              </div>
                            </div>

                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between">
                                <span
                                  className={
                                    isDarkMode
                                      ? "text-gray-400"
                                      : "text-gray-600"
                                  }
                                >
                                  Started:
                                </span>
                                <span
                                  className={`font-medium ${isDarkMode
                                    ? "text-gray-200"
                                    : "text-gray-800"
                                    }`}
                                >
                                  {formatDateTime(item.start_time)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span
                                  className={
                                    isDarkMode
                                      ? "text-gray-400"
                                      : "text-gray-600"
                                  }
                                >
                                  Completed:
                                </span>
                                <span
                                  className={`font-medium ${isDarkMode
                                    ? "text-gray-200"
                                    : "text-gray-800"
                                    }`}
                                >
                                  {formatDateTime(item.end_time)}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Completed Item Phases */}
                      {expandedItems[item.part_number] && (
                        <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-3">
                          {item.phases && item.phases.length > 0 ? (
                            item.phases.map((phase) => {
                              const phaseKey = phase.id;

                              return (
                                <div
                                  key={phaseKey}
                                  className={`rounded-lg border ${isDarkMode
                                    ? "border-gray-700/10"
                                    : "border-gray-300/10"
                                    }`}
                                >
                                  <div className="p-3">
                                    <div className="flex items-start gap-2 mb-2">
                                      <button
                                        onClick={() =>
                                          togglePhaseExpansion(phase.id)
                                        }
                                        className="shrink-0 p-1 hover:bg-gray-200/20 active:bg-gray-200/30 rounded transition-colors"
                                      >
                                        <span className="text-base">
                                          {expandedPhases[phase.id] ? "▼" : "▶"}
                                        </span>
                                      </button>
                                      <span
                                        className={`font-medium text-base flex-1 ${isDarkMode
                                          ? "text-gray-200"
                                          : "text-gray-800"
                                          }`}
                                      >
                                        {phase.name}
                                      </span>
                                      <span
                                        className={`text-sm font-semibold ${isDarkMode
                                          ? "text-green-400"
                                          : "text-green-600"
                                          }`}
                                      >
                                        100%
                                      </span>
                                    </div>

                                    {/* Completed Phase Subphases */}
                                    {expandedPhases[phase.id] &&
                                      phase.subphases &&
                                      phase.subphases.length > 0 && (
                                        <div className="mt-3 space-y-2 pl-4 border-l-2 dark:border-gray-700/20 border-gray-300/20">
                                          {phase.subphases.map((subphase) => (
                                            <div
                                              key={subphase.id}
                                              className={`p-3 rounded-lg ${isDarkMode
                                                ? "bg-black/10"
                                                : "bg-white/5"
                                                }`}
                                            >
                                              <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1 min-w-0">
                                                  <div className="flex items-center gap-2 mb-2">
                                                    <CheckCircle
                                                      size={14}
                                                      className="text-green-500 shrink-0"
                                                    />
                                                    <span
                                                      className={`text-sm font-medium ${isDarkMode
                                                        ? "text-gray-200"
                                                        : "text-gray-800"
                                                        }`}
                                                    >
                                                      {subphase.name}
                                                    </span>
                                                  </div>

                                                  {/* Quantity info */}
                                                  {subphase.expected_quantity >
                                                    0 && (
                                                      <div className="flex flex-wrap gap-2 items-center mb-2">
                                                        <span
                                                          className={`text-xs bg-purple-500/20 ${isDarkMode
                                                            ? "text-purple-300"
                                                            : "text-purple-800"
                                                            } px-2 py-1 rounded flex items-center gap-1`}
                                                        >
                                                          <Package size={12} />
                                                          {subphase.current_completed_quantity ||
                                                            0}{" "}
                                                          /{" "}
                                                          {
                                                            subphase.expected_quantity
                                                          }
                                                        </span>
                                                      </div>
                                                    )}

                                                  {/* Employee info */}
                                                  {subphase.employee_barcode && (
                                                    <div
                                                      className={`text-xs px-2 py-1 rounded inline-flex items-center gap-1 mb-2 ${isDarkMode
                                                        ? "bg-slate-500/20 text-slate-300"
                                                        : "bg-slate-500/20 text-slate-700"
                                                        }`}
                                                    >
                                                      <User size={12} />
                                                      {subphase.employee_name ||
                                                        "Unknown"}{" "}
                                                      (
                                                      {
                                                        subphase.employee_barcode
                                                      }
                                                      )
                                                    </div>
                                                  )}

                                                  {/* Completion time */}
                                                  {subphase.completed_at && (
                                                    <div
                                                      className={`text-xs ${isDarkMode
                                                        ? "text-gray-400"
                                                        : "text-gray-600"
                                                        }`}
                                                    >
                                                      <p className="flex items-center gap-1">
                                                        <CheckCircle
                                                          size={12}
                                                        />
                                                        {new Date(
                                                          subphase.completed_at
                                                        ).toLocaleString()}
                                                      </p>
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}

                                    {/* Duration Analysis */}
                                    {item.expected_completion_hours &&
                                      item.actual_completion_hours && (
                                        <div
                                          className={`mt-3 p-3 rounded-lg border ${isDarkMode
                                            ? "bg-purple-500/10 border-purple-500/30"
                                            : "bg-purple-500/10 border-purple-500/30"
                                            }`}
                                        >
                                          <div className="flex items-center justify-between mb-2">
                                            <span
                                              className={`text-sm font-semibold flex items-center gap-2 ${isDarkMode
                                                ? "text-purple-300"
                                                : "text-purple-700"
                                                }`}
                                            >
                                              <Clock size={14} />
                                              Analysis
                                            </span>
                                            <span
                                              className={`text-xs px-2 py-1 rounded font-bold ${item.actual_completion_hours >
                                                item.expected_completion_hours
                                                ? "bg-red-500/20 text-red-700 dark:text-red-300"
                                                : "bg-green-500/20 text-green-700 dark:text-green-300"
                                                }`}
                                            >
                                              {item.actual_completion_hours >
                                                item.expected_completion_hours
                                                ? "Over"
                                                : "Under"}{" "}
                                              by{" "}
                                              {Math.abs(
                                                item.actual_completion_hours -
                                                item.expected_completion_hours
                                              ).toFixed(1)}
                                              h
                                            </span>
                                          </div>
                                          <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div>
                                              <span
                                                className={
                                                  isDarkMode
                                                    ? "text-gray-400"
                                                    : "text-gray-600"
                                                }
                                              >
                                                Expected:{" "}
                                              </span>
                                              <span
                                                className={`font-bold ${isDarkMode
                                                  ? "text-purple-300"
                                                  : "text-purple-700"
                                                  }`}
                                              >
                                                {Number.parseFloat(
                                                  item.expected_completion_hours
                                                ).toFixed(1)}
                                                h
                                              </span>
                                            </div>
                                            <div>
                                              <span
                                                className={
                                                  isDarkMode
                                                    ? "text-gray-400"
                                                    : "text-gray-600"
                                                }
                                              >
                                                Actual:{" "}
                                              </span>
                                              <span
                                                className={`font-bold ${isDarkMode
                                                  ? "text-blue-300"
                                                  : "text-blue-700"
                                                  }`}
                                              >
                                                {Number.parseFloat(
                                                  item.actual_completion_hours
                                                ).toFixed(1)}
                                                h
                                              </span>
                                            </div>
                                          </div>
                                          <div
                                            className={`mt-2 w-full rounded-full h-2 ${isDarkMode
                                              ? "bg-gray-700"
                                              : "bg-gray-300"
                                              }`}
                                          >
                                            <div
                                              className={`h-2 rounded-full ${item.actual_completion_hours >
                                                item.expected_completion_hours
                                                ? "bg-red-500"
                                                : "bg-green-500"
                                                }`}
                                              style={{
                                                width: `${Math.min(
                                                  100,
                                                  (item.actual_completion_hours /
                                                    item.expected_completion_hours) *
                                                  100
                                                )}%`,
                                              }}
                                            ></div>
                                          </div>
                                        </div>
                                      )}
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <p
                              className={`text-gray-600 ${isDarkMode ? "dark:text-gray-400" : ""
                                } py-4`}
                            >
                              No phases.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <p
          className={`text-center py-8 ${isDarkMode ? "text-gray-400" : "text-gray-600"
            }`}
        >
          {!isFiltering && items.length === 0
            ? searchTerm || filterClient || filterPriority || filterStatus
              ? "No items match your search or filters."
              : 'No items yet. Go to "Add Items" to create your first item.'
            : null}
        </p>
      )}

      {/* Pagination Controls - Mobile Optimized */}
      {!isFiltering && pagination.total_pages > 1 && (
        <div
          className={`backdrop-blur-md rounded-lg p-3 sm:p-4 mt-6 border transition-all shadow-sm ${isDarkMode
            ? "bg-gray-800/60 border-gray-700/50"
            : "bg-white/30 border-white/40"
            }`}
        >
          <div className="flex flex-col gap-4">
            {/* Page Info */}
            <div
              className={`text-sm text-center sm:text-left ${isDarkMode ? "text-gray-300" : "text-gray-700"
                }`}
            >
              Showing {(pagination.current_page - 1) * pagination.per_page + 1}{" "}
              -{" "}
              {Math.min(
                pagination.current_page * pagination.per_page,
                pagination.total_items
              )}{" "}
              of {pagination.total_items}
            </div>

            {/* Pagination Buttons */}
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {/* First Page */}
              <button
                onClick={() => handlePageChange(1)}
                disabled={!pagination.has_previous}
                className={`px-3 py-2 rounded-lg font-medium transition-colors text-sm ${pagination.has_previous
                  ? isDarkMode
                    ? "bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-gray-200"
                    : "bg-white/50 hover:bg-white/70 active:bg-white/90 text-gray-700"
                  : "opacity-50 cursor-not-allowed"
                  }`}
              >
                ««
              </button>

              {/* Previous */}
              <button
                onClick={handlePreviousPage}
                disabled={!pagination.has_previous}
                className={`px-3 py-2 rounded-lg font-medium transition-colors text-sm ${pagination.has_previous
                  ? isDarkMode
                    ? "bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-gray-200"
                    : "bg-white/50 hover:bg-white/70 active:bg-white/90 text-gray-700"
                  : "opacity-50 cursor-not-allowed"
                  }`}
              >
                ‹
              </button>

              {/* Page Numbers - Responsive */}
              <div className="flex gap-1">
                {(() => {
                  const pages = [];
                  const showPages = window.innerWidth < 640 ? 3 : 5;
                  let startPage = Math.max(
                    1,
                    pagination.current_page - Math.floor(showPages / 2)
                  );
                  let endPage = Math.min(
                    pagination.total_pages,
                    startPage + showPages - 1
                  );

                  if (endPage - startPage < showPages - 1) {
                    startPage = Math.max(1, endPage - showPages + 1);
                  }

                  for (let i = startPage; i <= endPage; i++) {
                    pages.push(
                      <button
                        key={i}
                        onClick={() => handlePageChange(i)}
                        className={`px-3 py-2 rounded-lg font-medium transition-colors text-sm min-w-[40px] ${pagination.current_page === i
                          ? isDarkMode
                            ? "bg-slate-600 text-white"
                            : "bg-slate-600 text-white"
                          : isDarkMode
                            ? "bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-gray-200"
                            : "bg-white/50 hover:bg-white/70 active:bg-white/90 text-gray-700"
                          }`}
                      >
                        {i}
                      </button>
                    );
                  }
                  return pages;
                })()}
              </div>

              {/* Next */}
              <button
                onClick={handleNextPage}
                disabled={!pagination.has_next}
                className={`px-3 py-2 rounded-lg font-medium transition-colors text-sm ${pagination.has_next
                  ? isDarkMode
                    ? "bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-gray-200"
                    : "bg-white/50 hover:bg-white/70 active:bg-white/90 text-gray-700"
                  : "opacity-50 cursor-not-allowed"
                  }`}
              >
                ›
              </button>

              {/* Last Page */}
              <button
                onClick={() => handlePageChange(pagination.total_pages)}
                disabled={!pagination.has_next}
                className={`px-3 py-2 rounded-lg font-medium transition-colors text-sm ${pagination.has_next
                  ? isDarkMode
                    ? "bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-gray-200"
                    : "bg-white/50 hover:bg-white/70 active:bg-white/90 text-gray-700"
                  : "opacity-50 cursor-not-allowed"
                  }`}
              >
                »»
              </button>
            </div>

            {/* Page indicator */}
            <div
              className={`text-sm text-center ${isDarkMode ? "text-gray-300" : "text-gray-700"
                }`}
            >
              Page {pagination.current_page} of {pagination.total_pages}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Checklist;
