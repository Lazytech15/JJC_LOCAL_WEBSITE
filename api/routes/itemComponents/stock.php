<?php
// stock.php - Stock management operations

function handleStockUpdate($itemId) {
    validateItemId($itemId);
    $data = getJsonInput();
    $db = getConnection();
    
    $balance = $data['balance'] ?? null;
    $adjustment_reason = $data['adjustment_reason'] ?? 'Manual adjustment';
    
    if (!is_numeric($balance) || $balance < 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Valid balance is required']);
        return;
    }
    
    $stmt = $db->prepare("SELECT * FROM itemsdb WHERE item_no = ?");
    $stmt->execute([$itemId]);
    $existingItem = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$existingItem) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Item not found']);
        return;
    }
    
    $newInQty = $balance + $existingItem['out_qty'];
    
    $stmt = $db->prepare("UPDATE itemsdb SET in_qty = ? WHERE item_no = ?");
    $stmt->execute([$newInQty, $itemId]);
    
    $stmt = $db->prepare("SELECT item_no, item_name, brand, item_type, location, unit_of_measure, in_qty, out_qty, balance, min_stock, deficit, price_per_unit, cost, item_status, last_po, supplier FROM itemsdb WHERE item_no = ?");
    $stmt->execute([$itemId]);
    $updatedItem = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo json_encode(['success' => true, 'data' => $updatedItem, 'message' => 'Stock updated successfully']);
}

function handleStockInsert($itemId) {
    validateItemId($itemId);
    $data = getJsonInput();
    $db = getConnection();
    
    $quantity = $data['quantity'] ?? null;
    $reason = $data['reason'] ?? 'Stock insertion';
    
    if (!is_numeric($quantity) || $quantity <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Valid positive quantity is required']);
        return;
    }
    
    $stmt = $db->prepare("SELECT * FROM itemsdb WHERE item_no = ?");
    $stmt->execute([$itemId]);
    $existingItem = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$existingItem) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Item not found']);
        return;
    }
    
    $newInQty = $existingItem['in_qty'] + $quantity;
    
    $stmt = $db->prepare("UPDATE itemsdb SET in_qty = ? WHERE item_no = ?");
    $stmt->execute([$newInQty, $itemId]);
    
    $stmt = $db->prepare("SELECT item_no, item_name, brand, item_type, location, unit_of_measure, in_qty, out_qty, balance, min_stock, deficit, price_per_unit, cost, item_status, last_po, supplier FROM itemsdb WHERE item_no = ?");
    $stmt->execute([$itemId]);
    $updatedItem = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'data' => $updatedItem,
        'message' => "Stock inserted successfully. Added $quantity units.",
        'stock_change' => [
            'previous_balance' => $existingItem['balance'],
            'added_quantity' => $quantity,
            'new_balance' => $updatedItem['balance']
        ]
    ]);
}

