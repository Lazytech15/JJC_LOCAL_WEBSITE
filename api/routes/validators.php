<?php
// validators.php - Validation functions

function validateItemId($id) {
    if (!is_numeric($id) || $id <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid item number']);
        exit;
    }
    return intval($id);
}

function validateItem($data) {
    if (empty($data['item_name'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Item name is required']);
        exit;
    }
    
    // Validate MOQ if provided (must be non-negative)
    if (isset($data['moq'])) {
        if (!is_numeric($data['moq']) || $data['moq'] < 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'MOQ must be a non-negative number']);
            exit;
        }
    }
    
    // Validate min_stock if provided (must be non-negative)
    if (isset($data['min_stock'])) {
        if (!is_numeric($data['min_stock']) || $data['min_stock'] < 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Min stock must be a non-negative number']);
            exit;
        }
    }
    
    return true;
}

function validateQuantity($quantity) {
    if (!isset($quantity) || $quantity <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Valid positive quantity is required']);
        exit;
    }
    return true;
}

function getJsonInput() {
    $input = file_get_contents('php://input');
    return json_decode($input, true);
}