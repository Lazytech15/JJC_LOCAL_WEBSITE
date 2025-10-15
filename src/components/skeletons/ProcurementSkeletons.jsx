import React from 'react'

// Base skeleton component with shimmer animation
const Skeleton = ({ className = '', ...props }) => (
  <div
    className={`animate-pulse bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 bg-[length:200%_100%] animate-shimmer rounded ${className}`}
    {...props}
  />
)

// Procurement Department Skeleton - mimics the full layout
export const ProcurementDepartmentSkeleton = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-zinc-50 to-gray-100 dark:from-slate-950 dark:via-zinc-950 dark:to-gray-950 transition-colors duration-300">
      {/* Industrial Background Pattern */}
      <div className="fixed inset-0 opacity-[0.02] dark:opacity-[0.03] pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}/>
      </div>

      <div className="relative max-w-[1600px] mx-auto p-2 sm:p-3 md:p-4">
        {/* Header Skeleton */}
        <div className="bg-gradient-to-r from-slate-800 via-zinc-800 to-slate-800 dark:from-slate-900 dark:via-zinc-900 dark:to-slate-900 rounded-lg shadow-lg p-3 sm:p-4 mb-3 border-l-4 border-amber-500 dark:border-amber-400 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Skeleton className="w-9 h-9 rounded-lg" />
                <div>
                  <Skeleton className="h-6 w-48 mb-1" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
              <Skeleton className="h-3 w-40 ml-11" />
            </div>
            <div className="flex gap-1.5 sm:gap-2 items-center">
              <Skeleton className="w-10 h-10 rounded-lg" />
              <Skeleton className="w-20 h-10 rounded-lg" />
            </div>
          </div>
        </div>

        {/* Navigation Skeleton */}
        <div className="sticky top-3 z-40 mb-3">
          <div className="relative overflow-hidden backdrop-blur-[40px] bg-white/75 dark:bg-slate-900/75 rounded-lg shadow-lg border border-slate-200/50 dark:border-slate-700/50">
            <div className="flex overflow-x-auto scrollbar-thin justify-center px-4 py-2.5 gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="flex-shrink-0 px-3 py-2 text-xs rounded-none h-8 w-20" />
              ))}
            </div>
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-lg shadow-lg border border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
          <div className="p-3 sm:p-4">
            <AdminDashboardSkeleton />
          </div>
        </div>
      </div>
    </div>
  )
}

// Admin Dashboard Skeleton
export const AdminDashboardSkeleton = () => {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <div>
            <Skeleton className="h-7 w-48 mb-1" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <Skeleton className="w-24 h-10 rounded-lg" />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50 rounded-xl p-4 sm:p-6 border-2 border-slate-300 dark:border-slate-700 relative overflow-hidden">
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="w-10 h-10 rounded-lg" />
              </div>
              <Skeleton className="h-8 w-12 mb-1" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>

      {/* Charts and Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Chart Skeleton */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-6 border border-slate-200 dark:border-slate-700">
          <Skeleton className="h-6 w-32 mb-4" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>

        {/* Table Skeleton */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-6 border border-slate-200 dark:border-slate-700">
          <Skeleton className="h-6 w-40 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-6 w-12 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Additional Sections */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-6 border border-slate-200 dark:border-slate-700">
            <Skeleton className="h-5 w-28 mb-3" />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, j) => (
                <Skeleton key={j} className="h-4 w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Inventory Management Skeleton
export const InventoryManagementSkeleton = () => {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <div>
            <Skeleton className="h-7 w-40 mb-1" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="w-20 h-10 rounded-lg" />
          <Skeleton className="w-24 h-10 rounded-lg" />
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="p-4">
          {/* Table Header */}
          <div className="grid grid-cols-6 gap-4 mb-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
          {/* Table Rows */}
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="grid grid-cols-6 gap-4 py-3 border-b border-slate-100 dark:border-slate-700 last:border-b-0">
              {Array.from({ length: 6 }).map((_, j) => (
                <Skeleton key={j} className="h-4 w-full" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Purchase Order Tracker Skeleton
export const PurchaseOrderTrackerSkeleton = () => {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <div>
            <Skeleton className="h-7 w-48 mb-1" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
        <Skeleton className="w-32 h-10 rounded-lg" />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-8 w-12 mb-1" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>

      {/* Orders List */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <Skeleton className="h-6 w-40" />
        </div>
        <div className="p-4 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div>
                  <Skeleton className="h-5 w-32 mb-1" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <div className="text-right">
                <Skeleton className="h-4 w-16 mb-1" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Supplier Management Skeleton
export const SupplierManagementSkeleton = () => {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <div>
            <Skeleton className="h-7 w-44 mb-1" />
            <Skeleton className="h-4 w-52" />
          </div>
        </div>
        <Skeleton className="w-28 h-10 rounded-lg" />
      </div>

      {/* Supplier Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-start justify-between mb-3">
              <Skeleton className="w-12 h-12 rounded-lg" />
              <Skeleton className="w-16 h-6 rounded-full" />
            </div>
            <Skeleton className="h-5 w-28 mb-2" />
            <Skeleton className="h-4 w-full mb-1" />
            <Skeleton className="h-4 w-3/4 mb-3" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-16 rounded" />
              <Skeleton className="h-8 w-20 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Employee Logs Skeleton
export const EmployeeLogsSkeleton = () => {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <div>
            <Skeleton className="h-7 w-36 mb-1" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="w-20 h-10 rounded-lg" />
          <Skeleton className="w-24 h-10 rounded-lg" />
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      </div>

      {/* Logs List */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <Skeleton className="h-6 w-28" />
        </div>
        <div className="p-4 space-y-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-700 rounded-lg">
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-4 w-16" />
              <Skeleton className="w-6 h-6 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ProcurementDepartmentSkeleton