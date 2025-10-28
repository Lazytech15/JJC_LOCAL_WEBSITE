<?php
// routes/employee-logs.php - Employee logs management endpoints

// FIX: Set PHP timezone to match your database timezone (Philippines)
date_default_timezone_set('Asia/Manila');

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/headers.php';

// Get HTTP method and endpoint
$method = $_SERVER['REQUEST_METHOD'];
$segments = explode('/', trim($path, '/'));
$endpoint = $segments[1] ?? null;
$id = $segments[2] ?? null;

try {
    switch ($method) {
        case 'GET':
            if ($endpoint === 'stats') {
                getEmployeeLogsStats();
            } elseif ($endpoint === 'user' && $id) {
                getUserLogs($id);
            } elseif ($endpoint && is_numeric($endpoint)) {
                getSingleEmployeeLog($endpoint);
            } elseif ($endpoint === 'audit' && $id) {
                getAuditForLog($id);
            } elseif (!$endpoint) {
                getAllEmployeeLogs();
            } else {
                sendErrorResponse('Invalid GET endpoint', 404);
            }
            break;
            
        case 'POST':
            if ($endpoint === 'bulk' || $endpoint === null) {
                createEmployeeLog();
            } else {
                sendErrorResponse('Invalid POST endpoint', 404);
            }
            break;
            
        case 'PUT':
            if ($endpoint && is_numeric($endpoint)) {
                updateEmployeeLog($endpoint);
            } else {
                sendErrorResponse('Invalid PUT endpoint - ID required', 400);
            }
            break;
            
        case 'DELETE':
            if ($endpoint === 'bulk') {
                bulkDeleteLogs();
            } elseif ($endpoint && is_numeric($endpoint)) {
                deleteEmployeeLog($endpoint);
            } else {
                sendErrorResponse('Invalid DELETE endpoint', 400);
            }
            break;
            
        default:
            sendErrorResponse('Method not allowed', 405);
    }
} catch (Exception $e) {
    error_log("Employee logs error: " . $e->getMessage());
    sendErrorResponse('Internal server error', 500, ['message' => $e->getMessage()]);
}

