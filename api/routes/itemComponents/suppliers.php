<?php
// itemComponents/suppliers.php - Dedicated supplier management endpoints

/**
 * Get all suppliers with their details
 * GET /api/items/suppliers
 */
function getSuppliers() {
    try {
        $db = getConnection();
        
        // Get query parameters
        $limit = isset($_GET['limit']) ? min(max(1, (int)$_GET['limit']), 500) : 50;
        $offset = isset($_GET['offset']) ? max(0, (int)$_GET['offset']) : 0;
        $search = isset($_GET['search']) ? trim($_GET['search']) : '';
        $active_only = isset($_GET['active_only']) ? filter_var($_GET['active_only'], FILTER_VALIDATE_BOOLEAN) : false;

        // Build WHERE clause
        $whereClause = "WHERE 1=1";
        $params = [];
        
        if (!empty($search)) {
            $whereClause .= " AND (name LIKE ? OR contact_person LIKE ? OR email LIKE ?)";
            $searchParam = "%{$search}%";
            $params[] = $searchParam;
            $params[] = $searchParam;
            $params[] = $searchParam;
        }
        
        if ($active_only) {
            $whereClause .= " AND status = 'active'";
        }

        // Get total count
        $countQuery = "SELECT COUNT(*) as total FROM suppliers {$whereClause}";
        $stmt = $db->prepare($countQuery);
        $stmt->execute($params);
        $totalResult = $stmt->fetch(PDO::FETCH_ASSOC);
        $total = (int)$totalResult['total'];

        // Get suppliers with item counts
        $query = "
            SELECT 
                s.*,
                COALESCE(item_counts.item_count, 0) as item_count,
                COALESCE(item_counts.total_value, 0) as total_inventory_value
            FROM suppliers s
            LEFT JOIN (
                SELECT 
                    supplier,
                    COUNT(*) as item_count,
                    SUM(COALESCE(price_per_unit * balance, 0)) as total_value
                FROM itemsdb 
                WHERE supplier IS NOT NULL AND supplier != ''
                GROUP BY supplier
            ) item_counts ON s.name = item_counts.supplier
            {$whereClause}
            ORDER BY s.name ASC
            LIMIT ? OFFSET ?
        ";
        
        $stmt = $db->prepare($query);
        $stmt->execute([...$params, $limit, $offset]);
        $suppliers = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Format response
        foreach ($suppliers as &$supplier) {
            $supplier['item_count'] = (int)$supplier['item_count'];
            $supplier['total_inventory_value'] = (float)$supplier['total_inventory_value'];
            $supplier['created_at'] = $supplier['created_at'];
            $supplier['updated_at'] = $supplier['updated_at'];
        }

        sendSuccessResponse([
            'suppliers' => $suppliers,
            'pagination' => [
                'total' => $total,
                'limit' => $limit,
                'offset' => $offset,
                'has_more' => ($offset + $limit) < $total
            ]
        ]);
        
    } catch (Exception $e) {
        error_log("Error fetching suppliers: " . $e->getMessage());
        sendErrorResponse('Failed to fetch suppliers', 500);
    }
}

