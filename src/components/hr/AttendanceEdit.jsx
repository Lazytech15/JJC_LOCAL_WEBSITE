import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { pollingManager } from "../../utils/api/websocket/polling-manager";
import apiService from "../../utils/api/api-service";

function AttendanceEdit() {
  const { user } = useAuth();
  const [unsyncedRecords, setUnsyncedRecords] = useState([]);
  const [deletedRecords, setDeletedRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [lastUpdate, setLastUpdate] = useState(null);

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  // Add Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({});
  const [adding, setAdding] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  // Delete Confirmation State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Batch Edit State
  const [selectedRecords, setSelectedRecords] = useState(new Set());
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchForm, setBatchForm] = useState({});
  const [batchProcessing, setBatchProcessing] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    employee_uid: "",
    date: "",
    clock_type: "",
    limit: 100,
  });

  // Statistics
  const [stats, setStats] = useState({
    total_unsynced: 0,
    total_deleted: 0,
    by_employee: {},
    by_clock_type: {},
  });

  const [isLogout, setIsLogout] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  useEffect(() => {
  // Initialize polling manager
  if (!pollingManager.isPolling) {
    pollingManager.initialize();
    pollingManager.joinAllRooms();
  }

  fetchUnsyncedRecords();
  setConnectionStatus("connecting");

  // ✨ CRITICAL FIX: Subscribe to ALL relevant events
  
  // 1. New attendance created (including logout records)
  const unsubscribeCreated = pollingManager.subscribeToUpdates(
    "attendance_created",
    (data) => {
      console.log("[AttendanceEdit] attendance_created event:", data);
      setConnectionStatus("connected");
      setLastUpdate(new Date());
      // ✨ ALWAYS refresh, regardless of is_synced status
      fetchUnsyncedRecords();
    }
  );

  // 2. Attendance record updated
  const unsubscribeUpdated = pollingManager.subscribeToUpdates(
    "attendance_updated",
    (data) => {
      console.log("[AttendanceEdit] attendance_updated event:", data);
      setConnectionStatus("connected");
      setLastUpdate(new Date());
      fetchUnsyncedRecords();
    }
  );

  // 3. Attendance record deleted
  const unsubscribeDeleted = pollingManager.subscribeToUpdates(
    "attendance_deleted",
    (data) => {
      console.log("[AttendanceEdit] attendance_deleted event:", data);
      setConnectionStatus("connected");
      setLastUpdate(new Date());
      fetchUnsyncedRecords();
    }
  );

  // 4. Edit-specific events (created, edited, deleted)
  const unsubscribeEditCreated = pollingManager.subscribeToUpdates(
    "attendance_edit_created",
    (data) => {
      console.log("[AttendanceEdit] attendance_edit_created event:", data);
      setConnectionStatus("connected");
      setLastUpdate(new Date());
      fetchUnsyncedRecords();
    }
  );

  // 5. ✨ NEW: Listen to daily summary updates
  const unsubscribeSummaryUpdated = pollingManager.subscribeToUpdates(
    "daily_summary_updated",
    (data) => {
      console.log("[AttendanceEdit] daily_summary_updated event:", data);
      setConnectionStatus("connected");
      setLastUpdate(new Date());
      // Refresh if summary affects unsynced records
      fetchUnsyncedRecords();
    }
  );

  // 6. Connection status monitoring
  const unsubscribeConnection = pollingManager.subscribeToUpdates(
    "connection",
    (data) => {
      console.log("[AttendanceEdit] Connection status:", data.status);
      setConnectionStatus(data.status);
    }
  );

  // Cleanup all subscriptions
  return () => {
    unsubscribeCreated();
    unsubscribeUpdated();
    unsubscribeDeleted();
    unsubscribeEditCreated();
    unsubscribeSummaryUpdated(); // ✨ NEW cleanup
    unsubscribeConnection();
    setConnectionStatus("disconnected");
  };
}, []);

  const fetchUnsyncedRecords = async () => {
    try {
      setLoading(true);
      const result = await apiService.editAttendance.getUnsyncedRecords(
        filters.limit
      );

      if (result.success) {
        const edited = result.data.edited || [];
        const deleted = result.data.deleted || [];

        // Apply filters
        let filteredRecords = edited;
        if (filters.employee_uid) {
          filteredRecords = filteredRecords.filter(
            (r) => r.employee_uid === filters.employee_uid
          );
        }
        if (filters.date) {
          filteredRecords = filteredRecords.filter(
            (r) => r.date === filters.date
          );
        }
        if (filters.clock_type) {
          filteredRecords = filteredRecords.filter(
            (r) => r.clock_type === filters.clock_type
          );
        }

        setUnsyncedRecords(filteredRecords);
        setDeletedRecords(deleted);
        calculateStats(filteredRecords);
        setError(null);
      } else {
        throw new Error(result.error || "Failed to fetch unsynced records");
      }
    } catch (err) {
      setError(err.message);
      console.error("Error fetching unsynced records:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      setLoadingEmployees(true);
      const result = await apiService.employees.getEmployees({ limit: 1000 });
      console.log("Full API result:", result);
      console.log("Employees array:", result.employees);
      console.log("Departments array:", result.departments);

      if (result.success) {
        setEmployees(result.employees || []);
      }
    } catch (err) {
      console.error("Error fetching employees:", err);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const calculateStats = (records) => {
    const newStats = {
      total_unsynced: records.length,
      total_deleted: deletedRecords.length,
      by_employee: {},
      by_clock_type: {},
    };

    records.forEach((record) => {
      // By employee
      const empKey = record.employee_uid;
      newStats.by_employee[empKey] = (newStats.by_employee[empKey] || 0) + 1;

      // By clock type
      const typeKey = record.clock_type;
      newStats.by_clock_type[typeKey] =
        (newStats.by_clock_type[typeKey] || 0) + 1;
    });

    setStats(newStats);
  };

  const openAddModal = () => {
    fetchEmployees();
    setAddForm({
      employee_uid: "",
      clock_type: "morning_in",
      clock_time: "",
      date: new Date().toISOString().split("T")[0],
      regular_hours: 0,
      overtime_hours: 0,
      is_late: false,
      notes: "",
    });
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setAddForm({});
  };

  const handleAddSubmit = async (e) => {
  e.preventDefault();
  setAdding(true);

  try {
    // Validate required fields
    if (
      !addForm.employee_uid ||
      !addForm.clock_type ||
      !addForm.clock_time ||
      !addForm.date
    ) {
      throw new Error("Please fill in all required fields");
    }

    // Combine date and time
    const clockTime = `${addForm.date} ${addForm.clock_time}:00`;

    const newRecord = {
      employee_uid: addForm.employee_uid,
      clock_type: addForm.clock_type,
      clock_time: clockTime,
      date: addForm.date,
      regular_hours: parseFloat(addForm.regular_hours) || 0,
      overtime_hours: parseFloat(addForm.overtime_hours) || 0,
      is_late: addForm.is_late || false,
      notes: addForm.notes || "",
    };

    const result = await apiService.editAttendance.addAttendanceRecord(
      newRecord
    );

    if (result.success) {
      closeAddModal();
      
      // ✨ CRITICAL: Immediate UI refresh BEFORE showing success message
      await fetchUnsyncedRecords();
      
      // ✨ Use toast instead of blocking alert
      showToast("✅ Attendance record added successfully!", "success");
    } else {
      throw new Error(result.error || "Failed to add record");
    }
  } catch (err) {
    showToast(`❌ Error: ${err.message}`, "error");
  } finally {
    setAdding(false);
  }
};

  const openEditModal = (record) => {
    setEditingRecord(record);
    setEditForm({
      clock_type: record.clock_type,
      clock_time: record.clock_time?.split(" ")[1]?.substring(0, 5) || "",
      date: record.date,
      regular_hours: record.regular_hours || 0,
      overtime_hours: record.overtime_hours || 0,
      is_late: record.is_late ? true : false,
      notes: record.notes || "",
    });
    setIsLogout(false); // Reset logout checkbox
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingRecord(null);
    setEditForm({});
  };

  const handleEditSubmit = async (e) => {
  e.preventDefault();
  setSaving(true);

  try {
    const clockTime = `${editForm.date} ${editForm.clock_time}:00`;

    if (isLogout) {
      // Create a new logout record
      const logoutType = editingRecord.clock_type.replace('_in', '_out');

      const newRecord = {
        employee_uid: editingRecord.employee_uid,
        clock_type: logoutType,
        clock_time: clockTime,
        date: editForm.date,
        regular_hours: parseFloat(editForm.regular_hours) || 0,
        overtime_hours: parseFloat(editForm.overtime_hours) || 0,
        is_late: editForm.is_late,
        notes: editForm.notes || `Logout created from ${editingRecord.clock_type}`,
      };

      const result = await apiService.editAttendance.addAttendanceRecord(newRecord);

      if (result.success) {
        closeEditModal();
        
        // ✨ CRITICAL: Immediate UI refresh
        await fetchUnsyncedRecords();
        
        // ✨ Non-blocking success notification
        showToast(`✅ Logout record created for ${formatClockType(logoutType)}`, 'success');
      } else {
        throw new Error(result.error || "Failed to create logout record");
      }
    } else {
      // Normal update flow (existing code)
      const updateData = {
        clock_type: editForm.clock_type,
        clock_time: clockTime,
        date: editForm.date,
        regular_hours: parseFloat(editForm.regular_hours),
        overtime_hours: parseFloat(editForm.overtime_hours),
        is_late: editForm.is_late,
        notes: editForm.notes,
      };

      const result = await apiService.editAttendance.editAttendanceRecord(
        editingRecord.id,
        updateData
      );

      if (result.success) {
        closeEditModal();
        
        // ✨ CRITICAL: Immediate UI refresh
        await fetchUnsyncedRecords();
        
        // ✨ Non-blocking success notification
        showToast('✅ Record updated successfully', 'success');
      } else {
        throw new Error(result.error || "Failed to update record");
      }
    }
  } catch (err) {
    showToast(`❌ Error: ${err.message}`, 'error');
  } finally {
    setSaving(false);
  }
};

  const openDeleteModal = (record) => {
    setDeletingRecord(record);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setDeletingRecord(null);
  };

  const handleDelete = async () => {
    setDeleting(true);

    try {
      const result = await apiService.editAttendance.deleteAttendanceRecord(
        deletingRecord.id
      );

      if (result.success) {
        closeDeleteModal();
        fetchUnsyncedRecords();
        alert("Record deleted successfully!");
      } else {
        throw new Error(result.error || "Failed to delete record");
      }
    } catch (err) {
      alert("Error deleting record: " + err.message);
    } finally {
      setDeleting(false);
    }
  };

  const toggleRecordSelection = (recordId) => {
    const newSelected = new Set(selectedRecords);
    if (newSelected.has(recordId)) {
      newSelected.delete(recordId);
    } else {
      newSelected.add(recordId);
    }
    setSelectedRecords(newSelected);
  };

  const selectAllRecords = () => {
    if (selectedRecords.size === unsyncedRecords.length) {
      setSelectedRecords(new Set());
    } else {
      setSelectedRecords(new Set(unsyncedRecords.map((r) => r.id)));
    }
  };

  const openBatchModal = () => {
    if (selectedRecords.size === 0) {
      alert("Please select at least one record");
      return;
    }
    setBatchForm({});
    setShowBatchModal(true);
  };

  const closeBatchModal = () => {
    setShowBatchModal(false);
    setBatchForm({});
  };

  const handleBatchSubmit = async (e) => {
    e.preventDefault();
    setBatchProcessing(true);

    try {
      const records = Array.from(selectedRecords).map((id) => {
        const update = { id };
        if (batchForm.clock_type) update.clock_type = batchForm.clock_type;
        if (batchForm.is_late !== undefined) update.is_late = batchForm.is_late;
        if (batchForm.notes) update.notes = batchForm.notes;
        if (batchForm.regular_hours)
          update.regular_hours = parseFloat(batchForm.regular_hours);
        if (batchForm.overtime_hours)
          update.overtime_hours = parseFloat(batchForm.overtime_hours);
        return update;
      });

      const result = await apiService.editAttendance.batchEditRecords(records);

      if (result.success) {
        closeBatchModal();
        setSelectedRecords(new Set());
        fetchUnsyncedRecords();
        alert(
          `Batch edit completed: ${result.success_count} successful, ${result.fail_count} failed`
        );
      } else {
        throw new Error(result.error || "Failed to batch edit records");
      }
    } catch (err) {
      alert("Error in batch edit: " + err.message);
    } finally {
      setBatchProcessing(false);
    }
  };

  const formatClockType = (clockType) => {
    const types = {
      morning_in: "Morning In",
      morning_out: "Morning Out",
      afternoon_in: "Afternoon In",
      afternoon_out: "Afternoon Out",
      evening_in: "Evening In",
      evening_out: "Evening Out",
      overtime_in: "Overtime In",
      overtime_out: "Overtime Out",
    };
    return types[clockType] || clockType;
  };

  const formatTime = (timeString) => {
    if (!timeString) return "-";
    try {
      const time = new Date(timeString);
      return time.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return timeString;
    }
  };

  const formatEmployeeName = (record) => {
    const parts = [
      record.last_name,
      record.first_name,
      record.middle_name,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : "Unknown Employee";
  };

  const getClockTypeColor = (clockType) => {
    const colors = {
      morning_in: "bg-emerald-50 text-emerald-700 border-emerald-200",
      morning_out: "bg-sky-50 text-sky-700 border-sky-200",
      afternoon_in: "bg-amber-50 text-amber-700 border-amber-200",
      afternoon_out: "bg-violet-50 text-violet-700 border-violet-200",
      evening_in: "bg-orange-50 text-orange-700 border-orange-200",
      evening_out: "bg-rose-50 text-rose-700 border-rose-200",
      overtime_in: "bg-orange-50 text-orange-700 border-orange-200",
      overtime_out: "bg-rose-50 text-rose-700 border-rose-200",
    };
    return colors[clockType] || "bg-gray-50 text-gray-700 border-gray-200";
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Attendance Editor
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg mt-2">
            Add, edit, delete, and manage attendance records
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Connection Status */}
          <div className="flex items-center gap-3 px-4 py-2 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl border border-white/30 dark:border-gray-700/30">
            <div
              className={`w-3 h-3 rounded-full ${connectionStatus === "connected"
                ? "bg-emerald-500 shadow-lg shadow-emerald-500/50"
                : connectionStatus === "connecting"
                  ? "bg-amber-500 animate-pulse shadow-lg shadow-amber-500/50"
                  : "bg-red-500 shadow-lg shadow-red-500/50"
                }`}
            ></div>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {connectionStatus === "connected"
                ? "Live Updates"
                : connectionStatus === "connecting"
                  ? "Connecting..."
                  : "Disconnected"}
            </span>
            {lastUpdate && (
              <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
                {lastUpdate.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 rounded-3xl p-6 border border-amber-200/40 dark:border-amber-800/40">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-2xl">
              <span className="text-2xl">⚠️</span>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-amber-700 dark:text-amber-300">
                {stats.total_unsynced}
              </p>
              <p className="text-amber-600 dark:text-amber-400 text-sm font-medium">
                Unsynced Records
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-3xl p-6 border border-red-200/40 dark:border-red-800/40">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-2xl">
              <span className="text-2xl">🗑️</span>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-red-700 dark:text-red-300">
                {stats.total_deleted}
              </p>
              <p className="text-red-600 dark:text-red-400 text-sm font-medium">
                Deleted Records
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-3xl p-6 border border-blue-200/40 dark:border-blue-800/40">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-2xl">
              <span className="text-2xl">👥</span>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                {Object.keys(stats.by_employee).length}
              </p>
              <p className="text-blue-600 dark:text-blue-400 text-sm font-medium">
                Affected Employees
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-3xl p-6 border border-purple-200/40 dark:border-purple-800/40">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-2xl">
              <span className="text-2xl">✅</span>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-purple-700 dark:text-purple-300">
                {selectedRecords.size}
              </p>
              <p className="text-purple-600 dark:text-purple-400 text-sm font-medium">
                Selected
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-3xl p-8 border border-white/40 dark:border-gray-700/40 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <span className="text-xl">🔍</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
              Filters & Actions
            </h2>
          </div>
          <div className="flex gap-3">
            <button
              onClick={openAddModal}
              className="px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-semibold transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl"
            >
              ➕ Add Record
            </button>
            <button
              onClick={openBatchModal}
              disabled={selectedRecords.size === 0}
              className="px-5 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-slate-400 disabled:to-slate-500 text-white rounded-xl font-semibold transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl disabled:hover:translate-y-0 disabled:cursor-not-allowed"
            >
              Batch Edit ({selectedRecords.size})
            </button>
            <button
              onClick={fetchUnsyncedRecords}
              className="px-5 py-3 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white rounded-xl font-semibold transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
              Date
            </label>
            <input
              type="date"
              value={filters.date}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, date: e.target.value }))
              }
              className="w-full px-4 py-3 bg-white/60 dark:bg-gray-700/60 rounded-xl border border-white/40 dark:border-gray-600/40 text-slate-800 dark:text-slate-200 backdrop-blur-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
              Clock Type
            </label>
            <select
              value={filters.clock_type}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, clock_type: e.target.value }))
              }
              className="w-full px-4 py-3 bg-white/60 dark:bg-gray-700/60 rounded-xl border border-white/40 dark:border-gray-600/40 text-slate-800 dark:text-slate-200 backdrop-blur-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            >
              <option value="">All Types</option>
              <option value="morning_in">Morning In</option>
              <option value="morning_out">Morning Out</option>
              <option value="afternoon_in">Afternoon In</option>
              <option value="afternoon_out">Afternoon Out</option>
              <option value="evening_in">Evening In</option>
              <option value="evening_out">Evening Out</option>
              <option value="overtime_in">Overtime In</option>
              <option value="overtime_out">Overtime Out</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
              Records Limit
            </label>
            <select
              value={filters.limit}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  limit: parseInt(e.target.value),
                }))
              }
              className="w-full px-4 py-3 bg-white/60 dark:bg-gray-700/60 rounded-xl border border-white/40 dark:border-gray-600/40 text-slate-800 dark:text-slate-200 backdrop-blur-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            >
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="200">200</option>
              <option value="500">500</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && unsyncedRecords.length === 0 && (
        <div className="text-center py-16">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-200 dark:border-slate-700 mx-auto"></div>
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-transparent border-t-indigo-600 dark:border-t-indigo-400 absolute top-0 left-1/2 transform -translate-x-1/2"></div>
          </div>
          <p className="text-slate-600 dark:text-slate-400 mt-6 text-lg">
            Loading unsynced records...
          </p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 backdrop-blur-sm border border-red-200 dark:border-red-800/50 rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">❌</span>
            <div>
              <h3 className="text-red-800 dark:text-red-300 font-semibold">
                Error Loading Data
              </h3>
              <p className="text-red-600 dark:text-red-400 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Records Table */}
      {!loading && unsyncedRecords.length > 0 && (
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-3xl border border-white/40 dark:border-gray-700/40 shadow-2xl overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                Unsynced Records
              </h2>
              <button
                onClick={selectAllRecords}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                {selectedRecords.size === unsyncedRecords.length
                  ? "Deselect All"
                  : "Select All"}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th className="text-left p-4 font-semibold text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={
                        selectedRecords.size === unsyncedRecords.length &&
                        unsyncedRecords.length > 0
                      }
                      onChange={selectAllRecords}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                  </th>
                  <th className="text-left p-4 font-semibold text-slate-700 dark:text-slate-300">
                    Employee
                  </th>
                  <th className="text-left p-4 font-semibold text-slate-700 dark:text-slate-300">
                    Date
                  </th>
                  <th className="text-left p-4 font-semibold text-slate-700 dark:text-slate-300">
                    Clock Type
                  </th>
                  <th className="text-left p-4 font-semibold text-slate-700 dark:text-slate-300">
                    Clock Time
                  </th>
                  <th className="text-left p-4 font-semibold text-slate-700 dark:text-slate-300">
                    Hours
                  </th>
                  <th className="text-left p-4 font-semibold text-slate-700 dark:text-slate-300">
                    Status
                  </th>
                  <th className="text-left p-4 font-semibold text-slate-700 dark:text-slate-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {unsyncedRecords.map((record) => (
                  <tr
                    key={record.id}
                    className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={selectedRecords.has(record.id)}
                        onChange={() => toggleRecordSelection(record.id)}
                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                      />
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        {formatEmployeeName(record)}
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        {record.department || "N/A"}
                      </div>
                    </td>
                    <td className="p-4 text-slate-700 dark:text-slate-300">
                      {record.date}
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full border ${getClockTypeColor(
                          record.clock_type
                        )}`}
                      >
                        {formatClockType(record.clock_type)}
                      </span>
                    </td>
                    <td className="p-4 text-slate-700 dark:text-slate-300">
                      {formatTime(record.clock_time)}
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-slate-700 dark:text-slate-300">
                        <div>Reg: {record.regular_hours || 0}h</div>
                        <div>OT: {record.overtime_hours || 0}h</div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        {record.is_late && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-50 text-red-700 border border-red-200">
                            ⏰ Late
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          🔄 Unsynced
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(record)}
                          className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => openDeleteModal(record)}
                          className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && unsyncedRecords.length === 0 && (
        <div className="text-center py-16 bg-white/40 dark:bg-gray-800/40 backdrop-blur-xl rounded-3xl border border-white/40 dark:border-gray-700/40">
          <div className="text-6xl mb-4">✅</div>
          <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">
            All Records Synced
          </h3>
          <p className="text-slate-500 dark:text-slate-400">
            There are no unsynced attendance records at the moment.
          </p>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-emerald-600 to-teal-600 p-6 rounded-t-3xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    Add Attendance Record
                  </h2>
                  <p className="text-emerald-100 mt-1">
                    Create a new attendance entry
                  </p>
                </div>
                <button
                  onClick={closeAddModal}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-colors"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <form onSubmit={handleAddSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Employee <span className="text-red-500">*</span>
                  </label>
                  {loadingEmployees ? (
                    <div className="flex items-center justify-center py-3">
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-emerald-600 border-t-transparent"></div>
                    </div>
                  ) : (
                    <select
                      value={addForm.employee_uid}
                      onChange={(e) =>
                        setAddForm((prev) => ({
                          ...prev,
                          employee_uid: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                      required
                    >
                      <option value="">Select an employee</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.fullName} - {emp.department || "N/A"}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Clock Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={addForm.clock_type}
                    onChange={(e) =>
                      setAddForm((prev) => ({
                        ...prev,
                        clock_type: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    required
                  >
                    <option value="morning_in">Morning In</option>
                    <option value="morning_out">Morning Out</option>
                    <option value="afternoon_in">Afternoon In</option>
                    <option value="afternoon_out">Afternoon Out</option>
                    <option value="evening_in">Evening In</option>
                    <option value="evening_out">Evening Out</option>
                    <option value="overtime_in">Overtime In</option>
                    <option value="overtime_out">Overtime Out</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={addForm.date}
                    onChange={(e) =>
                      setAddForm((prev) => ({ ...prev, date: e.target.value }))
                    }
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Clock Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={addForm.clock_time}
                    onChange={(e) =>
                      setAddForm((prev) => ({
                        ...prev,
                        clock_time: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Regular Hours
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={addForm.regular_hours}
                    onChange={(e) =>
                      setAddForm((prev) => ({
                        ...prev,
                        regular_hours: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Overtime Hours
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={addForm.overtime_hours}
                    onChange={(e) =>
                      setAddForm((prev) => ({
                        ...prev,
                        overtime_hours: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={addForm.is_late}
                      onChange={(e) =>
                        setAddForm((prev) => ({
                          ...prev,
                          is_late: e.target.checked,
                        }))
                      }
                      className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Mark as Late
                    </span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Notes
                </label>
                <textarea
                  value={addForm.notes}
                  onChange={(e) =>
                    setAddForm((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all resize-none"
                  placeholder="Add any notes or comments..."
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={closeAddModal}
                  className="px-6 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-xl font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adding}
                  className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:from-slate-400 disabled:to-slate-500 text-white rounded-xl font-semibold transition-all disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {adding ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Adding...</span>
                    </>
                  ) : (
                    <span>Add Record</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingRecord && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-t-3xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    Edit Attendance Record
                  </h2>
                  <p className="text-blue-100 mt-1">
                    {formatEmployeeName(editingRecord)} - {editingRecord.date}
                  </p>
                </div>
                <button
                  onClick={closeEditModal}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-colors"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-6">
              {/* Logout Checkbox - NEW */}
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-2 border-emerald-200 dark:border-emerald-800/30 rounded-xl p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isLogout}
                    onChange={(e) => setIsLogout(e.target.checked)}
                    className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500 mt-0.5"
                  />
                  <div>
                    <span className="text-sm font-bold text-emerald-800 dark:text-emerald-300 block">
                      📤 Create Logout Record
                    </span>
                    <span className="text-xs text-emerald-700 dark:text-emerald-400">
                      Check this to create a new logout record instead of updating this entry.
                      {editingRecord.clock_type.includes('_in') && (
                        <span className="block mt-1 font-medium">
                          Will create: {formatClockType(editingRecord.clock_type.replace('_in', '_out'))}
                        </span>
                      )}
                    </span>
                  </div>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Clock Type
                  </label>
                  <select
                    value={editForm.clock_type}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        clock_type: e.target.value,
                      }))
                    }
                    disabled={isLogout}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    required
                  >
                    <option value="morning_in">Morning In</option>
                    <option value="morning_out">Morning Out</option>
                    <option value="afternoon_in">Afternoon In</option>
                    <option value="afternoon_out">Afternoon Out</option>
                    <option value="evening_in">Evening In</option>
                    <option value="evening_out">Evening Out</option>
                    <option value="overtime_in">Overtime In</option>
                    <option value="overtime_out">Overtime Out</option>
                  </select>
                  {isLogout && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Logout type will be auto-set based on clock-in type
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={editForm.date}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, date: e.target.value }))
                    }
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Clock Time
                  </label>
                  <input
                    type="time"
                    value={editForm.clock_time}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        clock_time: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Regular Hours
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={editForm.regular_hours}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        regular_hours: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Overtime Hours
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={editForm.overtime_hours}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        overtime_hours: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.is_late}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          is_late: e.target.checked,
                        }))
                      }
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Mark as Late
                    </span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Notes
                </label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                  placeholder="Add any notes or comments..."
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="px-6 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-xl font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className={`px-6 py-3 ${isLogout
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                    } disabled:from-slate-400 disabled:to-slate-500 text-white rounded-xl font-semibold transition-all disabled:cursor-not-allowed flex items-center gap-2`}
                >
                  {saving ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>{isLogout ? 'Creating Logout...' : 'Saving...'}</span>
                    </>
                  ) : (
                    <span>{isLogout ? '📤 Create Logout Record' : '💾 Save Changes'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingRecord && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-2xl">
                  <span className="text-3xl">🗑️</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">
                    Delete Record?
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 mt-1">
                    This action cannot be undone
                  </p>
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-4 mb-6">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">
                      Employee:
                    </span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {formatEmployeeName(deletingRecord)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">
                      Date:
                    </span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {deletingRecord.date}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">
                      Type:
                    </span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {formatClockType(deletingRecord.clock_type)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">
                      Time:
                    </span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {formatTime(deletingRecord.clock_time)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={closeDeleteModal}
                  className="px-6 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-xl font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-slate-400 disabled:to-slate-500 text-white rounded-xl font-semibold transition-all disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {deleting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <span>Delete Record</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Batch Edit Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-indigo-600 p-6 rounded-t-3xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    Batch Edit Records
                  </h2>
                  <p className="text-purple-100 mt-1">
                    Editing {selectedRecords.size} record
                    {selectedRecords.size !== 1 ? "s" : ""}
                  </p>
                </div>
                <button
                  onClick={closeBatchModal}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-colors"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <form onSubmit={handleBatchSubmit} className="p-6 space-y-6">
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                      Only fill in the fields you want to update. Empty fields
                      will be ignored.
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Clock Type (Optional)
                  </label>
                  <select
                    value={batchForm.clock_type || ""}
                    onChange={(e) =>
                      setBatchForm((prev) => ({
                        ...prev,
                        clock_type: e.target.value || undefined,
                      }))
                    }
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  >
                    <option value="">Don't change</option>
                    <option value="morning_in">Morning In</option>
                    <option value="morning_out">Morning Out</option>
                    <option value="afternoon_in">Afternoon In</option>
                    <option value="afternoon_out">Afternoon Out</option>
                    <option value="evening_in">Evening In</option>
                    <option value="evening_out">Evening Out</option>
                    <option value="overtime_in">Overtime In</option>
                    <option value="overtime_out">Overtime Out</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Regular Hours (Optional)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={batchForm.regular_hours || ""}
                    onChange={(e) =>
                      setBatchForm((prev) => ({
                        ...prev,
                        regular_hours: e.target.value || undefined,
                      }))
                    }
                    placeholder="Leave empty to skip"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Overtime Hours (Optional)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={batchForm.overtime_hours || ""}
                    onChange={(e) =>
                      setBatchForm((prev) => ({
                        ...prev,
                        overtime_hours: e.target.value || undefined,
                      }))
                    }
                    placeholder="Leave empty to skip"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Late Status (Optional)
                  </label>
                  <select
                    value={
                      batchForm.is_late !== undefined
                        ? String(batchForm.is_late)
                        : ""
                    }
                    onChange={(e) =>
                      setBatchForm((prev) => ({
                        ...prev,
                        is_late:
                          e.target.value === ""
                            ? undefined
                            : e.target.value === "true",
                      }))
                    }
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  >
                    <option value="">Don't change</option>
                    <option value="true">Mark as Late</option>
                    <option value="false">Mark as On Time</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={batchForm.notes || ""}
                  onChange={(e) =>
                    setBatchForm((prev) => ({
                      ...prev,
                      notes: e.target.value || undefined,
                    }))
                  }
                  rows={3}
                  placeholder="Add notes to all selected records..."
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={closeBatchModal}
                  className="px-6 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-xl font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={batchProcessing}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-slate-400 disabled:to-slate-500 text-white rounded-xl font-semibold transition-all disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {batchProcessing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <span>Apply to {selectedRecords.size} Records</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {toast.show && (
        <div className={`fixed top-4 right-4 z-[60] animate-slide-in-right ${toast.type === 'success'
            ? 'bg-emerald-500'
            : toast.type === 'error'
              ? 'bg-red-500'
              : 'bg-amber-500'
          } text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3`}>
          <span className="text-lg">
            {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : '⚠️'}
          </span>
          <span className="font-medium">{toast.message}</span>
        </div>
      )}
    </div>
  );
}

export default AttendanceEdit;
