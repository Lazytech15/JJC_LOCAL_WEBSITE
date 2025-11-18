
import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Calendar, Package, CheckCircle, Clock, Users, Activity, TrendingUp, AlertCircle } from 'lucide-react';

function Dashboard({ items, calculateItemProgress, loading, apiService, isDarkMode, formatTime }) {
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemDetails, setItemDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    client: 'all',
    search: ''
  });
  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: 20,
    total_items: 0,
    total_pages: 0,
    has_next: false,
    has_previous: false
  });
  const [filteredItems, setFilteredItems] = useState([]);
  const [isFiltering, setIsFiltering] = useState(false);
  const [uniqueClients, setUniqueClients] = useState([]);
  const [statistics, setStatistics] = useState(null);

  // Load clients list
  useEffect(() => {
    loadClients();
  }, []);

  // Load statistics
  useEffect(() => {
    loadStatistics();
  }, [filters]);

  // Apply filters when they change
  useEffect(() => {
    applyFilters(1); // Reset to page 1 when filters change
  }, [filters.status, filters.priority, filters.client, filters.search]);

  const loadClients = async () => {
    try {
      const clients = await apiService.operations.getClients();
      setUniqueClients(clients);
    } catch (error) {
      console.error('Failed to load clients:', error);
    }
  };

  const loadStatistics = async () => {
    try {
      const stats = await apiService.operations.getStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  };

  const applyFilters = async (page = 1) => {
    setIsFiltering(true);
    try {
      // Build filter params
      const params = {
        page,
        limit: pagination.per_page
      };

      // Map dashboard filters to API filters
      if (filters.status !== 'all') {
        if (filters.status === 'completed') {
          params.status = 'completed';
        } else if (filters.status === 'in-progress') {
          params.status = 'in_progress';
        } else if (filters.status === 'not-started') {
          params.status = 'not_started';
        }
      }

      if (filters.priority !== 'all') {
        params.priority = filters.priority;
      }

      if (filters.client !== 'all') {
        params.client_name = filters.client;
      }

      if (filters.search && filters.search.trim()) {
        params.search = filters.search.trim();
      }

      const response = await apiService.operations.getItemsPaginated(page, pagination.per_page, params);

      setFilteredItems(response.items || []);
      setPagination(response.pagination || {
        current_page: page,
        per_page: pagination.per_page,
        total_items: 0,
        total_pages: 0,
        has_next: false,
        has_previous: false
      });
    } catch (error) {
      console.error('Failed to apply filters:', error);
      setFilteredItems([]);
    } finally {
      setIsFiltering(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.total_pages) {
      applyFilters(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleItemsPerPageChange = (newLimit) => {
    setPagination(prev => ({ ...prev, per_page: newLimit }));
    applyFilters(1);
  };

  const loadItemDetails = async (item) => {
    setLoadingDetails(true);
    try {
      const fullItem = await apiService.operations.getItem(item.part_number);
      setItemDetails(fullItem);
    } catch (error) {
      console.error('Failed to load item details:', error);
      setItemDetails(item);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleItemClick = (item) => {
    if (selectedItem?.part_number === item.part_number) {
      setSelectedItem(null);
      setItemDetails(null);
    } else {
      setSelectedItem(item);
      loadItemDetails(item);
    }
  };

  const closePanel = () => {
    setSelectedItem(null);
    setItemDetails(null);
  };

  const cardClass = isDarkMode
    ? "bg-gray-800/60 border-gray-700/50"
    : "bg-white/20 border-white/30";

  const textPrimaryClass = isDarkMode ? "text-gray-100" : "text-gray-800";
  const textSecondaryClass = isDarkMode ? "text-gray-300" : "text-gray-600";

  // Calculate statistics from statistics API
  const stats = statistics?.overall || {
    total_items: 0,
    completed_items: 0,
    in_progress_items: 0,
    not_started_items: 0,
    avg_progress: 0
  };

  const overallProgress = Math.round(parseFloat(stats.avg_progress) || 0);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className={`animate-spin rounded-full h-12 w-12 border-b-2 mx-auto ${isDarkMode ? "border-slate-400" : "border-slate-600"
          }`}></div>
        <p className={`mt-4 ${textSecondaryClass}`}>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="px-2 sm:px-4 lg:px-0">
      <h2 className={`text-xl sm:text-2xl font-bold mb-4 sm:mb-6 ${textPrimaryClass}`}>
        Operations Dashboard
      </h2>

      {/* Filters */}
      <div className={`backdrop-blur-md rounded-lg p-3 sm:p-4 border mb-4 sm:mb-6 ${cardClass}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div>
            <label className={`block text-xs sm:text-sm font-medium mb-1 ${textSecondaryClass}`}>
              Search
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Search items..."
              className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
                }`}
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className={`block text-xs sm:text-sm font-medium mb-1 ${textSecondaryClass}`}>
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-gray-100'
                  : 'bg-white border-gray-300 text-gray-800'
                }`}
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="in-progress">In Progress</option>
              <option value="not-started">Not Started</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <label className={`block text-xs sm:text-sm font-medium mb-1 ${textSecondaryClass}`}>
              Priority
            </label>
            <select
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
              className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-gray-100'
                  : 'bg-white border-gray-300 text-gray-800'
                }`}
            >
              <option value="all">All Priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Client Filter */}
          <div>
            <label className={`block text-xs sm:text-sm font-medium mb-1 ${textSecondaryClass}`}>
              Client
            </label>
            <select
              value={filters.client}
              onChange={(e) => setFilters({ ...filters, client: e.target.value })}
              className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-gray-100'
                  : 'bg-white border-gray-300 text-gray-800'
                }`}
            >
              <option value="all">All Clients</option>
              {uniqueClients.map(client => (
                <option key={client} value={client}>{client}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Filters Summary */}
        {(filters.status !== 'all' || filters.priority !== 'all' || filters.client !== 'all' || filters.search) && (
          <div className="mt-3 flex flex-wrap gap-2">
            <span className={`text-xs ${textSecondaryClass}`}>Active filters:</span>
            {filters.status !== 'all' && (
              <span className={`px-2 py-1 rounded text-xs ${isDarkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700'
                }`}>
                Status: {filters.status}
              </span>
            )}
            {filters.priority !== 'all' && (
              <span className={`px-2 py-1 rounded text-xs ${isDarkMode ? 'bg-purple-900/30 text-purple-300' : 'bg-purple-100 text-purple-700'
                }`}>
                Priority: {filters.priority}
              </span>
            )}
            {filters.client !== 'all' && (
              <span className={`px-2 py-1 rounded text-xs ${isDarkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-700'
                }`}>
                Client: {filters.client}
              </span>
            )}
            {filters.search && (
              <span className={`px-2 py-1 rounded text-xs ${isDarkMode ? 'bg-orange-900/30 text-orange-300' : 'bg-orange-100 text-orange-700'
                }`}>
                Search: "{filters.search}"
              </span>
            )}
            <button
              onClick={() => setFilters({ status: 'all', priority: 'all', client: 'all', search: '' })}
              className={`px-2 py-1 rounded text-xs font-medium ${isDarkMode
                  ? 'bg-red-900/30 text-red-300 hover:bg-red-900/50'
                  : 'bg-red-100 text-red-700 hover:bg-red-200'
                }`}
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8">
  {/* Total Items */}
  <div className={`p-3 sm:p-5 rounded-lg shadow-md ${isDarkMode ? "bg-gradient-to-br from-blue-700 to-blue-800 text-gray-200" : "bg-gradient-to-br from-blue-500 to-blue-600 text-white"}`}>
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-xs sm:text-sm font-medium opacity-90">Total Items</h3>
        <p className="text-2xl sm:text-3xl font-bold mt-1 sm:mt-2">{stats.total_items}</p>
      </div>
      <Activity className={`w-6 h-6 sm:w-8 sm:h-8 opacity-80 ${isDarkMode ? "text-gray-200" : "text-white"}`} />
    </div>
  </div>

  {/* Completed */}
  <div className={`p-3 sm:p-5 rounded-lg shadow-md ${isDarkMode ? "bg-gradient-to-br from-green-700 to-green-800 text-gray-200" : "bg-gradient-to-br from-green-500 to-green-600 text-white"}`}>
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-xs sm:text-sm font-medium opacity-90">Completed</h3>
        <p className="text-2xl sm:text-3xl font-bold mt-1 sm:mt-2">{stats.completed_items}</p>
      </div>
      <CheckCircle className={`w-6 h-6 sm:w-8 sm:h-8 opacity-80 ${isDarkMode ? "text-gray-200" : "text-white"}`} />
    </div>
  </div>

  {/* In Progress */}
  <div className={`p-3 sm:p-5 rounded-lg shadow-md ${isDarkMode ? "bg-gradient-to-br from-yellow-700 to-yellow-800 text-gray-200" : "bg-gradient-to-br from-yellow-500 to-yellow-600 text-white"}`}>
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-xs sm:text-sm font-medium opacity-90">In Progress</h3>
        <p className="text-2xl sm:text-3xl font-bold mt-1 sm:mt-2">{stats.in_progress_items}</p>
      </div>
      <Clock className={`w-6 h-6 sm:w-8 sm:h-8 opacity-80 ${isDarkMode ? "text-gray-200" : "text-white"}`} />
    </div>
  </div>

  {/* Not Started */}
  <div className={`p-3 sm:p-5 rounded-lg shadow-md ${isDarkMode ? "bg-gradient-to-br from-gray-700 to-gray-800 text-gray-200" : "bg-gradient-to-br from-gray-500 to-gray-600 text-white"}`}>
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-xs sm:text-sm font-medium opacity-90">Not Started</h3>
        <p className="text-2xl sm:text-3xl font-bold mt-1 sm:mt-2">{stats.not_started_items}</p>
      </div>
      <AlertCircle className={`w-6 h-6 sm:w-8 sm:h-8 opacity-80 ${isDarkMode ? "text-gray-200" : "text-white"}`} />
    </div>
  </div>

  {/* Overall Progress */}
  <div className={`p-3 sm:p-5 rounded-lg shadow-md col-span-2 sm:col-span-1 ${isDarkMode ? "bg-gradient-to-br from-purple-700 to-purple-800 text-gray-200" : "bg-gradient-to-br from-purple-500 to-purple-600 text-white"}`}>
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-xs sm:text-sm font-medium opacity-90">Overall Progress</h3>
        <p className="text-2xl sm:text-3xl font-bold mt-1 sm:mt-2">{overallProgress}%</p>
      </div>
      <div className="relative w-16 h-16 sm:w-20 sm:h-20">
        <svg className="transform -rotate-90 w-full h-full" viewBox="0 0 80 80">
          <circle
            cx="40"
            cy="40"
            r="32"
            stroke={isDarkMode ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.2)"}
            strokeWidth="8"
            fill="none"
          />
          <circle
            cx="40"
            cy="40"
            r="32"
            stroke={isDarkMode ? "gray" : "white"}
            strokeWidth="8"
            fill="none"
            strokeDasharray={`${2 * Math.PI * 32}`}
            strokeDashoffset={`${2 * Math.PI * 32 * (1 - overallProgress / 100)}`}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs sm:text-sm font-bold">{overallProgress}%</span>
        </div>
      </div>
    </div>
  </div>
</div>

      {/* Items Progress List */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h3 className={`text-lg sm:text-xl font-semibold ${textPrimaryClass}`}>
            Items Overview
            {pagination.total_items > 0 && (
              <span className={`text-sm font-normal ml-2 ${textSecondaryClass}`}>
                ({pagination.total_items} total)
              </span>
            )}
          </h3>
        </div>

        {isFiltering ? (
          <div className="text-center py-8">
            <div className={`animate-spin rounded-full h-8 w-8 border-b-2 mx-auto ${isDarkMode ? "border-slate-400" : "border-slate-600"
              }`}></div>
            <p className={`mt-4 text-sm ${textSecondaryClass}`}>Filtering items...</p>
          </div>
        ) : filteredItems.length > 0 ? (
          <>
            {filteredItems.map(item => {
              const progress = calculateItemProgress(item);
              const itemKey = item.part_number || item.id;
              const isSelected = selectedItem?.part_number === item.part_number;

              return (
                <div key={itemKey}>
                  <div
                    onClick={() => handleItemClick(item)}
                    className={`backdrop-blur-md rounded-lg p-3 sm:p-4 border cursor-pointer transition-all duration-200 hover:shadow-lg ${isSelected
                        ? isDarkMode
                          ? 'border-blue-400 bg-blue-900/20'
                          : 'border-blue-500 bg-blue-50/20'
                        : isDarkMode
                          ? 'border-gray-700/50 bg-gray-800/40 hover:bg-gray-800/60'
                          : 'border-white/30 bg-white/10 hover:bg-white/20'
                      }`}
                  >
                    <div className="flex justify-between items-start mb-2 gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-semibold text-sm sm:text-base truncate ${textPrimaryClass}`}>
                          {item.name}
                        </h4>
                        <p className={`text-xs sm:text-sm line-clamp-2 ${textSecondaryClass}`}>
                          {item.description}
                        </p>
                        {item.part_number && (
                          <p className={`text-xs mt-1 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                            Part #: {item.part_number}
                          </p>
                        )}
                        {item.client_name && (
                          <p className={`text-xs mt-1 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}>
                            Client: {item.client_name}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <div className="flex items-center gap-2">
                          {/* Circular Progress Indicator */}
                          <div className="relative w-12 h-12 sm:w-14 sm:h-14">
                            <svg className="transform -rotate-90 w-full h-full" viewBox="0 0 48 48">
                              {/* Background circle */}
                              <circle
                                cx="24"
                                cy="24"
                                r="20"
                                stroke={isDarkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"}
                                strokeWidth="4"
                                fill="none"
                              />
                              {/* Progress circle */}
                              <circle
                                cx="24"
                                cy="24"
                                r="20"
                                stroke={
                                  progress === 100 ? '#22c55e' :
                                    progress > 0 ? '#eab308' :
                                      '#6b7280'
                                }
                                strokeWidth="4"
                                fill="none"
                                strokeDasharray={`${2 * Math.PI * 20}`}
                                strokeDashoffset={`${2 * Math.PI * 20 * (1 - progress / 100)}`}
                                strokeLinecap="round"
                                className="transition-all duration-500 ease-out"
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className={`text-xs font-bold ${progress === 100 ? 'text-green-500' :
                                  progress > 0 ? 'text-yellow-500' :
                                    'text-gray-500'
                                }`}>
                                {progress}%
                              </span>
                            </div>
                          </div>
                          {isSelected ? (
                            <ChevronUp className={`w-4 h-4 sm:w-5 sm:h-5 ${isDarkMode ? "text-blue-400" : "text-blue-500"
                              }`} />
                          ) : (
                            <ChevronDown className={`w-4 h-4 sm:w-5 sm:h-5 ${isDarkMode ? "text-gray-400" : "text-gray-500"
                              }`} />
                          )}
                        </div>
                        {item.priority && (
                          <span className={`px-2 py-1 rounded text-xs font-medium ${item.priority === 'High'
                              ? isDarkMode ? 'bg-red-500/20 text-red-300' : 'bg-red-500/20 text-red-700'
                              : item.priority === 'Medium'
                                ? isDarkMode ? 'bg-yellow-500/20 text-yellow-300' : 'bg-yellow-500/20 text-yellow-700'
                                : isDarkMode ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-500/20 text-blue-700'
                            }`}>
                            {item.priority}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={`w-full rounded-full h-2 ${isDarkMode ? "bg-gray-700" : "bg-gray-300"}`}>
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${progress === 100 ? 'bg-green-500' :
                            progress > 0 ? 'bg-yellow-500' :
                              'bg-gray-500'
                          }`}
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <div className={`mt-2 text-xs sm:text-sm flex justify-between ${textSecondaryClass}`}>
                      <span>{item.phase_count || item.phases?.length || 0} phases</span>
                      <span className="hidden sm:inline">
                        Created {new Date(item.created_at).toLocaleDateString()}
                      </span>
                      <span className="sm:hidden">
                        {new Date(item.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  {/* Slide Down Panel */}
                  {isSelected && (
                    <ItemDetailsSlidePanel
                      item={selectedItem}
                      itemDetails={itemDetails}
                      loadingDetails={loadingDetails}
                      onClose={closePanel}
                      isDarkMode={isDarkMode}
                      formatTime={formatTime}
                    />
                  )}
                </div>
              );
            })}

            {/* Pagination Controls */}
            <PaginationControls
              pagination={pagination}
              onPageChange={handlePageChange}
              onItemsPerPageChange={handleItemsPerPageChange}
              isDarkMode={isDarkMode}
              textSecondaryClass={textSecondaryClass}
            />
          </>
        ) : (
          <p className={`text-center py-8 text-sm sm:text-base ${textSecondaryClass}`}>
            No items match the current filters.
          </p>
        )}
      </div>
    </div>
  );
}

// Item Details Slide Panel Component
function ItemDetailsSlidePanel({ item, itemDetails, loadingDetails, onClose, isDarkMode, formatTime }) {
  const [expandedPhases, setExpandedPhases] = useState({});

  const togglePhase = (phaseId) => {
    setExpandedPhases(prev => ({
      ...prev,
      [phaseId]: !prev[phaseId]
    }));
  };

  const parseRemarks = (remarks) => {
    if (!remarks) return null;

    const lines = remarks.trim().split('\n');
    const transactions = [];

    lines.forEach((line, i) => {
      const outMatch = line.match(
        /\[(.*?)\] Transferred OUT (\d+) units to (.+?) \((.+?)\) - (.+?) > (.+?) \| From: (.+?) > (.+?): (.+)/
      );
      const inMatch = line.match(
        /\[(.*?)\] Received IN (\d+) units from (.+?) \((.+?)\) - (.+?) > (.+?) \| To: (.+?) > (.+?): (.+)/
      );

      if (outMatch) {
        const [
          ,
          timestamp,
          qty,
          client,
          partNumberRaw,
          targetPhase,
          targetSubphase,
          sourcePhase,
          sourceSubphase,
          note,
        ] = outMatch;

        const partNumber = partNumberRaw.split('-BATCH')[0];

        transactions.push({
          type: 'OUT',
          index: i + 1,
          timestamp,
          qty,
          client,
          partNumber,
          targetPhase,
          targetSubphase,
          sourcePhase,
          sourceSubphase,
          note,
        });
      } else if (inMatch) {
        const [
          ,
          timestamp,
          qty,
          client,
          partNumberRaw,
          sourcePhase,
          sourceSubphase,
          targetPhase,
          targetSubphase,
          note,
        ] = inMatch;

        const partNumber = partNumberRaw.split('-BATCH')[0];

        transactions.push({
          type: 'IN',
          index: i + 1,
          timestamp,
          qty,
          client,
          partNumber,
          sourcePhase,
          sourceSubphase,
          targetPhase,
          targetSubphase,
          note,
        });
      } else if (line.trim()) {
        transactions.push({
          type: 'OTHER',
          index: i + 1,
          text: line,
        });
      }
    });

    return transactions;
  };

  const totalPhases = itemDetails?.phases?.length || 0;
  const completedPhases = itemDetails?.phases?.filter(phase => {
    const completed = phase.subphases?.filter(sp => sp.completed == 1).length || 0;
    const total = phase.subphases?.length || 0;
    return total > 0 && completed === total;
  }).length || 0;

  const totalTasks = itemDetails?.phases?.reduce((sum, p) => sum + (p.subphases?.length || 0), 0) || 0;
  const completedTasks = itemDetails?.phases?.reduce((sum, p) => sum + (p.subphases?.filter(sp => sp.completed == 1).length || 0), 0) || 0;

  const totalExpectedHours = itemDetails?.phases?.reduce((sum, p) =>
    sum + (p.subphases?.reduce((s, sp) => s + parseFloat(sp.expected_duration || 0), 0) || 0), 0) || 0;
  const totalActualHours = itemDetails?.phases?.reduce((sum, p) =>
    sum + (p.subphases?.reduce((s, sp) => s + parseFloat(sp.actual_hours || 0), 0) || 0), 0) || 0;

  const totalExpectedQty = itemDetails?.phases?.reduce((sum, p) =>
    sum + (p.subphases?.reduce((s, sp) => s + parseInt(sp.expected_quantity || 0), 0) || 0), 0) || 0;
  const totalCompletedQty = itemDetails?.phases?.reduce((sum, p) =>
    sum + (p.subphases?.reduce((s, sp) => s + parseInt(sp.current_completed_quantity || 0), 0) || 0), 0) || 0;

  const efficiency = totalExpectedHours > 0 && totalActualHours > 0 ? ((totalExpectedHours / totalActualHours) * 100).toFixed(1) : 'N/A';

  const employees = new Set();
  itemDetails?.phases?.forEach(phase => {
    phase.subphases?.forEach(subphase => {
      if (subphase.employee_name) {
        employees.add(subphase.employee_name);
      }
    });
  });

  const cardClass = isDarkMode
    ? "bg-gray-800/80 border-gray-700/50"
    : "bg-white/30 border-white/40";

  const textPrimaryClass = isDarkMode ? "text-gray-100" : "text-gray-800";
  const textSecondaryClass = isDarkMode ? "text-gray-300" : "text-gray-600";

  return (
    <div className="mt-2 animate-slideDown">
      <div className={`backdrop-blur-md rounded-lg border-2 overflow-hidden ${isDarkMode
        ? "bg-gradient-to-r from-slate-800 to-slate-900 border-blue-400/30"
        : "bg-gradient-to-r from-slate-50 to-slate-100 border-blue-500/30"
        }`}>
        {loadingDetails ? (
          <div className="p-8 text-center">
            <div className={`animate-spin rounded-full h-8 w-8 border-b-2 mx-auto ${isDarkMode ? "border-slate-400" : "border-slate-600"
              }`}></div>
            <p className={`mt-4 text-sm ${textSecondaryClass}`}>Loading details...</p>
          </div>
        ) : (
          <div className="p-3 sm:p-5">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 mb-3 sm:mb-4">
              <div className={`backdrop-blur-sm p-2 sm:p-3 rounded-lg border shadow-sm ${cardClass}`}>
                <div className="flex items-center gap-1 sm:gap-2 mb-1">
                  <CheckCircle className={`w-3 h-3 sm:w-4 sm:h-4 ${isDarkMode ? "text-green-400" : "text-green-600"}`} />
                  <p className={`text-xs ${textSecondaryClass}`}>Phase Progress</p>
                </div>
                <p className={`text-lg sm:text-xl font-bold ${textPrimaryClass}`}>{completedPhases}/{totalPhases}</p>
              </div>

              <div className={`backdrop-blur-sm p-2 sm:p-3 rounded-lg border shadow-sm ${cardClass}`}>
                <div className="flex items-center gap-1 sm:gap-2 mb-1">
                  <Activity className={`w-3 h-3 sm:w-4 sm:h-4 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`} />
                  <p className={`text-xs ${textSecondaryClass}`}>Tasks</p>
                </div>
                <p className={`text-lg sm:text-xl font-bold ${textPrimaryClass}`}>{completedTasks}/{totalTasks}</p>
              </div>

              <div className={`backdrop-blur-sm p-2 sm:p-3 rounded-lg border shadow-sm ${cardClass}`}>
                <div className="flex items-center gap-1 sm:gap-2 mb-1">
                  <Clock className={`w-3 h-3 sm:w-4 sm:h-4 ${isDarkMode ? "text-purple-400" : "text-purple-600"}`} />
                  <p className={`text-xs ${textSecondaryClass}`}>Hours</p>
                </div>
                <p className={`text-lg sm:text-xl font-bold ${textPrimaryClass}`}>{totalActualHours.toFixed(1)}</p>
                <p className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>of {totalExpectedHours.toFixed(1)}</p>
              </div>

              <div className={`backdrop-blur-sm p-2 sm:p-3 rounded-lg border shadow-sm ${cardClass}`}>
                <div className="flex items-center gap-1 sm:gap-2 mb-1">
                  <Package className={`w-3 h-3 sm:w-4 sm:h-4 ${isDarkMode ? "text-orange-400" : "text-orange-600"}`} />
                  <p className={`text-xs ${textSecondaryClass}`}>Quantity</p>
                </div>
                <p className={`text-lg sm:text-xl font-bold ${textPrimaryClass}`}>{totalCompletedQty}/{totalExpectedQty}</p>
              </div>
            </div>

            {/* Additional Info Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 mb-3 sm:mb-4">
              {employees.size > 0 && (
                <div className={`backdrop-blur-sm p-2 sm:p-3 rounded-lg border ${cardClass}`}>
                  <div className="flex items-center gap-1 sm:gap-2 mb-1">
                    <Users className={`w-3 h-3 sm:w-4 sm:h-4 ${isDarkMode ? "text-indigo-400" : "text-indigo-600"}`} />
                    <p className={`text-xs ${textSecondaryClass}`}>Employees</p>
                  </div>
                  <p className={`text-xs sm:text-sm font-semibold ${textPrimaryClass}`}>{employees.size} assigned</p>
                </div>
              )}

              {efficiency !== 'N/A' && (
                <div className={`backdrop-blur-sm p-2 sm:p-3 rounded-lg border ${cardClass}`}>
                  <div className="flex items-center gap-1 sm:gap-2 mb-1">
                    <TrendingUp className={`w-3 h-3 sm:w-4 sm:h-4 ${isDarkMode ? "text-teal-400" : "text-teal-600"}`} />
                    <p className={`text-xs ${textSecondaryClass}`}>Efficiency</p>
                  </div>
                  <p className={`text-xs sm:text-sm font-semibold ${parseFloat(efficiency) >= 100
                    ? isDarkMode ? 'text-green-400' : 'text-green-600'
                    : isDarkMode ? 'text-orange-400' : 'text-orange-600'
                    }`}>{efficiency}%</p>
                </div>
              )}

              {item.created_at && (
                <div className={`backdrop-blur-sm p-2 sm:p-3 rounded-lg border ${cardClass}`}>
                  <div className="flex items-center gap-1 sm:gap-2 mb-1">
                    <Calendar className={`w-3 h-3 sm:w-4 sm:h-4 ${textSecondaryClass}`} />
                    <p className={`text-xs ${textSecondaryClass}`}>Created</p>
                  </div>
                  <p className={`text-xs sm:text-sm font-semibold ${textPrimaryClass}`}>
                    {new Date(item.created_at).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>

            {/* Remarks Section */}
            {item.remarks && (
              <div className={`p-3 sm:p-4 rounded-lg border mb-3 sm:mb-4 ${isDarkMode
                ? "bg-amber-900/20 border-amber-700"
                : "bg-amber-50 border-amber-200"
                }`}>
                <p className={`text-xs sm:text-sm font-semibold mb-2 sm:mb-3 ${isDarkMode ? "text-amber-300" : "text-amber-800"
                  }`}>Remarks Summary:</p>
                <div className="space-y-2 sm:space-y-3">
                  {parseRemarks(item.remarks)?.map((transaction, idx) => {
                    if (transaction.type === 'OUT') {
                      return (
                        <div key={idx} className={`p-2 sm:p-3 rounded border ${isDarkMode
                          ? "bg-slate-800 border-amber-700"
                          : "bg-white border-amber-200"
                          }`}>
                          <p className={`font-semibold text-xs sm:text-sm mb-1 sm:mb-2 ${textPrimaryClass}`}>
                            Transaction {transaction.index} – Transferred OUT
                          </p>
                          <div className={`text-xs sm:text-sm space-y-1 ${textSecondaryClass}`}>
                            <p className="break-words"><span className="font-medium">Date & Time:</span> {transaction.timestamp}</p>
                            <p className="break-words">
                              <span className="font-medium">To:</span> <strong>{transaction.client}</strong>
                              (<code className={`px-1 rounded text-xs ${isDarkMode ? "bg-gray-700" : "bg-gray-200"}`}>
                                Part: {transaction.partNumber}
                              </code>)
                            </p>
                            <p className="break-words"><span className="font-medium">Target:</span> {transaction.targetPhase} &gt; {transaction.targetSubphase}</p>
                            <p className="break-words"><span className="font-medium">Source:</span> {transaction.sourcePhase} &gt; {transaction.sourceSubphase}</p>
                            <p><span className="font-medium">Quantity:</span> {transaction.qty} units</p>
                            <p className="break-words"><span className="font-medium">Note:</span> {transaction.note}</p>
                          </div>
                        </div>
                      );
                    } else if (transaction.type === 'IN') {
                      return (
                        <div key={idx} className={`p-2 sm:p-3 rounded border ${isDarkMode
                          ? "bg-slate-800 border-amber-700"
                          : "bg-white border-amber-200"
                          }`}>
                          <p className={`font-semibold text-xs sm:text-sm mb-1 sm:mb-2 ${textPrimaryClass}`}>
                            Transaction {transaction.index} – Received IN
                          </p>
                          <div className={`text-xs sm:text-sm space-y-1 ${textSecondaryClass}`}>
                            <p className="break-words"><span className="font-medium">Date & Time:</span> {transaction.timestamp}</p>
                            <p className="break-words">
                              <span className="font-medium">From:</span> <strong>{transaction.client}</strong>
                              (<code className={`px-1 rounded text-xs ${isDarkMode ? "bg-gray-700" : "bg-gray-200"}`}>
                                Part: {transaction.partNumber}
                              </code>)
                            </p>
                            <p className="break-words"><span className="font-medium">Source:</span> {transaction.sourcePhase} &gt; {transaction.sourceSubphase}</p>
                            <p className="break-words"><span className="font-medium">Target:</span> {transaction.targetPhase} &gt; {transaction.targetSubphase}</p>
                            <p><span className="font-medium">Quantity:</span> {transaction.qty} units</p>
                            <p className="break-words"><span className="font-medium">Note:</span> {transaction.note}</p>
                          </div>
                        </div>
                      );
                    } else if (transaction.type === 'OTHER') {
                      return (
                        <div key={idx} className={`p-2 sm:p-3 rounded border ${isDarkMode
                          ? "bg-slate-800 border-amber-700"
                          : "bg-white border-amber-200"
                          }`}>
                          <p className={`text-xs sm:text-sm break-words ${textSecondaryClass}`}>{transaction.text}</p>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            )}

            {/* Phase Details */}
            {itemDetails?.phases && itemDetails.phases.length > 0 && (
              <div className="mt-3 sm:mt-4">
                <h4 className={`text-xs sm:text-sm font-semibold mb-2 ${textSecondaryClass}`}>Phase Details</h4>
                <div className="space-y-2">
                  {itemDetails.phases.map((phase, index) => {
                    const phaseCompleted = phase.subphases?.filter(sp => sp.completed == 1).length || 0;
                    const phaseTotal = phase.subphases?.length || 0;
                    const phaseProgress = phaseTotal > 0 ? Math.round((phaseCompleted / phaseTotal) * 100) : 0;
                    const isExpanded = expandedPhases[phase.id];

                    return (
                      <div key={phase.id} className={`rounded-lg border ${isDarkMode ? "bg-slate-800 border-gray-700" : "bg-white border-gray-200"
                        }`}>
                        <div
                          className={`p-2 sm:p-3 cursor-pointer transition-colors ${isDarkMode ? "hover:bg-slate-700/50" : "hover:bg-gray-50"
                            }`}
                          onClick={() => togglePhase(phase.id)}
                        >
                          <div className="flex justify-between items-center mb-2 gap-2">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className={`text-xs font-medium flex-shrink-0 ${isDarkMode ? "text-gray-400" : "text-gray-500"
                                }`}>Phase {index + 1}</span>
                              <span className={`text-xs sm:text-sm font-semibold truncate ${textPrimaryClass}`}>
                                {phase.name}
                              </span>
                              {isExpanded ? (
                                <ChevronUp className={`w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 ${isDarkMode ? "text-gray-500" : "text-gray-500"
                                  }`} />
                              ) : (
                                <ChevronDown className={`w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 ${isDarkMode ? "text-gray-500" : "text-gray-500"
                                  }`} />
                              )}
                            </div>
                            <span className={`text-xs font-medium px-2 py-1 rounded flex-shrink-0 ${phaseProgress === 100
                              ? isDarkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-700'
                              : phaseProgress > 0
                                ? isDarkMode ? 'bg-yellow-900/30 text-yellow-300' : 'bg-yellow-100 text-yellow-700'
                                : isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-600'
                              }`}>
                              {phaseCompleted}/{phaseTotal} tasks
                            </span>
                          </div>
                          <div className={`w-full rounded-full h-1.5 ${isDarkMode ? "bg-gray-700" : "bg-gray-200"
                            }`}>
                            <div
                              className={`h-1.5 rounded-full transition-all duration-300 ${phaseProgress === 100 ? 'bg-green-500' :
                                phaseProgress > 0 ? 'bg-yellow-500' :
                                  'bg-gray-400'
                                }`}
                              style={{ width: `${phaseProgress}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Subphases */}
                        {isExpanded && phase.subphases && phase.subphases.length > 0 && (
                          <div className={`border-t p-2 sm:p-3 ${isDarkMode
                            ? "border-gray-700 bg-slate-900/50"
                            : "border-gray-200 bg-gray-50"
                            }`}>
                            <div className="space-y-2">
                              {phase.subphases.map((subphase, subIdx) => {
                                const isCompleted = subphase.completed == 1;
                                const minutes = Math.floor(subphase.time_duration / 60);
                                const seconds = subphase.time_duration % 60;
                                const actualMinutes = seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
                                const expectedMinutes = subphase.expected_duration;

                                return (
                                  <div key={subphase.id} className={`p-2 rounded border ${isCompleted
                                    ? isDarkMode
                                      ? 'bg-green-900/20 border-green-700'
                                      : 'bg-green-50 border-green-200'
                                    : isDarkMode
                                      ? 'bg-slate-800 border-gray-700'
                                      : 'bg-white border-gray-200'
                                    }`}>
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          {isCompleted ? (
                                            <CheckCircle className={`w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 ${isDarkMode ? "text-green-400" : "text-green-600"
                                              }`} />
                                          ) : (
                                            <div className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 flex-shrink-0 ${isDarkMode ? "border-gray-400" : "border-gray-400"
                                              }`}></div>
                                          )}
                                          <span className={`text-xs sm:text-sm font-medium break-words ${isCompleted ? textSecondaryClass : textPrimaryClass
                                            }`}>
                                            {subphase.name}
                                          </span>
                                        </div>

                                        <div className="ml-5 sm:ml-6 mt-1 space-y-1">
                                          {subphase.employee_name && (
                                            <div className="flex items-center gap-2">
                                              <Users className={`w-3 h-3 flex-shrink-0 ${isDarkMode ? "text-gray-500" : "text-gray-500"
                                                }`} />
                                              <span className={`text-xs break-words ${textSecondaryClass}`}>
                                                {subphase.employee_name}
                                              </span>
                                            </div>
                                          )}

                                          <div className="flex items-center gap-2">
                                            <Clock className={`w-3 h-3 flex-shrink-0 ${isDarkMode ? "text-gray-500" : "text-gray-500"
                                              }`} />
                                            <span className={`text-xs ${textSecondaryClass}`}>
                                              {isCompleted ? (
                                                <>
                                                  <span className="font-medium">{actualMinutes}</span>
                                                  {expectedMinutes !== '0' && (
                                                    <span className={isDarkMode ? "text-gray-500" : "text-gray-500"}>
                                                      {' '}(exp: {formatTime(expectedMinutes)})
                                                    </span>
                                                  )}
                                                </>
                                              ) : (
                                                <>Expected: {formatTime(expectedMinutes)}</>
                                              )}
                                            </span>
                                          </div>

                                          {subphase.expected_quantity > 0 && (
                                            <div className="flex items-center gap-2">
                                              <Package className={`w-3 h-3 flex-shrink-0 ${isDarkMode ? "text-gray-500" : "text-gray-500"
                                                }`} />
                                              <span className={`text-xs ${textSecondaryClass}`}>
                                                Qty: {subphase.current_completed_quantity || 0}/{subphase.expected_quantity}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      <span className={`text-xs font-medium px-2 py-1 rounded flex-shrink-0 ${isCompleted
                                        ? isDarkMode
                                          ? 'bg-green-900/30 text-green-300'
                                          : 'bg-green-100 text-green-700'
                                        : isDarkMode
                                          ? 'bg-gray-700 text-gray-400'
                                          : 'bg-gray-100 text-gray-600'
                                        }`}>
                                        {isCompleted ? 'Done' : 'Pending'}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Pagination Controls Component
function PaginationControls({ pagination, onPageChange, onItemsPerPageChange, isDarkMode, textSecondaryClass }) {
  const { current_page, per_page, total_pages, total_items, has_next, has_previous } = pagination;

  if (total_pages <= 1) return null;

  const pageNumbers = [];
  const maxVisiblePages = 5;

  let startPage = Math.max(1, current_page - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(total_pages, startPage + maxVisiblePages - 1);

  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-300'
      }`}>
      {/* Items per page */}
      <div className="flex items-center gap-2">
        <label className={`text-sm ${textSecondaryClass}`}>Items per page:</label>
        <select
          value={per_page}
          onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
          className={`px-3 py-1 rounded-lg border transition-colors ${isDarkMode
              ? 'bg-gray-800 border-gray-700 text-gray-200'
              : 'bg-white border-gray-300 text-gray-800'
            }`}
        >
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>

      {/* Page info */}
      <div className={`text-sm ${textSecondaryClass}`}>
        Showing {((current_page - 1) * per_page) + 1} to{' '}
        {Math.min(current_page * per_page, total_items)} of {total_items} items
      </div>

      {/* Page buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(current_page - 1)}
          disabled={!has_previous}
          className={`px-3 py-1 rounded-lg font-medium transition-colors ${has_previous
              ? isDarkMode
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
              : 'opacity-50 cursor-not-allowed bg-gray-600 text-gray-400'
            }`}
        >
          Previous
        </button>

        {startPage > 1 && (
          <>
            <button
              onClick={() => onPageChange(1)}
              className={`px-3 py-1 rounded-lg transition-colors ${isDarkMode
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                }`}
            >
              1
            </button>
            {startPage > 2 && <span className={textSecondaryClass}>...</span>}
          </>
        )}

        {pageNumbers.map((pageNum) => (
          <button
            key={pageNum}
            onClick={() => onPageChange(pageNum)}
            className={`px-3 py-1 rounded-lg font-medium transition-colors ${pageNum === current_page
                ? isDarkMode
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-500 text-white'
                : isDarkMode
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
              }`}
          >
            {pageNum}
          </button>
        ))}

        {endPage < total_pages && (
          <>
            {endPage < total_pages - 1 && <span className={textSecondaryClass}>...</span>}
            <button
              onClick={() => onPageChange(total_pages)}
              className={`px-3 py-1 rounded-lg transition-colors ${isDarkMode
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                }`}
            >
              {total_pages}
            </button>
          </>
        )}

        <button
          onClick={() => onPageChange(current_page + 1)}
          disabled={!has_next}
          className={`px-3 py-1 rounded-lg font-medium transition-colors ${has_next
              ? isDarkMode
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
              : 'opacity-50 cursor-not-allowed bg-gray-600 text-gray-400'
            }`}
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default Dashboard;