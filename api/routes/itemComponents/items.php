<?php
// items.php - Basic CRUD operations

function handleGetItems() {
    $db = getConnection();
    
    $limit = isset($_GET['limit']) ? min(max(1, intval($_GET['limit'])), 500) : 50;
    $offset = isset($_GET['offset']) ? max(0, intval($_GET['offset'])) : 0;
    $search = $_GET['search'] ?? '';
    $item_type = $_GET['item_type'] ?? '';
    $location = $_GET['location'] ?? '';
    $item_status = $_GET['item_status'] ?? '';
    $sort_by = $_GET['sort_by'] ?? 'item_no';
    $sort_order = strtoupper($_GET['sort_order'] ?? 'ASC');
    
    $validSortColumns = ['item_no', 'item_name', 'brand', 'item_type', 'location', 'balance', 'min_stock', 'deficit', 'price_per_unit', 'cost', 'item_status', 'last_po', 'supplier'];
    $validSortOrders = ['ASC', 'DESC'];
    
    $sortColumn = in_array($sort_by, $validSortColumns) ? $sort_by : 'item_no';
    $sortOrder = in_array($sort_order, $validSortOrders) ? $sort_order : 'ASC';
    
    $whereClause = "WHERE 1=1";
    $params = [];
    
    if ($search) {
        $whereClause .= " AND (item_name LIKE ? OR brand LIKE ? OR supplier LIKE ?)";
        $searchParam = "%$search%";
        $params[] = $searchParam;
        $params[] = $searchParam;
        $params[] = $searchParam;
    }
    
    if ($item_type) {
        $whereClause .= " AND item_type = ?";
        $params[] = $item_type;
    }
    
    if ($location) {
        $whereClause .= " AND location = ?";
        $params[] = $location;
    }
    
    if ($item_status) {
        $whereClause .= " AND item_status = ?";
        $params[] = $item_status;
    }
    
    $query = "SELECT item_no, item_name, brand, item_type, location, unit_of_measure, in_qty, out_qty, balance, min_stock, deficit, price_per_unit, cost, item_status, last_po, supplier FROM itemsdb $whereClause ORDER BY $sortColumn $sortOrder LIMIT ? OFFSET ?";
    
    $stmt = $db->prepare($query);
    $stmt->execute([...$params, $limit, $offset]);
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $countQuery = "SELECT COUNT(*) as count FROM itemsdb $whereClause";
    $stmt = $db->prepare($countQuery);
    $stmt->execute($params);
    $total = $stmt->fetch(PDO::FETCH_ASSOC);
    
    $statsQuery = "SELECT COUNT(*) as total_items, SUM(CASE WHEN item_status = 'Out Of Stock' THEN 1 ELSE 0 END) as out_of_stock, SUM(CASE WHEN item_status = 'Low In Stock' THEN 1 ELSE 0 END) as low_stock, SUM(CASE WHEN item_status = 'In Stock' THEN 1 ELSE 0 END) as in_stock, SUM(cost) as total_inventory_value, SUM(balance) as total_items_count FROM itemsdb $whereClause";
    $stmt = $db->prepare($statsQuery);
    $stmt->execute($params);
    $stats = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'data' => $items,
        'pagination' => [
            'total' => $total['count'],
            'limit' => $limit,
            'offset' => $offset,
            'pages' => ceil($total['count'] / $limit),
            'current_page' => floor($offset / $limit) + 1
        ],
        'filters' => [
            'search' => $search,
            'item_type' => $item_type,
            'location' => $location,
            'item_status' => $item_status,
            'sort_by' => $sortColumn,
            'sort_order' => $sortOrder
        ],
        'statistics' => $stats
    ]);
}

function handleGetItem($itemId) {
    validateItemId($itemId);
    $db = getConnection();
    
    $stmt = $db->prepare("SELECT item_no, item_name, brand, item_type, location, unit_of_measure, in_qty, out_qty, balance, min_stock, deficit, price_per_unit, cost, item_status, last_po, supplier FROM itemsdb WHERE item_no = ?");
    $stmt->execute([$itemId]);
    $item = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$item) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Item not found']);
        return;
    }
    
    echo json_encode(['success' => true, 'data' => $item]);
}

