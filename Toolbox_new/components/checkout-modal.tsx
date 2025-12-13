"use client"

import { useState, useEffect, useCallback } from "react"
import { 
  X, Wifi, WifiOff, Scan, CreditCard, UserCheck, 
  ShoppingCart, FileText, CheckCircle2, ChevronRight, ChevronLeft,
  Package, ArrowRight, AlertCircle, Check
} from "lucide-react"
import { Button } from "../components/ui/button"
import { Card, CardContent } from "../components/ui/card"
import { Input } from "../components/ui/input"
import { Badge } from "../components/ui/badge"
import { Textarea } from "../components/ui/textarea"
import { apiService } from "../lib/api_service"
import type { CartItem } from "../app/page"
import type { Employee } from "../lib/Services/employees.service"

interface CheckoutModalProps {
  isOpen: boolean
  onClose: () => void
  items: CartItem[]
  onConfirmCheckout: (employee: Employee, purpose?: string) => void
  isCommitting?: boolean
}

type WizardStep = 1 | 2 | 3

const WIZARD_STEPS = [
  { step: 1, title: "Review Order", icon: ShoppingCart, description: "Verify your items" },
  { step: 2, title: "Purpose", icon: FileText, description: "Add checkout reason" },
  { step: 3, title: "Confirm", icon: CheckCircle2, description: "Employee verification" },
] as const