// Safe helper: check if a table has a column in the current database
function tableHasColumn($db, $table, $column) {
    try {
        $stmt = $db->prepare("SELECT COUNT(*) as cnt FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?");
        $stmt->execute([$table, $column]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return ((int)$row['cnt']) > 0;
    } catch (Exception $e) {
        // If information_schema isn't accessible, fail safe
        return false;
    }
}

/**
 * Get a specific supplier by ID
 * GET /api/items/suppliers/:id
 */
function getSupplier($id) {
    try {
        $db = getConnection();
        
        // Get supplier with item statistics
        $stmt = $db->prepare("
            SELECT 
                s.*,
                COALESCE(item_stats.item_count, 0) as item_count,
                COALESCE(item_stats.total_value, 0) as total_inventory_value,
                COALESCE(item_stats.out_of_stock_count, 0) as out_of_stock_count,
                COALESCE(item_stats.low_stock_count, 0) as low_stock_count
            FROM suppliers s
            LEFT JOIN (
                SELECT 
                    supplier,
                    COUNT(*) as item_count,
                    SUM(COALESCE(price_per_unit * balance, 0)) as total_value,
                    SUM(CASE WHEN item_status = 'Out of Stock' THEN 1 ELSE 0 END) as out_of_stock_count,
                    SUM(CASE WHEN item_status = 'Low in Stock' THEN 1 ELSE 0 END) as low_stock_count
                FROM itemsdb 
                WHERE supplier IS NOT NULL AND supplier != ''
                GROUP BY supplier
            ) item_stats ON s.name = item_stats.supplier
            WHERE s.id = ?
        ");
        $stmt->execute([$id]);
        $supplier = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$supplier) {
            sendErrorResponse('Supplier not found', 404);
            return;
        }

        // Format numeric fields
        $supplier['item_count'] = (int)$supplier['item_count'];
        $supplier['total_inventory_value'] = (float)$supplier['total_inventory_value'];
        $supplier['out_of_stock_count'] = (int)$supplier['out_of_stock_count'];
        $supplier['low_stock_count'] = (int)$supplier['low_stock_count'];

        sendSuccessResponse($supplier);
        
    } catch (Exception $e) {
        error_log("Error fetching supplier {$id}: " . $e->getMessage());
        sendErrorResponse('Failed to fetch supplier', 500);
    }
}

/**
 * Create a new supplier
 * POST /api/items/suppliers
 */
function createSupplier() {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        // Validate required fields
        $required_fields = ['name', 'contact_person', 'email', 'phone'];
        foreach ($required_fields as $field) {
            if (empty($input[$field])) {
                sendErrorResponse("Missing required field: {$field}", 400);
                return;
            }
        }

        // Validate email format
        if (!filter_var($input['email'], FILTER_VALIDATE_EMAIL)) {
            sendErrorResponse('Invalid email format', 400);
            return;
        }

        $db = getConnection();
        
        // Check if supplier name already exists
        $stmt = $db->prepare("SELECT id FROM suppliers WHERE name = ?");
        $stmt->execute([$input['name']]);
        if ($stmt->fetch()) {
            sendErrorResponse('Supplier with this name already exists', 409);
            return;
        }

        // Check if email already exists
        $stmt = $db->prepare("SELECT id FROM suppliers WHERE email = ?");
        $stmt->execute([$input['email']]);
        if ($stmt->fetch()) {
            sendErrorResponse('Supplier with this email already exists', 409);
            return;
        }

        // Create supplier
        $stmt = $db->prepare("
            INSERT INTO suppliers (
                name, contact_person, email, phone, address, city, 
                country, postal_code, website, tax_id, payment_terms, 
                notes, status, created_at, updated_at
            ) VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW(), NOW()
            )
        ");
        
        $result = $stmt->execute([
            $input['name'],
            $input['contact_person'],
            $input['email'],
            $input['phone'],
            $input['address'] ?? '',
            $input['city'] ?? '',
            $input['country'] ?? 'Philippines',
            $input['postal_code'] ?? '',
            $input['website'] ?? '',
            $input['tax_id'] ?? '',
            $input['payment_terms'] ?? 'Net 30',
            $input['notes'] ?? ''
        ]);

        if (!$result) {
            sendErrorResponse('Failed to create supplier', 500);
            return;
        }

        $supplierId = $db->lastInsertId();
        
        // If the DB has supplier_snapshot column and client provided one, update it now (non-fatal)
        if (isset($input['supplier_snapshot'])) {
            try {
                if (tableHasColumn($db, 'suppliers', 'supplier_snapshot')) {
                    $snapshotValue = is_array($input['supplier_snapshot']) ? json_encode($input['supplier_snapshot']) : $input['supplier_snapshot'];
                    $stmt = $db->prepare("UPDATE suppliers SET supplier_snapshot = ? WHERE id = ?");
                    $stmt->execute([$snapshotValue, $supplierId]);
                }
            } catch (Exception $e) {
                // Log but don't fail creation
                error_log("Warning: failed to save supplier_snapshot for supplier {$supplierId}: " . $e->getMessage());
            }
        }

        // Return the created supplier
        getSupplier($supplierId);
        
    } catch (Exception $e) {
        error_log("Error creating supplier: " . $e->getMessage());
        sendErrorResponse('Failed to create supplier', 500);
    }
}

