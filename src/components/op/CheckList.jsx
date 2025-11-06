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
} from "lucide-react";

function Checklist({
  items,
  expandedItems,
  expandedPhases,
  scanningFor,
  barcodeInput,
  setBarcodeInput,
  calculateItemProgress,
  calculatePhaseProgress,
  toggleItemExpansion,
  togglePhaseExpansion,
  toggleSubPhase,
  updateActualHours,
  handleBarcodeScan,
  submitBarcode,
  setScanningFor,
  apiService,
  deleteItem,
  loadData,
}) {
  const [currentTimes, setCurrentTimes] = useState({});
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [newClient, setNewClient] = useState("");
  const [transferQuantity, setTransferQuantity] = useState(1);
  const [transferRemarks, setTransferRemarks] = useState("");
  const [clients, setClients] = useState([]);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [filteredClients, setFilteredClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterClient, setFilterClient] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [showFilters, setShowFilters] = useState(false);

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

  // Filter clients for dropdown
  useEffect(() => {
    if (!Array.isArray(clients)) {
      setFilteredClients([]);
      setShowClientDropdown(false);
      return;
    }

    const searchValue = newClient.trim().toLowerCase();
    if (searchValue.length >= 1) {
      const matches = clients.filter((client) =>
        client.toLowerCase().includes(searchValue)
      );
      setFilteredClients(matches);
      setShowClientDropdown(matches.length > 0);
    } else {
      setFilteredClients(clients);
      setShowClientDropdown(false);
    }
  }, [newClient, clients]);

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const newTimes = {};

      items.forEach((item) => {
        if (item.start_time && !item.end_time) {
          newTimes[item.part_number] = now;
        }
      });

      setCurrentTimes(newTimes);
    }, 1000);

    return () => clearInterval(interval);
  }, [items]);

  // Auto-stop item when it reaches 100%
  useEffect(() => {
    items.forEach((item) => {
      const progress = calculateItemProgress(item);
      if (progress === 100 && item.start_time && !item.end_time) {
        handleStopItem(item.part_number);
      }
    });
  }, [items]);

  const handleStartItem = async (partNumber) => {
    try {
      await apiService.operations.startItemProcess(partNumber);
      await loadData();
    } catch (error) {
      console.error("Error starting item:", error);
      alert("Failed to start item: " + error.message);
    }
  };

  const handleStopItem = async (partNumber) => {
    try {
      await apiService.operations.stopItemProcess(partNumber);
      await loadData();
    } catch (error) {
      console.error("Error stopping item:", error);
      alert("Failed to stop item: " + error.message);
    }
  };

  const handleResetItem = async (partNumber) => {
    if (window.confirm("Reset process times for this item?")) {
      try {
        await apiService.operations.resetItemProcess(partNumber);
        await loadData();
      } catch (error) {
        console.error("Error resetting item:", error);
        alert("Failed to reset item: " + error.message);
      }
    }
  };

  const openTransferModal = (item) => {
    setSelectedItem(item);
    setNewClient(item.client_name || "");
    setTransferQuantity(item.quantity || 1);
    setTransferRemarks("");
    setTransferModalOpen(true);
  };

  const handleTransferClient = async () => {
    if (!newClient.trim()) {
      alert("Please enter a client name");
      return;
    }

    if (!transferQuantity || transferQuantity < 1) {
      alert("Please enter a valid transfer quantity");
      return;
    }

    if (transferQuantity > selectedItem.quantity) {
      alert(
        `Transfer quantity (${transferQuantity}) cannot exceed item quantity (${selectedItem.quantity})`
      );
      return;
    }

    try {
      const currentQty = selectedItem.quantity;
      const remainingQty = currentQty - transferQuantity;

      // If transferring all quantity, just update client and add remarks
      if (remainingQty === 0) {
        const updateData = {
          client_name: newClient.trim(),
        };

        // Add remarks to existing remarks if provided
        if (transferRemarks.trim()) {
          const timestamp = new Date().toLocaleString("en-PH", {
            timeZone: "Asia/Manila",
          });
          const newRemark = `[${timestamp}] Transferred all ${transferQuantity} units to ${newClient.trim()}: ${transferRemarks.trim()}`;
          updateData.remarks = selectedItem.remarks
            ? `${selectedItem.remarks}\n${newRemark}`
            : newRemark;
        }

        await apiService.operations.updateItem(
          selectedItem.part_number,
          updateData
        );

        setTransferModalOpen(false);
        setSelectedItem(null);
        setNewClient("");
        setTransferQuantity(1);
        setTransferRemarks("");
        await loadData();
        alert("Item transferred successfully!");
        return;
      }

      // Partial transfer: Create new item with transferred quantity
      const timestamp = new Date().toLocaleString("en-PH", {
        timeZone: "Asia/Manila",
      });
      const transferRemark = `[${timestamp}] Received ${transferQuantity} units from ${
        selectedItem.client_name || "No Client"
      }: ${transferRemarks.trim() || "No remarks"}`;
      const reduceRemark = `[${timestamp}] Transferred out ${transferQuantity} units to ${newClient.trim()}: ${
        transferRemarks.trim() || "No remarks"
      }`;

      // Get full item details with phases and subphases
      const fullItem = await apiService.operations.getItem(
        selectedItem.part_number
      );

      // Create new item for transferred quantity
      const basePart = selectedItem.part_number.split("-BATCH-")[0];
      const newBatchNumber = `BATCH-${Date.now()}-TRANSFER`;
      const newPartNumber = `${basePart}-${newBatchNumber}`;

      // Calculate completion percentage and completed quantities
      const progress = calculateItemProgress(selectedItem);
      const completionRatio = progress / 100;

      // Calculate transfer ratio based on quantities
      const transferRatio = transferQuantity / currentQty;

      const newItemData = {
        part_number: newPartNumber,
        name: fullItem.name,
        client_name: newClient.trim(),
        priority: fullItem.priority || "Medium",
        quantity: transferQuantity,
        remarks: transferRemark,
        phases:
          fullItem.phases?.map((phase) => ({
            name: phase.name,
            subphases:
              phase.subphases?.map((sub) => {
                const originalExpectedQty =
                  parseInt(sub.expected_quantity) || 0;

                // Calculate completed and remaining quantities
                const completedQty = Math.floor(
                  originalExpectedQty * completionRatio
                );
                const remainingQtyInSub = originalExpectedQty - completedQty;

                // Transfer proportional quantity (from remaining only)
                const transferSubQty = Math.ceil(
                  remainingQtyInSub * transferRatio
                );

                return {
                  name: sub.name,
                  expected_duration: parseFloat(sub.expected_duration) || 0,
                  expected_quantity: transferSubQty,
                  completed: 0, // New item starts fresh
                  actual_hours: 0,
                };
              }) || [],
          })) || [],
      };

      await apiService.operations.createItemWithStructure(newItemData);

      // Update original item: reduce quantity and adjust subphase expected quantities
      const updatedRemarks = selectedItem.remarks
        ? `${selectedItem.remarks}\n${reduceRemark}`
        : reduceRemark;

      await apiService.operations.updateItem(selectedItem.part_number, {
        quantity: remainingQty,
        remarks: updatedRemarks,
      });

      // Update all subphases in the original item with adjusted quantities
      if (fullItem.phases) {
        for (const phase of fullItem.phases) {
          if (phase.subphases) {
            for (const sub of phase.subphases) {
              const originalExpectedQty = parseInt(sub.expected_quantity) || 0;

              // Calculate completed and remaining quantities
              const completedQty = Math.floor(
                originalExpectedQty * completionRatio
              );
              const remainingQtyInSub = originalExpectedQty - completedQty;

              // Keep proportional remaining quantity in original item
              const keepSubQty = Math.floor(
                remainingQtyInSub * (remainingQty / currentQty)
              );
              const newExpectedQty = completedQty + keepSubQty;

              await apiService.operations.updateSubphase(sub.id, {
                expected_quantity: newExpectedQty,
              });
            }
          }
        }
      }

      setTransferModalOpen(false);
      setSelectedItem(null);
      setNewClient("");
      setTransferQuantity(1);
      setTransferRemarks("");
      await loadData();
      alert(
        `Successfully transferred ${transferQuantity} units to ${newClient.trim()}!\nRemaining in original item: ${remainingQty} units\n\nNote: Progress percentages have been recalculated based on new quantities.`
      );
    } catch (error) {
      console.error("Error transferring item:", error);
      alert("Failed to transfer item: " + error.message);
    }
  };

  const handleUpdatePriority = async (partNumber, newPriority) => {
    try {
      await apiService.operations.updateItem(partNumber, {
        priority: newPriority,
      });
      await loadData();
    } catch (error) {
      console.error("Error updating priority:", error);
      alert("Failed to update priority: " + error.message);
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

      {/* Transfer Client Modal */}
      {transferModalOpen && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
              <ArrowRightLeft size={20} />
              Transfer Item to Another Client
            </h3>

            <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Item:</p>
              <p className="font-semibold text-gray-800 dark:text-gray-200">
                {selectedItem.name}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Part #: {selectedItem.part_number}
              </p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Current Client:
                </span>
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  {selectedItem.client_name || "None"}
                </span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Total Quantity:
                </span>
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  {selectedItem.quantity}
                </span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Progress:
                </span>
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  {calculateItemProgress(selectedItem)}%
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {/* New Client */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  New Client Name *
                </label>
                <input
                  type="text"
                  placeholder="Enter or select client name"
                  value={newClient}
                  onChange={(e) => setNewClient(e.target.value)}
                  onFocus={() => setShowClientDropdown(clients.length > 0)}
                  autoFocus
                  className="w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-500"
                />

                {showClientDropdown && filteredClients.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                    {filteredClients.map((client, idx) => (
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

              {/* Transfer Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
                  <Package size={16} />
                  Quantity to Transfer *
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedItem.quantity}
                  value={transferQuantity}
                  onChange={(e) =>
                    setTransferQuantity(parseInt(e.target.value) || 1)
                  }
                  className="w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Remaining in original:{" "}
                  {selectedItem.quantity - transferQuantity} units
                </p>
              </div>

              {/* Transfer Remarks */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
                  <FileText size={16} />
                  Transfer Remarks
                </label>
                <textarea
                  placeholder="Enter reason for transfer or additional notes..."
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
                className="flex-1 bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
              >
                Transfer
              </button>
              <button
                onClick={() => {
                  setTransferModalOpen(false);
                  setSelectedItem(null);
                  setNewClient("");
                  setTransferQuantity(1);
                  setTransferRemarks("");
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
                                  className={`px-2 py-1 text-xs rounded transition-colors ${
                                    priority === p
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

                        {/* Item Duration Tracker */}
                        <div className="bg-slate-500/10 dark:bg-slate-500/20 rounded-lg p-3 mb-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                              <Calendar size={16} />
                              Process Duration
                            </span>
                            <div className="flex items-center gap-2">
                              <Clock
                                size={16}
                                className="text-slate-600 dark:text-slate-400"
                              />
                              <span className="text-lg font-mono font-bold text-gray-800 dark:text-gray-200">
                                {formatTime(elapsedSeconds)}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">
                                Start:{" "}
                              </span>
                              <span className="text-gray-800 dark:text-gray-200 font-medium">
                                {formatDateTime(item.start_time)}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">
                                End:{" "}
                              </span>
                              <span className="text-gray-800 dark:text-gray-200 font-medium">
                                {item.end_time
                                  ? formatDateTime(item.end_time)
                                  : "In progress"}
                              </span>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            {!item.start_time ? (
                              <button
                                onClick={() =>
                                  handleStartItem(item.part_number)
                                }
                                className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                              >
                                <Play size={16} />
                                Start Process
                              </button>
                            ) : !item.end_time ? (
                              <button
                                onClick={() => handleStopItem(item.part_number)}
                                className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                                disabled={progress < 100}
                                title={
                                  progress < 100
                                    ? "Complete all tasks to stop"
                                    : "Stop process"
                                }
                              >
                                <StopCircle size={16} />
                                {progress === 100
                                  ? "Stop Process"
                                  : "Complete to Stop"}
                              </button>
                            ) : (
                              <div className="flex-1 flex items-center justify-center gap-2 bg-green-600/80 text-white px-3 py-2 rounded-lg text-sm font-medium">
                                <CheckCircle size={16} />
                                Process Completed
                              </div>
                            )}
                            {item.start_time && (
                              <button
                                onClick={() =>
                                  handleResetItem(item.part_number)
                                }
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

                      {/* Phases */}
                      {expandedItems[item.part_number] && (
                        <div className="px-4 pb-4 space-y-3">
                          {item.phases && item.phases.length > 0 ? (
                            item.phases.map((phase, phaseIndex) => {
                              const phaseKey = phase.id;
                              const isFirstPhase = phaseIndex === 0;

                              return (
                                <div
                                  key={phaseKey}
                                  className="bg-white/5 dark:bg-black/10 rounded-lg border border-gray-300/10 dark:border-gray-700/10"
                                >
                                  {/* Phase Header */}
                                  <div
                                    onClick={() =>
                                      togglePhaseExpansion(phase.id)
                                    }
                                    className="p-3 cursor-pointer hover:bg-white/5 dark:hover:bg-black/10 transition-colors"
                                  >
                                    <div className="flex justify-between items-center">
                                      <div className="flex items-center gap-2">
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
                                  </div>

                                  {/* Sub-Phases */}
                                  {expandedPhases[phase.id] && (
                                    <div className="px-3 pb-3 space-y-2">
                                      {phase.subphases &&
                                      phase.subphases.length > 0 ? (
                                        phase.subphases.map((subPhase) => {
                                          const subPhaseKey = subPhase.id;
                                          return (
                                            <div
                                              key={subPhaseKey}
                                              className="bg-white/5 dark:bg-black/10 p-3 rounded-lg border border-gray-300/10 dark:border-gray-700/10"
                                            >
                                              <div className="flex items-start gap-3">
                                                <input
                                                  type="checkbox"
                                                  checked={
                                                    subPhase.completed == 1
                                                  }
                                                  onChange={() => {
                                                    if (
                                                      subPhase.completed != 1
                                                    ) {
                                                      if (
                                                        window.confirm(
                                                          `Mark "${subPhase.name}" as complete?`
                                                        )
                                                      ) {
                                                        toggleSubPhase(
                                                          item.part_number,
                                                          phase.id,
                                                          subPhase.id,
                                                          subPhase.completed ==
                                                            1
                                                        );
                                                      }
                                                    } else {
                                                      if (
                                                        window.confirm(
                                                          `Mark "${subPhase.name}" as incomplete?`
                                                        )
                                                      ) {
                                                        toggleSubPhase(
                                                          item.part_number,
                                                          phase.id,
                                                          subPhase.id,
                                                          subPhase.completed ==
                                                            1
                                                        );
                                                      }
                                                    }
                                                  }}
                                                  className="mt-1 w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-slate-600 focus:ring-slate-500 cursor-pointer"
                                                />
                                                <div className="flex-1">
                                                  <div className="flex items-start justify-between">
                                                    <p
                                                      className={`text-gray-800 dark:text-gray-200 font-medium ${
                                                        subPhase.completed == 1
                                                          ? "line-through opacity-60"
                                                          : ""
                                                      }`}
                                                    >
                                                      {subPhase.name}
                                                    </p>
                                                    {subPhase.completed ==
                                                      1 && (
                                                      <CheckCircle
                                                        size={18}
                                                        className="text-green-500 shrink-0 ml-2"
                                                      />
                                                    )}
                                                  </div>

                                                  {subPhase.subphase_condition && (
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 italic mt-1">
                                                      📋{" "}
                                                      {
                                                        subPhase.subphase_condition
                                                      }
                                                    </p>
                                                  )}

                                                  <div className="mt-2 flex flex-wrap gap-2 items-center">
                                                    <span className="text-xs bg-blue-500/20 text-blue-700 dark:text-blue-300 px-2 py-1 rounded flex items-center gap-1">
                                                      <Clock size={12} />
                                                      Expected:{" "}
                                                      {
                                                        subPhase.expected_duration
                                                      }
                                                      h
                                                    </span>
                                                    {subPhase.expected_quantity !==
                                                      undefined &&
                                                      subPhase.expected_quantity !==
                                                        null &&
                                                      subPhase.expected_quantity >
                                                        0 && (
                                                        <span className="text-xs bg-purple-500/20 text-purple-700 dark:text-purple-300 px-2 py-1 rounded flex items-center gap-1">
                                                          <Package size={12} />
                                                          Expected Qty:{" "}
                                                          {
                                                            subPhase.expected_quantity
                                                          }
                                                        </span>
                                                      )}
                                                    {subPhase.actual_hours >
                                                      0 && (
                                                      <span
                                                        className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${
                                                          subPhase.actual_hours <=
                                                          subPhase.expected_duration
                                                            ? "bg-green-500/20 text-green-700 dark:text-green-300"
                                                            : "bg-red-500/20 text-red-700 dark:text-red-300"
                                                        }`}
                                                      >
                                                        <Clock size={12} />
                                                        Actual:{" "}
                                                        {subPhase.actual_hours}h
                                                        {subPhase.actual_hours >
                                                          subPhase.expected_duration &&
                                                          " ⚠️"}
                                                      </span>
                                                    )}
                                                  </div>

                                                  {subPhase.employee_barcode && (
                                                    <div className="mt-2 text-xs bg-slate-500/20 text-slate-700 dark:text-slate-300 px-2 py-1 rounded inline-flex items-center gap-1">
                                                      <User size={12} />
                                                      {subPhase.employee_name ||
                                                        "Unknown"}{" "}
                                                      (
                                                      {
                                                        subPhase.employee_barcode
                                                      }
                                                      )
                                                    </div>
                                                  )}

                                                  <div className="mt-3 space-y-2">
                                                    <div className="flex gap-2 items-center">
                                                      <input
                                                        type="number"
                                                        step="0.5"
                                                        placeholder="Actual hours"
                                                        value={
                                                          subPhase.actual_hours ||
                                                          ""
                                                        }
                                                        onChange={(e) =>
                                                          updateActualHours(
                                                            item.part_number,
                                                            phase.id,
                                                            subPhase.id,
                                                            e.target.value
                                                          )
                                                        }
                                                        className="flex-1 px-3 py-1.5 text-sm rounded bg-white/10 dark:bg-black/20 border border-gray-300/20 dark:border-gray-700/20 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-500"
                                                      />
                                                      <button
                                                        onClick={() =>
                                                          handleBarcodeScan(
                                                            item.part_number,
                                                            phase.id,
                                                            subPhase.id
                                                          )
                                                        }
                                                        className="px-3 py-1.5 text-sm bg-slate-600 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded transition-colors flex items-center gap-1"
                                                      >
                                                        <User size={14} />
                                                        Assign
                                                      </button>
                                                    </div>
                                                  </div>

                                                  {subPhase.completed_at && (
                                                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 flex items-center gap-1">
                                                      <CheckCircle size={12} />
                                                      Completed:{" "}
                                                      {new Date(
                                                        subPhase.completed_at
                                                      ).toLocaleString()}
                                                    </p>
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
