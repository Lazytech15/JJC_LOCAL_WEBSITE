<?php
// routes/operations.php - Operations Department API Routes (Updated for part_number)
require_once __DIR__ . '/../socket.php';

$method = $_SERVER['REQUEST_METHOD'];
$pdo = getConnection();




// Get the action from URL segments
$segments = explode('/', trim($path, '/'));
$action = $segments[1] ?? null;

try {
    switch ($action) {
        case 'items':
            if ($method === 'GET') {
                getItems($pdo);
            } elseif ($method === 'POST') {
                createItem($pdo);
            } elseif ($method === 'PUT') {
                updateItem($pdo);
            } elseif ($method === 'DELETE') {
                deleteItem($pdo);
            }
            break;

        case 'phases':
            if ($method === 'GET') {
                getPhases($pdo);
            } elseif ($method === 'POST') {
                createPhase($pdo);
            } elseif ($method === 'PUT') {
                updatePhase($pdo);
            } elseif ($method === 'DELETE') {
                deletePhase($pdo);
            }
            break;

        case 'subphases':
            if ($method === 'GET') {
                getSubphases($pdo);
            } elseif ($method === 'POST') {
                createSubphase($pdo);
            } elseif ($method === 'PUT') {
                updateSubphase($pdo);
            } elseif ($method === 'DELETE') {
                deleteSubphase($pdo);
            }
            break;

        case 'complete-subphase':
            if ($method === 'POST') {
                completeSubphase($pdo);
            }
            break;

        case 'assign-employee':
            if ($method === 'POST') {
                assignEmployee($pdo);
            }
            break;

        case 'statistics':
            if ($method === 'GET') {
                getStatistics($pdo);
            }
            break;

        case 'audit-log':
            if ($method === 'GET') {
                getAuditLog($pdo);
            }
            break;

        case 'employee-performance':
            if ($method === 'GET') {
                getEmployeePerformance($pdo);
            }
            break;

        case 'progress-report':
            if ($method === 'GET') {
                getProgressReport($pdo);
            }
            break;
        case 'start-item':
            if ($method === 'POST') {
                startItemProcess($pdo);
            }
            break;
        
        case 'stop-item':
            if ($method === 'POST') {
                stopItemProcess($pdo);
            }
            break;
        
        case 'reset-item':
            if ($method === 'POST') {
                resetItemProcess($pdo);
            }
            break;
            
        case 'clients':
            if ($method === 'GET') {
                getClients($pdo);
            }
            break;
        case 'update-completed-quantity':
            if ($method === 'POST') {
                updateSubphaseCompletedQuantity($pdo);
            }
            break;
        case 'pause-phase':
            if ($method === 'POST') {
                pausePhaseProcess($pdo);
            }
            break;
        
        case 'resume-phase':
            if ($method === 'POST') {
                resumePhaseProcess($pdo);
            }
            break;
            
        case 'google-sheets-import':
            if ($method === 'POST') {
                googleSheetsImport($pdo);
            }
            break;

        case 'health':
            if ($method === 'GET') {
                healthCheck();
            }
            break;
        case 'refresh-cache':
            if ($method === 'POST') {
                refreshCache($pdo);
            }
            break;


        default:
            sendErrorResponse('Invalid operations endpoint', 400);
    }
} catch (Exception $e) {
    error_log("Operations API Error: " . $e->getMessage());
    sendErrorResponse('Operations API error: ' . $e->getMessage(), 500);
}

// ==================== ITEM FUNCTIONS ====================

function getItems($pdo) {
    try {
        $partNumber = $_GET['part_number'] ?? null;
        
        if ($partNumber) {
            // Get specific item with all details (unchanged)
            $stmt = $pdo->prepare("
                SELECT 
                    i.*,
                    COUNT(DISTINCT p.id) as phase_count,
                    COUNT(DISTINCT s.id) as subphase_count,
                    COUNT(DISTINCT CASE WHEN s.completed = 1 THEN s.id END) as completed_subphase_count
                FROM operations_items i
                LEFT JOIN operations_phases p ON i.part_number = p.item_part_number
                LEFT JOIN operations_subphases s ON p.id = s.phase_id
                WHERE i.part_number = ?
                GROUP BY i.part_number
            ");
            $stmt->execute([$partNumber]);
            $item = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$item) {
                sendErrorResponse('Item not found', 404);
                return;
            }
            
            // Get phases with subphases
            $stmt = $pdo->prepare("
                SELECT 
                    p.*,
                    COUNT(DISTINCT s.id) as subphase_count,
                    COUNT(DISTINCT CASE WHEN s.completed = 1 THEN s.id END) as completed_count
                FROM operations_phases p
                LEFT JOIN operations_subphases s ON p.id = s.phase_id
                WHERE p.item_part_number = ?
                GROUP BY p.id
                ORDER BY p.phase_order
            ");
            $stmt->execute([$partNumber]);
            $item['phases'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Get subphases for each phase
            foreach ($item['phases'] as &$phase) {
                $stmt = $pdo->prepare("
                    SELECT * FROM operations_subphases
                    WHERE phase_id = ?
                    ORDER BY subphase_order
                ");
                $stmt->execute([$phase['id']]);
                $phase['subphases'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
            }
            
            sendSuccessResponse($item);
        } else {
            // ✅ UPDATED: Get all items with pagination, filtering, and sorting
            $status = $_GET['status'] ?? null;
            $search = $_GET['search'] ?? null;
            $priority = $_GET['priority'] ?? null;
            $client_name = $_GET['client_name'] ?? null;
            $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
            $limit = isset($_GET['limit']) ? max(1, min(100, intval($_GET['limit']))) : 20;
            $offset = ($page - 1) * $limit;
            
            // ✅ Sorting parameters (default: newest first)
            $sort_by = $_GET['sort_by'] ?? 'created_at';
            $sort_order = $_GET['sort_order'] ?? 'DESC';
            
            // Validate sort_by
            $allowed_sort_fields = [
                'part_number',
                'name',
                'client_name',
                'priority',
                'status',
                'created_at',
                'overall_progress',
                'updated_at'
            ];
            
            if (!in_array($sort_by, $allowed_sort_fields)) {
                $sort_by = 'created_at';
            }
            
            // Validate sort_order
            $sort_order = strtoupper($sort_order) === 'ASC' ? 'ASC' : 'DESC';
            
            // ✅ Build WHERE clause with ALL filters
            $whereConditions = ["1=1"];
            $params = [];
            
            if ($status) {
                $whereConditions[] = "i.status = ?";
                $params[] = $status;
            }
            
            if ($priority) {
                $whereConditions[] = "i.priority = ?";
                $params[] = $priority;
            }
            
            if ($client_name) {
                $whereConditions[] = "i.client_name = ?";
                $params[] = $client_name;
            }
            
            if ($search) {
                $whereConditions[] = "(i.part_number LIKE ? OR i.name LIKE ? OR i.description LIKE ? OR i.client_name LIKE ?)";
                $searchTerm = "%$search%";
                $params[] = $searchTerm;
                $params[] = $searchTerm;
                $params[] = $searchTerm;
                $params[] = $searchTerm;
            }
            
            $whereClause = implode(" AND ", $whereConditions);
            
            // ✅ Get total count for pagination
            $countSql = "
                SELECT COUNT(DISTINCT i.part_number) as total
                FROM operations_items i
                WHERE $whereClause
            ";
            $countStmt = $pdo->prepare($countSql);
            $countStmt->execute($params);
            $totalItems = (int)$countStmt->fetch(PDO::FETCH_ASSOC)['total'];
            
            // ✅ Build ORDER BY clause
            $orderByClause = "ORDER BY ";
            
            // Special handling for priority
            if ($sort_by === 'priority') {
                $orderByClause .= "CASE i.priority 
                    WHEN 'High' THEN 1 
                    WHEN 'Medium' THEN 2 
                    WHEN 'Low' THEN 3 
                    ELSE 4 
                END " . $sort_order;
            } else {
                $orderByClause .= "i.$sort_by $sort_order";
            }
            
            // Add secondary sort
            if ($sort_by !== 'created_at') {
                $orderByClause .= ", i.created_at DESC";
            }
            
            // ✅ Get paginated items with filters applied
            $sql = "
                SELECT 
                    i.*,
                    COUNT(DISTINCT p.id) as phase_count,
                    COUNT(DISTINCT s.id) as subphase_count,
                    COUNT(DISTINCT CASE WHEN s.completed = 1 THEN s.id END) as completed_subphase_count
                FROM operations_items i
                LEFT JOIN operations_phases p ON i.part_number = p.item_part_number
                LEFT JOIN operations_subphases s ON p.id = s.phase_id
                WHERE $whereClause
                GROUP BY i.part_number 
                $orderByClause
                LIMIT ? OFFSET ?
            ";
            
            $params[] = $limit;
            $params[] = $offset;
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Calculate pagination metadata
            $totalPages = ceil($totalItems / $limit);
            
            sendSuccessResponse([
                'items' => $items,
                'pagination' => [
                    'current_page' => $page,
                    'per_page' => $limit,
                    'total_items' => $totalItems,
                    'total_pages' => $totalPages,
                    'has_next' => $page < $totalPages,
                    'has_previous' => $page > 1
                ],
                'sorting' => [
                    'sort_by' => $sort_by,
                    'sort_order' => $sort_order
                ],
                'filters_applied' => [
                    'status' => $status,
                    'priority' => $priority,
                    'client_name' => $client_name,
                    'search' => $search
                ]
            ]);
        }
    } catch (PDOException $e) {
        error_log("Error fetching items: " . $e->getMessage());
        sendErrorResponse('Failed to fetch items', 500);
    }
}

function createItem($pdo) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (empty($data['part_number']) || empty($data['name'])) {
            sendErrorResponse('Part number and name are required', 400);
            return;
        }
        
        // Check if part number already exists
        $stmt = $pdo->prepare("SELECT part_number FROM operations_items WHERE part_number = ?");
        $stmt->execute([$data['part_number']]);
        if ($stmt->fetch()) {
            sendErrorResponse('Part number already exists', 409);
            return;
        }
        
        $qty = $data['qty'] ?? 1;
        $total_qty = $data['total_qty'] ?? $qty;
        
        $stmt = $pdo->prepare("
            INSERT INTO operations_items (part_number, name, description, client_name, priority, remarks, qty, total_qty, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'not_started')
        ");
        
        $stmt->execute([
            $data['part_number'],
            $data['name'],
            $data['description'] ?? null,
            $data['client_name'] ?? null,
            $data['priority'] ?? 'Medium',
            $data['remarks'] ?? null,
            $qty,
            $total_qty
        ]);
        
        // Log audit WITH user information
        logAudit(
            $pdo, 
            $data['part_number'], 
            null, 
            null, 
            'create', 
            'item', 
            null, 
            json_encode($data),
            $data['performed_by_uid'] ?? null,
            $data['performed_by_name'] ?? null
        );
        
        
        
              
        $socketEvents = getSocketEvents();
        $socketEvents->operationsItemCreated([
            'part_number' => $data['part_number'],
            'name' => $data['name'],
            'client_name' => $data['client_name'] ?? null,
            'priority' => $data['priority'] ?? 'Medium',
            'qty' => $qty,
            'created_at' => date('Y-m-d H:i:s')
        ]);
        
        sendSuccessResponse([
            'part_number' => $data['part_number'],
            'message' => 'Item created successfully'
        ], 201);
    } catch (PDOException $e) {
        error_log("Error creating item: " . $e->getMessage());
        sendErrorResponse('Failed to create item', 500);
    }
}

// Updated updateItem function to handle qty and total_qty
function updateItem($pdo) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        $partNumber = $_GET['part_number'] ?? null;
        
        if (!$partNumber) {
            sendErrorResponse('Part number is required', 400);
            return;
        }
        
        // Get old values for audit
        $stmt = $pdo->prepare("SELECT * FROM operations_items WHERE part_number = ?");
        $stmt->execute([$partNumber]);
        $oldItem = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$oldItem) {
            sendErrorResponse('Item not found', 404);
            return;
        }
        
        $updates = [];
        $params = [];
        
        if (isset($data['name'])) {
            $updates[] = "name = ?";
            $params[] = $data['name'];
        }
        
        if (isset($data['description'])) {
            $updates[] = "description = ?";
            $params[] = $data['description'];
        }
        
        if (isset($data['client_name'])) {
            $updates[] = "client_name = ?";
            $params[] = $data['client_name'];
        }
        
        if (isset($data['priority'])) {
            $updates[] = "priority = ?";
            $params[] = $data['priority'];
        }
        
        if (isset($data['remarks'])) {
            $updates[] = "remarks = ?";
            $params[] = $data['remarks'];
        }
        
        if (isset($data['qty'])) {
            $updates[] = "qty = ?";
            $params[] = $data['qty'];
        }
        
        if (isset($data['total_qty'])) {
            $updates[] = "total_qty = ?";
            $params[] = $data['total_qty'];
        }
        
        if (isset($data['status'])) {
            $updates[] = "status = ?";
            $params[] = $data['status'];
            
            if ($data['status'] === 'completed') {
                $updates[] = "completed_at = NOW()";
            }
        }
        
        if (isset($data['overall_progress'])) {
            $updates[] = "overall_progress = ?";
            $params[] = $data['overall_progress'];
        }
        
        if (empty($updates)) {
            sendErrorResponse('No updates provided', 400);
            return;
        }
        
        $params[] = $partNumber;
        
        $sql = "UPDATE operations_items SET " . implode(", ", $updates) . " WHERE part_number = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        // Log audit
        logAudit($pdo, $partNumber, null, null, 'update', 'item', json_encode($oldItem), json_encode($data), null, null);
        
        // After successful update, BEFORE sendSuccessResponse:
        $socketEvents = getSocketEvents();
        $socketEvents->operationsItemUpdated([
            'part_number' => $partNumber,
            'updated_fields' => array_keys($data)
        ]);
        
        sendSuccessResponse(['message' => 'Item updated successfully']);
    } catch (PDOException $e) {
        error_log("Error updating item: " . $e->getMessage());
        sendErrorResponse('Failed to update item', 500);
    }
}

