import { useState, useEffect } from "react"
import apiService from "../../utils/api/api-service"
import { useToast } from "./shared/ToastNotification"

function SupplierManagement({ isDarkMode }) {
  const { error: showError, success: showSuccess } = useToast()
  // Supplier Management States
  const [selectedSupplier, setSelectedSupplier] = useState("")
  const [supplierItems, setSupplierItems] = useState([])
  const [availableSuppliers, setAvailableSuppliers] = useState([])
  const [loading, setLoading] = useState(false)
  
  // Supplier details state (mock data for now, backend doesn't support yet)
  const [supplierDetails, setSupplierDetails] = useState({})
  
  // Supplier management modal states
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState(null)
  const [supplierForm, setSupplierForm] = useState({
    name: "",
    contact_person: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    country: "",
    notes: ""
  })

  useEffect(() => {
    fetchSuppliers()
  }, [])

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "Out Of Stock":
        return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
      case "Low In Stock":
        return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800"
      case "In Stock":
        return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800"
    }
  }

  const fetchSuppliers = async () => {
    try {
      setLoading(true)
      const result = await apiService.items.getFilterOptions()
      setAvailableSuppliers(result.data.suppliers || [])
      
      // Mock supplier details (since backend doesn't support this yet)
      // In a real app, this would be fetched from a dedicated supplier API
      const mockDetails = {}
      ;(result.data.suppliers || []).forEach((supplier) => {
        mockDetails[supplier] = {
          name: supplier,
          contact_person: `Contact for ${supplier}`,
          email: `${supplier.toLowerCase().replace(/\s+/g, "")}@example.com`,
          phone: "+63 912 345 6789",
          address: "123 Business St.",
          city: "Manila",
          country: "Philippines",
          notes: "Reliable supplier"
        }
      })
      setSupplierDetails(mockDetails)
    } catch (error) {
      console.error("Error fetching suppliers:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSupplierItems = async (supplier) => {
    if (!supplier) {
      setSupplierItems([])
      return
    }

    try {
      setLoading(true)
      const result = await apiService.items.getItemsBySupplier(supplier)
      setSupplierItems(result.data || [])
    } catch (error) {
      console.error("Error fetching supplier items:", error)
      setSupplierItems([])
    } finally {
      setLoading(false)
    }
  }

  const downloadSupplierReport = async (supplier) => {
    if (!supplier) return

    try {
      await apiService.items.exportAndDownloadSupplierReport(supplier)
    } catch (error) {
      console.error("Error downloading supplier report:", error)
      showError("Error!", "Failed to download supplier report")
    }
  }

  // Supplier CRUD operations
  const handleAddSupplier = () => {
    setEditingSupplier(null)
    setSupplierForm({
      name: "",
      contact_person: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      country: "",
      notes: ""
    })
    setIsAddEditModalOpen(true)
  }

  const handleEditSupplier = (supplier) => {
    setEditingSupplier(supplier)
    setSupplierForm(supplierDetails[supplier] || {
      name: supplier,
      contact_person: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      country: "",
      notes: ""
    })
    setIsAddEditModalOpen(true)
  }

  const handleDeleteSupplier = (supplier) => {
    setEditingSupplier(supplier)
    setIsDeleteModalOpen(true)
  }

  const handleSaveSupplier = () => {
    if (!supplierForm.name.trim()) {
      showError("Error!", "Supplier name is required")
      return
    }

    // Mock save (backend doesn't support supplier CRUD yet)
    const updatedDetails = { ...supplierDetails }
    updatedDetails[supplierForm.name] = { ...supplierForm }
    setSupplierDetails(updatedDetails)

    if (!editingSupplier) {
      // New supplier
      setAvailableSuppliers([...availableSuppliers, supplierForm.name])
      showSuccess("Success!", "Supplier added successfully")
    } else {
      // Edit existing
      if (editingSupplier !== supplierForm.name) {
        // Name changed, update list
        setAvailableSuppliers(availableSuppliers.map(s => s === editingSupplier ? supplierForm.name : s))
        delete updatedDetails[editingSupplier]
      }
      showSuccess("Success!", "Supplier updated successfully")
    }

    setIsAddEditModalOpen(false)
    setEditingSupplier(null)
  }

  const handleConfirmDelete = () => {
    if (!editingSupplier) return

    // Mock delete (backend doesn't support supplier CRUD yet)
    setAvailableSuppliers(availableSuppliers.filter(s => s !== editingSupplier))
    const updatedDetails = { ...supplierDetails }
    delete updatedDetails[editingSupplier]
    setSupplierDetails(updatedDetails)

    if (selectedSupplier === editingSupplier) {
      setSelectedSupplier("")
      setSupplierItems([])
    }

    showSuccess("Success!", "Supplier deleted successfully")
    setIsDeleteModalOpen(false)
    setEditingSupplier(null)
  }

  return (
    <div className="p-6 space-y-8">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-6">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Supplier Management</h2>
          <p className="text-lg text-gray-700 dark:text-gray-300">
            Manage suppliers and view their inventory items
          </p>
        </div>
        <button
          onClick={handleAddSupplier}
          className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl"
        >
          ➕ Add Supplier
        </button>
      </div>

      {/* Supplier Selection */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Select Supplier</h3>
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <select
              value={selectedSupplier}
              onChange={(e) => {
                setSelectedSupplier(e.target.value)
                fetchSupplierItems(e.target.value)
              }}
              className="w-full border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
              disabled={loading}
            >
              <option value="">Select a supplier...</option>
              {availableSuppliers.map((supplier) => (
                <option key={supplier} value={supplier}>
                  {supplier}
                </option>
              ))}
            </select>
          </div>
          {selectedSupplier && (
            <>
              <button
                onClick={() => handleEditSupplier(selectedSupplier)}
                className="bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-700 dark:hover:bg-yellow-600 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl"
                disabled={loading}
              >
                ✏️ Edit
              </button>
              <button
                onClick={() => handleDeleteSupplier(selectedSupplier)}
                className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl"
                disabled={loading}
              >
                🗑️ Delete
              </button>
              <button
                onClick={() => downloadSupplierReport(selectedSupplier)}
                className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl"
                disabled={loading}
              >
                📊 Download Report
              </button>
            </>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-600 dark:border-zinc-400 mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-400 mt-4">Loading supplier data...</p>
        </div>
      )}

      {/* Supplier Items */}
      {selectedSupplier && !loading && (
        <>
          {/* Supplier Contact Info Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              📇 Supplier Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Contact Person</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {supplierDetails[selectedSupplier]?.contact_person || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {supplierDetails[selectedSupplier]?.email || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Phone</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {supplierDetails[selectedSupplier]?.phone || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Address</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {supplierDetails[selectedSupplier]?.address || "N/A"}
                  {supplierDetails[selectedSupplier]?.city && `, ${supplierDetails[selectedSupplier]?.city}`}
                  {supplierDetails[selectedSupplier]?.country && `, ${supplierDetails[selectedSupplier]?.country}`}
                </p>
              </div>
              {supplierDetails[selectedSupplier]?.notes && (
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Notes</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {supplierDetails[selectedSupplier]?.notes}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Items from {selectedSupplier}</h3>
              <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-3 py-1 rounded-full text-sm font-medium">
                {supplierItems.length} items
              </span>
            </div>

          {supplierItems.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📦</span>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Items Found</h4>
              <p className="text-gray-600 dark:text-gray-400">This supplier has no items in the inventory.</p>
            </div>
          ) : (
            <>
              {/* Supplier Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Items</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{supplierItems.length}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Value</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(
                      supplierItems.reduce((sum, item) => sum + ((item.balance || 0) * (item.price_per_unit || 0)), 0)
                    )}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Low/Out of Stock</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {supplierItems.filter(item => 
                      item.item_status === "Low In Stock" || item.item_status === "Out Of Stock"
                    ).length}
                  </p>
                </div>
              </div>

              {/* Items Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {supplierItems.map((item) => (
                  <div
                    key={item.item_no}
                    className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">{item.item_name}</h4>
                        {item.brand && (
                          <p className="text-xs text-gray-600 dark:text-gray-400">{item.brand}</p>
                        )}
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(item.item_status)}`}
                      >
                        {item.item_status}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Type:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{item.item_type || "N/A"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Location:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{item.location || "N/A"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Balance:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {item.balance} {item.unit_of_measure || ""}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Min Stock:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{item.min_stock}</span>
                      </div>
                      <div className="flex justify-between border-t border-gray-200 dark:border-gray-600 pt-2">
                        <span className="text-gray-600 dark:text-gray-400">Price:</span>
                        <span className="font-bold text-blue-600 dark:text-blue-400">
                          {formatCurrency(item.price_per_unit)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Total Value:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency((item.balance || 0) * (item.price_per_unit || 0))}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        </>
      )}

      {/* Instructions when no supplier selected */}
      {!selectedSupplier && !loading && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl">👥</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Select a Supplier</h3>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              Choose a supplier from the dropdown above to view their inventory items and generate reports.
            </p>
          </div>
        </div>
      )}

      {/* Add/Edit Supplier Modal */}
      {isAddEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-2xl border border-gray-200 dark:border-gray-700 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              {editingSupplier ? "Edit Supplier" : "Add New Supplier"}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Supplier Name *
                </label>
                <input
                  type="text"
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                  className="w-full border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="Enter supplier name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Contact Person
                </label>
                <input
                  type="text"
                  value={supplierForm.contact_person}
                  onChange={(e) => setSupplierForm({ ...supplierForm, contact_person: e.target.value })}
                  className="w-full border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="Enter contact person name"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={supplierForm.email}
                    onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                    className="w-full border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="email@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={supplierForm.phone}
                    onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                    className="w-full border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="+63 912 345 6789"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Address
                </label>
                <input
                  type="text"
                  value={supplierForm.address}
                  onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                  className="w-full border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="Street address"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    value={supplierForm.city}
                    onChange={(e) => setSupplierForm({ ...supplierForm, city: e.target.value })}
                    className="w-full border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="City"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Country
                  </label>
                  <input
                    type="text"
                    value={supplierForm.country}
                    onChange={(e) => setSupplierForm({ ...supplierForm, country: e.target.value })}
                    className="w-full border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="Country"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notes
                </label>
                <textarea
                  value={supplierForm.notes}
                  onChange={(e) => setSupplierForm({ ...supplierForm, notes: e.target.value })}
                  className="w-full border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 min-h-[100px]"
                  placeholder="Additional notes about the supplier"
                />
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button
                onClick={handleSaveSupplier}
                className="flex-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200"
              >
                {editingSupplier ? "Update Supplier" : "Add Supplier"}
              </button>
              <button
                onClick={() => {
                  setIsAddEditModalOpen(false)
                  setEditingSupplier(null)
                }}
                className="flex-1 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-700 text-gray-900 dark:text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-2xl border border-gray-200 dark:border-gray-700 max-w-md w-full mx-4">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Delete Supplier</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Are you sure you want to delete <strong>{editingSupplier}</strong>? This action cannot be undone.
            </p>
            
            <div className="flex gap-4">
              <button
                onClick={handleConfirmDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200"
              >
                Delete
              </button>
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false)
                  setEditingSupplier(null)
                }}
                className="flex-1 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-700 text-gray-900 dark:text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SupplierManagement