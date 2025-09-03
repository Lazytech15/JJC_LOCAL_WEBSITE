"use client"

import { useState, useEffect } from "react"
import ItemForm from "./ItemForm"
import QRCodeGenerator from "./QRCodeGenerator"
import QRCodeScanner from "./QRCodeScanner"

function InventoryManagement({ isDarkMode = false }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState("dashboard")
  const [selectedItem, setSelectedItem] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [showQRGenerator, setShowQRGenerator] = useState(false)
  const [showQRScanner, setShowQRScanner] = useState(false)
  const [statistics, setStatistics] = useState({})
  const [filters, setFilters] = useState({
    search: "",
    item_type: "",
    location: "",
    item_status: "",
  })

  useEffect(() => {
    fetchItems()
  }, [filters])

  const fetchItems = async () => {
    try {
      setLoading(true)
      const queryParams = new URLSearchParams(filters).toString()
      const response = await fetch(`/api/items?${queryParams}`)

      if (!response.ok) throw new Error("Failed to fetch items")

      const result = await response.json()
      setItems(result.data || [])
      setStatistics(result.statistics || {})
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveItem = async (itemData) => {
    try {
      const url = selectedItem ? `/api/items/${selectedItem.item_no}` : "/api/items"
      const method = selectedItem ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(itemData),
      })

      if (!response.ok) throw new Error("Failed to save item")

      await fetchItems()
      setShowForm(false)
      setSelectedItem(null)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDeleteItem = async (itemNo) => {
    if (!confirm("Are you sure you want to delete this item?")) return

    try {
      const response = await fetch(`/api/items/${itemNo}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete item")

      await fetchItems()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleEditItem = (item) => {
    setSelectedItem(item)
    setShowForm(true)
  }

  const handleQRScan = async (scannedData) => {
    try {
      // Parse QR code data (assuming it contains item_no)
      const itemNo = Number.parseInt(scannedData)
      if (!isNaN(itemNo)) {
        const response = await fetch(`/api/items/${itemNo}`)
        if (response.ok) {
          const result = await response.json()
          setSelectedItem(result.data)
          setShowForm(true)
        }
      }
    } catch (err) {
      setError("Failed to process QR code")
    }
    setShowQRScanner(false)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "Out Of Stock":
        return "bg-red-100 text-red-800 border-red-200"
      case "Low In Stock":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "In Stock":
        return "bg-green-100 text-green-800 border-green-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  return (
    <div
      className={`min-h-screen ${isDarkMode ? "dark" : ""} bg-gradient-to-br from-emerald-50 to-teal-50 p-6 dark:bg-gray-900`}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white/10 dark:bg-black/20 backdrop-blur-md rounded-lg shadow-lg p-6 mb-6 border-l-4 border-emerald-600 dark:border-emerald-400">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Inventory Management</h2>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Comprehensive inventory tracking with QR code support
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowQRScanner(true)}
                className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                📱 Scan QR
              </button>
              <button
                onClick={() => {
                  setSelectedItem(null)
                  setShowForm(true)
                }}
                className="bg-teal-600 hover:bg-teal-700 dark:bg-teal-700 dark:hover:bg-teal-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                + Add Item
              </button>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg p-4 mb-6">
            <p className="text-red-700 dark:text-red-400">Error: {error}</p>
            <button onClick={() => setError(null)} className="mt-2 text-red-600 dark:text-red-400 hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white/10 dark:bg-black/20 backdrop-blur-md rounded-lg shadow-md p-6">
            <h3 className="font-semibold text-gray-700 dark:text-gray-300">Total Items</h3>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{statistics.total_items || 0}</p>
          </div>
          <div className="bg-white/10 dark:bg-black/20 backdrop-blur-md rounded-lg shadow-md p-6">
            <h3 className="font-semibold text-gray-700 dark:text-gray-300">In Stock</h3>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{statistics.in_stock || 0}</p>
          </div>
          <div className="bg-white/10 dark:bg-black/20 backdrop-blur-md rounded-lg shadow-md p-6">
            <h3 className="font-semibold text-gray-700 dark:text-gray-300">Low Stock</h3>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{statistics.low_stock || 0}</p>
          </div>
          <div className="bg-white/10 dark:bg-black/20 backdrop-blur-md rounded-lg shadow-md p-6">
            <h3 className="font-semibold text-gray-700 dark:text-gray-300">Out of Stock</h3>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{statistics.out_of_stock || 0}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white/10 dark:bg-black/20 backdrop-blur-md rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="Search items..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="border border-gray-300/20 dark:border-gray-700/20 bg-white/10 dark:bg-black/20 backdrop-blur-sm rounded-lg px-3 py-2 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <select
              value={filters.item_status}
              onChange={(e) => setFilters({ ...filters, item_status: e.target.value })}
              className="border border-gray-300/20 dark:border-gray-700/20 bg-white/10 dark:bg-black/20 backdrop-blur-sm rounded-lg px-3 py-2 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Status</option>
              <option value="In Stock">In Stock</option>
              <option value="Low In Stock">Low In Stock</option>
              <option value="Out Of Stock">Out Of Stock</option>
            </select>
            <input
              type="text"
              placeholder="Filter by type..."
              value={filters.item_type}
              onChange={(e) => setFilters({ ...filters, item_type: e.target.value })}
              className="border border-gray-300/20 dark:border-gray-700/20 bg-white/10 dark:bg-black/20 backdrop-blur-sm rounded-lg px-3 py-2 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <input
              type="text"
              placeholder="Filter by location..."
              value={filters.location}
              onChange={(e) => setFilters({ ...filters, location: e.target.value })}
              className="border border-gray-300/20 dark:border-gray-700/20 bg-white/10 dark:bg-black/20 backdrop-blur-sm rounded-lg px-3 py-2 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Items Grid */}
        <div className="bg-white/10 dark:bg-black/20 backdrop-blur-md rounded-lg shadow-md p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 dark:border-emerald-400 mx-auto"></div>
              <p className="text-gray-600 dark:text-gray-400 mt-4">Loading items...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400">No items found. Add your first item to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((item) => (
                <div
                  key={item.item_no}
                  className="border border-gray-300/20 dark:border-gray-700/20 bg-white/5 dark:bg-black/10 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-lg">{item.item_name}</h3>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(item.item_status)}`}
                    >
                      {item.item_status}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <p>
                      <span className="font-medium">Item #:</span> {item.item_no}
                    </p>
                    <p>
                      <span className="font-medium">Brand:</span> {item.brand || "N/A"}
                    </p>
                    <p>
                      <span className="font-medium">Type:</span> {item.item_type || "N/A"}
                    </p>
                    <p>
                      <span className="font-medium">Location:</span> {item.location || "N/A"}
                    </p>
                    <p>
                      <span className="font-medium">Balance:</span> {item.balance} {item.unit_of_measure}
                    </p>
                    <p>
                      <span className="font-medium">Min Stock:</span> {item.min_stock}
                    </p>
                    {item.price_per_unit > 0 && (
                      <p>
                        <span className="font-medium">Value:</span> ₱{item.cost?.toFixed(2) || "0.00"}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => handleEditItem(item)}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white px-3 py-2 rounded-lg text-sm transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setSelectedItem(item)
                        setShowQRGenerator(true)
                      }}
                      className="bg-teal-600 hover:bg-teal-700 dark:bg-teal-700 dark:hover:bg-teal-600 text-white px-3 py-2 rounded-lg text-sm transition-colors"
                    >
                      QR
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.item_no)}
                      className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white px-3 py-2 rounded-lg text-sm transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modals */}
        {showForm && (
          <ItemForm
            item={selectedItem}
            onSave={handleSaveItem}
            onCancel={() => {
              setShowForm(false)
              setSelectedItem(null)
            }}
            isDarkMode={isDarkMode}
          />
        )}

        {showQRGenerator && selectedItem && (
          <QRCodeGenerator
            item={selectedItem}
            onClose={() => {
              setShowQRGenerator(false)
              setSelectedItem(null)
            }}
            isDarkMode={isDarkMode}
          />
        )}

        {showQRScanner && (
          <QRCodeScanner onScan={handleQRScan} onClose={() => setShowQRScanner(false)} isDarkMode={isDarkMode} />
        )}
      </div>
    </div>
  )
}

export default InventoryManagement
