"use client"

import { useNavigate } from "react-router-dom"
import { useState } from "react"
import { useAuth } from "../contexts/AuthContext"

// Map department IDs to URL-safe slugs
const departmentSlugMap = {
  "Human Resources": "hr",
  "Operations": "operations",
  "Finance": "finance",
  "Procurement": "procurement",
  "Engineering": "engineering",
  "superAdmin": "superadmin"
}

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
    id: "Operations",
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
  id: "superAdmin",
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
    const slug = departmentSlugMap[departmentId] || departmentId.toLowerCase().replace(/\s+/g, '-')
    setTimeout(() => {
      navigate(`/jjcewgsaccess/login/${slug}`)
    }, 200)
  }

  return (
  <div
    className={`min-h-screen flex items-center justify-center p-8 transition-colors duration-300 ${
      isDarkMode
        ? "bg-gradient-to-br from-gray-900 via-slate-900 to-stone-900"
        : "bg-gradient-to-br from-gray-50 via-slate-50 to-stone-50"
    }`}
  >
    <div className="max-w-6xl w-full">
      <div className="absolute top-6 right-6">
        <button
          onClick={toggleDarkMode}
          className={`p-3 rounded-full backdrop-blur-sm border transition-all duration-300 shadow-lg ${
            isDarkMode
              ? "bg-gray-800/80 border-gray-700 hover:bg-gray-700"
              : "bg-white/80 border-gray-200 hover:bg-white"
          }`}
        >
          {isDarkMode ? "☀️" : "🌙"}
        </button>
      </div>

      <div className="text-center mb-12">
        <h1
          className={`text-5xl font-bold mb-4 bg-gradient-to-r bg-clip-text text-transparent ${
            isDarkMode
              ? "from-slate-300 to-stone-300"
              : "from-slate-700 to-stone-700"
          }`}
        >
          JJC ENGINEERING WORKS & <br /> GENERAL SERVICES
        </h1>
        <p
          className={`text-xl font-semibold ${
            isDarkMode ? "text-gray-300" : "text-gray-700"
          }`}
        >
          Select a department to access
        </p>
        <div
          className={`mt-4 w-24 h-1 bg-gradient-to-r mx-auto rounded-full ${
            isDarkMode
              ? "from-slate-400 to-stone-400"
              : "from-slate-600 to-stone-600"
          }`}
        ></div>
      </div>

      <div className="mb-8">
        <div className="text-center mb-4">
          <h2
            className={`text-lg font-semibold ${
              isDarkMode ? "text-gray-300" : "text-gray-700"
            }`}
          >
            System Administration
          </h2>
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
                rounded-2xl p-6 shadow-xl backdrop-blur-sm
                border-2 transition-all duration-300
                group-hover:shadow-2xl
                ${
                  isDarkMode
                    ? `${superAdmin.color} ${superAdmin.hoverColor} border-red-700/50 shadow-2xl group-hover:shadow-3xl`
                    : "bg-gradient-to-br from-white to-gray-100 hover:from-gray-50 hover:to-gray-200 border-red-200"
                }
                ${
                  selectedDept === superAdmin.id
                    ? isDarkMode
                      ? "ring-4 ring-red-500/50"
                      : "ring-4 ring-red-400/50"
                    : ""
                }
              `}
            >
              <div className="text-4xl mb-3 text-center transform transition-transform duration-300 group-hover:scale-110">
                {superAdmin.icon}
              </div>

              <div className="text-center">
                <h3
                  className={`text-lg font-bold mb-2 ${
                    isDarkMode ? "text-white" : "text-gray-800"
                  }`}
                >
                  {superAdmin.name}
                </h3>
                <p
                  className={`text-xs leading-relaxed ${
                    isDarkMode ? "text-white/90" : "text-gray-600"
                  }`}
                >
                  {superAdmin.description}
                </p>
              </div>

              <div
                className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                  isDarkMode ? "bg-red-500/10" : "bg-red-100/50"
                }`}
              ></div>

              {selectedDept === superAdmin.id && (
                <div
                  className={`absolute inset-0 rounded-2xl animate-pulse ${
                    isDarkMode ? "bg-red-500/20" : "bg-red-200/60"
                  }`}
                ></div>
              )}
            </div>

            <div
              className={`
                absolute inset-0 rounded-2xl blur-xl opacity-0 transition-opacity duration-300 -z-10
                ${
                  isDarkMode
                    ? `${superAdmin.color} ${superAdmin.darkColor} group-hover:opacity-30`
                    : "bg-gradient-to-br from-red-300 to-red-400 group-hover:opacity-20"
                }
              `}
            ></div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center mb-8">
        <div
          className={`flex-1 h-px ${
            isDarkMode ? "bg-gray-600" : "bg-gray-300"
          }`}
        ></div>
        <span
          className={`px-4 text-sm font-medium ${
            isDarkMode ? "text-gray-400" : "text-gray-500"
          }`}
        >
          Departments
        </span>
        <div
          className={`flex-1 h-px ${
            isDarkMode ? "bg-gray-600" : "bg-gray-300"
          }`}
        ></div>
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
                rounded-2xl p-6 shadow-xl backdrop-blur-sm
                border transition-all duration-300
                group-hover:shadow-2xl
                ${
                  isDarkMode
                    ? `${dept.color} ${dept.hoverColor} border-gray-700/20 shadow-2xl group-hover:shadow-3xl`
                    : "bg-gradient-to-br from-white to-gray-100 hover:from-gray-50 hover:to-gray-200 border-gray-200"
                }
                ${
                  selectedDept === dept.id
                    ? isDarkMode
                      ? "ring-4 ring-slate-500/50"
                      : "ring-4 ring-slate-400/50"
                    : ""
                }
              `}
            >
              <div className="text-4xl mb-3 text-center transform transition-transform duration-300 group-hover:scale-110">
                {dept.icon}
              </div>

              <div className="text-center">
                <h3
                  className={`text-lg font-bold mb-2 ${
                    isDarkMode ? "text-white" : "text-gray-800"
                  }`}
                >
                  {dept.name}
                </h3>
                <p
                  className={`text-xs leading-relaxed ${
                    isDarkMode ? "text-white/90" : "text-gray-600"
                  }`}
                >
                  {dept.description}
                </p>
              </div>

              <div
                className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                  isDarkMode ? "bg-white/10" : "bg-gray-100/50"
                }`}
              ></div>

              {selectedDept === dept.id && (
                <div
                  className={`absolute inset-0 rounded-2xl animate-pulse ${
                    isDarkMode ? "bg-white/20" : "bg-gray-200/60"
                  }`}
                ></div>
              )}
            </div>

            <div
              className={`
                absolute inset-0 rounded-2xl blur-xl opacity-0 transition-opacity duration-300 -z-10
                ${
                  isDarkMode
                    ? `${dept.color} ${dept.darkColor} group-hover:opacity-30`
                    : "bg-gradient-to-br from-gray-300 to-gray-400 group-hover:opacity-20"
                }
              `}
            ></div>
          </div>
        ))}
      </div>

      <div className="text-center mt-12">
        <p
          className={`text-sm font-medium ${
            isDarkMode ? "text-gray-400" : "text-gray-600"
          }`}
        >
          🔒 Secure na access para sa lahat ng departamento
        </p>
      </div>
    </div>
  </div>
)
}

export default DepartmentSelector