/**
 * Update an existing supplier
 * PUT /api/items/suppliers/:id
 */
function updateSupplier($id) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $db = getConnection();
        
        // Check if supplier exists
        $stmt = $db->prepare("SELECT id, name FROM suppliers WHERE id = ?");
        $stmt->execute([$id]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$existing) {
            sendErrorResponse('Supplier not found', 404);
            return;
        }

        // Check for name conflicts (exclude current supplier)
        if (!empty($input['name']) && $input['name'] !== $existing['name']) {
            $stmt = $db->prepare("SELECT id FROM suppliers WHERE name = ? AND id != ?");
            $stmt->execute([$input['name'], $id]);
            if ($stmt->fetch()) {
                sendErrorResponse('Supplier with this name already exists', 409);
                return;
            }
        }

        // Check for email conflicts (exclude current supplier)
        if (!empty($input['email'])) {
            if (!filter_var($input['email'], FILTER_VALIDATE_EMAIL)) {
                sendErrorResponse('Invalid email format', 400);
                return;
            }
            
            $stmt = $db->prepare("SELECT id FROM suppliers WHERE email = ? AND id != ?");
            $stmt->execute([$input['email'], $id]);
            if ($stmt->fetch()) {
                sendErrorResponse('Supplier with this email already exists', 409);
                return;
            }
        }

        // Build update query dynamically
        $updateFields = [];
        $params = [];
        
        $allowedFields = [
            'name', 'contact_person', 'email', 'phone', 'address', 'city',
            'country', 'postal_code', 'website', 'tax_id', 'payment_terms', 
            'notes', 'status'
        ];

        // If DB has supplier_snapshot column, allow updating it when provided
        try {
            if (tableHasColumn($db, 'suppliers', 'supplier_snapshot')) {
                $allowedFields[] = 'supplier_snapshot';
            }
        } catch (Exception $e) {
            // ignore and continue without snapshot support
        }
        
        foreach ($allowedFields as $field) {
            if (array_key_exists($field, $input)) {
                // If updating supplier_snapshot and it's an array/object, encode to JSON
                if ($field === 'supplier_snapshot' && is_array($input[$field])) {
                    $updateFields[] = "{$field} = ?";
                    $params[] = json_encode($input[$field]);
                } else {
                    $updateFields[] = "{$field} = ?";
                    $params[] = $input[$field];
                }
            }
        }
        
        if (empty($updateFields)) {
            sendErrorResponse('No valid fields to update', 400);
            return;
        }
        
        $updateFields[] = "updated_at = NOW()";
        $params[] = $id;
        
        $query = "UPDATE suppliers SET " . implode(', ', $updateFields) . " WHERE id = ?";
        $stmt = $db->prepare($query);
        $result = $stmt->execute($params);
        
        if (!$result) {
            sendErrorResponse('Failed to update supplier', 500);
            return;
        }

        // If supplier name changed, update all related items
        if (!empty($input['name']) && $input['name'] !== $existing['name']) {
            $stmt = $db->prepare("UPDATE itemsdb SET supplier = ? WHERE supplier = ?");
            $stmt->execute([$input['name'], $existing['name']]);
        }
        
        // Return updated supplier
        getSupplier($id);
        
    } catch (Exception $e) {
        error_log("Error updating supplier {$id}: " . $e->getMessage());
        sendErrorResponse('Failed to update supplier', 500);
    }
}

/**
 * Delete a supplier
 * DELETE /api/items/suppliers/:id
 */
