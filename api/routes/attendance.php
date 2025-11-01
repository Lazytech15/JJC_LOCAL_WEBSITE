<?php
//attendance.php

// require_once __DIR__ . '/auth.php';
// Include database config directly
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../socket.php'; 

// Get database connection
$db = getConnection();

// Get request method and parse request body
$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true) ?? [];

// Use segments from index.php router
$resourceId = $segments[1] ?? null;
$action = $segments[2] ?? null;

error_log("ResourceId: " . print_r($resourceId, true));
error_log("Action: " . print_r($action, true));

try {
    // Route based on method and path
    if ($method === 'GET' && !$resourceId) {
        error_log("Route: GET all attendance");
        getAttendanceRecords($db);
        
    } elseif ($method === 'POST' && !$resourceId) {
        error_log("Route: POST sync attendance");
        syncAttendanceRecords($db, $input);
        
    } elseif ($method === 'POST' && $resourceId === 'record') {
        error_log("Route: POST create record");
        createAttendanceRecord($db, $input);
        
    } elseif ($method === 'GET' && $resourceId === 'unsynced') {
        error_log("Route: GET unsynced");
        getUnsyncedRecords($db);
        
    } elseif ($method === 'POST' && $resourceId === 'mark-synced') {
        error_log("Route: POST mark synced");
        markRecordsSynced($db, $input);
        
    } elseif ($method === 'GET' && $resourceId === 'stats') {
        error_log("Route: GET stats");
        getAttendanceStats($db);
        
    } elseif ($method === 'POST' && $resourceId === 'remove-duplicates') {
        error_log("Route: POST remove duplicates");
        removeDuplicateEntries($db);
        
    } elseif ($method === 'GET' && $resourceId === 'employee' && $action) {
        error_log("Route: GET employee attendance for UID: $action");
        getEmployeeAttendance($db, $action);
        
    } elseif ($method === 'GET' && $resourceId === 'summary' && $action) {
        error_log("Route: GET employee summary");
        getEmployeeSummary($db, $action);
        
    } elseif ($method === 'GET' && $resourceId && is_numeric($resourceId)) {
        error_log("Route: GET by ID");
        getAttendanceById($db, $resourceId);
        
    } elseif ($method === 'PUT' && $resourceId && is_numeric($resourceId)) {
        error_log("Route: PUT update");
        updateAttendanceRecord($db, $resourceId, $input);
        
    } elseif ($method === 'DELETE' && $resourceId && is_numeric($resourceId)) {
        error_log("Route: DELETE");
        deleteAttendanceRecord($db, $resourceId);
        
    } else {
        error_log("Route: NO MATCH - resourceId: $resourceId, action: $action");
        sendErrorResponse('Invalid endpoint or method', 404);
    }
    
} catch (Exception $e) {
    error_log("Attendance API Error: " . $e->getMessage());
    sendErrorResponse('Failed to process request', 500, ['message' => $e->getMessage()]);
}

// ============================================================================
// HANDLER FUNCTIONS
// ============================================================================

