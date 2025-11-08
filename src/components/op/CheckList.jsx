import { useState, useEffect } from "react";
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
  Pause
} from "lucide-react";

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
  deleteItem,
  loadData,
}) {
  const [clients, setClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterClient, setFilterClient] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [selectedSubphase, setSelectedSubphase] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedPhase, setSelectedPhase] = useState(null);
  const [newClient, setNewClient] = useState("");
  const [transferQuantity, setTransferQuantity] = useState("");
  const [transferRemarks, setTransferRemarks] = useState("");
  const [clientItems, setClientItems] = useState([]);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [quantityModalOpen, setQuantityModalOpen] = useState(false);
  const [quantityModalData, setQuantityModalData] = useState(null);
  const [tempQuantity, setTempQuantity] = useState("");
  const [selectedTargetItem, setSelectedTargetItem] = useState(null);
  const [selectedTargetPhase, setSelectedTargetPhase] = useState(null);
  const [selectedTargetSubphase, setSelectedTargetSubphase] = useState(null);
  const [, forceUpdate] = useState(0);

  // Optimistic update helpers - update local state without full reload
  const updateItemInState = (partNumber, updates) => {
    setItems(prevItems =>
      prevItems.map(item =>
        item.part_number === partNumber
          ? { ...item, ...updates }
          : item
      )
    );
  };

  const updatePhaseInState = (partNumber, phaseId, updates) => {
    setItems(prevItems =>
      prevItems.map(item => {
        if (item.part_number === partNumber && item.phases) {
          return {
            ...item,
            phases: item.phases.map(phase =>
              phase.id === phaseId ? { ...phase, ...updates } : phase
            )
          };
        }
        return item;
      })
    );
  };



  const updateSubphaseInState = (partNumber, phaseId, subphaseId, updates) => {
    setItems(prevItems =>
      prevItems.map(item => {
        if (item.part_number === partNumber && item.phases) {
          return {
            ...item,
            phases: item.phases.map(phase => {
              if (phase.id === phaseId && phase.subphases) {
                return {
                  ...phase,
                  subphases: phase.subphases.map(subphase =>
                    subphase.id === subphaseId ? { ...subphase, ...updates } : subphase
                  )
                };
              }
              return phase;
            })
          };
        }
        return item;
      })
    );
  };

