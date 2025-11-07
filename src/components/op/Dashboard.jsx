import { useState, useEffect } from 'react';
import { PieChart, Pie, BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, ResponsiveContainer } from 'recharts';
import { X, TrendingUp, Clock, Users, CheckCircle, AlertCircle, Activity } from 'lucide-react';

// Enhanced Dashboard Component
function Dashboard({ items, calculateItemProgress, loading, apiService }) {
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemDetails, setItemDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const getStatistics = () => {
    const totalItems = items.length;
    const completedItems = items.filter(item => calculateItemProgress(item) === 100).length;
    const inProgressItems = items.filter(item => {
      const progress = calculateItemProgress(item);
      return progress > 0 && progress < 100;
    }).length;
    const notStartedItems = items.filter(item => calculateItemProgress(item) === 0).length;
    
    return {
      totalItems,
      completedItems,
      inProgressItems,
      notStartedItems,
      overallProgress: totalItems > 0 ? Math.round(items.reduce((sum, item) => sum + calculateItemProgress(item), 0) / totalItems) : 0
    };
  };

  const stats = getStatistics();

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
    setSelectedItem(item);
    loadItemDetails(item);
  };

  const closeModal = () => {
    setSelectedItem(null);
    setItemDetails(null);
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600 dark:border-slate-400 mx-auto"></div>
        <p className="text-gray-600 dark:text-gray-400 mt-4">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-6">Operations Dashboard</h2>
      
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-5 rounded-lg shadow-md text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium opacity-90">Total Items</h3>
              <p className="text-3xl font-bold mt-2">{stats.totalItems}</p>
            </div>
            <Activity className="w-8 h-8 opacity-80" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 p-5 rounded-lg shadow-md text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium opacity-90">Completed</h3>
              <p className="text-3xl font-bold mt-2">{stats.completedItems}</p>
            </div>
            <CheckCircle className="w-8 h-8 opacity-80" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 p-5 rounded-lg shadow-md text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium opacity-90">In Progress</h3>
              <p className="text-3xl font-bold mt-2">{stats.inProgressItems}</p>
            </div>
            <Clock className="w-8 h-8 opacity-80" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-gray-500 to-gray-600 p-5 rounded-lg shadow-md text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium opacity-90">Not Started</h3>
              <p className="text-3xl font-bold mt-2">{stats.notStartedItems}</p>
            </div>
            <AlertCircle className="w-8 h-8 opacity-80" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-5 rounded-lg shadow-md text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium opacity-90">Overall Progress</h3>
              <p className="text-3xl font-bold mt-2">{stats.overallProgress}%</p>
            </div>
            <TrendingUp className="w-8 h-8 opacity-80" />
          </div>
        </div>
      </div>

      {/* Items Progress List */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Items Overview</h3>
        {items.length > 0 ? (
          items.map(item => {
            const progress = calculateItemProgress(item);
            const itemKey = item.part_number || item.id;
            return (
              <div 
                key={itemKey} 
                onClick={() => handleItemClick(item)}
                className="bg-white/5 dark:bg-black/10 rounded-lg p-4 border border-gray-300/20 dark:border-gray-700/20 cursor-pointer hover:bg-white/10 dark:hover:bg-black/20 transition-all duration-200 hover:shadow-lg"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200">{item.name}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{item.description}</p>
                    {item.part_number && (
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Part #: {item.part_number}</p>
                    )}
                    {item.client_name && (
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Client: {item.client_name}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      progress === 100 ? 'bg-green-500 text-white' :
                      progress > 0 ? 'bg-yellow-500 text-white' :
                      'bg-gray-500 text-white'
                    }`}>
                      {progress}%
                    </span>
                    {item.priority && (
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        item.priority === 'High' ? 'bg-red-500/20 text-red-700 dark:text-red-300' :
                        item.priority === 'Medium' ? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300' :
                        'bg-blue-500/20 text-blue-700 dark:text-blue-300'
                      }`}>
                        {item.priority}
                      </span>
                    )}
                  </div>
                </div>
                <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      progress === 100 ? 'bg-green-500' :
                      progress > 0 ? 'bg-yellow-500' :
                      'bg-gray-500'
                    }`}
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 flex justify-between">
                  <span>{item.phase_count || item.phases?.length || 0} phases</span>
                  <span>Created {new Date(item.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-gray-600 dark:text-gray-400 text-center py-8">No items yet. Go to "Add Items" to create your first item.</p>
        )}
      </div>

      {/* Item Details Modal */}
      {selectedItem && (
        <ItemDetailsModal 
          item={selectedItem}
          itemDetails={itemDetails}
          loadingDetails={loadingDetails}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

// Item Details Modal Component
function ItemDetailsModal({ item, itemDetails, loadingDetails, onClose }) {
  const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899'];

  const getChartData = () => {
    if (!itemDetails?.phases) return null;

    // Phase completion data for pie chart
    const phaseStatusData = itemDetails.phases.map(phase => {
      const completed = phase.subphases?.filter(sp => sp.completed == 1).length || 0;
      const total = phase.subphases?.length || 0;
      return {
        name: phase.name,
        completed,
        pending: total - completed,
        total
      };
    });

    // Time tracking data for bar chart
    const timeData = itemDetails.phases.map(phase => {
      const expected = phase.subphases?.reduce((sum, sp) => sum + parseFloat(sp.expected_duration || 0), 0) || 0;
      const actual = phase.subphases?.reduce((sum, sp) => sum + parseFloat(sp.actual_hours || 0), 0) || 0;
      return {
        name: phase.name.length > 15 ? phase.name.substring(0, 15) + '...' : phase.name,
        expected: parseFloat(expected.toFixed(2)),
        actual: parseFloat(actual.toFixed(2))
      };
    });

    // Progress over time (area chart) - simulated timeline
    const progressTimeline = itemDetails.phases.map((phase, index) => {
      const completed = phase.subphases?.filter(sp => sp.completed == 1).length || 0;
      const total = phase.subphases?.length || 0;
      const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
      return {
        phase: `Phase ${index + 1}`,
        progress
      };
    });

    // Employee workload (column chart)
    const employeeData = {};
    itemDetails.phases?.forEach(phase => {
      phase.subphases?.forEach(subphase => {
        if (subphase.employee_name) {
          if (!employeeData[subphase.employee_name]) {
            employeeData[subphase.employee_name] = {
              name: subphase.employee_name,
              tasks: 0,
              hours: 0
            };
          }
          employeeData[subphase.employee_name].tasks += 1;
          employeeData[subphase.employee_name].hours += parseFloat(subphase.actual_hours || 0);
        }
      });
    });
    const employeeChartData = Object.values(employeeData).map(emp => ({
      name: emp.name.length > 12 ? emp.name.substring(0, 12) + '...' : emp.name,
      tasks: emp.tasks,
      hours: parseFloat(emp.hours.toFixed(2))
    }));

    // Quantity tracking (line chart)
    const quantityData = itemDetails.phases.map((phase, index) => {
      const expected = phase.subphases?.reduce((sum, sp) => sum + parseInt(sp.expected_quantity || 0), 0) || 0;
      const completed = phase.subphases?.reduce((sum, sp) => sum + parseInt(sp.current_completed_quantity || 0), 0) || 0;
      return {
        phase: `P${index + 1}`,
        expected,
        completed
      };
    });

    return {
      phaseStatusData,
      timeData,
      progressTimeline,
      employeeChartData,
      quantityData
    };
  };

  const chartData = getChartData();

  // Calculate summary stats
  const totalPhases = itemDetails?.phases?.length || 0;
  const totalTasks = itemDetails?.phases?.reduce((sum, p) => sum + (p.subphases?.length || 0), 0) || 0;
  const completedTasks = itemDetails?.phases?.reduce((sum, p) => sum + (p.subphases?.filter(sp => sp.completed == 1).length || 0), 0) || 0;
  const totalExpectedHours = itemDetails?.phases?.reduce((sum, p) => 
    sum + (p.subphases?.reduce((s, sp) => s + parseFloat(sp.expected_duration || 0), 0) || 0), 0) || 0;
  const totalActualHours = itemDetails?.phases?.reduce((sum, p) => 
    sum + (p.subphases?.reduce((s, sp) => s + parseFloat(sp.actual_hours || 0), 0) || 0), 0) || 0;
  const efficiency = totalExpectedHours > 0 ? ((totalExpectedHours / totalActualHours) * 100).toFixed(1) : 'N/A';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-slate-600 to-slate-700 text-white p-6 rounded-t-xl flex justify-between items-start z-10">
          <div>
            <h2 className="text-2xl font-bold">{item.name}</h2>
            <p className="text-slate-200 mt-1">{item.description}</p>
            {item.part_number && (
              <p className="text-slate-300 text-sm mt-2">Part Number: {item.part_number}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {loadingDetails ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600 mx-auto"></div>
            <p className="text-gray-600 dark:text-gray-400 mt-4">Loading details...</p>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
                <p className="text-sm text-blue-700 dark:text-blue-300">Total Phases</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{totalPhases}</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-4 rounded-lg border border-green-200 dark:border-green-700">
                <p className="text-sm text-green-700 dark:text-green-300">Tasks</p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">{completedTasks}/{totalTasks}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-4 rounded-lg border border-purple-200 dark:border-purple-700">
                <p className="text-sm text-purple-700 dark:text-purple-300">Hours</p>
                <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{totalActualHours.toFixed(1)}</p>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 p-4 rounded-lg border border-orange-200 dark:border-orange-700">
                <p className="text-sm text-orange-700 dark:text-orange-300">Efficiency</p>
                <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">{efficiency}%</p>
              </div>
            </div>

            {/* Additional Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {item.client_name && (
                <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Client</p>
                  <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">{item.client_name}</p>
                </div>
              )}
              {item.priority && (
                <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Priority</p>
                  <p className={`text-lg font-semibold ${
                    item.priority === 'High' ? 'text-red-600' :
                    item.priority === 'Medium' ? 'text-yellow-600' :
                    'text-blue-600'
                  }`}>{item.priority}</p>
                </div>
              )}
            </div>

            {item.remarks && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-700">
                <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300 mb-2">Remarks</p>
                <p className="text-gray-700 dark:text-gray-300">{item.remarks}</p>
              </div>
            )}

            {chartData && (
              <>
                {/* Phase Status - Pie Chart */}
                <div className="bg-white dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                    <div className="w-1 h-6 bg-blue-500 rounded"></div>
                    Phase Completion Status
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={chartData.phaseStatusData.map(d => ({ name: d.name, value: d.completed }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {chartData.phaseStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Time Tracking - Bar Chart */}
                <div className="bg-white dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                    <div className="w-1 h-6 bg-green-500 rounded"></div>
                    Time Tracking: Expected vs Actual Hours
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData.timeData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                      <XAxis dataKey="name" stroke="#6b7280" />
                      <YAxis stroke="#6b7280" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                        labelStyle={{ color: '#fff' }}
                      />
                      <Legend />
                      <Bar dataKey="expected" fill="#3b82f6" name="Expected Hours" />
                      <Bar dataKey="actual" fill="#10b981" name="Actual Hours" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Progress Timeline - Area Chart */}
                <div className="bg-white dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                    <div className="w-1 h-6 bg-purple-500 rounded"></div>
                    Progress Timeline by Phase
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={chartData.progressTimeline}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                      <XAxis dataKey="phase" stroke="#6b7280" />
                      <YAxis stroke="#6b7280" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                        labelStyle={{ color: '#fff' }}
                      />
                      <Area type="monotone" dataKey="progress" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} name="Progress %" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Employee Workload - Column Chart */}
                {chartData.employeeChartData.length > 0 && (
                  <div className="bg-white dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                      <div className="w-1 h-6 bg-orange-500 rounded"></div>
                      Employee Workload
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={chartData.employeeChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                        <XAxis dataKey="name" stroke="#6b7280" />
                        <YAxis yAxisId="left" stroke="#6b7280" />
                        <YAxis yAxisId="right" orientation="right" stroke="#6b7280" />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                          labelStyle={{ color: '#fff' }}
                        />
                        <Legend />
                        <Bar yAxisId="left" dataKey="tasks" fill="#f59e0b" name="Tasks Assigned" />
                        <Bar yAxisId="right" dataKey="hours" fill="#ef4444" name="Hours Worked" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Quantity Progress - Line Chart */}
                <div className="bg-white dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                    <div className="w-1 h-6 bg-teal-500 rounded"></div>
                    Quantity Tracking by Phase
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData.quantityData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                      <XAxis dataKey="phase" stroke="#6b7280" />
                      <YAxis stroke="#6b7280" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                        labelStyle={{ color: '#fff' }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="expected" stroke="#3b82f6" strokeWidth={2} name="Expected Qty" />
                      <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} name="Completed Qty" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;