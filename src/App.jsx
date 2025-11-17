import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom"
import { AuthProvider, useAuth } from "./contexts/AuthContext"
import { lazy, Suspense } from "react"
// Lazy-load heavier top-level components to improve initial load
const DepartmentSelector = lazy(() => import("./components/DepartmentSelector"))
const LoginForm = lazy(() => import("./components/LoginForm"))
const PWAInstallPrompt = lazy(() => import("../public/PWAInstallPrompt"))
const PWAStatusIndicator = lazy(() => import("../public/PWAStatusIndicator"))
const GearLoadingSpinner  = lazy(() => import("../public/LoadingGear"))
import { ProcurementDepartmentSkeleton } from "./components/skeletons/ProcurementSkeletons"
import './index.css'
//addedsomething here
// Lazy load department components for better performance
const HRDepartment = lazy(() => import("./components/department/HRDepartment"))
const OperationsDepartment = lazy(() => import("./components/department/OperationsDepartment"))
const FinancePayrollDepartment = lazy(() => import("./components/department/FinancePayrollDepartment"))
const ProcurementDepartment = lazy(() => import("./components/department/ProcurementDepartment"))
const EngineeringDepartment = lazy(() => import("./components/department/EngineeringDepartment"))
const SuperAdminDashboard = lazy(() => import("./components/SuperAdminDashboard"))
const EmployeeLanding = lazy(() => import("./components/employeeLandingPage/EmployeeLanding"))
const EmployeeLogin = lazy(() => import("./components/employeeLandingPage/EmployeeLogin"))
const EmployeeDashboard = lazy(() => import("./components/employeeLandingPage/EmployeeDashboard"))
const ToolboxWrapper = lazy(() => import("./components/ToolboxWrapper"))

// Loading component for lazy-loaded routes
function LoadingFallback() {
  const { isDarkMode } = useAuth()
  return (
    <GearLoadingSpinner isDarkMode={isDarkMode} />
  )
}

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
        className={`min-h-screen flex items-center justify-center transition-all duration-300 ${
          isDarkMode
            ? "bg-slate-900 text-gray-100"
            : "bg-slate-50 text-gray-900"
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
      {/* PWA Components - Available throughout the app */}
      <Suspense fallback={null}>
        <PWAInstallPrompt />
        <PWAStatusIndicator />
      </Suspense>
      <RoutesWrapper />
    </Router>
  )
}

function RoutesWrapper() {
  const location = useLocation()
  const { isDarkMode } = useAuth()
  const isToolboxRoute = location.pathname === "/jjctoolbox"

  // For toolbox route, don't apply main app styling
  if (isToolboxRoute) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/jjctoolbox" element={<ToolboxWrapper />} />
        </Routes>
      </Suspense>
    )
  }

  // For all other routes, apply main app styling
  return (
    <div
      className={`min-h-screen transition-all duration-300 ${
        isDarkMode
          ? "bg-slate-900 text-gray-100"
          : "bg-slate-50 text-gray-900"
      }`}
    >
      <Suspense fallback={<LoadingFallback />}>
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
            path="/jjcewgsaccess/superadmin"
            element={
              <AdminProtectedRoute department="superAdmin" requireSuperAdmin={true}>
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
              <AdminProtectedRoute department="Operations">
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
                    <Suspense fallback={<ProcurementDepartmentSkeleton />}>
                      <ProcurementDepartment />
                    </Suspense>
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
      </Suspense>
    </div>
  )
}

// Protected route for employees
function EmployeeProtectedRoute({ children }) {
  const { isEmployeeAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <GearLoadingSpinner isDarkMode={isDarkMode} />
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
      <GearLoadingSpinner isDarkMode={isDarkMode}/>
    )
  }

  if (!isAuthenticated) {
    // Map department names to URL slugs for login redirect
    const slugMap = {
      "Human Resources": "hr",
      "Operations": "operations",
      "Finance": "finance",
      "Procurement": "procurement",
      "Engineering": "engineering",
      "superAdmin": "superadmin"
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
      "Operations": "operations",
      "Finance": "finance",
      "Procurement": "procurement",
      "Engineering": "engineering",
      "superAdmin": "superadmin"
    }
    const slug = slugMap[department] || department.toLowerCase().replace(/\s+/g, '-')
    return <Navigate to={`/jjcewgsaccess/login/${slug}`} replace />
  }

  return children
}

export default App