function getAttendanceRecords($db) {
    // Check if auto-remove duplicates is requested
    $autoRemoveDuplicates = isset($_GET['auto_remove_duplicates']) && $_GET['auto_remove_duplicates'] === 'true';
    
    if ($autoRemoveDuplicates) {
        error_log("Auto-removing duplicates before fetching records");
        $duplicatesRemoved = performDuplicateRemoval($db);
        error_log("Removed {$duplicatesRemoved['removed_count']} duplicate entries");
    }
    
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
    $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
    $sortBy = $_GET['sort_by'] ?? 'clock_time';
    $sortOrder = strtoupper($_GET['sort_order'] ?? 'DESC');
    
    // Build WHERE clause based on filters
    $conditions = [];
    $params = [];
    
    if (isset($_GET['employee_uid'])) {
        $conditions[] = "a.employee_uid = ?";
        $params[] = $_GET['employee_uid'];
    }
    
    if (isset($_GET['id_number'])) {
        $conditions[] = "a.id_number = ?";
        $params[] = $_GET['id_number'];
    }
    
    if (isset($_GET['date'])) {
        $conditions[] = "a.date = ?";
        $params[] = $_GET['date'];
    }
    
    if (isset($_GET['clock_type'])) {
        $conditions[] = "a.clock_type = ?";
        $params[] = $_GET['clock_type'];
    }
    
    if (isset($_GET['is_late'])) {
        $conditions[] = "a.is_late = ?";
        $params[] = $_GET['is_late'] === 'true' ? 1 : 0;
    }
    
    if (isset($_GET['is_synced'])) {
        $conditions[] = "a.is_synced = ?";
        $params[] = $_GET['is_synced'] === 'true' ? 1 : 0;
    }
    
    if (isset($_GET['start_date']) && isset($_GET['end_date'])) {
        $conditions[] = "a.date BETWEEN ? AND ?";
        $params[] = $_GET['start_date'];
        $params[] = $_GET['end_date'];
    } elseif (isset($_GET['start_date'])) {
        $conditions[] = "a.date >= ?";
        $params[] = $_GET['start_date'];
    } elseif (isset($_GET['end_date'])) {
        $conditions[] = "a.date <= ?";
        $params[] = $_GET['end_date'];
    }
    
    $whereClause = count($conditions) > 0 ? "WHERE " . implode(" AND ", $conditions) : "";
    
    // Validate sort parameters
    $allowedSortColumns = ['clock_time', 'date', 'employee_uid', 'id_number', 'clock_type', 'created_at'];
    $sortColumn = in_array($sortBy, $allowedSortColumns) ? $sortBy : 'clock_time';
    $sortDirection = $sortOrder === 'ASC' ? 'ASC' : 'DESC';
    
    // Main query with employee details
    $query = "
        SELECT 
            a.*,
            e.first_name,
            e.middle_name,
            e.last_name,
            e.department,
            e.position,
            e.email
        FROM attendance a
        LEFT JOIN emp_list e ON a.employee_uid = e.uid
        {$whereClause}
        ORDER BY a.{$sortColumn} {$sortDirection}
        LIMIT ? OFFSET ?
    ";
    
    $stmt = $db->prepare($query);
    $stmt->execute([...$params, $limit, $offset]);
    $records = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get total count
    $countQuery = "SELECT COUNT(*) as total FROM attendance a {$whereClause}";
    $stmt = $db->prepare($countQuery);
    $stmt->execute($params);
    $totalResult = $stmt->fetch(PDO::FETCH_ASSOC);
    
    $response = [
        'data' => $records,
        'pagination' => [
            'total' => (int)$totalResult['total'],
            'limit' => $limit,
            'offset' => $offset,
            'pages' => ceil($totalResult['total'] / $limit)
        ]
    ];
    
    // Include duplicate removal stats if it was performed
    if ($autoRemoveDuplicates && isset($duplicatesRemoved)) {
        $response['duplicates_removed'] = $duplicatesRemoved;
    }
    
    sendSuccessResponse($response);
}

function removeDuplicateEntries($db) {
    $result = performDuplicateRemoval($db);
    
    sendSuccessResponse([
        'message' => "Successfully removed {$result['removed_count']} duplicate entries",
        'removed_count' => $result['removed_count'],
        'duplicates_found' => $result['duplicates_found'],
        'removed_ids' => $result['removed_ids']
    ]);
}

function performDuplicateRemoval($db) {
    // Find duplicates based on: employee_uid, clock_time, date, and clock_type
    // Keep the record with the smallest ID (oldest record)
    $findDuplicatesQuery = "
        SELECT 
            employee_uid,
            clock_time,
            date,
            clock_type,
            GROUP_CONCAT(id ORDER BY id ASC) as duplicate_ids,
            COUNT(*) as duplicate_count
        FROM attendance
        GROUP BY employee_uid, clock_time, date, clock_type
        HAVING COUNT(*) > 1
    ";
    
    $stmt = $db->query($findDuplicatesQuery);
    $duplicateGroups = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($duplicateGroups)) {
        return [
            'removed_count' => 0,
            'duplicates_found' => 0,
            'removed_ids' => []
        ];
    }
    
    $removedIds = [];
    $removedCount = 0;
    
    $db->beginTransaction();
    
    try {
        foreach ($duplicateGroups as $group) {
            // Get all IDs in this duplicate group
            $ids = explode(',', $group['duplicate_ids']);
            
            // Keep the first ID (oldest), remove the rest
            $idsToRemove = array_slice($ids, 1);
            
            if (!empty($idsToRemove)) {
                $placeholders = str_repeat('?,', count($idsToRemove) - 1) . '?';
                $deleteStmt = $db->prepare("DELETE FROM attendance WHERE id IN ($placeholders)");
                $deleteStmt->execute($idsToRemove);
                
                $removedIds = array_merge($removedIds, $idsToRemove);
                $removedCount += count($idsToRemove);
                
                error_log("Removed duplicates for employee {$group['employee_uid']} on {$group['date']} at {$group['clock_time']}: " . implode(', ', $idsToRemove));
            }
        }
        
        $db->commit();
        
        // Emit socket event if duplicates were removed
        if ($removedCount > 0) {
            $socketEvents = getSocketEvents();
            $socketEvents->attendanceDeleted([
                'removed_count' => $removedCount,
                'type' => 'duplicate_removal',
                'removed_ids' => $removedIds
            ]);
        }
        
        return [
            'removed_count' => $removedCount,
            'duplicates_found' => count($duplicateGroups),
            'removed_ids' => $removedIds
        ];
        
    } catch (Exception $e) {
        $db->rollBack();
        error_log("Error removing duplicates: " . $e->getMessage());
        throw $e;
    }
}