function deleteSupplier($id) {
    try {
        $db = getConnection();
        
        // Check if supplier exists and get name
        $stmt = $db->prepare("SELECT name FROM suppliers WHERE id = ?");
        $stmt->execute([$id]);
        $supplier = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$supplier) {
            sendErrorResponse('Supplier not found', 404);
            return;
        }

        // Check if supplier has associated items
        $stmt = $db->prepare("SELECT COUNT(*) as item_count FROM itemsdb WHERE supplier = ?");
        $stmt->execute([$supplier['name']]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($result['item_count'] > 0) {
            sendErrorResponse(
                "Cannot delete supplier. {$result['item_count']} items are associated with this supplier. Please reassign items to another supplier first.", 
                409
            );
            return;
        }

        // Delete supplier
        $stmt = $db->prepare("DELETE FROM suppliers WHERE id = ?");
        $result = $stmt->execute([$id]);
        
        if (!$result) {
            sendErrorResponse('Failed to delete supplier', 500);
            return;
        }
        
        sendSuccessResponse([
            'message' => 'Supplier deleted successfully',
            'deleted_supplier_id' => $id
        ]);
        
    } catch (Exception $e) {
        error_log("Error deleting supplier {$id}: " . $e->getMessage());
        sendErrorResponse('Failed to delete supplier', 500);
    }
}

/**
 * Get supplier performance metrics
 * GET /api/items/suppliers/:id/metrics
 */
function getSupplierMetrics($id) {
    try {
        $db = getConnection();
        
        // Get supplier name
        $stmt = $db->prepare("SELECT name FROM suppliers WHERE id = ?");
        $stmt->execute([$id]);
        $supplier = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$supplier) {
            sendErrorResponse('Supplier not found', 404);
            return;
        }

        // Get comprehensive metrics
        $stmt = $db->prepare("
            SELECT 
                COUNT(*) as total_items,
                SUM(CASE WHEN item_status = 'In Stock' THEN 1 ELSE 0 END) as in_stock_count,
                SUM(CASE WHEN item_status = 'Low in Stock' THEN 1 ELSE 0 END) as low_stock_count,
                SUM(CASE WHEN item_status = 'Out of Stock' THEN 1 ELSE 0 END) as out_of_stock_count,
                AVG(CASE WHEN balance > 0 THEN balance ELSE NULL END) as avg_stock_level,
                SUM(COALESCE(price_per_unit * balance, 0)) as total_inventory_value,
                COUNT(CASE WHEN last_po IS NOT NULL THEN 1 END) as items_with_recent_orders
            FROM itemsdb 
            WHERE supplier = ?
        ");
        $stmt->execute([$supplier['name']]);
        $metrics = $stmt->fetch(PDO::FETCH_ASSOC);

        // Get recent purchase orders for this supplier
        $stmt = $db->prepare("
            SELECT COUNT(*) as recent_po_count, AVG(total_value) as avg_po_value
            FROM purchase_orders 
            WHERE supplier = ? AND order_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        ");
        $stmt->execute([$supplier['name']]);
        $poMetrics = $stmt->fetch(PDO::FETCH_ASSOC);

        // Combine metrics
        $response = [
            'supplier_id' => $id,
            'supplier_name' => $supplier['name'],
            'inventory_metrics' => [
                'total_items' => (int)$metrics['total_items'],
                'in_stock_count' => (int)$metrics['in_stock_count'],
                'low_stock_count' => (int)$metrics['low_stock_count'],
                'out_of_stock_count' => (int)$metrics['out_of_stock_count'],
                'avg_stock_level' => (float)$metrics['avg_stock_level'],
                'total_inventory_value' => (float)$metrics['total_inventory_value'],
                'stock_availability_rate' => $metrics['total_items'] > 0 
                    ? round(($metrics['in_stock_count'] / $metrics['total_items']) * 100, 2) 
                    : 0
            ],
            'purchase_order_metrics' => [
                'recent_po_count' => (int)$poMetrics['recent_po_count'],
                'avg_po_value' => (float)$poMetrics['avg_po_value'],
                'items_with_recent_orders' => (int)$metrics['items_with_recent_orders']
            ]
        ];

        sendSuccessResponse($response);
        
    } catch (Exception $e) {
        error_log("Error fetching supplier metrics for {$id}: " . $e->getMessage());
        sendErrorResponse('Failed to fetch supplier metrics', 500);
    }
}