useEffect(() => {
  const interval = setInterval(() => {
    const hasActivePhases = items.some(item =>
      item.phases?.some(phase =>
        phase.start_time && !phase.end_time && !phase.pause_time // Only active, not paused
      )
    );

    if (hasActivePhases) {
      forceUpdate(prev => prev + 1); // Force component to re-render
    }
  }, 1000);

  return () => clearInterval(interval);
}, [items]);

  // Load clients on mount
  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const clientList = await apiService.operations.getClients();
      setClients(Array.isArray(clientList) ? clientList : []);
    } catch (error) {
      console.error("Error loading clients:", error);
      setClients([]);
    }
  };

  // Auto-stop item when it reaches 100%
  useEffect(() => {
    items.forEach((item) => {
      if (item.phases) {
        item.phases.forEach((phase) => {
          const phaseProgress = calculatePhaseProgress(phase);
          // Auto-stop phase when all subphases are complete
          if (phaseProgress === 100 && phase.start_time && !phase.end_time && !phase.pause_time) {
            // Use silent completion (no reload)
            handleStopPhase(item.part_number, phase.id);
          }
        });
      }
    });
  }, [items]);

  // Load items for selected client
  useEffect(() => {
    if (newClient.trim() && transferModalOpen) {
      const filtered = items.filter(
        (item) =>
          item.client_name === newClient.trim() &&
          item.name === selectedItem?.name
      );
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
      const newQuantity = parseInt(tempQuantity) || 0;

      if (newQuantity > subphase.expected_quantity) {
        alert(`Cannot exceed expected quantity of ${subphase.expected_quantity}`);
        return;
      }

      // Optimistic update
      updateSubphaseInState(item.part_number, phase.id, subphase.id, {
        current_completed_quantity: newQuantity
      });

      // ADD THIS NEW CODE:
      // Auto-uncheck if quantity drops below expected
      if (subphase.completed == 1 && newQuantity < subphase.expected_quantity) {
        updateSubphaseInState(item.part_number, phase.id, subphase.id, {
          current_completed_quantity: newQuantity,
          completed: 0,
          completed_at: null
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
        await apiService.operations.completeSubphaseWithDuration(subphase.id, false);
      }
    } catch (error) {
      console.error("Error updating completed quantity:", error);
      alert("Failed to update completed quantity: " + error.message);
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

    const transferQty = parseInt(transferQuantity);
    if (!transferQty || transferQty < 1) {
      alert("Please enter a valid transfer quantity");
      return;
    }

    const currentQty = selectedSubphase.current_completed_quantity || 0;
    if (transferQty > currentQty) {
      alert(
        `Transfer quantity (${transferQty}) cannot exceed current completed quantity (${currentQty})`
      );
      return;
    }

    try {
      const timestamp = new Date().toLocaleString("en-PH", {
        timeZone: "Asia/Manila",
      });

      // Get full target item details
      const targetItem = await apiService.operations.getItem(
        selectedTargetItem.part_number
      );
      const targetPhase = targetItem.phases?.find(
        (p) => p.id === parseInt(selectedTargetPhase)
      );
      const targetSubphase = targetPhase?.subphases?.find(
        (s) => s.id === parseInt(selectedTargetSubphase)
      );

      if (!targetSubphase) {
        alert("Could not find target subphase");
        return;
      }

      // Calculate new quantities
      const newSourceQty = currentQty - transferQty;
      const targetCurrentQty = targetSubphase.current_completed_quantity || 0;
      const newTargetQty = targetCurrentQty + transferQty;

      // Optimistic updates
      updateSubphaseInState(
        selectedItem.part_number,
        selectedPhase.id,
        selectedSubphase.id,
        { current_completed_quantity: newSourceQty }
      );

      // Auto-uncheck if quantity drops below expected
      if (selectedSubphase.completed == 1 && newSourceQty < selectedSubphase.expected_quantity) {
        updateSubphaseInState(
          selectedItem.part_number,
          selectedPhase.id,
          selectedSubphase.id,
          {
            current_completed_quantity: newSourceQty,
            completed: 0,
            completed_at: null
          }
        );

        // Also update via API
        await apiService.operations.completeSubphaseWithDuration(selectedSubphase.id, false);
      }


      updateSubphaseInState(
        selectedTargetItem.part_number,
        parseInt(selectedTargetPhase),
        parseInt(selectedTargetSubphase),
        { current_completed_quantity: newTargetQty }
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
      alert(
        `Successfully transferred ${transferQty} units to ${targetPhase.name} > ${targetSubphase.name}!`
      );

      // API calls in background
      await apiService.operations.updateSubphaseCompletedQuantity(
        selectedSubphase.id,
        newSourceQty
      );

      await apiService.operations.updateSubphaseCompletedQuantity(
        targetSubphase.id,
        newTargetQty
      );

      // Add remarks
      const transferRemark = `[${timestamp}] Transferred OUT ${transferQty} units to ${newClient} (${selectedTargetItem.part_number}) - ${targetPhase.name} > ${targetSubphase.name} | From: ${selectedPhase.name} > ${selectedSubphase.name}: ${transferRemarks.trim() || "No remarks"}`;
      const receiveRemark = `[${timestamp}] Received IN ${transferQty} units from ${selectedItem.client_name} (${selectedItem.part_number}) - ${selectedPhase.name} > ${selectedSubphase.name} | To: ${targetPhase.name} > ${targetSubphase.name}: ${transferRemarks.trim() || "No remarks"}`;

      await apiService.operations.updateItem(selectedItem.part_number, {
        remarks: selectedItem.remarks
          ? `${selectedItem.remarks}\n${transferRemark}`
          : transferRemark,
      });

      await apiService.operations.updateItem(selectedTargetItem.part_number, {
        remarks: selectedTargetItem.remarks
          ? `${selectedTargetItem.remarks}\n${receiveRemark}`
          : receiveRemark,
      });

      // Reload data in background to sync remarks
      loadData();
    } catch (error) {
      console.error("Error transferring:", error);
      alert("Failed to transfer: " + error.message);
      await loadData(); // Reload on error
    }
  };

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

  const formatDuration = (hours) => {
    const totalMinutes = Math.round(hours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;

    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h} hour${h > 1 ? 's' : ''}`;
    return `${m} minute${m !== 1 ? 's' : ''}`;
  }


 function getPhaseElapsedTime(phase) {
  if (!phase.start_time) return 0;

  const start = new Date(phase.start_time);

  // If phase is completed, calculate total time minus pauses
  if (phase.end_time) {
    const end = new Date(phase.end_time);
    let elapsed = Math.floor((end - start) / 1000);

    // Subtract accumulated paused duration
    if (phase.paused_duration) {
      elapsed -= parseInt(phase.paused_duration);
    }

    return Math.max(0, elapsed);
  }

  // If phase is currently paused, show time up to pause (frozen)
  if (phase.pause_time) {
    const pause = new Date(phase.pause_time);
    let elapsed = Math.floor((pause - start) / 1000);

    // Subtract accumulated paused duration from BEFORE this pause
    if (phase.paused_duration) {
      elapsed -= parseInt(phase.paused_duration);
    }

    return Math.max(0, elapsed);
  }

  // Phase is running - calculate from start to now minus ALL pauses
  const now = new Date();
  let elapsed = Math.floor((now - start) / 1000);

  // Subtract accumulated paused duration
  if (phase.paused_duration) {
    elapsed -= parseInt(phase.paused_duration);
  }

  return Math.max(0, elapsed);
}

  const handleStartPhase = async (partNumber, phaseId) => {
    try {
      const now = new Date().toISOString();
      // Optimistic update
      updatePhaseInState(partNumber, phaseId, {
        start_time: now,
        pause_time: null
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
        end_time: now
      });

      await apiService.operations.stopPhaseProcess(partNumber, phaseId);
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
        pause_time: now
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
      const item = items.find(i => i.part_number === partNumber);
      const phase = item?.phases?.find(p => p.id === phaseId);

      if (!phase || !phase.pause_time) return;

      // Calculate pause duration
      const pauseStart = new Date(phase.pause_time);
      const now = new Date();
      const pauseDurationSeconds = Math.floor((now - pauseStart) / 1000);
      const currentPausedDuration = parseInt(phase.paused_duration) || 0;
      const newPausedDuration = currentPausedDuration + pauseDurationSeconds;

      // Optimistic update - clear pause_time and update paused_duration
      updatePhaseInState(partNumber, phaseId, {
        pause_time: null,
        paused_duration: newPausedDuration
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
          end_time: null
        });

        await apiService.operations.resetPhaseProcess(partNumber, phaseId);
      } catch (error) {
        console.error("Error resetting phase:", error);
        alert("Failed to reset phase: " + error.message);
        await loadData();
      }
    }
  };

  const getItemElapsedTime = (item) => {
    if (!item.start_time) return 0;
    const start = new Date(item.start_time);
    const end = item.end_time ? new Date(item.end_time) : new Date();
    return Math.floor((end - start) / 1000);
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
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

  // Filter items based on search and filters
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      !searchTerm ||
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.part_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.client_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesClient = !filterClient || item.client_name === filterClient;
    const matchesPriority = !filterPriority || item.priority === filterPriority;

    return matchesSearch && matchesClient && matchesPriority;
  });

  // Separate completed and in-progress items
  const completedItems = filteredItems.filter(
    (item) => calculateItemProgress(item) === 100
  );
  const inProgressItems = filteredItems.filter(
    (item) => calculateItemProgress(item) < 100
  );

  // Sort in-progress items by priority
  const sortedInProgressItems = [...inProgressItems].sort((a, b) => {
    const priorityOrder = { High: 0, Medium: 1, Low: 2 };
    const aPriority = a.priority || "Medium";
    const bPriority = b.priority || "Medium";
    return priorityOrder[aPriority] - priorityOrder[bPriority];
  });

  // Get unique clients for filter
  const uniqueClients = [
    ...new Set(items.map((item) => item.client_name).filter(Boolean)),
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

    // Check if quantity condition is met (if applicable)
    if (subphase.expected_quantity > 0) {
      const currentQty = subphase.current_completed_quantity || 0;
      if (currentQty < subphase.expected_quantity) {
        return false;
      }
    }

    // NEW: Check if phase is started or resumed (not paused, not stopped)
    if (!phase.start_time || phase.pause_time || phase.end_time) {
      return false;
    }

    // NEW: Check if employee is assigned
    if (!subphase.employee_barcode) {
      return false;
    }

    return true;
  };

  const handleToggleSubPhase = async (partNumber, phaseId, subphaseId, currentStatus) => {
    if (!currentStatus) { // If trying to mark as complete
      const item = items.find(i => i.part_number === partNumber);
      const phase = item?.phases?.find(p => p.id === phaseId);
      
      // Prevent completing subphases while phase is paused
      if (phase && phase.pause_time && !phase.end_time) {
        alert('Cannot mark subphase as complete while the phase is paused. Please resume the phase first.');
        return;
      }
      
      // Prevent completing subphases if phase hasn't started
      if (phase && !phase.start_time) {
        alert('Cannot mark subphase as complete. Please start the phase first.');
        return;
      }
      
      // Prevent completing subphases if phase is already completed
      if (phase && phase.end_time) {
        alert('Cannot mark subphase as complete. This phase is already completed.');
        return;
      }
    }
    
    try {
      // If trying to mark as complete, check quantity requirement
      if (!currentStatus) {
        const item = items.find(i => i.part_number === partNumber);
        const phase = item?.phases?.find(p => p.id === phaseId);
        const subphase = phase?.subphases?.find(s => s.id === subphaseId);

        if (subphase && subphase.expected_quantity > 0) {
          const currentQty = subphase.current_completed_quantity || 0;
          if (currentQty < subphase.expected_quantity) {
            alert(`Cannot mark as complete. Current quantity (${currentQty}) is less than expected quantity (${subphase.expected_quantity}).`);
            return;
          }
        }
      }

      const now = new Date().toISOString();
      
      // Find the item and phase
      const item = items.find(i => i.part_number === partNumber);
      const phase = item?.phases?.find(p => p.id === phaseId);
      
      if (phase && phase.start_time) {
        // Get current subphase index
        const currentSubphaseIndex = phase.subphases.findIndex(sp => sp.id === subphaseId);
        
        // Calculate time_duration for THIS subphase when marking as complete
        if (!currentStatus) { // If marking as complete
          // Get the current phase elapsed time (from stopwatch display)
          const currentPhaseElapsedSeconds = getPhaseElapsedTime(phase);
          
          // Get the last completed subphase's cumulative time
          let previousCumulativeSeconds = 0;
          if (currentSubphaseIndex > 0) {
            // Look at the previous subphase
            const previousSubphase = phase.subphases[currentSubphaseIndex - 1];
            if (previousSubphase.time_duration) {
              previousCumulativeSeconds = Math.floor(parseFloat(previousSubphase.time_duration) * 3600);
            }
          }
          
          // This subphase duration = current stopwatch time - previous subphase's time
          const thisSubphaseSeconds = Math.max(0, currentPhaseElapsedSeconds - previousCumulativeSeconds);
          const durationInHours = thisSubphaseSeconds / 3600;
          
          // Update this subphase with its time_duration
          updateSubphaseInState(partNumber, phaseId, subphaseId, {
            completed: 1,
            completed_at: now,
            time_duration: durationInHours // Store as hours (decimal)
          });
        } else {
          // If unchecking, clear the time_duration for this subphase
          updateSubphaseInState(partNumber, phaseId, subphaseId, {
            completed: 0,
            completed_at: null,
            time_duration: 0
          });
        }
      } else {
        // If phase not started, just toggle completion without duration
        updateSubphaseInState(partNumber, phaseId, subphaseId, {
          completed: currentStatus ? 0 : 1,
          completed_at: currentStatus ? null : now
        });
      }

      // API call in background
      if (!currentStatus && phase && phase.start_time) {
        // If marking as complete and phase has started, calculate and send time_duration
        const currentPhaseElapsedSeconds = getPhaseElapsedTime(phase);
        const currentSubphaseIndex = phase.subphases.findIndex(sp => sp.id === subphaseId);
        
        let previousCumulativeSeconds = 0;
        if (currentSubphaseIndex > 0) {
          const previousSubphase = phase.subphases[currentSubphaseIndex - 1];
          if (previousSubphase.time_duration) {
            previousCumulativeSeconds = Math.floor(parseFloat(previousSubphase.time_duration) * 3600);
          }
        }
        
        const thisSubphaseSeconds = Math.max(0, currentPhaseElapsedSeconds - previousCumulativeSeconds);
        const durationInHours = thisSubphaseSeconds / 3600;
        
        // Complete subphase with calculated time_duration
        await apiService.operations.completeSubphaseWithDuration(subphaseId, true, durationInHours);
      } else {
        // Just toggle completion status without duration
        await apiService.operations.completeSubphaseWithDuration(subphaseId, !currentStatus);
      }
    } catch (error) {
      console.error("Error toggling subphase:", error);
      alert("Failed to toggle subphase: " + error.message);
      await loadData();
    }
  };

  // Helper function to check if previous phase is completed
  const isPreviousPhaseCompleted = (item, currentPhaseIndex) => {
    if (currentPhaseIndex === 0) return true; // First phase is always available

    const previousPhase = item.phases[currentPhaseIndex - 1];
    if (!previousPhase) return true;

    // Previous phase must be completed (100% progress)
    return calculatePhaseProgress(previousPhase) === 100 && previousPhase.end_time;
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-6">
        Progress Checklist
      </h2>

      {/* Search and Filter Bar */}
      <div className="bg-white/5 dark:bg-black/10 rounded-lg p-4 mb-6 border border-gray-300/20 dark:border-gray-700/20">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search by name, part number, or client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/10 dark:bg-black/20 border border-gray-300/20 dark:border-gray-700/20 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-500"
            />
          </div>

          {/* Filter Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
          >
            <Filter size={18} />
            Filters{" "}
            {(filterClient || filterPriority) &&
              `(${[filterClient, filterPriority].filter(Boolean).length})`}
          </button>
        </div>

        {/* Filter Options */}
        {showFilters && (
          <div className="mt-3 pt-3 border-t border-gray-300/20 dark:border-gray-700/20 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Filter by Client
              </label>
              <select
                value={filterClient}
                onChange={(e) => setFilterClient(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white/10 dark:bg-black/20 border border-gray-300/20 dark:border-gray-700/20 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-slate-500"
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
                className="w-full px-3 py-2 rounded-lg bg-white/10 dark:bg-black/20 border border-gray-300/20 dark:border-gray-700/20 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-slate-500"
              >
                <option value="">All Priorities</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            {(filterClient || filterPriority) && (
              <div className="md:col-span-2">
                <button
                  onClick={() => {
                    setFilterClient("");
                    setFilterPriority("");
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

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-300">
            In Progress
          </h3>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">
            {inProgressItems.length}
          </p>
        </div>
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-green-700 dark:text-green-300">
            Completed
          </h3>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
            {completedItems.length}
          </p>
        </div>
      </div>

      {/* Transfer Modal */}
      {transferModalOpen && selectedItem && selectedSubphase && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
              <ArrowRightLeft size={20} />
              Transfer Subphase Quantity
            </h3>

            <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg space-y-2">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  From Item:
                </p>
                <p className="font-semibold text-gray-800 dark:text-gray-200">
                  {selectedItem.name}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Client: {selectedItem.client_name}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Phase / Subphase:
                </p>
                <p className="font-medium text-gray-800 dark:text-gray-200">
                  {selectedPhase.name} → {selectedSubphase.name}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Available to Transfer:
                </p>
                <p className="font-bold text-blue-600 dark:text-blue-400">
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
                    setNewClient(e.target.value);
                    setSelectedTargetItem(null);
                    setSelectedTargetPhase(null);
                    setSelectedTargetSubphase(null);
                  }}
                  autoFocus
                  className="w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-500"
                />

                {showClientDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                    {clients
                      .filter(
                        (c) =>
                          c !== selectedItem?.client_name &&
                          c.toLowerCase().includes(newClient.toLowerCase())
                      )
                      .map((client, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setNewClient(client);
                            setShowClientDropdown(false);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 border-b border-gray-200 dark:border-gray-600 last:border-b-0 transition-colors text-gray-800 dark:text-gray-200"
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
                          const item = clientItems.find(
                            (i) => i.part_number === e.target.value
                          );
                          setSelectedTargetItem(item || null);
                          setSelectedTargetPhase(null);
                          setSelectedTargetSubphase(null);
                        }}
                        className="w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-slate-500"
                      >
                        <option value="">Select target item</option>
                        {clientItems.map((item) => (
                          <option
                            key={item.part_number}
                            value={item.part_number}
                          >
                            {item.part_number} ({item.quantity || 0} qty)
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-sm text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 p-3 rounded">
                        No matching items found for "{selectedItem.name}" under
                        client "{newClient}"
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
                          setSelectedTargetPhase(e.target.value);
                          setSelectedTargetSubphase(null);
                        }}
                        className="w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-slate-500"
                      >
                        <option value="">Select target phase</option>
                        {selectedTargetItem.phases.map((phase) => (
                          <option key={phase.id} value={phase.id}>
                            {phase.name} ({phase.subphases?.length || 0}{" "}
                            subphases)
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
                          setSelectedTargetSubphase(e.target.value);
                        }}
                        className="w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-slate-500"
                      >
                        <option value="">Select target subphase</option>
                        {selectedTargetItem.phases
                          .find((p) => p.id === parseInt(selectedTargetPhase))
                          ?.subphases?.map((subphase) => (
                            <option key={subphase.id} value={subphase.id}>
                              {subphase.name} (Current:{" "}
                              {subphase.current_completed_quantity || 0} /
                              Expected: {subphase.expected_quantity})
                            </option>
                          ))}
                      </select>
                    </div>
                  )}

                  {/* Show selected target info */}
                  {selectedTargetItem &&
                    selectedTargetPhase &&
                    selectedTargetSubphase && (
                      <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                        <p className="text-sm font-medium text-green-700 dark:text-green-300">
                          ✓ Transfer destination selected
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {
                            selectedTargetItem.phases.find(
                              (p) => p.id === parseInt(selectedTargetPhase)
                            )?.name
                          }{" "}
                          →{" "}
                          {
                            selectedTargetItem.phases
                              .find(
                                (p) => p.id === parseInt(selectedTargetPhase)
                              )
                              ?.subphases?.find(
                                (s) => s.id === parseInt(selectedTargetSubphase)
                              )?.name
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
                  className="w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-slate-500"
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
                  className="w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-500 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleTransferClient}
                disabled={
                  !selectedTargetItem ||
                  !selectedTargetPhase ||
                  !selectedTargetSubphase ||
                  !transferQuantity
                }
                className="flex-1 bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Transfer
              </button>
              <button
                onClick={() => {
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
                  setShowClientDropdown(false);
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
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">
              Scan Employee Barcode
            </h3>
            <input
              type="text"
              placeholder="Enter barcode or employee ID"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && submitBarcode()}
              autoFocus
              className="w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-500 mb-4"
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
                  setScanningFor(null);
                  setBarcodeInput("");
                }}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {filteredItems.length > 0 ? (
        <div className="space-y-8">
          {/* In Progress Items */}
          {inProgressItems.length > 0 && (
            <div>
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                <Clock size={20} />
                In Progress Items ({inProgressItems.length})
              </h3>
              <div className="space-y-4">
                {sortedInProgressItems.map((item) => {
                  const itemKey = item.part_number || item.id;
                  const priority = item.priority || "Medium";
                  const elapsedSeconds = getItemElapsedTime(item);
                  const progress = calculateItemProgress(item);

                  return (
                    <div
                      key={itemKey}
                      className="bg-white/5 dark:bg-black/10 rounded-lg border border-gray-300/20 dark:border-gray-700/20 overflow-hidden"
                    >
                      {/* Item Header */}
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div
                            onClick={() =>
                              toggleItemExpansion(item.part_number)
                            }
                            className="flex items-center gap-3 cursor-pointer flex-1"
                          >
                            <span className="text-xl">
                              {expandedItems[item.part_number] ? "▼" : "▶"}
                            </span>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold text-gray-800 dark:text-gray-200">
                                  {item.name}
                                </h3>
                                <div
                                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${getPriorityColor(
                                    priority
                                  )}`}
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
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                Part #: {item.part_number} •{" "}
                                {item.phases?.length || 0} phases
                              </p>
                              {item.remarks && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic flex items-start gap-1">
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
                          </div>
                          <div className="flex items-center gap-3">
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
                                  className={`px-2 py-1 text-xs rounded transition-colors ${priority === p
                                    ? getPriorityColor(p)
                                    : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                    }`}
                                  title={`Set ${p} priority`}
                                >
                                  <Flag size={14} />
                                </button>
                              ))}
                            </div>
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
                            <span className="text-lg font-bold text-gray-800 dark:text-gray-200">
                              {progress}%
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Phases */}
                      {expandedItems[item.part_number] && (
                        <div className="px-4 pb-4 space-y-3">
                          {item.phases && item.phases.length > 0 ? (
                            item.phases.map((phase, phaseIndex) => {
                              const phaseKey = phase.id;
                              const isFirstPhase = phaseIndex === 0;
                              const isPreviousPhaseComplete = isPreviousPhaseCompleted(item, phaseIndex);
                              const isPhaseDisabled = !isFirstPhase && !isPreviousPhaseComplete;

                              return (
                                <div
                                  key={phaseKey}
                                  className={`bg-white/5 dark:bg-black/10 rounded-lg border ${isPhaseDisabled
                                    ? 'border-yellow-500/30 opacity-60'
                                    : 'border-gray-300/10 dark:border-gray-700/10'
                                    }`}
                                >
                                  {/* Add warning if phase is disabled */}
                                  {isPhaseDisabled && (
                                    <div className="px-3 pt-3">
                                      <div className="p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs text-yellow-700 dark:text-yellow-400">
                                        ⚠️ Complete previous phase first
                                      </div>
                                    </div>
                                  )}

                                  {/* Phase Header */}
                                  <div className="p-3">
                                    <div className="flex justify-between items-center mb-3">
                                      <div
                                        onClick={() =>
                                          togglePhaseExpansion(phase.id)
                                        }
                                        className="flex items-center gap-2 cursor-pointer flex-1"
                                      >
                                        <span>
                                          {expandedPhases[phase.id] ? "▼" : "▶"}
                                        </span>
                                        <span className="font-medium text-gray-800 dark:text-gray-200">
                                          {phase.name}
                                          {isFirstPhase && (
                                            <span className="ml-2 text-xs bg-blue-500 text-white px-2 py-0.5 rounded">
                                              Phase 1
                                            </span>
                                          )}
                                        </span>
                                        <span className="text-sm text-gray-600 dark:text-gray-400">
                                          ({phase.subphases?.length || 0}{" "}
                                          sub-phases)
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <div className="w-32 bg-gray-300 dark:bg-gray-700 rounded-full h-2">
                                          <div
                                            className="bg-slate-600 dark:bg-slate-400 h-2 rounded-full transition-all duration-300"
                                            style={{
                                              width: `${calculatePhaseProgress(
                                                phase
                                              )}%`,
                                            }}
                                          ></div>
                                        </div>
                                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-12 text-right">
                                          {calculatePhaseProgress(phase)}%
                                        </span>
                                      </div>
                                    </div>

                                    {/* Phase Duration Tracker */}
                                    <div className="bg-slate-500/10 dark:bg-slate-500/20 rounded-lg p-3">
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                          <Calendar size={16} />
                                          Phase Duration
                                        </span>
                                        <div className="flex items-center gap-2">
                                          <Clock
                                            size={16}
                                            className="text-slate-600 dark:text-slate-400"
                                          />
                                          <span className="text-lg font-mono font-bold text-gray-800 dark:text-gray-200">
                                            {formatTime(
                                              getPhaseElapsedTime(phase)
                                            )}
                                          </span>
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                                        <div>
                                          <span className="text-gray-600 dark:text-gray-400">
                                            Start:{" "}
                                          </span>
                                          <span className="text-gray-800 dark:text-gray-200 font-medium">
                                            {formatDateTime(phase.start_time)}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-gray-600 dark:text-gray-400">
                                            End:{" "}
                                          </span>
                                          <span className="text-gray-800 dark:text-gray-200 font-medium">
                                            {phase.end_time
                                              ? formatDateTime(phase.end_time)
                                              : phase.pause_time
                                                ? "Paused"
                                                : "In progress"}
                                          </span>
                                        </div>
                                      </div>

                                      <div className="flex gap-2">
                                        {!phase.start_time ? (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleStartPhase(
                                                item.part_number,
                                                phase.id
                                              );
                                            }}
                                            className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
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
                                            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                                          >
                                            <Play size={16} />
                                            Resume Phase
                                          </button>
                                        ) : !phase.end_time ? (
                                          <>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handlePausePhase(
                                                  item.part_number,
                                                  phase.id
                                                );
                                              }}
                                              className="flex-1 flex items-center justify-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                                            >
                                              <Pause size={16} />
                                              Pause Phase
                                            </button>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleStopPhase(
                                                  item.part_number,
                                                  phase.id
                                                );
                                              }}
                                              className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                                              disabled={
                                                calculatePhaseProgress(phase) <
                                                100
                                              }
                                              title={
                                                calculatePhaseProgress(phase) <
                                                  100
                                                  ? "Complete all subphases to stop"
                                                  : "Stop phase"
                                              }
                                            >
                                              <StopCircle size={16} />
                                              {calculatePhaseProgress(phase) ===
                                                100
                                                ? "Stop Phase"
                                                : "Complete to Stop"}
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
                                              handleResetPhase(
                                                item.part_number,
                                                phase.id
                                              );
                                            }}
                                            className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
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
                                      {phase.subphases &&
                                        phase.subphases.length > 0 ? (
                                        phase.subphases.map((subphase, subphaseIndex) => {
                                          const subPhaseKey = subphase.id;
                                          const conditionMet = isSubphaseConditionMet(item, phase, subphase, subphaseIndex);
                                          const isDisabled = !conditionMet && subphase.completed != 1;

                                          return (
                                            <div
                                              key={subPhaseKey}
                                              className="bg-white/5 dark:bg-black/10 p-3 rounded-lg border border-gray-300/10 dark:border-gray-700/10"
                                            >
                                              <div className="flex items-start gap-3">
                                                <div className="relative">
                                                  <input
                                                    type="checkbox"
                                                    checked={subphase.completed == 1}
                                                    disabled={isDisabled}
                                                    onChange={() => {
                                                      if (!isDisabled) {
                                                        const action = subphase.completed != 1 ? 'complete' : 'incomplete';
                                                        if (window.confirm(`Mark "${subphase.name}" as ${action}?`)) {
                                                          handleToggleSubPhase(
                                                            item.part_number,
                                                            phase.id,
                                                            subphase.id,
                                                            subphase.completed == 1
                                                          );
                                                        }
                                                      }
                                                    }}
                                                    className={`mt-1 w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-slate-600 focus:ring-slate-500 ${isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                                                      }`}
                                                    title={
                                                      isDisabled
                                                        ? !phase.start_time
                                                          ? 'Phase not started yet'
                                                          : phase.pause_time
                                                            ? 'Phase is paused - resume to continue'
                                                            : phase.end_time
                                                              ? 'Phase already completed'
                                                              : !subphase.employee_barcode
                                                                ? 'Assign employee first'
                                                                : subphaseIndex > 0 && !isPreviousSubphaseCompleted(item, phase, subphaseIndex)
                                                                  ? 'Complete previous subphase first'
                                                                  : subphase.expected_quantity > 0 && (subphase.current_completed_quantity || 0) < subphase.expected_quantity
                                                                    ? `Complete ${subphase.expected_quantity} units first (current: ${subphase.current_completed_quantity || 0})`
                                                                    : 'Conditions not met'
                                                        : subphase.completed == 1
                                                          ? 'Mark as incomplete'
                                                          : 'Mark as complete'
                                                    }
                                                  />
                                                  {isDisabled && (
                                                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-gray-800" title="Conditions not met" />
                                                  )}
                                                </div>
                                                <div className="flex-1">
                                                  <div className="flex items-start justify-between">
                                                    <p
                                                      className={`text-gray-800 dark:text-gray-200 font-medium ${subphase.completed == 1
                                                        ? "line-through opacity-60"
                                                        : isDisabled
                                                          ? "opacity-50"
                                                          : ""
                                                        }`}
                                                    >
                                                      {subphase.name}
                                                    </p>
                                                    {subphase.completed == 1 && (
                                                      <CheckCircle
                                                        size={18}
                                                        className="text-green-500 shrink-0 ml-2"
                                                      />
                                                    )}
                                                  </div>

                                                  {/* Show condition warning if not met */}
                                                  {isDisabled && (
                                                    <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs text-yellow-700 dark:text-yellow-400">
                                                      {!phase.start_time ? (
                                                        <>⚠️ Start the phase first before marking subphases</>
                                                      ) : phase.pause_time ? (
                                                        <>⚠️ Phase is paused - resume to continue marking subphases</>
                                                      ) : phase.end_time ? (
                                                        <>⚠️ Phase is already completed</>
                                                      ) : !subphase.employee_barcode ? (
                                                        <>⚠️ Assign an employee first before marking complete</>
                                                      ) : subphaseIndex > 0 && !isPreviousSubphaseCompleted(item, phase, subphaseIndex) ? (
                                                        <>⚠️ Complete previous subphase first</>
                                                      ) : subphase.expected_quantity > 0 && (subphase.current_completed_quantity || 0) < subphase.expected_quantity ? (
                                                        <>⚠️ Complete {subphase.expected_quantity} units first (current: {subphase.current_completed_quantity || 0})</>
                                                      ) : (
                                                        <>⚠️ Conditions not met</>
                                                      )}
                                                    </div>
                                                  )}


                                                  {subphase.time_duration > 0 && (
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 italic mt-1 flex items-center gap-1">
                                                      <Clock size={12} />
                                                      Duration: {formatDuration(subphase.time_duration)} completion
                                                    </p>
                                                  )}


                                                  <div className="mt-2 flex flex-wrap gap-2 items-center">
                                                    <span className="text-xs bg-blue-500/20 text-blue-700 dark:text-blue-300 px-2 py-1 rounded flex items-center gap-1">
                                                      <Clock size={12} />
                                                      Expected:{" "}
                                                      {formatDuration(subphase.expected_duration)}
                                                    </span>

                                                    {/* Quantity Tracking */}
                                                    {subphase.expected_quantity !==
                                                      undefined &&
                                                      subphase.expected_quantity !==
                                                      null &&
                                                      subphase.expected_quantity >
                                                      0 && (
                                                        <div className="flex items-center gap-2">
                                                          <span className="text-xs bg-purple-500/20 text-purple-700 dark:text-purple-300 px-2 py-1 rounded flex items-center gap-1">
                                                            <Package
                                                              size={12}
                                                            />
                                                            Current:{" "}
                                                            {subphase.current_completed_quantity ||
                                                              0}{" "}
                                                            /{" "}
                                                            {
                                                              subphase.expected_quantity
                                                            }
                                                          </span>
                                                          <div className="flex items-center gap-1">
                                                            <button
                                                              onClick={() =>
                                                                openQuantityModal(
                                                                  item,
                                                                  phase,
                                                                  subphase
                                                                )
                                                              }
                                                              className="px-3 py-1 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
                                                            >
                                                              Update
                                                            </button>
                                                          </div>
                                                          {/* Quantity Update Modal */}
                                                          {quantityModalOpen &&
                                                            quantityModalData && (
                                                              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                                                                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
                                                                  <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                                                                    <Package
                                                                      size={20}
                                                                    />
                                                                    Update
                                                                    Completed
                                                                    Quantity
                                                                  </h3>

                                                                  <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg space-y-2">
                                                                    <div>
                                                                      <p className="text-sm text-gray-600 dark:text-gray-400">
                                                                        Item:
                                                                      </p>
                                                                      <p className="font-semibold text-gray-800 dark:text-gray-200">
                                                                        {
                                                                          quantityModalData
                                                                            .item
                                                                            .name
                                                                        }
                                                                      </p>
                                                                    </div>
                                                                    <div>
                                                                      <p className="text-sm text-gray-600 dark:text-gray-400">
                                                                        Phase /
                                                                        Subphase:
                                                                      </p>
                                                                      <p className="font-medium text-gray-800 dark:text-gray-200">
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
                                                                      <p className="text-sm text-gray-600 dark:text-gray-400">
                                                                        Expected
                                                                        Quantity:
                                                                      </p>
                                                                      <p className="font-bold text-blue-600 dark:text-blue-400">
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
                                                                      Current
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
                                                                      onChange={(
                                                                        e
                                                                      ) =>
                                                                        setTempQuantity(
                                                                          e
                                                                            .target
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
                                                                      className="w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-slate-500"
                                                                    />
                                                                  </div>

                                                                  <div className="flex gap-3">
                                                                    <button
                                                                      onClick={
                                                                        handleUpdateCompletedQuantity
                                                                      }
                                                                      className="flex-1 bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
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
                                                                      className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors font-medium"
                                                                    >
                                                                      Cancel
                                                                    </button>
                                                                  </div>
                                                                </div>
                                                              </div>
                                                            )}
                                                          {subphase.current_completed_quantity >
                                                            0 && (
                                                              <button
                                                                onClick={() =>
                                                                  openTransferModal(
                                                                    item,
                                                                    phase,
                                                                    subphase
                                                                  )
                                                                }
                                                                className="flex items-center gap-1 px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                                                              >
                                                                <ArrowRightLeft
                                                                  size={12}
                                                                />
                                                                Transfer (
                                                                {
                                                                  subphase.current_completed_quantity
                                                                }{" "}
                                                                available)
                                                              </button>
                                                            )}
                                                        </div>
                                                      )}
                                                  </div>

                                                  {subphase.employee_barcode && (
                                                    <div className="mt-2 text-xs bg-slate-500/20 text-slate-700 dark:text-slate-300 px-2 py-1 rounded inline-flex items-center gap-1">
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

                                                  <div className="mt-3">
                                                    <button
                                                      onClick={() =>
                                                        handleBarcodeScan(
                                                          item.part_number,
                                                          phase.id,
                                                          subphase.id
                                                        )
                                                      }
                                                      className="w-full px-3 py-1.5 text-sm bg-slate-600 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded transition-colors flex items-center justify-center gap-1"
                                                    >
                                                      <User size={14} />
                                                      Assign Employee
                                                    </button>
                                                  </div>

                                                  {/* Show completion time with duration */}
                                                  {subphase.completed_at && (
                                                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-2 space-y-1">
                                                      <p className="flex items-center gap-1">
                                                        <CheckCircle size={12} />
                                                        Completed: {new Date(subphase.completed_at).toLocaleString()}
                                                      </p>
                                                      {/* {subphase.time_duration > 0 && (
                      <p className="flex items-center gap-1">
                      <Clock size={12} />
                      Total Duration: {formatDuration(subphase.time_duration)}
                    </p>
                    )} */}
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })
                                      ) : (
                                        <p className="text-gray-600 dark:text-gray-400 text-sm py-2">
                                          No sub-phases added yet.
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-gray-600 dark:text-gray-400 py-4">
                              No phases added yet. Go to "Add Items" to add
                              phases.
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

          {/* Completed Items */}
          {completedItems.length > 0 && (
            <div>
              <h3 className="text-xl font-bold text-green-700 dark:text-green-300 mb-4 flex items-center gap-2">
                <CheckCircle size={20} />
                Completed Items ({completedItems.length})
              </h3>
              <div className="space-y-4 opacity-75">
                {completedItems.map((item) => {
                  const itemKey = item.part_number || item.id;
                  const elapsedSeconds = getItemElapsedTime(item);

                  return (
                    <div
                      key={itemKey}
                      className="bg-green-500/5 dark:bg-green-500/10 rounded-lg border border-green-500/20 dark:border-green-500/30 overflow-hidden"
                    >
                      <div className="p-4">
                        <div
                          onClick={() => toggleItemExpansion(item.part_number)}
                          className="cursor-pointer"
                        >
                          <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center gap-3">
                              <span className="text-xl">
                                {expandedItems[item.part_number] ? "▼" : "▶"}
                              </span>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="font-semibold text-gray-800 dark:text-gray-200">
                                    {item.name}
                                  </h3>
                                  <CheckCircle
                                    size={16}
                                    className="text-green-500"
                                  />
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
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  Part #: {item.part_number} •{" "}
                                  {item.phases?.length || 0} phases
                                </p>
                                {item.remarks && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic flex items-start gap-1">
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
                            </div>
                            <div className="flex items-center gap-3">
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
                              <span className="text-lg font-bold text-green-600 dark:text-green-400">
                                100%
                              </span>
                            </div>
                          </div>
                        </div>

                        {item.start_time && (
                          <div className="bg-green-500/10 dark:bg-green-500/20 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-semibold text-green-700 dark:text-green-300 flex items-center gap-2">
                                <CheckCircle size={16} />
                                Process Completed
                              </span>
                              <div className="flex items-center gap-2">
                                <Clock
                                  size={16}
                                  className="text-green-600 dark:text-green-400"
                                />
                                <span className="text-lg font-mono font-bold text-green-700 dark:text-green-300">
                                  {formatTime(elapsedSeconds)}
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">
                                  Started:{" "}
                                </span>
                                <span className="text-gray-800 dark:text-gray-200 font-medium">
                                  {formatDateTime(item.start_time)}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">
                                  Completed:{" "}
                                </span>
                                <span className="text-gray-800 dark:text-gray-200 font-medium">
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
                              const phaseKey = phase.id;

                              return (
                                <div
                                  key={phaseKey}
                                  className="bg-white/5 dark:bg-black/10 rounded-lg border border-gray-300/10 dark:border-gray-700/10"
                                >
                                  <div className="p-3">
                                    <div className="flex justify-between items-center">
                                      <span className="font-medium text-gray-800 dark:text-gray-200">
                                        {phase.name}
                                      </span>
                                      <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                                        100%
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-gray-600 dark:text-gray-400 py-4">
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
        <p className="text-gray-600 dark:text-gray-400 text-center py-8">
          {searchTerm || filterClient || filterPriority
            ? "No items match your search or filters."
            : 'No items yet. Go to "Add Items" to create your first item.'}
        </p>
      )}
    </div>
  );
}

export default Checklist;
