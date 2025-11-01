<?php
// checkout.php - Checkout operations

function handleCheckout() {
    $data = getJsonInput();
    $db = getConnection();
    
    $items = $data['items'] ?? null;
    $checkout_by = $data['checkout_by'] ?? null;
    $notes = $data['notes'] ?? null;
    
    if (!is_array($items) || count($items) === 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid input: items array is required and cannot be empty']);
        return;
    }
    
    foreach ($items as $item) {
        if (!isset($item['item_no']) || !isset($item['quantity']) || $item['quantity'] <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Each item must have item_no and positive quantity']);
            return;
        }
    }
    
    try {
        $db->beginTransaction();
        
        $checkoutResults = [];
        $timestamp = date('c');
        
        foreach ($items as $item) {
            $item_no = $item['item_no'];
            $quantity = $item['quantity'];
            
            $stmt = $db->prepare("SELECT item_no, item_name, balance, out_qty FROM itemsdb WHERE item_no = ?");
            $stmt->execute([$item_no]);
            $currentItem = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$currentItem) {
                throw new Exception("Item $item_no not found");
            }
            
            if ($currentItem['balance'] < $quantity) {
                throw new Exception("Insufficient stock for item $item_no. Available: {$currentItem['balance']}, Requested: $quantity");
            }
            
            $newOutQty = ($currentItem['out_qty'] ?: 0) + $quantity;
            
            // Only update out_qty - balance is a generated column and will be calculated automatically
            $stmt = $db->prepare("UPDATE itemsdb SET out_qty = ? WHERE item_no = ?");
            $stmt->execute([$newOutQty, $item_no]);
            
            // Fetch the updated item to get the new balance
            $stmt = $db->prepare("SELECT item_no, item_name, balance, out_qty FROM itemsdb WHERE item_no = ?");
            $stmt->execute([$item_no]);
            $updatedItem = $stmt->fetch(PDO::FETCH_ASSOC);
            
            $checkoutResults[] = [
                'item_no' => $item_no,
                'item_name' => $currentItem['item_name'],
                'quantity_checked_out' => $quantity,
                'previous_balance' => $currentItem['balance'],
                'new_balance' => $updatedItem['balance']
            ];
        }
        
        $db->commit();
        
        echo json_encode([
            'success' => true,
            'message' => 'Checkout processed successfully',
            'data' => [
                'checkout_timestamp' => $timestamp,
                'checkout_by' => $checkout_by,
                'notes' => $notes,
                'items' => $checkoutResults
            ]
        ]);
        
    } catch (Exception $e) {
        $db->rollBack();
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Failed to process checkout',
            'message' => $e->getMessage()
        ]);
    }
}