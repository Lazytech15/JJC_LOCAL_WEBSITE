import { useAuth } from "../../contexts/AuthContext";
import { useState, useEffect, useRef, lazy } from "react";
import apiService from "../../utils/api/api-service";
import Dashboard from "../op/Dashboard.jsx";
import AddItems from "../op/AddItem.jsx";
import Checklist from "../op/CheckList.jsx";
import Reports from "../op/Report.jsx";
import ItemComparison from "../op/ItemComparison.jsx";
import { pollingManager } from "../../utils/api/websocket/polling-manager.jsx";
import {
  EditItemModal,
  EditPhaseModal,
  EditSubphaseModal,
  AddPhaseModal,
  AddSubphaseModal,
  BulkEditModal,
} from "../op/EditItems.jsx";
const GearLoadingSpinner = lazy(() =>
  import("../../../public/LoadingGear.jsx")
);
import { Menu, X, ArrowUp, RefreshCw, ArrowRightLeft, Package, FileText } from "lucide-react";

function OperationsDepartment() {
  const { user, logout, isDarkMode, toggleDarkMode } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [scanningFor, setScanningFor] = useState(null);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState({
    current: 0,
    total: 0,
    message: "",
  });

  // UI states
  const [expandedItems, setExpandedItems] = useState({});
  const [expandedPhases, setExpandedPhases] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Ref to track if component is mounted
  const isMountedRef = useRef(true);
  const refreshIntervalRef = useRef(null);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdateCheck, setLastUpdateCheck] = useState(null);
  const pollIntervalRef = useRef(null);

  // WebSocket Polling for new items added via Google Sheets
  const pollingSubscriptionsRef = useRef([]);

  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: 20,
    total_items: 0,
    total_pages: 0,
    has_next: false,
    has_previous: false,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [showEditPhaseModal, setShowEditPhaseModal] = useState(false);
  const [showEditSubphaseModal, setShowEditSubphaseModal] = useState(false);
  const [showAddPhaseModal, setShowAddPhaseModal] = useState(false);
  const [showAddSubphaseModal, setShowAddSubphaseModal] = useState(false);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);

  const [selectedItemForEdit, setSelectedItemForEdit] = useState(null);
  const [selectedPhaseForEdit, setSelectedPhaseForEdit] = useState(null);
  const [selectedSubphaseForEdit, setSelectedSubphaseForEdit] = useState(null);
  const [selectedItemsForBulk, setSelectedItemsForBulk] = useState([]);
  const [clients, setClients] = useState([]);

  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [selectedSubphase, setSelectedSubphase] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedPhase, setSelectedPhase] = useState(null);
  const [newClient, setNewClient] = useState("");
  const [transferQuantity, setTransferQuantity] = useState("");
  const [transferRemarks, setTransferRemarks] = useState("");
  const [clientItems, setClientItems] = useState([]);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [selectedTargetItem, setSelectedTargetItem] = useState(null);
  const [selectedTargetPhase, setSelectedTargetPhase] = useState(null);
  const [selectedTargetSubphase, setSelectedTargetSubphase] = useState(null);

  // Load items for selected client in transfer modal
useEffect(() => {
  if (newClient.trim() && transferModalOpen && selectedItem) {
    const basePartNumber = getBasePartNumber(selectedItem?.part_number);
    const filtered = items.filter((item) => {
      const itemBasePartNumber = getBasePartNumber(item.part_number);
      return item.client_name === newClient.trim() && itemBasePartNumber === basePartNumber;
    });
    setClientItems(filtered);
  } else {
    setClientItems([]);
  }
}, [newClient, items, selectedItem, transferModalOpen]);