function updateItemTotalQty($pdo, $partNumber) {
    try {
        $stmt = $pdo->prepare("SELECT qty FROM operations_items WHERE part_number = ?");
        $stmt->execute([$partNumber]);
        $item = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$item) {
            return;
        }
        
        // Sum all current_completed_quantity from subphases
        $stmt = $pdo->prepare("
            SELECT SUM(current_completed_quantity) as total_completed
            FROM operations_subphases
            WHERE item_part_number = ?
        ");
        $stmt->execute([$partNumber]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        $totalCompleted = (int)($result['total_completed'] ?? 0);
        
        // Update total_qty with current completed quantity
        $stmt = $pdo->prepare("UPDATE operations_items SET total_qty = ? WHERE part_number = ?");
        $stmt->execute([$totalCompleted, $partNumber]);
        
        error_log("Updated total_qty for {$partNumber}: {$totalCompleted}");
    } catch (PDOException $e) {
        error_log("Error updating item total_qty: " . $e->getMessage());
    }
}

// Add new endpoint for updating current completed quantity
function updateSubphaseCompletedQuantity($pdo) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        $subphaseId = $_GET['id'] ?? null;
        
        if (!$subphaseId || !isset($data['current_completed_quantity'])) {
            sendErrorResponse('Subphase ID and current_completed_quantity are required', 400);
            return;
        }
        
        // Get subphase
        $stmt = $pdo->prepare("SELECT * FROM operations_subphases WHERE id = ?");
        $stmt->execute([$subphaseId]);
        $subphase = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$subphase) {
            sendErrorResponse('Subphase not found', 404);
            return;
        }
        
        $newQuantity = intval($data['current_completed_quantity']);
        
        // Update current completed quantity
        $stmt = $pdo->prepare("
            UPDATE operations_subphases 
            SET current_completed_quantity = ? 
            WHERE id = ?
        ");
        $stmt->execute([$newQuantity, $subphaseId]);
        
        // Update item's total_qty
        updateItemTotalQty($pdo, $subphase['item_part_number']);
        
        // Update phase and item progress
        updatePhaseProgress($pdo, $subphase['phase_id']);
        updateItemProgress($pdo, $subphase['item_part_number']);
        
        // Log audit
        logAudit($pdo, $subphase['item_part_number'], $subphase['phase_id'], $subphaseId, 'update', 'subphase',
                 json_encode(['current_completed_quantity' => $subphase['current_completed_quantity']]),
                 json_encode(['current_completed_quantity' => $newQuantity]));
        
        sendSuccessResponse(['message' => 'Completed quantity updated successfully']);
    } catch (PDOException $e) {
        error_log("Error updating completed quantity: " . $e->getMessage());
        sendErrorResponse('Failed to update completed quantity', 500);
    }
}

function deleteItem($pdo) {
    try {
        $partNumber = $_GET['part_number'] ?? null;
        
        if (!$partNumber) {
            sendErrorResponse('Part number is required', 400);
            return;
        }
        
        // Get item for audit
        $stmt = $pdo->prepare("SELECT * FROM operations_items WHERE part_number = ?");
        $stmt->execute([$partNumber]);
        $item = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$item) {
            sendErrorResponse('Item not found', 404);
            return;
        }
        
        // Delete item (cascades to phases and subphases)
        $stmt = $pdo->prepare("DELETE FROM operations_items WHERE part_number = ?");
        $stmt->execute([$partNumber]);
        
        // Log audit
        logAudit($pdo, $partNumber, null, null, 'delete', 'item', json_encode($item), null, null, null);
        
        // After successful delete, BEFORE sendSuccessResponse:
        $socketEvents = getSocketEvents();
        $socketEvents->operationsItemDeleted([
            'part_number' => $partNumber
        ]);
        
        sendSuccessResponse(['message' => 'Item deleted successfully']);
    } catch (PDOException $e) {
        error_log("Error deleting item: " . $e->getMessage());
        sendErrorResponse('Failed to delete item', 500);
    }
}

