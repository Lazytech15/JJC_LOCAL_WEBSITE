import { useAuth } from "../../contexts/AuthContext"
import { useState, useEffect } from "react"
import {
  InventoryManagement,
  RestockList,
  PurchaseOrderTracker,
  EmployeeLogs,
  ItemDetailView,
  AdminDashboard,
  SupplierManagement,
  ToastProvider
} from "../pd"

function ProcurementDepartment() {
  const { user, logout, isDarkMode, toggleDarkMode } = useAuth()
  const [activeTab, setActiveTab] = useState("dashboard")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isScrolled, setIsScrolled] = useState(false)

  // Apple-style scroll detection for liquid glass effect
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY
      setIsScrolled(scrollPosition > 50)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <ToastProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-zinc-50 to-gray-100 dark:from-slate-950 dark:via-zinc-950 dark:to-gray-950 transition-colors duration-300">
      {/* Industrial Background Pattern */}
      <div className="fixed inset-0 opacity-[0.02] dark:opacity-[0.03] pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}/>
      </div>
      
      <div className="relative max-w-[1600px] mx-auto p-2 sm:p-3 md:p-4">
        {/* Enhanced Industrial Header - Compact */}
        <div className="bg-gradient-to-r from-slate-800 via-zinc-800 to-slate-800 dark:from-slate-900 dark:via-zinc-900 dark:to-slate-900 rounded-lg shadow-lg p-3 sm:p-4 mb-3 border-l-4 border-amber-500 dark:border-amber-400 relative overflow-hidden">
          {/* Decorative Gear Background */}
          <div className="absolute top-0 right-0 w-24 h-24 opacity-5">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-amber-500">
              <path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.21,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.67 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z" />
            </svg>
          </div>
          
          <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 bg-amber-500/20 rounded-lg border border-amber-500/30">
                  <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                    Procurement Department
                  </h1>
                  <p className="text-amber-400/80 text-xs font-medium">
                    Engineering • Metal Works & Inventory
                  </p>
                </div>
              </div>
              <p className="text-slate-300 dark:text-slate-400 text-xs sm:text-sm ml-9">
                Welcome, <span className="font-semibold text-amber-400">{user?.name || "Procurement Officer"}</span>
              </p>
            </div>
            
            <div className="flex gap-1.5 sm:gap-2 items-center">
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg bg-slate-700/50 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-600/30 dark:border-slate-700/30 hover:bg-slate-600/50 dark:hover:bg-slate-700/50 transition-all duration-300 group"
                title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                <div className="relative w-4 h-4 sm:w-5 sm:h-5">
                  {isDarkMode ? (
                    <svg className="w-full h-full text-amber-400 group-hover:text-amber-300 transition-colors" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-full h-full text-slate-400 group-hover:text-slate-300 transition-colors" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                    </svg>
                  )}
                </div>
              </button>
              
              <button
                onClick={logout}
                className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 dark:from-red-700 dark:to-red-800 dark:hover:from-red-600 dark:hover:to-red-700 text-white px-3 sm:px-4 lg:px-6 py-2 sm:py-2.5 rounded-lg transition-all duration-300 font-medium text-sm sm:text-base shadow-lg hover:shadow-xl flex items-center gap-2"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>

        {/* Loading State - Compact */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-3 border-slate-200 dark:border-slate-700 border-t-amber-500"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-500 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.21,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.67 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z" />
                </svg>
              </div>
            </div>
            <p className="text-slate-600 dark:text-slate-400 mt-4 font-medium text-sm">Loading data...</p>
          </div>
        )}

        {/* Error State - Compact */}
        {error && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-300 dark:border-red-800 rounded-lg p-3 mb-3 shadow-md">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <p className="text-red-700 dark:text-red-400 text-sm font-medium">{error}</p>
                <button 
                  onClick={() => setError(null)} 
                  className="mt-1.5 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-xs underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Apple Liquid Glass Navigation Bar - Morphing */}
        <div className={`
          sticky top-3 z-40 mb-3
          transition-all duration-[800ms] ease-[cubic-bezier(0.4,0,0.2,1)]
          ${isScrolled 
            ? 'mx-auto max-w-3xl' 
            : 'mx-auto max-w-full'
          }
        `}>
          <div className={`
            relative overflow-hidden
            backdrop-blur-[40px] bg-white/75 dark:bg-slate-900/75
            transition-all duration-[800ms] ease-[cubic-bezier(0.4,0,0.2,1)]
            ${isScrolled 
              ? 'rounded-full shadow-2xl border-2' 
              : 'rounded-lg shadow-lg border'
            }
            border-slate-200/50 dark:border-slate-700/50
          `}>
            {/* Liquid glass shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none opacity-0 hover:opacity-100 transition-opacity duration-500"></div>
            
            <div className={`
              flex overflow-x-auto scrollbar-thin scrollbar-thumb-slate-400 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent
              justify-center
              transition-all duration-[800ms] ease-[cubic-bezier(0.4,0,0.2,1)]
              ${isScrolled 
                ? 'px-4 py-2' 
                : 'px-4 py-2.5'
              }
            `}>
              {[
                { key: "dashboard", label: "Dashboard", icon: "📊", color: "amber" },
                { key: "inventory", label: "Inventory", icon: "📦", color: "blue" },
                { key: "restock", label: "Restock", icon: "🔄", color: "green" },
                { key: "orders", label: "Purchase Orders", icon: "📋", color: "purple" },
                { key: "suppliers", label: "Suppliers", icon: "🏢", color: "cyan" },
                { key: "logs", label: "Employee Logs", icon: "👥", color: "pink" }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`
                    relative flex-shrink-0 font-medium 
                    flex items-center gap-1.5 group
                    transition-all duration-[800ms] ease-[cubic-bezier(0.4,0,0.2,1)]
                    ${isScrolled 
                      ? 'px-3 py-1.5 text-xs rounded-full' 
                      : 'px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm rounded-none'
                    }
                    ${activeTab === tab.key
                      ? isScrolled
                        ? "text-white bg-gradient-to-r from-amber-500 to-amber-600 shadow-lg shadow-amber-500/30"
                        : "text-amber-600 dark:text-amber-400 bg-gradient-to-b from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/30"
                    }
                  `}
                >
                  {/* Active indicator for non-scrolled state */}
                  {!isScrolled && activeTab === tab.key && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400"></div>
                  )}
                  
                  <span className={`
                    transition-all duration-500
                    ${isScrolled ? 'text-sm' : 'text-base sm:text-lg'}
                  `}>{tab.icon}</span>
                  
                  <span className={`
                    whitespace-nowrap transition-all duration-500
                    ${isScrolled && activeTab !== tab.key ? 'hidden sm:inline' : ''}
                  `}>{tab.label}</span>
                  
                  {/* Glass reflection effect */}
                  <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full pointer-events-none"></div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content - Compact */}
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-lg shadow-lg border border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
          <div className="p-3 sm:p-4">
            {activeTab === "dashboard" && <AdminDashboard onNavigate={setActiveTab} isDarkMode={isDarkMode} />}
            {activeTab === "inventory" && <InventoryManagement isDarkMode={isDarkMode} />}
            {activeTab === "restock" && <RestockList isDarkMode={isDarkMode} />}
            {activeTab === "orders" && <PurchaseOrderTracker isDarkMode={isDarkMode} />}
            {activeTab === "suppliers" && <SupplierManagement isDarkMode={isDarkMode} />}
            {activeTab === "logs" && <EmployeeLogs isDarkMode={isDarkMode} />}
          </div>
        </div>
      </div>
      </div>
    </ToastProvider>
  )
}

export default ProcurementDepartment