export function CheckoutModal({ isOpen, onClose, items, onConfirmCheckout, isCommitting = false }: CheckoutModalProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>(1)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [inputMethod, setInputMethod] = useState<'barcode' | 'manual'>('barcode')
  const [userInput, setUserInput] = useState("")
  const [isScanning, setIsScanning] = useState(false)
  const [loadingEmployees, setLoadingEmployees] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [purpose, setPurpose] = useState("")

  // Load employees when modal opens
  useEffect(() => {
    if (isOpen && employees.length === 0) {
      loadEmployees()
    }
  }, [isOpen])

  // Notify GlobalBarcodeListener about checkout modal state
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('checkout-modal-state', { 
      detail: { isOpen } 
    }))
  }, [isOpen])

  // Listen for barcode scanner input (only on step 3)
  useEffect(() => {
    if (!isOpen || inputMethod !== 'barcode' || currentStep !== 3) return

    let barcodeBuffer = ""
    let lastKeyTime = Date.now()

    const handleKeyDown = (event: KeyboardEvent) => {
      const currentTime = Date.now()

      if (currentTime - lastKeyTime > 100) {
        barcodeBuffer = ""
      }
      lastKeyTime = currentTime

      if (event.key === 'Enter') {
        event.preventDefault()
        if (barcodeBuffer.length > 3) {
          handleBarcodeScanned(barcodeBuffer)
          barcodeBuffer = ""
        }
        return
      }

      if (/^[a-zA-Z0-9]$/.test(event.key)) {
        barcodeBuffer += event.key
        if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          event.preventDefault()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, inputMethod, employees, currentStep])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(1)
      setSelectedEmployee(null)
      setUserInput("")
      setError(null)
      setIsScanning(false)
      setPurpose("")
    }
  }, [isOpen])

  const loadEmployees = async () => {
    setLoadingEmployees(true)
    setError(null)
    try {
      const employeeData = await apiService.fetchEmployees()
      setEmployees(employeeData)
    } catch (error) {
      console.error("[CheckoutModal] Failed to load employees:", error)
      setError("Failed to load employee data. Please check API connection.")
    } finally {
      setLoadingEmployees(false)
    }
  }

  const handleBarcodeScanned = (barcode: string) => {
    setIsScanning(true)
    const employee = employees.find(emp => emp.idBarcode === barcode)

    if (employee) {
      if (employee.status !== 'Active') {
        setError(`⚠️ Employee ID is DISABLED: ${employee.firstName} ${employee.lastName}'s ID has been deactivated. Please report to HR Department.`)
        setUserInput(barcode)
        setSelectedEmployee(null)
        setIsScanning(false)
        return
      }
      
      setSelectedEmployee(employee)
      setUserInput(barcode)
      setError(null)
    } else {
      setError(`No employee found with barcode: ${barcode}`)
      setUserInput(barcode)
      setSelectedEmployee(null)
    }

    setIsScanning(false)
  }

  const handleManualInput = (value: string) => {
    setUserInput(value)
    setError(null)

    if (value.trim().length === 0) {
      setSelectedEmployee(null)
      return
    }

    if (value.trim().length < 3) {
      setSelectedEmployee(null)
      return
    }

    let employee = employees.find(emp => emp.idNumber === value.trim())
    
    if (!employee) {
      employee = employees.find(emp => 
        emp.idNumber?.toLowerCase() === value.trim().toLowerCase()
      )
    }
    
    if (!employee) {
      employee = employees.find(emp => emp.idBarcode === value.trim())
    }

    if (employee) {
      if (employee.status !== 'Active') {
        setError(`⚠️ Employee ID is DISABLED: ${employee.firstName} ${employee.lastName}'s ID has been deactivated. Please report to HR Department.`)
        setSelectedEmployee(null)
        return
      }
      
      setSelectedEmployee(employee)
      setError(null)
    } else {
      setSelectedEmployee(null)
      if (value.trim().length >= 5) {
        setError(`No employee found with ID number: ${value.trim()}`)
      }
    }
  }

  const handleConfirm = async () => {
    if (!selectedEmployee) {
      setError("Please scan a barcode or enter a valid employee ID.")
      return
    }

    try {
      onConfirmCheckout(selectedEmployee, purpose.trim() || undefined)
    } catch (error) {
      console.error("[CheckoutModal] Failed to log transaction:", error)
      setError("Failed to save transaction log. Please try again.")
    }
  }

  const goToNextStep = useCallback(() => {
    if (currentStep < 3) {
      setCurrentStep((prev) => (prev + 1) as WizardStep)
    }
  }, [currentStep])

  const goToPrevStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as WizardStep)
      setError(null)
    }
  }, [currentStep])

  const goToStep = useCallback((step: WizardStep) => {
    // Can only go to completed steps or current step
    if (step <= currentStep) {
      setCurrentStep(step)
      setError(null)
    }
  }, [currentStep])

  const canProceedToNext = useCallback(() => {
    switch (currentStep) {
      case 1:
        return items.length > 0
      case 2:
        return true // Purpose is optional
      case 3:
        return !!selectedEmployee
      default:
        return false
    }
  }, [currentStep, items.length, selectedEmployee])

  if (!isOpen) return null

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalValue = items.reduce((sum, item) => sum + item.quantity * 10, 0)
  const apiConfig = apiService.getConfig()

  // Step Indicator Component - Clickable steps
  const StepIndicator = () => (
    <div className="px-6 py-4 border-b border-border">
      <div className="flex items-center justify-between">
        {WIZARD_STEPS.map((step, index) => {
          const Icon = step.icon
          const isActive = currentStep === step.step
          const isCompleted = currentStep > step.step
          const isClickable = step.step <= currentStep
          
          return (
            <div key={step.step} className="flex items-center flex-1">
              {/* Step Circle & Content */}
              <button
                type="button"
                onClick={() => isClickable && goToStep(step.step as WizardStep)}
                disabled={!isClickable || isCommitting}
                className={`
                  flex items-center gap-3 transition-all duration-200
                  ${isClickable && !isCommitting ? 'cursor-pointer' : 'cursor-default'}
                  ${isClickable && !isActive ? 'hover:opacity-80' : ''}
                `}
              >
                {/* Circle */}
                <div className={`
                  relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200
                  ${isActive 
                    ? 'border-secondary bg-secondary text-secondary-foreground' 
                    : isCompleted 
                      ? 'border-success bg-success text-success-foreground' 
                      : 'border-border bg-muted text-muted-foreground'
                  }
                `}>
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
                
                {/* Text */}
                <div className="hidden md:block text-left">
                  <p className={`text-sm font-medium leading-tight ${
                    isActive ? 'text-foreground' : isCompleted ? 'text-success' : 'text-muted-foreground'
                  }`}>
                    {step.title}
                  </p>
                  <p className="text-xs text-muted-foreground leading-tight">
                    {step.description}
                  </p>
                </div>
              </button>
              
              {/* Connector Line */}
              {index < WIZARD_STEPS.length - 1 && (
                <div className="flex-1 mx-4 hidden sm:block">
                  <div className={`h-0.5 rounded-full transition-colors duration-200 ${
                    currentStep > step.step ? 'bg-success' : 'bg-border'
                  }`} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-3xl bg-card border-border/50 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
          <div>
            <h2 className="text-xl font-bold text-card-foreground">Checkout</h2>
            <p className="text-sm text-muted-foreground">Step {currentStep} of 3 — {WIZARD_STEPS[currentStep - 1]?.title ?? ''}</p>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose} 
            disabled={isCommitting}
            className="h-9 w-9 p-0 rounded-lg hover:bg-muted"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Step Indicator */}
        <StepIndicator />

        {/* Content */}
        <CardContent className="p-6 max-h-[60vh] overflow-y-auto">
          {/* Step 1: Review Order */}
          {currentStep === 1 && (
            <div className="space-y-5">
              {/* API Status Banner */}
              <div className={`flex items-center justify-between p-3 rounded-lg border ${
                apiConfig.isConnected 
                  ? 'bg-success/10 border-success/30' 
                  : 'bg-amber-500/10 border-amber-500/30'
              }`}>
                <div className="flex items-center gap-2">
                  {apiConfig.isConnected ? (
                    <Wifi className="w-4 h-4 text-success" />
                  ) : (
                    <WifiOff className="w-4 h-4 text-amber-500" />
                  )}
                  <span className={`text-sm font-medium ${
                    apiConfig.isConnected ? 'text-success' : 'text-amber-600 dark:text-amber-400'
                  }`}>
                    {apiConfig.isConnected ? 'Connected to Server' : 'Offline Mode'}
                  </span>
                </div>
                <Badge variant="outline" className={`text-xs ${
                  apiConfig.isConnected 
                    ? 'border-success/50 text-success' 
                    : 'border-amber-500/50 text-amber-600 dark:text-amber-400'
                }`}>
                  {apiConfig.isConnected ? 'Synced' : 'Local Only'}
                </Badge>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm">
                    <Package className="w-4 h-4 text-secondary" />
                    Items in Cart
                  </h3>
                  <Badge variant="secondary" className="text-xs">
                    {items.length} {items.length === 1 ? 'item' : 'items'}
                  </Badge>
                </div>
                
                <div className="rounded-lg border border-border/50 divide-y divide-border/50 max-h-[35vh] overflow-y-auto">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center justify-center w-7 h-7 rounded-md bg-secondary/10 text-secondary font-semibold text-xs flex-shrink-0">
                        {item.quantity}×
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-card-foreground text-sm truncate leading-tight">
                          {item.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate leading-tight">
                          {item.brand} • {item.itemType}
                          <span className="ml-2 text-[10px] opacity-70">
                            ({item.balance} → {Math.max(0, item.balance - item.quantity)})
                          </span>
                        </p>
                      </div>
                      <p className="text-sm font-medium text-foreground flex-shrink-0">
                        ₱{(item.quantity * 10).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <Card className="border-secondary/30 bg-secondary/5">
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Quantity</span>
                      <span className="font-medium text-foreground">{totalItems} pcs</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Unique Products</span>
                      <span className="font-medium text-foreground">{items.length}</span>
                    </div>
                    <div className="h-px bg-border my-2" />
                    <div className="flex justify-between items-center">
                      <span className="text-base font-semibold text-foreground">Total Value</span>
                      <span className="text-xl font-bold text-secondary">₱{totalValue.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 2: Purpose */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center py-2">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-secondary/10 mb-4">
                  <FileText className="w-7 h-7 text-secondary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  What's this checkout for?
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Help us understand why these items are needed (optional)
                </p>
              </div>

              <div className="space-y-3">
                <Textarea
                  placeholder="e.g., Equipment maintenance, Project materials, Emergency repair..."
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="min-h-[100px] resize-none bg-input border-border focus:border-secondary focus:ring-secondary/20"
                  maxLength={255}
                  disabled={isCommitting}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>This helps with inventory tracking and reporting</span>
                  <span>{purpose.length}/255</span>
                </div>
              </div>

              {/* Quick Suggestions */}
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Quick Select
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    "Maintenance Work",
                    "Project Requirement",
                    "Equipment Repair",
                    "Stock Replenishment",
                    "Emergency Use",
                    "Customer Request"
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setPurpose(suggestion)}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                        purpose === suggestion
                          ? 'bg-secondary text-secondary-foreground border-secondary'
                          : 'bg-card border-border text-muted-foreground hover:border-secondary hover:text-secondary'
                      }`}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Confirmation & Employee ID */}
          {currentStep === 3 && (
            <div className="space-y-5">
              {/* Employee Identification */}
              <div className="space-y-4">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-secondary/10 mb-3">
                    <UserCheck className="w-6 h-6 text-secondary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">
                    Employee Verification
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Scan your ID badge or enter ID number
                  </p>
                </div>

                {/* Input Method Toggle */}
                <div className="flex justify-center">
                  <div className="inline-flex p-1 rounded-lg bg-muted">
                    <button
                      type="button"
                      onClick={() => {
                        setInputMethod('barcode')
                        setUserInput("")
                        setSelectedEmployee(null)
                        setError(null)
                      }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        inputMethod === 'barcode'
                          ? 'bg-card text-secondary shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Scan className="w-4 h-4" />
                      Scan Barcode
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setInputMethod('manual')
                        setUserInput("")
                        setSelectedEmployee(null)
                        setError(null)
                      }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        inputMethod === 'manual'
                          ? 'bg-card text-secondary shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <CreditCard className="w-4 h-4" />
                      Enter ID
                    </button>
                  </div>
                </div>

                {/* Input Field */}
                <div className="space-y-2">
                  <div className="relative">
                    <Input
                      placeholder={inputMethod === 'barcode' ? "Scan or type barcode..." : "Enter employee ID number..."}
                      value={userInput}
                      onChange={(e) => {
                        const value = e.target.value
                        setUserInput(value)
                        if (inputMethod === 'barcode') {
                          if (value.trim().length > 3) {
                            handleBarcodeScanned(value.trim())
                          } else {
                            setSelectedEmployee(null)
                          }
                        } else {
                          handleManualInput(value)
                        }
                      }}
                      className="h-12 text-center text-lg font-mono bg-input border-border focus:border-secondary"
                      disabled={isCommitting}
                      autoComplete="off"
                    />
                    {isScanning && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <div className="w-5 h-5 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                  
                  {inputMethod === 'barcode' && !selectedEmployee && !error && (
                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                      <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                      Ready to scan...
                    </div>
                  )}
                </div>

                {/* Loading State */}
                {loadingEmployees && (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <div className="w-4 h-4 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
                    Loading employees...
                  </div>
                )}

                {/* Error Display */}
                {error && (
                  <Card className={`border ${
                    error.includes('DISABLED')
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : 'bg-destructive/10 border-destructive/30'
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                          error.includes('DISABLED') ? 'text-amber-500' : 'text-destructive'
                        }`} />
                        <div>
                          <p className={`text-sm font-medium ${
                            error.includes('DISABLED') ? 'text-amber-600 dark:text-amber-400' : 'text-destructive'
                          }`}>
                            {error.includes('DISABLED') ? 'ID Deactivated' : 'Verification Failed'}
                          </p>
                          <p className={`text-xs mt-1 ${
                            error.includes('DISABLED') ? 'text-amber-600/80 dark:text-amber-400/80' : 'text-destructive/80'
                          }`}>
                            {error.replace('⚠️ Employee ID is DISABLED: ', '')}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Selected Employee */}
                {selectedEmployee && (
                  <Card className="bg-success/10 border-success/30">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-success text-success-foreground font-bold text-lg">
                          {selectedEmployee?.firstName?.[0] ?? ''}{selectedEmployee?.lastName?.[0] ?? ''}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-success truncate">
                            {selectedEmployee?.firstName ?? ''} {selectedEmployee?.middleName ? selectedEmployee.middleName + ' ' : ''}{selectedEmployee?.lastName ?? ''}
                          </p>
                          <p className="text-sm text-success/80 truncate">
                            {selectedEmployee?.position ?? ''} • {selectedEmployee?.department ?? ''}
                          </p>
                          <p className="text-xs text-success/70 mt-1">
                            ID: {selectedEmployee?.idNumber ?? ''}
                          </p>
                        </div>
                        <CheckCircle2 className="w-6 h-6 text-success flex-shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Order Summary Mini */}
              <Card className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between text-sm mb-3">
                    <span className="font-medium text-foreground">Order Summary</span>
                    <Badge variant="outline" className="text-xs">{items.length} items</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total Value</span>
                    <span className="text-lg font-bold text-secondary">₱{totalValue.toFixed(2)}</span>
                  </div>
                  {purpose && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-xs text-muted-foreground">Purpose:</p>
                      <p className="text-sm text-foreground mt-0.5">{purpose}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-t border-border bg-muted/30">
          <Button
            variant="outline"
            onClick={currentStep === 1 ? onClose : goToPrevStep}
            disabled={isCommitting}
            className="min-w-[120px] h-11"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            {currentStep === 1 ? 'Cancel' : 'Back'}
          </Button>
          
          <div className="flex items-center gap-1">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`w-2 h-2 rounded-full transition-colors ${
                  step === currentStep ? 'bg-secondary' : step < currentStep ? 'bg-success' : 'bg-muted-foreground/30'
                }`}
              />
            ))}
          </div>
          
          {currentStep < 3 ? (
            <Button
              onClick={goToNextStep}
              disabled={!canProceedToNext()}
              className="min-w-[120px] h-11 bg-secondary hover:bg-secondary/90 text-secondary-foreground"
            >
              Continue
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleConfirm}
              disabled={!selectedEmployee || isCommitting || loadingEmployees}
              className="min-w-[160px] h-11 bg-success hover:bg-success/90 text-success-foreground"
            >
              {isCommitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  Confirm Checkout
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          )}
        </div>
      </Card>
    </div>
  )
}