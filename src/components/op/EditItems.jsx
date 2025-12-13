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
  Archive,
  PackageCheck,
  Scissors,
  RefreshCw,
  PackagePlus,
  CheckCircle
} from "lucide-react"
import MaterialSelector from './MaterialSelector';

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
// EDIT SUBPHASE MODAL - Updated with MaterialsService
// ============================================================================
function EditSubphaseModal({ subphase, onClose, onSave, onDelete, isDarkMode, batchQty = 1, apiService, globalUnusedMaterials = [], loadingGlobalUnused = false, onRefreshGlobalUnused = null, selectedItemForEdit = null,
  selectedPhaseForEdit = null }) {

  const [expectedConsumables, setExpectedConsumables] = useState([]);

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

  const [availableScrapMaterials, setAvailableScrapMaterials] = useState([])
  const [loadingScrapMaterials, setLoadingScrapMaterials] = useState(false)


  const [formData, setFormData] = useState({
    name: subphase?.name || "",
    expected_duration: subphase?.expected_duration || 0,
    expected_quantity: subphase?.expected_quantity || 0,
    subphase_order: subphase?.subphase_order || 0,
    unused_notes: subphase?.unused_notes || ""
  })

  useEffect(() => {
    if (subphase?.expected_consumables) {
      try {
        const consumables = typeof subphase.expected_consumables === 'string'
          ? JSON.parse(subphase.expected_consumables)
          : subphase.expected_consumables;

        // Transform to match MaterialSelector format
        const formatted = (consumables || []).map(c => ({
          item_no: c.item_no,
          item_name: c.item_name || c.material_name || c.name,
          quantity: parseFloat(c.quantity) || 0,
          unit: c.unit || c.unit_of_measure || 'pcs',
          available_stock: c.available_stock || c.balance || 0
        }));

        setExpectedConsumables(formatted);
      } catch (error) {
        console.error('Failed to parse expected_consumables:', error);
        setExpectedConsumables([]);
      }
    }
  }, [subphase?.expected_consumables]);

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

      // ✅ Use MaterialsService
      const response = await apiService.materials.getSubphaseMaterials(subphase.id)

      console.log('✅ Raw API response:', response)

      // ✅ Handle different response formats
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

      // ✅ FIX: Filter for valid active statuses from database ENUM
      const activeMaterials = materialsData.filter(m => {
        // Include: checked_out, in_use (exclude: completed, cancelled)
        return m.status === 'checked_out' || m.status === 'in_use'
      })

      console.log(`✅ Active materials: ${activeMaterials.length}/${materialsData.length}`)

      if (activeMaterials.length > 0) {
        const formattedMaterials = activeMaterials.map(m => ({
          id: m.id,
          name: m.material_name,
          quantity: parseFloat(m.material_quantity) || 0,
          unit: m.unit_of_measure || 'pcs',
          checked_out: m.status === 'checked_out' || m.status === 'in_use', // ✅ Changed
          checkout_date: m.checkout_date || null,
          checkout_by: m.checked_out_by || null,
          checkout_by_name: m.checked_out_by_name || null,
          checkout_by_uid: m.checked_out_by_uid || null,
          status: m.status || 'checked_out', // ✅ Use actual status
          notes: m.notes || '',
          quantity_used: m.quantity_used || 0
        }))

        console.log('✅ Formatted active materials:', formattedMaterials)
        setMaterials(formattedMaterials)
      } else {
        console.log('ℹ️ No active materials')
        setMaterials([])
      }
    } catch (error) {
      console.error('❌ Failed to load materials:', error)
      if (materials.length === 0) {
        setMaterials([])
      }
    }
  }

  const loadUnusedMaterials = async () => {
    if (!subphase?.id) return

    try {
      console.log('📦 Loading returned AND scrap materials for subphase:', subphase.id)

      // ✅ Load BOTH returned and scrap materials
      const [returnedResponse, scrapResponse] = await Promise.all([
        apiService.materials.getReturnedMaterials({ subphase_id: subphase.id }),
        apiService.materials.getScrapMaterials({ subphase_id: subphase.id })
      ])

      // Process returned materials
      let returnedMaterials = []
      if (returnedResponse?.success && Array.isArray(returnedResponse.data)) {
        returnedMaterials = returnedResponse.data
      } else if (Array.isArray(returnedResponse)) {
        returnedMaterials = returnedResponse
      } else if (returnedResponse?.data && Array.isArray(returnedResponse.data)) {
        returnedMaterials = returnedResponse.data
      }

      // Process scrap materials
      let scrapMaterials = []
      if (scrapResponse?.success && Array.isArray(scrapResponse.data)) {
        scrapMaterials = scrapResponse.data
      } else if (Array.isArray(scrapResponse)) {
        scrapMaterials = scrapResponse
      } else if (scrapResponse?.data && Array.isArray(scrapResponse.data)) {
        scrapMaterials = scrapResponse.data
      }

      console.log(`✅ Found ${returnedMaterials.length} returned + ${scrapMaterials.length} scrap materials`)

      // Format returned materials
      const formattedReturned = returnedMaterials.map(m => ({
        id: m.id,
        name: m.material_name,
        quantity: parseFloat(m.quantity_returned) || 0,
        unit: m.unit_of_measure || 'pcs',
        reason: m.return_reason || '',
        assigned_user_uid: m.returned_by_uid,
        assigned_user_name: m.returned_by_name,
        assigned_user_barcode: m.returned_by,
        date_added: m.return_date || m.created_at,
        condition_status: m.condition_status || 'good',
        is_reusable: m.is_reusable !== false,
        original_material_id: m.original_material_id,
        source_type: 'returned', // ✅ Mark as returned
        isNew: false
      }))

      // Format scrap materials
      const formattedScrap = scrapMaterials.map(m => ({
        id: m.id,
        name: m.material_name,
        quantity: parseFloat(m.quantity_scrapped) || 0,
        unit: m.unit_of_measure || 'pcs',
        reason: m.scrap_reason || '',
        assigned_user_uid: m.scrapped_by_uid,
        assigned_user_name: m.scrapped_by_name,
        assigned_user_barcode: m.scrapped_by,
        date_added: m.scrap_date || m.created_at,
        condition_status: m.scrap_type || 'waste',
        is_reusable: m.is_recyclable || false,
        original_material_id: m.original_material_id,
        source_type: 'scrap', // ✅ Mark as scrap
        scrap_type: m.scrap_type || 'waste',
        isNew: false
      }))

      // ✅ Combine both lists
      const allUnusedMaterials = [...formattedReturned, ...formattedScrap]
      console.log(`✅ Total unused materials: ${allUnusedMaterials.length}`)

      setUnusedMaterials(allUnusedMaterials)
    } catch (error) {
      console.error('❌ Failed to load unused materials:', error)
      if (unusedMaterials.length === 0) {
        setUnusedMaterials([])
      }
    }
  }

  useEffect(() => {
    if (subphase?.id) {
      loadSubphaseMaterials()
      loadUnusedMaterials()
    }
  }, [subphase?.id])

  const handleReturnMaterial = async (material, materialIndex) => {
    const quantityToReturn = parseFloat(prompt(
      `How much of "${material.name}" do you want to RETURN to warehouse?\n\n` +
      `Available: ${material.quantity} ${material.unit}\n\n` +
      `⚠️ RETURN = Unused material going back to warehouse inventory\n` +
      `   (Material is still in original form, not processed yet)\n\n` +
      `Enter quantity to return to warehouse:`,
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
      `Why is "${material.name}" being RETURNED to warehouse?\n\n` +
      `Examples:\n` +
      `• Excess material (not needed)\n` +
      `• Project scope changed\n` +
      `• Overestimated requirement\n` +
      `• Design change - no longer needed\n` +
      `• Wrong material ordered\n\n` +
      `⚠️ Material will be returned to warehouse inventory\n\n` +
      `Enter reason:`
    )

    if (!reason || !reason.trim()) {
      alert("Reason is required")
      return
    }

    try {
      // ✅ Get employee data
      const employeeData = await getEmployeeData(material.checkout_by_uid, apiService)

      // ✅ Find material in inventory
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

      // ✅ Return stock to warehouse inventory
      console.log(`📥 Returning ${quantityToReturn} ${material.unit} to warehouse inventory`)

      await apiService.items.addStock(
        inventoryItem.item_no,
        quantityToReturn,
        `Material returned to warehouse (unused)\n` +
        `Item: ${selectedItemForEdit?.name || 'Unknown'}\n` +
        `Phase: ${selectedPhaseForEdit?.name || 'Unknown'}\n` +
        `Subphase: ${formData.name}\n` +
        `Reason: ${reason}\n` +
        `Returned by: ${material.checkout_by_name || 'Unknown'}`,
        material.checkout_by || 'SYSTEM'
      )

      console.log(`✅ Stock returned to warehouse inventory`)

      // ✅ Create employee log for material return
      try {
        const materialsArray = [{
          item_no: inventoryItem.item_no,
          item_name: inventoryItem.item_name,
          quantity: quantityToReturn,
          unit: material.unit || 'pcs'
        }]

        const operationContext = {
          item_name: selectedItemForEdit?.name || 'Unknown',
          part_number: selectedItemForEdit?.part_number || 'Unknown',
          phase_name: selectedPhaseForEdit?.name || 'Unknown',
          subphase_name: formData.name
        }

        const logResult = await createMaterialReturnLog(
          materialsArray,
          employeeData,
          operationContext,
          reason,
          apiService
        )

        if (logResult.success) {
          console.log("✅ Employee return log created:", logResult.logId)
        }
      } catch (logError) {
        console.warn("⚠️ Failed to create employee log (non-critical):", logError)
      }

      // ✅ Use MaterialsService to create returned material record
      await apiService.materials.createReturnedMaterial({
        original_material_id: material.id,
        subphase_id: subphase.id,
        material_name: material.name,
        quantity_returned: quantityToReturn,
        unit_of_measure: material.unit || 'pcs',
        returned_by: material.checkout_by,
        returned_by_name: material.checkout_by_name,
        returned_by_uid: material.checkout_by_uid,
        condition_status: 'good',
        return_reason: reason,
        is_reusable: true,
        notes: `Unused material returned to warehouse - Originally assigned to: ${material.checkout_by_name || 'Unknown'}`
      })

      // ✅ Calculate remaining quantity
      const remainingQty = parseFloat(material.quantity) - quantityToReturn

      if (remainingQty > 0) {
        console.log(`🔄 Updating material ${material.id} with remaining quantity: ${remainingQty}`)
        await apiService.materials.updateMaterial(material.id, {
          material_quantity: remainingQty
        })
        console.log(`✅ Material ${material.id} updated with remaining qty: ${remainingQty}`)
      } else {
        console.log(`🗑️ Deleting material ${material.id} - quantity fully returned`)
        await apiService.materials.deleteMaterial(material.id)
        console.log(`✅ Material ${material.id} deleted successfully`)
      }

      // ✅ Reload both lists
      await loadSubphaseMaterials()
      await loadUnusedMaterials()

      if (onRefreshGlobalUnused) {
        onRefreshGlobalUnused()
      }

      alert(
        `✅ Material returned to warehouse!\n\n` +
        `Returned quantity: ${quantityToReturn} ${material.unit}\n` +
        `Remaining checked out: ${remainingQty} ${material.unit}\n\n` +
        `${remainingQty === 0
          ? '✅ Original checkout record removed.\n📦 Material now back in warehouse inventory.'
          : '📦 Material returned to warehouse inventory.'}`
      )

    } catch (error) {
      console.error("❌ Error returning material:", error)
      alert("Failed to return material: " + error.message)
    }
  }

  // ✅ FIX 2: NEW - Mark Material as Scrap (processed waste)
  const handleMarkAsScrap = async (material, materialIndex) => {
    const quantityToScrap = parseFloat(prompt(
      `How much of "${material.name}" is SCRAP/WASTE?\n\n` +
      `Available: ${material.quantity} ${material.unit}\n\n` +
      `⚠️ SCRAP = Processed material waste (cannot be returned as-is)\n` +
      `   Examples: cut pieces, leftovers, damaged during work\n\n` +
      `Enter quantity to mark as scrap:`,
      material.quantity
    ))

    if (!quantityToScrap || quantityToScrap <= 0) {
      alert("Invalid quantity")
      return
    }

    if (quantityToScrap > parseFloat(material.quantity)) {
      alert(`Cannot scrap more than checked out quantity (${material.quantity})`)
      return
    }

    const reason = prompt(
      `Why is "${material.name}" being marked as SCRAP?\n\n` +
      `Examples:\n` +
      `• Leftover pieces after cutting\n` +
      `• Damaged during processing\n` +
      `• Production waste\n` +
      `• Defective after use\n` +
      `• Cut-offs and scraps\n\n` +
      `⚠️ This material CANNOT be returned to warehouse\n` +
      `   (But can be reused by other operations if suitable)\n\n` +
      `Enter reason:`
    )

    if (!reason || !reason.trim()) {
      alert("Reason is required")
      return
    }

    try {
      // ✅ Get employee data
      const employeeData = await getEmployeeData(material.checkout_by_uid, apiService)

      // ✅ Create employee log for scrap
      try {
        const materialsArray = [{
          item_no: 'SCRAP',
          item_name: material.name,
          quantity: quantityToScrap,
          unit: material.unit || 'pcs'
        }]

        const operationContext = {
          item_name: selectedItemForEdit?.name || 'Unknown',
          part_number: selectedItemForEdit?.part_number || 'Unknown',
          phase_name: selectedPhaseForEdit?.name || 'Unknown',
          subphase_name: formData.name
        }

        const logResult = await createMaterialScrapLog(
          materialsArray,
          employeeData,
          operationContext,
          reason,
          apiService
        )

        if (logResult.success) {
          console.log("✅ Employee scrap log created:", logResult.logId)
        }
      } catch (logError) {
        console.warn("⚠️ Failed to create employee log (non-critical):", logError)
      }

      // ✅ Save to operations_scrap_materials table
      await apiService.materials.createScrapMaterial({
        original_material_id: material.id,
        subphase_id: subphase.id,
        material_name: material.name,
        quantity_scrapped: quantityToScrap,
        unit_of_measure: material.unit || 'pcs',
        scrapped_by: material.checkout_by || 'SYSTEM',
        scrapped_by_name: material.checkout_by_name || 'Unknown',
        scrapped_by_uid: material.checkout_by_uid || 'SYSTEM',
        scrap_type: 'waste',
        scrap_reason: reason,
        is_recyclable: true, // ✅ Can be reused by others
        notes: `Processed material waste - Originally assigned to: ${material.checkout_by_name || 'Unknown'}`
      })

      // ✅ Calculate remaining quantity
      const remainingQty = parseFloat(material.quantity) - quantityToScrap

      if (remainingQty > 0) {
        console.log(`🔄 Updating material ${material.id} with remaining quantity: ${remainingQty}`)
        await apiService.materials.updateMaterial(material.id, {
          material_quantity: remainingQty
        })
        console.log(`✅ Material ${material.id} updated with remaining qty: ${remainingQty}`)
      } else {
        console.log(`🗑️ Deleting material ${material.id} - quantity fully scrapped`)
        await apiService.materials.deleteMaterial(material.id)
        console.log(`✅ Material ${material.id} deleted successfully`)
      }

      // ✅ Reload both lists
      await loadSubphaseMaterials()
      await loadUnusedMaterials()

      if (onRefreshGlobalUnused) {
        onRefreshGlobalUnused()
      }

      alert(
        `✅ Material marked as scrap!\n\n` +
        `Scrap quantity: ${quantityToScrap} ${material.unit}\n` +
        `Remaining checked out: ${remainingQty} ${material.unit}\n\n` +
        `${remainingQty === 0
          ? '✅ Original checkout record removed.\n📦 Scrap available for reuse by other operations.'
          : '📦 Scrap recorded and available for reuse.'}`
      )

    } catch (error) {
      console.error("❌ Error marking as scrap:", error)
      alert("Failed to mark as scrap: " + error.message)
    }
  }

  /**
   * Create employee log for material returns
   */
  const createMaterialReturnLog = async (materials, employeeData, operationContext, reason, apiService) => {
    try {
      const itemCount = materials.length
      const itemsList = materials
        .map((m) => `${m.item_name} x${m.quantity} (${m.unit || "pcs"})`)
        .join(", ")

      const detailsText = `Material Return: ${itemCount} item${itemCount > 1 ? "s" : ""} - ${itemsList}`

      const purpose = operationContext.subphase_name
        ? `Material Return for ${operationContext.item_name} - ${operationContext.phase_name} - ${operationContext.subphase_name}\nReason: ${reason}`
        : operationContext.phase_name
          ? `Material Return for ${operationContext.item_name} - ${operationContext.phase_name}\nReason: ${reason}`
          : `Material Return for ${operationContext.item_name}\nReason: ${reason}`

      const itemsJson = materials.map((m) => ({
        item_no: m.item_no,
        item_name: m.item_name,
        quantity: m.quantity,
        unit: m.unit || "pcs",
        operation_item: operationContext.part_number,
        operation_phase: operationContext.phase_name,
        operation_subphase: operationContext.subphase_name,
        return_reason: reason
      }))

      const logData = {
        username: employeeData.username,
        id_number: employeeData.id_number,
        id_barcode: employeeData.id_barcode,
        details: detailsText,
        purpose: purpose,
        item_no: materials[0]?.item_no,
        items_json: JSON.stringify(itemsJson)
      }

      console.log("📝 Creating employee return log:", logData)

      const result = await apiService.employeeLogs.createEmployeeLog(logData)
      console.log("✅ Employee return log created:", result)

      return {
        success: true,
        logId: result.id,
        data: result
      }
    } catch (error) {
      console.error("❌ Failed to create employee return log:", error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Create employee log for material scrap
   */
  const createMaterialScrapLog = async (materials, employeeData, operationContext, scrapReason, apiService) => {
    try {
      const itemCount = materials.length
      const itemsList = materials
        .map((m) => `${m.item_name} x${m.quantity} (${m.unit || "pcs"})`)
        .join(", ")

      const detailsText = `Material Scrap: ${itemCount} item${itemCount > 1 ? "s" : ""} - ${itemsList}`

      const purpose = operationContext.subphase_name
        ? `Material Scrap for ${operationContext.item_name} - ${operationContext.phase_name} - ${operationContext.subphase_name}\nReason: ${scrapReason}`
        : operationContext.phase_name
          ? `Material Scrap for ${operationContext.item_name} - ${operationContext.phase_name}\nReason: ${scrapReason}`
          : `Material Scrap for ${operationContext.item_name}\nReason: ${scrapReason}`

      const itemsJson = materials.map((m) => ({
        item_no: m.item_no,
        item_name: m.item_name,
        quantity: m.quantity,
        unit: m.unit || "pcs",
        operation_item: operationContext.part_number,
        operation_phase: operationContext.phase_name,
        operation_subphase: operationContext.subphase_name,
        scrap_reason: scrapReason
      }))

      const logData = {
        username: employeeData.username,
        id_number: employeeData.id_number,
        id_barcode: employeeData.id_barcode,
        details: detailsText,
        purpose: purpose,
        item_no: materials[0]?.item_no,
        items_json: JSON.stringify(itemsJson)
      }

      console.log("📝 Creating employee scrap log:", logData)

      const result = await apiService.employeeLogs.createEmployeeLog(logData)
      console.log("✅ Employee scrap log created:", result)

      return {
        success: true,
        logId: result.id,
        data: result
      }
    } catch (error) {
      console.error("❌ Failed to create employee scrap log:", error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Get employee data helper (add if not exists)
   */
  const getEmployeeData = async (employeeUid, apiService) => {
    try {
      console.log("🔍 Fetching employee data for UID:", employeeUid)
      const response = await apiService.employees.getEmployee(employeeUid)
      console.log("📦 Employee API response:", response)

      if (response.success) {
        return {
          username: response.username || "unknown",
          id_number: response.idNumber || "UNKNOWN",
          id_barcode: response.idBarcode || "UNKNOWN",
          fullName: response.fullName || "Unknown",
          department: response.department,
          position: response.position,
          uid: String(employeeUid)
        }
      }

      throw new Error("Invalid employee response")
    } catch (error) {
      console.error("❌ Failed to fetch employee data:", error)
      return {
        username: "unknown",
        id_number: "UNKNOWN",
        id_barcode: "UNKNOWN",
        fullName: "Unknown Employee",
        department: null,
        position: null,
        uid: String(employeeUid)
      }
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



  /**
 * Load all available scrap materials from database
 */
  const loadAvailableScrapMaterials = async () => {
    try {
      setLoadingScrapMaterials(true)
      console.log('🗑️ Loading all available scrap materials...')

      const response = await apiService.materials.getScrapMaterials({})

      console.log('📦 Raw scrap response:', response) // ✅ NEW: Log raw response

      let scrapMaterials = []
      if (response?.success && Array.isArray(response.data)) {
        scrapMaterials = response.data
      } else if (Array.isArray(response)) {
        scrapMaterials = response
      } else if (response?.data && Array.isArray(response.data)) {
        scrapMaterials = response.data
      }

      console.log(`✅ Found ${scrapMaterials.length} total scrap materials:`, scrapMaterials) // ✅ NEW: Log all scraps

      // Filter out scraps from current subphase
      const availableScraps = scrapMaterials.filter(s => {
        const isDifferentSubphase = s.subphase_id !== subphase?.id
        console.log(`  - ${s.material_name}: subphase_id=${s.subphase_id}, current=${subphase?.id}, show=${isDifferentSubphase}`) // ✅ NEW: Log each filter decision
        return isDifferentSubphase
      })

      console.log(`✅ ${availableScraps.length} available for use (excluding current subphase):`, availableScraps) // ✅ NEW: Log filtered result
      setAvailableScrapMaterials(availableScraps)

    } catch (error) {
      console.error('❌ Failed to load scrap materials:', error)
      setAvailableScrapMaterials([])
    } finally {
      setLoadingScrapMaterials(false)
    }
  }

  const handleUseScrapMaterial = async (scrap) => {
    // ✅ Check if employee is assigned to subphase
    if (!subphase.employee_uid || !subphase.employee_barcode || !subphase.employee_name) {
      alert(
        `⚠️ Please assign an employee to this subphase first!\n\n` +
        `Scrap materials need to be assigned to someone for tracking purposes.\n\n` +
        `Steps:\n` +
        `1. Close this modal\n` +
        `2. Assign an employee to "${subphase.name}"\n` +
        `3. Re-open and try again`
      )
      return
    }

    if (!window.confirm(
      `Use scrap material "${scrap.material_name}"?\n\n` +
      `Available: ${scrap.quantity_scrapped} ${scrap.unit_of_measure}\n` +
      `From: ${scrap.item_name || 'Unknown'}\n` +
      `Type: ${scrap.scrap_type || 'waste'}\n\n` +
      `This will:\n` +
      `• Add to your Required Materials\n` +
      `• NOT deduct from warehouse inventory (it's scrap)\n` +
      `• Assign to: ${subphase.employee_name}\n` +
      `• Mark with SCRAP-REUSE identifier\n\n` +
      `Originally scrapped by: ${scrap.scrapped_by_name || 'Unknown'}\n` +
      `Reason: ${scrap.scrap_reason || 'N/A'}`
    )) {
      return
    }

    try {
      console.log('♻️ Using scrap material:', scrap.material_name)

      // ✅ Create material with assigned employee info
      await apiService.materials.createMaterial({
        subphase_id: subphase.id,
        material_name: scrap.material_name,
        material_quantity: parseFloat(scrap.quantity_scrapped),
        unit_of_measure: scrap.unit_of_measure || 'pcs',

        // ✅ Use assigned employee from subphase
        checked_out_by: subphase.employee_barcode,
        checked_out_by_name: subphase.employee_name,
        checked_out_by_uid: subphase.employee_uid,

        checkout_date: new Date().toISOString(),
        status: 'in_use',

        // ✅ Add clear SCRAP-REUSE identifier in notes
        notes: `🔄 SCRAP-REUSE (NO WAREHOUSE DEDUCTION)\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `This material is reused scrap - NOT from warehouse inventory.\n\n` +
          `📦 Source Details:\n` +
          `   • Item: ${scrap.item_name}\n` +
          `   • Phase/Subphase: ${scrap.phase_name} → ${scrap.subphase_name}\n` +
          `   • Scrap Type: ${scrap.scrap_type}\n` +
          `   • Originally Scrapped By: ${scrap.scrapped_by_name}\n` +
          `   • Scrap Reason: ${scrap.scrap_reason}\n\n` +
          `👤 Now Assigned To:\n` +
          `   • ${subphase.employee_name} (${subphase.employee_barcode})\n` +
          `   • Reuse Date: ${new Date().toLocaleString()}`
      })

      console.log('✅ Added to required materials with employee assignment')

      // ✅ Delete the scrap record
      await apiService.materials.deleteScrapMaterial(scrap.id)
      console.log('✅ Removed from scrap list')

      // ✅ Reload lists
      await loadSubphaseMaterials()
      await loadAvailableScrapMaterials()

      if (onRefreshGlobalUnused) {
        onRefreshGlobalUnused()
      }

      alert(
        `✅ Scrap material assigned successfully!\n\n` +
        `Material: ${scrap.material_name}\n` +
        `Quantity: ${scrap.quantity_scrapped} ${scrap.unit_of_measure}\n` +
        `Source: ${scrap.item_name}\n\n` +
        `✓ Assigned to: ${subphase.employee_name}\n` +
        `✓ Marked as SCRAP-REUSE\n` +
        `✓ NO warehouse deduction\n` +
        `✓ Ready to use immediately`
      )

    } catch (error) {
      console.error('❌ Error using scrap material:', error)
      alert('Failed to use scrap material: ' + error.message)
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

    // ✅ Validate expected consumables
    for (let i = 0; i < expectedConsumables.length; i++) {
      const mat = expectedConsumables[i]
      if (!mat.item_name || !mat.item_name.trim()) {
        alert(`Expected Consumable #${i + 1}: Name is required`)
        return
      }
      if (!mat.quantity || mat.quantity <= 0) {
        alert(`Expected Consumable #${i + 1}: Quantity must be greater than 0`)
        return
      }
    }

    // Validate NEW returned materials only
    const newReturnedMaterials = unusedMaterials.filter(m => m.isNew)

    for (let i = 0; i < newReturnedMaterials.length; i++) {
      const mat = newReturnedMaterials[i]

      if (!mat.name || !mat.name.trim()) {
        alert(`Returned Material: Material name is required`)
        return
      }
      if (!mat.quantity || mat.quantity <= 0) {
        alert(`Returned Material "${mat.name}": Quantity must be greater than 0`)
        return
      }
      if (!mat.reason || !mat.reason.trim()) {
        alert(`Returned Material "${mat.name}": Reason is required`)
        return
      }

      const sourceMat = materials.find(m => m.name === mat.name && m.checked_out)

      if (sourceMat && parseFloat(mat.quantity) > parseFloat(sourceMat.quantity)) {
        alert(
          `Returned Material "${mat.name}":\n\n` +
          `Return quantity (${mat.quantity}) cannot exceed checked-out quantity (${sourceMat.quantity})`
        )
        return
      }
    }

    try {
      // ============================================================
      // STEP 1: Save NEW RETURNED MATERIALS using MaterialsService
      // ============================================================
      for (const returnedMat of newReturnedMaterials) {
        try {
          console.log(`📦 Processing NEW returned material: ${returnedMat.name}`)

          // Find material in inventory
          const materialsResponse = await apiService.items.getItems({
            item_type: "OPERATION PARTICULARS",
            search: returnedMat.name,
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
            m.item_name?.toLowerCase() === returnedMat.name.toLowerCase()
          )

          // ✅ Return stock to inventory
          if (inventoryItem) {
            console.log(`📥 Returning ${returnedMat.quantity} ${returnedMat.unit} back to inventory`)

            await apiService.items.addStock(
              inventoryItem.item_no,
              parseFloat(returnedMat.quantity),
              `Returned material from operations\n` +
              `Subphase: ${formData.name}\n` +
              `Reason: ${returnedMat.reason}\n` +
              `Returned by: ${returnedMat.assigned_user_name || 'Unknown'}`,
              returnedMat.assigned_user_barcode || 'SYSTEM'
            )

            console.log(`✅ Stock returned successfully for ${returnedMat.name}`)
          }

          // ✅ Save returned material using MaterialsService
          await apiService.materials.createReturnedMaterial({
            original_material_id: returnedMat.original_material_id,
            subphase_id: subphase.id,
            material_name: returnedMat.name,
            quantity_returned: parseFloat(returnedMat.quantity),
            unit_of_measure: returnedMat.unit || 'pcs',
            returned_by: returnedMat.assigned_user_barcode || 'SYSTEM',
            returned_by_name: returnedMat.assigned_user_name || 'Unknown',
            returned_by_uid: returnedMat.assigned_user_uid || 'SYSTEM',
            condition_status: returnedMat.condition_status || 'good',
            return_reason: returnedMat.reason,
            is_reusable: returnedMat.is_reusable !== false,
            notes: `Returned from operations - Subphase: ${formData.name}`
          })

          console.log(`✅ Returned material saved to database: ${returnedMat.name}`)

        } catch (returnError) {
          console.error(`❌ Failed to process returned material ${returnedMat.name}:`, returnError)
          throw new Error(`Failed to save returned material "${returnedMat.name}": ${returnError.message}`)
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

          // ✅ Use MaterialsService
          await apiService.materials.createMaterial({
            subphase_id: subphase.id,
            material_name: material.name,
            material_quantity: parseFloat(material.quantity),
            unit_of_measure: material.unit || 'pcs',
            checked_out_by: material.checkout_by || 'SYSTEM',
            checked_out_by_name: material.checkout_by_name || 'Pending',
            checked_out_by_uid: material.checkout_by_uid || 'SYSTEM',
            status: material.checked_out ? 'checked_out' : 'pending',
            notes: material.notes || null
          })

          console.log(`✅ Material saved: ${material.name}`)

        } catch (matError) {
          console.error(`❌ Failed to save material ${material.name}:`, matError)
          throw new Error(`Failed to save material "${material.name}": ${matError.message}`)
        }
      }

      // ============================================================
      // STEP 3: Save subphase basic info + expected_consumables
      // ============================================================
      const formattedConsumables = expectedConsumables.map(m => ({
        item_no: m.item_no,
        item_name: m.item_name,
        quantity: parseFloat(m.quantity) || 0,
        unit: m.unit || 'pcs'
      }))

      const saveData = {
        name: formData.name,
        expected_duration: formData.expected_duration,
        expected_quantity: formData.expected_quantity,
        subphase_order: formData.subphase_order,
        unused_notes: formData.unused_notes,

        expected_consumables: formattedConsumables
      }

      console.log('💾 Saving subphase data:', saveData)
      console.log('🔍 Expected consumables being saved:', formattedConsumables)

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
      const newReturnCount = newReturnedMaterials.length
      const newMaterialsCount = materials.filter(m => !m.id).length
      const consumablesCount = expectedConsumables.length

      let successMessage = '✅ Subphase saved successfully!'

      if (newMaterialsCount > 0) {
        successMessage += `\n\n• ${newMaterialsCount} new material(s) added`
      }

      if (checkedOutCount > 0) {
        successMessage += `\n• ${checkedOutCount} material(s) checked out`
      }

      if (newReturnCount > 0) {
        successMessage += `\n• ${newReturnCount} returned material(s) saved to inventory`
      }

      if (consumablesCount > 0) {
        successMessage += `\n• ${consumablesCount} expected consumable(s) configured`
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

  // ✅ NEW: Handle saving ONLY returned materials
  const handleSaveScrapOnly = async () => {
    try {
      // Get only NEW returned materials (these are being marked as scrap)
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

          // ✅ Get employee data
          const employeeData = await getEmployeeData(scrapMat.assigned_user_uid || 'SYSTEM', apiService)

          // ✅ Find source material (the checked-out material)
          const sourceMaterial = materials.find(m => m.name === scrapMat.name && m.checked_out)

          if (!sourceMaterial) {
            throw new Error(`Source material "${scrapMat.name}" not found in checked-out materials`)
          }

          // ✅ Find material in inventory
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

          if (!inventoryItem) {
            throw new Error(`Material "${scrapMat.name}" not found in inventory`)
          }

          // ✅ Reduce quantity from checked-out material
          const remainingQty = parseFloat(sourceMaterial.quantity) - parseFloat(scrapMat.quantity)

          if (remainingQty > 0) {
            console.log(`🔄 Updating material ${sourceMaterial.id} with remaining quantity: ${remainingQty}`)
            await apiService.materials.updateMaterial(sourceMaterial.id, {
              material_quantity: remainingQty
            })
            console.log(`✅ Material ${sourceMaterial.id} updated`)
          } else {
            console.log(`🗑️ Deleting material ${sourceMaterial.id} - quantity fully scrapped`)
            await apiService.materials.deleteMaterial(sourceMaterial.id)
            console.log(`✅ Material ${sourceMaterial.id} deleted`)
          }

          // ✅ Create employee log for scrap
          try {
            const materialsArray = [{
              item_no: inventoryItem.item_no,
              item_name: inventoryItem.item_name,
              quantity: parseFloat(scrapMat.quantity),
              unit: scrapMat.unit || 'pcs'
            }]

            const operationContext = {
              item_name: selectedItemForEdit?.name || 'Unknown',
              part_number: selectedItemForEdit?.part_number || 'Unknown',
              phase_name: selectedPhaseForEdit?.name || 'Unknown',
              subphase_name: formData.name
            }

            const logResult = await createMaterialScrapLog(
              materialsArray,
              employeeData,
              operationContext,
              scrapMat.reason,
              apiService
            )

            if (logResult.success) {
              console.log("✅ Employee scrap log created:", logResult.logId)
            }
          } catch (logError) {
            console.warn("⚠️ Failed to create employee log (non-critical):", logError)
          }

          // ✅ Save to operations_scrap_materials table
          await apiService.materials.createScrapMaterial({
            original_material_id: sourceMaterial.id,
            subphase_id: subphase.id,
            material_name: scrapMat.name,
            quantity_scrapped: parseFloat(scrapMat.quantity),
            unit_of_measure: scrapMat.unit || 'pcs',
            scrapped_by: scrapMat.assigned_user_barcode || 'SYSTEM',
            scrapped_by_name: scrapMat.assigned_user_name || 'Unknown',
            scrapped_by_uid: scrapMat.assigned_user_uid || 'SYSTEM',
            scrap_type: 'waste',
            scrap_reason: scrapMat.reason,
            is_recyclable: false,
            notes: `Scrap from operations - Originally assigned to: ${scrapMat.assigned_user_name || 'Unknown'}`
          })

          console.log(`✅ Scrap material saved to operations_scrap_materials: ${scrapMat.name}`)

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

      alert(`✅ Saved ${newScrapMaterials.length} scrap material(s) successfully!\n\nRecords saved to scrap materials table.`)

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
      // ✅ Find the material in state to check source_type
      const material = unusedMaterials.find(m => m.id === unusedMaterialId)

      if (!material) {
        alert("Material not found")
        return
      }

      let materialData

      if (material.source_type === 'returned') {
        // Get from returned materials table
        const response = await apiService.materials.getReturnedMaterial(unusedMaterialId)
        materialData = Array.isArray(response) ? response[0] : response?.data?.[0] || response
      } else if (material.source_type === 'scrap') {
        // Get from scrap materials table
        const response = await apiService.materials.getScrapMaterial(unusedMaterialId)
        materialData = Array.isArray(response) ? response[0] : response?.data?.[0] || response
      }

      if (!materialData) {
        alert("Material not found")
        return
      }

      const quantity = material.source_type === 'returned'
        ? materialData.quantity_returned
        : materialData.quantity_scrapped

      const sourceLabel = material.source_type === 'returned'
        ? 'Returned Materials'
        : 'Scrap Materials'

      if (!window.confirm(
        `Use "${material.name}" (${quantity} ${material.unit}) from ${sourceLabel}?\n\n` +
        `This will:\n` +
        `• Add to your Required Materials\n` +
        `• Mark as pending checkout\n` +
        `• Remove from ${sourceLabel} list\n\n` +
        `Source: ${material.source_type === 'scrap' ? 'Scrap/Waste' : 'Returned (Reusable)'}\n` +
        `Originally handled by: ${material.assigned_user_name || 'Unknown'}`
      )) {
        return
      }

      // ✅ Create new material checkout in current subphase
      await apiService.materials.createMaterial({
        subphase_id: subphase.id,
        material_name: material.name,
        material_quantity: parseFloat(quantity),
        unit_of_measure: material.unit || 'pcs',
        checked_out_by: 'SYSTEM',
        checked_out_by_name: 'Pending',
        checked_out_by_uid: 'SYSTEM',
        status: 'checked_out',
        notes: `Reused from ${sourceLabel} (${material.source_type})\nOriginally handled by: ${material.assigned_user_name}\nReason: ${material.reason}`
      })

      // ✅ Delete the source record (returned or scrap)
      if (material.source_type === 'returned') {
        await apiService.materials.deleteReturnedMaterial(unusedMaterialId)
        console.log(`✅ Deleted from returned materials`)
      } else if (material.source_type === 'scrap') {
        await apiService.materials.deleteScrapMaterial(unusedMaterialId)
        console.log(`✅ Deleted from scrap materials`)
      }

      console.log(`✅ Material transferred to current subphase`)

      // ✅ Reload materials
      await loadSubphaseMaterials()
      await loadUnusedMaterials()

      // ✅ Refresh global unused list
      if (onRefreshGlobalUnused) {
        onRefreshGlobalUnused()
      }

      alert(
        `✅ Moved "${material.name}" to Required Materials\n\n` +
        `Source: ${sourceLabel}\n` +
        `Quantity: ${quantity} ${material.unit}\n` +
        `Status: Pending checkout\n\n` +
        `You can now checkout this material for use.`
      )

    } catch (error) {
      console.error("❌ Error using material:", error)
      alert("Failed to use material: " + error.message)
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

              <div className="col-span-2">
                <MaterialSelector
                  value={expectedConsumables}
                  onChange={setExpectedConsumables}
                  apiService={apiService}
                  disabled={false}
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
                  onClick={() => {
                    setActiveTab('scraps')
                    loadAvailableScrapMaterials()
                  }}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === 'scraps'
                    ? isDarkMode ? "bg-orange-600 text-white" : "bg-orange-600 text-white"
                    : isDarkMode ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                >
                  <Archive size={16} />
                  Available Scraps ({availableScrapMaterials.length})
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
                                {/* ✅ TWO DIFFERENT BUTTONS when checked out */}
                                {material.checked_out && (
                                  <>
                                    {/* RETURN Button - Returns to warehouse */}
                                    <button
                                      type="button"
                                      onClick={() => handleReturnMaterial(material, index)}
                                      className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                                      title="Return unused material to warehouse"
                                    >
                                      <PackageCheck size={12} />
                                      Return
                                    </button>

                                    {/* SCRAP Button - Marks as processed waste */}
                                    <button
                                      type="button"
                                      onClick={() => handleMarkAsScrap(material, index)}
                                      className="flex items-center gap-1 px-2 py-1 text-xs bg-orange-600 hover:bg-orange-700 text-white rounded transition-colors"
                                      title="Mark as scrap/waste (processed material)"
                                    >
                                      <Scissors size={12} />
                                      Scrap
                                    </button>
                                  </>
                                )}

                                {/* Remove button */}
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

              {activeTab === 'scraps' && (
                <div className={`space-y-4 p-4 rounded-lg border ${isDarkMode ? "bg-gray-700/30 border-gray-600" : "bg-gray-50 border-gray-300"}`}>

                  {/* Header with info */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <label className={`text-sm font-semibold flex items-center gap-2 ${isDarkMode ? "text-orange-300" : "text-orange-700"}`}>
                        <Archive size={16} />
                        🗑️ Available Scrap Materials
                      </label>
                      <p className={`text-xs mt-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                        Processed material waste from all operations that can be reused
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => loadAvailableScrapMaterials()}
                      disabled={loadingScrapMaterials}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
                    >
                      <RefreshCw size={12} className={loadingScrapMaterials ? 'animate-spin' : ''} />
                      Refresh
                    </button>
                  </div>

                  {/* Info box */}
                  <div className={`p-3 rounded-lg border text-xs ${isDarkMode
                    ? "bg-blue-500/10 border-blue-500/30 text-blue-300"
                    : "bg-blue-500/10 border-blue-500/30 text-blue-700"
                    }`}>
                    <p className="font-medium mb-1">ℹ️ About Scrap Materials:</p>
                    <ul className="list-disc list-inside space-y-1 pl-2">
                      <li>These are processed materials (cut pieces, leftovers, etc.)</li>
                      <li>Cannot be returned to warehouse as original stock</li>
                      <li>Can be reused if suitable for your operation</li>
                      <li>Click "Use" to add to your Required Materials (no warehouse deduction)</li>
                    </ul>
                  </div>

                  {/* Loading state */}
                  {loadingScrapMaterials && (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw size={24} className="animate-spin text-gray-400" />
                      <span className={`ml-2 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                        Loading scrap materials...
                      </span>
                    </div>
                  )}

                  {/* Scrap Materials List */}
                  {!loadingScrapMaterials && availableScrapMaterials.length > 0 && (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                      {availableScrapMaterials.map((scrap, index) => (
                        <div key={scrap.id || index} className={`p-3 rounded-lg border ${isDarkMode
                          ? "bg-gray-800 border-orange-600"
                          : "bg-white border-orange-300"
                          }`}>

                          {/* Header */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                                  {scrap.material_name}
                                </span>
                                {/* Scrap type badge */}
                                <span className={`text-xs px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/30`}>
                                  {scrap.scrap_type || 'waste'}
                                </span>
                              </div>
                              {/* Source location */}
                              <div className={`text-xs mt-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                                📍 From: {scrap.item_name || 'Unknown'} → {scrap.phase_name || 'Unknown'} → {scrap.subphase_name || 'Unknown'}
                              </div>
                            </div>

                            {/* Use button */}
                            <button
                              type="button"
                              onClick={() => handleUseScrapMaterial(scrap)}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                              title="Use this scrap material (no warehouse deduction)"
                            >
                              <PackagePlus size={12} />
                              Use Scrap
                            </button>
                          </div>

                          {/* Details */}
                          <div className="space-y-2 text-xs">
                            {/* Quantity available */}
                            <div className="flex items-center gap-2">
                              <Package size={12} className="text-orange-500" />
                              <span className={isDarkMode ? "text-gray-300" : "text-gray-700"}>
                                Available: <strong>{scrap.quantity_scrapped} {scrap.unit_of_measure}</strong>
                              </span>
                            </div>

                            {/* Originally scrapped by */}
                            {scrap.scrapped_by_name && (
                              <div className={`p-2 rounded border ${isDarkMode
                                ? "bg-blue-500/10 border-blue-500/30 text-blue-300"
                                : "bg-blue-500/10 border-blue-500/30 text-blue-700"
                                }`}>
                                <div className="flex items-center gap-1 mb-1">
                                  <User size={12} />
                                  <strong>Originally scrapped by:</strong>
                                </div>
                                <div className="pl-4">
                                  <div>{scrap.scrapped_by_name}</div>
                                  {scrap.scrapped_by && (
                                    <div className="opacity-80">ID: {scrap.scrapped_by}</div>
                                  )}
                                  {scrap.scrap_date && (
                                    <div className="opacity-80">
                                      Date: {new Date(scrap.scrap_date).toLocaleDateString()}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Scrap reason */}
                            {scrap.scrap_reason && (
                              <div className={`p-2 rounded border ${isDarkMode
                                ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-300"
                                : "bg-yellow-500/10 border-yellow-500/30 text-yellow-700"
                                }`}>
                                <div className="flex items-center gap-1 mb-1">
                                  <AlertTriangle size={12} />
                                  <strong>Scrap reason:</strong>
                                </div>
                                <div className="pl-4">{scrap.scrap_reason}</div>
                              </div>
                            )}

                            {/* Additional notes */}
                            {scrap.notes && (
                              <div className={`p-2 rounded text-xs ${isDarkMode
                                ? "bg-gray-700 text-gray-300"
                                : "bg-gray-100 text-gray-700"
                                }`}>
                                <strong>Notes:</strong> {scrap.notes}
                              </div>
                            )}

                            {/* Recyclable indicator */}
                            {scrap.is_recyclable && (
                              <div className="flex items-center gap-1 text-green-400">
                                <CheckCircle size={12} />
                                <span>Marked as recyclable/reusable</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Empty state */}
                  {!loadingScrapMaterials && availableScrapMaterials.length === 0 && (
                    <div className={`text-sm text-center py-8 rounded-lg border ${isDarkMode
                      ? "bg-gray-800/50 border-gray-700 text-gray-400"
                      : "bg-gray-100 border-gray-300 text-gray-600"
                      }`}>
                      <Archive size={32} className="mx-auto mb-2 opacity-50" />
                      <p className="font-medium">No scrap materials available</p>
                      <p className="text-xs mt-1">
                        Scrap materials from operations will appear here for reuse
                      </p>
                    </div>
                  )}
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