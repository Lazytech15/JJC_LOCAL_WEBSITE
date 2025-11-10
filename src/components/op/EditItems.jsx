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
  ChevronDown,
  ChevronUp
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
    remarks: item?.remarks || ""
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
      <div className={`rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto ${
        isDarkMode ? "bg-gray-800" : "bg-white"
      }`}>
        {/* Header */}
        <div className={`sticky top-0 flex justify-between items-center p-6 border-b ${
          isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
        }`}>
          <h2 className={`text-xl font-bold flex items-center gap-2 ${
            isDarkMode ? "text-gray-100" : "text-gray-800"
          }`}>
            <Edit2 size={20} />
            Edit Item: {item?.part_number}
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode 
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
            <label className={`block text-sm font-medium mb-1 ${
              isDarkMode ? "text-gray-300" : "text-gray-700"
            }`}>
              Item Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDarkMode
                  ? "bg-gray-700 border border-gray-600 text-gray-100"
                  : "bg-gray-100 border border-gray-300 text-gray-800"
              }`}
            />
          </div>

          {/* Description */}
          <div>
            <label className={`block text-sm font-medium mb-1 ${
              isDarkMode ? "text-gray-300" : "text-gray-700"
            }`}>
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                isDarkMode
                  ? "bg-gray-700 border border-gray-600 text-gray-100"
                  : "bg-gray-100 border border-gray-300 text-gray-800"
              }`}
            />
          </div>

          {/* Client Name */}
          <div className="relative" ref={clientDropdownRef}>
            <label className={`block text-sm font-medium mb-1 flex items-center gap-2 ${
              isDarkMode ? "text-gray-300" : "text-gray-700"
            }`}>
              <User size={16} />
              Client Name
            </label>
            <input
              type="text"
              value={formData.client_name}
              onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
              onFocus={() => setShowClientDropdown(clients.length > 0)}
              className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDarkMode
                  ? "bg-gray-700 border border-gray-600 text-gray-100"
                  : "bg-gray-100 border border-gray-300 text-gray-800"
              }`}
            />
            {showClientDropdown && filteredClients.length > 0 && (
              <div className={`absolute z-10 w-full mt-1 rounded-lg shadow-lg max-h-40 overflow-y-auto border ${
                isDarkMode ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"
              }`}>
                {filteredClients.map((client, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, client_name: client })
                      setShowClientDropdown(false)
                    }}
                    className={`w-full text-left px-4 py-2 border-b last:border-b-0 transition-colors ${
                      isDarkMode
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
            <label className={`block text-sm font-medium mb-1 flex items-center gap-2 ${
              isDarkMode ? "text-gray-300" : "text-gray-700"
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
                  className={`px-4 py-2 rounded-lg border-2 font-medium transition-colors ${
                    formData.priority === p
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
            <label className={`block text-sm font-medium mb-1 flex items-center gap-2 ${
              isDarkMode ? "text-gray-300" : "text-gray-700"
            }`}>
              <Package size={16} />
              Batch Quantity
            </label>
            <input
              type="number"
              min="1"
              value={formData.qty}
              onChange={(e) => setFormData({ ...formData, qty: e.target.value })}
              className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDarkMode
                  ? "bg-gray-700 border border-gray-600 text-gray-100"
                  : "bg-gray-100 border border-gray-300 text-gray-800"
              }`}
            />
          </div>

          {/* Remarks */}
          <div>
            <label className={`block text-sm font-medium mb-1 ${
              isDarkMode ? "text-gray-300" : "text-gray-700"
            }`}>
              Remarks
            </label>
            <textarea
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              rows={4}
              className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                isDarkMode
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
      <div className={`rounded-lg max-w-md w-full ${
        isDarkMode ? "bg-gray-800" : "bg-white"
      }`}>
        {/* Header */}
        <div className={`flex justify-between items-center p-6 border-b ${
          isDarkMode ? "border-gray-700" : "border-gray-200"
        }`}>
          <h2 className={`text-xl font-bold flex items-center gap-2 ${
            isDarkMode ? "text-gray-100" : "text-gray-800"
          }`}>
            <Edit2 size={20} />
            Edit Phase
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode 
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
            <label className={`block text-sm font-medium mb-1 ${
              isDarkMode ? "text-gray-300" : "text-gray-700"
            }`}>
              Phase Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDarkMode
                  ? "bg-gray-700 border border-gray-600 text-gray-100"
                  : "bg-gray-100 border border-gray-300 text-gray-800"
              }`}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${
              isDarkMode ? "text-gray-300" : "text-gray-700"
            }`}>
              Phase Order
            </label>
            <input
              type="number"
              min="0"
              value={formData.phase_order}
              onChange={(e) => setFormData({ ...formData, phase_order: e.target.value })}
              className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDarkMode
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
function EditSubphaseModal({ subphase, onClose, onSave, onDelete, isDarkMode, batchQty = 1 }) {
  const [formData, setFormData] = useState({
    name: subphase?.name || "",
    expected_duration: subphase?.expected_duration || 0,
    expected_quantity: subphase?.expected_quantity || 0,
    subphase_order: subphase?.subphase_order || 0
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

  const handleDelete = () => {
    if (window.confirm(`Delete subphase "${subphase.name}"?`)) {
      onDelete()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`rounded-lg max-w-md w-full ${
        isDarkMode ? "bg-gray-800" : "bg-white"
      }`}>
        {/* Header */}
        <div className={`flex justify-between items-center p-6 border-b ${
          isDarkMode ? "border-gray-700" : "border-gray-200"
        }`}>
          <h2 className={`text-xl font-bold flex items-center gap-2 ${
            isDarkMode ? "text-gray-100" : "text-gray-800"
          }`}>
            <Edit2 size={20} />
            Edit Subphase
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode 
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
            <label className={`block text-sm font-medium mb-1 ${
              isDarkMode ? "text-gray-300" : "text-gray-700"
            }`}>
              Subphase Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDarkMode
                  ? "bg-gray-700 border border-gray-600 text-gray-100"
                  : "bg-gray-100 border border-gray-300 text-gray-800"
              }`}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 flex items-center gap-2 ${
              isDarkMode ? "text-gray-300" : "text-gray-700"
            }`}>
              <Clock size={16} />
              Expected Duration (hours)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={formData.expected_duration}
              onChange={(e) => setFormData({ ...formData, expected_duration: e.target.value })}
              className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDarkMode
                  ? "bg-gray-700 border border-gray-600 text-gray-100"
                  : "bg-gray-100 border border-gray-300 text-gray-800"
              }`}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 flex items-center gap-2 ${
              isDarkMode ? "text-gray-300" : "text-gray-700"
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
              className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDarkMode
                  ? "bg-gray-700 border border-gray-600 text-gray-100"
                  : "bg-gray-100 border border-gray-300 text-gray-800"
              }`}
            />
            <p className={`text-xs mt-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
              Max: {batchQty} (batch quantity)
            </p>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${
              isDarkMode ? "text-gray-300" : "text-gray-700"
            }`}>
              Subphase Order
            </label>
            <input
              type="number"
              min="0"
              value={formData.subphase_order}
              onChange={(e) => setFormData({ ...formData, subphase_order: e.target.value })}
              className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDarkMode
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
              Delete Subphase
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
      <div className={`rounded-lg max-w-md w-full ${
        isDarkMode ? "bg-gray-800" : "bg-white"
      }`}>
        {/* Header */}
        <div className={`flex justify-between items-center p-6 border-b ${
          isDarkMode ? "border-gray-700" : "border-gray-200"
        }`}>
          <h2 className={`text-xl font-bold flex items-center gap-2 ${
            isDarkMode ? "text-gray-100" : "text-gray-800"
          }`}>
            <Plus size={20} />
            Add New Phase to {item?.name}
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode 
                ? "hover:bg-gray-700 text-gray-300" 
                : "hover:bg-gray-100 text-gray-600"
            }`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className={`p-3 rounded-lg ${
            isDarkMode ? "bg-blue-500/10" : "bg-blue-500/10"
          }`}>
            <p className={`text-sm ${isDarkMode ? "text-blue-300" : "text-blue-700"}`}>
              <strong>Item:</strong> {item?.part_number}
            </p>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${
              isDarkMode ? "text-gray-300" : "text-gray-700"
            }`}>
              Phase Name *
            </label>
            <input
              type="text"
              placeholder="e.g., Manufacturing, Quality Check"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              autoFocus
              className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDarkMode
                  ? "bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-400"
                  : "bg-gray-100 border border-gray-300 text-gray-800 placeholder-gray-500"
              }`}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${
              isDarkMode ? "text-gray-300" : "text-gray-700"
            }`}>
              Phase Order (optional)
            </label>
            <input
              type="number"
              min="0"
              value={formData.phase_order}
              onChange={(e) => setFormData({ ...formData, phase_order: e.target.value })}
              className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDarkMode
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
      <div className={`rounded-lg max-w-md w-full ${
        isDarkMode ? "bg-gray-800" : "bg-white"
      }`}>
        {/* Header */}
        <div className={`flex justify-between items-center p-6 border-b ${
          isDarkMode ? "border-gray-700" : "border-gray-200"
        }`}>
          <h2 className={`text-xl font-bold flex items-center gap-2 ${
            isDarkMode ? "text-gray-100" : "text-gray-800"
          }`}>
            <Plus size={20} />
            Add New Subphase
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode 
                ? "hover:bg-gray-700 text-gray-300" 
                : "hover:bg-gray-100 text-gray-600"
            }`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className={`p-3 rounded-lg space-y-1 ${
            isDarkMode ? "bg-blue-500/10" : "bg-blue-500/10"
          }`}>
            <p className={`text-sm ${isDarkMode ? "text-blue-300" : "text-blue-700"}`}>
              <strong>Item:</strong> {item?.name}
            </p>
            <p className={`text-sm ${isDarkMode ? "text-blue-300" : "text-blue-700"}`}>
              <strong>Phase:</strong> {phase?.name}
            </p>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${
              isDarkMode ? "text-gray-300" : "text-gray-700"
            }`}>
              Subphase Name *
            </label>
            <input
              type="text"
              placeholder="e.g., Assembly, Testing, Packaging"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              autoFocus
              className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDarkMode
                  ? "bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-400"
                  : "bg-gray-100 border border-gray-300 text-gray-800 placeholder-gray-500"
              }`}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 flex items-center gap-2 ${
              isDarkMode ? "text-gray-300" : "text-gray-700"
            }`}>
              <Clock size={16} />
              Expected Duration (hours)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              placeholder="e.g., 2.5"
              value={formData.expected_duration}
              onChange={(e) => setFormData({ ...formData, expected_duration: e.target.value })}
              className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDarkMode
                  ? "bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-400"
                  : "bg-gray-100 border border-gray-300 text-gray-800 placeholder-gray-500"
              }`}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 flex items-center gap-2 ${
              isDarkMode ? "text-gray-300" : "text-gray-700"
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
              className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDarkMode
                  ? "bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-400"
                  : "bg-gray-100 border border-gray-300 text-gray-800 placeholder-gray-500"
              }`}
            />
            <p className={`text-xs mt-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
              Max: {batchQty} (batch quantity)
            </p>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${
              isDarkMode ? "text-gray-300" : "text-gray-700"
            }`}>
              Subphase Order (optional)
            </label>
            <input
              type="number"
              min="0"
              value={formData.subphase_order}
              onChange={(e) => setFormData({ ...formData, subphase_order: e.target.value })}
              className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDarkMode
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
      <div className={`rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto ${
        isDarkMode ? "bg-gray-800" : "bg-white"
      }`}>
        {/* Header */}
        <div className={`sticky top-0 flex justify-between items-center p-6 border-b ${
          isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
        }`}>
          <h2 className={`text-xl font-bold flex items-center gap-2 ${
            isDarkMode ? "text-gray-100" : "text-gray-800"
          }`}>
            <Edit2 size={20} />
            Bulk Edit ({selectedItems?.length || 0} items)
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode 
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
              <div key={idx} className={`text-xs px-3 py-2 rounded ${
                isDarkMode ? "bg-gray-700" : "bg-gray-100"
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
          <div className={`p-4 rounded-lg border ${
            isDarkMode ? "bg-yellow-500/10 border-yellow-500/30" : "bg-yellow-500/10 border-yellow-500/30"
          }`}>
            <p className={`text-sm flex items-center gap-2 ${
              isDarkMode ? "text-yellow-300" : "text-yellow-700"
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
              <label className={`text-sm font-medium flex items-center gap-2 ${
                isDarkMode ? "text-gray-300" : "text-gray-700"
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
              className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 ${
                isDarkMode
                  ? "bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-400"
                  : "bg-gray-100 border border-gray-300 text-gray-800 placeholder-gray-500"
              }`}
            />
            {showClientDropdown && filteredClients.length > 0 && formData.updateClient && (
              <div className={`absolute z-10 w-full mt-1 rounded-lg shadow-lg max-h-40 overflow-y-auto border ${
                isDarkMode ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"
              }`}>
                {filteredClients.map((client, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, client_name: client })
                      setShowClientDropdown(false)
                    }}
                    className={`w-full text-left px-4 py-2 border-b last:border-b-0 transition-colors ${
                      isDarkMode
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
              <label className={`text-sm font-medium flex items-center gap-2 ${
                isDarkMode ? "text-gray-300" : "text-gray-700"
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
                  className={`px-4 py-2 rounded-lg border-2 font-medium transition-colors disabled:opacity-50 ${
                    formData.priority === p && formData.updatePriority
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
              <label className={`text-sm font-medium ${
                isDarkMode ? "text-gray-300" : "text-gray-700"
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
              className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:opacity-50 ${
                isDarkMode
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

  const handleSaveSubphase = (data) => {
    console.log("Saving subphase:", data)
    alert("Subphase saved! Check console for data.")
    setShowSubphaseModal(false)
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
    <div className={`min-h-screen p-8 transition-colors duration-300 ${
      isDarkMode 
        ? "bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950" 
        : "bg-gradient-to-br from-gray-50 via-slate-50 to-stone-50"
    }`}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className={`backdrop-blur-md rounded-2xl p-6 mb-6 border shadow-lg ${
          isDarkMode ? "bg-gray-800/60 border-gray-700/50" : "bg-white/30 border-white/40"
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
              className={`p-3 rounded-lg transition-all ${
                isDarkMode
                  ? "bg-gray-700 hover:bg-gray-600 text-yellow-400"
                  : "bg-white/50 hover:bg-white/70 text-gray-700"
              }`}
            >
              {isDarkMode ? "☀️" : "🌙"}
            </button>
          </div>
        </div>

        {/* Demo Buttons */}
        <div className={`backdrop-blur-md rounded-2xl p-6 border shadow-lg space-y-4 ${
          isDarkMode ? "bg-gray-800/60 border-gray-700/50" : "bg-white/30 border-white/40"
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
        <div className={`mt-6 backdrop-blur-md rounded-2xl p-6 border shadow-lg ${
          isDarkMode ? "bg-blue-500/10 border-blue-500/30" : "bg-blue-500/10 border-blue-500/20"
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