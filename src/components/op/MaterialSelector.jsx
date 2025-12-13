import { useState, useEffect } from 'react';
import { Search, Plus, X, Package, AlertCircle, Loader } from 'lucide-react';

export default function MaterialSelector({
  value = [],
  onChange,
  apiService,
  disabled = false
}) {
  const [availableMaterials, setAvailableMaterials] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedMaterials, setSelectedMaterials] = useState([]);

  // Initialize from props ONCE
  useEffect(() => {
    console.log('📥 MaterialSelector received value:', value);

    if (Array.isArray(value) && value.length > 0) {
      // Ensure each material has required fields
      const validatedMaterials = value.map(m => ({
        item_no: m.item_no || m.material_item_no || null,
        item_name: m.item_name || m.material_name || m.name || '',
        quantity: parseFloat(m.quantity) || 0,
        unit: m.unit || m.unit_of_measure || 'pcs',
        available_stock: m.available_stock || m.balance || 0
      }));

      console.log('✅ Validated materials:', validatedMaterials);

      // Only update if different to prevent infinite loop
      setSelectedMaterials(prev => {
        const isDifferent = JSON.stringify(prev) !== JSON.stringify(validatedMaterials);
        return isDifferent ? validatedMaterials : prev;
      });
    } else if (value.length === 0 && selectedMaterials.length > 0) {
      setSelectedMaterials([]);
    }
  }, [value]); // Only depend on value prop

  // Load available materials from inventory
  useEffect(() => {
    loadMaterials();
  }, []);

  const loadMaterials = async () => {
    setIsLoading(true);
    try {
      console.log('🔍 Loading operation materials...');

      // Use the operations service method for filtered materials
      const response = await apiService.operations.getFilteredItems();

      console.log('📦 Raw materials response:', response);

      if (response.success && Array.isArray(response.data)) {
        const materials = response.data
          .filter(item => item.balance > 0) // Only show in-stock items
          .map(item => ({
            item_no: item.item_no,
            item_name: item.item_name,
            unit_of_measure: item.unit_of_measure || 'pcs',
            balance: parseFloat(item.balance) || 0,
            brand: item.brand || '',
            supplier: item.supplier || '',
            location: item.location || ''
          }));

        console.log(`✅ Loaded ${materials.length} available materials`);
        setAvailableMaterials(materials);
      } else {
        console.warn('⚠️ Unexpected response format:', response);
        setAvailableMaterials([]);
      }
    } catch (error) {
      console.error('❌ Failed to load materials:', error);
      setAvailableMaterials([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter materials based on search and exclude already selected
  const filteredMaterials = availableMaterials.filter(item => {
    const matchesSearch = item.item_name.toLowerCase().includes(searchTerm.toLowerCase());
    const notSelected = !selectedMaterials.some(m => m.item_no === item.item_no);
    return matchesSearch && notSelected;
  });

  const addMaterial = (material) => {
    console.log('➕ Adding material:', material);

    const newMaterial = {
      item_no: material.item_no,
      item_name: material.item_name,
      quantity: 1,
      unit: material.unit_of_measure || 'pcs',
      available_stock: material.balance
    };

    const updated = [...selectedMaterials, newMaterial];
    console.log('✅ Updated selected materials:', updated);
    setSelectedMaterials(updated);

    // Notify parent immediately
    if (onChange) {
      onChange(updated);
    }

    setSearchTerm('');
    setShowDropdown(false);
  };

  const removeMaterial = (itemNo) => {
    console.log('🗑️ Removing material:', itemNo);

    const updated = selectedMaterials.filter(m => m.item_no !== itemNo);
    console.log('✅ Updated selected materials:', updated);
    setSelectedMaterials(updated);

    // Notify parent immediately
    if (onChange) {
      onChange(updated);
    }
  };

  const updateQuantity = (itemNo, quantity) => {
    const numQuantity = Math.max(0, parseFloat(quantity) || 0);

    const updated = selectedMaterials.map(m =>
      m.item_no === itemNo ? { ...m, quantity: numQuantity } : m
    );
    console.log('🔄 Updated quantity for', itemNo, ':', numQuantity);
    setSelectedMaterials(updated);

    // Notify parent immediately
    if (onChange) {
      onChange(updated);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Add */}
      <div className="relative">
        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
          Expected Consumables
        </label>

        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            placeholder="Search materials from inventory..."
            disabled={disabled || isLoading}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

          {isLoading && (
            <Loader className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
          )}
        </div>

        {/* Dropdown */}
        {showDropdown && searchTerm && (
          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-auto">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500 flex items-center justify-center gap-2">
                <Loader className="w-4 h-4 animate-spin" />
                Loading materials...
              </div>
            ) : filteredMaterials.length > 0 ? (
              filteredMaterials.map((material) => (
                <button
                  key={material.item_no}
                  type="button"
                  onClick={() => addMaterial(material)}
                  onMouseDown={(e) => e.preventDefault()} // Prevent blur on click
                  className="w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 border-b dark:border-gray-700 last:border-b-0 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {material.item_name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-1">
                        <span>Stock: {material.balance} {material.unit_of_measure}</span>
                        {material.brand && (
                          <span className="text-xs">• {material.brand}</span>
                        )}
                        {material.location && (
                          <span className="text-xs">• {material.location}</span>
                        )}
                      </div>
                    </div>
                    <Plus className="w-4 h-4 text-blue-500 shrink-0 ml-2" />
                  </div>
                </button>
              ))
            ) : (
              <div className="p-4 text-center text-gray-500">
                {searchTerm ? 'No materials found' : 'Start typing to search...'}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selected Materials */}
      {selectedMaterials.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center justify-between">
            <span>Selected Materials ({selectedMaterials.length})</span>
            <button
              type="button"
              onClick={loadMaterials}
              disabled={isLoading}
              className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50"
            >
              {isLoading ? 'Refreshing...' : 'Refresh Stock'}
            </button>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {selectedMaterials.map((material, index) => (
              <div
                key={material.item_no || index}
                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
              >
                <div className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full shrink-0">
                  <Package className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 dark:text-white text-sm truncate">
                    {material.item_name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Available: {material.available_stock || 0} {material.unit}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <input
                    type="number"
                    value={material.quantity}
                    onChange={(e) => updateQuantity(material.item_no, e.target.value)}
                    min="0"
                    step="0.01"
                    disabled={disabled}
                    className="w-20 px-2 py-1 text-sm border rounded dark:bg-gray-600 dark:border-gray-500 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-blue-500"
                    placeholder="Qty"
                  />

                  <span className="text-sm text-gray-500 dark:text-gray-400 min-w-[40px]">
                    {material.unit}
                  </span>

                  <button
                    type="button"
                    onClick={() => removeMaterial(material.item_no)}
                    disabled={disabled}
                    className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Remove material"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warning for no materials */}
      {selectedMaterials.length === 0 && (
        <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-500 shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-700 dark:text-yellow-400">
            <p className="font-medium mb-1">No materials selected</p>
            <p className="text-xs">Add materials that will be consumed during this subphase. This helps track inventory usage and material requirements.</p>
          </div>
        </div>
      )}

      {/* Help text */}
      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-start gap-2">
        <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
        <div>
          <p className="mb-1">💡 <strong>Expected Consumables</strong> are materials from inventory that will be used in this subphase.</p>
          <ul className="list-disc list-inside space-y-0.5 pl-2">
            <li>Only materials with stock available are shown</li>
            <li>Stock levels are displayed for reference</li>
            <li>Quantities can be decimals (e.g., 2.5 kg)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}