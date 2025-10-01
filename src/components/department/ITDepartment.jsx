"use client"

import { useAuth } from "../../contexts/AuthContext"

function ITDepartment() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">💻 IT Support</h1>
          <p className="text-gray-300">Welcome back, {user?.username}!</p>
        </div>
        <button
          onClick={logout}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors duration-200"
        >
          Logout
        </button>
      </div>

      <div className="max-w-6xl mx-auto space-y-8">
        {/* System Status */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl p-6 text-white">
            <h3 className="text-lg font-semibold mb-2">Server Uptime</h3>
            <p className="text-2xl font-bold">99.9%</p>
            <p className="text-sm opacity-80">All systems operational</p>
          </div>
          <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl p-6 text-white">
            <h3 className="text-lg font-semibold mb-2">Open Tickets</h3>
            <p className="text-2xl font-bold">23</p>
            <p className="text-sm opacity-80">5 high priority</p>
          </div>
          <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl p-6 text-white">
            <h3 className="text-lg font-semibold mb-2">Network Load</h3>
            <p className="text-2xl font-bold">67%</p>
            <p className="text-sm opacity-80">Normal usage</p>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-6 text-white">
            <h3 className="text-lg font-semibold mb-2">Security Alerts</h3>
            <p className="text-2xl font-bold">2</p>
            <p className="text-sm opacity-80">Low risk</p>
          </div>
        </div>

        {/* IT Modules */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
          <h2 className="text-xl font-semibold text-white mb-6">IT Management Tools</h2>
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
                className="bg-white/5 rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-colors duration-200 cursor-pointer"
              >
                <div className="text-2xl mb-2">{module.icon}</div>
                <h3 className="text-white font-medium mb-1">{module.name}</h3>
                <p className="text-gray-400 text-sm">{module.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ITDepartment
