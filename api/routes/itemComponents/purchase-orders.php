<?php
// itemComponents/purchase-orders.php

function getPurchaseOrders() {
    try {
        $db = getConnection();
        
        // Get query parameters
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
        $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
        $status = isset($_GET['status']) ? $_GET['status'] : '';
        $supplier = isset($_GET['supplier']) ? $_GET['supplier'] : '';
        $sort_by = isset($_GET['sort_by']) ? $_GET['sort_by'] : 'order_date';
        $sort_order = isset($_GET['sort_order']) ? $_GET['sort_order'] : 'DESC';
        
        // Validate sort parameters
        $validSortColumns = [
            'id', 'supplier', 'status', 'order_date', 'expected_delivery_date',
            'actual_delivery_date', 'total_value', 'priority', 'last_updated'
        ];
        $validSortOrders = ['ASC', 'DESC'];
        
        $sortColumn = in_array($sort_by, $validSortColumns) ? $sort_by : 'order_date';
        $sortOrder = in_array(strtoupper($sort_order), $validSortOrders) ? strtoupper($sort_order) : 'DESC';
        
        $parsedLimit = min(max(1, $limit), 500);
        $parsedOffset = max(0, $offset);
        
        // Build WHERE clause for filtering
        $whereClause = "WHERE 1=1";
        $params = [];
        
        if (!empty($status)) {
            $whereClause .= " AND status = ?";
            $params[] = $status;
        }
        
        if (!empty($supplier)) {
            $whereClause .= " AND supplier LIKE ?";
            $params[] = "%{$supplier}%";
        }
        
        // Get total count
        $countQuery = "SELECT COUNT(*) as total FROM purchase_orders {$whereClause}";
        $stmt = $db->prepare($countQuery);
        $stmt->execute($params);
        $totalResult = $stmt->fetch(PDO::FETCH_ASSOC);
        $total = $totalResult['total'];
        
        // Get purchase orders
        $query = "SELECT * FROM purchase_orders {$whereClause} ORDER BY {$sortColumn} {$sortOrder} LIMIT ? OFFSET ?";
        $params[] = $parsedLimit;
        $params[] = $parsedOffset;
        
        $stmt = $db->prepare($query);
        $stmt->execute($params);
        $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Get items for each order
        foreach ($orders as &$order) {
            $itemsStmt = $db->prepare("SELECT * FROM purchase_order_items WHERE purchase_order_id = ? ORDER BY item_no");
            $itemsStmt->execute([$order['id']]);
            $order['items'] = $itemsStmt->fetchAll(PDO::FETCH_ASSOC);
        }
        
        sendSuccessResponse([
            'orders' => $orders,
            'pagination' => [
                'total' => $total,
                'limit' => $parsedLimit,
                'offset' => $parsedOffset,
                'hasMore' => $parsedOffset + $parsedLimit < $total
            ]
        ]);
        
    } catch (Exception $e) {
        error_log("Error fetching purchase orders: " . $e->getMessage());
        sendErrorResponse('Failed to fetch purchase orders', 500, ['message' => $e->getMessage()]);
    }
}

function getPurchaseOrder($id) {
    try {
        $db = getConnection();
        
        $stmt = $db->prepare("SELECT * FROM purchase_orders WHERE id = ?");
        $stmt->execute([$id]);
        $order = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$order) {
            sendErrorResponse('Purchase order not found', 404);
            return;
        }
        
        // Get items for the order
        $itemsStmt = $db->prepare("SELECT * FROM purchase_order_items WHERE purchase_order_id = ? ORDER BY item_no");
        $itemsStmt->execute([$id]);
        $order['items'] = $itemsStmt->fetchAll(PDO::FETCH_ASSOC);
        
        sendSuccessResponse($order);
        
    } catch (Exception $e) {
        error_log("Error fetching purchase order: " . $e->getMessage());
        sendErrorResponse('Failed to fetch purchase order', 500, ['message' => $e->getMessage()]);
    }
}

