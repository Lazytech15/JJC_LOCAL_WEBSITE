"use client"

import { useNavigate } from "react-router-dom"
import { useState } from "react"
import { useAuth } from "../App"

const departments = [
  {
    id: "Human Resources",
    name: "Human Resource",
    icon: "👥",
    description: "Personnel management at mga empleyado services",
    color: "from-slate-600 to-slate-700",
    hoverColor: "hover:from-slate-700 hover:to-slate-800",
    darkColor: "dark:from-slate-700 dark:to-slate-800",
    darkHoverColor: "dark:hover:from-slate-600 dark:hover:to-slate-700",
  },
  {
    id: "Operation",
    name: "Operations",
    icon: "⚙️",
    description: "Daily operations at administrative functions",
    color: "from-gray-600 to-gray-700",
    hoverColor: "hover:from-gray-700 hover:to-gray-800",
    darkColor: "dark:from-gray-700 dark:to-gray-800",
    darkHoverColor: "dark:hover:from-gray-600 dark:hover:to-gray-700",
  },
  {
    id: "Finance",
    name: "Finance and Payroll",
    icon: "💰",
    description: "Budget management at payroll processing",
    color: "from-stone-600 to-stone-700",
    hoverColor: "hover:from-stone-700 hover:to-stone-800",
    darkColor: "dark:from-stone-700 dark:to-stone-800",
    darkHoverColor: "dark:hover:from-stone-600 dark:hover:to-stone-700",
  },
  {
    id: "Procurement",
    name: "Procurement",
    icon: "📋",
    description: "Purchasing at supplier management",
    color: "from-zinc-600 to-zinc-700",
    hoverColor: "hover:from-zinc-700 hover:to-zinc-800",
    darkColor: "dark:from-zinc-700 dark:to-zinc-800",
    darkHoverColor: "dark:hover:from-zinc-600 dark:hover:to-zinc-700",
  },
  {
    id: "Engineering",
    name: "Engineering",
    icon: "🔧",
    description: "Technical services at infrastructure",
    color: "from-neutral-600 to-neutral-700",
    hoverColor: "hover:from-neutral-700 hover:to-neutral-800",
    darkColor: "dark:from-neutral-700 dark:to-neutral-800",
    darkHoverColor: "dark:hover:from-neutral-600 dark:hover:to-neutral-700",
  },
]

const superAdmin = {
  id: "super-admin",
  name: "Super Admin",
  icon: "👑",
  description: "Complete system administration at management",
  color: "from-red-600 to-red-700",
  hoverColor: "hover:from-red-700 hover:to-red-800",
  darkColor: "dark:from-red-700 dark:to-red-800",
  darkHoverColor: "dark:hover:from-red-600 dark:hover:to-red-700",
}

