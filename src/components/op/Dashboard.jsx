function Dashboard({ items, calculateItemProgress, loading }) {
  const getStatistics = () => {
    const totalItems = items.length
    const completedItems = items.filter(item => calculateItemProgress(item) === 100).length
    const inProgressItems = items.filter(item => {
      const progress = calculateItemProgress(item)
      return progress > 0 && progress < 100
    }).length
    const notStartedItems = items.filter(item => calculateItemProgress(item) === 0).length
    
    return {
      totalItems,
      completedItems,
      inProgressItems,
      notStartedItems,
      overallProgress: totalItems > 0 ? Math.round(items.reduce((sum, item) => sum + calculateItemProgress(item), 0) / totalItems) : 0
    }
  }

  const stats = getStatistics()

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600 dark:border-slate-400 mx-auto"></div>
        <p className="text-gray-600 dark:text-gray-400 mt-4">Loading dashboard...</p>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-6">Operations Dashboard</h2>
      
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-5 rounded-lg shadow-md text-white">
          <h3 className="text-sm font-medium opacity-90">Total Items</h3>
          <p className="text-3xl font-bold mt-2">{stats.totalItems}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 p-5 rounded-lg shadow-md text-white">
          <h3 className="text-sm font-medium opacity-90">Completed</h3>
          <p className="text-3xl font-bold mt-2">{stats.completedItems}</p>
        </div>
        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 p-5 rounded-lg shadow-md text-white">
          <h3 className="text-sm font-medium opacity-90">In Progress</h3>
          <p className="text-3xl font-bold mt-2">{stats.inProgressItems}</p>
        </div>
        <div className="bg-gradient-to-br from-gray-500 to-gray-600 p-5 rounded-lg shadow-md text-white">
          <h3 className="text-sm font-medium opacity-90">Not Started</h3>
          <p className="text-3xl font-bold mt-2">{stats.notStartedItems}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-5 rounded-lg shadow-md text-white">
          <h3 className="text-sm font-medium opacity-90">Overall Progress</h3>
          <p className="text-3xl font-bold mt-2">{stats.overallProgress}%</p>
        </div>
      </div>

      {/* Items Progress List */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Items Overview</h3>
        {items.length > 0 ? (
          items.map(item => {
            const progress = calculateItemProgress(item)
            // Use part_number as key since it's unique
            const itemKey = item.part_number || item.id
            return (
              <div key={itemKey} className="bg-white/5 dark:bg-black/10 rounded-lg p-4 border border-gray-300/20 dark:border-gray-700/20">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200">{item.name}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{item.description}</p>
                    {item.part_number && (
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Part #: {item.part_number}</p>
                    )}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    progress === 100 ? 'bg-green-500 text-white' :
                    progress > 0 ? 'bg-yellow-500 text-white' :
                    'bg-gray-500 text-white'
                  }`}>
                    {progress}%
                  </span>
                </div>
                <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      progress === 100 ? 'bg-green-500' :
                      progress > 0 ? 'bg-yellow-500' :
                      'bg-gray-500'
                    }`}
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {item.phase_count || item.phases?.length || 0} phases • Created {new Date(item.created_at).toLocaleDateString()}
                </div>
              </div>
            )
          })
        ) : (
          <p className="text-gray-600 dark:text-gray-400 text-center py-8">No items yet. Go to "Add Items" to create your first item.</p>
        )}
      </div>
    </div>
  )
}

export default Dashboard