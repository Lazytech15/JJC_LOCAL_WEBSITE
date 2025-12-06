import { useState, useEffect, useRef } from "react"
import {
  X,
  Save,
  Trash2,
  Plus,
  Edit2,
  User,
  Flag,
  Package,
  Clock,
  AlertTriangle,
  Archive
} from "lucide-react"

// ============================================================================
// EDIT ITEM MODAL
// ============================================================================
function EditItemModal({ item, onClose, onSave, isDarkMode, clients = [] }) {
  const [formData, setFormData] = useState({
    name: item?.name || "",
    description: item?.description || "",
    client_name: item?.client_name || "",
    priority: item?.priority || "Medium",
    qty: item?.qty || 1,
    remarks: item?.remarks || "",
    material_raw: "",
    material_quantity: ""
  })
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const [filteredClients, setFilteredClients] = useState([])
  const clientDropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target)) {
        setShowClientDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    const searchTerm = formData.client_name.trim().toLowerCase()
    if (searchTerm.length >= 1 && Array.isArray(clients)) {
      const matches = clients.filter(client =>
        client.toLowerCase().includes(searchTerm)
      )
      setFilteredClients(matches)
      setShowClientDropdown(matches.length > 0)
    } else {
      setFilteredClients(clients)
      setShowClientDropdown(false)
    }
  }, [formData.client_name, clients])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      alert("Item name is required")
      return
    }
    onSave(formData)
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "High": return "bg-red-500/20 text-red-700 border-red-500"
      case "Medium": return "bg-yellow-500/20 text-yellow-700 border-yellow-500"
      case "Low": return "bg-green-500/20 text-green-700 border-green-500"
      default: return "bg-gray-500/20 text-gray-700 border-gray-500"
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto ${isDarkMode ? "bg-gray-800" : "bg-white"
        }`}>
        {/* Header */}
        <div className={`sticky top-0 flex justify-between items-center p-6 border-b ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
          }`}>
          <h2 className={`text-xl font-bold flex items-center gap-2 ${isDarkMode ? "text-gray-100" : "text-gray-800"
            }`}>
            <Edit2 size={20} />
            Edit Item: {item?.part_number}
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${isDarkMode
              ? "hover:bg-gray-700 text-gray-300"
              : "hover:bg-gray-100 text-gray-600"
              }`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Item Name */}
          <div>
            <label className={`block text-sm font-medium mb-1 ${isDarkMode ? "text-gray-300" : "text-gray-700"
              }`}>
              Item Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode
                ? "bg-gray-700 border border-gray-600 text-gray-100"
                : "bg-gray-100 border border-gray-300 text-gray-800"
                }`}
            />
          </div>

          {/* Description */}
          <div>
            <label className={`block text-sm font-medium mb-1 ${isDarkMode ? "text-gray-300" : "text-gray-700"
              }`}>
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${isDarkMode
                ? "bg-gray-700 border border-gray-600 text-gray-100"
                : "bg-gray-100 border border-gray-300 text-gray-800"
                }`}
            />
          </div>

          {/* Client Name */}
          <div className="relative" ref={clientDropdownRef}>
            <label className={`block text-sm font-medium mb-1 flex items-center gap-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"
              }`}>
              <User size={16} />
              Client Name
            </label>
            <input
              type="text"
              value={formData.client_name}
              onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
              onFocus={() => setShowClientDropdown(clients.length > 0)}
              className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode
                ? "bg-gray-700 border border-gray-600 text-gray-100"
                : "bg-gray-100 border border-gray-300 text-gray-800"
                }`}
            />
            {showClientDropdown && filteredClients.length > 0 && (
              <div className={`absolute z-10 w-full mt-1 rounded-lg shadow-lg max-h-40 overflow-y-auto border ${isDarkMode ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"
                }`}>
                {filteredClients.map((client, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, client_name: client })
                      setShowClientDropdown(false)
                    }}
                    className={`w-full text-left px-4 py-2 border-b last:border-b-0 transition-colors ${isDarkMode
                      ? "hover:bg-gray-600 border-gray-600 text-gray-100"
                      : "hover:bg-gray-50 border-gray-200 text-gray-800"
                      }`}
                  >
                    {client}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Priority */}
          <div>
            <label className={`block text-sm font-medium mb-1 flex items-center gap-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"
              }`}>
              <Flag size={16} />
              Priority
            </label>
            <div className="grid grid-cols-3 gap-2">
              {["High", "Medium", "Low"].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setFormData({ ...formData, priority: p })}
                  className={`px-4 py-2 rounded-lg border-2 font-medium transition-colors ${formData.priority === p
                    ? getPriorityColor(p)
                    : isDarkMode
                      ? "bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600"
                      : "bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200"
                    }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className={`block text-sm font-medium mb-1 flex items-center gap-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"
              }`}>
              <Package size={16} />
              Batch Quantity
            </label>
            <input
              type="number"
              min="1"
              value={formData.qty}
              onChange={(e) => setFormData({ ...formData, qty: e.target.value })}
              className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode
                ? "bg-gray-700 border border-gray-600 text-gray-100"
                : "bg-gray-100 border border-gray-300 text-gray-800"
                }`}
            />
          </div>

          {/* Remarks */}
          <div>
            <label className={`block text-sm font-medium mb-1 ${isDarkMode ? "text-gray-300" : "text-gray-700"
              }`}>
              Remarks
            </label>
            <textarea
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              rows={4}
              className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${isDarkMode
                ? "bg-gray-700 border border-gray-600 text-gray-100"
                : "bg-gray-100 border border-gray-300 text-gray-800"
                }`}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
            >
              <Save size={16} />
              Save Changes
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ============================================================================
// EDIT PHASE MODAL
// ============================================================================
function EditPhaseModal({ phase, onClose, onSave, onDelete, isDarkMode }) {
  const [formData, setFormData] = useState({
    name: phase?.name || "",
    phase_order: phase?.phase_order || 0
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      alert("Phase name is required")
      return
    }
    onSave(formData)
  }

  const handleDelete = () => {
    if (window.confirm(`Delete phase "${phase.name}"? This will also delete all subphases.`)) {
      onDelete()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`rounded-lg max-w-md w-full ${isDarkMode ? "bg-gray-800" : "bg-white"
        }`}>
        {/* Header */}
        <div className={`flex justify-between items-center p-6 border-b ${isDarkMode ? "border-gray-700" : "border-gray-200"
          }`}>
          <h2 className={`text-xl font-bold flex items-center gap-2 ${isDarkMode ? "text-gray-100" : "text-gray-800"
            }`}>
            <Edit2 size={20} />
            Edit Phase
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${isDarkMode
              ? "hover:bg-gray-700 text-gray-300"
              : "hover:bg-gray-100 text-gray-600"
              }`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${isDarkMode ? "text-gray-300" : "text-gray-700"
              }`}>
              Phase Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode
                ? "bg-gray-700 border border-gray-600 text-gray-100"
                : "bg-gray-100 border border-gray-300 text-gray-800"
                }`}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${isDarkMode ? "text-gray-300" : "text-gray-700"
              }`}>
              Phase Order
            </label>
            <input
              type="number"
              min="0"
              value={formData.phase_order}
              onChange={(e) => setFormData({ ...formData, phase_order: e.target.value })}
              className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode
                ? "bg-gray-700 border border-gray-600 text-gray-100"
                : "bg-gray-100 border border-gray-300 text-gray-800"
                }`}
            />
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-4">
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
            >
              <Save size={16} />
              Save Changes
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
            >
              <Trash2 size={16} />
              Delete Phase
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ============================================================================
// EDIT SUBPHASE MODAL
// ============================================================================
function EditSubphaseModal({ subphase, onClose, onSave, onDelete, isDarkMode, batchQty = 1, apiService, globalUnusedMaterials = [], loadingGlobalUnused = false, onRefreshGlobalUnused = null, selectedItemForEdit = null,
  selectedPhaseForEdit = null }) {
  // Parse existing materials
  const parseExistingMaterials = () => {
    if (subphase?.materials) {
      try {
        return typeof subphase.materials === 'string'
          ? JSON.parse(subphase.materials)
          : subphase.materials || []
      } catch (error) {
        console.error("Failed to parse existing materials:", error)
        return []
      }
    }

    if (subphase?.material_raw && subphase?.material_quantity) {
      return [{
        name: subphase.material_raw,
        quantity: parseFloat(subphase.material_quantity) || 0,
        unit: 'pcs',
        checked_out: subphase.material_checked_out || false,
        checkout_date: subphase.material_checkout_date || null,
        checkout_by: subphase.material_checkout_by || null,
        checkout_by_name: subphase.material_checkout_by_name || null,
        checkout_by_uid: subphase.material_checkout_by_uid || null
      }]
    }

    return []
  }

  // Parse existing unused materials
  const parseUnusedMaterials = () => {
    if (subphase?.unused_materials) {
      try {
        return typeof subphase.unused_materials === 'string'
          ? JSON.parse(subphase.unused_materials)
          : subphase.unused_materials || []
      } catch (error) {
        console.error("Failed to parse unused materials:", error)
        return []
      }
    }
    return []
  }

  const [materials, setMaterials] = useState(parseExistingMaterials())
  const [unusedMaterials, setUnusedMaterials] = useState(parseUnusedMaterials())
  const [materialsRawList, setMaterialsRawList] = useState([])
  const [loadingMaterials, setLoadingMaterials] = useState(false)
  const [activeTab, setActiveTab] = useState('required')

  const [formData, setFormData] = useState({
    name: subphase?.name || "",
    expected_duration: subphase?.expected_duration || 0,
    expected_quantity: subphase?.expected_quantity || 0,
    subphase_order: subphase?.subphase_order || 0,
    unused_notes: subphase?.unused_notes || ""
  })

  useEffect(() => {
    if (subphase && subphase.id) {
      loadSubphaseMaterials()
    }
  }, [subphase?.id])

  const loadSubphaseMaterials = async () => {
  if (!subphase?.id) {
    console.log('⚠️ No subphase ID provided')
    return
  }

  try {
    console.log('📥 Loading materials for subphase:', subphase.id)
    const response = await apiService.operations.getSubphaseMaterials(subphase.id)
    
    console.log('✅ Raw API response:', response)

    // ✅ FIXED: Handle different response formats
    let materialsData = []
    
    if (response?.success && Array.isArray(response.data)) {
      materialsData = response.data
    } else if (response?.data && Array.isArray(response.data)) {
      materialsData = response.data
    } else if (Array.isArray(response)) {
      materialsData = response
    }

    console.log('✅ Extracted materials data:', materialsData)
    console.log('✅ Materials statuses:', materialsData.map(m => ({ name: m.material_name, status: m.status })))

    // ✅ CRITICAL: Filter out 'scrap' status materials
    const activeMaterials = materialsData.filter(m => {
      const isScrap = m.status === 'scrap'
      console.log(`Material ${m.material_name}: status=${m.status}, isScrap=${isScrap}`)
      return !isScrap
    })

    console.log(`✅ Active materials (scrap filtered): ${activeMaterials.length}/${materialsData.length}`)

    if (activeMaterials.length > 0) {
      const formattedMaterials = activeMaterials.map(m => ({
        id: m.id,
        name: m.material_name,
        quantity: parseFloat(m.material_quantity) || 0,
        unit: m.unit_of_measure || 'pcs',
        checked_out: m.is_checked_out || false,
        checkout_date: m.checkout_date || null,
        checkout_by: m.checked_out_by || null,
        checkout_by_name: m.checked_out_by_name || null,
        checkout_by_uid: m.checked_out_by_uid || null,
        status: m.status || 'pending',
        notes: m.notes || '',
        from_unused: m.from_unused || false,
        original_assigned_user: m.original_assigned_user || null
      }))

      console.log('✅ Formatted active materials:', formattedMaterials)
      setMaterials(formattedMaterials)
    } else {
      console.log('ℹ️ No active materials (all are scrap or none exist)')
      setMaterials([])
    }
  } catch (error) {
    console.error('❌ Failed to load materials:', error)
    // Don't clear materials on error if we already have some
    if (materials.length === 0) {
      setMaterials([])
    }
  }
}

  const handleReturnMaterial = async (material, materialIndex) => {
    const quantityToReturn = parseFloat(prompt(
      `How much of "${material.name}" is unused/scrap?\n\n` +
      `Available: ${material.quantity} ${material.unit}\n\n` +
      `Enter quantity to mark as scrap:`,
      material.quantity
    ))

    if (!quantityToReturn || quantityToReturn <= 0) {
      alert("Invalid quantity")
      return
    }

    if (quantityToReturn > parseFloat(material.quantity)) {
      alert(`Cannot return more than checked out quantity (${material.quantity})`)
      return
    }

    const reason = prompt(
      `Why is "${material.name}" being marked as scrap?\n\n` +
      `Examples:\n` +
      `• Excess material\n` +
      `• Damaged\n` +
      `• Wrong specification\n` +
      `• Production overrun\n` +
      `• Leftover from cutting\n\n` +
      `Enter reason:`
    )

    if (!reason || !reason.trim()) {
      alert("Reason is required")
      return
    }

    try {
      // ✅ Find material in inventory to return stock
      const materialsResponse = await apiService.items.getItems({
        item_type: "OPERATION PARTICULARS",
        search: material.name,
        limit: 10
      })

      let inventoryItems = []
      if (Array.isArray(materialsResponse)) {
        inventoryItems = materialsResponse
      } else if (materialsResponse?.data && Array.isArray(materialsResponse.data)) {
        inventoryItems = materialsResponse.data
      } else if (materialsResponse?.items && Array.isArray(materialsResponse.items)) {
        inventoryItems = materialsResponse.items
      } else if (materialsResponse?.success && Array.isArray(materialsResponse.data)) {
        inventoryItems = materialsResponse.data
      }

      const inventoryItem = inventoryItems.find(m =>
        m.item_name?.toLowerCase() === material.name.toLowerCase()
      )

      if (!inventoryItem) {
        throw new Error(`Material "${material.name}" not found in inventory`)
      }

      // ✅ Return stock to inventory using addStock
      console.log(`📥 Returning ${quantityToReturn} ${material.unit} back to inventory as scrap`)

      await apiService.items.addStock(
        inventoryItem.item_no,
        quantityToReturn,
        `Scrap material returned from operations\n` +
        `Subphase: ${formData.name}\n` +
        `Reason: ${reason}\n` +
        `Returned by: ${material.checkout_by_name || 'Unknown'}`
      )

      console.log(`✅ Stock returned to inventory`)

      // ✅ Get context for saving
      const itemPartNumber = subphase.item_part_number || selectedItemForEdit?.part_number
      const phaseId = subphase.phase_id || selectedPhaseForEdit?.id

      if (!itemPartNumber || !phaseId) {
        throw new Error('Missing item_part_number or phase_id context')
      }

      // ✅ Save to operations_subphase_materials with status='scrap'
      await apiService.operations.createMaterial({
        subphase_id: subphase.id,
        item_part_number: itemPartNumber,
        phase_id: phaseId,
        material_name: material.name,
        material_quantity: quantityToReturn,
        unit_of_measure: material.unit || 'pcs',
        is_checked_out: false,
        checkout_date: null,
        checked_out_by: material.checkout_by,
        checked_out_by_name: material.checkout_by_name,
        checked_out_by_uid: material.checkout_by_uid,
        status: 'scrap', // ✅ Changed from 'returned' to 'scrap'
        notes: `Scrap/Leftover - ${reason}\nOriginally assigned to: ${material.checkout_by_name || 'Unknown'}`,
        from_unused: true,
        original_assigned_user: material.checkout_by_name
      })

      // ✅ Calculate remaining quantity
const remainingQty = parseFloat(material.quantity) - quantityToReturn

if (remainingQty > 0) {
  // ✅ Update existing material with reduced quantity
  console.log(`🔄 Updating material ${material.id} with remaining quantity: ${remainingQty}`)
  await apiService.operations.updateMaterial(material.id, {
    material_quantity: remainingQty
  })
  console.log(`✅ Material ${material.id} updated with remaining qty: ${remainingQty}`)
} else {
  // ✅ Delete material record when quantity reaches 0
  console.log(`🗑️ Deleting material ${material.id} - quantity fully returned as scrap`)
  await apiService.operations.deleteMaterial(material.id)
  console.log(`✅ Material ${material.id} deleted successfully`)
}

      // ✅ Reload both lists
      await loadSubphaseMaterials()
      await loadUnusedMaterials()

      // ✅ Refresh global unused list
      if (onRefreshGlobalUnused) {
        onRefreshGlobalUnused()
      }

      alert(
        `✅ Material marked as scrap and returned to inventory!\n\n` +
        `Scrap quantity: ${quantityToReturn} ${material.unit}\n` +
        `Remaining checked out: ${remainingQty} ${material.unit}\n\n` +
        `${remainingQty === 0
          ? '✅ Original checkout record removed.\n📦 Material now available as scrap for other items.'
          : '📦 Material returned to inventory as scrap.'}`
      )

    } catch (error) {
      console.error("❌ Error returning material:", error)
      alert("Failed to return material: " + error.message)
    }
  }


  useEffect(() => {
    loadMaterialsRaw()
  }, [materials.length])

  const loadMaterialsRaw = async () => {
    try {
      setLoadingMaterials(true)
      const response = await apiService.items.getItems({
        item_type: "OPERATION PARTICULARS",
        limit: 500,
        sort_by: "item_name",
        sort_order: "ASC"
      })

      if (response && response.success && response.data) {
        const materials = response.data.map(item => ({
          value: item.item_name,
          label: item.item_name,
          item_no: item.item_no,
          unit: item.unit_of_measure || 'pcs',
          balance: parseFloat(item.balance) || 0,
          supplier: item.supplier || '',
          brand: item.brand || '',
          location: item.location || ''
        }))
        setMaterialsRawList(materials)
      }
    } catch (error) {
      console.error("Failed to load materials:", error)
      alert("Failed to load materials list: " + error.message)
    } finally {
      setLoadingMaterials(false)
    }
  }

  const loadUnusedMaterials = async () => {
  if (!subphase?.id) return

  try {
    console.log('📦 Loading unused materials for subphase:', subphase.id)
    
    // ✅ FIXED: Use getSubphaseMaterials to get ALL materials, then filter
    const response = await apiService.operations.getSubphaseMaterials(subphase.id)

    // ✅ Handle different response formats
    let allMaterials = []
    if (response?.success && Array.isArray(response.data)) {
      allMaterials = response.data
    } else if (Array.isArray(response)) {
      allMaterials = response
    } else if (response?.data && Array.isArray(response.data)) {
      allMaterials = response.data
    }

    console.log(`📊 Total materials from API: ${allMaterials.length}`)

    // ✅ CRITICAL: Filter to ONLY status='scrap'
    const scrapMaterials = allMaterials.filter(m => m.status === 'scrap')
    
    console.log(`✅ Found ${scrapMaterials.length} scrap materials for subphase ${subphase.id}`)
    console.log('📋 Scrap materials:', scrapMaterials)

    const formattedUnused = scrapMaterials.map(m => ({
      id: m.id,
      name: m.material_name,
      quantity: parseFloat(m.material_quantity) || 0,
      unit: m.unit_of_measure || 'pcs',
      reason: m.notes || '',
      assigned_user_uid: m.checked_out_by_uid,
      assigned_user_name: m.original_assigned_user || m.checked_out_by_name,
      assigned_user_barcode: m.checked_out_by,
      date_added: m.created_at,
      isNew: false // Existing records
    }))

    console.log(`✅ Formatted ${formattedUnused.length} unused materials`)
    setUnusedMaterials(formattedUnused)
  } catch (error) {
    console.error('❌ Failed to load unused materials:', error)
    // Don't clear on error if we already have some
    if (unusedMaterials.length === 0) {
      setUnusedMaterials([])
    }
  }
}


  useEffect(() => {
    if (subphase?.id) {
      loadSubphaseMaterials()
      loadUnusedMaterials() // Load unused materials
    }
  }, [subphase?.id])

  const handleTransferFromOtherItem = async (material, globalIndex) => {
    if (!window.confirm(
      `Transfer "${material.name}" (${material.quantity} ${material.unit}) from:\n\n` +
      `${material.source_item}\n` +
      `${material.source_phase} → ${material.source_subphase}\n\n` +
      `To current subphase?\n\n` +
      `This will:\n` +
      `• Make this material available in your Required Materials\n` +
      `• Mark as pending checkout for you\n` +
      `• Remove from source location\n` +
      `• Originally assigned to: ${material.assigned_user_name || 'Unknown'}`
    )) {
      return
    }

    try {
      // ✅ Delete from source (operations_subphase_materials)
      if (material.id) {
        await apiService.operations.deleteMaterial(material.id)
        console.log(`✅ Deleted material ${material.id} from source`)
      }

      // ✅ Create new material in current subphase
      const itemPartNumber = selectedItemForEdit?.part_number
      const phaseId = selectedPhaseForEdit?.id

      if (!itemPartNumber || !phaseId) {
        throw new Error('Missing item context for transfer')
      }

      const created = await apiService.operations.createMaterial({
        subphase_id: subphase.id,
        item_part_number: itemPartNumber,
        phase_id: phaseId,
        material_name: material.name,
        material_quantity: parseFloat(material.quantity),
        unit_of_measure: material.unit || 'pcs',
        is_checked_out: false, // ✅ Needs to be checked out again
        status: 'pending',
        from_unused: true,
        original_assigned_user: material.assigned_user_name,
        notes: `Transferred from ${material.source_item} (${material.source_subphase})\nOriginally assigned to: ${material.assigned_user_name}`
      })

      console.log(`✅ Material transferred to current subphase`)

      // ✅ Refresh global unused list
      if (onRefreshGlobalUnused) {
        onRefreshGlobalUnused()
      }

      // ✅ Reload current subphase materials
      await loadSubphaseMaterials()

      alert(
        `✅ Transferred "${material.name}" successfully!\n\n` +
        `• Added to your Required Materials (${material.quantity} ${material.unit})\n` +
        `• Status: Pending checkout\n` +
        `• Originally from: ${material.source_item}\n` +
        `• Originally assigned to: ${material.assigned_user_name}\n\n` +
        `You can now checkout this material for use.`
      )
    } catch (error) {
      console.error("❌ Error transferring material:", error)
      alert("Failed to transfer material: " + error.message)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      alert("Subphase name is required")
      return
    }

    const expectedQty = parseInt(formData.expected_quantity) || 0
    if (expectedQty > batchQty) {
      alert(`Expected quantity (${expectedQty}) cannot exceed batch quantity (${batchQty})`)
      return
    }

    // Validate required materials
    for (let i = 0; i < materials.length; i++) {
      const mat = materials[i]
      if (!mat.name || !mat.name.trim()) {
        alert(`Material #${i + 1}: Name is required`)
        return
      }
      if (!mat.quantity || mat.quantity <= 0) {
        alert(`Material #${i + 1}: Quantity must be greater than 0`)
        return
      }
    }

    // Validate NEW scrap materials only
    const newScrapMaterials = unusedMaterials.filter(m => m.isNew)

    for (let i = 0; i < newScrapMaterials.length; i++) {
      const mat = newScrapMaterials[i]

      if (!mat.name || !mat.name.trim()) {
        alert(`Scrap Material: Material name is required`)
        return
      }
      if (!mat.quantity || mat.quantity <= 0) {
        alert(`Scrap Material "${mat.name}": Quantity must be greater than 0`)
        return
      }
      if (!mat.reason || !mat.reason.trim()) {
        alert(`Scrap Material "${mat.name}": Reason is required`)
        return
      }

      const sourceMat = materials.find(m => m.name === mat.name && m.checked_out)

      if (sourceMat && parseFloat(mat.quantity) > parseFloat(sourceMat.quantity)) {
        alert(
          `Scrap Material "${mat.name}":\n\n` +
          `Scrap quantity (${mat.quantity}) cannot exceed checked-out quantity (${sourceMat.quantity})`
        )
        return
      }
    }

    try {
      // Get context
      const itemPartNumber = subphase.item_part_number || selectedItemForEdit?.part_number
      const phaseId = subphase.phase_id || selectedPhaseForEdit?.id

      if (!itemPartNumber || !phaseId) {
        throw new Error('Missing item_part_number or phase_id context')
      }

      // ============================================================
      // STEP 1: Save NEW SCRAP MATERIALS
      // ============================================================
      for (const scrapMat of newScrapMaterials) {
        try {
          console.log(`📦 Processing NEW scrap material: ${scrapMat.name}`)

          // Find material in inventory
          const materialsResponse = await apiService.items.getItems({
            item_type: "OPERATION PARTICULARS",
            search: scrapMat.name,
            limit: 10
          })

          let inventoryItems = []
          if (Array.isArray(materialsResponse)) {
            inventoryItems = materialsResponse
          } else if (materialsResponse?.data && Array.isArray(materialsResponse.data)) {
            inventoryItems = materialsResponse.data
          } else if (materialsResponse?.items && Array.isArray(materialsResponse.items)) {
            inventoryItems = materialsResponse.items
          } else if (materialsResponse?.success && Array.isArray(materialsResponse.data)) {
            inventoryItems = materialsResponse.data
          }

          const inventoryItem = inventoryItems.find(m =>
            m.item_name?.toLowerCase() === scrapMat.name.toLowerCase()
          )

          // ✅ Return stock to inventory
          if (inventoryItem) {
            console.log(`📥 Returning ${scrapMat.quantity} ${scrapMat.unit} back to inventory as scrap`)

            await apiService.items.addStock(
              inventoryItem.item_no,
              parseFloat(scrapMat.quantity),
              `Scrap material returned from operations\n` +
              `Subphase: ${formData.name}\n` +
              `Reason: ${scrapMat.reason}\n` +
              `Returned by: ${scrapMat.assigned_user_name || 'Unknown'}`,
              scrapMat.assigned_user_barcode || 'SYSTEM'
            )

            console.log(`✅ Stock returned successfully for ${scrapMat.name}`)
          }

          // ✅ Save scrap material to operations_subphase_materials table
          await apiService.operations.createMaterial({
            subphase_id: subphase.id,
            item_part_number: itemPartNumber,
            phase_id: phaseId,
            material_name: scrapMat.name,
            material_quantity: parseFloat(scrapMat.quantity),
            unit_of_measure: scrapMat.unit || 'pcs',
            is_checked_out: false,
            checkout_date: null,
            checked_out_by: null,
            checked_out_by_name: null,
            checked_out_by_uid: null,
            status: 'scrap', // ✅ Changed from 'returned' to 'scrap'
            notes: `Scrap/Leftover - ${scrapMat.reason}\nOriginally assigned to: ${scrapMat.assigned_user_name || 'Unknown'}`,
            from_unused: true,
            original_assigned_user: scrapMat.assigned_user_name || null
          })

          console.log(`✅ Scrap material saved to database: ${scrapMat.name}`)

        } catch (scrapError) {
          console.error(`❌ Failed to process scrap material ${scrapMat.name}:`, scrapError)
          throw new Error(`Failed to save scrap material "${scrapMat.name}": ${scrapError.message}`)
        }
      }

      // ============================================================
      // STEP 2: Save REQUIRED MATERIALS (skip existing ones)
      // ============================================================
      console.log(`📝 Processing ${materials.length} required materials...`)

      for (const material of materials) {
        try {
          // Skip if material already has an ID (already in database)
          if (material.id) {
            console.log(`⏭️ Skipping existing material: ${material.name} (ID: ${material.id})`)
            continue
          }

          console.log(`➕ Creating new material record: ${material.name}`)

          await apiService.operations.createMaterial({
            subphase_id: subphase.id,
            item_part_number: itemPartNumber,
            phase_id: phaseId,
            material_name: material.name,
            material_quantity: parseFloat(material.quantity),
            unit_of_measure: material.unit || 'pcs',
            is_checked_out: material.checked_out || false,
            checkout_date: material.checkout_date || null,
            checked_out_by: material.checkout_by || null,
            checked_out_by_name: material.checkout_by_name || null,
            checked_out_by_uid: material.checkout_by_uid || null,
            status: material.checked_out ? 'checked_out' : 'pending',
            notes: material.notes || null,
            from_unused: material.from_unused || false,
            original_assigned_user: material.original_assigned_user || null
          })

          console.log(`✅ Material saved: ${material.name}`)

        } catch (matError) {
          console.error(`❌ Failed to save material ${material.name}:`, matError)
          throw new Error(`Failed to save material "${material.name}": ${matError.message}`)
        }
      }

      // ============================================================
      // STEP 3: Save subphase basic info
      // ============================================================
      const saveData = {
        name: formData.name,
        expected_duration: formData.expected_duration,
        expected_quantity: formData.expected_quantity,
        subphase_order: formData.subphase_order,
        unused_notes: formData.unused_notes
      }

      console.log('💾 Saving subphase data:', saveData)
      await onSave(saveData)

      // ============================================================
      // STEP 4: Refresh lists
      // ============================================================
      await loadSubphaseMaterials()
      await loadUnusedMaterials()

      if (onRefreshGlobalUnused) {
        onRefreshGlobalUnused()
      }

      // ============================================================
      // STEP 5: Success message
      // ============================================================
      const checkedOutCount = materials.filter(m => m.checked_out).length
      const newScrapCount = newScrapMaterials.length
      const newMaterialsCount = materials.filter(m => !m.id).length

      let successMessage = '✅ Subphase saved successfully!'

      if (newMaterialsCount > 0) {
        successMessage += `\n\n• ${newMaterialsCount} new material(s) added`
      }

      if (checkedOutCount > 0) {
        successMessage += `\n• ${checkedOutCount} material(s) checked out`
      }

      if (newScrapCount > 0) {
        successMessage += `\n• ${newScrapCount} scrap material(s) returned to inventory`
      }

      alert(successMessage)

      setTimeout(() => {
        onClose()
      }, 1000)

    } catch (error) {
      console.error("❌ Error saving subphase:", error)
      alert("Failed to save subphase: " + error.message)
    }
  }

  // ✅ NEW: Handle saving ONLY scrap materials (no checkout triggered)
