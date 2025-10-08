import { useState, useEffect } from "react"
import apiService from "../../utils/api/api-service"
import { useToast } from "./shared/ToastNotification"

function SupplierManagement({ isDarkMode }) {
  const { error: showError } = useToast()
  // Supplier Management States
  const [selectedSupplier, setSelectedSupplier] = useState("")
  const [supplierItems, setSupplierItems] = useState([])
  const [availableSuppliers, setAvailableSuppliers] = useState([])
  const [loading, setLoading] = useState(false)

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

  return (
    <div className="p-6 space-y-8">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-6">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Supplier Management</h2>
          <p className="text-lg text-gray-700 dark:text-gray-300">
            Manage suppliers and view their inventory items
          </p>
        </div>
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
            <button
              onClick={() => downloadSupplierReport(selectedSupplier)}
              className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl"
              disabled={loading}
            >
              📊 Download Report
            </button>
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
    </div>
  )
}

export default SupplierManagement