function DepartmentSelector() {
  const navigate = useNavigate()
  const [selectedDept, setSelectedDept] = useState(null)
  const { isDarkMode, toggleDarkMode } = useAuth()

  const handleDepartmentSelect = (departmentId) => {
    setSelectedDept(departmentId)
    setTimeout(() => {
      navigate(`/login/${departmentId}`)
    }, 200)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-br from-gray-50 via-slate-50 to-stone-50 dark:bg-gradient-to-br dark:from-gray-900 dark:via-slate-900 dark:to-stone-900 transition-colors duration-300">
      <div className="max-w-6xl w-full">
        <div className="absolute top-6 right-6">
          <button
            onClick={toggleDarkMode}
            className="p-3 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-700 transition-all duration-300 shadow-lg"
          >
            {isDarkMode ? "☀️" : "🌙"}
          </button>
        </div>

        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-slate-700 to-stone-700 dark:from-slate-300 dark:to-stone-300 bg-clip-text text-transparent">
            JJC ENGINEERING WORKS & <br/> GENERAL SERVICES
          </h1>
          <p className="text-xl text-gray-700 dark:text-gray-300 font-semibold">
            Select a department to access
          </p>
          <div className="mt-4 w-24 h-1 bg-gradient-to-r from-slate-600 to-stone-600 dark:from-slate-400 dark:to-stone-400 mx-auto rounded-full"></div>
        </div>

        <div className="mb-8">
          <div className="text-center mb-4">
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">System Administration</h2>
          </div>
          <div className="flex justify-center">
            <div
              onClick={() => handleDepartmentSelect(superAdmin.id)}
              className={`
                relative group cursor-pointer transform transition-all duration-300
                ${selectedDept === superAdmin.id ? "scale-95" : "hover:scale-105"}
                hover:-translate-y-2 max-w-xs
              `}
            >
              <div
                className={`
                bg-gradient-to-br from-white to-gray-100 dark:${superAdmin.color} dark:${superAdmin.hoverColor}
                hover:from-gray-50 hover:to-gray-200 ${superAdmin.darkColor} ${superAdmin.darkHoverColor}
                rounded-2xl p-6 shadow-xl dark:shadow-2xl
                border-2 border-red-200 dark:border-red-700/50
                backdrop-blur-sm
                transition-all duration-300
                group-hover:shadow-2xl dark:group-hover:shadow-3xl
                ${selectedDept === superAdmin.id ? "ring-4 ring-red-400/50 dark:ring-red-500/50" : ""}
              `}
              >
                <div className="text-4xl mb-3 text-center transform transition-transform duration-300 group-hover:scale-110">
                  {superAdmin.icon}
                </div>

                <div className="text-center">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">{superAdmin.name}</h3>
                  <p className="text-gray-600 dark:text-white/90 text-xs leading-relaxed">{superAdmin.description}</p>
                </div>

                <div className="absolute inset-0 bg-red-100/50 dark:bg-red-500/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                {selectedDept === superAdmin.id && (
                  <div className="absolute inset-0 bg-red-200/60 dark:bg-red-500/20 rounded-2xl animate-pulse"></div>
                )}
              </div>

              <div
                className={`
                absolute inset-0 bg-gradient-to-br from-red-300 to-red-400 dark:${superAdmin.color} dark:${superAdmin.darkColor}
                rounded-2xl blur-xl opacity-0 group-hover:opacity-20 dark:group-hover:opacity-30
                transition-opacity duration-300 -z-10
              `}
              ></div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center mb-8">
          <div className="flex-1 h-px bg-gray-300 dark:bg-gray-600"></div>
          <span className="px-4 text-sm text-gray-500 dark:text-gray-400 font-medium">Departments</span>
          <div className="flex-1 h-px bg-gray-300 dark:bg-gray-600"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {departments.map((dept) => (
            <div
              key={dept.id}
              onClick={() => handleDepartmentSelect(dept.id)}
              className={`
                relative group cursor-pointer transform transition-all duration-300
                ${selectedDept === dept.id ? "scale-95" : "hover:scale-105"}
                hover:-translate-y-2
              `}
            >
              <div
                className={`
                bg-gradient-to-br from-white to-gray-100 dark:${dept.color} dark:${dept.hoverColor}
                hover:from-gray-50 hover:to-gray-200 ${dept.darkColor} ${dept.darkHoverColor}
                rounded-2xl p-6 shadow-xl dark:shadow-2xl
                border border-gray-200 dark:border-gray-700/20
                backdrop-blur-sm
                transition-all duration-300
                group-hover:shadow-2xl dark:group-hover:shadow-3xl
                ${selectedDept === dept.id ? "ring-4 ring-slate-400/50 dark:ring-slate-500/50" : ""}
              `}
              >
                <div className="text-4xl mb-3 text-center transform transition-transform duration-300 group-hover:scale-110">
                  {dept.icon}
                </div>

                <div className="text-center">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">{dept.name}</h3>
                  <p className="text-gray-600 dark:text-white/90 text-xs leading-relaxed">{dept.description}</p>
                </div>

                <div className="absolute inset-0 bg-gray-100/50 dark:bg-white/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                {selectedDept === dept.id && (
                  <div className="absolute inset-0 bg-gray-200/60 dark:bg-white/20 rounded-2xl animate-pulse"></div>
                )}
              </div>

              <div
                className={`
                absolute inset-0 bg-gradient-to-br from-gray-300 to-gray-400 dark:${dept.color} dark:${dept.darkColor}
                rounded-2xl blur-xl opacity-0 group-hover:opacity-20 dark:group-hover:opacity-30
                transition-opacity duration-300 -z-10
              `}
              ></div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">
            🔒 Secure na access para sa lahat ng departamento
          </p>
        </div>
      </div>
    </div>
  )
}

export default DepartmentSelector
