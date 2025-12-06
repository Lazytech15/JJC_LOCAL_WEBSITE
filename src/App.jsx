import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom"
import { AuthProvider, useAuth } from "./contexts/AuthContext"
import { lazy, Suspense, useEffect, useRef } from "react"
import { registerAdminServiceWorker } from "../public/registerAdminServiceWorker"
import { saveLastRoute, getRestoreRoute, isRunningAsPWA, clearLastRoute } from "./utils/sessionPersistence"
import SessionTimeoutModal from "./components/SessionTimeoutModal"

// Lazy-load heavier top-level components to improve initial load
const DepartmentSelector = lazy(() => import("./components/DepartmentSelector"))
const LoginForm = lazy(() => import("./components/LoginForm"))
const PWAInstallPrompt = lazy(() => import("../public/PWAInstallPrompt"))
const PWAStatusIndicator = lazy(() => import("../public/PWAStatusIndicator"))
const GearLoadingSpinner = lazy(() => import("../public/LoadingGear"))
import { ProcurementDepartmentSkeleton } from "./components/skeletons/ProcurementSkeletons"
import './index.css'

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

//opertions new route
const PublicChecklist = lazy(() => import("./components/op/PublicChecklistAuth"))

// Loading component for lazy-loaded routes
function LoadingFallback() {
  const { isDarkMode } = useAuth()
  return (
    <GearLoadingSpinner isDarkMode={isDarkMode} />
  )
}

function App() {
  useEffect(() => {
    // Register the admin service worker
    registerAdminServiceWorker()
  }, [])

  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

function AppContent() {
  const { isDarkMode, isLoading, sessionTimeoutInfo, closeSessionTimeoutModal } = useAuth()

  // Ensure Tailwind dark mode class is applied at the document root
  useEffect(() => {
    const root = document.documentElement
    if (isDarkMode) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [isDarkMode])

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
      
      {/* Session Timeout Modal - Shows when logged out from another tab */}
      <SessionTimeoutModal
        isOpen={sessionTimeoutInfo?.isOpen}
        onClose={closeSessionTimeoutModal}
        reason={sessionTimeoutInfo?.reason}
        userType={sessionTimeoutInfo?.userType}
        isDarkMode={isDarkMode}
      />
    </Router>
  )
}

function RoutesWrapper() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isDarkMode, isAuthenticated, isEmployeeAuthenticated, selectedDepartment, isSuperAdmin, isLoading } = useAuth()
  const isToolboxRoute = location.pathname === "/jjctoolbox"
  
  // Track if we've already handled initial session restore
  const hasRestoredSession = useRef(false)

  // Handle session restoration on app launch (PWA or regular)
  useEffect(() => {
    // Skip if still loading auth state
    if (isLoading) return
    
    // Skip for toolbox route
    if (isToolboxRoute) return
    
    // Only do session restore ONCE on initial load
    if (hasRestoredSession.current) return

    // Get the restore route based on current auth state
    const { route, shouldRedirect } = getRestoreRoute({
      isAuthenticated,
      isEmployeeAuthenticated,
      selectedDepartment,
      isSuperAdmin
    })

    // Only redirect on INITIAL app load (page refresh/PWA open)
    // NOT when on login pages - let the login component handle navigation
    const isOnHomePage = location.pathname === '/'
    const isOnAdminSelector = location.pathname === '/jjcewgsaccess'
    const isOnLoginPage = location.pathname === '/employee/login' ||
                          location.pathname.includes('/login')

    // Mark as restored so we don't run this again
    hasRestoredSession.current = true

    // Only restore session if:
    // 1. User is on home page or admin selector (not login pages)
    // 2. User is authenticated
    // 3. There's a valid route to restore to
    if (shouldRedirect && (isOnHomePage || isOnAdminSelector) && !isOnLoginPage && (isAuthenticated || isEmployeeAuthenticated)) {
      console.log(`🔄 Restoring session to: ${route}`)
      navigate(route, { replace: true })
    }
  }, [isLoading, isAuthenticated, isEmployeeAuthenticated, selectedDepartment, isSuperAdmin, location.pathname])

  // Track route changes for session persistence
  useEffect(() => {
    // Skip toolbox route
    if (isToolboxRoute) return

    // Determine user type for route tracking
    let userType = 'guest'
    if (isAuthenticated) {
      userType = 'admin'
    } else if (isEmployeeAuthenticated) {
      userType = 'employee'
    }

    // Save the current route for session restoration
    saveLastRoute(location.pathname, userType)
  }, [location.pathname, isAuthenticated, isEmployeeAuthenticated, isToolboxRoute])

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
          ? "dark bg-slate-900 text-gray-100"
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

          <Route 
            path="/operations-checklist" 
            element={
              <Suspense fallback={<LoadingFallback />}>
                <PublicChecklist />
              </Suspense>
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
  const { isEmployeeAuthenticated, isLoading, isDarkMode } = useAuth()

  if (isLoading) {
    return <GearLoadingSpinner isDarkMode={isDarkMode} />
  }

  if (!isEmployeeAuthenticated) {
    return <Navigate to="/employee/login" replace />
  }

  return children
}

// Protected route for admin/department users
function AdminProtectedRoute({ children, department, requireSuperAdmin = false }) {
  const { isAuthenticated, selectedDepartment, isSuperAdmin, isLoading, isDarkMode } = useAuth()

  if (isLoading) {
    return <GearLoadingSpinner isDarkMode={isDarkMode} />
  }

  if (!isAuthenticated) {
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