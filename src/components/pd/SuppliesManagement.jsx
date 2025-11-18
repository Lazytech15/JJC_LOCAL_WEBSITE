import { useState, useEffect } from "react"
import { useAuth } from "../../contexts/AuthContext"
import apiService from "../../utils/api/api-service"
import { useToast } from "./shared/ToastNotification"
import { SupplierManagementSkeleton } from "../skeletons/ProcurementSkeletons"

function SupplierManagement() {
  const { isDarkMode } = useAuth()
  const {  error: showError, success: showSuccess } = useToast()
  // Supplier Management States
  const [selectedSupplier, setSelectedSupplier] = useState(null)
  const [supplierMetrics, setSupplierMetrics] = useState(null)
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  
  // Supplier management modal states
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState(null)
  const [wizardStep, setWizardStep] = useState(1)
  const [viewingSupplier, setViewingSupplier] = useState(null)
  const [supplierForm, setSupplierForm] = useState({
    name: "",
    contact_person: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    country: "",
    postal_code: "",
    website: "",
    tax_id: "",
    payment_terms: "",
    notes: "",
    status: "active"
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
      setInitialLoading(true)
      const result = await apiService.suppliers.getSuppliers()
      setSuppliers(result.suppliers || [])
    } catch (error) {
      console.error("Error fetching suppliers:", error)
      showError("Failed to fetch suppliers")
    } finally {
      setInitialLoading(false)
    }
  }

  const fetchSupplierMetrics = async (supplierId) => {
    if (!supplierId) {
      setSupplierMetrics(null)
      return
    }

    try {
      setLoading(true)
      const result = await apiService.suppliers.getSupplierMetrics(supplierId)
      // API returns a top-level object with inventory_metrics and purchase_order_metrics
      setSupplierMetrics(result || null)
    } catch (error) {
      console.error("Error fetching supplier metrics:", error)
      setSupplierMetrics(null)
    } finally {
      setLoading(false)
    }
  }

  const downloadSupplierReport = async (supplier) => {
    if (!supplier) return

    try {
      await apiService.items.exportAndDownloadSupplierReport(supplier.name)
    } catch (error) {
      console.error("Error downloading supplier report:", error)
      showError("Error!", "Failed to download supplier report")
    }
  }

  // Supplier CRUD operations
  const resetSupplierForm = () => {
    setSupplierForm({
      name: "",
      contact_person: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      country: "",
      postal_code: "",
      website: "",
      tax_id: "",
      payment_terms: "",
      notes: "",
      status: "active"
    })
  }

  const handleAddSupplier = () => {
    setEditingSupplier(null)
    resetSupplierForm()
    setWizardStep(1)
    setIsAddEditModalOpen(true)
  }

  const handleEditSupplier = (supplier) => {
    setEditingSupplier(supplier)
    setSupplierForm({
      name: supplier.name,
      contact_person: supplier.contact_person || "",
      email: supplier.email || "",
      phone: supplier.phone || "",
      address: supplier.address || "",
      city: supplier.city || "",
      country: supplier.country || "",
      postal_code: supplier.postal_code || "",
      website: supplier.website || "",
      tax_id: supplier.tax_id || "",
      payment_terms: supplier.payment_terms || "",
      notes: supplier.notes || "",
      status: supplier.status || "active"
    })
    setWizardStep(1)
    setIsAddEditModalOpen(true)
  }

  const handleViewSupplier = (supplier) => {
    setViewingSupplier(supplier)
    setIsViewModalOpen(true)
  }

  const handleDeleteSupplier = (supplier) => {
    setEditingSupplier(supplier)
    setIsDeleteModalOpen(true)
  }

  const handleSaveSupplier = async () => {
    // Validate form
    const validation = apiService.suppliers.validateSupplierData(supplierForm)
    if (!validation.isValid) {
      showError("Validation Error", validation.errors.join(", "))
      return
    }

    try {
      setLoading(true)
      
      if (editingSupplier) {
        // Update existing supplier
        await apiService.suppliers.updateSupplier(editingSupplier.id, supplierForm)
        showSuccess("Success!", "Supplier updated successfully")
      } else {
        // Create new supplier
        await apiService.suppliers.createSupplier(supplierForm)
        showSuccess("Success!", "Supplier added successfully")
      }
      
      setIsAddEditModalOpen(false)
      fetchSuppliers() // Refresh the list
    } catch (error) {
      console.error("Error saving supplier:", error)
      showError("Error!", error.message || "Failed to save supplier")
    } finally {
      setLoading(false)
    }
  }

  const confirmDeleteSupplier = async () => {
    try {
      setLoading(true)
      await apiService.suppliers.deleteSupplier(editingSupplier.id)
      
      showSuccess("Success!", "Supplier deleted successfully")
      setIsDeleteModalOpen(false)
      
      // Clear selection if deleted supplier was selected
      if (selectedSupplier?.id === editingSupplier.id) {
        setSelectedSupplier(null)
        setSupplierMetrics(null)
      }
      
      fetchSuppliers() // Refresh the list
    } catch (error) {
      console.error("Error deleting supplier:", error)
      showError("Error!", error.message || "Failed to delete supplier")
    } finally {
      setLoading(false)
    }
  }

  if (initialLoading) {
    return <SupplierManagementSkeleton />
  }

  return (
    <div className="p-6 space-y-8">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-6">
        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">Supplier Management</h2>
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
      <div className={isDarkMode ? "bg-gray-800 border-gray-700 rounded-2xl p-6 shadow-lg border" : "bg-white border-gray-200 rounded-2xl p-6 shadow-lg border"}>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Select Supplier</h3>
        <div className="flex gap-4 items-end">
          <div className="flex-1">
              <select
              value={selectedSupplier?.id || ""}
              onChange={(e) => {
                const supplier = suppliers.find(s => s.id === parseInt(e.target.value))
                setSelectedSupplier(supplier || null)
                // Fetch concise metrics instead of full item list
                fetchSupplierMetrics(supplier?.id)
              }}
              className="w-full border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
              disabled={loading}
            >
              <option value="">Select a supplier...</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name} ({supplier.item_count} items)
                </option>
              ))}
            </select>
          </div>
          {selectedSupplier && (
            <>
              <button
                onClick={() => handleViewSupplier(selectedSupplier)}
                className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl"
                disabled={loading}
              >
                👁️ View
              </button>
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
          <div className={isDarkMode ? "bg-gray-800 border-gray-700 rounded-2xl p-6 shadow-lg border" : "bg-white border-gray-200 rounded-2xl p-6 shadow-lg border"}>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              📇 Supplier Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Contact Person</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {selectedSupplier?.contact_person || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {selectedSupplier?.email || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Phone</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {selectedSupplier?.phone || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Address</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {selectedSupplier?.address || "N/A"}
                  {selectedSupplier?.city && `, ${selectedSupplier?.city}`}
                  {selectedSupplier?.country && `, ${selectedSupplier?.country}`}
                  {selectedSupplier?.postal_code && ` ${selectedSupplier?.postal_code}`}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Items Count</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {selectedSupplier?.item_count || 0} items
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Inventory Value</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  ₱{selectedSupplier?.total_inventory_value?.toLocaleString() || '0'}
                </p>
              </div>
              {selectedSupplier?.notes && (
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Notes</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {selectedSupplier?.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
          <div className={isDarkMode ? "bg-gray-800 border-gray-700 rounded-2xl p-6 shadow-lg border" : "bg-white border-gray-200 rounded-2xl p-6 shadow-lg border"}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Supplier Summary — {selectedSupplier?.name}</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Items</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{supplierMetrics?.inventory_metrics?.total_items ?? selectedSupplier?.item_count ?? 0}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Inventory Value</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(supplierMetrics?.inventory_metrics?.total_inventory_value ?? selectedSupplier?.total_inventory_value ?? 0)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">Low/Out of Stock</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{((supplierMetrics?.inventory_metrics?.low_stock_count ?? 0) + (supplierMetrics?.inventory_metrics?.out_of_stock_count ?? 0)) || 0}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Recent Purchase Orders (6mo)</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {typeof supplierMetrics?.purchase_order_metrics?.recent_po_count === 'number' && supplierMetrics.purchase_order_metrics.recent_po_count > 0
                    ? `${supplierMetrics.purchase_order_metrics.recent_po_count} recent PO(s)`
                    : 'No recent PO'}
                </p>
                {supplierMetrics?.purchase_order_metrics?.avg_po_value ? (
                  <p className="text-sm text-gray-500">Avg PO: {formatCurrency(supplierMetrics.purchase_order_metrics.avg_po_value)}</p>
                ) : null}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Instructions when no supplier selected */}
      {!selectedSupplier && !loading && (
        <div className={isDarkMode ? "bg-gray-800 border-gray-700 rounded-2xl p-12 shadow-lg border" : "bg-white border-gray-200 rounded-2xl p-12 shadow-lg border"}>
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
          <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-2xl border border-gray-200 dark:border-gray-700 max-w-2xl w-full mx-2 sm:mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              {editingSupplier ? "Edit Supplier" : "Add New Supplier"}
            </h3>

            {/* Wizard Steps Indicator */}
            <div className="flex items-center gap-3 mb-6">
              {[1,2,3].map((s) => (
                <div key={s} className={`flex-1 py-2 px-3 rounded-lg text-center text-sm font-medium ${wizardStep===s? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
                  {s===1? 'Basic' : s===2? 'Address/Payment' : 'Notes/Review'}
                </div>
              ))}
            </div>

            {/* Step Content */}
            <div className="space-y-4">
              {wizardStep === 1 && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Supplier Name *</label>
                    <input type="text" value={supplierForm.name} onChange={(e)=>setSupplierForm({...supplierForm, name: e.target.value})}
                      className="w-full border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white" placeholder="Enter supplier name" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Contact Person</label>
                    <input type="text" value={supplierForm.contact_person} onChange={(e)=>setSupplierForm({...supplierForm, contact_person: e.target.value})}
                      className="w-full border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white" placeholder="Enter contact person name" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
                      <input type="email" value={supplierForm.email} onChange={(e)=>setSupplierForm({...supplierForm, email: e.target.value})}
                        className="w-full border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white" placeholder="email@example.com" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phone</label>
                      <input type="tel" value={supplierForm.phone} onChange={(e)=>setSupplierForm({...supplierForm, phone: e.target.value})}
                        className="w-full border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white" placeholder="+63 912 345 6789" />
                    </div>
                  </div>
                </>
              )}

              {wizardStep === 2 && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Address</label>
                    <input type="text" value={supplierForm.address} onChange={(e)=>setSupplierForm({...supplierForm, address: e.target.value})}
                      className="w-full border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white" placeholder="Street address" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">City</label>
                      <input type="text" value={supplierForm.city} onChange={(e)=>setSupplierForm({...supplierForm, city: e.target.value})}
                        className="w-full border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white" placeholder="City" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Country</label>
                      <input type="text" value={supplierForm.country} onChange={(e)=>setSupplierForm({...supplierForm, country: e.target.value})}
                        className="w-full border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white" placeholder="Country" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Postal Code</label>
                      <input type="text" value={supplierForm.postal_code} onChange={(e)=>setSupplierForm({...supplierForm, postal_code: e.target.value})}
                        className="w-full border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white" placeholder="Postal code" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
                      <select value={supplierForm.status} onChange={(e)=>setSupplierForm({...supplierForm, status: e.target.value})}
                        className="w-full border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white">
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="suspended">Suspended</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Website</label>
                      <input type="url" value={supplierForm.website} onChange={(e)=>setSupplierForm({...supplierForm, website: e.target.value})}
                        className="w-full border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white" placeholder="https://example.com" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Payment Terms</label>
                      <select value={supplierForm.payment_terms} onChange={(e)=>setSupplierForm({...supplierForm, payment_terms: e.target.value})}
                        className="w-full border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white">
                        <option value="Net 15">Net 15</option>
                        <option value="Net 30">Net 30</option>
                        <option value="Net 45">Net 45</option>
                        <option value="Net 60">Net 60</option>
                        <option value="Cash on Delivery">Cash on Delivery</option>
                        <option value="Prepayment">Prepayment</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {wizardStep === 3 && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes</label>
                    <textarea value={supplierForm.notes} onChange={(e)=>setSupplierForm({...supplierForm, notes: e.target.value})}
                      className="w-full border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white min-h-[120px]" placeholder="Additional notes about the supplier" />
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Review</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Name: <span className="font-medium">{supplierForm.name}</span></p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Contact: <span className="font-medium">{supplierForm.contact_person}</span></p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Email: <span className="font-medium">{supplierForm.email}</span></p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Phone: <span className="font-medium">{supplierForm.phone}</span></p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Address: <span className="font-medium">{[supplierForm.address, supplierForm.city, supplierForm.country, supplierForm.postal_code].filter(Boolean).join(', ')}</span></p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Payment: <span className="font-medium">{supplierForm.payment_terms}</span></p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Status: <span className="font-medium">{supplierForm.status}</span></p>
                  </div>
                </>
              )}
            </div>

            {/* Wizard Controls */}
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setIsAddEditModalOpen(false); setEditingSupplier(null); }} className="flex-1 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-700 text-gray-900 dark:text-white px-6 py-3 rounded-xl font-semibold">Cancel</button>

              {wizardStep > 1 && (
                <button onClick={() => setWizardStep(w => Math.max(1, w-1))} className="px-6 py-3 rounded-xl bg-gray-200 dark:bg-gray-700">Back</button>
              )}

              {wizardStep < 3 ? (
                <button onClick={() => {
                  // basic front-end validation per step
                  if (wizardStep === 1) {
                    if (!supplierForm.name?.trim()) { showError('Validation Error', 'Supplier name is required'); return }
                    if (!supplierForm.contact_person?.trim()) { showError('Validation Error', 'Contact person is required'); return }
                    if (!supplierForm.email?.trim()) { showError('Validation Error', 'Email is required'); return }
                  }
                  setWizardStep(w => Math.min(3, w+1))
                }} className="px-6 py-3 rounded-xl bg-blue-600 text-white">Next</button>
              ) : (
                <button onClick={async () => {
                  await handleSaveSupplier()
                  setWizardStep(1)
                }} className="flex-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold">{editingSupplier? 'Update Supplier' : 'Add Supplier'}</button>
              )}
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
              Are you sure you want to delete <strong>{editingSupplier?.name}</strong>? This action cannot be undone.
            </p>
            
            <div className="flex gap-4">
              <button
                onClick={confirmDeleteSupplier}
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

      {/* View Supplier Modal */}
      {isViewModalOpen && viewingSupplier && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 p-6 rounded-t-2xl">
              <h3 className="text-xl font-bold text-white">Supplier Details</h3>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Supplier Name
                  </label>
                  <p className="text-gray-900 dark:text-white font-semibold">{viewingSupplier.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Contact Person
                  </label>
                  <p className="text-gray-900 dark:text-white">{viewingSupplier.contact_person}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email
                  </label>
                  <p className="text-gray-900 dark:text-white">{viewingSupplier.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Phone
                  </label>
                  <p className="text-gray-900 dark:text-white">{viewingSupplier.phone}</p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Address
                  </label>
                  <p className="text-gray-900 dark:text-white">
                    {[viewingSupplier.address, viewingSupplier.city, viewingSupplier.country, viewingSupplier.postal_code]
                      .filter(Boolean)
                      .join(', ') || 'No address provided'}
                  </p>
                </div>
                {viewingSupplier.website && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Website
                    </label>
                    <a
                      href={viewingSupplier.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {viewingSupplier.website}
                    </a>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Status
                  </label>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      viewingSupplier.status === 'active'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                    }`}
                  >
                    {viewingSupplier.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Items Count
                  </label>
                  <p className="text-gray-900 dark:text-white font-semibold">{viewingSupplier.item_count} items</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Total Inventory Value
                  </label>
                  <p className="text-gray-900 dark:text-white font-semibold">₱{viewingSupplier.total_inventory_value?.toLocaleString() || '0'}</p>
                </div>
                {viewingSupplier.payment_terms && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Payment Terms
                    </label>
                    <p className="text-gray-900 dark:text-white">{viewingSupplier.payment_terms}</p>
                  </div>
                )}
                {viewingSupplier.notes && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Notes
                    </label>
                    <p className="text-gray-900 dark:text-white">{viewingSupplier.notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 rounded-b-2xl flex gap-3">
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-700 text-gray-900 dark:text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setIsViewModalOpen(false)
                  handleEditSupplier(viewingSupplier)
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200"
              >
                Edit Supplier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SupplierManagement