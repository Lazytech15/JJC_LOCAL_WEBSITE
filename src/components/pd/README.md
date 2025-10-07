# Procurement Department Components

This folder contains all components related to the Procurement Department functionality. The components are organized into logical groups for better maintainability.

## 📁 Folder Structure

```
src/components/pd/
├── purchase-orders/          # Purchase Order Management
│   ├── PurchaseOrderTracker.jsx
│   ├── CreatePurchaseOrderWizard.jsx
│   └── index.js
│
├── inventory/                # Inventory & Item Management
│   ├── InventoryManagement.jsx
│   ├── InventoryListView.jsx
│   ├── AddEditItemWizard.jsx
│   ├── AddItem.jsx
│   ├── ItemForm.jsx
│   ├── ItemDetailView.jsx
│   ├── RestockList.jsx
│   └── index.js
│
├── barcode/                  # Barcode & QR Code Functionality
│   ├── BarCodeGenerator.jsx
│   ├── BarCodeScanner.jsx
│   ├── QRCodeSmall.jsx
│   └── index.js
│
├── shared/                   # Shared Utility Components
│   ├── ModalPortal.jsx
│   ├── ConfirmationModal.jsx
│   ├── ToastNotification.jsx
│   └── index.js
│
├── AdminDashboard.jsx        # Main Dashboard
├── SuppliesManagement.jsx    # Supplier Management
├── EmployeeLogs.jsx          # Employee Activity Logs
├── index.js                  # Main barrel export
└── README.md                 # This file
```

## 📦 Component Groups

### Purchase Orders (`purchase-orders/`)
Components for managing purchase orders following JJC Engineering receipt format.

- **PurchaseOrderTracker**: Main tracker view with sorting, filtering, and status management
- **CreatePurchaseOrderWizard**: 4-step wizard for creating new purchase orders
  - Step 1: Select supplier & generate PO number (MMYY-XXX format)
  - Step 2: Add items from supplier with quantity/unit/price
  - Step 3: Enter PO details (terms, signatures, address)
  - Step 4: Review receipt preview & submit

### Inventory (`inventory/`)
Components for managing inventory items and stock levels.

- **InventoryManagement**: Main inventory management interface
- **InventoryListView**: List view with sorting and filtering
- **AddEditItemWizard**: Wizard for adding/editing items
- **AddItem**: Legacy item form (consider deprecating)
- **ItemForm**: Reusable item form component
- **ItemDetailView**: Detailed view of a single item
- **RestockList**: List of items that need restocking

### Barcode (`barcode/`)
Components for barcode and QR code functionality.

- **BarCodeGenerator**: Generate barcodes for items
- **BarCodeScanner**: Scan barcodes using camera
- **QRCodeSmall**: Small QR code display component

### Shared (`shared/`)
Reusable utility components used across the PD module.

- **ModalPortal**: Portal for rendering modals
- **ConfirmationModal**: Reusable confirmation dialog
- **ToastNotification**: Toast notification system (includes `ToastProvider` and `useToast` hook)

### Root Components
- **AdminDashboard**: Main dashboard with metrics and quick actions
- **SuppliesManagement**: Manage suppliers and their information
- **EmployeeLogs**: View employee activity logs

## 🔌 Usage

### Import Components

You can now import components using clean, organized imports:

```jsx
// Import from main barrel export
import {
  PurchaseOrderTracker,
  CreatePurchaseOrderWizard,
  InventoryManagement,
  AdminDashboard,
  ToastProvider,
  useToast
} from '../pd'

// Or import from specific groups
import { PurchaseOrderTracker } from '../pd/purchase-orders'
import { InventoryManagement } from '../pd/inventory'
import { BarCodeScanner } from '../pd/barcode'
import { ModalPortal, useToast } from '../pd/shared'
```

### Example: ProcurementDepartment.jsx

```jsx
import {
  InventoryManagement,
  RestockList,
  PurchaseOrderTracker,
  EmployeeLogs,
  ItemDetailView,
  AdminDashboard,
  SuppliesManagement,
  ToastProvider
} from "../pd"

function ProcurementDepartment() {
  return (
    <ToastProvider>
      {/* Your component content */}
    </ToastProvider>
  )
}
```

## 🎯 Benefits of This Structure

1. **Better Organization**: Related components are grouped together
2. **Easier Maintenance**: IT staff can quickly find components by functionality
3. **Cleaner Imports**: Use barrel exports for concise import statements
4. **Scalability**: Easy to add new components to appropriate groups
5. **Clear Dependencies**: Each group has its own index.js showing exports
6. **Reduced Clutter**: Moved 18+ files into 4 logical folders + 3 root files

## 🔄 Migration Notes

### What Changed
- ✅ Moved 18 component files into 4 organized folders
- ✅ Created barrel exports (index.js) for each folder
- ✅ Consolidated `CreatePurchaseOrderWizardNew.jsx` → `CreatePurchaseOrderWizard.jsx`
- ✅ Deleted old `CreatePurchaseOrderWizard.jsx` (legacy version)
- ✅ Updated all import paths to use new structure
- ✅ Updated ProcurementDepartment.jsx to use barrel imports

### Breaking Changes
None! All imports have been updated. The public API remains the same.

## 📝 Component Descriptions

### Purchase Order Wizard Flow
1. **Supplier Selection**: Choose from 19 available suppliers
2. **PO Number Generation**: Auto-generates MMYY prefix, user enters 3-digit sequence
3. **Real-time Validation**: Checks for duplicate PO numbers with overwrite option
4. **Item Selection**: Shows only items from selected supplier
5. **Details Entry**: Terms (30/60/90-DAYS, COD), signatures, dates
6. **Receipt Preview**: Shows exact JJC Engineering receipt format
7. **Submission**: Creates PO with all validation and error handling

### API Integration
All components use the centralized `apiService` from `utils/api/api-service.js`:
- Purchase Orders: `apiService.purchaseOrders.*`
- Items: `apiService.items.*`
- Suppliers: Accessed via purchase order endpoints

## 🚀 Future Improvements

1. **TypeScript Migration**: Convert .jsx → .tsx for better type safety
2. **Component Documentation**: Add JSDoc comments to all components
3. **Unit Tests**: Add tests for critical components
4. **Storybook**: Create component stories for design system
5. **Performance**: Implement code splitting for lazy loading
6. **Accessibility**: Audit and improve ARIA labels and keyboard navigation

## 👥 For Other IT Staff

### Adding New Components

1. **Determine the group**: purchase-orders, inventory, barcode, or shared
2. **Create the component** in the appropriate folder
3. **Export it** in the folder's `index.js`
4. **Import it** using the barrel export: `import { YourComponent } from '../pd'`

### Finding Components

- **Purchase Orders?** → Look in `purchase-orders/`
- **Inventory/Items?** → Look in `inventory/`
- **Barcode/QR?** → Look in `barcode/`
- **Modals/Toasts?** → Look in `shared/`
- **Dashboard/Suppliers/Logs?** → Look in root `pd/`

### Debugging Import Issues

If you see import errors after this reorganization:
1. Check the component name in `index.js` files
2. Verify the path depth (use `../pd` from department files)
3. For shared utilities, import from `pd/shared`
4. Check if you're using the old component names (e.g., `CreatePurchaseOrderWizardNew`)

## 📞 Support

For questions about this structure, refer to:
- This README
- Component source code comments
- Git history for migration details
- Team documentation wiki

---

**Last Updated**: October 7, 2025
**Maintained By**: Development Team
