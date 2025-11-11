<?php
// ItemService.php - Service class for item operations

class ItemService {
    
    public static function findById($itemNo) {
    // Use central PDO accessor
    $db = getConnection();
        $stmt = $db->prepare("
            SELECT item_no, item_name, brand, item_type, location, unit_of_measure, 
                       in_qty, out_qty, balance, min_stock, moq, deficit, 
                   price_per_unit, cost, item_status, last_po, supplier 
            FROM itemsdb 
            WHERE item_no = ?
        ");
        $stmt->execute([$itemNo]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    public static function findAll($filters = []) {
    $db = getConnection();
        
        $limit = $filters['limit'] ?? 50;
        $offset = $filters['offset'] ?? 0;
        $search = $filters['search'] ?? '';
        $item_type = $filters['item_type'] ?? '';
        $location = $filters['location'] ?? '';
        $item_status = $filters['item_status'] ?? '';
        $sort_by = $filters['sort_by'] ?? 'item_no';
        $sort_order = $filters['sort_order'] ?? 'ASC';
        
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
        
        $query = "
             SELECT item_no, item_name, brand, item_type, location, unit_of_measure, 
                 in_qty, out_qty, balance, min_stock, moq, deficit, 
                 price_per_unit, cost, item_status, last_po, supplier 
            FROM itemsdb 
            $whereClause 
            ORDER BY $sort_by $sort_order 
            LIMIT ? OFFSET ?
        ";
        
        $stmt = $db->prepare($query);
        $stmt->execute([...$params, $limit, $offset]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    public static function create($itemData) {
    $db = getConnection();
        
        $item_name = $itemData['item_name'];
        $brand = $itemData['brand'] ?? '';
        $item_type = $itemData['item_type'] ?? '';
        $location = $itemData['location'] ?? '';
        $balance = $itemData['balance'] ?? 0;
        $min_stock = $itemData['min_stock'] ?? 0;
        $unit_of_measure = $itemData['unit_of_measure'] ?? '';
        $price_per_unit = $itemData['price_per_unit'] ?? 0;
            // Backwards compatibility: accept 'supplier_name' as alias for 'supplier'
            $supplier = $itemData['supplier'] ?? ($itemData['supplier_name'] ?? '');
            $moq = $itemData['moq'] ?? 0;
        
        $in_qty = $balance;
        $out_qty = 0;
        
        $stmt = $db->prepare("
              INSERT INTO itemsdb (item_name, brand, item_type, location, unit_of_measure, 
                               in_qty, out_qty, min_stock, moq, price_per_unit, supplier) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
                $stmt->execute([$item_name, $brand, $item_type, $location, $unit_of_measure, 
                                $in_qty, $out_qty, $min_stock, $moq, $price_per_unit, $supplier]);
        
        $lastId = $db->lastInsertId();
        return self::findById($lastId);
    }
    
    public static function update($itemNo, $itemData) {
    $db = getConnection();
        $existingItem = self::findById($itemNo);
        
        if (!$existingItem) {
            throw new Exception("Item not found");
        }
        
        $item_name = $itemData['item_name'];
        $brand = $itemData['brand'] ?? '';
        $item_type = $itemData['item_type'] ?? '';
        $location = $itemData['location'] ?? '';
        $balance = $itemData['balance'] ?? 0;
        $min_stock = $itemData['min_stock'] ?? 0;
        $unit_of_measure = $itemData['unit_of_measure'] ?? '';
        $price_per_unit = $itemData['price_per_unit'] ?? 0;
            // Backwards compatibility: accept 'supplier_name' as alias for 'supplier'
            $supplier = $itemData['supplier'] ?? ($itemData['supplier_name'] ?? '');
            $moq = $itemData['moq'] ?? ($existingItem['moq'] ?? 0);
        
        $in_qty = $balance + $existingItem['out_qty'];
        
        $stmt = $db->prepare("
                UPDATE itemsdb 
                SET item_name = ?, brand = ?, item_type = ?, location = ?, 
                    unit_of_measure = ?, in_qty = ?, min_stock = ?, moq = ?, 
                    price_per_unit = ?, supplier = ? 
            WHERE item_no = ?
        ");
                $stmt->execute([$item_name, $brand, $item_type, $location, $unit_of_measure, 
                                $in_qty, $min_stock, $moq, $price_per_unit, $supplier, $itemNo]);
        
        return self::findById($itemNo);
    }
    
    public static function delete($itemNo) {
    $db = getConnection();
        $existingItem = self::findById($itemNo);
        
        if (!$existingItem) {
            throw new Exception("Item not found");
        }
        
        $stmt = $db->prepare("DELETE FROM itemsdb WHERE item_no = ?");
        $stmt->execute([$itemNo]);
        
        return ['item_no' => $itemNo];
    }
    
    public static function adjustStock($itemNo, $quantity, $type = 'add') {
    $db = getConnection();
        $existingItem = self::findById($itemNo);
        
        if (!$existingItem) {
            throw new Exception("Item not found");
        }
        
        $newInQty = $existingItem['in_qty'];
        
        if ($type === 'add') {
            $newInQty = $existingItem['in_qty'] + $quantity;
        } elseif ($type === 'set') {
            $newInQty = $quantity + $existingItem['out_qty'];
        }
        
        $stmt = $db->prepare("UPDATE itemsdb SET in_qty = ? WHERE item_no = ?");
        $stmt->execute([$newInQty, $itemNo]);
        
        return self::findById($itemNo);
    }
}