const handleSaveScrapOnly = async () => {
  try {
    // Get context
    const itemPartNumber = subphase.item_part_number || selectedItemForEdit?.part_number
    const phaseId = subphase.phase_id || selectedPhaseForEdit?.id

    if (!itemPartNumber || !phaseId) {
      throw new Error('Missing item context')
    }

    // Get only NEW scrap materials
    const newScrapMaterials = unusedMaterials.filter(m => m.isNew)

    if (newScrapMaterials.length === 0) {
      alert('No new scrap materials to save')
      return
    }

    // Validate scrap materials
    for (const mat of newScrapMaterials) {
      if (!mat.name || !mat.name.trim()) {
        alert(`Scrap Material: Material name is required`)
        return
      }
      if (!mat.quantity || mat.quantity <= 0) {
        alert(`Scrap Material "${mat.name}": Quantity must be greater than 0`)
        return
      }
      if (!mat.reason || !mat.reason.trim()) {
        alert(`Scrap Material "${mat.name}": Reason is required`)
        return
      }

      // Check against checked-out materials
      const sourceMat = materials.find(m => m.name === mat.name && m.checked_out)
      if (sourceMat && parseFloat(mat.quantity) > parseFloat(sourceMat.quantity)) {
        alert(
          `Scrap Material "${mat.name}":\n\n` +
          `Scrap quantity (${mat.quantity}) cannot exceed checked-out quantity (${sourceMat.quantity})`
        )
        return
      }
    }

    // Process each scrap material
    for (const scrapMat of newScrapMaterials) {
      try {
        console.log(`📦 Processing scrap material: ${scrapMat.name}`)

        // Find material in inventory
        const materialsResponse = await apiService.items.getItems({
          item_type: "OPERATION PARTICULARS",
          search: scrapMat.name,
          limit: 10
        })

        let inventoryItems = []
        if (Array.isArray(materialsResponse)) {
          inventoryItems = materialsResponse
        } else if (materialsResponse?.data && Array.isArray(materialsResponse.data)) {
          inventoryItems = materialsResponse.data
        } else if (materialsResponse?.items && Array.isArray(materialsResponse.items)) {
          inventoryItems = materialsResponse.items
        }

        const inventoryItem = inventoryItems.find(m =>
          m.item_name?.toLowerCase() === scrapMat.name.toLowerCase()
        )

        // ✅ Return stock to inventory as scrap
        if (inventoryItem) {
          console.log(`📥 Returning ${scrapMat.quantity} ${scrapMat.unit} to inventory as scrap`)

          await apiService.items.addStock(
            inventoryItem.item_no,
            parseFloat(scrapMat.quantity),
            `Scrap material returned from operations\n` +
            `Subphase: ${formData.name}\n` +
            `Reason: ${scrapMat.reason}\n` +
            `Returned by: ${scrapMat.assigned_user_name || 'Unknown'}`,
            scrapMat.assigned_user_barcode || 'SYSTEM'
          )

          console.log(`✅ Stock returned successfully`)
        }

        // ✅ Save scrap material to operations_subphase_materials with status='scrap'
        await apiService.operations.createMaterial({
          subphase_id: subphase.id,
          item_part_number: itemPartNumber,
          phase_id: phaseId,
          material_name: scrapMat.name,
          material_quantity: parseFloat(scrapMat.quantity),
          unit_of_measure: scrapMat.unit || 'pcs',
          is_checked_out: false,
          checkout_date: null,
          checked_out_by: scrapMat.assigned_user_barcode,
          checked_out_by_name: scrapMat.assigned_user_name,
          checked_out_by_uid: scrapMat.assigned_user_uid,
          status: 'scrap', // ✅ Mark as scrap - will be filtered out
          notes: `Scrap/Leftover - ${scrapMat.reason}\nOriginally assigned to: ${scrapMat.assigned_user_name || 'Unknown'}`,
          from_unused: true,
          original_assigned_user: scrapMat.assigned_user_name || null
        })

        console.log(`✅ Scrap material saved to database: ${scrapMat.name}`)

      } catch (scrapError) {
        console.error(`❌ Failed to process scrap material ${scrapMat.name}:`, scrapError)
        throw new Error(`Failed to save scrap material "${scrapMat.name}": ${scrapError.message}`)
      }
    }

    // ✅ Reload lists
    await loadSubphaseMaterials()
    await loadUnusedMaterials()

    if (onRefreshGlobalUnused) {
      onRefreshGlobalUnused()
    }

    // Clear new scrap materials from form
    setUnusedMaterials(prevUnused => prevUnused.filter(m => !m.isNew))

    alert(`✅ Saved ${newScrapMaterials.length} scrap material(s) successfully!\n\nThey are now available for reuse.`)

  } catch (error) {
    console.error("❌ Error saving scrap materials:", error)
    alert("Failed to save scrap materials: " + error.message)
  }
}

  const handleDelete = () => {
    if (window.confirm(`Delete subphase "${subphase.name}"?`)) {
      onDelete()
    }
  }

  const handleUseUnusedMaterial = async (unusedMaterialId) => {
    try {
      // ✅ Get the unused material from database
      const response = await apiService.operations.getMaterials({ id: unusedMaterialId })
      const unusedMat = Array.isArray(response) ? response[0] : response?.data?.[0] || response

      if (!unusedMat) {
        alert("Material not found")
        return
      }

      if (!window.confirm(
        `Use "${unusedMat.material_name}" (${unusedMat.material_quantity} ${unusedMat.unit_of_measure})?\n\n` +
        `This will:\n` +
        `• Add to your Required Materials\n` +
        `• Mark as pending checkout\n` +
        `• Remove from unused/leftover list`
      )) {
        return
      }

      // ✅ Update material status from 'returned' to 'pending'
      await apiService.operations.updateMaterial(unusedMaterialId, {
        status: 'pending',
        is_checked_out: false,
        notes: `${unusedMat.notes}\nMoved back to required materials on ${new Date().toLocaleString()}`
      })

      console.log(`✅ Material ${unusedMaterialId} moved to required materials`)

      // ✅ Reload materials
      await loadSubphaseMaterials()

      // ✅ Refresh global unused list
      if (onRefreshGlobalUnused) {
        onRefreshGlobalUnused()
      }

      alert(
        `✅ Moved "${unusedMat.material_name}" to Required Materials\n\n` +
        `Quantity: ${unusedMat.material_quantity} ${unusedMat.unit_of_measure}\n` +
        `Status: Pending checkout\n\n` +
        `You can now checkout this material for use.`
      )

    } catch (error) {
      console.error("❌ Error using unused material:", error)
      alert("Failed to use unused material: " + error.message)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`rounded-lg max-w-6xl w-full max-h-[90vh] flex flex-col ${isDarkMode ? "bg-gray-800" : "bg-white"
        }`}>
        {/* Header */}
        <div className={`flex justify-between items-center p-6 border-b ${isDarkMode ? "border-gray-700" : "border-gray-200"
          }`}>
          <h2 className={`text-xl font-bold flex items-center gap-2 ${isDarkMode ? "text-gray-100" : "text-gray-800"
            }`}>
            <Package size={20} />
            Edit Subphase
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${isDarkMode
              ? "hover:bg-gray-700 text-gray-300"
              : "hover:bg-gray-100 text-gray-600"
              }`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-4">
            {/* Basic Info */}
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDarkMode ? "text-gray-300" : "text-gray-700"
                }`}>
                Subphase Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode
                  ? "bg-gray-700 border border-gray-600 text-gray-100"
                  : "bg-gray-100 border border-gray-300 text-gray-800"
                  }`}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-1 flex items-center gap-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"
                  }`}>
                  <Clock size={16} />
                  Expected Duration (Minutes)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.expected_duration}
                  onChange={(e) => setFormData({ ...formData, expected_duration: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode
                    ? "bg-gray-700 border border-gray-600 text-gray-100"
                    : "bg-gray-100 border border-gray-300 text-gray-800"
                    }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 flex items-center gap-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"
                  }`}>
                  <Package size={16} />
                  Expected Quantity
                </label>
                <input
                  type="number"
                  min="0"
                  max={batchQty}
                  value={formData.expected_quantity}
                  onChange={(e) => setFormData({ ...formData, expected_quantity: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode
                    ? "bg-gray-700 border border-gray-600 text-gray-100"
                    : "bg-gray-100 border border-gray-300 text-gray-800"
                    }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? "text-gray-300" : "text-gray-700"
                  }`}>
                  Subphase Order
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.subphase_order}
                  onChange={(e) => setFormData({ ...formData, subphase_order: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode
                    ? "bg-gray-700 border border-gray-600 text-gray-100"
                    : "bg-gray-100 border border-gray-300 text-gray-800"
                    }`}
                />
              </div>
            </div>

            {/* Materials Tabs */}
            <div className={`border-t pt-4 ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}>
              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setActiveTab('required')}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${activeTab === 'required'
                    ? isDarkMode
                      ? "bg-blue-600 text-white"
                      : "bg-blue-600 text-white"
                    : isDarkMode
                      ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                >
                  Required Materials ({materials.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('unused')}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === 'unused'
                      ? isDarkMode ? "bg-orange-600 text-white" : "bg-orange-600 text-white"
                      : isDarkMode ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                >
                  <Archive size={16} />
                  Scraps ({unusedMaterials.length}) {/* ✅ Changed label */}
                </button>
              </div>

              {activeTab === 'required' && (
                <div className={`space-y-3 p-4 rounded-lg border ${isDarkMode ? "bg-gray-700/30 border-gray-600" : "bg-gray-50 border-gray-300"}`}>
                  <div className="flex items-center justify-between">
                    <label className={`text-sm font-semibold flex items-center gap-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                      <Package size={16} />
                      Required Materials ({materials.length})
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setMaterials([...materials, {
                          name: '',
                          quantity: 0,
                          unit: 'pcs',
                          checked_out: false
                        }])
                      }}
                      className="flex items-center gap-1 text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded transition-colors"
                    >
                      <Plus size={14} />
                      Add Material
                    </button>
                  </div>

                  {materials.length > 0 ? (
                    <div className="max-h-[300px] overflow-y-auto pr-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {materials.map((material, index) => (
                          <div key={index} className={`p-3 rounded-lg border ${isDarkMode ? "bg-gray-800 border-gray-600" : "bg-white border-gray-300"}`}>
                            <div className="flex items-center justify-between mb-2">
                              <span className={`text-sm font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                                Material #{index + 1}
                              </span>
                              <div className="flex gap-1">
                                {/* ✅ Add Return button for checked-out materials */}
                                {material.checked_out && (
                                  <button
                                    type="button"
                                    onClick={() => handleReturnMaterial(material, index)}
                                    className="flex items-center gap-1 px-2 py-1 text-xs bg-orange-600 hover:bg-orange-700 text-white rounded transition-colors"
                                    title="Return unused/leftover material"
                                  >
                                    <Archive size={12} />
                                    Return
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setMaterials(materials.filter((_, i) => i !== index))}
                                  className="p-1 text-red-600 hover:bg-red-500/10 rounded transition-colors"
                                  title="Remove material"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>

                            {/* ✅ Show checkout status badge */}
                            {material.checked_out && (
                              <div className={`mb-2 p-1.5 rounded text-xs ${isDarkMode
                                ? "bg-green-500/10 border border-green-500/30 text-green-300"
                                : "bg-green-500/10 border border-green-500/30 text-green-700"
                                }`}>
                                ✓ Checked out by {material.checkout_by_name || 'Unknown'}
                              </div>
                            )}

                            {material.from_unused && (
                              <div className={`mb-2 p-1.5 rounded text-xs ${isDarkMode
                                ? "bg-orange-500/10 border border-orange-500/30 text-orange-300"
                                : "bg-orange-500/10 border border-orange-500/30 text-orange-700"
                                }`}>
                                📦 From unused stock
                              </div>
                            )}

                            <div className="mb-2">
                              <label className={`block text-xs mb-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                                Material Name *
                              </label>
                              <select
                                value={material.name || ""}
                                onChange={(e) => {
                                  const selectedMaterial = materialsRawList.find(m => m.value === e.target.value)
                                  const updated = [...materials]
                                  updated[index] = {
                                    ...updated[index],
                                    name: e.target.value,
                                    unit: selectedMaterial?.unit || 'pcs'
                                  }
                                  setMaterials(updated)
                                }}
                                disabled={loadingMaterials || material.checked_out}
                                className={`w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode
                                  ? "bg-gray-700 border border-gray-600 text-gray-100"
                                  : "bg-gray-100 border border-gray-300 text-gray-800"
                                  }`}
                              >
                                <option value="">
                                  {loadingMaterials ? "Loading..." : "Select material..."}
                                </option>
                                {materialsRawList.map((mat) => (
                                  <option key={mat.item_no} value={mat.value}>
                                    {mat.label} ({mat.unit}) - Stock: {mat.balance}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className={`block text-xs mb-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                                  Quantity *
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={material.quantity || ""}
                                  onChange={(e) => {
                                    const updated = [...materials]
                                    updated[index].quantity = e.target.value
                                    setMaterials(updated)
                                  }}
                                  disabled={material.checked_out}
                                  className={`w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode
                                    ? "bg-gray-700 border border-gray-600 text-gray-100"
                                    : "bg-gray-100 border border-gray-300 text-gray-800"
                                    }`}
                                />
                              </div>
                              <div>
                                <label className={`block text-xs mb-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                                  Unit
                                </label>
                                <input
                                  type="text"
                                  value={material.unit || 'pcs'}
                                  disabled
                                  className={`w-full px-3 py-2 rounded-lg text-sm bg-gray-600/50 cursor-not-allowed ${isDarkMode
                                    ? "border border-gray-600 text-gray-300"
                                    : "border border-gray-300 text-gray-600"
                                    }`}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className={`text-sm text-center py-4 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                      No materials added yet.
                    </p>
                  )}
                </div>
              )}

              {/* Unused Materials Tab */}
              {activeTab === 'unused' && (
                <div className={`space-y-3 p-4 rounded-lg border ${isDarkMode ? "bg-gray-700/30 border-gray-600" : "bg-gray-50 border-gray-300"}`}>

                  {/* ============================================ */}
                  {/* SECTION 1: ALL AVAILABLE UNUSED STOCK */}
                  {/* ============================================ */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <label className={`text-sm font-semibold flex items-center gap-2 ${isDarkMode ? "text-orange-300" : "text-orange-700"}`}>
                        <Archive size={16} />
                        📦 Available Unused/Leftover Stock
                      </label>
                      <div className="flex items-center gap-2">
                        {loadingGlobalUnused && (
                          <span className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                            Loading...
                          </span>
                        )}
                        <span className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                          {unusedMaterials.length} local + {globalUnusedMaterials.length} from other items
                        </span>
                      </div>
                    </div>

                    {/* LOCAL UNUSED MATERIALS (from this subphase) */}
                    {unusedMaterials.length > 0 && (
                      <div className="mb-4">
                        <h4 className={`text-xs font-semibold mb-2 flex items-center gap-1 ${isDarkMode ? "text-blue-300" : "text-blue-700"}`}>
                          🏠 From This Subphase ({unusedMaterials.length})
                        </h4>
                        <div className="space-y-3">
                          {unusedMaterials.map((material, index) => (
                            <div key={`local-${index}`} className={`p-3 rounded-lg border ${isDarkMode ? "bg-gray-800 border-blue-600" : "bg-white border-blue-300"}`}>
                              <div className="flex items-center justify-between mb-2">
                                <span className={`text-sm font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                                  {material.name}
                                </span>
                                <div className="flex gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleUseUnusedMaterial(index)}
                                    className="flex items-center gap-1 px-2 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                                    title="Move to Required Materials"
                                  >
                                    <Package size={12} />
                                    Use
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (window.confirm(`Remove "${material.name}" from unused materials?`)) {
                                        setUnusedMaterials(unusedMaterials.filter((_, i) => i !== index))
                                      }
                                    }}
                                    className="p-1 text-red-600 hover:bg-red-500/10 rounded transition-colors"
                                    title="Remove from list"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>

                              <div className="space-y-2 text-xs">
                                <div className="flex items-center gap-2">
                                  <Package size={12} className="text-orange-500" />
                                  <span className={isDarkMode ? "text-gray-300" : "text-gray-700"}>
                                    Available: <strong>{material.quantity} {material.unit}</strong>
                                  </span>
                                </div>

                                {material.assigned_user_name && (
                                  <div className={`p-2 rounded border ${isDarkMode ? "bg-blue-500/10 border-blue-500/30 text-blue-300" : "bg-blue-500/10 border-blue-500/30 text-blue-700"}`}>
                                    <div className="flex items-center gap-1 mb-1">
                                      <User size={12} />
                                      <strong>Originally assigned to:</strong>
                                    </div>
                                    <div className="pl-4">
                                      <div>{material.assigned_user_name}</div>
                                      {material.assigned_user_barcode && (
                                        <div className="text-xs opacity-80">ID: {material.assigned_user_barcode}</div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {material.date_added && (
                                  <div className="flex items-center gap-1">
                                    <Clock size={12} />
                                    <span>Marked unused: {new Date(material.date_added).toLocaleDateString()}</span>
                                  </div>
                                )}

                                {material.reason && (
                                  <div className={`p-2 rounded text-xs ${isDarkMode ? "bg-yellow-500/10 text-yellow-300" : "bg-yellow-500/10 text-yellow-700"}`}>
                                    <AlertTriangle size={12} className="inline mr-1" />
                                    {material.reason}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Available Unused Materials from Database */}
                    {globalUnusedMaterials && globalUnusedMaterials.length > 0 && (
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-3">
                          <label className={`text-sm font-semibold flex items-center gap-2 ${isDarkMode ? "text-orange-300" : "text-orange-700"}`}>
                            <Archive size={16} />
                            📦 Available Scrap Materials {/* ✅ Changed label */}
                          </label>
                          {loadingGlobalUnused && (
                            <span className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                              Loading...
                            </span>
                          )}
                        </div>

                        <div className="max-h-[400px] overflow-y-auto pr-2 space-y-3">
                          {globalUnusedMaterials
                            .filter(material => material.source_subphase_id !== subphase?.id)
                            .map((material, index) => (
                              <div key={material.id || `global-${index}`} className={`p-3 rounded-lg border ${isDarkMode
                                ? "bg-gray-800 border-purple-600"
                                : "bg-white border-purple-300"
                                }`}>
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex-1">
                                    <span className={`text-sm font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                                      {material.name}
                                    </span>
                                    <div className={`text-xs mt-1 ${isDarkMode ? "text-purple-300" : "text-purple-700"}`}>
                                      📍 {material.source_item} → {material.source_phase} → {material.source_subphase}
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleTransferFromOtherItem(material, index)}
                                    className="flex items-center gap-1 px-2 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                                    title="Transfer to this subphase"
                                  >
                                    <Package size={12} />
                                    Transfer
                                  </button>
                                </div>

                                <div className="space-y-2 text-xs">
                                  <div className="flex items-center gap-2">
                                    <Package size={12} className="text-orange-500" />
                                    <span className={isDarkMode ? "text-gray-300" : "text-gray-700"}>
                                      Available: <strong>{material.quantity} {material.unit}</strong>
                                    </span>
                                  </div>

                                  {material.assigned_user_name && (
                                    <div className={`p-2 rounded border ${isDarkMode
                                      ? "bg-blue-500/10 border-blue-500/30 text-blue-300"
                                      : "bg-blue-500/10 border-blue-500/30 text-blue-700"
                                      }`}>
                                      <div className="flex items-center gap-1">
                                        <User size={12} />
                                        <strong>Originally assigned to:</strong>
                                      </div>
                                      <div className="pl-4 mt-1">
                                        <div>{material.assigned_user_name}</div>
                                        {material.assigned_user_barcode && (
                                          <div className="opacity-80">
                                            ID: {material.assigned_user_barcode}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {material.reason && (
                                    <div className={`p-2 rounded text-xs ${isDarkMode
                                      ? "bg-yellow-500/10 text-yellow-300"
                                      : "bg-yellow-500/10 text-yellow-700"
                                      }`}>
                                      <AlertTriangle size={12} className="inline mr-1" />
                                      {material.reason}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* NO UNUSED MATERIALS AT ALL */}
                    {unusedMaterials.length === 0 && globalUnusedMaterials.length === 0 && !loadingGlobalUnused && (
                      <div className={`text-sm text-center py-8 rounded-lg border ${isDarkMode ? "bg-gray-800/50 border-gray-700 text-gray-400" : "bg-gray-100 border-gray-300 text-gray-600"}`}>
                        <Package size={24} className="mx-auto mb-2 opacity-50" />
                        <p>No unused materials available.</p>
                        <p className="text-xs mt-1">Mark materials as unused to see them here.</p>
                      </div>
                    )}
                  </div>

                  {/* DIVIDER */}
                  <div className={`border-t pt-4 ${isDarkMode ? "border-gray-600" : "border-gray-300"}`}>

                    {/* ============================================ */}
                    {/* SECTION 2: MARK NEW MATERIALS AS UNUSED */}
                    {/* ============================================ */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className={`text-sm font-semibold flex items-center gap-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                          <Plus size={16} />
                          ➕ Mark Materials as Scrap {/* ✅ Changed label */}
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            // ✅ Get only materials from current item's required materials that are checked out
                            const availableMaterials = materials.filter(m => m.checked_out)

                            if (availableMaterials.length === 0) {
                              alert("No checked-out materials available.\n\nPlease checkout materials from the 'Required Materials' tab first.")
                              return
                            }

                            setUnusedMaterials([...unusedMaterials, {
                              name: '',
                              quantity: 0,
                              unit: 'pcs',
                              reason: '',
                              assigned_user_uid: null,
                              assigned_user_name: null,
                              assigned_user_barcode: null,
                              date_added: new Date().toISOString(),
                              isNew: true
                            }])
                          }}
                          className="flex items-center gap-1 text-xs bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 rounded transition-colors"
                        >
                          <Plus size={14} />
                          Mark as Scrap {/* ✅ Changed label */}
                        </button>
                      </div>

                      {/* Info box */}
                      <div className={`mb-3 p-3 rounded-lg border text-xs ${isDarkMode
                        ? "bg-blue-500/10 border-blue-500/30 text-blue-300"
                        : "bg-blue-500/10 border-blue-500/30 text-blue-700"
                        }`}>
                        <p className="font-medium mb-1">ℹ️ How to mark materials as scrap:</p>
                        <ol className="list-decimal list-inside space-y-1 pl-2">
                          <li>Select a checked-out material from the dropdown</li>
                          <li>Enter the scrap/leftover quantity</li>
                          <li>Provide a reason (e.g., "Excess material", "Damaged", "Wrong specification")</li>
                          <li>Click "Save Changes" to return the material to inventory as scrap</li>
                        </ol>
                      </div>

                      {/* Show form for NEW entries only */}
                      {unusedMaterials.filter(m => m.isNew).length > 0 && (
                        <div className="space-y-3">
                          {unusedMaterials.map((material, index) => {
                            // Only show forms for NEW materials being added
                            if (!material.isNew) return null

                            return (
                              <div key={index} className={`p-3 rounded-lg border ${isDarkMode ? "bg-gray-800 border-gray-600" : "bg-white border-gray-300"
                                }`}>
                                <div className="flex items-center justify-between mb-2">
                                  <span className={`text-sm font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"
                                    }`}>
                                    New Unused Material
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setUnusedMaterials(unusedMaterials.filter((_, i) => i !== index))}
                                    className="p-1 text-red-600 hover:bg-red-500/10 rounded transition-colors"
                                    title="Cancel"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>

                                <div className="space-y-2">
                                  {/* Material Selection - Only from CHECKED OUT materials */}
                                  <div>
                                    <label className={`block text-xs mb-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"
                                      }`}>
                                      Select Material (from checked-out items) *
                                    </label>
                                    <select
                                      value={material.name || ""}
                                      onChange={(e) => {
                                        const selectedMat = materials.find(m => m.name === e.target.value)
                                        const updated = [...unusedMaterials]
                                        updated[index] = {
                                          ...updated[index],
                                          name: e.target.value,
                                          unit: selectedMat?.unit || 'pcs',
                                          // Auto-assign user from checkout info
                                          assigned_user_uid: selectedMat?.checkout_by_uid || null,
                                          assigned_user_name: selectedMat?.checkout_by_name || null,
                                          assigned_user_barcode: selectedMat?.checkout_by || null
                                        }
                                        setUnusedMaterials(updated)
                                      }}
                                      className={`w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 ${isDarkMode
                                        ? "bg-gray-700 border border-gray-600 text-gray-100"
                                        : "bg-gray-100 border border-gray-300 text-gray-800"
                                        }`}
                                    >
                                      <option value="">Select from your checked-out materials...</option>
                                      {materials
                                        .filter(m => m.checked_out)
                                        .map((mat, idx) => (
                                          <option key={idx} value={mat.name}>
                                            {mat.name} (available: {mat.quantity} {mat.unit})
                                          </option>
                                        ))}
                                    </select>
                                  </div>

                                  {/* Quantity & Unit */}
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className={`block text-xs mb-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"
                                        }`}>
                                        Unused Quantity *
                                      </label>
                                      <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max={materials.find(m => m.name === material.name)?.quantity || 0}
                                        value={material.quantity || ""}
                                        onChange={(e) => {
                                          const updated = [...unusedMaterials]
                                          updated[index].quantity = e.target.value
                                          setUnusedMaterials(updated)
                                        }}
                                        placeholder="0.00"
                                        className={`w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 ${isDarkMode
                                          ? "bg-gray-700 border border-gray-600 text-gray-100"
                                          : "bg-gray-100 border border-gray-300 text-gray-800"
                                          }`}
                                      />
                                    </div>
                                    <div>
                                      <label className={`block text-xs mb-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"
                                        }`}>
                                        Unit
                                      </label>
                                      <input
                                        type="text"
                                        value={material.unit}
                                        disabled
                                        className={`w-full px-3 py-2 rounded-lg text-sm bg-gray-600/50 cursor-not-allowed ${isDarkMode
                                          ? "border border-gray-600 text-gray-300"
                                          : "border border-gray-300 text-gray-600"
                                          }`}
                                      />
                                    </div>
                                  </div>

                                  {/* Show max available */}
                                  {material.name && (
                                    <div className={`text-xs p-2 rounded ${isDarkMode
                                      ? "bg-purple-500/10 text-purple-300"
                                      : "bg-purple-500/10 text-purple-700"
                                      }`}>
                                      ℹ️ Max available: {materials.find(m => m.name === material.name)?.quantity || 0} {material.unit}
                                    </div>
                                  )}

                                  {/* Auto-assigned User Display */}
                                  {material.assigned_user_name && (
                                    <div className={`p-2 rounded border text-xs ${isDarkMode
                                      ? "bg-blue-500/10 border-blue-500/30 text-blue-300"
                                      : "bg-blue-500/10 border-blue-500/30 text-blue-700"
                                      }`}>
                                      <div className="flex items-center gap-1">
                                        <User size={12} />
                                        <strong>Will be assigned to:</strong>
                                      </div>
                                      <div className="pl-4 mt-1">
                                        <div>{material.assigned_user_name}</div>
                                        {material.assigned_user_barcode && (
                                          <div className="opacity-80">
                                            ID: {material.assigned_user_barcode}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* Reason */}
                                  <div>
                                    <label className={`block text-xs mb-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"
                                      }`}>
                                      Reason/Notes *
                                    </label>
                                    <textarea
                                      placeholder="Why is this unused? (e.g., Excess material, Damaged, Wrong specification, etc.)"
                                      value={material.reason || ''}
                                      onChange={(e) => {
                                        const updated = [...unusedMaterials]
                                        updated[index].reason = e.target.value
                                        setUnusedMaterials(updated)
                                      }}
                                      rows={2}
                                      className={`w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none ${isDarkMode
                                        ? "bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-500"
                                        : "bg-gray-100 border border-gray-300 text-gray-800 placeholder-gray-400"
                                        }`}
                                    />
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* General Notes */}
                      <div className="mt-4">
                        <label className={`block text-sm font-medium mb-1 ${isDarkMode ? "text-gray-300" : "text-gray-700"
                          }`}>
                          General Notes About Unused Materials
                        </label>
                        <textarea
                          value={formData.unused_notes}
                          onChange={(e) => setFormData({ ...formData, unused_notes: e.target.value })}
                          placeholder="Any additional notes about unused/leftover materials for this subphase..."
                          rows={3}
                          className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none ${isDarkMode
                            ? "bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-500"
                            : "bg-gray-100 border border-gray-300 text-gray-800 placeholder-gray-400"
                            }`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons - Fixed at bottom */}
<div className={`p-6 border-t ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}>
  <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
    <button
      type="submit"
      className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
    >
      <Save size={16} />
      Save Changes
    </button>
    <button
      type="button"
      onClick={handleSaveScrapOnly}
      className="flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
    >
      <Archive size={16} />
      Save Scrap
    </button>
    <button
      type="button"
      onClick={handleDelete}
      className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
    >
      <Trash2 size={16} />
      Delete Subphase
    </button>
    <button
      type="button"
      onClick={onClose}
      className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors font-medium"
    >
      Cancel
    </button>
  </div>
</div>
        </form>
      </div>
    </div>
  )
}


// ============================================================================
// ADD PHASE MODAL
// ============================================================================
function AddPhaseModal({ item, onClose, onSave, isDarkMode }) {
  const [formData, setFormData] = useState({
    name: "",
    phase_order: 0
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      alert("Phase name is required")
      return
    }
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`rounded-lg max-w-md w-full ${isDarkMode ? "bg-gray-800" : "bg-white"
        }`}>
        {/* Header */}
        <div className={`flex justify-between items-center p-6 border-b ${isDarkMode ? "border-gray-700" : "border-gray-200"
          }`}>
          <h2 className={`text-xl font-bold flex items-center gap-2 ${isDarkMode ? "text-gray-100" : "text-gray-800"
            }`}>
            <Plus size={20} />
            Add New Phase to {item?.name}
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${isDarkMode
              ? "hover:bg-gray-700 text-gray-300"
              : "hover:bg-gray-100 text-gray-600"
              }`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className={`p-3 rounded-lg ${isDarkMode ? "bg-blue-500/10" : "bg-blue-500/10"
            }`}>
            <p className={`text-sm ${isDarkMode ? "text-blue-300" : "text-blue-700"}`}>
              <strong>Item:</strong> {item?.part_number}
            </p>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${isDarkMode ? "text-gray-300" : "text-gray-700"
              }`}>
              Phase Name *
            </label>
            <input
              type="text"
              placeholder="e.g., Manufacturing, Quality Check"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              autoFocus
              className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode
                ? "bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-400"
                : "bg-gray-100 border border-gray-300 text-gray-800 placeholder-gray-500"
                }`}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${isDarkMode ? "text-gray-300" : "text-gray-700"
              }`}>
              Phase Order (optional)
            </label>
            <input
              type="number"
              min="0"
              value={formData.phase_order}
              onChange={(e) => setFormData({ ...formData, phase_order: e.target.value })}
              className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode
                ? "bg-gray-700 border border-gray-600 text-gray-100"
                : "bg-gray-100 border border-gray-300 text-gray-800"
                }`}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
            >
              <Plus size={16} />
              Add Phase
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ============================================================================
// ADD SUBPHASE MODAL
// ============================================================================
function AddSubphaseModal({ item, phase, onClose, onSave, isDarkMode, batchQty = 1 }) {
  const [formData, setFormData] = useState({
    name: "",
    expected_duration: 0,
    expected_quantity: 0,
    subphase_order: 0
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      alert("Subphase name is required")
      return
    }

    const expectedQty = parseInt(formData.expected_quantity) || 0
    if (expectedQty > batchQty) {
      alert(`Expected quantity (${expectedQty}) cannot exceed batch quantity (${batchQty})`)
      return
    }

    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`rounded-lg max-w-md w-full ${isDarkMode ? "bg-gray-800" : "bg-white"
        }`}>
        {/* Header */}
        <div className={`flex justify-between items-center p-6 border-b ${isDarkMode ? "border-gray-700" : "border-gray-200"
          }`}>
          <h2 className={`text-xl font-bold flex items-center gap-2 ${isDarkMode ? "text-gray-100" : "text-gray-800"
            }`}>
            <Plus size={20} />
            Add New Subphase
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${isDarkMode
              ? "hover:bg-gray-700 text-gray-300"
              : "hover:bg-gray-100 text-gray-600"
              }`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className={`p-3 rounded-lg space-y-1 ${isDarkMode ? "bg-blue-500/10" : "bg-blue-500/10"
            }`}>
            <p className={`text-sm ${isDarkMode ? "text-blue-300" : "text-blue-700"}`}>
              <strong>Item:</strong> {item?.name}
            </p>
            <p className={`text-sm ${isDarkMode ? "text-blue-300" : "text-blue-700"}`}>
              <strong>Phase:</strong> {phase?.name}
            </p>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${isDarkMode ? "text-gray-300" : "text-gray-700"
              }`}>
              Subphase Name *
            </label>
            <input
              type="text"
              placeholder="e.g., Assembly, Testing, Packaging"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              autoFocus
              className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode
                ? "bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-400"
                : "bg-gray-100 border border-gray-300 text-gray-800 placeholder-gray-500"
                }`}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 flex items-center gap-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"
              }`}>
              <Clock size={16} />
              Expected Duration (Minutes)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              placeholder="e.g., 2.5"
              value={formData.expected_duration}
              onChange={(e) => setFormData({ ...formData, expected_duration: e.target.value })}
              className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode
                ? "bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-400"
                : "bg-gray-100 border border-gray-300 text-gray-800 placeholder-gray-500"
                }`}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 flex items-center gap-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"
              }`}>
              <Package size={16} />
              Expected Quantity
            </label>
            <input
              type="number"
              min="0"
              max={batchQty}
              placeholder="e.g., 50"
              value={formData.expected_quantity}
              onChange={(e) => setFormData({ ...formData, expected_quantity: e.target.value })}
              className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode
                ? "bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-400"
                : "bg-gray-100 border border-gray-300 text-gray-800 placeholder-gray-500"
                }`}
            />
            <p className={`text-xs mt-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
              Max: {batchQty} (batch quantity)
            </p>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${isDarkMode ? "text-gray-300" : "text-gray-700"
              }`}>
              Subphase Order (optional)
            </label>
            <input
              type="number"
              min="0"
              value={formData.subphase_order}
              onChange={(e) => setFormData({ ...formData, subphase_order: e.target.value })}
              className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode
                ? "bg-gray-700 border border-gray-600 text-gray-100"
                : "bg-gray-100 border border-gray-300 text-gray-800"
                }`}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
            >
              <Plus size={16} />
              Add Subphase
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ============================================================================
// BULK EDIT MODAL
// ============================================================================
function BulkEditModal({ selectedItems, onClose, onSave, isDarkMode, clients = [] }) {
  const [formData, setFormData] = useState({
    client_name: "",
    priority: "",
    remarks: "",
    updateClient: false,
    updatePriority: false,
    updateRemarks: false
  })
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const [filteredClients, setFilteredClients] = useState([])
  const clientDropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target)) {
        setShowClientDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    const searchTerm = formData.client_name.trim().toLowerCase()
    if (searchTerm.length >= 1 && Array.isArray(clients)) {
      const matches = clients.filter(client =>
        client.toLowerCase().includes(searchTerm)
      )
      setFilteredClients(matches)
      setShowClientDropdown(matches.length > 0)
    } else {
      setFilteredClients(clients)
      setShowClientDropdown(false)
    }
  }, [formData.client_name, clients])

  const handleSubmit = (e) => {
    e.preventDefault()

    if (!formData.updateClient && !formData.updatePriority && !formData.updateRemarks) {
      alert("Please select at least one field to update")
      return
    }

    const updates = {}
    if (formData.updateClient) updates.client_name = formData.client_name
    if (formData.updatePriority) updates.priority = formData.priority
    if (formData.updateRemarks) updates.remarks = formData.remarks

    onSave(updates)
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "High": return "bg-red-500/20 text-red-700 border-red-500"
      case "Medium": return "bg-yellow-500/20 text-yellow-700 border-yellow-500"
      case "Low": return "bg-green-500/20 text-green-700 border-green-500"
      default: return "bg-gray-500/20 text-gray-700 border-gray-500"
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto ${isDarkMode ? "bg-gray-800" : "bg-white"
        }`}>
        {/* Header */}
        <div className={`sticky top-0 flex justify-between items-center p-6 border-b ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
          }`}>
          <h2 className={`text-xl font-bold flex items-center gap-2 ${isDarkMode ? "text-gray-100" : "text-gray-800"
            }`}>
            <Edit2 size={20} />
            Bulk Edit ({selectedItems?.length || 0} items)
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${isDarkMode
              ? "hover:bg-gray-700 text-gray-300"
              : "hover:bg-gray-100 text-gray-600"
              }`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Selected Items Preview */}
        <div className={`p-6 border-b ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}>
          <p className={`text-sm font-medium mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
            Selected Items:
          </p>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {selectedItems?.map((item, idx) => (
              <div key={idx} className={`text-xs px-3 py-2 rounded ${isDarkMode ? "bg-gray-700" : "bg-gray-100"
                }`}>
                <span className={`font-medium ${isDarkMode ? "text-gray-200" : "text-gray-800"}`}>
                  {item.name}
                </span>
                <span className={`ml-2 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                  ({item.part_number})
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className={`p-4 rounded-lg border ${isDarkMode ? "bg-yellow-500/10 border-yellow-500/30" : "bg-yellow-500/10 border-yellow-500/30"
            }`}>
            <p className={`text-sm flex items-center gap-2 ${isDarkMode ? "text-yellow-300" : "text-yellow-700"
              }`}>
              <AlertTriangle size={16} />
              Only checked fields will be updated across all selected items
            </p>
          </div>

          {/* Client Name */}
          <div className="relative" ref={clientDropdownRef}>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={formData.updateClient}
                onChange={(e) => setFormData({ ...formData, updateClient: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label className={`text-sm font-medium flex items-center gap-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"
                }`}>
                <User size={16} />
                Update Client Name
              </label>
            </div>
            <input
              type="text"
              value={formData.client_name}
              onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
              onFocus={() => setShowClientDropdown(clients.length > 0)}
              disabled={!formData.updateClient}
              placeholder="Enter new client name"
              className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 ${isDarkMode
                ? "bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-400"
                : "bg-gray-100 border border-gray-300 text-gray-800 placeholder-gray-500"
                }`}
            />
            {showClientDropdown && filteredClients.length > 0 && formData.updateClient && (
              <div className={`absolute z-10 w-full mt-1 rounded-lg shadow-lg max-h-40 overflow-y-auto border ${isDarkMode ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"
                }`}>
                {filteredClients.map((client, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, client_name: client })
                      setShowClientDropdown(false)
                    }}
                    className={`w-full text-left px-4 py-2 border-b last:border-b-0 transition-colors ${isDarkMode
                      ? "hover:bg-gray-600 border-gray-600 text-gray-100"
                      : "hover:bg-gray-50 border-gray-200 text-gray-800"
                      }`}
                  >
                    {client}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Priority */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={formData.updatePriority}
                onChange={(e) => setFormData({ ...formData, updatePriority: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label className={`text-sm font-medium flex items-center gap-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"
                }`}>
                <Flag size={16} />
                Update Priority
              </label>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {["High", "Medium", "Low"].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setFormData({ ...formData, priority: p })}
                  disabled={!formData.updatePriority}
                  className={`px-4 py-2 rounded-lg border-2 font-medium transition-colors disabled:opacity-50 ${formData.priority === p && formData.updatePriority
                    ? getPriorityColor(p)
                    : isDarkMode
                      ? "bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600"
                      : "bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200"
                    }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Remarks */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={formData.updateRemarks}
                onChange={(e) => setFormData({ ...formData, updateRemarks: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label className={`text-sm font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"
                }`}>
                Update Remarks (Append)
              </label>
            </div>
            <textarea
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              disabled={!formData.updateRemarks}
              placeholder="Enter remarks to append to all selected items"
              rows={3}
              className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:opacity-50 ${isDarkMode
                ? "bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-400"
                : "bg-gray-100 border border-gray-300 text-gray-800 placeholder-gray-500"
                }`}
            />
            <p className={`text-xs mt-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
              This will be appended to existing remarks, not replace them
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
            >
              <Save size={16} />
              Apply to {selectedItems?.length || 0} Items
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN EDIT COMPONENTS DEMO
// ============================================================================
export default function EditItemComponents() {
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [showItemModal, setShowItemModal] = useState(false)
  const [showPhaseModal, setShowPhaseModal] = useState(false)
  const [showSubphaseModal, setShowSubphaseModal] = useState(false)
  const [showAddPhaseModal, setShowAddPhaseModal] = useState(false)
  const [showAddSubphaseModal, setShowAddSubphaseModal] = useState(false)
  const [showBulkEditModal, setShowBulkEditModal] = useState(false)

  // Sample data
  const sampleItem = {
    part_number: "PN-001-BATCH-001",
    name: "Sample Product",
    description: "A sample product description",
    client_name: "Acme Corp",
    priority: "High",
    qty: 100,
    remarks: "Initial batch for testing"
  }

  const samplePhase = {
    id: 1,
    name: "Manufacturing",
    phase_order: 1
  }

  const sampleSubphase = {
    id: 1,
    name: "Assembly",
    expected_duration: 2.5,
    expected_quantity: 50,
    subphase_order: 1
  }

  const sampleClients = ["Acme Corp", "TechCo", "BuilderPro", "DesignHub"]

  const handleSaveItem = (data) => {
    console.log("Saving item:", data)
    alert("Item saved! Check console for data.")
    setShowItemModal(false)
  }

  const handleSavePhase = (data) => {
    console.log("Saving phase:", data)
    alert("Phase saved! Check console for data.")
    setShowPhaseModal(false)
  }

  const handleDeletePhase = () => {
    console.log("Deleting phase")
    alert("Phase deleted!")
    setShowPhaseModal(false)
  }

  const handleSaveSubphase = async (subphaseData) => {
    try {
      console.log('💾 Saving subphase with data:', subphaseData)

      await apiService.operations.updateSubphase(selectedSubphaseForEdit.id, subphaseData)

      console.log('✅ Subphase saved, reloading data...')

      // ✅ CRITICAL: Reload the full item data to get updated unused_materials
      await loadData()

      // Close modal
      setShowEditSubphaseModal(false)
      setSelectedSubphaseForEdit(null)

      alert('✅ Subphase updated successfully!')
    } catch (error) {
      console.error('❌ Failed to save subphase:', error)
      alert('Failed to save subphase: ' + error.message)
    }
  }

  const handleDeleteSubphase = () => {
    console.log("Deleting subphase")
    alert("Subphase deleted!")
    setShowSubphaseModal(false)
  }

  const handleAddPhase = (data) => {
    console.log("Adding phase:", data)
    alert("Phase added! Check console for data.")
    setShowAddPhaseModal(false)
  }

  const handleAddSubphase = (data) => {
    console.log("Adding subphase:", data)
    alert("Subphase added! Check console for data.")
    setShowAddSubphaseModal(false)
  }

  const handleBulkEdit = (updates) => {
    console.log("Bulk edit updates:", updates)
    alert(`Updating ${sampleBulkItems.length} items! Check console for data.`)
    setShowBulkEditModal(false)
  }

  const sampleBulkItems = [
    { part_number: "PN-001", name: "Product A" },
    { part_number: "PN-002", name: "Product B" },
    { part_number: "PN-003", name: "Product C" }
  ]

  return (
    <div className={`min-h-screen p-8 transition-colors duration-300 ${isDarkMode
      ? "bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950"
      : "bg-gradient-to-br from-gray-50 via-slate-50 to-stone-50"
      }`}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className={`backdrop-blur-md rounded-2xl p-6 mb-6 border shadow-lg ${isDarkMode ? "bg-gray-800/60 border-gray-700/50" : "bg-white/30 border-white/40"
          }`}>
          <div className="flex justify-between items-center">
            <div>
              <h1 className={`text-3xl font-bold ${isDarkMode ? "text-gray-100" : "text-gray-800"}`}>
                Edit Components Demo
              </h1>
              <p className={`text-sm mt-2 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                Click the buttons below to test the edit modals
              </p>
            </div>
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-3 rounded-lg transition-all ${isDarkMode
                ? "bg-gray-700 hover:bg-gray-600 text-yellow-400"
                : "bg-white/50 hover:bg-white/70 text-gray-700"
                }`}
            >
              {isDarkMode ? "☀️" : "🌙"}
            </button>
          </div>
        </div>

        {/* Demo Buttons */}
        <div className={`backdrop-blur-md rounded-2xl p-6 border shadow-lg space-y-4 ${isDarkMode ? "bg-gray-800/60 border-gray-700/50" : "bg-white/30 border-white/40"
          }`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              onClick={() => setShowItemModal(true)}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors font-medium"
            >
              <Edit2 size={18} />
              Edit Item
            </button>

            <button
              onClick={() => setShowPhaseModal(true)}
              className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors font-medium"
            >
              <Edit2 size={18} />
              Edit Phase
            </button>

            <button
              onClick={() => setShowSubphaseModal(true)}
              className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-colors font-medium"
            >
              <Edit2 size={18} />
              Edit Subphase
            </button>

            <button
              onClick={() => setShowAddPhaseModal(true)}
              className="flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-lg transition-colors font-medium"
            >
              <Plus size={18} />
              Add Phase
            </button>

            <button
              onClick={() => setShowAddSubphaseModal(true)}
              className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg transition-colors font-medium"
            >
              <Plus size={18} />
              Add Subphase
            </button>

            <button
              onClick={() => setShowBulkEditModal(true)}
              className="flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg transition-colors font-medium"
            >
              <Edit2 size={18} />
              Bulk Edit (3 items)
            </button>
          </div>
        </div>

        {/* Info Card */}
        <div className={`mt-6 backdrop-blur-md rounded-2xl p-6 border shadow-lg ${isDarkMode ? "bg-blue-500/10 border-blue-500/30" : "bg-blue-500/10 border-blue-500/20"
          }`}>
          <h3 className={`text-lg font-semibold mb-3 ${isDarkMode ? "text-blue-300" : "text-blue-700"}`}>
            All Components Features:
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className={`text-sm font-semibold mb-2 ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}>
                Edit Components:
              </h4>
              <ul className={`space-y-1 text-sm ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                <li>✅ Edit item (name, description, client, priority, qty, remarks)</li>
                <li>✅ Edit phase (name, order, delete)</li>
                <li>✅ Edit subphase (name, duration, quantity, order, delete)</li>
              </ul>
            </div>
            <div>
              <h4 className={`text-sm font-semibold mb-2 ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}>
                Add Components:
              </h4>
              <ul className={`space-y-1 text-sm ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                <li>✅ Add new phase to existing item</li>
                <li>✅ Add new subphase to existing phase</li>
                <li>✅ Validation for quantity limits</li>
              </ul>
            </div>
          </div>
          <div className="mt-4">
            <h4 className={`text-sm font-semibold mb-2 ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}>
              Bulk Edit Features:
            </h4>
            <ul className={`space-y-1 text-sm ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
              <li>✅ Update multiple items at once</li>
              <li>✅ Selective field updates (client, priority, remarks)</li>
              <li>✅ Preview selected items</li>
              <li>✅ Append remarks without replacing</li>
            </ul>
          </div>
          <div className="mt-4">
            <h4 className={`text-sm font-semibold mb-2 ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}>
              General Features:
            </h4>
            <ul className={`space-y-1 text-sm ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
              <li>✅ Client autocomplete dropdown</li>
              <li>✅ Priority visual selector</li>
              <li>✅ Form validation</li>
              <li>✅ Dark mode support</li>
              <li>✅ Responsive design</li>
              <li>✅ Keyboard shortcuts (Enter to submit)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showItemModal && (
        <EditItemModal
          item={sampleItem}
          onClose={() => setShowItemModal(false)}
          onSave={handleSaveItem}
          isDarkMode={isDarkMode}
          clients={sampleClients}
        />
      )}

      {showPhaseModal && (
        <EditPhaseModal
          phase={samplePhase}
          onClose={() => setShowPhaseModal(false)}
          onSave={handleSavePhase}
          onDelete={handleDeletePhase}
          isDarkMode={isDarkMode}
        />
      )}

      {showSubphaseModal && (
        <EditSubphaseModal
          subphase={sampleSubphase}
          onClose={() => setShowSubphaseModal(false)}
          onSave={handleSaveSubphase}
          onDelete={handleDeleteSubphase}
          isDarkMode={isDarkMode}
          batchQty={sampleItem.qty}
        />
      )}

      {showAddPhaseModal && (
        <AddPhaseModal
          item={sampleItem}
          onClose={() => setShowAddPhaseModal(false)}
          onSave={handleAddPhase}
          isDarkMode={isDarkMode}
        />
      )}

      {showAddSubphaseModal && (
        <AddSubphaseModal
          item={sampleItem}
          phase={samplePhase}
          onClose={() => setShowAddSubphaseModal(false)}
          onSave={handleAddSubphase}
          isDarkMode={isDarkMode}
          batchQty={sampleItem.qty}
        />
      )}

      {showBulkEditModal && (
        <BulkEditModal
          selectedItems={sampleBulkItems}
          onClose={() => setShowBulkEditModal(false)}
          onSave={handleBulkEdit}
          isDarkMode={isDarkMode}
          clients={sampleClients}
        />
      )}
    </div>
  )
}

export { EditItemModal, EditPhaseModal, EditSubphaseModal, AddPhaseModal, AddSubphaseModal, BulkEditModal }