// ==================== PHASE FUNCTIONS ====================

function getPhases($pdo) {
    try {
        $partNumber = $_GET['part_number'] ?? null;
        $phaseId = $_GET['id'] ?? null;
        
        if ($phaseId) {
            $stmt = $pdo->prepare("
                SELECT 
                    p.*,
                    COUNT(DISTINCT s.id) as subphase_count,
                    COUNT(DISTINCT CASE WHEN s.completed = 1 THEN s.id END) as completed_count
                FROM operations_phases p
                LEFT JOIN operations_subphases s ON p.id = s.phase_id
                WHERE p.id = ?
                GROUP BY p.id
            ");
            $stmt->execute([$phaseId]);
            $phase = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$phase) {
                sendErrorResponse('Phase not found', 404);
                return;
            }
            
            sendSuccessResponse($phase);
        } elseif ($partNumber) {
            $stmt = $pdo->prepare("
                SELECT 
                    p.*,
                    COUNT(DISTINCT s.id) as subphase_count,
                    COUNT(DISTINCT CASE WHEN s.completed = 1 THEN s.id END) as completed_count
                FROM operations_phases p
                LEFT JOIN operations_subphases s ON p.id = s.phase_id
                WHERE p.item_part_number = ?
                GROUP BY p.id
                ORDER BY p.phase_order
            ");
            $stmt->execute([$partNumber]);
            $phases = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            sendSuccessResponse($phases);
        } else {
            sendErrorResponse('Part number or Phase ID is required', 400);
        }
    } catch (PDOException $e) {
        error_log("Error fetching phases: " . $e->getMessage());
        sendErrorResponse('Failed to fetch phases', 500);
    }
}

function createPhase($pdo) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (empty($data['part_number']) || empty($data['name'])) {
            sendErrorResponse('Part number and phase name are required', 400);
            return;
        }
        
        // Verify item exists
        $stmt = $pdo->prepare("SELECT part_number FROM operations_items WHERE part_number = ?");
        $stmt->execute([$data['part_number']]);
        if (!$stmt->fetch()) {
            sendErrorResponse('Item not found', 404);
            return;
        }
        
        // Get max phase_order for this item
        $stmt = $pdo->prepare("SELECT MAX(phase_order) as max_order FROM operations_phases WHERE item_part_number = ?");
        $stmt->execute([$data['part_number']]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $phaseOrder = ($result['max_order'] ?? 0) + 1;
        
        $stmt = $pdo->prepare("
            INSERT INTO operations_phases (item_part_number, name, phase_order, start_time, pause_time, end_time)
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $data['part_number'],
            $data['name'],
            $phaseOrder,
            $data['start_time'] ?? null,
            $data['pause_time'] ?? null,
            $data['end_time'] ?? null
        ]);
        
        $phaseId = $pdo->lastInsertId();
        
        // Log audit
        logAudit($pdo, $data['part_number'], $phaseId, null, 'create', 'phase', null, json_encode($data), null, null);
        
        // AFTER getting phaseId, BEFORE sendSuccessResponse:
        $socketEvents = getSocketEvents();
        $socketEvents->operationsPhaseCreated([
            'part_number' => $data['part_number'],
            'phase_id' => $phaseId,
            'phase_name' => $data['name']
        ]);
        
        sendSuccessResponse([
            'id' => $phaseId,
            'message' => 'Phase created successfully'
        ], 201);
    } catch (PDOException $e) {
        error_log("Error creating phase: " . $e->getMessage());
        sendErrorResponse('Failed to create phase', 500);
    }
}
function updatePhase($pdo) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        $phaseId = $_GET['id'] ?? null;
        
        if (!$phaseId) {
            sendErrorResponse('Phase ID is required', 400);
            return;
        }
        
        // Get old values
        $stmt = $pdo->prepare("SELECT * FROM operations_phases WHERE id = ?");
        $stmt->execute([$phaseId]);
        $oldPhase = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$oldPhase) {
            sendErrorResponse('Phase not found', 404);
            return;
        }
        
        $updates = [];
        $params = [];
        
        if (isset($data['name'])) {
            $updates[] = "name = ?";
            $params[] = $data['name'];
        }
        
        if (isset($data['phase_order'])) {
            $updates[] = "phase_order = ?";
            $params[] = $data['phase_order'];
        }
        
        if (isset($data['progress'])) {
            $updates[] = "progress = ?";
            $params[] = $data['progress'];
        }
        
        if (isset($data['start_time'])) {
            $updates[] = "start_time = ?";
            $params[] = $data['start_time'];
        }
        
        if (isset($data['pause_time'])) {
            $updates[] = "pause_time = ?";
            $params[] = $data['pause_time'];
        }
        
        if (isset($data['end_time'])) {
            $updates[] = "end_time = ?";
            $params[] = $data['end_time'];
        }
        
        if (empty($updates)) {
            sendErrorResponse('No updates provided', 400);
            return;
        }
        
        $params[] = $phaseId;
        
        $sql = "UPDATE operations_phases SET " . implode(", ", $updates) . " WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        // Update item progress
        updateItemProgress($pdo, $oldPhase['item_part_number']);
        
        // Log audit
        logAudit($pdo, $oldPhase['item_part_number'], $phaseId, null, 'update', 'phase', json_encode($oldPhase), json_encode($data), null, null);
        
        // After successful update:
        $socketEvents = getSocketEvents();
        $socketEvents->operationsPhaseUpdated([
            'part_number' => $oldPhase['item_part_number'],
            'phase_id' => $phaseId
        ]);
        
        sendSuccessResponse(['message' => 'Phase updated successfully']);
    } catch (PDOException $e) {
        error_log("Error updating phase: " . $e->getMessage());
        sendErrorResponse('Failed to update phase', 500);
    }
}

function deletePhase($pdo) {
    try {
        $phaseId = $_GET['id'] ?? null;
        
        if (!$phaseId) {
            sendErrorResponse('Phase ID is required', 400);
            return;
        }
        
        // Get phase for audit
        $stmt = $pdo->prepare("SELECT * FROM operations_phases WHERE id = ?");
        $stmt->execute([$phaseId]);
        $phase = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$phase) {
            sendErrorResponse('Phase not found', 404);
            return;
        }
        
        $partNumber = $phase['item_part_number'];
        
        // Delete phase (cascades to subphases)
        $stmt = $pdo->prepare("DELETE FROM operations_phases WHERE id = ?");
        $stmt->execute([$phaseId]);
        
        // Update item progress
        updateItemProgress($pdo, $partNumber);
        
        // Log audit
        logAudit($pdo, $partNumber, $phaseId, null, 'delete', 'phase', json_encode($phase), null);
        
        sendSuccessResponse(['message' => 'Phase deleted successfully']);
    } catch (PDOException $e) {
        error_log("Error deleting phase: " . $e->getMessage());
        sendErrorResponse('Failed to delete phase', 500);
    }
}

// ==================== SUBPHASE FUNCTIONS ====================

function getSubphases($pdo) {
    try {
        $phaseId = $_GET['phase_id'] ?? null;
        $subphaseId = $_GET['id'] ?? null;
        
        if ($subphaseId) {
            $stmt = $pdo->prepare("SELECT * FROM operations_subphases WHERE id = ?");
            $stmt->execute([$subphaseId]);
            $subphase = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$subphase) {
                sendErrorResponse('Subphase not found', 404);
                return;
            }
            
            sendSuccessResponse($subphase);
        } elseif ($phaseId) {
            $stmt = $pdo->prepare("
                SELECT * FROM operations_subphases
                WHERE phase_id = ?
                ORDER BY subphase_order
            ");
            $stmt->execute([$phaseId]);
            $subphases = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            sendSuccessResponse($subphases);
        } else {
            sendErrorResponse('Phase ID or Subphase ID is required', 400);
        }
    } catch (PDOException $e) {
        error_log("Error fetching subphases: " . $e->getMessage());
        sendErrorResponse('Failed to fetch subphases', 500);
    }
}

