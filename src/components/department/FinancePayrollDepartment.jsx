"use client"

import { useAuth } from "../../contexts/AuthContext"
import { useState, useEffect } from "react"

function FinancePayrollDepartment() {
  const { user, logout, isDarkMode, toggleDarkMode } = useAuth()
  const [activeTab, setActiveTab] = useState("dashboard")
  const [financeData, setFinanceData] = useState({
    monthlyBudget: 0,
    payrollProcessed: 0,
    remainingBudget: 0,
    budgetItems: [],
    payrollRecords: [],
    reports: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchFinanceData()
  }, [])

  const fetchFinanceData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${window.location.origin}/api/data`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          department: "finance-payroll",
          action: "fetch_all",
          user_id: user?.id,
        }),
      })

      if (!response.ok) throw new Error("Failed to fetch finance data")

      const data = await response.json()
      setFinanceData({
        monthlyBudget: data.monthlyBudget || 0,
        payrollProcessed: data.payrollProcessed || 0,
        remainingBudget: data.remainingBudget || 0,
        budgetItems: data.budgetItems || [],
        payrollRecords: data.payrollRecords || [],
        reports: data.reports || [],
      })
    } catch (err) {
      setError(err.message)
      console.error("Finance Data fetch error:", err)
    } finally {
      setLoading(false)
    }
  }

  const updateFinanceData = async (action, data) => {
    try {
      const response = await fetch(`${window.location.origin}/api/data`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          department: "finance-payroll",
          action: action,
          data: data,
          user_id: user?.id,
        }),
      })

      if (!response.ok) throw new Error(`Failed to ${action}`)

      await fetchFinanceData() // Refresh data
    } catch (err) {
      setError(err.message)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-gray-50 to-stone-100 dark:from-slate-900 dark:via-gray-900 dark:to-stone-900 transition-colors duration-300 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white/10 dark:bg-black/20 backdrop-blur-md rounded-lg shadow-lg p-6 mb-6 border-l-4 border-stone-600 dark:border-stone-400">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">Finance and Payroll Department</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">Welcome, {user?.name || "Finance Manager"}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg bg-white/10 dark:bg-black/20 backdrop-blur-sm border border-gray-300/20 dark:border-gray-700/20 hover:bg-white/20 dark:hover:bg-black/30 transition-all duration-300"
              >
                {isDarkMode ? "☀️" : "🌙"}
              </button>
              <button
                onClick={logout}
                className="bg-stone-600 hover:bg-stone-700 dark:bg-stone-700 dark:hover:bg-stone-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-stone-600 dark:border-stone-400 mx-auto"></div>
            <p className="text-gray-600 dark:text-gray-400 mt-4">Loading finance data...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg p-4 mb-6">
            <p className="text-red-700 dark:text-red-400">Error: {error}</p>
            <button onClick={fetchFinanceData} className="mt-2 text-red-600 dark:text-red-400 hover:underline">
              Try again
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="bg-white/10 dark:bg-black/20 backdrop-blur-md rounded-lg shadow-lg mb-6">
          <div className="flex border-b border-gray-300/20 dark:border-gray-700/20">
            {["dashboard", "budget", "payroll", "reports"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 font-medium capitalize transition-colors ${
                  activeTab === tab
                    ? "border-b-2 border-stone-600 dark:border-stone-400 text-stone-700 dark:text-stone-300"
                    : "text-gray-600 dark:text-gray-400 hover:text-stone-600 dark:hover:text-stone-400"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="bg-white/10 dark:bg-black/20 backdrop-blur-md rounded-lg shadow-lg p-6">
          {activeTab === "dashboard" && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">Finance Dashboard</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-stone-100 dark:bg-stone-800 p-4 rounded-lg">
                  <h3 className="font-semibold text-stone-800 dark:text-stone-200">Monthly Budget</h3>
                  <p className="text-2xl font-bold text-stone-600 dark:text-stone-400">
                    {formatCurrency(financeData.monthlyBudget)}
                  </p>
                </div>
                <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
                  <h3 className="font-semibold text-slate-800 dark:text-slate-200">Payroll Processed</h3>
                  <p className="text-2xl font-bold text-slate-600 dark:text-slate-400">
                    {formatCurrency(financeData.payrollProcessed)}
                  </p>
                </div>
                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200">Remaining Budget</h3>
                  <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                    {formatCurrency(financeData.remainingBudget)}
                  </p>
                </div>
              </div>
            </div>
          )}
          {activeTab === "budget" && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">Budget Management</h2>
              <div className="space-y-4">
                <button
                  onClick={() =>
                    updateFinanceData("add_budget_item", {
                      name: "New Budget Item",
                      amount: 100000,
                      category: "Operations",
                    })
                  }
                  className="bg-stone-600 hover:bg-stone-700 dark:bg-stone-700 dark:hover:bg-stone-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Add Budget Item
                </button>
                {financeData.budgetItems.length > 0 ? (
                  <div className="space-y-2">
                    {financeData.budgetItems.map((item, index) => (
                      <div key={index} className="p-3 bg-white/5 dark:bg-black/10 rounded-lg flex justify-between">
                        <div>
                          <p className="text-gray-800 dark:text-gray-200">{item.name || `Budget Item ${index + 1}`}</p>
                          <p className="text-gray-600 dark:text-gray-400 text-sm">{item.category || "General"}</p>
                        </div>
                        <p className="text-gray-800 dark:text-gray-200 font-semibold">
                          {formatCurrency(item.amount || 0)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 dark:text-gray-400">No budget items found. Add one to get started.</p>
                )}
              </div>
            </div>
          )}
          {activeTab === "payroll" && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">Payroll Processing</h2>
              <div className="space-y-4">
                <button
                  onClick={() => updateFinanceData("process_payroll", { period: new Date().toISOString().slice(0, 7) })}
                  className="bg-stone-600 hover:bg-stone-700 dark:bg-stone-700 dark:hover:bg-stone-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Process Monthly Payroll
                </button>
                {financeData.payrollRecords.length > 0 ? (
                  <div className="space-y-2">
                    {financeData.payrollRecords.map((record, index) => (
                      <div key={index} className="p-3 bg-white/5 dark:bg-black/10 rounded-lg flex justify-between">
                        <div>
                          <p className="text-gray-800 dark:text-gray-200">
                            {record.employee || `Employee ${index + 1}`}
                          </p>
                          <p className="text-gray-600 dark:text-gray-400 text-sm">
                            Period: {record.period || "Current"}
                          </p>
                        </div>
                        <p className="text-gray-800 dark:text-gray-200 font-semibold">
                          {formatCurrency(record.amount || 0)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 dark:text-gray-400">No payroll records found.</p>
                )}
              </div>
            </div>
          )}
          {activeTab === "reports" && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">Financial Reports</h2>
              <div className="space-y-4">
                <button
                  onClick={() =>
                    updateFinanceData("generate_report", { type: "financial", date: new Date().toISOString() })
                  }
                  className="bg-stone-600 hover:bg-stone-700 dark:bg-stone-700 dark:hover:bg-stone-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Generate Financial Report
                </button>
                {financeData.reports.length > 0 ? (
                  <div className="space-y-2">
                    {financeData.reports.map((report, index) => (
                      <div key={index} className="p-3 bg-white/5 dark:bg-black/10 rounded-lg">
                        <p className="text-gray-800 dark:text-gray-200">
                          {report.title || `Financial Report ${index + 1}`}
                        </p>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">Generated: {report.date || "Today"}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 dark:text-gray-400">No reports generated yet.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default FinancePayrollDepartment
