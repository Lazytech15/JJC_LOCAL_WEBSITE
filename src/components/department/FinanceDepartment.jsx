"use client"

import { useAuth } from "../../contexts/AuthContext"

function FinanceDepartment() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">💰 Finance Department</h1>
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
        {/* Financial Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl p-6 text-white">
            <h3 className="text-lg font-semibold mb-2">Revenue</h3>
            <p className="text-2xl font-bold">$2.4M</p>
            <p className="text-sm opacity-80">+12% from last month</p>
          </div>
          <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl p-6 text-white">
            <h3 className="text-lg font-semibold mb-2">Expenses</h3>
            <p className="text-2xl font-bold">$1.8M</p>
            <p className="text-sm opacity-80">-5% from last month</p>
          </div>
          <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl p-6 text-white">
            <h3 className="text-lg font-semibold mb-2">Profit</h3>
            <p className="text-2xl font-bold">$600K</p>
            <p className="text-sm opacity-80">+25% from last month</p>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-6 text-white">
            <h3 className="text-lg font-semibold mb-2">Cash Flow</h3>
            <p className="text-2xl font-bold">$450K</p>
            <p className="text-sm opacity-80">Positive trend</p>
          </div>
        </div>

        {/* Finance Modules */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
          <h2 className="text-xl font-semibold text-white mb-6">Financial Management Tools</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { name: "Accounting", icon: "📚", desc: "General ledger and journal entries" },
              { name: "Invoicing", icon: "🧾", desc: "Create and manage invoices" },
              { name: "Budgeting", icon: "📊", desc: "Budget planning and forecasting" },
              { name: "Tax Management", icon: "🏛️", desc: "Tax calculations and compliance" },
              { name: "Financial Reports", icon: "📈", desc: "Generate financial statements" },
              { name: "Audit Trail", icon: "🔍", desc: "Track all financial transactions" },
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

export default FinanceDepartment