// Updated createSubphase function - Replace the existing one
function createSubphase($pdo) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (empty($data['part_number']) || empty($data['phase_id']) || empty($data['name'])) {
            sendErrorResponse('part_number, phase_id, and name are required', 400);
            return;
        }
        
        // Verify item and phase exist
        $stmt = $pdo->prepare("
            SELECT p.id FROM operations_phases p
            JOIN operations_items i ON p.item_part_number = i.part_number
            WHERE p.id = ? AND i.part_number = ?
        ");
        $stmt->execute([$data['phase_id'], $data['part_number']]);
        if (!$stmt->fetch()) {
            sendErrorResponse('Phase not found or does not belong to specified item', 404);
            return;
        }
        
        // Get max subphase_order
        $stmt = $pdo->prepare("SELECT MAX(subphase_order) as max_order FROM operations_subphases WHERE phase_id = ?");
        $stmt->execute([$data['phase_id']]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $subphaseOrder = ($result['max_order'] ?? 0) + 1;
        
        $expectedQuantity = isset($data['expected_quantity']) ? intval($data['expected_quantity']) : 0;
        $currentCompletedQuantity = isset($data['current_completed_quantity']) ? intval($data['current_completed_quantity']) : 0;
        
        $stmt = $pdo->prepare("
            INSERT INTO operations_subphases (
                item_part_number, phase_id, name, time_duration, 
                subphase_order, expected_duration, expected_quantity, current_completed_quantity
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
$stmt->execute([
    $data['part_number'],
    $data['phase_id'],
    $data['name'],
    $data['time_duration'] ?? 0,  // Now expects integer seconds
    $subphaseOrder,
    $data['expected_duration'] ?? 0,
    $expectedQuantity,
    $currentCompletedQuantity
]);
        
        $subphaseId = $pdo->lastInsertId();
        
        // Update item's total_qty based on current completed quantities
        updateItemTotalQty($pdo, $data['part_number']);
        
        logAudit($pdo, $data['part_number'], $data['phase_id'], $subphaseId, 'create', 'subphase', null, json_encode($data));
        
        sendSuccessResponse([
            'id' => $subphaseId,
            'message' => 'Subphase created successfully'
        ], 201);
    } catch (PDOException $e) {
        error_log("Error creating subphase: " . $e->getMessage());
        sendErrorResponse('Failed to create subphase', 500);
    }
}


// Updated updateSubphase function - Replace the existing one
function updateSubphase($pdo) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        $subphaseId = $_GET['id'] ?? null;
        
        if (!$subphaseId) {
            sendErrorResponse('Subphase ID is required', 400);
            return;
        }
        
        // Get old values
        $stmt = $pdo->prepare("SELECT * FROM operations_subphases WHERE id = ?");
        $stmt->execute([$subphaseId]);
        $oldSubphase = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$oldSubphase) {
            sendErrorResponse('Subphase not found', 404);
            return;
        }
        
        $updates = [];
        $params = [];
        $expectedQuantityChanged = false;
        
        if (isset($data['name'])) {
            $updates[] = "name = ?";
            $params[] = $data['name'];
        }
        
        // CHANGED: from condition to time_duration
        if (isset($data['time_duration'])) {
            $updates[] = "time_duration = ?";
            $params[] = $data['time_duration'];
        }
        
        if (isset($data['expected_duration'])) {
            $updates[] = "expected_duration = ?";
            $params[] = $data['expected_duration'];
        }
        
        if (isset($data['expected_quantity'])) {
            $updates[] = "expected_quantity = ?";
            $params[] = $data['expected_quantity'];
            $expectedQuantityChanged = true;
        }
        
        if (isset($data['actual_hours'])) {
            $updates[] = "actual_hours = ?";
            $params[] = $data['actual_hours'];
        }
        
        if (isset($data['subphase_order'])) {
            $updates[] = "subphase_order = ?";
            $params[] = $data['subphase_order'];
        }
        
        if (empty($updates)) {
            sendErrorResponse('No updates provided', 400);
            return;
        }
        
        $params[] = $subphaseId;
        
        $sql = "UPDATE operations_subphases SET " . implode(", ", $updates) . " WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        // If expected_quantity changed, update item's total_qty
        if ($expectedQuantityChanged) {
            updateItemTotalQty($pdo, $oldSubphase['item_part_number']);
        }
        
        // Update phase and item progress
        updatePhaseProgress($pdo, $oldSubphase['phase_id']);
        updateItemProgress($pdo, $oldSubphase['item_part_number']);
        
        // Log audit
        logAudit($pdo, $oldSubphase['item_part_number'], $oldSubphase['phase_id'], $subphaseId, 'update', 'subphase', json_encode($oldSubphase), json_encode($data));
        
        sendSuccessResponse(['message' => 'Subphase updated successfully']);
    } catch (PDOException $e) {
        error_log("Error updating subphase: " . $e->getMessage());
        sendErrorResponse('Failed to update subphase', 500);
    }
}

// Updated deleteSubphase function
function deleteSubphase($pdo) {
    try {
        $subphaseId = $_GET['id'] ?? null;
        
        if (!$subphaseId) {
            sendErrorResponse('Subphase ID is required', 400);
            return;
        }
        
        // Get subphase for audit
        $stmt = $pdo->prepare("SELECT * FROM operations_subphases WHERE id = ?");
        $stmt->execute([$subphaseId]);
        $subphase = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$subphase) {
            sendErrorResponse('Subphase not found', 404);
            return;
        }
        
        $partNumber = $subphase['item_part_number'];
        $phaseId = $subphase['phase_id'];
        
        // Delete subphase
        $stmt = $pdo->prepare("DELETE FROM operations_subphases WHERE id = ?");
        $stmt->execute([$subphaseId]);
        
        // Update item's total_qty after deletion
        updateItemTotalQty($pdo, $partNumber);
        
        // Update phase and item progress
        updatePhaseProgress($pdo, $phaseId);
        updateItemProgress($pdo, $partNumber);
        
        // Log audit
        logAudit($pdo, $partNumber, $phaseId, $subphaseId, 'delete', 'subphase', json_encode($subphase), null);
        
        sendSuccessResponse(['message' => 'Subphase deleted successfully']);
    } catch (PDOException $e) {
        error_log("Error deleting subphase: " . $e->getMessage());
        sendErrorResponse('Failed to delete subphase', 500);
    }
}

// ==================== ACTION FUNCTIONS ====================

// UPDATED completeSubphase function with frontend-calculated time_duration
function completeSubphase($pdo) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        $subphaseId = $data['subphase_id'] ?? null;
        $completed = $data['completed'] ?? true;
        $timeDuration = $data['time_duration'] ?? null; // NEW: Accept from frontend
        
        if (!$subphaseId) {
            sendErrorResponse('Subphase ID is required', 400);
            return;
        }
        
        // Get subphase info
        $stmt = $pdo->prepare("
            SELECT s.*, p.start_time as phase_start_time 
            FROM operations_subphases s
            JOIN operations_phases p ON s.phase_id = p.id
            WHERE s.id = ?
        ");
        $stmt->execute([$subphaseId]);
        $subphase = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$subphase) {
            sendErrorResponse('Subphase not found', 404);
            return;
        }
        
        // Use frontend-calculated time_duration if provided, otherwise keep existing
        if ($timeDuration === null) {
            $timeDuration = $subphase['time_duration'];
        }
        
        // If uncompleting, reset time_duration to 0
        if (!$completed) {
            $timeDuration = 0;
        }
        
        // Update completion status and time_duration
        $stmt = $pdo->prepare("
            UPDATE operations_subphases 
            SET completed = ?, 
                completed_at = ?,
                time_duration = ?
            WHERE id = ?
        ");
        
        $completedAt = $completed ? date('Y-m-d H:i:s') : null;
        $stmt->execute([
            $completed ? 1 : 0, 
            $completedAt,
            $timeDuration,
            $subphaseId
        ]);
        
        // Update phase and item progress
        updatePhaseProgress($pdo, $subphase['phase_id']);
        updateItemProgress($pdo, $subphase['item_part_number']);
        
        // Log audit
        logAudit(
            $pdo, 
            $subphase['item_part_number'], 
            $subphase['phase_id'], 
            $subphaseId, 
            'complete', 
            'subphase', 
            json_encode([
                'completed' => $subphase['completed'],
                'time_duration' => $subphase['time_duration']
            ]), 
            json_encode([
                'completed' => $completed,
                'time_duration' => $timeDuration
            ])
        );
        
        $socketEvents = getSocketEvents();
        $socketEvents->operationsSubphaseCompleted([
            'part_number' => $subphase['item_part_number'],
            'phase_id' => $subphase['phase_id'],
            'subphase_id' => $subphaseId,
            'completed' => $completed,
            'time_duration' => $timeDuration
        ]);
        
        sendSuccessResponse([
            'message' => 'Subphase completion status updated',
            'time_duration' => $timeDuration
        ]);
    } catch (PDOException $e) {
        error_log("Error completing subphase: " . $e->getMessage());
        sendErrorResponse('Failed to complete subphase', 500);
    }
}


function assignEmployee($pdo) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        $subphaseId = $data['subphase_id'] ?? null;
        $employeeBarcode = $data['employee_barcode'] ?? null;
        
        if (!$subphaseId || !$employeeBarcode) {
            sendErrorResponse('Subphase ID and employee barcode are required', 400);
            return;
        }
        
        // Get employee info
        $stmt = $pdo->prepare("
            SELECT uid, CONCAT(first_name, ' ', last_name) as name
            FROM emp_list 
            WHERE id_barcode = ? OR id_number = ?
        ");
        $stmt->execute([$employeeBarcode, $employeeBarcode]);
        $employee = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$employee) {
            sendErrorResponse('Employee not found', 404);
            return;
        }
        
        // Get subphase
        $stmt = $pdo->prepare("SELECT * FROM operations_subphases WHERE id = ?");
        $stmt->execute([$subphaseId]);
        $subphase = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$subphase) {
            sendErrorResponse('Subphase not found', 404);
            return;
        }
        
        // Update subphase with employee info
        $stmt = $pdo->prepare("
            UPDATE operations_subphases 
            SET employee_barcode = ?,
                employee_name = ?,
                employee_uid = ?
            WHERE id = ?
        ");
        
        $stmt->execute([
            $employeeBarcode,
            $employee['name'],
            $employee['uid'],
            $subphaseId
        ]);
        
        // Log audit
        logAudit($pdo, $subphase['item_part_number'], $subphase['phase_id'], $subphaseId, 'assign', 'subphase',
                 json_encode(['employee_barcode' => $subphase['employee_barcode']]),
                 json_encode(['employee_barcode' => $employeeBarcode, 'employee_name' => $employee['name']]));
        
        $socketEvents = getSocketEvents();
        $socketEvents->operationsEmployeeAssigned([
            'part_number' => $subphase['item_part_number'],
            'phase_id' => $subphase['phase_id'],
            'subphase_id' => $subphaseId,
            'employee_barcode' => $employeeBarcode,
            'employee_name' => $employee['name'],
            'employee_uid' => $employee['uid']
        ]);
        
        sendSuccessResponse([
            'message' => 'Employee assigned successfully',
            'employee' => $employee
        ]);
    } catch (PDOException $e) {
        error_log("Error assigning employee: " . $e->getMessage());
        sendErrorResponse('Failed to assign employee', 500);
    }
}

