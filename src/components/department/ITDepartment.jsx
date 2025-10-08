"use client"

import { useAuth } from "../../contexts/AuthContext"

function ITDepartment() {
  const { user, logout, isDarkMode, toggleDarkMode } = useAuth()

  return (
    <div className={`min-h-screen p-8 transition-colors duration-300 ${
      isDarkMode 
        ? "bg-gradient-to-br from-gray-900 via-slate-900 to-zinc-900" 
        : "bg-gradient-to-br from-slate-50 via-gray-50 to-stone-50"
    }`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className={`text-3xl font-bold mb-2 ${
            isDarkMode ? "text-white" : "text-gray-900"
          }`}>💻 IT Support</h1>
          <p className={isDarkMode ? "text-gray-300" : "text-gray-700"}>Welcome back, {user?.username}!</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={toggleDarkMode}
            className={`p-2 rounded-lg transition-all duration-300 ${
              isDarkMode 
                ? "bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600/30" 
                : "bg-white/50 hover:bg-white/80 border border-gray-300"
            }`}
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            <div className="relative w-5 h-5">
              {isDarkMode ? (
                <svg className="w-full h-full text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-full h-full text-slate-700" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </div>
          </button>
          <button
            onClick={logout}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors duration-200"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto space-y-8">
        {/* System Status */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl p-6 text-white shadow-lg">
            <h3 className="text-lg font-semibold mb-2">Server Uptime</h3>
            <p className="text-2xl font-bold">99.9%</p>
            <p className="text-sm opacity-80">All systems operational</p>
          </div>
          <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl p-6 text-white shadow-lg">
            <h3 className="text-lg font-semibold mb-2">Open Tickets</h3>
            <p className="text-2xl font-bold">23</p>
            <p className="text-sm opacity-80">5 high priority</p>
          </div>
          <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl p-6 text-white shadow-lg">
            <h3 className="text-lg font-semibold mb-2">Network Load</h3>
            <p className="text-2xl font-bold">67%</p>
            <p className="text-sm opacity-80">Normal usage</p>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-6 text-white shadow-lg">
            <h3 className="text-lg font-semibold mb-2">Security Alerts</h3>
            <p className="text-2xl font-bold">2</p>
            <p className="text-sm opacity-80">Low risk</p>
          </div>
        </div>

        {/* IT Modules */}
        <div className={`backdrop-blur-md rounded-2xl p-6 border shadow-lg ${
          isDarkMode 
            ? "bg-white/10 border-white/20" 
            : "bg-white/70 border-gray-200"
        }`}>
          <h2 className={`text-xl font-semibold mb-6 ${
            isDarkMode ? "text-white" : "text-gray-900"
          }`}>IT Management Tools</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { name: "Help Desk", icon: "🎧", desc: "Manage support tickets and requests" },
              { name: "Asset Management", icon: "🖥️", desc: "Track hardware and software assets" },
              { name: "Network Monitor", icon: "🌐", desc: "Monitor network performance and health" },
              { name: "Security Center", icon: "🔒", desc: "Manage security policies and threats" },
              { name: "User Management", icon: "👤", desc: "Manage user accounts and permissions" },
              { name: "System Backup", icon: "💾", desc: "Configure and monitor data backups" },
            ].map((module, index) => (
              <div
                key={index}
                className={`rounded-lg p-4 border transition-colors duration-200 cursor-pointer ${
                  isDarkMode 
                    ? "bg-white/5 border-white/10 hover:bg-white/10" 
                    : "bg-white border-gray-200 hover:bg-gray-50"
                }`}
              >
                <div className="text-2xl mb-2">{module.icon}</div>
                <h3 className={`font-medium mb-1 ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}>{module.name}</h3>
                <p className={`text-sm ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}>{module.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ITDepartment
