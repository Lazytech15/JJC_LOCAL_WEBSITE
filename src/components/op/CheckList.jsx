import { useState, useEffect } from 'react';
import { Clock, User, Play, CheckCircle, Flag, StopCircle, Calendar, RotateCcw } from 'lucide-react';

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
  loadData
}) {
  const [itemPriorities, setItemPriorities] = useState({});
  const [currentTimes, setCurrentTimes] = useState({});

  // Load saved priorities from localStorage
  useEffect(() => {
    try {
      const savedPriorities = localStorage.getItem('itemPriorities');
      if (savedPriorities) {
        setItemPriorities(JSON.parse(savedPriorities));
      }
    } catch (err) {
      console.error('Failed to load priorities:', err);
    }
  }, []);

  // Save priorities to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('itemPriorities', JSON.stringify(itemPriorities));
    } catch (err) {
      console.error('Failed to save priorities:', err);
    }
  }, [itemPriorities]);

  // Update current time every second for items with active durations
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const newTimes = {};
      
      items.forEach(item => {
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
    items.forEach(item => {
      const progress = calculateItemProgress(item);
      
      // If item is 100% complete and has a start time but no end time, stop it
      if (progress === 100 && item.start_time && !item.end_time) {
        handleStopItem(item.part_number);
      }
    });
  }, [items]);

  const handleStartItem = async (partNumber) => {
    try {
      await apiService.operations.startItemProcess(partNumber);
      await loadData(); // Reload to get updated times
    } catch (error) {
      console.error('Error starting item:', error);
      alert('Failed to start item: ' + error.message);
    }
  };

  const handleStopItem = async (partNumber) => {
    try {
      await apiService.operations.stopItemProcess(partNumber);
      await loadData(); // Reload to get updated times
    } catch (error) {
      console.error('Error stopping item:', error);
      alert('Failed to stop item: ' + error.message);
    }
  };

  const handleResetItem = async (partNumber) => {
    if (window.confirm('Reset process times for this item?')) {
      try {
        await apiService.operations.resetItemProcess(partNumber);
        await loadData(); // Reload to get updated times
      } catch (error) {
        console.error('Error resetting item:', error);
        alert('Failed to reset item: ' + error.message);
      }
    }
  };

  const getItemElapsedTime = (item) => {
    if (!item.start_time) return 0;
    
    const start = new Date(item.start_time);
    const end = item.end_time ? new Date(item.end_time) : new Date();
    return Math.floor((end - start) / 1000); // Return seconds
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

const formatDateTime = (isoString) => {
    if (!isoString) return 'Not started';
    return new Date(isoString).toLocaleString('en-PH', { 
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const setPriority = (itemPartNumber, priority) => {
    setItemPriorities(prev => ({
      ...prev,
      [itemPartNumber]: priority
    }));
  };

  const getPriority = (itemPartNumber) => {
    return itemPriorities[itemPartNumber] || 'medium';
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'high': return 'text-red-500 bg-red-500/10 border-red-500';
      case 'medium': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500';
      case 'low': return 'text-green-500 bg-green-500/10 border-green-500';
      default: return 'text-gray-500 bg-gray-500/10 border-gray-500';
    }
  };

  const getPriorityLabel = (priority) => {
    switch(priority) {
      case 'high': return 'High Priority';
      case 'medium': return 'Medium Priority';
      case 'low': return 'Low Priority';
      default: return 'No Priority';
    }
  };

  // Separate completed and in-progress items
  const completedItems = items.filter(item => calculateItemProgress(item) === 100);
  const inProgressItems = items.filter(item => calculateItemProgress(item) < 100);

  // Sort in-progress items by priority
  const sortedInProgressItems = [...inProgressItems].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const aPriority = getPriority(a.part_number);
    const bPriority = getPriority(b.part_number);
    return priorityOrder[aPriority] - priorityOrder[bPriority];
  });

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-6">Progress Checklist</h2>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-300">In Progress</h3>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">{inProgressItems.length}</p>
        </div>
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-green-700 dark:text-green-300">Completed</h3>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">{completedItems.length}</p>
        </div>
      </div>
      
      {/* Barcode Scanner Modal */}
      {scanningFor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">Scan Employee Barcode</h3>
            <input
              type="text"
              placeholder="Enter barcode or employee ID"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && submitBarcode()}
              autoFocus
              className="w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-500 mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={submitBarcode}
                className="flex-1 bg-slate-600 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors font-medium"
              >
                Submit
              </button>
              <button
                onClick={() => {
                  setScanningFor(null)
                  setBarcodeInput("")
                }}
                className="flex-1 bg-gray-500 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {items.length > 0 ? (
        <div className="space-y-8">
          {/* In Progress Items */}
          {inProgressItems.length > 0 && (
            <div>
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                <Clock size={20} />
                In Progress Items ({inProgressItems.length})
              </h3>
              <div className="space-y-4">
                {sortedInProgressItems.map(item => {
                  const itemKey = item.part_number || item.id;
                  const priority = getPriority(item.part_number);
                  const elapsedSeconds = getItemElapsedTime(item);
                  const progress = calculateItemProgress(item);
                  
                  return (
                    <div key={itemKey} className="bg-white/5 dark:bg-black/10 rounded-lg border border-gray-300/20 dark:border-gray-700/20 overflow-hidden">
                      {/* Item Header */}
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div 
                            onClick={() => toggleItemExpansion(item.part_number)}
                            className="flex items-center gap-3 cursor-pointer flex-1"
                          >
                            <span className="text-xl">{expandedItems[item.part_number] ? '▼' : '▶'}</span>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-gray-800 dark:text-gray-200">{item.name}</h3>
                                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${getPriorityColor(priority)}`}>
                                  <Flag size={12} />
                                  {getPriorityLabel(priority)}
                                </div>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Part #: {item.part_number} • {item.phases?.length || 0} phases
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                              {['high', 'medium', 'low'].map(p => (
                                <button
                                  key={p}
                                  onClick={() => setPriority(item.part_number, p)}
                                  className={`px-2 py-1 text-xs rounded transition-colors ${
                                    priority === p 
                                      ? getPriorityColor(p) 
                                      : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                                  }`}
                                  title={`Set ${p} priority`}
                                >
                                  <Flag size={14} />
                                </button>
                              ))}
                            </div>
                            <span className="text-lg font-bold text-gray-800 dark:text-gray-200">{progress}%</span>
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
                              <Clock size={16} className="text-slate-600 dark:text-slate-400" />
                              <span className="text-lg font-mono font-bold text-gray-800 dark:text-gray-200">
                                {formatTime(elapsedSeconds)}
                              </span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Start: </span>
                              <span className="text-gray-800 dark:text-gray-200 font-medium">
                                {formatDateTime(item.start_time)}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">End: </span>
                              <span className="text-gray-800 dark:text-gray-200 font-medium">
                                {item.end_time ? formatDateTime(item.end_time) : 'In progress'}
                              </span>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            {!item.start_time ? (
                              <button
                                onClick={() => handleStartItem(item.part_number)}
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
                                title={progress < 100 ? "Complete all tasks to stop" : "Stop process"}
                              >
                                <StopCircle size={16} />
                                {progress === 100 ? 'Stop Process' : 'Complete to Stop'}
                              </button>
                            ) : (
                              <div className="flex-1 flex items-center justify-center gap-2 bg-green-600/80 text-white px-3 py-2 rounded-lg text-sm font-medium">
                                <CheckCircle size={16} />
                                Process Completed
                              </div>
                            )}
                            {item.start_time && (
                              <button
                                onClick={() => handleResetItem(item.part_number)}
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
                                <div key={phaseKey} className="bg-white/5 dark:bg-black/10 rounded-lg border border-gray-300/10 dark:border-gray-700/10">
                                  {/* Phase Header */}
                                  <div 
                                    onClick={() => togglePhaseExpansion(phase.id)}
                                    className="p-3 cursor-pointer hover:bg-white/5 dark:hover:bg-black/10 transition-colors"
                                  >
                                    <div className="flex justify-between items-center">
                                      <div className="flex items-center gap-2">
                                        <span>{expandedPhases[phase.id] ? '▼' : '▶'}</span>
                                        <span className="font-medium text-gray-800 dark:text-gray-200">
                                          {phase.name}
                                          {isFirstPhase && <span className="ml-2 text-xs bg-blue-500 text-white px-2 py-0.5 rounded">Phase 1</span>}
                                        </span>
                                        <span className="text-sm text-gray-600 dark:text-gray-400">({phase.subphases?.length || 0} sub-phases)</span>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <div className="w-32 bg-gray-300 dark:bg-gray-700 rounded-full h-2">
                                          <div
                                            className="bg-slate-600 dark:bg-slate-400 h-2 rounded-full transition-all duration-300"
                                            style={{ width: `${calculatePhaseProgress(phase)}%` }}
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
                                      {phase.subphases && phase.subphases.length > 0 ? (
                                        phase.subphases.map(subPhase => {
                                          const subPhaseKey = subPhase.id;
                                          return (
                                            <div key={subPhaseKey} className="bg-white/5 dark:bg-black/10 p-3 rounded-lg border border-gray-300/10 dark:border-gray-700/10">
                                              <div className="flex items-start gap-3">
                                                <input
                                                  type="checkbox"
                                                  checked={subPhase.completed == 1}
                                                  onChange={() => {
                                                    // If marking as complete, show confirmation
                                                    if (subPhase.completed != 1) {
                                                      if (window.confirm(`Mark "${subPhase.name}" as complete?`)) {
                                                        toggleSubPhase(item.part_number, phase.id, subPhase.id, subPhase.completed == 1)
                                                      }
                                                    } else {
                                                      // If unmarking, show confirmation
                                                      if (window.confirm(`Mark "${subPhase.name}" as incomplete?`)) {
                                                        toggleSubPhase(item.part_number, phase.id, subPhase.id, subPhase.completed == 1)
                                                      }
                                                    }
                                                  }}
                                                  className="mt-1 w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-slate-600 focus:ring-slate-500 cursor-pointer"
                                                />
                                                <div className="flex-1">
                                                  <div className="flex items-start justify-between">
                                                    <p className={`text-gray-800 dark:text-gray-200 font-medium ${subPhase.completed == 1 ? 'line-through opacity-60' : ''}`}>
                                                      {subPhase.name}
                                                    </p>
                                                    {subPhase.completed == 1 && (
                                                      <CheckCircle size={18} className="text-green-500 flex-shrink-0 ml-2" />
                                                    )}
                                                  </div>
                                                  
                                                  {subPhase.condition && (
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 italic mt-1">
                                                      📋 {subPhase.condition}
                                                    </p>
                                                  )}
                                                  
                                                  {/* Duration and Hours */}
                                                  <div className="mt-2 flex flex-wrap gap-2 items-center">
                                                    <span className="text-xs bg-blue-500/20 text-blue-700 dark:text-blue-300 px-2 py-1 rounded flex items-center gap-1">
                                                      <Clock size={12} />
                                                      Expected: {subPhase.expected_duration}h
                                                    </span>
                                                    {subPhase.actual_hours > 0 && (
                                                      <span className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${
                                                        subPhase.actual_hours <= subPhase.expected_duration 
                                                          ? 'bg-green-500/20 text-green-700 dark:text-green-300'
                                                          : 'bg-red-500/20 text-red-700 dark:text-red-300'
                                                      }`}>
                                                        <Clock size={12} />
                                                        Actual: {subPhase.actual_hours}h
                                                        {subPhase.actual_hours > subPhase.expected_duration && ' ⚠️'}
                                                      </span>
                                                    )}
                                                  </div>

                                                  {/* Employee Info */}
                                                  {subPhase.employee_barcode && (
                                                    <div className="mt-2 text-xs bg-slate-500/20 text-slate-700 dark:text-slate-300 px-2 py-1 rounded inline-flex items-center gap-1">
                                                      <User size={12} />
                                                      {subPhase.employee_name || 'Unknown'} ({subPhase.employee_barcode})
                                                    </div>
                                                  )}

                                                  {/* Input Fields */}
                                                  <div className="mt-3 space-y-2">
                                                    <div className="flex gap-2 items-center">
                                                      <input
                                                        type="number"
                                                        step="0.5"
                                                        placeholder="Actual hours"
                                                        value={subPhase.actual_hours || ""}
                                                        onChange={(e) => updateActualHours(item.part_number, phase.id, subPhase.id, e.target.value)}
                                                        className="flex-1 px-3 py-1.5 text-sm rounded bg-white/10 dark:bg-black/20 border border-gray-300/20 dark:border-gray-700/20 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-500"
                                                      />
                                                      <button
                                                        onClick={() => handleBarcodeScan(item.part_number, phase.id, subPhase.id)}
                                                        className="px-3 py-1.5 text-sm bg-slate-600 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded transition-colors flex items-center gap-1"
                                                      >
                                                        <User size={14} />
                                                        Assign
                                                      </button>
                                                    </div>
                                                  </div>

                                                  {/* Completed Timestamp */}
                                                  {subPhase.completed_at && (
                                                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 flex items-center gap-1">
                                                      <CheckCircle size={12} />
                                                      Completed: {new Date(subPhase.completed_at).toLocaleString()}
                                                    </p>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })
                                      ) : (
                                        <p className="text-gray-600 dark:text-gray-400 text-sm py-2">No sub-phases added yet.</p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-gray-600 dark:text-gray-400 py-4">No phases added yet. Go to "Add Items" to add phases.</p>
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
                {completedItems.map(item => {
                  const itemKey = item.part_number || item.id;
                  const elapsedSeconds = getItemElapsedTime(item);
                  
                  return (
                    <div key={itemKey} className="bg-green-500/5 dark:bg-green-500/10 rounded-lg border border-green-500/20 dark:border-green-500/30 overflow-hidden">
                      {/* Item Header */}
                      <div className="p-4">
                        <div 
                          onClick={() => toggleItemExpansion(item.part_number)}
                          className="cursor-pointer"
                        >
                          <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center gap-3">
                              <span className="text-xl">{expandedItems[item.part_number] ? '▼' : '▶'}</span>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold text-gray-800 dark:text-gray-200">{item.name}</h3>
                                  <CheckCircle size={16} className="text-green-500" />
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  Part #: {item.part_number} • {item.phases?.length || 0} phases
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-lg font-bold text-green-600 dark:text-green-400">100%</span>
                            </div>
                          </div>
                        </div>

                        {/* Completed Duration Summary */}
                        {item.start_time && (
                          <div className="bg-green-500/10 dark:bg-green-500/20 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-semibold text-green-700 dark:text-green-300 flex items-center gap-2">
                                <CheckCircle size={16} />
                                Process Completed
                              </span>
                              <div className="flex items-center gap-2">
                                <Clock size={16} className="text-green-600 dark:text-green-400" />
                                <span className="text-lg font-mono font-bold text-green-700 dark:text-green-300">
                                  {formatTime(elapsedSeconds)}
                                </span>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Started: </span>
                                <span className="text-gray-800 dark:text-gray-200 font-medium">
                                  {formatDateTime(item.start_time)}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Completed: </span>
                                <span className="text-gray-800 dark:text-gray-200 font-medium">
                                  {formatDateTime(item.end_time)}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Phases - Collapsed view */}
                      {expandedItems[item.part_number] && (
                        <div className="px-4 pb-4 space-y-3">
                          {item.phases && item.phases.length > 0 ? (
                            item.phases.map((phase) => {
                              const phaseKey = phase.id;
                              
                              return (
                                <div key={phaseKey} className="bg-white/5 dark:bg-black/10 rounded-lg border border-gray-300/10 dark:border-gray-700/10">
                                  <div className="p-3">
                                    <div className="flex justify-between items-center">
                                      <span className="font-medium text-gray-800 dark:text-gray-200">{phase.name}</span>
                                      <span className="text-sm font-semibold text-green-600 dark:text-green-400">100%</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-gray-600 dark:text-gray-400 py-4">No phases.</p>
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
        <p className="text-gray-600 dark:text-gray-400 text-center py-8">No items yet. Go to "Add Items" to create your first item.</p>
      )}
    </div>
  )
}

export default Checklist