// ==================== REPORTING FUNCTIONS ====================

function getStatistics($pdo) {
    try {
        $stats = [];
        
        // Total items by status
        $stmt = $pdo->query("
            SELECT status, COUNT(*) as count 
            FROM operations_items 
            GROUP BY status
        ");
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $stats['items_by_status'][$row['status']] = (int)$row['count'];
        }
        
        // Overall statistics
        $stmt = $pdo->query("
            SELECT 
                COUNT(DISTINCT i.part_number) as total_items,
                COUNT(DISTINCT p.id) as total_phases,
                COUNT(DISTINCT s.id) as total_subphases,
                COUNT(DISTINCT CASE WHEN s.completed = 1 THEN s.id END) as completed_subphases,
                AVG(i.overall_progress) as avg_progress,
                COUNT(DISTINCT CASE WHEN i.status = 'completed' THEN i.part_number END) as completed_items,
                COUNT(DISTINCT CASE WHEN i.status = 'in_progress' THEN i.part_number END) as in_progress_items,
                COUNT(DISTINCT CASE WHEN i.status = 'not_started' THEN i.part_number END) as not_started_items
            FROM operations_items i
            LEFT JOIN operations_phases p ON i.part_number = p.item_part_number
            LEFT JOIN operations_subphases s ON p.id = s.phase_id
        ");
        $overallStats = $stmt->fetch(PDO::FETCH_ASSOC);
        $stats['overall'] = $overallStats;
        
        // Employee performance - FIXED: removed actual_hours from subphases
        $stmt = $pdo->query("
            SELECT 
                employee_uid,
                employee_name,
                COUNT(*) as tasks_assigned,
                COUNT(CASE WHEN completed = 1 THEN 1 END) as tasks_completed,
                SUM(expected_duration) as total_expected_hours,
                SUM(CASE WHEN completed = 1 THEN expected_duration ELSE 0 END) as completed_expected_hours
            FROM operations_subphases 
            WHERE employee_uid IS NOT NULL
            GROUP BY employee_uid, employee_name
            ORDER BY tasks_completed DESC
            LIMIT 10
        ");
        $stats['top_performers'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Time statistics from phases (where actual_hours exists)
        $stmt = $pdo->query("
            SELECT 
                SUM(s.expected_duration) as total_expected_hours,
                AVG(p.actual_hours) as avg_actual_hours,
                SUM(p.actual_hours) as total_actual_hours
            FROM operations_phases p
            LEFT JOIN operations_subphases s ON p.id = s.phase_id
        ");
        $timeStats = $stmt->fetch(PDO::FETCH_ASSOC);
        $stats['time_statistics'] = $timeStats;
        
        // Phase timing statistics
        $stmt = $pdo->query("
            SELECT 
                COUNT(*) as total_phases_with_timing,
                COUNT(CASE WHEN start_time IS NOT NULL THEN 1 END) as phases_started,
                COUNT(CASE WHEN end_time IS NOT NULL THEN 1 END) as phases_completed,
                COUNT(CASE WHEN pause_time IS NOT NULL THEN 1 END) as phases_paused,
                AVG(CASE WHEN paused_duration > 0 THEN paused_duration END) as avg_pause_duration,
                SUM(paused_duration) as total_pause_duration
            FROM operations_phases
        ");
        $phaseTimingStats = $stmt->fetch(PDO::FETCH_ASSOC);
        $stats['phase_timing'] = $phaseTimingStats;
        
        sendSuccessResponse($stats);
    } catch (PDOException $e) {
        error_log("Error fetching statistics: " . $e->getMessage());
        sendErrorResponse('Failed to fetch statistics', 500);
    }
}

function getAuditLog($pdo) {
    try {
        $partNumber = $_GET['part_number'] ?? null;
        $limit = $_GET['limit'] ?? 100;
        $offset = $_GET['offset'] ?? 0;
        
        $sql = "
            SELECT 
                al.*,
                i.name as item_name,
                p.name as phase_name,
                s.name as subphase_name
            FROM operations_audit_log al
            LEFT JOIN operations_items i ON al.item_part_number = i.part_number
            LEFT JOIN operations_phases p ON al.phase_id = p.id
            LEFT JOIN operations_subphases s ON al.subphase_id = s.id
            WHERE 1=1
        ";
        
        $params = [];
        
        if ($partNumber) {
            $sql .= " AND al.item_part_number = ?";
            $params[] = $partNumber;
        }
        
        $sql .= " ORDER BY al.created_at DESC LIMIT ? OFFSET ?";
        $params[] = (int)$limit;
        $params[] = (int)$offset;
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Get total count
        $countSql = "SELECT COUNT(*) as total FROM operations_audit_log WHERE 1=1";
        if ($partNumber) {
            $countSql .= " AND item_part_number = ?";
            $countStmt = $pdo->prepare($countSql);
            $countStmt->execute([$partNumber]);
        } else {
            $countStmt = $pdo->query($countSql);
        }
        $total = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];
        
        sendSuccessResponse([
            'logs' => $logs,
            'total' => (int)$total,
            'limit' => (int)$limit,
            'offset' => (int)$offset
        ]);
    } catch (PDOException $e) {
        error_log("Error fetching audit log: " . $e->getMessage());
        sendErrorResponse('Failed to fetch audit log', 500);
    }
}

function getEmployeePerformance($pdo) {
    try {
        $employeeUid = $_GET['employee_uid'] ?? null;
        
        if ($employeeUid) {
            // Get specific employee performance
            $stmt = $pdo->prepare("
                SELECT 
                    s.employee_uid,
                    s.employee_name,
                    COUNT(*) as total_tasks,
                    COUNT(CASE WHEN s.completed = 1 THEN 1 END) as completed_tasks,
                    COUNT(CASE WHEN s.completed = 0 THEN 1 END) as pending_tasks,
                    AVG(s.actual_hours) as avg_hours,
                    SUM(s.expected_duration) as total_expected_hours,
                    SUM(s.actual_hours) as total_actual_hours,
                    COUNT(CASE WHEN s.completed = 1 AND s.actual_hours <= s.expected_duration THEN 1 END) as on_time_tasks,
                    COUNT(CASE WHEN s.completed = 1 AND s.actual_hours > s.expected_duration THEN 1 END) as late_tasks
                FROM operations_subphases s
                WHERE s.employee_uid = ?
                GROUP BY s.employee_uid, s.employee_name
            ");
            $stmt->execute([$employeeUid]);
            $performance = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$performance) {
                sendErrorResponse('No performance data found for employee', 404);
                return;
            }
            
            // Get recent tasks
            $stmt = $pdo->prepare("
                SELECT 
                    s.*,
                    i.name as item_name,
                    i.part_number,
                    p.name as phase_name
                FROM operations_subphases s
                JOIN operations_phases p ON s.phase_id = p.id
                JOIN operations_items i ON s.item_part_number = i.part_number
                WHERE s.employee_uid = ?
                ORDER BY s.updated_at DESC
                LIMIT 20
            ");
            $stmt->execute([$employeeUid]);
            $performance['recent_tasks'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            sendSuccessResponse($performance);
        } else {
            // Get all employees performance
            $stmt = $pdo->query("
                SELECT 
                    s.employee_uid,
                    s.employee_name,
                    COUNT(*) as total_tasks,
                    COUNT(CASE WHEN s.completed = 1 THEN 1 END) as completed_tasks,
                    COUNT(CASE WHEN s.completed = 0 THEN 1 END) as pending_tasks,
                    AVG(s.actual_hours) as avg_hours,
                    SUM(s.expected_duration) as total_expected_hours,
                    SUM(s.actual_hours) as total_actual_hours,
                    COUNT(CASE WHEN s.completed = 1 AND s.actual_hours <= s.expected_duration THEN 1 END) as on_time_tasks,
                    COUNT(CASE WHEN s.completed = 1 AND s.actual_hours > s.expected_duration THEN 1 END) as late_tasks,
                    ROUND((COUNT(CASE WHEN s.completed = 1 AND s.actual_hours <= s.expected_duration THEN 1 END) * 100.0 / 
                           NULLIF(COUNT(CASE WHEN s.completed = 1 THEN 1 END), 0)), 2) as on_time_percentage
                FROM operations_subphases s
                WHERE s.employee_uid IS NOT NULL
                GROUP BY s.employee_uid, s.employee_name
                ORDER BY completed_tasks DESC, on_time_percentage DESC
            ");
            $employees = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            sendSuccessResponse($employees);
        }
    } catch (PDOException $e) {
        error_log("Error fetching employee performance: " . $e->getMessage());
        sendErrorResponse('Failed to fetch employee performance', 500);
    }
}

function getProgressReport($pdo) {
    try {
        $partNumber = $_GET['part_number'] ?? null;
        $format = $_GET['format'] ?? 'json'; // json, summary, detailed
        
        if ($partNumber) {
            // Get specific item report
            $stmt = $pdo->prepare("
                SELECT 
                    i.*,
                    COUNT(DISTINCT p.id) as total_phases,
                    COUNT(DISTINCT s.id) as total_subphases,
                    COUNT(DISTINCT CASE WHEN s.completed = 1 THEN s.id END) as completed_subphases,
                    SUM(s.expected_duration) as total_expected_hours,
                    SUM(s.actual_hours) as total_actual_hours
                FROM operations_items i
                LEFT JOIN operations_phases p ON i.part_number = p.item_part_number
                LEFT JOIN operations_subphases s ON p.id = s.phase_id
                WHERE i.part_number = ?
                GROUP BY i.part_number
            ");
            $stmt->execute([$partNumber]);
            $report = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$report) {
                sendErrorResponse('Item not found', 404);
                return;
            }
            
            // Get phases with progress
            $stmt = $pdo->prepare("
                SELECT 
                    p.*,
                    COUNT(s.id) as total_subphases,
                    COUNT(CASE WHEN s.completed = 1 THEN s.id END) as completed_subphases,
                    SUM(s.expected_duration) as expected_hours,
                    SUM(s.actual_hours) as actual_hours,
                    ROUND((COUNT(CASE WHEN s.completed = 1 THEN s.id END) * 100.0 / NULLIF(COUNT(s.id), 0)), 2) as completion_percentage
                FROM operations_phases p
                LEFT JOIN operations_subphases s ON p.id = s.phase_id
                WHERE p.item_part_number = ?
                GROUP BY p.id
                ORDER BY p.phase_order
            ");
            $stmt->execute([$partNumber]);
            $report['phases'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Get subphases if detailed format
            if ($format === 'detailed') {
                foreach ($report['phases'] as &$phase) {
                    $stmt = $pdo->prepare("
                        SELECT * FROM operations_subphases
                        WHERE phase_id = ?
                        ORDER BY subphase_order
                    ");
                    $stmt->execute([$phase['id']]);
                    $phase['subphases'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
                }
            }
            
            sendSuccessResponse($report);
        } else {
            // Get all items summary report
            $stmt = $pdo->query("
                SELECT 
                    i.*,
                    COUNT(DISTINCT p.id) as total_phases,
                    COUNT(DISTINCT s.id) as total_subphases,
                    COUNT(DISTINCT CASE WHEN s.completed = 1 THEN s.id END) as completed_subphases,
                    ROUND((COUNT(DISTINCT CASE WHEN s.completed = 1 THEN s.id END) * 100.0 / 
                           NULLIF(COUNT(DISTINCT s.id), 0)), 2) as completion_percentage,
                    SUM(s.expected_duration) as total_expected_hours,
                    SUM(s.actual_hours) as total_actual_hours
                FROM operations_items i
                LEFT JOIN operations_phases p ON i.part_number = p.item_part_number
                LEFT JOIN operations_subphases s ON p.id = s.phase_id
                GROUP BY i.part_number
                ORDER BY i.created_at DESC
            ");
            $reports = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            sendSuccessResponse($reports);
        }
    } catch (PDOException $e) {
        error_log("Error fetching progress report: " . $e->getMessage());
        sendErrorResponse('Failed to fetch progress report', 500);
    }
}

// ==================== HELPER FUNCTIONS ====================

function updatePhaseProgress($pdo, $phaseId) {
    try {
        $stmt = $pdo->prepare("
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN completed = 1 THEN 1 END) as completed
            FROM operations_subphases
            WHERE phase_id = ?
        ");
        $stmt->execute([$phaseId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        $progress = $result['total'] > 0 ? ($result['completed'] / $result['total']) * 100 : 0;
        
        $stmt = $pdo->prepare("UPDATE operations_phases SET progress = ? WHERE id = ?");
        $stmt->execute([$progress, $phaseId]);
    } catch (PDOException $e) {
        error_log("Error updating phase progress: " . $e->getMessage());
    }
}

function updateItemProgress($pdo, $partNumber) {
    try {
        // Calculate overall progress from phases
        $stmt = $pdo->prepare("
            SELECT AVG(progress) as avg_progress
            FROM operations_phases
            WHERE item_part_number = ?
        ");
        $stmt->execute([$partNumber]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        $progress = $result['avg_progress'] ?? 0;
        
        // Determine status based on progress
        $status = 'not_started';
        if ($progress >= 100) {
            $status = 'completed';
        } elseif ($progress > 0) {
            $status = 'in_progress';
        }
        
        $updates = "overall_progress = ?, status = ?";
        $params = [$progress, $status];
        
        if ($status === 'completed') {
            $updates .= ", completed_at = NOW()";
        }
        
        $params[] = $partNumber;
        
        $stmt = $pdo->prepare("UPDATE operations_items SET $updates WHERE part_number = ?");
        $stmt->execute($params);
    } catch (PDOException $e) {
        error_log("Error updating item progress: " . $e->getMessage());
    }
}

function logAudit($pdo, $partNumber, $phaseId, $subphaseId, $actionType, $entityType, $oldValue, $newValue, $performedByUid = null, $performedByName = null) {
    try {
        // If user info not provided, try to get from session
        if ($performedByUid === null && isset($_SESSION['user'])) {
            $performedByUid = $_SESSION['user']['uid'] ?? null;
            $performedByName = $_SESSION['user']['name'] ?? null;
        }
        
        $stmt = $pdo->prepare("
            INSERT INTO operations_audit_log (
                item_part_number, phase_id, subphase_id, 
                action_type, entity_type, 
                old_value, new_value,
                performed_by_uid, performed_by_name
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $partNumber,
            $phaseId,
            $subphaseId,
            $actionType,
            $entityType,
            $oldValue,
            $newValue,
            $performedByUid,
            $performedByName
        ]);
    } catch (PDOException $e) {
        error_log("Error logging audit: " . $e->getMessage());
    }
}

function startItemProcess($pdo) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        $partNumber = $data['part_number'] ?? null;
        $phaseId = $data['phase_id'] ?? null;
        
        if (!$partNumber || !$phaseId) {
            sendErrorResponse('Part number and phase ID are required', 400);
            return;
        }
        
        // Check if phase exists and belongs to item
        $stmt = $pdo->prepare("
            SELECT * FROM operations_phases 
            WHERE id = ? AND item_part_number = ?
        ");
        $stmt->execute([$phaseId, $partNumber]);
        $phase = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$phase) {
            sendErrorResponse('Phase not found or does not belong to item', 404);
            return;
        }
        
        // Check if already started
        if ($phase['start_time']) {
            sendErrorResponse('Phase already started', 400);
            return;
        }
        
        // Set start_time to current timestamp
        $stmt = $pdo->prepare("
            UPDATE operations_phases 
            SET start_time = NOW()
            WHERE id = ?
        ");
        $stmt->execute([$phaseId]);
        
        // Update item status if not already in progress
        $stmt = $pdo->prepare("
            UPDATE operations_items 
            SET status = 'in_progress'
            WHERE part_number = ? AND status = 'not_started'
        ");
        $stmt->execute([$partNumber]);
        
        // Log audit
        logAudit($pdo, $partNumber, $phaseId, null, 'start', 'phase', 
                 json_encode(['start_time' => null]), 
                 json_encode(['start_time' => date('Y-m-d H:i:s')]));
        
        // After successful start:
        $socketEvents = getSocketEvents();
        $socketEvents->operationsPhaseStarted([
            'part_number' => $partNumber,
            'phase_id' => $phaseId,
            'start_time' => date('Y-m-d H:i:s')
        ]);
        
        sendSuccessResponse([
            'message' => 'Phase started',
            'start_time' => date('Y-m-d H:i:s')
        ]);
    } catch (PDOException $e) {
        error_log("Error starting phase: " . $e->getMessage());
        sendErrorResponse('Failed to start phase', 500);
    }
}

function stopItemProcess($pdo) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        $partNumber = $data['part_number'] ?? null;
        $phaseId = $data['phase_id'] ?? null;
        
        if (!$partNumber || !$phaseId) {
            sendErrorResponse('Part number and phase ID are required', 400);
            return;
        }
        
        // Check if phase exists and belongs to item
        $stmt = $pdo->prepare("
            SELECT * FROM operations_phases 
            WHERE id = ? AND item_part_number = ?
        ");
        $stmt->execute([$phaseId, $partNumber]);
        $phase = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$phase) {
            sendErrorResponse('Phase not found or does not belong to item', 404);
            return;
        }
        
        // Check if started
        if (!$phase['start_time']) {
            sendErrorResponse('Phase not started yet', 400);
            return;
        }
        
        // Check if already stopped
        if ($phase['end_time']) {
            sendErrorResponse('Phase already stopped', 400);
            return;
        }
        
        // If currently paused, accumulate the pause duration first
        if ($phase['pause_time']) {
            $pauseStart = new DateTime($phase['pause_time']);
            $now = new DateTime();
            $pauseDurationSeconds = $now->getTimestamp() - $pauseStart->getTimestamp();
            
            $currentPausedDuration = intval($phase['paused_duration'] ?? 0);
            $newPausedDuration = $currentPausedDuration + $pauseDurationSeconds;
            
            // Update paused_duration and clear pause_time before setting end_time
            $stmt = $pdo->prepare("
                UPDATE operations_phases 
                SET pause_time = NULL,
                    paused_duration = ?
                WHERE id = ?
            ");
            $stmt->execute([$newPausedDuration, $phaseId]);
        }
        
        // Set end_time to current timestamp
        $stmt = $pdo->prepare("
            UPDATE operations_phases 
            SET end_time = NOW()
            WHERE id = ?
        ");
        $stmt->execute([$phaseId]);
        
        // Update phase progress to 100% when stopped
        $stmt = $pdo->prepare("
            UPDATE operations_phases 
            SET progress = 100
            WHERE id = ?
        ");
        $stmt->execute([$phaseId]);
        
        // Update item progress
        updateItemProgress($pdo, $partNumber);
        
        // Log audit
        logAudit($pdo, $partNumber, $phaseId, null, 'stop', 'phase', 
                 json_encode(['end_time' => null]), 
                 json_encode(['end_time' => date('Y-m-d H:i:s')]));
        
        $socketEvents = getSocketEvents();
        $socketEvents->operationsPhaseStopped([
            'part_number' => $partNumber,
            'phase_id' => $phaseId,
            'end_time' => date('Y-m-d H:i:s')
        ]);
        
        sendSuccessResponse([
            'message' => 'Phase stopped',
            'end_time' => date('Y-m-d H:i:s')
        ]);
    } catch (PDOException $e) {
        error_log("Error stopping phase: " . $e->getMessage());
        sendErrorResponse('Failed to stop phase', 500);
    }
}


function resetItemProcess($pdo) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        $partNumber = $data['part_number'] ?? null;
        $phaseId = $data['phase_id'] ?? null;
        
        if (!$partNumber || !$phaseId) {
            sendErrorResponse('Part number and phase ID are required', 400);
            return;
        }
        
        // Check if phase exists and belongs to item
        $stmt = $pdo->prepare("
            SELECT * FROM operations_phases 
            WHERE id = ? AND item_part_number = ?
        ");
        $stmt->execute([$phaseId, $partNumber]);
        $phase = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$phase) {
            sendErrorResponse('Phase not found or does not belong to item', 404);
            return;
        }
        
        // Reset start_time, pause_time, end_time, and paused_duration
        $stmt = $pdo->prepare("
            UPDATE operations_phases 
            SET start_time = NULL,
                pause_time = NULL,
                end_time = NULL,
                paused_duration = 0
            WHERE id = ?
        ");
        $stmt->execute([$phaseId]);
        
        // Update item progress
        updateItemProgress($pdo, $partNumber);
        
        // Log audit
        logAudit($pdo, $partNumber, $phaseId, null, 'reset', 'phase', 
                 json_encode(['start_time' => $phase['start_time'], 'pause_time' => $phase['pause_time'], 'end_time' => $phase['end_time'], 'paused_duration' => $phase['paused_duration']]), 
                 json_encode(['start_time' => null, 'pause_time' => null, 'end_time' => null, 'paused_duration' => 0]));
        
        sendSuccessResponse(['message' => 'Phase timing reset']);
    } catch (PDOException $e) {
        error_log("Error resetting phase: " . $e->getMessage());
        sendErrorResponse('Failed to reset phase', 500);
    }
}

function getClients($pdo) {
    try {
        $stmt = $pdo->query("
            SELECT DISTINCT client_name 
            FROM operations_items 
            WHERE client_name IS NOT NULL AND client_name != ''
            ORDER BY client_name ASC
        ");
        $clients = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
        sendSuccessResponse($clients);
    } catch (PDOException $e) {
        error_log("Error fetching clients: " . $e->getMessage());
        sendErrorResponse('Failed to fetch clients', 500);
    }
}

function pausePhaseProcess($pdo) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        $partNumber = $data['part_number'] ?? null;
        $phaseId = $data['phase_id'] ?? null;
        
        if (!$partNumber || !$phaseId) {
            sendErrorResponse('Part number and phase ID are required', 400);
            return;
        }
        
        // Check if phase exists and belongs to item
        $stmt = $pdo->prepare("
            SELECT * FROM operations_phases 
            WHERE id = ? AND item_part_number = ?
        ");
        $stmt->execute([$phaseId, $partNumber]);
        $phase = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$phase) {
            sendErrorResponse('Phase not found or does not belong to item', 404);
            return;
        }
        
        // Check if started
        if (!$phase['start_time']) {
            sendErrorResponse('Phase not started yet', 400);
            return;
        }
        
        // Check if already stopped
        if ($phase['end_time']) {
            sendErrorResponse('Phase already completed', 400);
            return;
        }
        
        // Check if already paused
        if ($phase['pause_time']) {
            sendErrorResponse('Phase already paused', 400);
            return;
        }
        
        // Set pause_time to current timestamp
        $stmt = $pdo->prepare("
            UPDATE operations_phases 
            SET pause_time = NOW()
            WHERE id = ?
        ");
        $stmt->execute([$phaseId]);
        
        // Log audit
        logAudit($pdo, $partNumber, $phaseId, null, 'pause', 'phase', 
                 json_encode(['pause_time' => null]), 
                 json_encode(['pause_time' => date('Y-m-d H:i:s')]));
        
        $socketEvents = getSocketEvents();
        $socketEvents->operationsPhasePaused([
            'part_number' => $partNumber,
            'phase_id' => $phaseId,
            'pause_time' => date('Y-m-d H:i:s')
        ]);
        
        sendSuccessResponse([
            'message' => 'Phase paused',
            'pause_time' => date('Y-m-d H:i:s')
        ]);
    } catch (PDOException $e) {
        error_log("Error pausing phase: " . $e->getMessage());
        sendErrorResponse('Failed to pause phase', 500);
    }
}

function resumePhaseProcess($pdo) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        $partNumber = $data['part_number'] ?? null;
        $phaseId = $data['phase_id'] ?? null;
        
        if (!$partNumber || !$phaseId) {
            sendErrorResponse('Part number and phase ID are required', 400);
            return;
        }
        
        // Check if phase exists and belongs to item
        $stmt = $pdo->prepare("
            SELECT * FROM operations_phases 
            WHERE id = ? AND item_part_number = ?
        ");
        $stmt->execute([$phaseId, $partNumber]);
        $phase = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$phase) {
            sendErrorResponse('Phase not found or does not belong to item', 404);
            return;
        }
        
        // Check if started
        if (!$phase['start_time']) {
            sendErrorResponse('Phase not started yet', 400);
            return;
        }
        
        // Check if actually paused
        if (!$phase['pause_time']) {
            sendErrorResponse('Phase is not paused', 400);
            return;
        }
        
        // Check if already stopped
        if ($phase['end_time']) {
            sendErrorResponse('Phase already completed', 400);
            return;
        }
        
        // Calculate pause duration in seconds
        $pauseStart = new DateTime($phase['pause_time']);
        $now = new DateTime();
        $pauseDurationSeconds = $now->getTimestamp() - $pauseStart->getTimestamp();
        
        // Add to accumulated paused_duration
        $currentPausedDuration = intval($phase['paused_duration'] ?? 0);
        $newPausedDuration = $currentPausedDuration + $pauseDurationSeconds;
        
        // Clear pause_time and update paused_duration
        $stmt = $pdo->prepare("
            UPDATE operations_phases 
            SET pause_time = NULL,
                paused_duration = ?
            WHERE id = ?
        ");
        $stmt->execute([$newPausedDuration, $phaseId]);
        
        // Log audit
        logAudit($pdo, $partNumber, $phaseId, null, 'resume', 'phase', 
                 json_encode(['pause_time' => $phase['pause_time'], 'paused_duration' => $currentPausedDuration]), 
                 json_encode(['pause_time' => null, 'paused_duration' => $newPausedDuration]));
        
        $socketEvents = getSocketEvents();
        $socketEvents->operationsPhaseResumed([
            'part_number' => $partNumber,
            'phase_id' => $phaseId,
            'resumed_at' => date('Y-m-d H:i:s'),
            'paused_duration' => $newPausedDuration
        ]);
        
        sendSuccessResponse([
            'message' => 'Phase resumed',
            'resumed_at' => date('Y-m-d H:i:s'),
            'paused_duration' => $newPausedDuration
        ]);
    } catch (PDOException $e) {
        error_log("Error resuming phase: " . $e->getMessage());
        sendErrorResponse('Failed to resume phase', 500);
    }
}

// ==================== GOOGLE SHEETS INTEGRATION ====================

/**
 * Health check endpoint for Google Sheets to test connection
 */
function healthCheck() {
    sendSuccessResponse([
        'status' => 'ok',
        'timestamp' => date('Y-m-d H:i:s'),
        'service' => 'operations-api'
    ]);
}

// In operations.php - Update the googleSheetsImport function

function googleSheetsImport($pdo) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (empty($data['part_number']) || empty($data['client_name']) || empty($data['qty'])) {
            sendErrorResponse('part_number, client_name, and qty are required', 400);
            return;
        }
        
        $basePartNumber = trim($data['part_number']);
        $clientName = trim($data['client_name']);
        $qty = intval($data['qty']);
        
        // Get item name from request or generate from part number
        $itemName = isset($data['item_name']) && !empty(trim($data['item_name']))
            ? trim($data['item_name'])
            : "Item {$basePartNumber}";
        
        if ($qty <= 0) {
            sendErrorResponse('Quantity must be a positive number', 400);
            return;
        }
        
        // Generate batch number with Google Sheets prefix
        $batchTimestamp = time();
        $randomSuffix = str_pad(rand(0, 999), 3, '0', STR_PAD_LEFT);
        $batchNumber = "GS-{$batchTimestamp}-{$randomSuffix}";
        
        $uniquePartNumber = "{$basePartNumber}-{$batchNumber}";
        
        // Check if this exact part number already exists
        $stmt = $pdo->prepare("SELECT part_number FROM operations_items WHERE part_number = ?");
        $stmt->execute([$uniquePartNumber]);
        if ($stmt->fetch()) {
            sendErrorResponse('Part number already exists (duplicate import)', 409);
            return;
        }
        
        // Look for template...
        $templateItem = null;
        $stmt = $pdo->prepare("
            SELECT * FROM operations_items 
            WHERE part_number LIKE ?
            ORDER BY created_at DESC
            LIMIT 1
        ");
        $stmt->execute(["{$basePartNumber}-%"]);
        $templateItem = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$templateItem) {
            $stmt = $pdo->prepare("
                SELECT * FROM operations_items 
                WHERE part_number = ?
                LIMIT 1
            ");
            $stmt->execute([$basePartNumber]);
            $templateItem = $stmt->fetch(PDO::FETCH_ASSOC);
        }
        
        // Determine item name
        if (!isset($data['item_name']) || empty(trim($data['item_name']))) {
            if ($templateItem) {
                $itemName = $templateItem['name'];
            }
        }
        
        $priority = $templateItem ? $templateItem['priority'] : 'Medium';
        $description = $templateItem ? $templateItem['description'] : "Imported from Google Sheets";
        
        // Start transaction
        $pdo->beginTransaction();
        
        try {
            // Create the item
            $stmt = $pdo->prepare("
                INSERT INTO operations_items (
                    part_number, name, description, client_name, 
                    priority, remarks, qty, total_qty, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'not_started')
            ");
            
            $remarks = "Imported from Google Sheets on " . date('Y-m-d H:i:s');
            if (isset($data['sheet_row'])) {
                $remarks .= " (Row: {$data['sheet_row']})";
            }
            if ($templateItem) {
                $remarks .= " | Template: {$templateItem['part_number']}";
            }
            if (isset($data['item_name']) && !empty(trim($data['item_name']))) {
                $remarks .= " | Custom name provided";
            }
            
            $stmt->execute([
                $uniquePartNumber,
                $itemName,
                $description,
                $clientName,
                $priority,
                $remarks,
                $qty,
                $qty,
            ]);
            
            $phasesCreated = 0;
            $subphasesCreated = 0;
            
            // Copy phases and subphases from template if exists
            if ($templateItem) {
                $stmt = $pdo->prepare("
                    SELECT * FROM operations_phases 
                    WHERE item_part_number = ?
                    ORDER BY phase_order
                ");
                $stmt->execute([$templateItem['part_number']]);
                $templatePhases = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                foreach ($templatePhases as $templatePhase) {
                    $stmt = $pdo->prepare("
                        INSERT INTO operations_phases (
                            item_part_number, name, phase_order
                        ) VALUES (?, ?, ?)
                    ");
                    $stmt->execute([
                        $uniquePartNumber,
                        $templatePhase['name'],
                        $templatePhase['phase_order']
                    ]);
                    
                    $newPhaseId = $pdo->lastInsertId();
                    $phasesCreated++;
                    
                    $stmt = $pdo->prepare("
                        SELECT * FROM operations_subphases 
                        WHERE phase_id = ?
                        ORDER BY subphase_order
                    ");
                    $stmt->execute([$templatePhase['id']]);
                    $templateSubphases = $stmt->fetchAll(PDO::FETCH_ASSOC);
                    
                    foreach ($templateSubphases as $templateSubphase) {
                        $stmt = $pdo->prepare("
                            INSERT INTO operations_subphases (
                                item_part_number, phase_id, name, time_duration,
                                subphase_order, expected_duration, expected_quantity, 
                                current_completed_quantity
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        ");
                        $stmt->execute([
                            $uniquePartNumber,
                            $newPhaseId,
                            $templateSubphase['name'],
                            0,
                            $templateSubphase['subphase_order'],
                            $templateSubphase['expected_duration'] ?? 0,
                            $templateSubphase['expected_quantity'] ?? 0,
                            0
                        ]);
                        $subphasesCreated++;
                    }
                }
            } else {
                // Create default structure
                $stmt = $pdo->prepare("
                    INSERT INTO operations_phases (
                        item_part_number, name, phase_order
                    ) VALUES (?, ?, ?)
                ");
                $stmt->execute([
                    $uniquePartNumber,
                    'Production',
                    1
                ]);
                
                $newPhaseId = $pdo->lastInsertId();
                $phasesCreated++;
                
                $stmt = $pdo->prepare("
                    INSERT INTO operations_subphases (
                        item_part_number, phase_id, name, time_duration,
                        subphase_order, expected_duration, expected_quantity,
                        current_completed_quantity
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ");
                $stmt->execute([
                    $uniquePartNumber,
                    $newPhaseId,
                    'Processing',
                    0,
                    1,
                    0,
                    $qty,
                    0
                ]);
                $subphasesCreated++;
            }
            
            // Log audit
            logAudit(
                $pdo,
                $uniquePartNumber,
                null,
                null,
                'create',
                'item',
                null,
                json_encode([
                    'source' => 'google_sheets',
                    'original_part_number' => $basePartNumber,
                    'item_name' => $itemName,
                    'item_name_source' => isset($data['item_name']) && !empty(trim($data['item_name'])) 
                        ? 'provided' 
                        : ($templateItem ? 'template' : 'generated'),
                    'client_name' => $clientName,
                    'qty' => $qty,
                    'sheet_row' => $data['sheet_row'] ?? null,
                    'template_used' => $templateItem ? true : false,
                    'template_source' => $templateItem ? $templateItem['part_number'] : null
                ]),
                null,
                'Google Sheets Import'
            );
            
            // Commit transaction
            $pdo->commit();
            
             // After commit, BEFORE sendSuccessResponse:
        $socketEvents = getSocketEvents();
        $socketEvents->operationsGoogleSheetsImport([
            'part_number' => $uniquePartNumber,
            'base_part_number' => $basePartNumber,
            'name' => $itemName,
            'client_name' => $clientName,
            'qty' => $qty,
            'template_used' => $templateItem ? true : false,
            'phases_created' => $phasesCreated,
            'subphases_created' => $subphasesCreated
        ]);
            
            // Return success response
            sendSuccessResponse([
                'success' => true,
                'message' => 'Item created successfully from Google Sheets',
                'data' => [
                    'part_number' => $uniquePartNumber,
                    'base_part_number' => $basePartNumber,
                    'name' => $itemName,
                    'client_name' => $clientName,
                    'qty' => $qty,
                    'template_used' => $templateItem ? true : false,
                    'template_source' => $templateItem ? $templateItem['part_number'] : null,
                    'phases_created' => $phasesCreated,
                    'subphases_created' => $subphasesCreated,
                    'item_name_source' => isset($data['item_name']) && !empty(trim($data['item_name'])) 
                        ? 'provided' 
                        : ($templateItem ? 'template' : 'generated')
                ]
            ], 201);
            
        } catch (Exception $e) {
            $pdo->rollBack();
            throw $e;
        }
        
    } catch (PDOException $e) {
        error_log("Google Sheets import error: " . $e->getMessage());
        sendErrorResponse('Failed to import item: ' . $e->getMessage(), 500);
    } catch (Exception $e) {
        error_log("Google Sheets import error: " . $e->getMessage());
        sendErrorResponse('Failed to import item: ' . $e->getMessage(), 500);
    }
}

?>