// Procurement Department Components - Main Barrel Export
// This file provides clean imports for all PD components
// Using explicit named exports for optimal tree-shaking

// Purchase Orders
export { 
  PurchaseOrderTracker, 
  CreatePurchaseOrderWizard 
} from './purchase-orders'

// Inventory Management
export { 
  InventoryManagement,
  InventoryListView,
  AddEditItemWizard,
  ItemDetailView,
  RestockList
} from './inventory'

// Barcode & QR Code
export { 
  BarCodeGenerator, 
  BarCodeScanner, 
  QRCodeSmall 
} from './barcode'

// Shared Utilities
export { 
  ModalPortal, 
  ConfirmationModal, 
  ToastProvider, 
  useToast 
} from './shared'

// Root Level Components
export { default as AdminDashboard } from './AdminDashboard'
export { default as SupplierManagement } from './SuppliesManagement'
export { default as EmployeeLogs } from './EmployeeLogs'
