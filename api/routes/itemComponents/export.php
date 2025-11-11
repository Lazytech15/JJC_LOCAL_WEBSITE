<?php
// export.php - Export operations

function generateCSV($headers, $data) {
    $csv = implode(',', $headers) . "\n";
    
    foreach ($data as $row) {
        $values = [];
        foreach ($row as $value) {
            if (is_string($value)) {
                $values[] = '"' . str_replace('"', '""', $value) . '"';
            } else {
                $values[] = $value ?? '';
            }
        }
        $csv .= implode(',', $values) . "\n";
    }
    
    return $csv;
}

function handleExportCSV() {
    $db = getconnection();
    
    $stmt = $db->query("
        SELECT 
            item_no, item_name, brand, item_type, location, unit_of_measure,
            in_qty, out_qty, balance, min_stock, moq, deficit,
            price_per_unit, cost, item_status, last_po, supplier
        FROM itemsdb 
        ORDER BY item_no
    ");
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $headers = [
        "Item No", "Item Name", "Brand", "Item Type", "Location",
        "Unit of Measure", "In Qty", "Out Qty", "Balance", "ROP (Min Stock)", "MOQ",
        "Deficit", "Price Per Unit", "Cost", "Item Status", "Last PO", "Supplier"
    ];
    
    $csvContent = generateCSV($headers, $items);
    
    header('Content-Type: text/csv');
    header('Content-Disposition: attachment; filename="inventory_export_' . date('Y-m-d') . '.csv"');
    echo $csvContent;
}

function handleSupplierReport($supplier) {
    $db = getconnection();
    
    $stmt = $db->prepare("
        SELECT 
            item_no, item_name, brand, item_type, location, unit_of_measure,
            in_qty, out_qty, balance, min_stock, moq, deficit,
            price_per_unit, cost, item_status, last_po, supplier
        FROM itemsdb 
        WHERE supplier = ? 
        ORDER BY item_name
    ");
    $stmt->execute([$supplier]);
    $allItems = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $inStockItems = array_filter($allItems, fn($item) => $item['item_status'] === 'In Stock');
    $lowStockItems = array_filter($allItems, fn($item) => $item['item_status'] === 'Low In Stock');
    $outOfStockItems = array_filter($allItems, fn($item) => $item['item_status'] === 'Out Of Stock');
    $newlyAddedItems = array_filter($allItems, fn($item) => $item['balance'] > ($item['min_stock'] ?: 10) * 2);
    
    $headers = [
        "Item No", "Item Name", "Brand", "Item Type", "Location",
        "Unit of Measure", "Balance", "ROP (Min Stock)", "MOQ", "Deficit",
        "Price Per Unit", "Cost", "Status"
    ];
    
    $itemsToCSV = function($items, $sheetName) use ($headers) {
        $rows = ["=== " . strtoupper($sheetName) . " ==="];
        $rows[] = implode(',', $headers);
        
        foreach ($items as $item) {
            $row = [
                $item['item_no'],
                '"' . str_replace('"', '""', $item['item_name'] ?? '') . '"',
                '"' . str_replace('"', '""', $item['brand'] ?? '') . '"',
                '"' . str_replace('"', '""', $item['item_type'] ?? '') . '"',
                '"' . str_replace('"', '""', $item['location'] ?? '') . '"',
                '"' . str_replace('"', '""', $item['unit_of_measure'] ?? '') . '"',
                $item['balance'] ?? 0,
                $item['min_stock'] ?? 0,
                $item['moq'] ?? 0,
                $item['deficit'] ?? 0,
                $item['price_per_unit'] ?? 0,
                $item['cost'] ?? 0,
                '"' . str_replace('"', '""', $item['item_status'] ?? '') . '"'
            ];
            $rows[] = implode(',', $row);
        }
        $rows[] = "";
        return $rows;
    };
    
    $csvSections = array_merge(
        [
            ["=== SUPPLIER REPORT: " . strtoupper($supplier) . " ==="],
            ["Generated on: " . date('Y-m-d')],
            ["Total Items: " . count($allItems)],
            [""]
        ],
        $itemsToCSV($inStockItems, "IN STOCK ITEMS"),
        $itemsToCSV($lowStockItems, "LOW STOCK ITEMS"),
        $itemsToCSV($outOfStockItems, "OUT OF STOCK ITEMS"),
        $itemsToCSV($newlyAddedItems, "NEWLY ADDED STOCK ITEMS")
    );
    
    $csvContent = implode("\n", array_map(fn($row) => is_array($row) ? $row[0] : $row, $csvSections));
    
    $filename = "supplier_report_" . preg_replace('/[^a-zA-Z0-9]/', '_', $supplier) . "_" . date('Y-m-d') . ".csv";
    
    header('Content-Type: text/csv');
    header("Content-Disposition: attachment; filename=\"$filename\"");
    echo $csvContent;
}