// Filter clients for dropdown
useEffect(() => {
  if (!Array.isArray(clients)) {
    setShowClientDropdown(false);
    return;
  }

  const searchValue = newClient.trim().toLowerCase();
  if (searchValue.length >= 1) {
    const matches = clients.filter(
      (client) => client.toLowerCase().includes(searchValue) && client !== selectedItem?.client_name
    );
    setShowClientDropdown(matches.length > 0);
  } else {
    setShowClientDropdown(false);
  }
}, [newClient, clients, selectedItem]);

  useEffect(() => {
    const needsPolling =
      activeTab === "dashboard" ||
      activeTab === "reports" ||
      activeTab === "checklist";

    if (!needsPolling) {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
        console.log("⏸️ Polling stopped - not on relevant tab");
      }
      return;
    }

    // ✅ FIXED: Simplified polling that just checks item count
    const startPolling = () => {
      pollIntervalRef.current = setInterval(async () => {
        try {
          console.log("🔄 Polling for new items...");

          const currentCount = items.length;
          const currentPage = pagination.current_page || 1;

          // Fetch fresh data from the current page
          const freshResponse = await apiService.operations.getItemsPaginated(
            currentPage,
            pagination.per_page || 20,
            { _t: Date.now() } // Cache buster
          );

          if (freshResponse && freshResponse.items) {
            const freshCount =
              freshResponse.pagination.total_items ||
              freshResponse.items.length;

            // Check if total items increased
            if (freshCount > pagination.total_items) {
              const newCount = freshCount - pagination.total_items;
              console.log(`✅ Found ${newCount} new item(s)!`);

              showNotification(`${newCount} new item(s) added!`, "success");

              // Reload all data to get the new items
              await loadData(currentPage, pagination.per_page);
            } else {
              console.log("✅ No new items detected");
            }
          }

          setLastUpdateCheck(new Date());
        } catch (error) {
          console.warn("⚠️ Polling check failed:", error.message);
          // Don't show error to user, just log it
        }
      }, 30000); // Poll every 30 seconds
    };

    // ✅ Only poll when tab is visible
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log("⏸️ Tab hidden - stopping polling");
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      } else {
        console.log("▶️ Tab visible - starting polling");
        if (!pollIntervalRef.current) {
          startPolling();
        }
      }
    };

    // Start polling if tab is visible
    if (!document.hidden) {
      startPolling();
    }

    // Listen for visibility changes
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [
    activeTab,
    pagination.current_page,
    pagination.per_page,
    pagination.total_items,
  ]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  // Scroll to top button visibility
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    if (items.length > 0 && !initialLoadComplete) {
      const needsDetails =
        activeTab === "dashboard" ||
        activeTab === "reports" ||
        activeTab === "checklist";

      if (needsDetails) {
        const hasItemsWithoutDetails = items.some(
          (item) =>
            !item.phases ||
            !Array.isArray(item.phases) ||
            (item.phase_count > 0 && item.phases.length === 0)
        );

        if (hasItemsWithoutDetails) {
          loadAllItemDetails();
        } else {
          setInitialLoadComplete(true);
        }
      }
    }
  }, [activeTab, items.length, initialLoadComplete]);

  useEffect(() => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }

    const needsRefresh =
      activeTab === "dashboard" ||
      activeTab === "reports" ||
      activeTab === "checklist";

    if (needsRefresh && items.length > 0) {
      const hasActivePhases = items.some(
        (item) =>
          item &&
          Array.isArray(item.phases) &&
          item.phases.some(
            (phase) => phase && phase.start_time && !phase.end_time
          )
      );

      if (hasActivePhases) {
        refreshIntervalRef.current = setInterval(() => {
          if (isMountedRef.current) {
            refreshActiveData();
          }
        }, 30000);
      }
    }
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [activeTab, items]);

  const loadClients = async () => {
    try {
      const clientList = await apiService.operations.getClients();
      setClients(Array.isArray(clientList) ? clientList : []);
    } catch (error) {
      console.error("Error loading clients:", error);
      setClients([]);
    }
  };

  useEffect(() => {
    loadData();
    loadClients(); // ADD THIS LINE

    // Setup polling subscriptions
    setupPollingListeners();

    return () => {
      // Cleanup polling subscriptions
      pollingSubscriptionsRef.current.forEach((unsubscribe) => unsubscribe());
      pollingSubscriptionsRef.current = [];
    };
  }, []);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      // Request permission silently
      Notification.requestPermission().then((permission) => {
        console.log("Notification permission:", permission);
      });
    }
  }, []);

  const setupPollingListeners = () => {
    console.log("📡 Setting up Operations polling listeners...");

    // Subscribe to all operations refresh events
    const unsubRefresh = pollingManager.subscribeToUpdates(
      "operations:refresh",
      (event) => {
        console.log("🔄 Operations refresh event:", event.type);
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
        loadData(); // Reload all data
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
      unsubGoogleSheets,
    ];

    // Join operations room
    pollingManager.joinRoom("operations");
  };

  // ADD: Handle operations refresh events
  const handleOperationsRefresh = async (event) => {
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

  const refreshActiveData = async () => {
    try {
      console.log("Refreshing active data...");

      const activeItems = items.filter(
        (item) =>
          item &&
          Array.isArray(item.phases) &&
          item.phases.some(
            (phase) => phase && phase.start_time && !phase.end_time
          )
      );

      if (activeItems.length === 0) return;

      const freshItems = await Promise.all(
        activeItems.map((item) =>
          apiService.operations.getItem(item.part_number)
        )
      );

      if (isMountedRef.current) {
        setItems((prevItems) => {
          const updatedItems = [...prevItems];
          freshItems.forEach((freshItem) => {
            const index = updatedItems.findIndex(
              (i) => i.part_number === freshItem.part_number
            );
            if (index !== -1) {
              updatedItems[index] = freshItem;
            }
          });
          return updatedItems;
        });

        const statsResponse = await apiService.operations.getStatistics();
        setStatistics(statsResponse);
      }
    } catch (err) {
      console.error("Failed to refresh active data:", err);
    }
  };

  const loadData = async (page = 1, limit = 20) => {
    try {
      setLoading(true);
      setError(null);

      console.log(`📥 Loading items page ${page} with limit ${limit}...`);

      // Load items with pagination
      const [itemsResponse, statsResponse] = await Promise.all([
        apiService.operations.getItemsPaginated(page, limit).catch((err) => {
          console.error("Failed to load items:", err);
          return { items: [], pagination: {} };
        }),
        apiService.operations.getStatistics().catch((err) => {
          console.error("Failed to load statistics:", err);
          return null;
        }),
      ]);

      // Handle paginated response
      const itemsArray = itemsResponse.items || [];
      const paginationInfo = itemsResponse.pagination || {
        current_page: 1,
        per_page: limit,
        total_items: itemsArray.length,
        total_pages: 1,
        has_next: false,
        has_previous: false,
      };

      console.log(`✅ Loaded ${itemsArray.length} items from page ${page}`);
      console.log(`📊 Pagination:`, paginationInfo);

      setItems(itemsArray);
      setPagination(paginationInfo);
      setCurrentPage(page);
      setStatistics(statsResponse);
    } catch (err) {
      console.error("❌ Failed to load operations data:", err);
      setError(`Failed to load data: ${err.message}`);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleManualRefresh = async () => {
    try {
      setIsRefreshing(true);
      setError(null);

      console.log("🔄 Manual refresh triggered...");

      showNotification("Refreshing data...", "info");

      // Reload data from current page with cache buster
      await loadData(pagination.current_page || 1, pagination.per_page || 20);

      setLastUpdateCheck(new Date());

      showNotification("✅ Data refreshed successfully!", "success");
    } catch (error) {
      console.error("❌ Failed to refresh:", error);
      setError(`Failed to refresh: ${error.message}`);
      showNotification("❌ Failed to refresh data", "error");
    } finally {
      setIsRefreshing(false);
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

    // Visual feedback emoji
    const emoji =
      type === "success"
        ? "✅"
        : type === "error"
          ? "❌"
          : type === "warning"
            ? "⚠️"
            : "📢";
    console.log(`${emoji} ${message}`);

    // ✅ OPTIONAL: If you have a toast library, use it here
    // Example with react-hot-toast:
    // if (type === 'success') toast.success(message)
    // else if (type === 'error') toast.error(message)
    // else toast(message)

    return message;
  };

  const loadAllItemDetails = async () => {
    // Only load details for items that are currently displayed
    // This prevents loading all items at once
    const needsDetails =
      activeTab === "dashboard" ||
      activeTab === "reports" ||
      activeTab === "checklist";

    if (!needsDetails || items.length === 0) {
      console.log("[LoadDetails] Skipping - not needed or no items");
      return;
    }

    // Filter items that actually need details loaded
    const itemsNeedingDetails = items.filter(
      (item) =>
        !item.phases ||
        !Array.isArray(item.phases) ||
        (item.phase_count > 0 && item.phases.length === 0)
    );

    if (itemsNeedingDetails.length === 0) {
      setInitialLoadComplete(true);
      return;
    }

    try {
      console.log(
        `[LoadDetails] Loading details for ${itemsNeedingDetails.length} items`
      );
      setLoadingProgress({
        current: 0,
        total: itemsNeedingDetails.length,
        message: "Starting to load item details...",
      });

      // Process in smaller batches
      const batchSize = 3; // Reduced batch size
      const batches = [];

      for (let i = 0; i < itemsNeedingDetails.length; i += batchSize) {
        batches.push(itemsNeedingDetails.slice(i, i + batchSize));
      }

      const allItemsWithDetails = [];
      const failedItems = [];

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];

        console.log(
          `[Batch ${batchIndex + 1}/${batches.length}] Processing ${batch.length
          } items`
        );

        setLoadingProgress({
          current: allItemsWithDetails.length,
          total: itemsNeedingDetails.length,
          message: `Loading batch ${batchIndex + 1} of ${batches.length}...`,
        });

        const batchResults = await Promise.allSettled(
          batch.map((item) => loadItemWithRetry(item.part_number, 2)) // Reduced retries
        );

        batchResults.forEach((result, index) => {
          const item = batch[index];

          if (result.status === "fulfilled" && result.value) {
            allItemsWithDetails.push(result.value);
            console.log(`[Success] ${item.part_number} loaded`);
          } else {
            console.warn(
              `[Failed] ${item.part_number}:`,
              result.reason?.message
            );

            allItemsWithDetails.push({
              ...item,
              _loadError: true,
              _errorMessage: result.reason?.message || "Failed to load details",
            });

            failedItems.push({
              part_number: item.part_number,
              error: result.reason?.message,
            });
          }
        });

        // Update items incrementally
        if (isMountedRef.current && allItemsWithDetails.length > 0) {
          setItems((prevItems) => {
            const updatedItems = [...prevItems];
            allItemsWithDetails.forEach((detailedItem) => {
              const index = updatedItems.findIndex(
                (i) => i.part_number === detailedItem.part_number
              );
              if (index !== -1) {
                updatedItems[index] = detailedItem;
              }
            });
            return updatedItems;
          });
        }

        setLoadingProgress({
          current: allItemsWithDetails.length,
          total: itemsNeedingDetails.length,
          message: `Loaded ${allItemsWithDetails.length} of ${itemsNeedingDetails.length} items...`,
        });

        // Wait between batches
        if (batchIndex < batches.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      console.log(
        `[LoadDetails] Complete: ${allItemsWithDetails.length} items loaded`
      );

      if (failedItems.length > 0) {
        console.warn(
          `[LoadDetails] ${failedItems.length} items failed to load details:`,
          failedItems
        );
        setError(
          `Loaded ${allItemsWithDetails.length - failedItems.length} of ${itemsNeedingDetails.length
          } items. ${failedItems.length} items have limited details.`
        );
      }

      if (isMountedRef.current) {
        setLoadingProgress({
          current: allItemsWithDetails.length,
          total: itemsNeedingDetails.length,
          message:
            failedItems.length > 0
              ? `Complete with ${failedItems.length} warnings`
              : "Complete! Preparing dashboard...",
        });

        setTimeout(() => {
          setInitialLoadComplete(true);
        }, 300);
      }
    } catch (err) {
      console.error("[LoadDetails] Critical error:", err);
      setError("Failed to load item details: " + err.message);
      setInitialLoadComplete(true);
    }
  };

  const loadItemWithRetry = async (partNumber, maxRetries = 3) => {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Attempt ${attempt}/${maxRetries}] Loading ${partNumber}`);
        const result = await apiService.operations.getItem(partNumber);
        console.log(`[Success] Loaded ${partNumber}`);
        return result;
      } catch (error) {
        lastError = error;
        console.warn(
          `[Attempt ${attempt}/${maxRetries}] Failed for ${partNumber}:`,
          error.message
        );

        // If it's a 404 or item not found, don't retry
        if (
          error.message &&
          (error.message.includes("404") || error.message.includes("not found"))
        ) {
          console.log(`[Skip] Item ${partNumber} not found, skipping retries`);
          throw error;
        }

        // Only retry if we haven't exhausted attempts
        if (attempt < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, attempt - 1) * 1000;
          console.log(`[Wait] Retrying ${partNumber} in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    console.error(`[Failed] All retries exhausted for ${partNumber}`);
    throw lastError;
  };

  const loadItemDetails = async (partNumber) => {
    try {
      console.log("Loading details for item:", partNumber);
      const fullItem = await apiService.operations.getItem(partNumber);
      console.log("Full item loaded:", fullItem);

      if (isMountedRef.current) {
        setItems((prevItems) => {
          const newItems = prevItems.map((item) =>
            item.part_number === partNumber ? fullItem : item
          );
          console.log("Updated items:", newItems);
          return newItems;
        });
      }

      return fullItem;
    } catch (err) {
      console.error("Failed to load item details:", err);
      return null;
    }
  };

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

    return `${minutes} minute${minutes !== 1 ? "s" : ""} ${seconds} second${seconds !== 1 ? "s" : ""
      }`;
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

  const toggleSubPhase = async (
    partNumber,
    phaseId,
    subPhaseId,
    currentStatus
  ) => {
    try {
      await apiService.operations.completeSubphase(subPhaseId, !currentStatus);
      await loadItemDetails(partNumber);
    } catch (err) {
      console.error("Failed to toggle sub-phase:", err);
      setError("Failed to update sub-phase: " + err.message);
    }
  };

  const updateActualHours = async (partNumber, phaseId, subPhaseId, hours) => {
    try {
      await apiService.operations.updateSubphase(subPhaseId, {
        actual_hours: parseFloat(hours) || 0,
      });

      if (isMountedRef.current) {
        setItems((prevItems) =>
          prevItems.map((item) => {
            if (item.part_number === partNumber) {
              return {
                ...item,
                phases: item.phases?.map((phase) => {
                  if (phase.id === phaseId) {
                    return {
                      ...phase,
                      subphases: phase.subphases?.map((subPhase) => {
                        if (subPhase.id === subPhaseId) {
                          return {
                            ...subPhase,
                            actual_hours: parseFloat(hours) || 0,
                          };
                        }
                        return subPhase;
                      }),
                    };
                  }
                  return phase;
                }),
              };
            }
            return item;
          })
        );
      }
    } catch (err) {
      console.error("Failed to update hours:", err);
      setError("Failed to update hours: " + err.message);
    }
  };

  const handleBarcodeScan = (partNumber, phaseId, subPhaseId) => {
    setScanningFor({ partNumber, phaseId, subPhaseId });
    setBarcodeInput("");
  };

  const submitBarcode = async () => {
    if (!scanningFor || !barcodeInput.trim()) {
      setError("Please enter a barcode");
      return;
    }

    try {
      setError(null);

      await apiService.operations.assignEmployee(
        scanningFor.subPhaseId,
        barcodeInput.trim()
      );

      await loadItemDetails(scanningFor.partNumber);

      setScanningFor(null);
      setBarcodeInput("");
    } catch (err) {
      console.error("Failed to assign employee:", err);
      setError("Failed to assign employee: " + err.message);
    }
  };
  const calculatePhaseProgress = (phase) => {
    if (
      !phase ||
      !Array.isArray(phase.subphases) ||
      phase.subphases.length === 0
    )
      return 0;

    const completed = phase.subphases.filter((sp) => sp.completed == 1).length;
    return Math.round((completed / phase.subphases.length) * 100);
  };

  const calculateItemProgress = (item) => {
    // First check if API already provided overall_progress
    if (
      item &&
      item.overall_progress !== undefined &&
      item.overall_progress !== null
    ) {
      return Math.round(parseFloat(item.overall_progress));
    }

    // Fallback: calculate from phases if available
    if (!item || !Array.isArray(item.phases) || item.phases.length === 0)
      return 0;

    const totalProgress = item.phases.reduce(
      (sum, phase) => sum + calculatePhaseProgress(phase),
      0
    );
    return Math.round(totalProgress / item.phases.length);
  };

  const deleteItem = async (partNumber) => {
    if (
      window.confirm(
        "Are you sure you want to delete this item? This will also delete all phases and sub-phases."
      )
    ) {
      try {
        await apiService.operations.deleteItem(partNumber);
        await loadData();
      } catch (err) {
        console.error("Failed to delete item:", err);
        setError("Failed to delete item: " + err.message);
      }
    }
  };

  const toggleItemExpansion = async (partNumber) => {
    const isExpanding = !expandedItems[partNumber];
    setExpandedItems((prev) => ({ ...prev, [partNumber]: !prev[partNumber] }));

    if (isExpanding) {
      const item = items.find((i) => i.part_number === partNumber);
      if (!item.phases || item.phases.length === 0) {
        await loadItemDetails(partNumber);
      }
    }
  };

  const togglePhaseExpansion = (phaseId) => {
    setExpandedPhases((prev) => ({ ...prev, [phaseId]: !prev[phaseId] }));
  };

  const handleTabChange = (tab) => {
    if (
      !initialLoadComplete &&
      (tab === "checklist" || tab === "dashboard" || tab === "reports")
    ) {
      alert("Please wait for all items to finish loading...");
      return;
    }
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  const tabs = [
    { id: "dashboard", label: "Dashboard" },
    { id: "add-items", label: "Add Items" },
    { id: "checklist", label: "Checklist" },
    { id: "comparison", label: "Comparison" },
    { id: "reports", label: "Reports" },
  ];

  const cardClass = isDarkMode
    ? "bg-gray-800/60 border-gray-700/50"
    : "bg-white/20 border-white/30";

  const textPrimaryClass = isDarkMode ? "text-gray-100" : "text-gray-800";
  const textSecondaryClass = isDarkMode ? "text-gray-300" : "text-gray-600";

  // Edit Item Handler
  const handleEditItem = async (itemData) => {
    try {
      setItems((prevItems) =>
        prevItems.map((item) =>
          item.part_number === selectedItemForEdit.part_number
            ? { ...item, ...itemData }
            : item
        )
      );
      setShowEditItemModal(false);
      setSelectedItemForEdit(null);
      await apiService.operations.updateItem(
        selectedItemForEdit.part_number,
        itemData
      );
    } catch (error) {
      console.error("Error updating item:", error);
      alert("Failed to update item: " + error.message);
      await loadData();
    }
  };

  // Edit Phase Handler
  const handleEditPhase = async (phaseData) => {
    try {
      setItems((prevItems) =>
        prevItems.map((item) => {
          if (item.phases) {
            return {
              ...item,
              phases: item.phases.map((phase) =>
                phase.id === selectedPhaseForEdit.id
                  ? { ...phase, ...phaseData }
                  : phase
              ),
            };
          }
          return item;
        })
      );
      setShowEditPhaseModal(false);
      setSelectedPhaseForEdit(null);
      await apiService.operations.updatePhase(
        selectedPhaseForEdit.id,
        phaseData
      );
    } catch (error) {
      console.error("Error updating phase:", error);
      alert("Failed to update phase: " + error.message);
      await loadData();
    }
  };

  // Delete Phase Handler
  const handleDeletePhase = async () => {
    try {
      const phaseId = selectedPhaseForEdit.id;
      setItems((prevItems) =>
        prevItems.map((item) => {
          if (item.phases) {
            return {
              ...item,
              phases: item.phases.filter((phase) => phase.id !== phaseId),
            };
          }
          return item;
        })
      );
      setShowEditPhaseModal(false);
      setSelectedPhaseForEdit(null);
      await apiService.operations.deletePhase(phaseId);
    } catch (error) {
      console.error("Error deleting phase:", error);
      alert("Failed to delete phase: " + error.message);
      await loadData();
    }
  };

  // Edit Subphase Handler
  const handleEditSubphase = async (subphaseData) => {
    try {
      setItems((prevItems) =>
        prevItems.map((item) => {
          if (item.phases) {
            return {
              ...item,
              phases: item.phases.map((phase) => {
                if (phase.subphases) {
                  return {
                    ...phase,
                    subphases: phase.subphases.map((subphase) =>
                      subphase.id === selectedSubphaseForEdit.id
                        ? { ...subphase, ...subphaseData }
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
      setShowEditSubphaseModal(false);
      setSelectedSubphaseForEdit(null);
      await apiService.operations.updateSubphase(
        selectedSubphaseForEdit.id,
        subphaseData
      );
    } catch (error) {
      console.error("Error updating subphase:", error);
      alert("Failed to update subphase: " + error.message);
      await loadData();
    }
  };

  // Delete Subphase Handler
  const handleDeleteSubphase = async () => {
    try {
      const subphaseId = selectedSubphaseForEdit.id;
      setItems((prevItems) =>
        prevItems.map((item) => {
          if (item.phases) {
            return {
              ...item,
              phases: item.phases.map((phase) => {
                if (phase.subphases) {
                  return {
                    ...phase,
                    subphases: phase.subphases.filter(
                      (subphase) => subphase.id !== subphaseId
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
      setShowEditSubphaseModal(false);
      setSelectedSubphaseForEdit(null);
      await apiService.operations.deleteSubphase(subphaseId);
    } catch (error) {
      console.error("Error deleting subphase:", error);
      alert("Failed to delete subphase: " + error.message);
      await loadData();
    }
  };

  // Add Phase Handler
  const handleAddPhase = async (phaseData) => {
    try {
      const partNumber = selectedItemForEdit.part_number;
      const tempPhase = {
        id: Date.now(),
        name: phaseData.name,
        phase_order: phaseData.phase_order,
        subphases: [],
      };
      setItems((prevItems) =>
        prevItems.map((item) =>
          item.part_number === partNumber
            ? { ...item, phases: [...(item.phases || []), tempPhase] }
            : item
        )
      );
      setShowAddPhaseModal(false);
      setSelectedItemForEdit(null);
      const response = await apiService.operations.createPhase({
        part_number: partNumber,
        name: phaseData.name,
        phase_order: phaseData.phase_order,
      });
      if (response && response.id) {
        setItems((prevItems) =>
          prevItems.map((item) =>
            item.part_number === partNumber
              ? {
                ...item,
                phases: item.phases.map((phase) =>
                  phase.id === tempPhase.id
                    ? { ...phase, id: response.id }
                    : phase
                ),
              }
              : item
          )
        );
      }
    } catch (error) {
      console.error("Error adding phase:", error);
      alert("Failed to add phase: " + error.message);
      await loadData();
    }
  };

  // Add Subphase Handler
  const handleAddSubphase = async (subphaseData) => {
    try {
      const partNumber = selectedItemForEdit.part_number;
      const phaseId = selectedPhaseForEdit.id;
      const tempSubphase = {
        id: Date.now(),
        name: subphaseData.name,
        expected_duration: parseFloat(subphaseData.expected_duration) || 0,
        expected_quantity: parseInt(subphaseData.expected_quantity) || 0,
        subphase_order: parseInt(subphaseData.subphase_order) || 0,
        completed: 0,
        current_completed_quantity: 0,
      };
      setItems((prevItems) =>
        prevItems.map((item) =>
          item.part_number === partNumber
            ? {
              ...item,
              phases: item.phases.map((phase) =>
                phase.id === phaseId
                  ? {
                    ...phase,
                    subphases: [...(phase.subphases || []), tempSubphase],
                  }
                  : phase
              ),
            }
            : item
        )
      );
      setShowAddSubphaseModal(false);
      setSelectedPhaseForEdit(null);
      setSelectedItemForEdit(null);
      const response = await apiService.operations.createSubphase({
        part_number: partNumber,
        phase_id: phaseId,
        name: subphaseData.name,
        expected_duration: parseFloat(subphaseData.expected_duration) || 0,
        expected_quantity: parseInt(subphaseData.expected_quantity) || 0,
        subphase_order: parseInt(subphaseData.subphase_order) || 0,
      });
      if (response && response.id) {
        setItems((prevItems) =>
          prevItems.map((item) =>
            item.part_number === partNumber
              ? {
                ...item,
                phases: item.phases.map((phase) =>
                  phase.id === phaseId
                    ? {
                      ...phase,
                      subphases: phase.subphases.map((subphase) =>
                        subphase.id === tempSubphase.id
                          ? { ...subphase, id: response.id }
                          : subphase
                      ),
                    }
                    : phase
                ),
              }
              : item
          )
        );
      }
    } catch (error) {
      console.error("Error adding subphase:", error);
      alert("Failed to add subphase: " + error.message);
      await loadData();
    }
  };

  // Bulk Edit Handler
  const handleBulkEdit = async (updates, itemCheckboxes) => {
    try {
      const itemsToUpdate = Object.keys(itemCheckboxes)
        .filter((partNumber) => itemCheckboxes[partNumber])
        .map((partNumber) =>
          items.find((item) => item.part_number === partNumber)
        )
        .filter(Boolean);

      setItems((prevItems) =>
        prevItems.map((item) => {
          if (itemCheckboxes[item.part_number]) {
            const updateData = { ...updates };
            if (updates.remarks && item.remarks) {
              updateData.remarks = `${item.remarks}\n${updates.remarks}`;
            }
            return { ...item, ...updateData };
          }
          return item;
        })
      );
      setShowBulkEditModal(false);

      for (const item of itemsToUpdate) {
        const updateData = { ...updates };
        if (updates.remarks && item.remarks) {
          updateData.remarks = `${item.remarks}\n${updates.remarks}`;
        }
        await apiService.operations.updateItem(item.part_number, updateData);
      }
    } catch (error) {
      console.error("Error in bulk edit:", error);
      alert("Failed to update items: " + error.message);
      await loadData();
    }
  };

  const openTransferModal = (item, phase, subphase) => {
  setSelectedItem(item);
  setSelectedPhase(phase);
  setSelectedSubphase(subphase);
  setNewClient("");
  setTransferQuantity("");
  setTransferRemarks("");
  setSelectedTargetItem(null);
  setSelectedTargetPhase(null);
  setSelectedTargetSubphase(null);
  setTransferModalOpen(true);
  setClientItems([]);
};

const handleTransferClient = async () => {
  if (!newClient.trim()) {
    alert("Please enter a client name");
    return;
  }

  if (!selectedTargetItem) {
    alert("Please select a target item");
    return;
  }

  if (!selectedTargetPhase) {
    alert("Please select a target phase");
    return;
  }

  if (!selectedTargetSubphase) {
    alert("Please select a target subphase");
    return;
  }

  const transferQty = Number.parseInt(transferQuantity);
  if (!transferQty || transferQty < 1) {
    alert("Please enter a valid transfer quantity");
    return;
  }

  const currentQty = selectedSubphase.current_completed_quantity || 0;
  if (transferQty > currentQty) {
    alert(`Transfer quantity (${transferQty}) cannot exceed current completed quantity (${currentQty})`);
    return;
  }

  try {
    const timestamp = new Date().toLocaleString("en-PH", {
      timeZone: "Asia/Manila",
    });

    // Get full target item details
    const targetItem = await apiService.operations.getItem(selectedTargetItem.part_number);
    const targetPhase = targetItem.phases?.find((p) => p.id === Number.parseInt(selectedTargetPhase));
    const targetSubphase = targetPhase?.subphases?.find((s) => s.id === Number.parseInt(selectedTargetSubphase));

    if (!targetSubphase) {
      alert("Could not find target subphase");
      return;
    }

    // Calculate new quantities
    const newSourceQty = currentQty - transferQty;
    const targetCurrentQty = targetSubphase.current_completed_quantity || 0;
    const newTargetQty = targetCurrentQty + transferQty;

    // Optimistic update for source subphase quantity
    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.part_number === selectedItem.part_number && item.phases) {
          return {
            ...item,
            phases: item.phases.map((phase) => {
              if (phase.id === selectedPhase.id && phase.subphases) {
                return {
                  ...phase,
                  subphases: phase.subphases.map((subphase) =>
                    subphase.id === selectedSubphase.id
                      ? { ...subphase, current_completed_quantity: newSourceQty }
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

    // Auto-uncheck if quantity drops below expected
    if (selectedSubphase.completed == 1 && newSourceQty < selectedSubphase.expected_quantity) {
      setItems((prevItems) =>
        prevItems.map((item) => {
          if (item.part_number === selectedItem.part_number && item.phases) {
            return {
              ...item,
              phases: item.phases.map((phase) => {
                if (phase.id === selectedPhase.id && phase.subphases) {
                  return {
                    ...phase,
                    subphases: phase.subphases.map((subphase) =>
                      subphase.id === selectedSubphase.id
                        ? {
                            ...subphase,
                            current_completed_quantity: newSourceQty,
                            completed: 0,
                            completed_at: null,
                          }
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
    }

    // Optimistic update for target subphase quantity
    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.part_number === selectedTargetItem.part_number && item.phases) {
          return {
            ...item,
            phases: item.phases.map((phase) => {
              if (phase.id === Number.parseInt(selectedTargetPhase) && phase.subphases) {
                return {
                  ...phase,
                  subphases: phase.subphases.map((subphase) =>
                    subphase.id === Number.parseInt(selectedTargetSubphase)
                      ? { ...subphase, current_completed_quantity: newTargetQty }
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

    // Close modal immediately
    setTransferModalOpen(false);
    setSelectedItem(null);
    setSelectedPhase(null);
    setSelectedSubphase(null);
    setNewClient("");
    setTransferQuantity("");
    setTransferRemarks("");
    setSelectedTargetItem(null);
    setSelectedTargetPhase(null);
    setSelectedTargetSubphase(null);

    // Show success message
    alert(`Successfully transferred ${transferQty} units to ${targetPhase.name} > ${targetSubphase.name}!`);

    // API call to update source quantity
    await apiService.operations.updateSubphaseCompletedQuantity(selectedSubphase.id, newSourceQty);

    // If subphase was marked complete and now quantity is insufficient, uncheck it
    if (selectedSubphase.completed == 1 && newSourceQty < selectedSubphase.expected_quantity) {
      await apiService.operations.completeSubphaseWithDuration(selectedSubphase.id, false);
    }

    // API call to update target quantity
    await apiService.operations.updateSubphaseCompletedQuantity(targetSubphase.id, newTargetQty);

    // Add remarks with transfer details
    const transferRemark = `[${timestamp}] Transferred OUT ${transferQty} units to ${newClient} (${selectedTargetItem.part_number}) - ${targetPhase.name} > ${targetSubphase.name} | From: ${selectedPhase.name} > ${selectedSubphase.name}: ${transferRemarks.trim() || "No remarks"}`;
    const receiveRemark = `[${timestamp}] Received IN ${transferQty} units from ${selectedItem.client_name} (${selectedItem.part_number}) - ${selectedPhase.name} > ${selectedSubphase.name} | To: ${targetPhase.name} > ${targetSubphase.name}: ${transferRemarks.trim() || "No remarks"}`;

    await apiService.operations.updateItem(selectedItem.part_number, {
      remarks: selectedItem.remarks ? `${selectedItem.remarks}\n${transferRemark}` : transferRemark,
    });

    await apiService.operations.updateItem(selectedTargetItem.part_number, {
      remarks: selectedTargetItem.remarks ? `${selectedTargetItem.remarks}\n${receiveRemark}` : receiveRemark,
    });

    // Reload data in background to sync all changes
    loadData();
  } catch (error) {
    console.error("Error transferring:", error);
    alert("Failed to transfer: " + error.message);
    await loadData(); // Reload on error
  }
};

  // Helper function to extract base part number (remove batch suffix)
  const getBasePartNumber = (partNumber) => {
    if (!partNumber) return '';
    // Extract only the numeric part before "-BATCH-"
    const match = partNumber.match(/^(\d+)/);
    return match ? match[1] : partNumber;
  };

return (
  <div
    className={`min-h-screen transition-colors duration-300 ${
      isDarkMode
        ? "bg-linear-to-br from-gray-950 via-gray-900 to-gray-950"
        : "bg-linear-to-br from-gray-50 via-slate-50 to-stone-50"
    }`}
  >
    {/* Main Container - Responsive padding */}
    <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header - Responsive layout */}
        <div
          className={`backdrop-blur-md rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 mb-4 sm:mb-6 border shadow-lg transition-all duration-300 ${
            isDarkMode
              ? "bg-gray-800/60 border-gray-700/50"
              : "bg-white/20 border-white/30"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4">
            {/* Title Section */}
            <div className="flex-1 min-w-0">
              <h1
                className={`text-xl sm:text-2xl md:text-3xl font-bold wrap-break-word ${
                  isDarkMode ? "text-gray-100" : "text-gray-800"
                }`}
              >
                ⚙️ Operations Department
              </h1>
              <p
                className={`text-xs sm:text-sm md:text-base mt-1 sm:mt-2 ${
                  isDarkMode ? "text-gray-300" : "text-gray-600"
                }`}
              >
                Welcome, {user?.name || "Operations Manager"}
              </p>
              {lastUpdateCheck && (
                <p
                  className={`text-xs mt-1 ${
                    isDarkMode ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  Last updated: {lastUpdateCheck.toLocaleTimeString()}
                </p>
              )}
            </div>

            {/* Action Buttons - Responsive */}
            <div className="flex gap-2 shrink-0 self-end sm:self-start">
              {/* Refresh Button */}
              <button
                onClick={handleManualRefresh}
                disabled={isRefreshing || loading}
                className={`p-2 sm:p-2.5 rounded-lg backdrop-blur-sm border transition-all duration-300 ${
                  isDarkMode
                    ? "bg-gray-800/60 border-gray-700/50 hover:bg-gray-800/80 text-cyan-400"
                    : "bg-white/20 border-white/30 hover:bg-white/30 text-blue-700"
                } ${
                  isRefreshing || loading
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
                aria-label="Refresh data"
                title={
                  lastUpdateCheck
                    ? `Last checked: ${lastUpdateCheck.toLocaleTimeString()}`
                    : "Refresh data"
                }
              >
                <RefreshCw
                  className={`w-4 h-4 sm:w-5 sm:h-5 ${
                    isRefreshing ? "animate-spin" : ""
                  }`}
                />
              </button>

              {/* Dark Mode Toggle */}
              <button
                onClick={toggleDarkMode}
                className={`p-2 sm:p-2.5 rounded-lg backdrop-blur-sm border transition-all duration-300 ${
                  isDarkMode
                    ? "bg-gray-800/60 border-gray-700/50 hover:bg-gray-800/80 text-yellow-400"
                    : "bg-white/20 border-white/30 hover:bg-white/30 text-gray-700"
                }`}
                aria-label="Toggle dark mode"
              >
                <span className="text-lg sm:text-xl">
                  {isDarkMode ? "☀️" : "🌙"}
                </span>
              </button>

              {/* Logout Button */}
              <button
                onClick={logout}
                className={`px-3 sm:px-4 py-2 rounded-lg font-medium text-sm sm:text-base transition-colors duration-200 ${
                  isDarkMode
                    ? "bg-slate-700 hover:bg-slate-600 text-white"
                    : "bg-slate-600 hover:bg-slate-700 text-white"
                }`}
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Loading Spinner */}
        {(loading || submitting) && (
          <div
            className={`fixed inset-0 z-50 flex items-center justify-center ${
              isDarkMode ? "bg-gray-900/95" : "bg-gray-100/95"
            }`}
          >
            <GearLoadingSpinner isDarkMode={isDarkMode} />
          </div>
        )}

        {/* Loading Progress */}
        {!loading &&
          !submitting &&
          !initialLoadComplete &&
          loadingProgress.total > 0 && (
            <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/30 p-4">
              <div
                className={`max-w-md w-full backdrop-blur-md rounded-xl sm:rounded-2xl p-6 sm:p-8 border shadow-2xl transition-all duration-300 ${
                  isDarkMode
                    ? "bg-gray-800/90 border-gray-700/50"
                    : "bg-white/90 border-white/50"
                }`}
              >
                {/* Gear Animation */}
                <div className="flex justify-center mb-4 sm:mb-6">
                  <div className="relative flex items-center justify-center scale-75 sm:scale-100">
                    {/* Left Small Gear */}
                    <div className="absolute -left-6 bottom-2">
                      <svg
                        className="w-12 h-12 animate-spin"
                        style={{ animationDuration: "2s" }}
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
                          <circle
                            cx="0"
                            cy="0"
                            r="32"
                            fill={isDarkMode ? "#64748B" : "#546E7A"}
                          />
                          <circle
                            cx="0"
                            cy="0"
                            r="20"
                            fill="none"
                            stroke={isDarkMode ? "#38BDF8" : "#7DD3C0"}
                            strokeWidth="3"
                          />
                          <circle
                            cx="0"
                            cy="0"
                            r="20"
                            fill={isDarkMode ? "#1E293B" : "#F3F4F6"}
                          />
                        </g>
                      </svg>
                    </div>

                    {/* Center Large Gear */}
                    <div className="z-10">
                      <svg
                        className="w-28 h-28 animate-spin"
                        style={{
                          animationDuration: "3s",
                          animationDirection: "reverse",
                        }}
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
                          <circle
                            cx="0"
                            cy="0"
                            r="45"
                            fill={isDarkMode ? "#64748B" : "#546E7A"}
                          />
                          <circle
                            cx="0"
                            cy="0"
                            r="28"
                            fill="none"
                            stroke={isDarkMode ? "#38BDF8" : "#7DD3C0"}
                            strokeWidth="4"
                          />
                          <circle
                            cx="0"
                            cy="0"
                            r="28"
                            fill={isDarkMode ? "#1E293B" : "#F3F4F6"}
                          />
                        </g>
                      </svg>
                    </div>

                    {/* Right Small Gear */}
                    <div className="absolute -right-6 bottom-2">
                      <svg
                        className="w-12 h-12 animate-spin"
                        style={{ animationDuration: "2s" }}
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
                          <circle
                            cx="0"
                            cy="0"
                            r="32"
                            fill={isDarkMode ? "#64748B" : "#546E7A"}
                          />
                          <circle
                            cx="0"
                            cy="0"
                            r="20"
                            fill="none"
                            stroke={isDarkMode ? "#38BDF8" : "#7DD3C0"}
                            strokeWidth="3"
                          />
                          <circle
                            cx="0"
                            cy="0"
                            r="20"
                            fill={isDarkMode ? "#1E293B" : "#F3F4F6"}
                          />
                        </g>
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Loading Text */}
                <h3
                  className={`text-lg sm:text-xl font-bold text-center mb-3 ${
                    isDarkMode ? "text-gray-100" : "text-gray-800"
                  }`}
                >
                  Loading Item Details
                </h3>

                <p
                  className={`text-sm text-center mb-4 ${
                    isDarkMode ? "text-gray-300" : "text-gray-600"
                  }`}
                >
                  {loadingProgress.message ||
                    `Processing ${loadingProgress.current} of ${loadingProgress.total} items...`}
                </p>

                {/* Progress Bar */}
                <div
                  className={`w-full rounded-full h-2.5 sm:h-3 mb-2 ${
                    isDarkMode ? "bg-gray-700" : "bg-gray-300"
                  }`}
                >
                  <div
                    className="bg-linear-to-r from-blue-500 to-cyan-500 h-2.5 sm:h-3 rounded-full transition-all duration-300 relative overflow-hidden"
                    style={{
                      width: `${
                        (loadingProgress.current / loadingProgress.total) * 100
                      }%`,
                    }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                  </div>
                </div>

                {/* Percentage */}
                <p
                  className={`text-center text-sm font-mono ${
                    isDarkMode ? "text-gray-300" : "text-gray-600"
                  }`}
                >
                  {Math.round(
                    (loadingProgress.current / loadingProgress.total) * 100
                  )}
                  %
                </p>

                {/* Warning Message */}
                <div
                  className={`mt-4 p-3 rounded-lg ${
                    isDarkMode
                      ? "bg-yellow-900/20 border border-yellow-700/50"
                      : "bg-yellow-50 border border-yellow-300"
                  }`}
                >
                  <p
                    className={`text-xs text-center ${
                      isDarkMode ? "text-yellow-300" : "text-yellow-700"
                    }`}
                  >
                    ⏳ Please wait... Do not close or refresh the page
                  </p>
                </div>
              </div>
            </div>
          )}

        {/* Error State */}
        {error && (
          <div
            className={`backdrop-blur-sm border rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 transition-all duration-300 ${
              isDarkMode
                ? "bg-red-950/50 border-red-800/60 text-red-300"
                : "bg-red-100/80 border-red-300 text-red-700"
            }`}
          >
            <p className="text-xs sm:text-sm md:text-base wrap-break-word font-medium">
              Error: {error}
            </p>
            <button
              onClick={() => setError(null)}
              className={`mt-2 text-xs sm:text-sm hover:underline font-medium ${
                isDarkMode ? "text-red-300" : "text-red-600"
              }`}
            >
              Dismiss
            </button>
          </div>
        )}

        {!loading && (
          <>
            {/* Desktop Navigation Tabs */}
            <div
              className={`hidden lg:block backdrop-blur-md rounded-xl sm:rounded-2xl shadow-lg mb-4 sm:mb-6 border transition-all duration-300 ${
                isDarkMode
                  ? "bg-gray-800/60 border-gray-700/50"
                  : "bg-white/20 border-white/30"
              }`}
            >
              <div
                className={`flex border-b ${
                  isDarkMode ? "border-gray-700/50" : "border-gray-300/20"
                }`}
              >
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    disabled={
                      !initialLoadComplete &&
                      (tab.id === "checklist" ||
                        tab.id === "dashboard" ||
                        tab.id === "reports")
                    }
                    className={`flex-1 px-3 sm:px-4 py-2.5 sm:py-3 font-medium text-sm sm:text-base transition-colors ${
                      activeTab === tab.id
                        ? isDarkMode
                          ? "border-b-2 border-slate-400 text-slate-300"
                          : "border-b-2 border-slate-600 text-slate-700"
                        : isDarkMode
                        ? "text-gray-400 hover:text-slate-400"
                        : "text-gray-600 hover:text-slate-600"
                    } ${
                      !initialLoadComplete &&
                      (tab.id === "checklist" ||
                        tab.id === "dashboard" ||
                        tab.id === "reports")
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                  >
                    {tab.label}
                    {!initialLoadComplete &&
                      (tab.id === "checklist" ||
                        tab.id === "dashboard" ||
                        tab.id === "reports") && (
                        <span className="ml-2 text-xs">⏳</span>
                      )}
                  </button>
                ))}
              </div>
            </div>

            {/* Content Area - Responsive */}
            <div
              className={`backdrop-blur-md rounded-xl sm:rounded-2xl shadow-lg p-3 sm:p-4 md:p-6 border transition-all duration-300 ${
                isDarkMode
                  ? "bg-gray-800/60 border-gray-700/50"
                  : "bg-white/20 border-white/30"
              }`}
            >
              {/* Keep all your existing tab content exactly as is */}
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
                  setSubmitting={setSubmitting}
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
                  openTransferModal={openTransferModal}
                  transferModalOpen={transferModalOpen}
                  setTransferModalOpen={setTransferModalOpen}
                  selectedSubphaseForTransfer={selectedSubphase}
                  selectedItemForTransfer={selectedItem}
                  selectedPhaseForTransfer={selectedPhase}
                  newClient={newClient}
                  setNewClient={setNewClient}
                  transferQuantity={transferQuantity}
                  setTransferQuantity={setTransferQuantity}
                  transferRemarks={transferRemarks}
                  setTransferRemarks={setTransferRemarks}
                  clientItems={clientItems}
                  showClientDropdown={showClientDropdown}
                  setShowClientDropdown={setShowClientDropdown}
                  selectedTargetItem={selectedTargetItem}
                  setSelectedTargetItem={setSelectedTargetItem}
                  selectedTargetPhase={selectedTargetPhase}
                  setSelectedTargetPhase={setSelectedTargetPhase}
                  selectedTargetSubphase={selectedTargetSubphase}
                  setSelectedTargetSubphase={setSelectedTargetSubphase}
                  handleTransferClient={handleTransferClient}
                  getBasePartNumber={getBasePartNumber}
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

      {/* Mobile/Tablet Bottom Navigation - Fixed at bottom */}
      {!loading && (
        <div
          className={`lg:hidden fixed bottom-0 left-0 right-0 z-30 backdrop-blur-md border-t shadow-2xl transition-all duration-300 ${
            isDarkMode
              ? "bg-gray-900/95 border-gray-700/50"
              : "bg-white/95 border-gray-300/50"
          }`}
        >
          <div className="flex justify-around items-center px-2 py-2 max-w-7xl mx-auto">
            {tabs.map((tab) => {
              const icons = {
                dashboard: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                ),
                "add-items": (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                ),
                checklist: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                ),
                comparison: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                ),
                reports: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )
              };

              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  disabled={
                    !initialLoadComplete &&
                    (tab.id === "checklist" ||
                      tab.id === "dashboard" ||
                      tab.id === "reports")
                  }
                  className={`flex flex-col items-center justify-center px-3 py-2 rounded-lg transition-all duration-200 min-w-16 ${
                    activeTab === tab.id
                      ? isDarkMode
                        ? "text-cyan-400 bg-gray-800/60"
                        : "text-blue-600 bg-blue-50/80"
                      : isDarkMode
                      ? "text-gray-400 hover:text-gray-300 hover:bg-gray-800/40"
                      : "text-gray-600 hover:text-gray-800 hover:bg-gray-100/60"
                  } ${
                    !initialLoadComplete &&
                    (tab.id === "checklist" ||
                      tab.id === "dashboard" ||
                      tab.id === "reports")
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                >
                  <div className="relative">
                    {icons[tab.id]}
                    {!initialLoadComplete &&
                      (tab.id === "checklist" ||
                        tab.id === "dashboard" ||
                        tab.id === "reports") && (
                        <span className="absolute -top-1 -right-1 text-xs">⏳</span>
                      )}
                  </div>
                  <span className="text-xs mt-1 font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Add padding to bottom of content to prevent overlap with bottom nav on mobile/tablet */}
      {!loading && <div className="lg:hidden h-20"></div>}

      {/* Scroll to Top Button - Responsive */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-20 sm:bottom-20 md:bottom-20 right-4 sm:right-6 md:right-8 z-40 w-12 h-12 sm:w-14 sm:h-14 bg-zinc-900 hover:bg-zinc-800 text-white rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
          aria-label="Scroll to top"
        >
          <ArrowUp className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      )}

      {/* Keep all your existing modals exactly as they are */}
      {showEditItemModal && selectedItemForEdit && (
        <EditItemModal
          item={selectedItemForEdit}
          clients={clients}
          isDarkMode={isDarkMode}
          onClose={() => {
            setShowEditItemModal(false);
            setSelectedItemForEdit(null);
          }}
          onSave={handleEditItem}
        />
      )}

      {showEditPhaseModal && selectedPhaseForEdit && (
        <EditPhaseModal
          phase={selectedPhaseForEdit}
          isDarkMode={isDarkMode}
          onClose={() => {
            setShowEditPhaseModal(false);
            setSelectedPhaseForEdit(null);
          }}
          onSave={handleEditPhase}
          onDelete={handleDeletePhase}
        />
      )}

      {showEditSubphaseModal &&
        selectedSubphaseForEdit &&
        selectedItemForEdit && (
          <EditSubphaseModal
            subphase={selectedSubphaseForEdit}
            batchQty={selectedItemForEdit.qty}
            isDarkMode={isDarkMode}
            onClose={() => {
              setShowEditSubphaseModal(false);
              setSelectedSubphaseForEdit(null);
              setSelectedPhaseForEdit(null);
              setSelectedItemForEdit(null);
            }}
            onSave={handleEditSubphase}
            onDelete={handleDeleteSubphase}
          />
        )}

      {showAddPhaseModal && selectedItemForEdit && (
        <AddPhaseModal
          item={selectedItemForEdit}
          isDarkMode={isDarkMode}
          onClose={() => {
            setShowAddPhaseModal(false);
            setSelectedItemForEdit(null);
          }}
          onSave={handleAddPhase}
        />
      )}

      {showAddSubphaseModal && selectedPhaseForEdit && selectedItemForEdit && (
        <AddSubphaseModal
          item={selectedItemForEdit}
          phase={selectedPhaseForEdit}
          batchQty={selectedItemForEdit.qty}
          isDarkMode={isDarkMode}
          onClose={() => {
            setShowAddSubphaseModal(false);
            setSelectedPhaseForEdit(null);
            setSelectedItemForEdit(null);
          }}
          onSave={handleAddSubphase}
        />
      )}

      {showBulkEditModal && selectedItemsForBulk.length > 0 && (
        <BulkEditModal
          selectedItems={selectedItemsForBulk}
          clients={clients}
          isDarkMode={isDarkMode}
          onClose={() => {
            setShowBulkEditModal(false);
            setSelectedItemsForBulk([]);
          }}
          onSave={handleBulkEdit}
        />
      )}

{/* Barcode Scanner Modal - Mobile Optimized */}
    {scanningFor && (
      <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
        <div className={`rounded-t-2xl sm:rounded-lg w-full sm:max-w-md sm:w-full p-4 sm:p-6 ${isDarkMode ? "bg-gray-800" : "bg-white"}`}>
          <h3 className={`text-lg sm:text-xl font-bold mb-4 ${isDarkMode ? "text-gray-200" : "text-gray-800"}`}>
            Scan Employee Barcode
          </h3>
          <input
            type="text"
            placeholder="Enter barcode or employee ID"
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && submitBarcode()}
            autoFocus
            className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-slate-500 mb-4 text-base ${
              isDarkMode
                ? "bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400"
                : "bg-gray-100 border-gray-300 text-gray-800 placeholder-gray-500"
            }`}
          />
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={submitBarcode}
              className="flex-1 bg-slate-600 hover:bg-slate-700 active:bg-slate-800 text-white px-4 py-3 sm:py-2 rounded-lg transition-colors font-medium text-base"
            >
              Submit
            </button>
            <button
              onClick={() => {
                setScanningFor(null)
                setBarcodeInput("")
              }}
              className="flex-1 bg-gray-500 hover:bg-gray-600 active:bg-gray-700 text-white px-4 py-3 sm:py-2 rounded-lg transition-colors font-medium text-base"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )}

{/* Transfer Modal - Mobile Optimized */}
    {transferModalOpen && selectedItem && selectedSubphase && (
      <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
        <div
          className={`rounded-t-2xl sm:rounded-lg w-full sm:max-w-md sm:w-full max-h-[90vh] overflow-y-auto ${
            isDarkMode ? "bg-gray-800" : "bg-white"
          }`}
        >
          <div className="p-4 sm:p-6">
            <h3
              className={`text-lg sm:text-xl font-bold mb-4 flex items-center gap-2 ${
                isDarkMode ? "text-gray-200" : "text-gray-800"
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                  className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-slate-500 text-base ${
                    isDarkMode
                      ? "bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400"
                      : "bg-gray-100 border-gray-300 text-gray-800 placeholder-gray-500"
                  }`}
                />

                {showClientDropdown && (
                  <div
                    className={`absolute z-10 w-full mt-1 border rounded-lg shadow-lg max-h-48 overflow-y-auto ${
                      isDarkMode ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"
                    }`}
                  >
                    {clients
                      .filter(
                        (c) => c !== selectedItem?.client_name && c.toLowerCase().includes(newClient.toLowerCase())
                      )
                      .map((client, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setNewClient(client)
                            setShowClientDropdown(false)
                          }}
                          className={`w-full text-left px-4 py-3 border-b transition-colors text-base ${
                            isDarkMode
                              ? "hover:bg-gray-600 active:bg-gray-500 border-gray-600 text-gray-200"
                              : "hover:bg-gray-100 active:bg-gray-200 border-gray-200 text-gray-800"
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                        className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-slate-500 text-base ${
                          isDarkMode
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
                        className={`text-sm p-3 rounded ${
                          isDarkMode ? "text-yellow-400 bg-yellow-500/10" : "text-yellow-600 bg-yellow-500/10"
                        }`}
                      >
                        No matching items found for part number "{getBasePartNumber(selectedItem?.part_number)}" under
                        client "{newClient}"
                      </p>
                    )}
                  </div>

                  {/* Target Phase Selection */}
                  {selectedTargetItem && selectedTargetItem.phases && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Target Phase *
                      </label>
                      <select
                        value={selectedTargetPhase || ""}
                        onChange={(e) => {
                          setSelectedTargetPhase(e.target.value)
                          setSelectedTargetSubphase(null)
                        }}
                        className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-slate-500 text-base ${
                          isDarkMode
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
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Target Subphase *
                      </label>
                      <select
                        value={selectedTargetSubphase || ""}
                        onChange={(e) => {
                          setSelectedTargetSubphase(e.target.value)
                        }}
                        className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-slate-500 text-base ${
                          isDarkMode
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
                      className={`p-3 rounded-lg border ${
                        isDarkMode ? "bg-green-500/10 border-green-500/30" : "bg-green-500/10 border-green-500/30"
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <Package size={16} />
                  Quantity to Transfer *
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedSubphase.current_completed_quantity || 0}
                  value={transferQuantity}
                  onChange={(e) => setTransferQuantity(e.target.value)}
                  className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-slate-500 text-base ${
                    isDarkMode
                      ? "bg-gray-700 border-gray-600 text-gray-200"
                      : "bg-gray-100 border-gray-300 text-gray-800"
                  }`}
                />
              </div>

              {/* Transfer Remarks */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <FileText size={16} />
                  Transfer Remarks
                </label>
                <textarea
                  placeholder="Enter reason for transfer..."
                  value={transferRemarks}
                  onChange={(e) => setTransferRemarks(e.target.value)}
                  rows={3}
                  className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-slate-500 resize-none text-base ${
                    isDarkMode
                      ? "bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400"
                      : "bg-gray-100 border-gray-300 text-gray-800 placeholder-gray-500"
                  }`}
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <button
                onClick={handleTransferClient}
                disabled={!selectedTargetItem || !selectedTargetPhase || !selectedTargetSubphase || !transferQuantity}
                className="flex-1 bg-slate-600 hover:bg-slate-700 active:bg-slate-800 text-white px-4 py-3 sm:py-2 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed text-base"
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
                className="flex-1 bg-gray-500 hover:bg-gray-600 active:bg-gray-700 text-white px-4 py-3 sm:py-2 rounded-lg transition-colors font-medium text-base"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
      
    </div>
  </div>
);
}

export default OperationsDepartment;