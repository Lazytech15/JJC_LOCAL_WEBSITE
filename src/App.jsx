import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom"
import { AuthProvider, useAuth } from "./contexts/AuthContext"
import DepartmentSelector from "./components/DepartmentSelector"
import LoginForm from "./components/LoginForm"
import HRDepartment from "./components/department/HRDepartment"
import OperationsDepartment from "./components/department/OperationsDepartment"
import FinancePayrollDepartment from "./components/department/FinancePayrollDepartment"
import ProcurementDepartment from "./components/department/ProcurementDepartment"
import EngineeringDepartment from "./components/department/EngineeringDepartment"
import SuperAdminDashboard from "./components/SuperAdminDashboard"
import EmployeeLanding from "./components/employeeLandingPage/EmployeeLanding"
import EmployeeLogin from "./components/employeeLandingPage/EmployeeLogin"
import EmployeeDashboard from "./components/employeeLandingPage/EmployeeDashboard"
import './index.css'
import ToolboxWrapper from "./components/ToolboxWrapper"

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

function AppContent() {
  const { isDarkMode, isLoading } = useAuth()

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center transition-all duration-300 ${isDarkMode
            ? "bg-gradient-to-br from-gray-900 via-slate-900 to-zinc-900 text-gray-100"
            : "bg-gradient-to-br from-slate-50 via-gray-50 to-stone-50 text-gray-900"
          }`}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg font-medium">Verifying authentication...</p>
        </div>
      </div>
    )
  }

  return (
    <Router>
      <RoutesWrapper />
    </Router>
  )
}

function RoutesWrapper() {
  const location = useLocation()
  const { isDarkMode } = useAuth()
  const isToolboxRoute = location.pathname === "/jjctoolbox"

  console.log("Current pathname:", location.pathname)
  console.log("Is Toolbox route?", isToolboxRoute)
  console.log("AuthContext isDarkMode:", isDarkMode)

  // For toolbox route, don't apply main app styling
  if (isToolboxRoute) {
    console.log("Rendering Toolbox with ThemeProvider")
    return (
      <Routes>
        <Route path="/jjctoolbox" element={<ToolboxWrapper />} />
      </Routes>
    )
  }

  // For all other routes, apply main app styling
  console.log("Rendering main app routes with AuthContext styling")
  return (
    <div
      className={`min-h-screen transition-all duration-300 ${isDarkMode
          ? "bg-gradient-to-br from-gray-900 via-slate-900 to-zinc-900 text-gray-100"
          : "bg-gradient-to-br from-slate-50 via-gray-50 to-stone-50 text-gray-900"
        }`}
    >
      <Routes>
              {/* Employee Routes (Main/Public) */}
              <Route path="/" element={<EmployeeLanding />} />
              <Route path="/employee/login" element={<EmployeeLogin />} />
              <Route
                path="/employee/dashboard"
                element={
                  <EmployeeProtectedRoute>
                    <EmployeeDashboard />
                  </EmployeeProtectedRoute>
                }
              />

              {/* Admin/Department Routes (Protected with special URL) */}
              <Route path="/jjcewgsaccess" element={<DepartmentSelector />} />
              <Route path="/jjcewgsaccess/login/:department" element={<LoginForm />} />
              <Route
                path="/jjcewgsaccess/super-admin"
                element={
                  <AdminProtectedRoute department="super-admin" requireSuperAdmin={true}>
                    <SuperAdminDashboard />
                  </AdminProtectedRoute>
                }
              />
              <Route
                path="/jjcewgsaccess/hr"
                element={
                  <AdminProtectedRoute department="Human Resources">
                    <HRDepartment />
                  </AdminProtectedRoute>
                }
              />
              <Route
                path="/jjcewgsaccess/operations"
                element={
                  <AdminProtectedRoute department="Operation">
                    <OperationsDepartment />
                  </AdminProtectedRoute>
                }
              />
              <Route
                path="/jjcewgsaccess/finance"
                element={
                  <AdminProtectedRoute department="Finance">
                    <FinancePayrollDepartment />
                  </AdminProtectedRoute>
                }
              />
              <Route
                path="/jjcewgsaccess/procurement"
                element={
                  <AdminProtectedRoute department="Procurement">
                    <ProcurementDepartment />
                  </AdminProtectedRoute>
                }
              />
              <Route
                path="/jjcewgsaccess/engineering"
                element={
                  <AdminProtectedRoute department="Engineering">
                    <EngineeringDepartment />
                  </AdminProtectedRoute>
                }
              />

              {/* Catch all - redirect to employee landing */}
              <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

// Protected route for employees
function EmployeeProtectedRoute({ children }) {
  const { isEmployeeAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!isEmployeeAuthenticated) {
    return <Navigate to="/employee/login" replace />
  }

  return children
}

// Protected route for admin/department users
function AdminProtectedRoute({ children, department, requireSuperAdmin = false }) {
  const { isAuthenticated, selectedDepartment, isSuperAdmin, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    // Map department names to URL slugs for login redirect
    const slugMap = {
      "Human Resources": "hr",
      "Operation": "operations",
      "Finance": "finance",
      "Procurement": "procurement",
      "Engineering": "engineering",
      "super-admin": "super-admin"
    }
    const slug = slugMap[department] || department.toLowerCase().replace(/\s+/g, '-')
    return <Navigate to={`/jjcewgsaccess/login/${slug}`} replace />
  }

  if (requireSuperAdmin && !isSuperAdmin) {
    return <Navigate to="/jjcewgsaccess" replace />
  }

  if (!requireSuperAdmin && selectedDepartment !== department && !isSuperAdmin) {
    const slugMap = {
      "Human Resources": "hr",
      "Operation": "operations",
      "Finance": "finance",
      "Procurement": "procurement",
      "Engineering": "engineering"
    }
    const slug = slugMap[department] || department.toLowerCase().replace(/\s+/g, '-')
    return <Navigate to={`/jjcewgsaccess/login/${slug}`} replace />
  }

  return children
}

export default App