function handleStockQuantity($itemId) {
    validateItemId($itemId);
    $data = getJsonInput();
    $db = getConnection();
    
    $in_qty = $data['in_qty'] ?? null;
    $out_qty = $data['out_qty'] ?? null;
    $balance = $data['balance'] ?? null;
    $update_type = $data['update_type'] ?? null;
    $notes = $data['notes'] ?? null;
    $updated_by = $data['updated_by'] ?? null;
    
    if ($in_qty === null && $out_qty === null && $balance === null) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'At least one quantity field (in_qty, out_qty, or balance) must be provided']);
        return;
    }
    
    $stmt = $db->prepare("SELECT item_no, item_name, in_qty, out_qty, balance FROM itemsdb WHERE item_no = ?");
    $stmt->execute([$itemId]);
    $currentItem = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$currentItem) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Item not found']);
        return;
    }
    
    $newInQty = $currentItem['in_qty'];
    $newOutQty = $currentItem['out_qty'];
    $newBalance = $currentItem['balance'];
    
    if ($update_type === 'set_balance' && $balance !== null) {
        if ($balance < 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Balance cannot be negative']);
            return;
        }
        $newBalance = $balance;
    } elseif ($update_type === 'adjust_in' && $in_qty !== null) {
        if ($in_qty < 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'In quantity cannot be negative']);
            return;
        }
        $newInQty = $in_qty;
        $newBalance = $newInQty - $newOutQty;
    } elseif ($update_type === 'adjust_out' && $out_qty !== null) {
        if ($out_qty < 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Out quantity cannot be negative']);
            return;
        }
        $newOutQty = $out_qty;
        $newBalance = $newInQty - $newOutQty;
    } else {
        if ($in_qty !== null) {
            if ($in_qty < 0) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'In quantity cannot be negative']);
                return;
            }
            $newInQty = $in_qty;
        }
        
        if ($out_qty !== null) {
            if ($out_qty < 0) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Out quantity cannot be negative']);
                return;
            }
            $newOutQty = $out_qty;
        }
        
        if ($balance !== null) {
            if ($balance < 0) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Balance cannot be negative']);
                return;
            }
            $newBalance = $balance;
        } else {
            $newBalance = $newInQty - $newOutQty;
        }
    }
    
    if ($newBalance < 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Calculated balance would be negative. Please check your quantities.']);
        return;
    }
    
    
    $stmt = $db->prepare("SELECT item_no, item_name, brand, item_type, location, unit_of_measure, in_qty, out_qty, balance, min_stock, deficit, price_per_unit, cost, item_status, last_po, supplier FROM itemsdb WHERE item_no = ?");
    $stmt->execute([$itemId]);
    $updatedItem = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'message' => 'Item quantities updated successfully',
        'data' => [
            'item' => $updatedItem,
            'changes' => [
                'previous' => [
                    'in_qty' => $currentItem['in_qty'],
                    'out_qty' => $currentItem['out_qty'],
                    'balance' => $currentItem['balance']
                ],
                'updated' => [
                    'in_qty' => $newInQty,
                    'out_qty' => $newOutQty,
                    'balance' => $newBalance
                ],
                'update_type' => $update_type ?: 'manual',
                'notes' => $notes,
                'updated_by' => $updated_by,
                'timestamp' => date('c')
            ]
        ]
    ]);
}

function handleStockOut($itemId) {
    validateItemId($itemId);
    $data = getJsonInput();
    $db = getConnection();
    
    $quantity = $data['quantity'] ?? null;
    $notes = $data['notes'] ?? null;
    $out_by = $data['out_by'] ?? null;
    
    if (!$quantity || $quantity <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Quantity must be a positive number']);
        return;
    }
    
    $stmt = $db->prepare("SELECT item_no, item_name, balance, out_qty FROM itemsdb WHERE item_no = ?");
    $stmt->execute([$itemId]);
    $currentItem = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$currentItem) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Item not found']);
        return;
    }
    
    if ($currentItem['balance'] < $quantity) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => "Insufficient stock. Available: {$currentItem['balance']}, Requested: $quantity"]);
        return;
    }
    
    $newOutQty = ($currentItem['out_qty'] ?: 0) + $quantity;
    $newBalance = $currentItem['balance'] - $quantity;
    
$stmt = $db->prepare("UPDATE itemsdb SET out_qty = ? WHERE item_no = ?");
$stmt->execute([$newOutQty, $itemId]);
    
    $stmt = $db->prepare("SELECT item_no, item_name, brand, item_type, location, unit_of_measure, in_qty, out_qty, balance, min_stock, deficit, price_per_unit, cost, item_status, last_po, supplier FROM itemsdb WHERE item_no = ?");
    $stmt->execute([$itemId]);
    $updatedItem = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'message' => 'Item out quantity recorded successfully',
        'data' => [
            'item' => $updatedItem,
            'transaction' => [
                'quantity_out' => $quantity,
                'previous_balance' => $currentItem['balance'],
                'new_balance' => $newBalance,
                'notes' => $notes,
                'out_by' => $out_by,
                'timestamp' => date('c')
            ]
        ]
    ]);
}