<?php
// index.php - Main router file for items API
require_once __DIR__ . '/validators.php';
require_once __DIR__ . '/ItemService.php';

header('Content-Type: application/json');

// Get request method and path
$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Remove base path if needed (adjust according to your setup)
$basePath = '/api/items';
$route = str_replace($basePath, '', $path);

// Route dispatcher
try {
    // Stock routes
    if (preg_match('#^/stock/(\d+)$#', $route, $matches)) {
        require_once __DIR__ . '/itemComponents/stock.php';
        handleStockUpdate($matches[1]);
    } 
    elseif (preg_match('#^/stock/(\d+)/insert$#', $route, $matches)) {
        require_once __DIR__ . '/itemComponents/stock.php';
        handleStockInsert($matches[1]);
    }
    elseif (preg_match('#^/stock/(\d+)/quantity$#', $route, $matches)) {
        require_once __DIR__ . '/itemComponents/stock.php';
        handleStockQuantity($matches[1]);
    }
    elseif (preg_match('#^/stock/(\d+)/out$#', $route, $matches)) {
        require_once __DIR__ . '/itemComponents/stock.php';
        handleStockOut($matches[1]);
    }    
    // Purchase Order routes
    elseif ($route === '/purchase-orders' && $method === 'GET') {
        require_once __DIR__ . '/itemComponents/purchase-orders.php';
        getPurchaseOrders();
    }
    elseif ($route === '/purchase-orders' && $method === 'POST') {
        require_once __DIR__ . '/itemComponents/purchase-orders.php';
        createPurchaseOrder();
    }
    elseif ($route === '/purchase-orders/suppliers' && $method === 'GET') {
        require_once __DIR__ . '/itemComponents/purchase-orders.php';
        getSuppliersList();
    }
    elseif ($route === '/purchase-orders/items-by-supplier' && $method === 'GET') {
        require_once __DIR__ . '/itemComponents/purchase-orders.php';
        getItemsBySupplier();
    }
    elseif ($route === '/purchase-orders/generate-prefix' && $method === 'GET') {
        require_once __DIR__ . '/itemComponents/purchase-orders.php';
        generatePOPrefix();
    }
    elseif ($route === '/purchase-orders/suggest-number' && $method === 'GET') {
        require_once __DIR__ . '/itemComponents/purchase-orders.php';
        suggestNextPONumber();
    }
    // Strict formatted check (preferred)
    elseif (preg_match('#^/purchase-orders/check/([0-9]{4}-[0-9]{3})$#', $route, $matches)) {
        require_once __DIR__ . '/itemComponents/purchase-orders.php';
        if ($method === 'GET') {
            checkPONumberExists($matches[1]);
        }
    }
    // Fallback: permissive check route - if invalid format passed, forward to handler to produce a 400 with validation message
    elseif (preg_match('#^/purchase-orders/check/(.+)$#', $route, $matches)) {
        require_once __DIR__ . '/itemComponents/purchase-orders.php';
        if ($method === 'GET') {
            checkPONumberExists($matches[1]);
        }
    }
    elseif (preg_match('#^/purchase-orders/([A-Z0-9\-]+)$#', $route, $matches)) {
        require_once __DIR__ . '/itemComponents/purchase-orders.php';
        if ($method === 'GET') {
            getPurchaseOrder($matches[1]);
        } elseif ($method === 'PUT') {
            // Allow updating (replace-edit) purchase orders via PUT
            updatePurchaseOrder($matches[1]);
        } elseif ($method === 'DELETE') {
            deletePurchaseOrder($matches[1]);
        } else {
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Method not allowed']);
        }
    }
    elseif (preg_match('#^/purchase-orders/([A-Z0-9\-]+)/status$#', $route, $matches)) {
        require_once __DIR__ . '/itemComponents/purchase-orders.php';
        if ($method === 'PUT') {
            updatePurchaseOrderStatus($matches[1]);
        } else {
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Method not allowed']);
        }
    }
    // Supplier Management routes
    elseif ($route === '/suppliers' && $method === 'GET') {
        require_once __DIR__ . '/itemComponents/suppliers.php';
        getSuppliers();
    }
    elseif ($route === '/suppliers' && $method === 'POST') {
        require_once __DIR__ . '/itemComponents/suppliers.php';
        createSupplier();
    }
    elseif (preg_match('#^/suppliers/(\d+)$#', $route, $matches)) {
        if ($method === 'GET') {
            require_once __DIR__ . '/itemComponents/suppliers.php';
            getSupplier($matches[1]);
        } elseif ($method === 'PUT') {
            require_once __DIR__ . '/itemComponents/suppliers.php';
            updateSupplier($matches[1]);
        } elseif ($method === 'DELETE') {
            require_once __DIR__ . '/itemComponents/suppliers.php';
            deleteSupplier($matches[1]);
        }
    }
    elseif (preg_match('#^/suppliers/(\d+)/metrics$#', $route, $matches) && $method === 'GET') {
        require_once __DIR__ . '/itemComponents/suppliers.php';
        getSupplierMetrics($matches[1]);
    }
    // Bulk routes
    elseif ($route === '/bulk' && $method === 'POST') {
        require_once __DIR__ . '/itemComponents/bulk.php';
        handleBulkCreate();
    }
    // Report routes
    elseif ($route === '/reports/dashboard/stats') {
        require_once __DIR__ . '/itemComponents/reports.php';
        handleDashboardStats();
    }
    elseif ($route === '/reports/inventory-summary') {
        require_once __DIR__ . '/itemComponents/reports.php';
        handleInventorySummary();
    }
    // Export routes
    elseif ($route === '/export/csv') {
        require_once __DIR__ . 'itemComponents/export.php';
        handleExportCSV();
    }
    elseif (preg_match('#^/export/supplier-report/(.+)$#', $route, $matches)) {
        require_once __DIR__ . '/itemComponents/export.php';
        handleSupplierReport(urldecode($matches[1]));
    }
    // Checkout routes
    elseif ($route === '/checkout' && $method === 'POST') {
        require_once __DIR__ . '/itemComponents/checkout.php';
        handleCheckout();
    }
    // Filter options
    elseif ($route === '/filters/options') {
        require_once __DIR__ . '/itemComponents/items.php';
        handleFilterOptions();
    }
    // Supplier items
    elseif (preg_match('#^/supplier/(.+)$#', $route, $matches)) {
        require_once __DIR__ . '/itemComponents/items.php';
        handleItemsBySupplier(urldecode($matches[1]));
    }
    // Basic CRUD routes
    elseif ($route === '' || $route === '/') {
        require_once __DIR__ . '/itemComponents/items.php';
        if ($method === 'GET') {
            handleGetItems();
        } elseif ($method === 'POST') {
            handleCreateItem();
        }
    }
    // Item images routes
    elseif (preg_match('#^/images/(\d+)$#', $route, $matches)) {
        require_once __DIR__ . '/itemComponents/images.php';
        $itemId = $matches[1];
        if ($method === 'GET') {
            handleItemImageList($itemId);
        } elseif ($method === 'POST') {
            // Upload (append)
            handleItemImageUpload($itemId, false);
        } else {
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Method not allowed']);
        }
    }
    elseif (preg_match('#^/images/(\d+)/replace$#', $route, $matches)) {
        require_once __DIR__ . '/itemComponents/images.php';
        $itemId = $matches[1];
        if ($method === 'POST') {
            handleItemImageUpload($itemId, true);
        } else {
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Method not allowed']);
        }
    }
    elseif (preg_match('#^/images/(\d+)/file/(.+)$#', $route, $matches)) {
        require_once __DIR__ . '/itemComponents/images.php';
        $itemId = $matches[1];
        $filename = urldecode($matches[2]);
        if ($method === 'GET') {
            handleItemImageServe($itemId, $filename);
        } elseif ($method === 'DELETE') {
            handleItemImageDelete($itemId, $filename);
        } else {
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Method not allowed']);
        }
    }
    elseif (preg_match('#^/images/(\d+)/latest$#', $route, $matches)) {
        require_once __DIR__ . '/itemComponents/images.php';
        $itemId = $matches[1];
        if ($method === 'GET') {
            handleItemImageLatest($itemId);
        } else {
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Method not allowed']);
        }
    }    
    elseif (preg_match('#^/(\d+)$#', $route, $matches)) {
        require_once __DIR__ . '/itemComponents/items.php';
        $itemId = $matches[1];
        
        if ($method === 'GET') {
            handleGetItem($itemId);
        } elseif ($method === 'PUT') {
            handleUpdateItem($itemId);
        } elseif ($method === 'DELETE') {
            handleDeleteItem($itemId);
        }
    }
    else {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'error' => 'Route not found'
        ]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Server error',
        'message' => $e->getMessage()
    ]);
}