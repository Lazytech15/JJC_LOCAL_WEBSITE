<?php
// reports.php - Reporting operations

function handleDashboardStats() {
    $db = getConnection();
    
    $stmt = $db->query("
        SELECT 
            COUNT(*) as total_items,
            SUM(CASE WHEN item_status = 'Out Of Stock' THEN 1 ELSE 0 END) as out_of_stock_count,
            SUM(CASE WHEN item_status = 'Low In Stock' THEN 1 ELSE 0 END) as low_stock_count,
            SUM(CASE WHEN item_status = 'In Stock' THEN 1 ELSE 0 END) as in_stock_count,
            ROUND(SUM(cost), 2) as total_inventory_value,
            SUM(balance) as total_quantity,
            ROUND(AVG(price_per_unit), 2) as avg_price_per_unit,
            COUNT(DISTINCT item_type) as total_categories,
            COUNT(DISTINCT location) as total_locations,
            COUNT(DISTINCT supplier) as total_suppliers
        FROM itemsdb
    ");
    $stats = $stmt->fetch(PDO::FETCH_ASSOC);
    
    $stmt = $db->query("
        SELECT item_no, item_name, balance, min_stock, deficit 
        FROM itemsdb 
        WHERE item_status IN ('Low In Stock', 'Out Of Stock') 
        ORDER BY deficit DESC 
        LIMIT 10
    ");
    $lowStockItems = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $stmt = $db->query("
        SELECT item_no, item_name, balance, price_per_unit, cost 
        FROM itemsdb 
        ORDER BY cost DESC 
        LIMIT 10
    ");
    $highValueItems = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'data' => [
            'overview' => $stats,
            'low_stock_items' => $lowStockItems,
            'high_value_items' => $highValueItems
        ]
    ]);
}

function handleInventorySummary() {
    $db = getConnection();
    
    $stmt = $db->query("
        SELECT 
            COUNT(*) as total_items,
            SUM(CASE WHEN item_status = 'Out Of Stock' THEN 1 ELSE 0 END) as out_of_stock_count,
            SUM(CASE WHEN item_status = 'Low In Stock' THEN 1 ELSE 0 END) as low_stock_count,
            SUM(CASE WHEN item_status = 'In Stock' THEN 1 ELSE 0 END) as in_stock_count,
            ROUND(SUM(cost), 2) as total_inventory_value,
            SUM(balance) as total_quantity,
            ROUND(AVG(price_per_unit), 2) as avg_price_per_unit,
            COUNT(DISTINCT item_type) as total_categories,
            COUNT(DISTINCT location) as total_locations,
            COUNT(DISTINCT supplier) as total_suppliers
        FROM itemsdb
    ");
    $overview = $stmt->fetch(PDO::FETCH_ASSOC);
    
    $stmt = $db->query("
        SELECT 
            item_type,
            COUNT(*) as item_count,
            SUM(balance) as total_quantity,
            ROUND(SUM(cost), 2) as total_value
        FROM itemsdb
        WHERE item_type IS NOT NULL AND item_type != ''
        GROUP BY item_type
        ORDER BY total_value DESC
    ");
    $byCategory = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $stmt = $db->query("
        SELECT 
            location,
            COUNT(*) as item_count,
            SUM(balance) as total_quantity,
            ROUND(SUM(cost), 2) as total_value
        FROM itemsdb
        WHERE location IS NOT NULL AND location != ''
        GROUP BY location
        ORDER BY total_value DESC
    ");
    $byLocation = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $stmt = $db->query("
        SELECT 
            supplier,
            COUNT(*) as item_count,
            SUM(balance) as total_quantity,
            ROUND(SUM(cost), 2) as total_value
        FROM itemsdb
        WHERE supplier IS NOT NULL AND supplier != ''
        GROUP BY supplier
        ORDER BY total_value DESC
    ");
    $bySupplier = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $stmt = $db->query("
        SELECT 
            item_no, item_name, brand, item_type, location,
            balance, min_stock, deficit, item_status
        FROM itemsdb
        WHERE item_status IN ('Out Of Stock', 'Low In Stock')
        ORDER BY deficit DESC, item_status DESC
        LIMIT 20
    ");
    $criticalItems = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $stmt = $db->query("
        SELECT 
            item_no, item_name, brand, balance,
            price_per_unit, cost, item_status
        FROM itemsdb
        ORDER BY cost DESC
        LIMIT 10
    ");
    $highValueItems = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'data' => [
            'overview' => $overview,
            'breakdown' => [
                'by_category' => $byCategory,
                'by_location' => $byLocation,
                'by_supplier' => $bySupplier
            ],
            'critical_items' => $criticalItems,
            'high_value_items' => $highValueItems,
            'generated_at' => date('c')
        ],
        'message' => 'Inventory summary report generated successfully'
    ]);
}