function syncAttendanceRecords($db, $input) {
    // Handle both single record and array formats
    $records = [];
    if (isset($input['attendance_data'])) {
        $records = is_array($input['attendance_data']) ? $input['attendance_data'] : [$input['attendance_data']];
    } elseif (isset($input[0])) {
        $records = $input;
    }
    
    if (empty($records)) {
        sendSuccessResponse([
            'message' => 'No attendance records to process',
            'processed_count' => 0
        ]);
        return;
    }
    
    error_log("Processing " . count($records) . " attendance records from sync");
    
    $processedCount = 0;
    $duplicateCount = 0;
    $errorCount = 0;
    $errors = [];
    
    // Begin transaction
    $db->beginTransaction();
    
    try {
        $insertStmt = $db->prepare("
            INSERT INTO attendance (
                employee_uid, id_number, clock_type, clock_time, regular_hours,
                overtime_hours, date, is_late, notes, location, ip_address,
                device_info, is_synced, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, CURRENT_TIMESTAMP)
        ");
        
        $checkStmt = $db->prepare("
            SELECT id FROM attendance 
            WHERE employee_uid = ? AND clock_time = ? AND date = ? AND clock_type = ?
        ");
        
        $empStmt = $db->prepare("SELECT uid FROM emp_list WHERE uid = ?");
        
        foreach ($records as $i => $record) {
            try {
                // Validate required fields
                if (empty($record['employee_uid']) || empty($record['clock_type']) || 
                    empty($record['clock_time']) || empty($record['date'])) {
                    $errors[] = [
                        'index' => $i,
                        'error' => 'Missing required fields',
                        'record_id' => $record['id'] ?? 'unknown'
                    ];
                    $errorCount++;
                    continue;
                }
                
                // Check for duplicate
                $checkStmt->execute([
                    $record['employee_uid'],
                    $record['clock_time'],
                    $record['date'],
                    $record['clock_type']
                ]);
                
                if ($checkStmt->fetch()) {
                    $duplicateCount++;
                    error_log("Duplicate record found for employee {$record['employee_uid']} on {$record['date']} at {$record['clock_time']}");
                    continue;
                }
                
                // Ensure employee exists
                $empStmt->execute([$record['employee_uid']]);
                if (!$empStmt->fetch()) {
                    $errors[] = [
                        'index' => $i,
                        'error' => 'Employee not found',
                        'employee_uid' => $record['employee_uid']
                    ];
                    $errorCount++;
                    continue;
                }
                
                // Insert the attendance record
                $insertStmt->execute([
                    $record['employee_uid'],
                    $record['id_number'] ?? null,
                    $record['clock_type'],
                    $record['clock_time'],
                    $record['regular_hours'] ?? 0,
                    $record['overtime_hours'] ?? 0,
                    $record['date'],
                    $record['is_late'] ?? 0,
                    $record['notes'] ?? null,
                    $record['location'] ?? null,
                    $record['ip_address'] ?? null,
                    $record['device_info'] ?? null,
                    $record['created_at'] ?? date('Y-m-d H:i:s')
                ]);
                
                $processedCount++;
                
            } catch (Exception $recordError) {
                error_log("Error processing record $i: " . $recordError->getMessage());
                $errors[] = [
                    'index' => $i,
                    'error' => $recordError->getMessage(),
                    'employee_uid' => $record['employee_uid'] ?? null
                ];
                $errorCount++;
            }
        }
        
        $db->commit();
        
        // ✅ FIXED: Emit socket event for synced records
        if ($processedCount > 0) {
            $socketEvents = getSocketEvents();
            $socketEvents->attendanceSynced([
                'synced_count' => $processedCount,
                'processed_count' => $processedCount
            ]);
        }
        
        sendSuccessResponse([
            'message' => "Successfully processed {$processedCount} attendance records",
            'processed_count' => $processedCount,
            'duplicate_count' => $duplicateCount,
            'error_count' => $errorCount,
            'total_submitted' => count($records),
            'errors' => !empty($errors) ? $errors : null
        ]);
        
    } catch (Exception $e) {
        $db->rollBack();
        throw $e;
    }
}

function createAttendanceRecord($db, $input) {
    // Validate required fields
    $required = ['employee_uid', 'clock_type', 'clock_time', 'date'];
    foreach ($required as $field) {
        if (empty($input[$field])) {
            sendErrorResponse('Missing required fields', 400, ['required' => $required]);
            return;
        }
    }
    
    // Validate clock_type
    $validClockTypes = ['morning_in', 'morning_out', 'afternoon_in', 'afternoon_out', 'overtime_in', 'overtime_out'];
    if (!in_array($input['clock_type'], $validClockTypes)) {
        sendErrorResponse('Invalid clock_type', 400, ['valid_types' => $validClockTypes]);
        return;
    }
    
    // Check if employee exists
    $stmt = $db->prepare("SELECT uid FROM emp_list WHERE uid = ?");
    $stmt->execute([$input['employee_uid']]);
    if (!$stmt->fetch()) {
        sendErrorResponse('Employee not found', 400);
        return;
    }
    
    // Check for duplicates
    $stmt = $db->prepare("
        SELECT id FROM attendance 
        WHERE employee_uid = ? AND clock_time = ? AND date = ? AND clock_type = ?
    ");
    $stmt->execute([
        $input['employee_uid'],
        $input['clock_time'],
        $input['date'],
        $input['clock_type']
    ]);
    
    if ($existing = $stmt->fetch()) {
        sendErrorResponse('Duplicate attendance record', 409, ['existing_id' => $existing['id']]);
        return;
    }
    
    // Insert record
    $stmt = $db->prepare("
        INSERT INTO attendance (
            employee_uid, id_number, clock_type, clock_time, regular_hours, 
            overtime_hours, date, is_late, notes, location, ip_address, device_info, is_synced
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    ");
    
    $stmt->execute([
        $input['employee_uid'],
        $input['id_number'] ?? null,
        $input['clock_type'],
        $input['clock_time'],
        $input['regular_hours'] ?? 0,
        $input['overtime_hours'] ?? 0,
        $input['date'],
        $input['is_late'] ?? 0,
        $input['notes'] ?? null,
        $input['location'] ?? null,
        $input['ip_address'] ?? null,
        $input['device_info'] ?? null
    ]);
    
    $lastId = $db->lastInsertId();
    
    // Fetch the created record with employee details
    $stmt = $db->prepare("
        SELECT 
            a.*,
            e.first_name,
            e.middle_name,
            e.last_name,
            e.department,
            e.position
        FROM attendance a
        LEFT JOIN emp_list e ON a.employee_uid = e.uid
        WHERE a.id = ?
    ");
    $stmt->execute([$lastId]);
    $newRecord = $stmt->fetch(PDO::FETCH_ASSOC);
    
    $socketEvents = getSocketEvents();
    $socketEvents->attendanceCreated($newRecord);
    
    http_response_code(201);
    sendSuccessResponse([
        'message' => 'Attendance record created successfully',
        'data' => $newRecord
    ]);
}

function getUnsyncedRecords($db) {
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 100;
    
    $stmt = $db->prepare("
        SELECT 
            a.*,
            e.first_name,
            e.middle_name,
            e.last_name,
            e.department,
            e.position
        FROM attendance a
        LEFT JOIN emp_list e ON a.employee_uid = e.uid
        WHERE a.is_synced = 0
        ORDER BY a.created_at DESC
        LIMIT ?
    ");
    $stmt->execute([$limit]);
    $records = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $stmt = $db->query("SELECT COUNT(*) as count FROM attendance WHERE is_synced = 0");
    $totalUnsynced = $stmt->fetch(PDO::FETCH_ASSOC);
    
    sendSuccessResponse([
        'data' => $records,
        'total_unsynced' => (int)$totalUnsynced['count']
    ]);
}

function markRecordsSynced($db, $input) {
    if (!isset($input['record_ids']) || !is_array($input['record_ids']) || empty($input['record_ids'])) {
        sendErrorResponse('record_ids array is required', 400);
        return;
    }
    
    $placeholders = str_repeat('?,', count($input['record_ids']) - 1) . '?';
    $stmt = $db->prepare("
        UPDATE attendance 
        SET is_synced = 1, updated_at = CURRENT_TIMESTAMP 
        WHERE id IN ($placeholders)
    ");
    $stmt->execute($input['record_ids']);
    
    $updatedCount = $stmt->rowCount();
    
    sendSuccessResponse([
        'message' => "Marked {$updatedCount} records as synced",
        'updated_count' => $updatedCount
    ]);
    
    // ✅ FIXED: Emit socket event
    if ($updatedCount > 0) {
        $socketEvents = getSocketEvents();
        $socketEvents->attendanceSynced([
            'synced_count' => $updatedCount,
            'processed_count' => $updatedCount
        ]);
    }
}

function getAttendanceStats($db) {
    $date = $_GET['date'] ?? date('Y-m-d');
    
    // Today's statistics
    $stmt = $db->prepare("
        SELECT 
            COUNT(*) as total_records,
            COUNT(DISTINCT employee_uid) as unique_employees,
            SUM(regular_hours) as total_regular_hours,
            SUM(overtime_hours) as total_overtime_hours,
            SUM(CASE WHEN is_late = 1 THEN 1 ELSE 0 END) as late_count,
            COUNT(CASE WHEN clock_type LIKE '%_in' THEN 1 END) as clock_ins,
            COUNT(CASE WHEN clock_type LIKE '%_out' THEN 1 END) as clock_outs
        FROM attendance 
        WHERE date = ?
    ");
    $stmt->execute([$date]);
    $todayStats = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // Unsynced count
    $stmt = $db->query("SELECT COUNT(*) as count FROM attendance WHERE is_synced = 0");
    $unsyncedResult = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // Recent activity
    $stmt = $db->query("
        SELECT 
            a.clock_time,
            a.clock_type,
            a.employee_uid,
            e.first_name,
            e.last_name
        FROM attendance a
        LEFT JOIN emp_list e ON a.employee_uid = e.uid
        ORDER BY a.created_at DESC
        LIMIT 10
    ");
    $recentActivity = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    sendSuccessResponse([
        'data' => [
            'date' => $date,
            'statistics' => $todayStats,
            'unsynced_count' => (int)$unsyncedResult['count'],
            'recent_activity' => $recentActivity
        ]
    ]);
}

function getAttendanceById($db, $id) {
    $stmt = $db->prepare("
        SELECT 
            a.*,
            e.first_name,
            e.middle_name,
            e.last_name,
            e.department,
            e.position,
            e.email
        FROM attendance a
        LEFT JOIN emp_list e ON a.employee_uid = e.uid
        WHERE a.id = ?
    ");
    $stmt->execute([$id]);
    $record = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$record) {
        sendErrorResponse('Attendance record not found', 404);
        return;
    }
    
    sendSuccessResponse(['data' => $record]);
}

function updateAttendanceRecord($db, $id, $input) {
    // Check if record exists
    $stmt = $db->prepare("SELECT id FROM attendance WHERE id = ?");
    $stmt->execute([$id]);
    if (!$stmt->fetch()) {
        sendErrorResponse('Attendance record not found', 404);
        return;
    }
    
    // Validate clock_type if provided
    if (isset($input['clock_type'])) {
        $validClockTypes = ['morning_in', 'morning_out', 'afternoon_in', 'afternoon_out', 'overtime_in', 'overtime_out'];
        if (!in_array($input['clock_type'], $validClockTypes)) {
            sendErrorResponse('Invalid clock_type', 400, ['valid_types' => $validClockTypes]);
            return;
        }
    }
    
    // Build update query dynamically
    $updates = [];
    $params = [];
    
    $allowedFields = [
        'employee_uid', 'id_number', 'clock_type', 'clock_time', 'regular_hours',
        'overtime_hours', 'date', 'is_late', 'is_synced', 'notes', 'location', 
        'ip_address', 'device_info'
    ];
    
    foreach ($allowedFields as $field) {
        if (isset($input[$field])) {
            $updates[] = "$field = ?";
            $params[] = $input[$field];
        }
    }
    
    if (empty($updates)) {
        sendErrorResponse('No fields to update', 400);
        return;
    }
    
    $updates[] = "updated_at = CURRENT_TIMESTAMP";
    $params[] = $id;
    
    $stmt = $db->prepare("
        UPDATE attendance 
        SET " . implode(", ", $updates) . "
        WHERE id = ?
    ");
    $stmt->execute($params);
    
    // Fetch updated record with employee details
    $stmt = $db->prepare("
        SELECT 
            a.*,
            e.first_name,
            e.middle_name,
            e.last_name,
            e.department,
            e.position
        FROM attendance a
        LEFT JOIN emp_list e ON a.employee_uid = e.uid
        WHERE a.id = ?
    ");
    $stmt->execute([$id]);
    $updatedRecord = $stmt->fetch(PDO::FETCH_ASSOC);
    
   $socketEvents = getSocketEvents();
    $socketEvents->attendanceUpdated($updatedRecord);
    
    sendSuccessResponse([
        'message' => 'Attendance record updated successfully',
        'data' => $updatedRecord
    ]);
}

function deleteAttendanceRecord($db, $id) {
    // Check if record exists
    $stmt = $db->prepare("SELECT id FROM attendance WHERE id = ?");
    $stmt->execute([$id]);
    if (!$stmt->fetch()) {
        sendErrorResponse('Attendance record not found', 404);
        return;
    }
    
    $stmt = $db->prepare("DELETE FROM attendance WHERE id = ?");
    $stmt->execute([$id]);
    
     $socketEvents = getSocketEvents();
    $socketEvents->attendanceDeleted(['id' => (int)$id]);
    
    sendSuccessResponse(['message' => 'Attendance record deleted successfully']);
}

function getEmployeeAttendance($db, $employeeUid) {
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
    $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
    
    $conditions = ["a.employee_uid = ?"];
    $params = [$employeeUid];
    
    if (isset($_GET['start_date']) && isset($_GET['end_date'])) {
        $conditions[] = "a.date BETWEEN ? AND ?";
        $params[] = $_GET['start_date'];
        $params[] = $_GET['end_date'];
    }
    
    if (isset($_GET['clock_type'])) {
        $conditions[] = "a.clock_type = ?";
        $params[] = $_GET['clock_type'];
    }
    
    $whereClause = implode(" AND ", $conditions);
    
    $stmt = $db->prepare("
        SELECT 
            a.*,
            e.first_name,
            e.middle_name,
            e.last_name,
            e.department,
            e.position
        FROM attendance a
        LEFT JOIN emp_list e ON a.employee_uid = e.uid
        WHERE $whereClause
        ORDER BY a.date DESC, a.clock_time DESC
        LIMIT ? OFFSET ?
    ");
    $stmt->execute([...$params, $limit, $offset]);
    $records = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $stmt = $db->prepare("SELECT COUNT(*) as total FROM attendance a WHERE $whereClause");
    $stmt->execute($params);
    $totalResult = $stmt->fetch(PDO::FETCH_ASSOC);
    
    sendSuccessResponse([
        'data' => $records,
        'pagination' => [
            'total' => (int)$totalResult['total'],
            'limit' => $limit,
            'offset' => $offset
        ]
    ]);
}

function getEmployeeSummary($db, $employeeUid) {
    $params = [$employeeUid];
    $dateCondition = "";
    
    if (isset($_GET['start_date']) && isset($_GET['end_date'])) {
        $dateCondition = "AND date BETWEEN ? AND ?";
        $params[] = $_GET['start_date'];
        $params[] = $_GET['end_date'];
    }
    
    $stmt = $db->prepare("
        SELECT 
            COUNT(*) as total_records,
            SUM(regular_hours) as total_regular_hours,
            SUM(overtime_hours) as total_overtime_hours,
            SUM(CASE WHEN is_late = 1 THEN 1 ELSE 0 END) as late_count,
            COUNT(DISTINCT date) as days_worked
        FROM attendance 
        WHERE employee_uid = ? $dateCondition
    ");
    $stmt->execute($params);
    $summary = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // Get clock type breakdown
    $stmt = $db->prepare("
        SELECT 
            clock_type,
            COUNT(*) as count
        FROM attendance 
        WHERE employee_uid = ? $dateCondition
        GROUP BY clock_type
    ");
    $stmt->execute($params);
    $clockTypeBreakdown = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    sendSuccessResponse([
        'data' => [
            'summary' => $summary,
            'clock_type_breakdown' => $clockTypeBreakdown
        ]
    ]);
}
?>