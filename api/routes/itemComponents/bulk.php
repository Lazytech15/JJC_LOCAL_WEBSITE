<?php
// bulk.php - Bulk operations

function handleBulkCreate() {
    $data = getJsonInput();
    $db = getConnection;
    
    $items = $data['items'] ?? null;
    
    if (!is_array($items) || count($items) === 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Items array is required']);
        return;
    }
    
    $createdItems = [];
    $errors = [];
    
    foreach ($items as $index => $item) {
        try {
            $item_name = $item['item_name'] ?? null;
            $brand = $item['brand'] ?? '';
            $item_type = $item['item_type'] ?? '';
            $location = $item['location'] ?? '';
            $balance = $item['balance'] ?? 0;
            $min_stock = $item['min_stock'] ?? 0;
            $unit_of_measure = $item['unit_of_measure'] ?? '';
            $price_per_unit = $item['price_per_unit'] ?? 0;
            $supplier = $item['supplier'] ?? '';
            
            if (!$item_name) {
                $errors[] = [
                    'index' => $index,
                    'error' => 'Item name is required',
                    'item' => $item
                ];
                continue;
            }
            
            $in_qty = $balance;
            $out_qty = 0;
            
            $stmt = $db->prepare("INSERT INTO itemsdb (item_name, brand, item_type, location, unit_of_measure, in_qty, out_qty, min_stock, price_per_unit, supplier) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([$item_name, $brand, $item_type, $location, $unit_of_measure, $in_qty, $out_qty, $min_stock, $price_per_unit, $supplier]);
            
            $lastId = $db->lastInsertId();
            
            $stmt = $db->prepare("SELECT item_no, item_name, brand, item_type, location, unit_of_measure, in_qty, out_qty, balance, min_stock, deficit, price_per_unit, cost, item_status, last_po, supplier FROM itemsdb WHERE item_no = ?");
            $stmt->execute([$lastId]);
            $newItem = $stmt->fetch(PDO::FETCH_ASSOC);
            
            $createdItems[] = $newItem;
        } catch (Exception $e) {
            $errors[] = [
                'index' => $index,
                'error' => $e->getMessage(),
                'item' => $item
            ];
        }
    }
    
    http_response_code(201);
    echo json_encode([
        'success' => true,
        'data' => [
            'created_items' => $createdItems,
            'errors' => $errors,
            'summary' => [
                'total_attempted' => count($items),
                'successful' => count($createdItems),
                'failed' => count($errors)
            ]
        ],
        'message' => "Bulk operation completed. " . count($createdItems) . " items created, " . count($errors) . " errors."
    ]);
}