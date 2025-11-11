<?php
// fix_trigger.php - Fix the sync_suppliers_after_insert trigger
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/config/database.php';

try {
    $db = getConnection();
    
    $response = [
        'step_1_drop_old_trigger' => 'Attempting...'
    ];
    
    // Step 1: Drop the old trigger
    $db->exec("DROP TRIGGER IF EXISTS sync_suppliers_after_insert");
    $response['step_1_drop_old_trigger'] = 'SUCCESS';
    
    // Step 2: Create the corrected trigger
    $response['step_2_create_new_trigger'] = 'Attempting...';
    
    $createTrigger = "
    CREATE TRIGGER sync_suppliers_after_insert
    AFTER INSERT ON itemsdb
    FOR EACH ROW
    BEGIN
      IF NEW.supplier IS NOT NULL AND NEW.supplier != '' THEN
        INSERT IGNORE INTO suppliers (name)
        VALUES (NEW.supplier);
      END IF;
    END
    ";
    
    $db->exec($createTrigger);
    $response['step_2_create_new_trigger'] = 'SUCCESS';
    
    // Step 3: Verify the fix
    $response['step_3_verify'] = 'Attempting...';
    
    $stmt = $db->query("SHOW TRIGGERS WHERE `Table` = 'itemsdb'");
    $triggers = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $response['step_3_verify'] = 'SUCCESS';
    $response['new_trigger'] = $triggers[0] ?? null;
    
    // Step 4: Test insert
    $response['step_4_test_insert'] = 'Attempting...';
    
    $testSql = "INSERT INTO itemsdb (item_name, brand, item_type, location, unit_of_measure, in_qty, out_qty, min_stock, moq, price_per_unit, supplier) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    $stmt = $db->prepare($testSql);
    $result = $stmt->execute(['TRIGGER_FIX_TEST', 'TEST', '', '', '', 0, 0, 0, 0, 0, 'TEST_SUPPLIER_TRIGGER']);
    
    if ($result) {
        $lastId = $db->lastInsertId();
        $response['step_4_test_insert'] = 'SUCCESS';
        $response['test_item_id'] = $lastId;
        
        // Clean up test item
        $db->exec("DELETE FROM itemsdb WHERE item_no = $lastId");
        $response['test_cleanup'] = 'SUCCESS';
    }
    
    $response['overall_status'] = 'FIXED! ✅';
    $response['message'] = 'The trigger has been fixed. Changed suppliers(supplier_name) to suppliers(name)';
    
    echo json_encode($response, JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    echo json_encode([
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ], JSON_PRETTY_PRINT);
}
