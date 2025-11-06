import { useState, useEffect, useRef } from 'react';
import { Trash2, Plus, Copy, Search, Calendar } from 'lucide-react';

function AddItems({ 
  items,
  submitting,
  apiService
}) {
  const [partNumber, setPartNumber] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [phases, setPhases] = useState([]);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [batchNumber, setBatchNumber] = useState('');
  const [autoBatch, setAutoBatch] = useState(true);
  
  // Dropdown states
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
  const [filteredItems, setFilteredItems] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const dropdownRef = useRef(null);

  // Generate batch number automatically
  useEffect(() => {
    if (autoBatch && partNumber) {
      const timestamp = new Date().getTime();
      const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      setBatchNumber(`BATCH-${timestamp}-${randomSuffix}`);
    }
  }, [partNumber, autoBatch]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowTemplateDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter items based on item name search only
  useEffect(() => {
    const searchTerm = itemName.trim().toLowerCase();
    
    if (searchTerm.length >= 2) {
      const matches = items.filter(item => 
        item.name?.toLowerCase().includes(searchTerm)
      );
      setFilteredItems(matches);
      setShowTemplateDropdown(matches.length > 0);
    } else {
      setFilteredItems([]);
      setShowTemplateDropdown(false);
    }
  }, [itemName, items]);

  const loadTemplateFromItem = async (item) => {
    setLoadingTemplate(true);
    setShowTemplateDropdown(false);
    setSelectedTemplateId(item.id);
    
    try {
      // Fetch full item details with phases and subphases
      const fullItem = await apiService.operations.getItem(item.part_number);
      
      // Load the base part number and name, but let user modify if needed
      setPartNumber(fullItem.part_number || '');
      setItemName(fullItem.name || '');
      setItemDescription(fullItem.description || '');
      
      // Load phases and subphases
      if (fullItem.phases && fullItem.phases.length > 0) {
        const loadedPhases = fullItem.phases.map(phase => ({
          id: Date.now() + Math.random(), // Temporary ID for UI
          name: phase.name || '',
          subphases: phase.subphases?.map(sub => ({
            id: Date.now() + Math.random(),
            name: sub.name || '',
            condition: sub.condition || '',
            expectedDuration: sub.expected_duration || ''
          })) || []
        }));
        setPhases(loadedPhases);
      }
    } catch (error) {
      console.error('Error loading template:', error);
      alert('Error loading template: ' + error.message);
    } finally {
      setLoadingTemplate(false);
    }
  };

  const addNewPhase = () => {
    setPhases([...phases, {
      id: Date.now(),
      name: '',
      subphases: []
    }]);
  };

  const updatePhase = (phaseId, field, value) => {
    setPhases(phases.map(phase => 
      phase.id === phaseId ? { ...phase, [field]: value } : phase
    ));
  };

  const removePhase = (phaseId) => {
    setPhases(phases.filter(phase => phase.id !== phaseId));
  };

  const addSubphaseToPhase = (phaseId) => {
    setPhases(phases.map(phase => 
      phase.id === phaseId 
        ? { 
            ...phase, 
            subphases: [...phase.subphases, {
              id: Date.now(),
              name: '',
              condition: '',
              expectedDuration: ''
            }]
          }
        : phase
    ));
  };

  const updateSubphase = (phaseId, subphaseId, field, value) => {
    setPhases(phases.map(phase => 
      phase.id === phaseId 
        ? {
            ...phase,
            subphases: phase.subphases.map(sub =>
              sub.id === subphaseId ? { ...sub, [field]: value } : sub
            )
          }
        : phase
    ));
  };

  const removeSubphase = (phaseId, subphaseId) => {
    setPhases(phases.map(phase => 
      phase.id === phaseId 
        ? {
            ...phase,
            subphases: phase.subphases.filter(sub => sub.id !== subphaseId)
          }
        : phase
    ));
  };

  const handleSave = async () => {
    if (!partNumber.trim()) {
      alert('Part Number is required');
      return;
    }
    if (!itemName.trim()) {
      alert('Item Name is required');
      return;
    }
    if (!batchNumber.trim()) {
      alert('Batch Number is required');
      return;
    }

    // Validate phases
    const validPhases = phases.filter(p => p.name.trim());
    if (validPhases.length === 0) {
      alert('Please add at least one phase');
      return;
    }

    // Create unique part number with batch
    const uniquePartNumber = `${partNumber.trim()}-${batchNumber.trim()}`;

    const itemData = {
      part_number: uniquePartNumber,
      name: itemName.trim(),
      description: itemDescription.trim(),
      phases: validPhases.map(phase => ({
        name: phase.name.trim(),
        subphases: phase.subphases
          .filter(sub => sub.name.trim())
          .map(sub => ({
            name: sub.name.trim(),
            condition: sub.condition.trim(),
            expected_duration: parseFloat(sub.expectedDuration) || 0
          }))
      }))
    };

    try {
      await apiService.operations.createItemWithStructure(itemData);
      
      // Clear form after successful save
      setPartNumber('');
      setItemName('');
      setItemDescription('');
      setPhases([]);
      setBatchNumber('');
      setSelectedTemplateId(null);
      
      alert('Item saved successfully!');
      window.location.reload(); // Reload to refresh items list
    } catch (error) {
      console.error('Error saving item:', error);
      alert('Error saving item: ' + error.message);
    }
  };

  const handleClear = () => {
    if (confirm('Clear all fields?')) {
      setPartNumber('');
      setItemName('');
      setItemDescription('');
      setPhases([]);
      setBatchNumber('');
      setSelectedTemplateId(null);
      setShowTemplateDropdown(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Add Item with Phases & Sub-Phases</h2>
        {loadingTemplate && (
          <span className="text-sm text-blue-500 flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            Loading template...
          </span>
        )}
      </div>

      {/* Template Selection Hint */}
      {items.length > 0 && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
          <p className="text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
            <Copy size={16} />
            <strong>Tip:</strong> Start typing an item name to use an existing item as a template. Each new item will have a unique batch number.
          </p>
        </div>
      )}
      
      {/* Item Basic Info */}
      <div className="bg-white/5 dark:bg-black/10 rounded-lg p-6 border border-gray-300/20 dark:border-gray-700/20">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Item Information</h3>
        <div className="space-y-3">
          {/* Part Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Part Number * <span className="text-xs text-gray-500">(Base part number)</span>
            </label>
            <input
              type="text"
              placeholder="Enter base part number (e.g., PN-001)"
              value={partNumber}
              onChange={(e) => setPartNumber(e.target.value)}
              disabled={submitting}
              className="w-full px-4 py-2 rounded-lg bg-white/10 dark:bg-black/20 border border-gray-300/20 dark:border-gray-700/20 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>

          {/* Batch Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
              <Calendar size={16} />
              Batch Number * 
              <span className="text-xs text-gray-500">(Unique identifier for this batch)</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Batch number"
                value={batchNumber}
                onChange={(e) => {
                  setBatchNumber(e.target.value);
                  setAutoBatch(false);
                }}
                disabled={submitting || autoBatch}
                className="flex-1 px-4 py-2 rounded-lg bg-white/10 dark:bg-black/20 border border-gray-300/20 dark:border-gray-700/20 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
              <button
                onClick={() => setAutoBatch(!autoBatch)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  autoBatch 
                    ? 'bg-green-600 hover:bg-green-700 text-white' 
                    : 'bg-gray-600 hover:bg-gray-700 text-white'
                }`}
                title={autoBatch ? 'Auto-generate enabled' : 'Auto-generate disabled'}
              >
                {autoBatch ? 'Auto' : 'Manual'}
              </button>
            </div>
            {partNumber && batchNumber && (
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Final Part Number: <span className="font-mono font-bold text-gray-800 dark:text-gray-200">{partNumber}-{batchNumber}</span>
              </p>
            )}
          </div>

          {/* Item Name with Template Search */}
          <div className="relative" ref={dropdownRef}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                disabled={submitting}
                className="w-full px-4 py-2 pr-10 rounded-lg bg-white/10 dark:bg-black/20 border border-gray-300/20 dark:border-gray-700/20 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
              <Search size={18} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>

            {/* Template Dropdown */}
            {showTemplateDropdown && filteredItems.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                <div className="p-2 bg-gray-100 dark:bg-gray-700 border-b border-gray-300 dark:border-gray-600">
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                    Select a template to copy ({filteredItems.length} found)
                  </p>
                </div>
                {filteredItems.map(item => {
                  const itemKey = item.part_number || item.id;
                  return (
                    <button
                      key={itemKey}
                      onClick={() => loadTemplateFromItem(item)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700 last:border-b-0 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="font-medium text-gray-800 dark:text-gray-200">{item.name}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Part #: {item.part_number}</p>
                          {item.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 line-clamp-1">{item.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <span className="bg-blue-500/20 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                            {item.phases?.length || item.phase_count || 0} phases
                          </span>
                          <Copy size={14} />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              placeholder="Enter item description"
              value={itemDescription}
              onChange={(e) => setItemDescription(e.target.value)}
              disabled={submitting}
              className="w-full px-4 py-2 rounded-lg bg-white/10 dark:bg-black/20 border border-gray-300/20 dark:border-gray-700/20 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              rows="3"
            />
          </div>
        </div>
      </div>

      {/* Phases Section */}
      <div className="bg-white/5 dark:bg-black/10 rounded-lg p-6 border border-gray-300/20 dark:border-gray-700/20">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Phases</h3>
          <button
            onClick={addNewPhase}
            disabled={submitting}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
          >
            <Plus size={16} />
            Add Phase
          </button>
        </div>

        {phases.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-4">
            No phases added yet. Click "Add Phase" to get started or search for an existing item above to use as template.
          </p>
        ) : (
          <div className="space-y-4">
            {phases.map((phase, phaseIndex) => (
              <div key={phase.id} className="bg-white/5 dark:bg-black/10 rounded-lg p-4 border border-gray-300/10 dark:border-gray-700/10">
                <div className="flex gap-3 mb-3">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder={`Phase ${phaseIndex + 1} Name (e.g., Design, Development)`}
                      value={phase.name}
                      onChange={(e) => updatePhase(phase.id, 'name', e.target.value)}
                      disabled={submitting}
                      className="w-full px-3 py-2 rounded-lg bg-white/10 dark:bg-black/20 border border-gray-300/20 dark:border-gray-700/20 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    />
                  </div>
                  <button
                    onClick={() => removePhase(phase.id)}
                    disabled={submitting}
                    className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                    title="Remove phase"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                {/* Subphases */}
                <div className="ml-4 space-y-2">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sub-Phases</span>
                    <button
                      onClick={() => addSubphaseToPhase(phase.id)}
                      disabled={submitting}
                      className="flex items-center gap-1 text-sm bg-slate-600 hover:bg-slate-700 text-white px-3 py-1 rounded transition-colors disabled:opacity-50"
                    >
                      <Plus size={14} />
                      Add Sub-Phase
                    </button>
                  </div>

                  {phase.subphases.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">No sub-phases yet</p>
                  ) : (
                    phase.subphases.map((subphase, subIndex) => (
                      <div key={subphase.id} className="bg-white/5 dark:bg-black/10 rounded p-3 space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder={`Sub-phase ${subIndex + 1} name`}
                            value={subphase.name}
                            onChange={(e) => updateSubphase(phase.id, subphase.id, 'name', e.target.value)}
                            disabled={submitting}
                            className="flex-1 px-3 py-1.5 text-sm rounded bg-white/10 dark:bg-black/20 border border-gray-300/20 dark:border-gray-700/20 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                          />
                          <button
                            onClick={() => removeSubphase(phase.id, subphase.id)}
                            disabled={submitting}
                            className="p-1.5 text-red-500 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
                            title="Remove sub-phase"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Condition (optional)"
                            value={subphase.condition}
                            onChange={(e) => updateSubphase(phase.id, subphase.id, 'condition', e.target.value)}
                            disabled={submitting}
                            className="px-3 py-1.5 text-sm rounded bg-white/10 dark:bg-black/20 border border-gray-300/20 dark:border-gray-700/20 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                          />
                          <input
                            type="number"
                            step="0.5"
                            placeholder="Duration (hours)"
                            value={subphase.expectedDuration}
                            onChange={(e) => updateSubphase(phase.id, subphase.id, 'expectedDuration', e.target.value)}
                            disabled={submitting}
                            className="px-3 py-1.5 text-sm rounded bg-white/10 dark:bg-black/20 border border-gray-300/20 dark:border-gray-700/20 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Save Button at Bottom */}
      <div className="flex gap-3 justify-end">
        <button
          onClick={handleClear}
          disabled={submitting}
          className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Clear All
        </button>
        <button
          onClick={handleSave}
          disabled={submitting}
          className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Saving...' : 'Save Item'}
        </button>
      </div>
    </div>
  );
}

export default AddItems;