function handleCreateItem() {
    $data = getJsonInput();
    validateItem($data);
    
    $db = getConnection();
    
    $item_name = $data['item_name'];
    $brand = $data['brand'] ?? '';
    $item_type = $data['item_type'] ?? '';
    $location = $data['location'] ?? '';
    $balance = $data['balance'] ?? 0;
    $min_stock = $data['min_stock'] ?? 0;
    $unit_of_measure = $data['unit_of_measure'] ?? '';
    $price_per_unit = $data['price_per_unit'] ?? 0;
    $supplier = $data['supplier'] ?? '';
    
    $in_qty = $balance;
    $out_qty = 0;
    
    $stmt = $db->prepare("INSERT INTO itemsdb (item_name, brand, item_type, location, unit_of_measure, in_qty, out_qty, min_stock, price_per_unit, supplier) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([$item_name, $brand, $item_type, $location, $unit_of_measure, $in_qty, $out_qty, $min_stock, $price_per_unit, $supplier]);
    
    $lastId = $db->lastInsertId();
    
    $barcode = 'ITM' . str_pad($lastId, 3, '0', STR_PAD_LEFT);
    $stmt = $db->prepare("UPDATE itemsdb SET barcode = ? WHERE item_no = ?");
    $stmt->execute([$barcode, $lastId]);
    
    $stmt = $db->prepare("SELECT item_no, item_name, brand, item_type, location, unit_of_measure, in_qty, out_qty, balance, min_stock, deficit, price_per_unit, cost, item_status, last_po, supplier, barcode FROM itemsdb WHERE item_no = ?");
    $stmt->execute([$lastId]);
    $newItem = $stmt->fetch(PDO::FETCH_ASSOC);
    
    http_response_code(201);
    echo json_encode(['success' => true, 'data' => $newItem, 'message' => 'Item created successfully']);
}

function handleUpdateItem($itemId) {
    validateItemId($itemId);
    $data = getJsonInput();
    validateItem($data);
    
    $db = getConnection();
    
    $stmt = $db->prepare("SELECT * FROM itemsdb WHERE item_no = ?");
    $stmt->execute([$itemId]);
    $existingItem = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$existingItem) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Item not found']);
        return;
    }
    
    $item_name = $data['item_name'];
    $brand = $data['brand'] ?? '';
    $item_type = $data['item_type'] ?? '';
    $location = $data['location'] ?? '';
    $balance = $data['balance'] ?? 0;
    $min_stock = $data['min_stock'] ?? 0;
    $unit_of_measure = $data['unit_of_measure'] ?? '';
    $price_per_unit = $data['price_per_unit'] ?? 0;
    $supplier = $data['supplier'] ?? '';
    
    $in_qty = $balance + $existingItem['out_qty'];
    
    $stmt = $db->prepare("UPDATE itemsdb SET item_name = ?, brand = ?, item_type = ?, location = ?, unit_of_measure = ?, in_qty = ?, min_stock = ?, price_per_unit = ?, supplier = ? WHERE item_no = ?");
    $stmt->execute([$item_name, $brand, $item_type, $location, $unit_of_measure, $in_qty, $min_stock, $price_per_unit, $supplier, $itemId]);
    
    $stmt = $db->prepare("SELECT item_no, item_name, brand, item_type, location, unit_of_measure, in_qty, out_qty, balance, min_stock, deficit, price_per_unit, cost, item_status, last_po, supplier FROM itemsdb WHERE item_no = ?");
    $stmt->execute([$itemId]);
    $updatedItem = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo json_encode(['success' => true, 'data' => $updatedItem, 'message' => 'Item updated successfully']);
}

function handleDeleteItem($itemId) {
    validateItemId($itemId);
    $db = getConnection();
    
    $stmt = $db->prepare("SELECT * FROM itemsdb WHERE item_no = ?");
    $stmt->execute([$itemId]);
    $existingItem = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$existingItem) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Item not found']);
        return;
    }
    
    $stmt = $db->prepare("DELETE FROM itemsdb WHERE item_no = ?");
    $stmt->execute([$itemId]);
    
    echo json_encode(['success' => true, 'message' => 'Item deleted successfully', 'data' => ['item_no' => $itemId]]);
}

function handleFilterOptions() {
    $db = getConnection();
    
    $brands = $db->query("SELECT DISTINCT brand FROM itemsdb WHERE brand IS NOT NULL AND brand != '' ORDER BY brand")->fetchAll(PDO::FETCH_COLUMN);
    $itemTypes = $db->query("SELECT DISTINCT item_type FROM itemsdb WHERE item_type IS NOT NULL AND item_type != '' ORDER BY item_type")->fetchAll(PDO::FETCH_COLUMN);
    $unitOfMeasures = $db->query("SELECT DISTINCT unit_of_measure FROM itemsdb WHERE unit_of_measure IS NOT NULL AND unit_of_measure != '' ORDER BY unit_of_measure")->fetchAll(PDO::FETCH_COLUMN);
    $locations = $db->query("SELECT DISTINCT location FROM itemsdb WHERE location IS NOT NULL AND location != '' ORDER BY location")->fetchAll(PDO::FETCH_COLUMN);
    $itemStatuses = $db->query("SELECT DISTINCT item_status FROM itemsdb ORDER BY item_status")->fetchAll(PDO::FETCH_COLUMN);
    $suppliers = $db->query("SELECT DISTINCT supplier FROM itemsdb WHERE supplier IS NOT NULL AND supplier != '' ORDER BY supplier")->fetchAll(PDO::FETCH_COLUMN);
    
    echo json_encode([
        'success' => true,
        'data' => [
            'brands' => $brands,
            'item_types' => $itemTypes,
            'unit_of_measures' => $unitOfMeasures,
            'locations' => $locations,
            'item_statuses' => $itemStatuses,
            'suppliers' => $suppliers
        ]
    ]);
}

function handleItemsBySupplier($supplier) {
    $db = getConnection();
    
    $stmt = $db->prepare("SELECT item_no, item_name, brand, item_type, location, unit_of_measure, in_qty, out_qty, balance, min_stock, deficit, price_per_unit, cost, item_status, last_po, supplier FROM itemsdb WHERE supplier = ? ORDER BY item_name");
    $stmt->execute([$supplier]);
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode(['success' => true, 'data' => $items, 'supplier' => $supplier, 'count' => count($items)]);
}