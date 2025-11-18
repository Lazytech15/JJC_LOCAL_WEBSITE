import React from 'react'

function InventoryListView({
  items,
  visibleCount,
  setVisibleCount,
  onItemClick,
  onStockManagement,
  onDeleteItem,
  formatCurrency
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-black dark:text-white">Item</th>
              <th className="px-4 py-3 text-left font-semibold text-black dark:text-white">Brand</th>
              <th className="px-4 py-3 text-left font-semibold text-black dark:text-white">Location</th>
              <th className="px-4 py-3 text-center font-semibold text-black dark:text-white">Balance</th>
              <th className="px-4 py-3 text-center font-semibold text-black dark:text-white">ROP</th>
              <th className="px-4 py-3 text-center font-semibold text-black dark:text-white">MOQ</th>
              <th className="px-4 py-3 text-center font-semibold text-black dark:text-white">Price</th>
              <th className="px-4 py-3 text-center font-semibold text-black dark:text-white">Status</th>
              <th className="px-4 py-3 text-center font-semibold text-black dark:text-white">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {items.slice(0, visibleCount).map((item) => (
              <tr
                key={item.item_no}
                onClick={() => onItemClick(item)}
                className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
              >
                <td className="px-4 py-3">
                  <div>
                    <div className="font-medium text-black dark:text-white">{item.item_name}</div>
                    <div className="text-xs text-black dark:text-gray-400">ID: {item.item_no}</div>
                  </div>
                </td>
                <td className="px-4 py-3 text-black dark:text-gray-300">{item.brand || '-'}</td>
                <td className="px-4 py-3 text-black dark:text-gray-300">{item.location || '-'}</td>
                <td className="px-4 py-3 text-center">
                  <span className="font-semibold text-black dark:text-white">
                    {item.balance || 0} {item.unit_of_measure || ''}
                  </span>
                </td>
                <td className="px-4 py-3 text-center text-black dark:text-gray-300">{item.min_stock || 0}</td>
                <td className="px-4 py-3 text-center text-black dark:text-gray-300">{item.moq || 0}</td>
                <td className="px-4 py-3 text-center text-black dark:text-gray-300">
                  {item.price_per_unit ? formatCurrency(item.price_per_unit) : '-'}
                </td>
                <td className="px-4 py-3 text-center">
                  {(() => {
                    const bal = Number(item.balance) || 0
                    const min = Number(item.min_stock) || 0
                    const status = bal === 0 ? "Out Of Stock" : (min > 0 && bal < min ? "Low In Stock" : "In Stock")
                    const color = status === "Out Of Stock" ? "bg-red-500" : status === "Low In Stock" ? "bg-yellow-400" : "bg-green-500"
                    return (
                      <span className={`inline-block w-3 h-3 rounded-full ${color}`} title={status} aria-label={status} />
                    )
                  })()}
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onStockManagement(item)
                      }}
                      className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                    >
                      Stock
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteItem(item.item_no)
                      }}
                      className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                    >
                      Del
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {items.length > visibleCount && (
        <div className="p-4 text-center">
          <button
            onClick={() => setVisibleCount((c) => Math.min(c + 20, items.length))}
            className="px-4 py-2 bg-zinc-600 hover:bg-zinc-700 text-white rounded-lg"
          >
            Load more ({Math.min(20, items.length - visibleCount)})
          </button>
        </div>
      )}
    </div>
  )
}

export default InventoryListView