function createPurchaseOrder() {
    try {
        $db = getConnection();
        $input = getJsonInput();
        
        // Extract new fields for updated PO format
        $po_number = $input['po_number'] ?? null;
        $supplier_name = $input['supplier_name'] ?? null;
        $supplier_address = $input['supplier_address'] ?? null;
        $attention_person = $input['attention_person'] ?? null;
        $terms = $input['terms'] ?? null;
        $po_date = $input['po_date'] ?? date('Y-m-d');
        $items = $input['items'] ?? null;
        $notes = $input['notes'] ?? null;
    // Support new priority codes P0..P4 and legacy strings (low, normal, high, urgent)
    $priority = $input['priority'] ?? 'P2';
        $prepared_by = $input['prepared_by'] ?? null;
        $verified_by = $input['verified_by'] ?? null;
        $approved_by = $input['approved_by'] ?? null;
        $overwrite_existing = $input['overwrite_existing'] ?? false;
        
        // Validate required fields
        if (empty($po_number)) {
            sendErrorResponse('PO number is required', 400);
            return;
        }
        
        // Validate PO number format (MMYY-XXX)
        if (!preg_match('/^[0-1][0-9][0-9]{2}-[0-9]{3}$/', $po_number)) {
            sendErrorResponse('Invalid PO number format. Expected format: MMYY-XXX (e.g., 0725-015)', 400);
            return;
        }
        
        if (empty($supplier_name)) {
            sendErrorResponse('Supplier name is required', 400);
            return;
        }
        
        if (empty($items) || !is_array($items) || count($items) === 0) {
            sendErrorResponse('Items array is required and cannot be empty', 400);
            return;
        }
        
        // Validate priority
        $validPriorities = ['P0','P1','P2','P3','P4','low', 'normal', 'high', 'urgent'];
        if (!empty($priority) && !in_array($priority, $validPriorities)) {
            sendErrorResponse('Invalid priority. Must be one of: P0,P1,P2,P3,P4 (or legacy: low, normal, high, urgent)', 400);
            return;
        }
        
        // Check if PO number already exists
        $checkStmt = $db->prepare("SELECT id, supplier_name, status, is_overwritten FROM purchase_orders WHERE id = ?");
        $checkStmt->execute([$po_number]);
        $existingPO = $checkStmt->fetch(PDO::FETCH_ASSOC);
        
        if ($existingPO && !$overwrite_existing) {
            sendErrorResponse(
                "PO# {$po_number} already exists for {$existingPO['supplier_name']}. Set 'overwrite_existing' to true to replace it.", 
                409, 
                ['existing_po' => $existingPO]
            );
            return;
        }
        
        // Validate items structure and supplier consistency
        foreach ($items as $index => $item) {
            if (!isset($item['item_no']) || empty($item['item_no'])) {
                sendErrorResponse("Item at index {$index}: item_no is required", 400);
                return;
            }
            
            if (!isset($item['quantity']) || !is_numeric($item['quantity']) || $item['quantity'] <= 0) {
                sendErrorResponse("Item at index {$index}: valid positive quantity is required", 400);
                return;
            }
            
            // Validate unit field (new requirement)
            if (empty($item['unit'])) {
                $items[$index]['unit'] = 'pcs'; // Default to pcs
            }
            
            // Accept both unit_price and price_per_unit field names
            $unitPrice = $item['unit_price'] ?? $item['price_per_unit'] ?? null;
            if (!isset($unitPrice) || !is_numeric($unitPrice) || $unitPrice < 0) {
                sendErrorResponse("Item at index {$index}: valid unit price is required", 400);
                return;
            }
            
            // Normalize to unit_price for consistency
            $items[$index]['unit_price'] = $unitPrice;
            
            // Calculate amount
            $items[$index]['amount'] = $item['quantity'] * $unitPrice;
            
            // Check if item exists in inventory
            $checkItemStmt = $db->prepare("SELECT item_no, item_name, supplier FROM itemsdb WHERE item_no = ?");
            $checkItemStmt->execute([$item['item_no']]);
            $inventoryItem = $checkItemStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$inventoryItem) {
                sendErrorResponse("Item {$item['item_no']} does not exist in inventory", 400);
                return;
            }
            
            // Verify item supplier matches PO supplier
            if (!empty($inventoryItem['supplier']) && $inventoryItem['supplier'] !== $supplier_name) {
                sendErrorResponse(
                    "Item {$item['item_no']} belongs to supplier '{$inventoryItem['supplier']}' but PO is for '{$supplier_name}'. All items must be from the same supplier.",
                    400
                );
                return;
            }
            
            // Auto-fill item_name if not provided
            if (empty($item['item_name'])) {
                $items[$index]['item_name'] = $inventoryItem['item_name'];
            }
        }
        
        // Calculate totals
        $totalItems = count($items);
        $totalQuantity = 0;
        $totalValue = 0;
        
        foreach ($items as $item) {
            $totalQuantity += $item['quantity'];
            $totalValue += $item['amount'];
        }
        
        // Begin transaction
        $db->beginTransaction();
        
        try {
            // If overwriting, backup the old PO and mark it as overwritten
            if ($existingPO && $overwrite_existing) {
                // Get full existing PO with items for backup
                $backupStmt = $db->prepare("SELECT * FROM purchase_orders WHERE id = ?");
                $backupStmt->execute([$po_number]);
                $oldPO = $backupStmt->fetch(PDO::FETCH_ASSOC);
                
                $backupItemsStmt = $db->prepare("SELECT * FROM purchase_order_items WHERE purchase_order_id = ?");
                $backupItemsStmt->execute([$po_number]);
                $oldPO['items'] = $backupItemsStmt->fetchAll(PDO::FETCH_ASSOC);
                
                $backupJson = json_encode($oldPO);
                
                // Delete old items
                $deleteItemsStmt = $db->prepare("DELETE FROM purchase_order_items WHERE purchase_order_id = ?");
                $deleteItemsStmt->execute([$po_number]);
                
                // Delete old PO
                $deletePOStmt = $db->prepare("DELETE FROM purchase_orders WHERE id = ?");
                $deletePOStmt->execute([$po_number]);
            }
            
            // Insert new purchase order with updated schema
            $insertPOStmt = $db->prepare("
                INSERT INTO purchase_orders (
                    id, supplier, supplier_name, supplier_address, attention_person, 
                    status, order_date, po_date, expected_delivery_date, 
                    total_items, total_quantity, total_value, 
                    notes, terms, priority, 
                    prepared_by, verified_by, approved_by,
                    is_overwritten, overwrite_timestamp, previous_version
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            $insertPOStmt->execute([
                $po_number,
                $supplier_name, // Keep for backward compatibility
                $supplier_name,
                $supplier_address,
                $attention_person,
                'requested',
                date('Y-m-d'),
                $po_date,
                $input['expected_delivery_date'] ?? null,
                $totalItems,
                $totalQuantity,
                $totalValue,
                $notes,
                $terms,
                $priority,
                $prepared_by,
                $verified_by,
                $approved_by,
                $overwrite_existing ? 1 : 0,
                $overwrite_existing ? date('Y-m-d H:i:s') : null,
                $overwrite_existing && isset($backupJson) ? $backupJson : null
            ]);
            
            // Insert order items
            $itemStmt = $db->prepare("
                INSERT INTO purchase_order_items (
                    purchase_order_id, item_no, item_name, 
                    quantity, unit, unit_price, amount, 
                    status, custom_quantity, recommended_quantity, 
                    supplier_specific, delivery_method
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            foreach ($items as $item) {
                $itemStmt->execute([
                    $po_number,
                    $item['item_no'],
                    $item['item_name'],
                    $item['quantity'],
                    $item['unit'],
                    $item['unit_price'],
                    $item['amount'],
                    'ordered',
                    $item['quantity'],
                    $item['recommended_quantity'] ?? $item['quantity'],
                    $supplier_name,
                    $item['delivery_method'] ?? 'delivery'
                ]);
            }
            
            $db->commit();
            
            // Get the created order with items
            $orderStmt = $db->prepare("SELECT * FROM purchase_orders WHERE id = ?");
            $orderStmt->execute([$po_number]);
            $createdOrder = $orderStmt->fetch(PDO::FETCH_ASSOC);
            
            $itemsStmt = $db->prepare("SELECT * FROM purchase_order_items WHERE purchase_order_id = ? ORDER BY item_no");
            $itemsStmt->execute([$po_number]);
            $createdOrder['items'] = $itemsStmt->fetchAll(PDO::FETCH_ASSOC);
            
            $message = $overwrite_existing ? 'Purchase order overwritten successfully' : 'Purchase order created successfully';
            sendSuccessResponse($createdOrder, $message, 201);
            
        } catch (Exception $e) {
            $db->rollBack();
            error_log("Purchase order creation failed - Inner exception: " . $e->getMessage());
            error_log("Stack trace: " . $e->getTraceAsString());
            throw $e;
        }
        
    } catch (Exception $e) {
        error_log("Error creating purchase order: " . $e->getMessage());
        error_log("Full exception: " . print_r($e, true));
        
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Failed to create purchase order',
            'message' => $e->getMessage(),
            'details' => $e->getTraceAsString()
        ]);
        exit;
    }
}

function updatePurchaseOrder($id)
{
    header('Content-Type: application/json');

    try {
        $db = getConnection();
        $input = getJsonInput();

        // Use the route id as the authoritative PO id
        $poId = $id;

        // Basic required validation
        $supplier_name = isset($input['supplier_name']) ? trim($input['supplier_name']) : null;
        $items = isset($input['items']) ? $input['items'] : null;
    // Support P0..P4 codes and legacy values
    $priority = isset($input['priority']) ? $input['priority'] : 'P2';

        if (empty($supplier_name)) {
            sendErrorResponse('Supplier name is required', 400);
            return;
        }

        if (empty($items) || !is_array($items) || count($items) === 0) {
            sendErrorResponse('Items array is required and cannot be empty', 400);
            return;
        }

        $validPriorities = ['P0','P1','P2','P3','P4','low', 'normal', 'high', 'urgent'];
        if (!empty($priority) && !in_array($priority, $validPriorities)) {
            sendErrorResponse('Invalid priority. Must be one of: P0,P1,P2,P3,P4 (or legacy: low, normal, high, urgent)', 400);
            return;
        }

        // Begin transaction and lock the PO row to avoid races
        $db->beginTransaction();

        $lockStmt = $db->prepare("SELECT * FROM purchase_orders WHERE id = ? FOR UPDATE");
        $lockStmt->execute([$poId]);
        $existingPO = $lockStmt->fetch(PDO::FETCH_ASSOC);

        if (!$existingPO) {
            $db->rollBack();
            sendErrorResponse('Purchase order not found', 404);
            return;
        }

        if (isset($existingPO['status']) && strtolower($existingPO['status']) === 'received') {
            $db->rollBack();
            sendErrorResponse('Purchase order has already been received and cannot be edited', 409);
            return;
        }

        // Validate each item and normalize fields similar to createPurchaseOrder
        $totalItems = count($items);
        $totalQuantity = 0;
        $totalValue = 0;

        foreach ($items as $index => $item) {
            if (!isset($item['item_no']) || empty($item['item_no'])) {
                $db->rollBack();
                sendErrorResponse("Item at index {$index}: item_no is required", 400);
                return;
            }

            if (!isset($item['quantity']) || !is_numeric($item['quantity']) || $item['quantity'] <= 0) {
                $db->rollBack();
                sendErrorResponse("Item at index {$index}: valid positive quantity is required", 400);
                return;
            }

            if (empty($item['unit'])) {
                $items[$index]['unit'] = 'pcs';
            }

            $unitPrice = $item['unit_price'] ?? $item['price_per_unit'] ?? null;
            if (!isset($unitPrice) || !is_numeric($unitPrice) || $unitPrice < 0) {
                $db->rollBack();
                sendErrorResponse("Item at index {$index}: valid unit price is required", 400);
                return;
            }

            $items[$index]['unit_price'] = $unitPrice;
            $items[$index]['amount'] = $item['quantity'] * $unitPrice;

            // Check if item exists in inventory and supplier consistency
            $checkItemStmt = $db->prepare("SELECT item_no, item_name, supplier FROM itemsdb WHERE item_no = ?");
            $checkItemStmt->execute([$item['item_no']]);
            $inventoryItem = $checkItemStmt->fetch(PDO::FETCH_ASSOC);

            if (!$inventoryItem) {
                $db->rollBack();
                sendErrorResponse("Item {$item['item_no']} does not exist in inventory", 400);
                return;
            }

            if (!empty($inventoryItem['supplier']) && $inventoryItem['supplier'] !== $supplier_name) {
                $db->rollBack();
                sendErrorResponse(
                    "Item {$item['item_no']} belongs to supplier '{$inventoryItem['supplier']}' but PO is for '{$supplier_name}'. All items must be from the same supplier.",
                    400
                );
                return;
            }

            if (empty($item['item_name'])) {
                $items[$index]['item_name'] = $inventoryItem['item_name'];
            }

            $totalQuantity += $items[$index]['quantity'];
            $totalValue += $items[$index]['amount'];
        }

    // Backup existing PO (header + items) before replace
    $backupStmt = $db->prepare("SELECT * FROM purchase_orders WHERE id = ?");
    $backupStmt->execute([$poId]);
    $oldPO = $backupStmt->fetch(PDO::FETCH_ASSOC);
    $backupItemsStmt = $db->prepare("SELECT * FROM purchase_order_items WHERE purchase_order_id = ?");
    $backupItemsStmt->execute([$poId]);
    $oldPO['items'] = $backupItemsStmt->fetchAll(PDO::FETCH_ASSOC);
    $backupJson = json_encode($oldPO);

    // Delete existing items for this PO (replace strategy)
    $deleteItemsStmt = $db->prepare("DELETE FROM purchase_order_items WHERE purchase_order_id = ?");
    $deleteItemsStmt->execute([$poId]);

        // Update the purchase_orders header fields (preserve id)
        $now = date('Y-m-d H:i:s');

        $updatePO = $db->prepare("UPDATE purchase_orders SET
            supplier = ?,
            supplier_name = ?,
            supplier_address = ?,
            attention_person = ?,
            expected_delivery_date = ?,
            total_items = ?,
            total_quantity = ?,
            total_value = ?,
            notes = ?,
            terms = ?,
            priority = ?,
            prepared_by = ?,
            verified_by = ?,
            approved_by = ?,
            last_updated = ?,
            previous_version = ?,
            overwrite_timestamp = ?
            WHERE id = ?");

        $updatePO->execute([
            $supplier_name,
            $supplier_name,
            $input['supplier_address'] ?? null,
            $input['attention_person'] ?? null,
            $input['expected_delivery_date'] ?? null,
            $totalItems,
            $totalQuantity,
            $totalValue,
            $input['notes'] ?? null,
            $input['terms'] ?? null,
            $priority,
            $input['prepared_by'] ?? null,
            $input['verified_by'] ?? null,
            $input['approved_by'] ?? null,
            $now,
            $backupJson,
            $now,
            $poId
        ]);

        // Insert new items
        $itemStmt = $db->prepare("INSERT INTO purchase_order_items (
            purchase_order_id, item_no, item_name,
            quantity, unit, unit_price, amount,
            status, custom_quantity, recommended_quantity,
            supplier_specific, delivery_method
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

        foreach ($items as $item) {
            $itemStmt->execute([
                $poId,
                $item['item_no'],
                $item['item_name'],
                $item['quantity'],
                $item['unit'],
                $item['unit_price'],
                $item['amount'],
                'ordered',
                $item['quantity'],
                $item['recommended_quantity'] ?? $item['quantity'],
                $supplier_name,
                $item['delivery_method'] ?? 'delivery'
            ]);
        }

        $db->commit();

        // Return the updated PO with items
        $orderStmt = $db->prepare("SELECT * FROM purchase_orders WHERE id = ?");
        $orderStmt->execute([$poId]);
        $updatedOrder = $orderStmt->fetch(PDO::FETCH_ASSOC);

        $itemsStmt = $db->prepare("SELECT * FROM purchase_order_items WHERE purchase_order_id = ? ORDER BY item_no");
        $itemsStmt->execute([$poId]);
        $updatedOrder['items'] = $itemsStmt->fetchAll(PDO::FETCH_ASSOC);

        sendSuccessResponse($updatedOrder, 'Purchase order updated successfully');

    } catch (Exception $e) {
        if (isset($db) && $db->inTransaction()) {
            $db->rollBack();
        }
        error_log("Error updating purchase order: " . $e->getMessage());
        sendErrorResponse('Failed to update purchase order', 500, ['message' => $e->getMessage()]);
    }
}

function updatePurchaseOrderStatus($id)
{
    header('Content-Type: application/json');

    try {
        $input = getJsonInput();
        $newStatus = isset($input['status']) ? strtolower(trim($input['status'])) : null;

        // Only allow changing status to 'received' via this endpoint for now
        if ($newStatus !== 'received') {
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Only status change to "received" is supported via this endpoint']);
            return;
        }

        $db = getConnection();

        // Begin transaction - we'll update the PO status and inventory atomically
        $db->beginTransaction();

        // Lock the purchase order row
        $stmt = $db->prepare("SELECT * FROM purchase_orders WHERE id = ? FOR UPDATE");
        $stmt->execute([$id]);
        $po = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$po) {
            $db->rollBack();
            sendErrorResponse('Purchase order not found', 404);
            return;
        }

        if (isset($po['status']) && strtolower($po['status']) === 'received') {
            $db->rollBack();
            sendErrorResponse('Purchase order is already marked as received', 409);
            return;
        }

        // Fetch PO items and lock them for update
        $itemsStmt = $db->prepare("SELECT * FROM purchase_order_items WHERE purchase_order_id = ? FOR UPDATE");
        $itemsStmt->execute([$id]);
        $items = $itemsStmt->fetchAll(PDO::FETCH_ASSOC);

        // If no items, treat as error
        if (!$items || count($items) === 0) {
            $db->rollBack();
            sendErrorResponse('Purchase order has no items to receive', 400);
            return;
        }

        $now = date('Y-m-d H:i:s');

        // Process each item: increment itemsdb.in_qty and mark PO item as received
        foreach ($items as $item) {
            $itemNo = $item['item_no'];
            $qty = isset($item['quantity']) ? (int)$item['quantity'] : 0;

            if ($qty <= 0) {
                // skip zero quantities
                continue;
            }

            // Lock inventory row
            $checkStmt = $db->prepare("SELECT item_no, in_qty FROM itemsdb WHERE item_no = ? FOR UPDATE");
            $checkStmt->execute([$itemNo]);
            $inv = $checkStmt->fetch(PDO::FETCH_ASSOC);

            if (!$inv) {
                $db->rollBack();
                sendErrorResponse("Inventory item {$itemNo} not found", 400);
                return;
            }

            $currentIn = isset($inv['in_qty']) ? (int)$inv['in_qty'] : 0;
            $newIn = $currentIn + $qty;

            // Update inventory in_qty and last_po
            $updateInv = $db->prepare("UPDATE itemsdb SET in_qty = ?, last_po = ? WHERE item_no = ?");
            $updateInv->execute([$newIn, $id, $itemNo]);

            // Update purchase order item status to received
            $updatePOItem = $db->prepare("UPDATE purchase_order_items SET status = 'received', delivery_method = COALESCE(delivery_method, 'delivery') WHERE purchase_order_id = ? AND item_no = ?");
            $updatePOItem->execute([$id, $itemNo]);
        }

        // Update purchase order header: set status and actual_delivery_date / last_updated
        $actualDeliveryDate = isset($input['actual_delivery_date']) ? $input['actual_delivery_date'] : date('Y-m-d');
        $updatePO = $db->prepare("UPDATE purchase_orders SET status = 'received', actual_delivery_date = ?, last_updated = ? WHERE id = ?");
        $updatePO->execute([$actualDeliveryDate, $now, $id]);

        $db->commit();

        // Return updated PO with items
        $orderStmt = $db->prepare("SELECT * FROM purchase_orders WHERE id = ?");
        $orderStmt->execute([$id]);
        $updatedOrder = $orderStmt->fetch(PDO::FETCH_ASSOC);

        $itemsStmt = $db->prepare("SELECT * FROM purchase_order_items WHERE purchase_order_id = ? ORDER BY item_no");
        $itemsStmt->execute([$id]);
        $updatedOrder['items'] = $itemsStmt->fetchAll(PDO::FETCH_ASSOC);

        sendSuccessResponse($updatedOrder, 'Purchase order marked as received and inventory updated');

    } catch (Exception $e) {
        if (isset($db) && $db->inTransaction()) {
            $db->rollBack();
        }
        error_log("Error marking purchase order as received: " . $e->getMessage());
        sendErrorResponse('Failed to mark purchase order as received', 500, ['message' => $e->getMessage()]);
    }
}

function deletePurchaseOrder($id) {
    try {
        $db = getConnection();
        
        // Check if order exists
        $stmt = $db->prepare("SELECT * FROM purchase_orders WHERE id = ?");
        $stmt->execute([$id]);
        $order = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$order) {
            sendErrorResponse('Purchase order not found', 404);
            return;
        }
        
            // Begin transaction - allow deletion regardless of status
            $db->beginTransaction();

            try {
                // NOTE: Do NOT revert inventory when deleting a purchase order.
                // Business rule change: stock that was added through a received PO must remain
                // in inventory even if the PO record is deleted. Therefore we only remove
                // the purchase order header and its item rows, and we DO NOT decrement
                // itemsdb.in_qty or clear last_po here.

                // Lightweight audit/logging to indicate deletion of a received PO without inventory rollback
                if (isset($order['status']) && strtolower($order['status']) === 'received') {
                    error_log("Deleting received PO {$id} without reverting inventory (preserving stock). User action requested deletion.");
                }

                // Delete order items first
                $itemsStmt = $db->prepare("DELETE FROM purchase_order_items WHERE purchase_order_id = ?");
                $itemsStmt->execute([$id]);

                // Delete the order
                $orderStmt = $db->prepare("DELETE FROM purchase_orders WHERE id = ?");
                $orderStmt->execute([$id]);

                $db->commit();

                sendSuccessResponse(['id' => $id], 'Purchase order deleted successfully');

            } catch (Exception $e) {
                $db->rollBack();
                throw $e;
            }
        
    } catch (Exception $e) {
        error_log("Error deleting purchase order: " . $e->getMessage());
        sendErrorResponse('Failed to delete purchase order', 500, ['message' => $e->getMessage()]);
    }
}

// ============================================================================
// NEW ENDPOINTS FOR UPDATED PO WORKFLOW
// ============================================================================

/**
 * Check if a PO number already exists
 * GET /api/purchase-orders/check/{po_number}
 */
function checkPONumberExists($poNumber) {
    try {
        $db = getConnection();
        
        // Validate PO number format (MMYY-XXX)
        if (!preg_match('/^[0-1][0-9][0-9]{2}-[0-9]{3}$/', $poNumber)) {
            sendErrorResponse('Invalid PO number format. Expected format: MMYY-XXX (e.g., 0725-015)', 400);
            return;
        }
        
        // Check if PO exists
        $stmt = $db->prepare("SELECT id, supplier_name, status, po_date, total_value, created_at FROM purchase_orders WHERE id = ?");
        $stmt->execute([$poNumber]);
        $existingPO = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($existingPO) {
            sendSuccessResponse([
                'exists' => true,
                'po' => $existingPO,
                'message' => "PO# {$poNumber} already exists for {$existingPO['supplier_name']}"
            ]);
        } else {
            sendSuccessResponse([
                'exists' => false,
                'message' => "PO# {$poNumber} is available"
            ]);
        }
        
    } catch (Exception $e) {
        error_log("Error checking PO number: " . $e->getMessage());
        sendErrorResponse('Failed to check PO number', 500, ['message' => $e->getMessage()]);
    }
}

/**
 * Get items filtered by supplier
 * GET /api/purchase-orders/items-by-supplier?supplier={supplier_name}
 */
function getItemsBySupplier() {
    try {
        $db = getConnection();
        $supplier = isset($_GET['supplier']) ? trim($_GET['supplier']) : '';
        
        if (empty($supplier)) {
            sendErrorResponse('Supplier parameter is required', 400);
            return;
        }
        
        // Get items for this supplier
        $stmt = $db->prepare("
            SELECT 
                item_no,
                item_name,
                supplier,
                brand,
                item_type,
                location,
                balance,
                min_stock,
                price_per_unit,
                CASE 
                    WHEN balance = 0 THEN 'Out Of Stock'
                    WHEN min_stock > 0 AND balance < min_stock THEN 'Low In Stock'
                    ELSE 'In Stock'
                END as status,
                GREATEST(min_stock - balance, 0) as shortage,
                GREATEST(min_stock - balance, 1) as recommended_quantity
            FROM itemsdb 
            WHERE supplier = ? 
            ORDER BY 
                CASE 
                    WHEN balance = 0 THEN 0
                    WHEN min_stock > 0 AND balance < min_stock THEN 1
                    ELSE 2
                END,
                item_name
        ");
        $stmt->execute([$supplier]);
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        sendSuccessResponse([
            'supplier' => $supplier,
            'total_items' => count($items),
            'items' => $items
        ]);
        
    } catch (Exception $e) {
        error_log("Error fetching items by supplier: " . $e->getMessage());
        sendErrorResponse('Failed to fetch items by supplier', 500, ['message' => $e->getMessage()]);
    }
}

/**
 * Get list of unique suppliers from inventory
 * GET /api/purchase-orders/suppliers
 */
function getSuppliersList() {
    try {
        $db = getConnection();
        
        $stmt = $db->query("
            SELECT DISTINCT supplier as name, COUNT(*) as item_count
            FROM itemsdb 
            WHERE supplier IS NOT NULL AND supplier != ''
            GROUP BY supplier
            ORDER BY supplier
        ");
        $suppliers = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        sendSuccessResponse([
            'total_suppliers' => count($suppliers),
            'suppliers' => $suppliers
        ]);
        
    } catch (Exception $e) {
        error_log("Error fetching suppliers list: " . $e->getMessage());
        sendErrorResponse('Failed to fetch suppliers list', 500, ['message' => $e->getMessage()]);
    }
}

/**
 * Generate PO number prefix (MMYY)
 * GET /api/purchase-orders/generate-prefix
 */
function generatePOPrefix() {
    try {
        $currentDate = new DateTime();
        $month = $currentDate->format('m');
        $year = $currentDate->format('y');
        $prefix = $month . $year;
        
        sendSuccessResponse([
            'prefix' => $prefix,
            'format' => $prefix . '-XXX',
            'example' => $prefix . '-001',
            'month' => $month,
            'year' => $year,
            'full_year' => $currentDate->format('Y')
        ]);
        
    } catch (Exception $e) {
        error_log("Error generating PO prefix: " . $e->getMessage());
        sendErrorResponse('Failed to generate PO prefix', 500, ['message' => $e->getMessage()]);
    }
}

/**
 * Get suggested next PO number for current month
 * GET /api/purchase-orders/suggest-number
 */
function suggestNextPONumber() {
    try {
        $db = getConnection();
        $currentDate = new DateTime();
        $prefix = $currentDate->format('my');
        
        // Get the highest sequence number for current month
        $stmt = $db->prepare("
            SELECT id 
            FROM purchase_orders 
            WHERE id LIKE ? 
            ORDER BY id DESC 
            LIMIT 1
        ");
        $stmt->execute([$prefix . '-%']);
        $lastPO = $stmt->fetch(PDO::FETCH_ASSOC);
        
        $nextSequence = 1;
        if ($lastPO) {
            $parts = explode('-', $lastPO['id']);
            if (count($parts) === 2) {
                $lastSequence = intval($parts[1]);
                $nextSequence = $lastSequence + 1;
            }
        }
        
        $suggestedNumber = str_pad($nextSequence, 3, '0', STR_PAD_LEFT);
        $suggestedPO = $prefix . '-' . $suggestedNumber;
        
        sendSuccessResponse([
            'prefix' => $prefix,
            'suggested_sequence' => $suggestedNumber,
            'suggested_po' => $suggestedPO,
            'last_po' => $lastPO ? $lastPO['id'] : null
        ]);
        
    } catch (Exception $e) {
        error_log("Error suggesting PO number: " . $e->getMessage());
        sendErrorResponse('Failed to suggest PO number', 500, ['message' => $e->getMessage()]);
    }
}
?>