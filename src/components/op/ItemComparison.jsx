import { useState, useEffect } from 'react';
import { Search, X, Plus, TrendingUp, TrendingDown, Minus, ArrowRight, Calendar, Clock, Users, Package, AlertCircle, Trash2 } from 'lucide-react';

function ItemComparison({ items, isDarkMode, apiService, formatTime, calculateItemProgress, onItemDeleted }) {
  const [selectedItems, setSelectedItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredItems, setFilteredItems] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [detailedItems, setDetailedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { partNumber, name }
  const [deleting, setDeleting] = useState(false);

  // Filter items based on search
  useEffect(() => {
    if (searchTerm.trim().length >= 2) {
      const filtered = items.filter(item =>
        !selectedItems.some(selected => selected.part_number === item.part_number) &&
        (item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.part_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.client_name?.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredItems(filtered);
      setShowDropdown(filtered.length > 0);
    } else {
      setFilteredItems([]);
      setShowDropdown(false);
    }
  }, [searchTerm, items, selectedItems]);

  // Load detailed item data when items are selected
  useEffect(() => {
    const loadDetailedData = async () => {
      if (selectedItems.length === 0) {
        setDetailedItems([]);
        return;
      }

      setLoading(true);
      try {
        const detailed = await Promise.all(
          selectedItems.map(item => apiService.operations.getItem(item.part_number))
        );
        setDetailedItems(detailed);
      } catch (error) {
        console.error('Error loading detailed items:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDetailedData();
  }, [selectedItems]);

  const addItemToCompare = (item) => {
    if (selectedItems.length < 4) {
      setSelectedItems([...selectedItems, item]);
      setSearchTerm('');
      setShowDropdown(false);
    }
  };

  const removeItemFromCompare = (partNumber) => {
    setSelectedItems(selectedItems.filter(item => item.part_number !== partNumber));
  };

  const clearAll = () => {
    setSelectedItems([]);
    setDetailedItems([]);
  };

  const handleDeleteItem = async (partNumber, itemName) => {
    setDeleteConfirm({ partNumber, name: itemName });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;

    setDeleting(true);
    try {
      await apiService.operations.deleteItem(deleteConfirm.partNumber);

      // Remove from selected items
      setSelectedItems(prev => prev.filter(item => item.part_number !== deleteConfirm.partNumber));
      setDetailedItems(prev => prev.filter(item => item.part_number !== deleteConfirm.partNumber));

      // Notify parent to refresh data
      if (onItemDeleted) {
        onItemDeleted();
      }

      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item: ' + error.message);
    } finally {
      setDeleting(false);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirm(null);
  };

  // Calculate metrics for an item
  const calculateMetrics = (item) => {
    const totalPhases = item.phases?.length || 0;
    const totalSubphases = item.phases?.reduce((sum, phase) => sum + (phase.subphases?.length || 0), 0) || 0;
    const completedSubphases = item.phases?.reduce((sum, phase) =>
      sum + (phase.subphases?.filter(sub => sub.completed == 1).length || 0), 0) || 0;

    const totalExpectedHours = item.phases?.reduce((sum, phase) =>
      sum + (phase.subphases?.reduce((subSum, sub) => subSum + (parseFloat(sub.expected_duration) || 0), 0) || 0), 0) || 0;

    const totalActualHours = item.phases?.reduce((sum, phase) =>
      sum + (phase.subphases?.reduce((subSum, sub) => subSum + (parseFloat(sub.actual_hours) || 0), 0) || 0), 0) || 0;

    const totalExpectedQty = item.phases?.reduce((sum, phase) =>
      sum + (phase.subphases?.reduce((subSum, sub) => subSum + (parseInt(sub.expected_quantity) || 0), 0) || 0), 0) || 0;

    const totalCompletedQty = item.phases?.reduce((sum, phase) =>
      sum + (phase.subphases?.reduce((subSum, sub) => subSum + (parseInt(sub.current_completed_quantity) || 0), 0) || 0), 0) || 0;

    const efficiency = totalExpectedHours > 0 ? ((totalExpectedHours / (totalActualHours || 1)) * 100) : 0;
    const completionRate = totalSubphases > 0 ? ((completedSubphases / totalSubphases) * 100) : 0;
    const qtyCompletionRate = totalExpectedQty > 0 ? ((totalCompletedQty / totalExpectedQty) * 100) : 0;

    // Calculate average time per subphase
    const avgTimePerSubphase = completedSubphases > 0 ? (totalActualHours / completedSubphases) : 0;

    // Calculate phase completion times
    const phaseCompletionTimes = item.phases?.map(phase => {
      if (phase.start_time && phase.end_time) {
        const start = new Date(phase.start_time);
        const end = new Date(phase.end_time);
        const durationSeconds = Math.floor((end - start) / 1000) - (phase.paused_duration || 0);
        return durationSeconds;
      }
      return 0;
    }).filter(time => time > 0) || [];

    const avgPhaseTime = phaseCompletionTimes.length > 0
      ? phaseCompletionTimes.reduce((sum, time) => sum + time, 0) / phaseCompletionTimes.length
      : 0;

    // Count unique employees
    const uniqueEmployees = new Set();
    item.phases?.forEach(phase => {
      phase.subphases?.forEach(sub => {
        if (sub.employee_uid) uniqueEmployees.add(sub.employee_uid);
      });
    });

    return {
      totalPhases,
      totalSubphases,
      completedSubphases,
      totalExpectedHours,
      totalActualHours,
      totalExpectedQty,
      totalCompletedQty,
      efficiency: Math.round(efficiency),
      completionRate: Math.round(completionRate),
      qtyCompletionRate: Math.round(qtyCompletionRate),
      avgTimePerSubphase,
      avgPhaseTime,
      employeeCount: uniqueEmployees.size,
      status: item.status,
      progress: calculateItemProgress(item)
    };
  };

  // Compare two values and show trend
  const compareValues = (current, previous, higherIsBetter = true) => {
    if (!previous) return { trend: 'neutral', diff: 0, percentage: 0 };

    const diff = current - previous;
    const percentage = previous > 0 ? Math.round((diff / previous) * 100) : 0;

    let trend = 'neutral';
    if (diff > 0) trend = higherIsBetter ? 'up' : 'down';
    if (diff < 0) trend = higherIsBetter ? 'down' : 'up';

    return { trend, diff, percentage };
  };

  const getTrendIcon = (trend) => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (trend === 'down') return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const getTrendColor = (trend) => {
    if (trend === 'up') return isDarkMode ? 'text-green-400' : 'text-green-600';
    if (trend === 'down') return isDarkMode ? 'text-red-400' : 'text-red-600';
    return isDarkMode ? 'text-gray-400' : 'text-gray-600';
  };

  const cardClass = isDarkMode
    ? "bg-gray-800/60 border-gray-700/50"
    : "bg-white/80 border-gray-300/30";

  const textPrimaryClass = isDarkMode ? "text-gray-100" : "text-gray-800";
  const textSecondaryClass = isDarkMode ? "text-gray-300" : "text-gray-600";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className={`text-2xl font-bold ${textPrimaryClass}`}>
            📊 Item Performance Comparison
          </h2>
          <p className={`text-sm mt-1 ${textSecondaryClass}`}>
            Compare up to 4 items side-by-side
          </p>
        </div>
        {selectedItems.length > 0 && (
          <button
            onClick={clearAll}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${isDarkMode
                ? "bg-red-500/20 hover:bg-red-500/30 text-red-400"
                : "bg-red-500/10 hover:bg-red-500/20 text-red-600"
              }`}
          >
            <X className="w-4 h-4" />
            Clear All
          </button>
        )}
      </div>

      {/* Search Box */}
      <div className={`backdrop-blur-md rounded-xl p-6 border ${cardClass}`}>
        <div className="relative">
          <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${textSecondaryClass}`} />
          <input
            type="text"
            placeholder="Search items to compare (by name, part number, or client)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={selectedItems.length >= 4}
            className={`w-full pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${isDarkMode
                ? "bg-gray-700/50 border border-gray-600/50 text-gray-100 placeholder-gray-400"
                : "bg-white/50 border border-gray-300/30 text-gray-800 placeholder-gray-500"
              } ${selectedItems.length >= 4 ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
          {selectedItems.length >= 4 && (
            <p className={`text-sm mt-2 ${textSecondaryClass}`}>
              Maximum 4 items can be compared at once
            </p>
          )}
        </div>

        {/* Search Dropdown */}
        {showDropdown && filteredItems.length > 0 && (
          <div className={`mt-2 rounded-lg shadow-lg max-h-60 overflow-y-auto border ${isDarkMode ? "bg-gray-800 border-gray-600" : "bg-white border-gray-300"
            }`}>
            {filteredItems.map((item) => (
              <button
                key={item.part_number}
                onClick={() => addItemToCompare(item)}
                className={`w-full text-left px-4 py-3 border-b last:border-b-0 transition-colors ${isDarkMode
                    ? "hover:bg-gray-700 border-gray-700"
                    : "hover:bg-gray-50 border-gray-200"
                  }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className={`font-medium ${textPrimaryClass}`}>{item.name}</p>
                    <p className={`text-sm ${textSecondaryClass}`}>
                      {item.part_number} {item.client_name && `• ${item.client_name}`}
                    </p>
                  </div>
                  <Plus className="w-5 h-5 text-blue-500" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected Items Pills */}
      {selectedItems.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedItems.map((item) => (
            <div
              key={item.part_number}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border ${isDarkMode
                  ? "bg-blue-500/20 border-blue-500/40 text-blue-300"
                  : "bg-blue-500/10 border-blue-500/30 text-blue-700"
                }`}
            >
              <span className="font-medium text-sm">{item.name}</span>
              <button
                onClick={() => removeItemFromCompare(item.part_number)}
                className="hover:bg-white/20 rounded-full p-1 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className={`animate-spin rounded-full h-12 w-12 border-b-2 mx-auto ${isDarkMode ? "border-blue-400" : "border-blue-600"
            }`}></div>
          <p className={`mt-4 ${textSecondaryClass}`}>Loading comparison data...</p>
        </div>
      )}

      {/* Comparison Table */}
      {!loading && detailedItems.length > 0 && (
        <div className="space-y-6">
          {/* Delete Confirmation Modal */}
          {deleteConfirm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className={`rounded-xl max-w-md w-full p-6 ${isDarkMode ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-300"
                }`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-red-500" />
                  </div>
                  <div>
                    <h3 className={`text-lg font-bold ${textPrimaryClass}`}>Delete Item?</h3>
                    <p className={`text-sm ${textSecondaryClass}`}>This action cannot be undone</p>
                  </div>
                </div>

                <div className={`p-4 rounded-lg mb-6 ${isDarkMode ? "bg-red-500/10 border border-red-500/30" : "bg-red-500/10 border border-red-500/30"
                  }`}>
                  <p className={`text-sm ${textPrimaryClass} mb-2`}>
                    You are about to delete:
                  </p>
                  <p className={`font-bold ${textPrimaryClass}`}>{deleteConfirm.name}</p>
                  <p className={`text-xs ${textSecondaryClass} mt-1`}>
                    Part Number: {deleteConfirm.partNumber}
                  </p>
                  <p className={`text-xs mt-3 ${isDarkMode ? "text-red-300" : "text-red-600"}`}>
                    ⚠️ This will also delete all phases and subphases associated with this item.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={cancelDelete}
                    disabled={deleting}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${isDarkMode
                        ? "bg-gray-700 hover:bg-gray-600 text-white"
                        : "bg-gray-200 hover:bg-gray-300 text-gray-800"
                      }`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    disabled={deleting}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {deleting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Basic Info Comparison */}
          <div className={`backdrop-blur-md rounded-xl border overflow-hidden ${cardClass}`}>
            <div className={`p-4 border-b ${isDarkMode ? "border-gray-700" : "border-gray-300"}`}>
              <h3 className={`text-lg font-bold ${textPrimaryClass}`}>📋 Basic Information</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={isDarkMode ? "bg-gray-700/40" : "bg-gray-100/60"}>
                    <th className={`px-4 py-3 text-left font-medium ${textSecondaryClass}`}>Property</th>
                    {detailedItems.map((item) => (
                      <th key={item.part_number} className={`px-4 py-3 text-left font-medium ${textPrimaryClass}`}>
                        {item.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className={isDarkMode ? "border-t border-gray-700" : "border-t border-gray-200"}>
                    <td className={`px-4 py-3 font-medium ${textSecondaryClass}`}>Part Number</td>
                    {detailedItems.map((item) => (
                      <td key={item.part_number} className={`px-4 py-3 ${textPrimaryClass}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-sm">{item.part_number}</span>
                          <button
                            onClick={() => handleDeleteItem(item.part_number, item.name)}
                            className={`p-1.5 rounded-lg transition-colors hover:scale-110 ${isDarkMode
                                ? "text-red-400 hover:bg-red-500/20"
                                : "text-red-500 hover:bg-red-500/10"
                              }`}
                            title="Delete item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    ))}
                  </tr>
                  <tr className={isDarkMode ? "border-t border-gray-700" : "border-t border-gray-200"}>
                    <td className={`px-4 py-3 font-medium ${textSecondaryClass}`}>Client</td>
                    {detailedItems.map((item) => (
                      <td key={item.part_number} className={`px-4 py-3 ${textPrimaryClass}`}>
                        {item.client_name || 'N/A'}
                      </td>
                    ))}
                  </tr>
                  <tr className={isDarkMode ? "border-t border-gray-700" : "border-t border-gray-200"}>
                    <td className={`px-4 py-3 font-medium ${textSecondaryClass}`}>Priority</td>
                    {detailedItems.map((item) => (
                      <td key={item.part_number} className={`px-4 py-3`}>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${item.priority === 'High' ? 'bg-red-500/20 text-red-700' :
                            item.priority === 'Medium' ? 'bg-yellow-500/20 text-yellow-700' :
                              'bg-green-500/20 text-green-700'
                          }`}>
                          {item.priority}
                        </span>
                      </td>
                    ))}
                  </tr>
                  <tr className={isDarkMode ? "border-t border-gray-700" : "border-t border-gray-200"}>
                    <td className={`px-4 py-3 font-medium ${textSecondaryClass}`}>Status</td>
                    {detailedItems.map((item) => (
                      <td key={item.part_number} className={`px-4 py-3`}>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${item.status === 'completed' ? 'bg-green-500/20 text-green-700' :
                            item.status === 'in_progress' ? 'bg-blue-500/20 text-blue-700' :
                              'bg-gray-500/20 text-gray-700'
                          }`}>
                          {item.status?.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                    ))}
                  </tr>
                  <tr className={isDarkMode ? "border-t border-gray-700" : "border-t border-gray-200"}>
                    <td className={`px-4 py-3 font-medium ${textSecondaryClass}`}>Batch Qty</td>
                    {detailedItems.map((item) => (
                      <td key={item.part_number} className={`px-4 py-3 ${textPrimaryClass}`}>
                        {item.qty || 0} units
                      </td>
                    ))}
                  </tr>
                  <tr className={isDarkMode ? "border-t border-gray-700" : "border-t border-gray-200"}>
                    <td className={`px-4 py-3 font-medium ${textSecondaryClass}`}>Created</td>
                    {detailedItems.map((item) => (
                      <td key={item.part_number} className={`px-4 py-3 ${textSecondaryClass} text-sm`}>
                        {new Date(item.created_at).toLocaleDateString()}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Performance Metrics Comparison */}
          <div className={`backdrop-blur-md rounded-xl border overflow-hidden ${cardClass}`}>
            <div className={`p-4 border-b ${isDarkMode ? "border-gray-700" : "border-gray-300"}`}>
              <h3 className={`text-lg font-bold ${textPrimaryClass}`}>⚡ Performance Metrics</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={isDarkMode ? "bg-gray-700/40" : "bg-gray-100/60"}>
                    <th className={`px-4 py-3 text-left font-medium ${textSecondaryClass}`}>Metric</th>
                    {detailedItems.map((item, index) => (
                      <th key={item.part_number} className={`px-4 py-3 text-center font-medium ${textPrimaryClass}`}>
                        Item {index + 1}
                        {index > 0 && <span className="block text-xs font-normal text-gray-500 mt-1">vs Item {index}</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Overall Progress */}
                  <tr className={isDarkMode ? "border-t border-gray-700" : "border-t border-gray-200"}>
                    <td className={`px-4 py-3 font-medium ${textSecondaryClass}`}>
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        Overall Progress
                      </div>
                    </td>
                    {detailedItems.map((item, index) => {
                      const metrics = calculateMetrics(item);
                      const prevMetrics = index > 0 ? calculateMetrics(detailedItems[index - 1]) : null;
                      const comparison = prevMetrics ? compareValues(metrics.progress, prevMetrics.progress) : null;

                      return (
                        <td key={item.part_number} className={`px-4 py-3 text-center`}>
                          <div className="flex flex-col items-center gap-1">
                            <span className={`text-lg font-bold ${textPrimaryClass}`}>
                              {metrics.progress}%
                            </span>
                            {comparison && comparison.trend !== 'neutral' && (
                              <div className={`flex items-center gap-1 text-xs ${getTrendColor(comparison.trend)}`}>
                                {getTrendIcon(comparison.trend)}
                                <span>{Math.abs(comparison.percentage)}%</span>
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Completion Rate */}
                  <tr className={isDarkMode ? "border-t border-gray-700" : "border-t border-gray-200"}>
                    <td className={`px-4 py-3 font-medium ${textSecondaryClass}`}>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Completion Rate
                      </div>
                    </td>
                    {detailedItems.map((item, index) => {
                      const metrics = calculateMetrics(item);
                      const prevMetrics = index > 0 ? calculateMetrics(detailedItems[index - 1]) : null;
                      const comparison = prevMetrics ? compareValues(metrics.completionRate, prevMetrics.completionRate) : null;

                      return (
                        <td key={item.part_number} className={`px-4 py-3 text-center`}>
                          <div className="flex flex-col items-center gap-1">
                            <span className={`text-lg font-bold ${textPrimaryClass}`}>
                              {metrics.completedSubphases}/{metrics.totalSubphases}
                            </span>
                            <span className={`text-xs ${textSecondaryClass}`}>
                              ({metrics.completionRate}%)
                            </span>
                            {comparison && comparison.trend !== 'neutral' && (
                              <div className={`flex items-center gap-1 text-xs ${getTrendColor(comparison.trend)}`}>
                                {getTrendIcon(comparison.trend)}
                                <span>{Math.abs(comparison.percentage)}%</span>
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Efficiency */}
                  <tr className={isDarkMode ? "border-t border-gray-700" : "border-t border-gray-200"}>
                    <td className={`px-4 py-3 font-medium ${textSecondaryClass}`}>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Efficiency Score
                      </div>
                    </td>
                    {detailedItems.map((item, index) => {
                      const metrics = calculateMetrics(item);
                      const prevMetrics = index > 0 ? calculateMetrics(detailedItems[index - 1]) : null;
                      const comparison = prevMetrics ? compareValues(metrics.efficiency, prevMetrics.efficiency) : null;

                      return (
                        <td key={item.part_number} className={`px-4 py-3 text-center`}>
                          <div className="flex flex-col items-center gap-1">
                            <span className={`text-lg font-bold ${metrics.efficiency >= 100 ? 'text-green-500' :
                                metrics.efficiency >= 80 ? 'text-yellow-500' :
                                  'text-red-500'
                              }`}>
                              {metrics.efficiency}%
                            </span>
                            {comparison && comparison.trend !== 'neutral' && (
                              <div className={`flex items-center gap-1 text-xs ${getTrendColor(comparison.trend)}`}>
                                {getTrendIcon(comparison.trend)}
                                <span>{Math.abs(comparison.percentage)}%</span>
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Hours Comparison */}
                  <tr className={isDarkMode ? "border-t border-gray-700" : "border-t border-gray-200"}>
                    <td className={`px-4 py-3 font-medium ${textSecondaryClass}`}>
                      Expected vs Actual Hours
                    </td>
                    {detailedItems.map((item) => {
                      const metrics = calculateMetrics(item);

                      return (
                        <td key={item.part_number} className={`px-4 py-3 text-center`}>
                          <div className="flex flex-col items-center gap-1">
                            <span className={`text-sm ${textPrimaryClass}`}>
                              {metrics.totalExpectedHours.toFixed(1)}h / {metrics.totalActualHours.toFixed(1)}h
                            </span>
                            <span className={`text-xs ${metrics.totalActualHours <= metrics.totalExpectedHours ? 'text-green-500' : 'text-red-500'
                              }`}>
                              {metrics.totalActualHours <= metrics.totalExpectedHours ? '✓ On Track' : '⚠ Over Time'}
                            </span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Quantity Progress */}
                  <tr className={isDarkMode ? "border-t border-gray-700" : "border-t border-gray-200"}>
                    <td className={`px-4 py-3 font-medium ${textSecondaryClass}`}>
                      Quantity Progress
                    </td>
                    {detailedItems.map((item, index) => {
                      const metrics = calculateMetrics(item);
                      const prevMetrics = index > 0 ? calculateMetrics(detailedItems[index - 1]) : null;
                      const comparison = prevMetrics ? compareValues(metrics.qtyCompletionRate, prevMetrics.qtyCompletionRate) : null;

                      return (
                        <td key={item.part_number} className={`px-4 py-3 text-center`}>
                          <div className="flex flex-col items-center gap-1">
                            <span className={`text-sm ${textPrimaryClass}`}>
                              {metrics.totalCompletedQty}/{metrics.totalExpectedQty} units
                            </span>
                            <span className={`text-xs ${textSecondaryClass}`}>
                              ({metrics.qtyCompletionRate}%)
                            </span>
                            {comparison && comparison.trend !== 'neutral' && (
                              <div className={`flex items-center gap-1 text-xs ${getTrendColor(comparison.trend)}`}>
                                {getTrendIcon(comparison.trend)}
                                <span>{Math.abs(comparison.percentage)}%</span>
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Team Size */}
                  <tr className={isDarkMode ? "border-t border-gray-700" : "border-t border-gray-200"}>
                    <td className={`px-4 py-3 font-medium ${textSecondaryClass}`}>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Team Size
                      </div>
                    </td>
                    {detailedItems.map((item, index) => {
                      const metrics = calculateMetrics(item);
                      const prevMetrics = index > 0 ? calculateMetrics(detailedItems[index - 1]) : null;
                      const comparison = prevMetrics ? compareValues(metrics.employeeCount, prevMetrics.employeeCount, false) : null;

                      return (
                        <td key={item.part_number} className={`px-4 py-3 text-center`}>
                          <div className="flex flex-col items-center gap-1">
                            <span className={`text-lg font-bold ${textPrimaryClass}`}>
                              {metrics.employeeCount}
                            </span>
                            <span className={`text-xs ${textSecondaryClass}`}>employees</span>
                            {comparison && comparison.trend !== 'neutral' && (
                              <div className={`flex items-center gap-1 text-xs ${getTrendColor(comparison.trend)}`}>
                                {getTrendIcon(comparison.trend)}
                                <span>{Math.abs(comparison.diff)}</span>
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Avg Time per Subphase */}
                  <tr className={isDarkMode ? "border-t border-gray-700" : "border-t border-gray-200"}>
                    <td className={`px-4 py-3 font-medium ${textSecondaryClass}`}>
                      Avg Time per Task
                    </td>
                    {detailedItems.map((item, index) => {
                      const metrics = calculateMetrics(item);
                      const prevMetrics = index > 0 ? calculateMetrics(detailedItems[index - 1]) : null;
                      const comparison = prevMetrics ? compareValues(metrics.avgTimePerSubphase, prevMetrics.avgTimePerSubphase, false) : null;

                      return (
                        <td key={item.part_number} className={`px-4 py-3 text-center`}>
                          <div className="flex flex-col items-center gap-1">
                            <span className={`text-lg font-bold ${textPrimaryClass}`}>
                              {metrics.avgTimePerSubphase.toFixed(2)}h
                            </span>
                            {comparison && comparison.trend !== 'neutral' && (
                              <div className={`flex items-center gap-1 text-xs ${getTrendColor(comparison.trend)}`}>
                                {getTrendIcon(comparison.trend)}
                                <span>{Math.abs(comparison.percentage)}%</span>
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Phases & Tasks */}
                  <tr className={isDarkMode ? "border-t border-gray-700" : "border-t border-gray-200"}>
                    <td className={`px-4 py-3 font-medium ${textSecondaryClass}`}>
                      Phases / Tasks
                    </td>
                    {detailedItems.map((item) => {
                      const metrics = calculateMetrics(item);

                      return (
                        <td key={item.part_number} className={`px-4 py-3 text-center`}>
                          <div className="flex flex-col items-center gap-1">
                            <span className={`text-sm ${textPrimaryClass}`}>
                              {metrics.totalPhases} phases
                            </span>
                            <span className={`text-xs ${textSecondaryClass}`}>
                              {metrics.totalSubphases} tasks
                            </span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary Insights */}
          <div className={`backdrop-blur-md rounded-xl border p-6 ${cardClass}`}>
            <h3 className={`text-lg font-bold mb-4 ${textPrimaryClass}`}>💡 Comparison Insights</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Best Performer */}
              <div className={`p-4 rounded-lg border ${isDarkMode ? "bg-green-500/10 border-green-500/30" : "bg-green-500/10 border-green-500/30"
                }`}>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  <h4 className={`font-semibold ${textPrimaryClass}`}>Best Overall Performance</h4>
                </div>
                {(() => {
                  const bestItem = detailedItems.reduce((best, item) => {
                    const metrics = calculateMetrics(item);
                    const bestMetrics = calculateMetrics(best);
                    return metrics.efficiency > bestMetrics.efficiency ? item : best;
                  });
                  const bestMetrics = calculateMetrics(bestItem);

                  return (
                    <div>
                      <p className={`font-bold ${textPrimaryClass}`}>{bestItem.name}</p>
                      <p className={`text-sm ${textSecondaryClass}`}>
                        Efficiency: {bestMetrics.efficiency}% • Progress: {bestMetrics.progress}%
                      </p>
                    </div>
                  );
                })()}
              </div>

              {/* Fastest Completion */}
              <div className={`p-4 rounded-lg border ${isDarkMode ? "bg-blue-500/10 border-blue-500/30" : "bg-blue-500/10 border-blue-500/30"
                }`}>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-blue-500" />
                  <h4 className={`font-semibold ${textPrimaryClass}`}>Fastest Completion Rate</h4>
                </div>
                {(() => {
                  const fastestItem = detailedItems.reduce((fastest, item) => {
                    const metrics = calculateMetrics(item);
                    const fastestMetrics = calculateMetrics(fastest);
                    return metrics.completionRate > fastestMetrics.completionRate ? item : fastest;
                  });
                  const fastestMetrics = calculateMetrics(fastestItem);

                  return (
                    <div>
                      <p className={`font-bold ${textPrimaryClass}`}>{fastestItem.name}</p>
                      <p className={`text-sm ${textSecondaryClass}`}>
                        {fastestMetrics.completedSubphases}/{fastestMetrics.totalSubphases} tasks • {fastestMetrics.completionRate}% complete
                      </p>
                    </div>
                  );
                })()}
              </div>

              {/* Most Efficient Team */}
              <div className={`p-4 rounded-lg border ${isDarkMode ? "bg-purple-500/10 border-purple-500/30" : "bg-purple-500/10 border-purple-500/30"
                }`}>
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-5 h-5 text-purple-500" />
                  <h4 className={`font-semibold ${textPrimaryClass}`}>Smallest Team Size</h4>
                </div>
                {(() => {
                  const smallestTeam = detailedItems.reduce((smallest, item) => {
                    const metrics = calculateMetrics(item);
                    const smallestMetrics = calculateMetrics(smallest);
                    return metrics.employeeCount < smallestMetrics.employeeCount && metrics.employeeCount > 0 ? item : smallest;
                  });
                  const smallestMetrics = calculateMetrics(smallestTeam);

                  return (
                    <div>
                      <p className={`font-bold ${textPrimaryClass}`}>{smallestTeam.name}</p>
                      <p className={`text-sm ${textSecondaryClass}`}>
                        {smallestMetrics.employeeCount} employee{smallestMetrics.employeeCount !== 1 ? 's' : ''} • {smallestMetrics.completionRate}% complete
                      </p>
                    </div>
                  );
                })()}
              </div>

              {/* Needs Attention */}
              <div className={`p-4 rounded-lg border ${isDarkMode ? "bg-red-500/10 border-red-500/30" : "bg-red-500/10 border-red-500/30"
                }`}>
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <h4 className={`font-semibold ${textPrimaryClass}`}>Needs Attention</h4>
                </div>
                {(() => {
                  const needsAttention = detailedItems.reduce((worst, item) => {
                    const metrics = calculateMetrics(item);
                    const worstMetrics = calculateMetrics(worst);
                    return metrics.efficiency < worstMetrics.efficiency ? item : worst;
                  });
                  const needsMetrics = calculateMetrics(needsAttention);

                  return (
                    <div>
                      <p className={`font-bold ${textPrimaryClass}`}>{needsAttention.name}</p>
                      <p className={`text-sm ${textSecondaryClass}`}>
                        Efficiency: {needsMetrics.efficiency}% • {needsMetrics.totalActualHours > needsMetrics.totalExpectedHours ? 'Over time' : 'Behind schedule'}
                      </p>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Phase-by-Phase Breakdown */}
          <div className={`backdrop-blur-md rounded-xl border overflow-hidden ${cardClass}`}>
            <div className={`p-4 border-b ${isDarkMode ? "border-gray-700" : "border-gray-300"}`}>
              <h3 className={`text-lg font-bold ${textPrimaryClass}`}>🔍 Phase Breakdown Comparison</h3>
            </div>
            <div className="p-4 space-y-4">
              {detailedItems[0]?.phases?.map((_, phaseIndex) => {
                const hasPhase = detailedItems.every(item => item.phases?.[phaseIndex]);
                if (!hasPhase) return null;

                return (
                  <div key={phaseIndex} className={`p-4 rounded-lg border ${isDarkMode ? "bg-gray-700/30 border-gray-600/50" : "bg-gray-100/50 border-gray-300/30"
                    }`}>
                    <h4 className={`font-semibold mb-3 ${textPrimaryClass}`}>
                      Phase {phaseIndex + 1}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {detailedItems.map((item, itemIndex) => {
                        const phase = item.phases?.[phaseIndex];
                        if (!phase) return null;

                        const totalSubphases = phase.subphases?.length || 0;
                        const completedSubphases = phase.subphases?.filter(sub => sub.completed == 1).length || 0;
                        const progress = totalSubphases > 0 ? Math.round((completedSubphases / totalSubphases) * 100) : 0;

                        return (
                          <div key={item.part_number} className={`p-3 rounded border ${isDarkMode ? "bg-gray-800/50 border-gray-700" : "bg-white/50 border-gray-300"
                            }`}>
                            <div className="flex items-center justify-between mb-2">
                              <span className={`text-xs font-medium ${textSecondaryClass}`}>
                                Item {itemIndex + 1}
                              </span>
                              <span className={`text-xs font-bold ${progress === 100 ? 'text-green-500' :
                                  progress > 50 ? 'text-blue-500' :
                                    'text-gray-500'
                                }`}>
                                {progress}%
                              </span>
                            </div>
                            <p className={`text-sm font-medium mb-1 ${textPrimaryClass} truncate`}>
                              {phase.name}
                            </p>
                            <p className={`text-xs ${textSecondaryClass}`}>
                              {completedSubphases}/{totalSubphases} tasks
                            </p>
                            {phase.start_time && (
                              <p className={`text-xs mt-1 ${textSecondaryClass}`}>
                                {phase.end_time ? '✓ Completed' :
                                  phase.pause_time ? '⏸ Paused' :
                                    '▶ In Progress'}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && selectedItems.length === 0 && (
        <div className={`backdrop-blur-md rounded-xl border p-12 text-center ${cardClass}`}>
          <div className="max-w-md mx-auto">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isDarkMode ? "bg-blue-500/20" : "bg-blue-500/10"
              }`}>
              <Search className="w-8 h-8 text-blue-500" />
            </div>
            <h3 className={`text-xl font-bold mb-2 ${textPrimaryClass}`}>
              No Items Selected
            </h3>
            <p className={`${textSecondaryClass} mb-6`}>
              Search and select up to 4 items to compare their performance metrics, completion rates, and efficiency scores.
            </p>
            <div className={`text-sm ${textSecondaryClass} space-y-2`}>
              <p>💡 <strong>Tip:</strong> Compare similar items to identify best practices</p>
              <p>📊 Compare current vs past projects to track improvements</p>
              <p>🎯 Identify which teams or approaches work best</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ItemComparison;