// Get all employee logs with filtering and pagination
function getAllEmployeeLogs() {
    $db = getConnection();
    
    // Get query parameters
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 100;
    $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
    $username = $_GET['username'] ?? null;
    $date_from = $_GET['date_from'] ?? null;
    $date_to = $_GET['date_to'] ?? null;
    $search = $_GET['search'] ?? null;
    
    // Validate and sanitize limit and offset
    $parsedLimit = min(max(1, $limit), 1000);
    $parsedOffset = max(0, $offset);
    
    // Build WHERE clause based on filters
    $whereConditions = [];
    $params = [];
    
    if ($username) {
        $whereConditions[] = "username = ?";
        $params[] = $username;
    }
    
    if ($date_from) {
        $whereConditions[] = "log_date >= ?";
        $params[] = $date_from;
    }
    
    if ($date_to) {
        $whereConditions[] = "log_date <= ?";
        $params[] = $date_to;
    }
    
    if ($search) {
        $whereConditions[] = "(username LIKE ? OR details LIKE ?)";
        $params[] = "%{$search}%";
        $params[] = "%{$search}%";
    }
    
    $whereClause = count($whereConditions) > 0 ? "WHERE " . implode(" AND ", $whereConditions) : "";
    
    // Fetch filtered and paginated logs
    $stmt = $db->prepare("
        SELECT * FROM employee_logs
        {$whereClause}
        ORDER BY log_date DESC, log_time DESC
        LIMIT {$parsedLimit} OFFSET {$parsedOffset}
    ");
    
    $stmt->execute($params);
    $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get total count for filtered results
    $countStmt = $db->prepare("
        SELECT COUNT(*) as count FROM employee_logs
        {$whereClause}
    ");
    
    $countStmt->execute($params);
    $totalResult = $countStmt->fetch(PDO::FETCH_ASSOC);
    
    sendSuccessResponse([
        'data' => $logs,
        'total' => (int)$totalResult['count'],
        'limit' => $parsedLimit,
        'offset' => $parsedOffset,
        'filters' => [
            'username' => $username,
            'date_from' => $date_from,
            'date_to' => $date_to,
            'search' => $search
        ]
    ]);
}

// Get employee logs statistics
function getEmployeeLogsStats() {
    $db = getConnection();
    
    $days = isset($_GET['days']) ? (int)$_GET['days'] : 30;
    $parsedDays = max(1, $days);
    
    // Total logs count
    $totalLogs = $db->query("SELECT COUNT(*) as count FROM employee_logs")->fetch(PDO::FETCH_ASSOC);
    
    // Logs in specified period
    $recentLogs = $db->query("
        SELECT COUNT(*) as count FROM employee_logs
        WHERE log_date >= date('now', '-{$parsedDays} days')
    ")->fetch(PDO::FETCH_ASSOC);
    
    // Active users in specified period
    $activeUsers = $db->query("
        SELECT COUNT(DISTINCT username) as count FROM employee_logs
        WHERE log_date >= date('now', '-{$parsedDays} days')
        AND username IS NOT NULL
    ")->fetch(PDO::FETCH_ASSOC);
    
    // Logs by day for the specified period
    $logsByDay = $db->query("
        SELECT 
            log_date,
            COUNT(*) as log_count,
            COUNT(DISTINCT username) as unique_users
        FROM employee_logs
        WHERE log_date >= date('now', '-{$parsedDays} days')
        GROUP BY log_date
        ORDER BY log_date DESC
    ")->fetchAll(PDO::FETCH_ASSOC);
    
    // Top active users in specified period
    $topUsers = $db->query("
        SELECT 
            username,
            COUNT(*) as log_count,
            MAX(log_date) as last_activity
        FROM employee_logs
        WHERE log_date >= date('now', '-{$parsedDays} days')
        AND username IS NOT NULL
        GROUP BY username
        ORDER BY log_count DESC
        LIMIT 10
    ")->fetchAll(PDO::FETCH_ASSOC);
    
    sendSuccessResponse([
        'period_days' => $parsedDays,
        'total_logs' => (int)$totalLogs['count'],
        'recent_logs' => (int)$recentLogs['count'],
        'active_users' => (int)$activeUsers['count'],
        'logs_by_day' => $logsByDay,
        'top_users' => $topUsers
    ]);
}

// Create new employee log entry
function createEmployeeLog() {
    $db = getConnection();
    $data = json_decode(file_get_contents('php://input'), true);
    
    $username = $data['username'] ?? null;
    $details = $data['details'] ?? null;
    $log_date = $data['log_date'] ?? null;
    $log_time = $data['log_time'] ?? null;
    $purpose = $data['purpose'] ?? null;
    $id_number = $data['id_number'] ?? null;
    $id_barcode = $data['id_barcode'] ?? null;
    $item_no = $data['item_no'] ?? null;
    
    if (!$username && !$details) {
        sendErrorResponse('Either username or details must be provided', 400);
        return;
    }
    
    // Prepare data object
    $logData = [];
    if ($username) $logData['username'] = $username;
    if ($details) $logData['details'] = $details;
    if ($log_date) $logData['log_date'] = $log_date;
    if ($log_time) $logData['log_time'] = $log_time;
    
    $logData['purpose'] = $purpose ?? ""; 
    
    if ($id_number) $logData['id_number'] = $id_number;
    if ($id_barcode) $logData['id_barcode'] = $id_barcode;
    if ($item_no) $logData['item_no'] = $item_no;

    
    $columns = implode(", ", array_keys($logData));
    $placeholders = implode(", ", array_fill(0, count($logData), "?"));
    $values = array_values($logData);
    
    $stmt = $db->prepare("INSERT INTO employee_logs ({$columns}) VALUES ({$placeholders})");
    $stmt->execute($values);
    
    $lastId = $db->lastInsertId();
    
    // Fetch the created log entry
    $createdLog = $db->prepare("SELECT * FROM employee_logs WHERE id = ?");
    $createdLog->execute([$lastId]);
    $logEntry = $createdLog->fetch(PDO::FETCH_ASSOC);
    
    sendSuccessResponse([
        'success' => true,
        'id' => (int)$lastId,
        'data' => $logEntry,
        'message' => 'Employee log created successfully'
    ], 201);
}

// Get logs for a specific user
function getUserLogs($username) {
    $db = getConnection();
    
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
    $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
    $date_from = $_GET['date_from'] ?? null;
    $date_to = $_GET['date_to'] ?? null;
    
    $parsedLimit = min(max(1, $limit), 500);
    $parsedOffset = max(0, $offset);
    
    $whereConditions = ["username = ?"];
    $params = [$username];
    
    if ($date_from) {
        $whereConditions[] = "log_date >= ?";
        $params[] = $date_from;
    }
    
    if ($date_to) {
        $whereConditions[] = "log_date <= ?";
        $params[] = $date_to;
    }
    
    $whereClause = "WHERE " . implode(" AND ", $whereConditions);
    
    // Fetch logs
    $stmt = $db->prepare("
        SELECT * FROM employee_logs
        {$whereClause}
        ORDER BY log_date DESC, log_time DESC
        LIMIT {$parsedLimit} OFFSET {$parsedOffset}
    ");
    $stmt->execute($params);
    $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get total count
    $countStmt = $db->prepare("
        SELECT COUNT(*) as count FROM employee_logs
        {$whereClause}
    ");
    $countStmt->execute($params);
    $totalResult = $countStmt->fetch(PDO::FETCH_ASSOC);
    
    // User activity summary
    $summaryStmt = $db->prepare("
        SELECT 
            COUNT(*) as total_logs,
            MIN(log_date) as first_activity,
            MAX(log_date) as last_activity,
            COUNT(DISTINCT log_date) as active_days
        FROM employee_logs
        WHERE username = ?
    ");
    $summaryStmt->execute([$username]);
    $activitySummary = $summaryStmt->fetch(PDO::FETCH_ASSOC);
    
    sendSuccessResponse([
        'username' => $username,
        'data' => $logs,
        'total' => (int)$totalResult['count'],
        'limit' => $parsedLimit,
        'offset' => $parsedOffset,
        'activity_summary' => $activitySummary
    ]);
}

// Get a single employee log by id
function getSingleEmployeeLog($id) {
    $db = getConnection();
    if (!is_numeric($id)) {
        sendErrorResponse('Invalid ID', 400);
        return;
    }

    try {
        $stmt = $db->prepare("SELECT * FROM employee_logs WHERE id = ?");
        $stmt->execute([(int)$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            sendErrorResponse('Log entry not found', 404);
            return;
        }
        sendSuccessResponse(['data' => $row]);
    } catch (Exception $e) {
        error_log('Failed to fetch single log: ' . $e->getMessage());
        sendErrorResponse('Failed to fetch log', 500, ['message' => $e->getMessage()]);
    }
}

// Get audit records for a specific log id
function getAuditForLog($id) {
    $db = getConnection();

    if (!is_numeric($id)) {
        sendErrorResponse('Invalid ID', 400);
        return;
    }

    try {
        // Ensure audit table exists
        $check = $db->query("SHOW TABLES LIKE 'employee_logs_audit'")->fetch();
        if (!$check) {
            sendSuccessResponse(['data' => []]);
            return;
        }

        $stmt = $db->prepare("SELECT * FROM employee_logs_audit WHERE original_log_id = ? OR new_log_id = ? ORDER BY created_at DESC");
        $stmt->execute([(int)$id, (int)$id]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        sendSuccessResponse(['data' => $rows]);
    } catch (Exception $e) {
        error_log('Failed to fetch audit records: ' . $e->getMessage());
        sendErrorResponse('Failed to fetch audit records', 500, ['message' => $e->getMessage()]);
    }
}

// Update employee log entry with audit trail
function updateEmployeeLog($id) {
    $db = getConnection();
    $data = json_decode(file_get_contents('php://input'), true);

    if (!is_numeric($id)) {
        sendErrorResponse('Invalid ID', 400);
        return;
    }

    $adminId = $data['admin_id'] ?? null;
    $reason = trim($data['reason'] ?? '');

    // Try to extract admin_id from Authorization header if not provided
    if (!$adminId) {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? ($_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? null);
        if ($authHeader && preg_match('/Bearer\s+(\S+)/', $authHeader, $m)) {
            $token = $m[1];
            $parts = explode('.', $token);
            if (count($parts) >= 2) {
                $payload = json_decode(base64_decode($parts[1]), true);
                if ($payload && is_array($payload)) {
                    foreach (['id','uid','userId','admin_id','adminId'] as $k) {
                        if (isset($payload[$k])) { 
                            $adminId = $payload[$k]; 
                            break; 
                        }
                    }
                }
            }
        }
    }

    if (!$adminId) {
        sendErrorResponse('admin_id is required for edits', 400);
        return;
    }

    if ($reason === '') {
        sendErrorResponse('A reason for the edit is required', 400);
        return;
    }

    try {
        // Fetch original record
        $getStmt = $db->prepare("SELECT * FROM employee_logs WHERE id = ?");
        $getStmt->execute([(int)$id]);
        $original = $getStmt->fetch(PDO::FETCH_ASSOC);

        if (!$original) {
            sendErrorResponse('Log entry not found', 404);
            return;
        }

        // Get table columns dynamically
        $columnsQuery = $db->query("SHOW COLUMNS FROM employee_logs");
        $tableColumns = [];
        while ($col = $columnsQuery->fetch(PDO::FETCH_ASSOC)) {
            $tableColumns[] = $col['Field'];
        }

        // Build new record data from original and overrides
        $newRecord = [];
        
        // Copy all original values except id and audit fields
        foreach ($original as $key => $value) {
            if (!in_array($key, ['id', 'edited_by_admin_id', 'edited_at', 'created_at'])) {
                $newRecord[$key] = $value;
            }
        }
        
        // Apply allowed field overrides
        $allowedFields = ['username','details','log_date','log_time','purpose','id_number','id_barcode','item_no'];
        $changed = [];
        
        foreach ($allowedFields as $field) {
            if (array_key_exists($field, $data)) {
                $newValue = $data[$field];
                $oldValue = $original[$field] ?? '';
                
                // Normalize values for comparison
                if (is_string($newValue)) {
                    $newValue = trim($newValue);
                }
                if (is_string($oldValue)) {
                    $oldValue = trim($oldValue);
                }
                
                // Check if actually changed
                if ($newValue !== $oldValue) {
                    $newRecord[$field] = $newValue;
                    $changed[$field] = ['old' => $oldValue, 'new' => $newValue];
                }
            }
        }

        if (count($changed) === 0) {
            sendErrorResponse('No changes detected', 400);
            return;
        }

        $db->beginTransaction();

        // 1) Flag original as SUPERSEDED
        $updateFields = [];
        $updateParams = [];
        
        if (in_array('status', $tableColumns)) {
            $updateFields[] = "status = ?";
            $updateParams[] = 'SUPERSEDED';
        }
        if (in_array('edited_by_admin_id', $tableColumns)) {
            $updateFields[] = "edited_by_admin_id = ?";
            $updateParams[] = $adminId;
        }
        if (in_array('edited_at', $tableColumns)) {
            $updateFields[] = "edited_at = NOW()";
        }
        
        if (count($updateFields) > 0) {
            $updateParams[] = (int)$id;
            $flagStmt = $db->prepare("UPDATE employee_logs SET " . implode(", ", $updateFields) . " WHERE id = ?");
            $flagStmt->execute($updateParams);
        }

        // 2) Prepare new record with proper values
        if (in_array('supersedes_original_id', $tableColumns)) {
            $newRecord['supersedes_original_id'] = (int)$id;
        }
        if (in_array('status', $tableColumns)) {
            $newRecord['status'] = 'ACTIVE';
        }

        // Filter newRecord to only include columns that exist in the table
        $filteredRecord = [];
        foreach ($newRecord as $key => $value) {
            if (in_array($key, $tableColumns) && !in_array($key, ['id', 'edited_by_admin_id', 'edited_at', 'created_at'])) {
                $filteredRecord[$key] = $value;
            }
        }

        // 3) Insert new corrected log record with NOW() for created_at
        $columns = array_keys($filteredRecord);
        $placeholders = array_fill(0, count($filteredRecord), '?');
        $values = array_values($filteredRecord);

        // FIX: Add created_at with NOW() function
        if (in_array('created_at', $tableColumns)) {
            $columns[] = 'created_at';
            $placeholders[] = 'NOW()';
        }

        $insertSQL = "INSERT INTO employee_logs (" . implode(", ", $columns) . ") VALUES (" . implode(", ", $placeholders) . ")";
        $insStmt = $db->prepare($insertSQL);
        $insStmt->execute($values);
        $newId = $db->lastInsertId();

        // 4) Insert audit record
        $auditStmt = $db->prepare("
            INSERT INTO employee_logs_audit 
            (original_log_id, new_log_id, admin_id, reason, changes_json, original_json, new_json, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        $auditStmt->execute([
            (int)$id,
            (int)$newId,
            (string)$adminId,
            $reason,
            json_encode($changed, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT),
            json_encode($original, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT),
            json_encode($filteredRecord, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT)
        ]);

        $db->commit();

        // Fetch newly created log
        $createdStmt = $db->prepare("SELECT * FROM employee_logs WHERE id = ?");
        $createdStmt->execute([$newId]);
        $createdLog = $createdStmt->fetch(PDO::FETCH_ASSOC);

        sendSuccessResponse([
            'success' => true,
            'original_id' => (int)$id,
            'new_id' => (int)$newId,
            'data' => $createdLog,
            'changes' => $changed,
            'message' => 'Employee log edited and audit recorded'
        ]);

    } catch (Exception $e) {
        if ($db->inTransaction()) {
            try { 
                $db->rollBack(); 
            } catch (Exception $_) { }
        }
        
        error_log('=== AUDIT UPDATE FAILED ===');
        error_log('Error Message: ' . $e->getMessage());
        error_log('Error Code: ' . $e->getCode());
        error_log('File: ' . $e->getFile() . ' Line: ' . $e->getLine());
        error_log('Stack Trace: ' . $e->getTraceAsString());
        error_log('Log ID: ' . $id);
        error_log('Admin ID: ' . ($adminId ?? 'null'));
        error_log('Request Data: ' . json_encode($data));
        error_log('==========================');
        
        sendErrorResponse('Failed to perform audited update', 500, [
            'error' => $e->getMessage(),
            'code' => $e->getCode(),
            'file' => basename($e->getFile()),
            'line' => $e->getLine()
        ]);
    }
}

// Delete employee log entry
function deleteEmployeeLog($id) {
    $db = getConnection();
    
    if (!is_numeric($id)) {
        sendErrorResponse('Invalid ID', 400);
        return;
    }
    
    $getStmt = $db->prepare("SELECT * FROM employee_logs WHERE id = ?");
    $getStmt->execute([(int)$id]);
    $logEntry = $getStmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$logEntry) {
        sendErrorResponse('Log entry not found', 404);
        return;
    }
    
    $stmt = $db->prepare("DELETE FROM employee_logs WHERE id = ?");
    $stmt->execute([(int)$id]);
    
    sendSuccessResponse([
        'success' => true,
        'changes' => $stmt->rowCount(),
        'deleted_entry' => $logEntry,
        'message' => 'Employee log deleted successfully'
    ]);
}

// Bulk delete logs
function bulkDeleteLogs() {
    $db = getConnection();
    $data = json_decode(file_get_contents('php://input'), true);
    
    $username = $data['username'] ?? null;
    $date_from = $data['date_from'] ?? null;
    $date_to = $data['date_to'] ?? null;
    $confirm = $data['confirm'] ?? false;
    
    if (!$confirm) {
        sendErrorResponse('Confirmation required for bulk delete', 400);
        return;
    }
    
    $whereConditions = [];
    $params = [];
    
    if ($username) {
        $whereConditions[] = "username = ?";
        $params[] = $username;
    }
    
    if ($date_from) {
        $whereConditions[] = "log_date >= ?";
        $params[] = $date_from;
    }
    
    if ($date_to) {
        $whereConditions[] = "log_date <= ?";
        $params[] = $date_to;
    }
    
    if (count($whereConditions) === 0) {
        sendErrorResponse('At least one filter condition is required', 400);
        return;
    }
    
    $whereClause = "WHERE " . implode(" AND ", $whereConditions);
    
    $countStmt = $db->prepare("SELECT COUNT(*) as count FROM employee_logs {$whereClause}");
    $countStmt->execute($params);
    $countResult = $countStmt->fetch(PDO::FETCH_ASSOC);
    
    $deleteStmt = $db->prepare("DELETE FROM employee_logs {$whereClause}");
    $deleteStmt->execute($params);
    
    sendSuccessResponse([
        'success' => true,
        'deleted_count' => $deleteStmt->rowCount(),
        'expected_count' => (int)$countResult['count'],
        'message' => "Successfully deleted {$deleteStmt->rowCount()} log entries"
    ]);
}

?>