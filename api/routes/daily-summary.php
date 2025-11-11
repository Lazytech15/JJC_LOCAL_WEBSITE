<?php
//daily-summary.php
// Load socket events
require_once __DIR__ . '/../socket.php';

// Get database connection
$db = getConnection();

// Get request method and parse path
$method = $_SERVER['REQUEST_METHOD'];
$requestUri = $_SERVER['REQUEST_URI'];
$scriptName = dirname($_SERVER['SCRIPT_NAME']);
$path = str_replace($scriptName, '', $requestUri);
$path = trim($path, '/');
$path = strtok($path, '?');
$segments = explode('/', $path);

// Remove 'daily-summary' from segments
array_shift($segments);
$action = $segments[0] ?? null;
$id = $segments[1] ?? null;

try {
    switch ($method) {
        case 'GET':
            if ($action === 'stats') {
                handleGetStats($db);
            } elseif ($action === 'employee' && $id) {
                handleGetEmployeeSummary($db, $id);
            } elseif ($action && is_numeric($action)) {
                handleGetById($db, $action);
            } else {
                handleGetAll($db);
            }
            break;
            
        case 'POST':
            if ($action === 'rebuild') {
                handleRebuild($db);
            } else {
                handleSync($db);
            }
            break;
            
        case 'DELETE':
            if ($action && is_numeric($action)) {
                handleDelete($db, $action);
            } else {
                sendErrorResponse('Invalid ID for deletion', 400);
            }
            break;
        case 'PUT':
            if ($action && is_numeric($action)) {
                handleUpdate($db, $action);
            } else {
                sendErrorResponse('Invalid ID for update', 400);
            }
            break;
            
        default:
            sendErrorResponse('Method not allowed', 405);
    }
} catch (Exception $e) {
    error_log("Daily Summary API Error: " . $e->getMessage());
    sendErrorResponse('Internal server error', 500, [
        'message' => $e->getMessage()
    ]);
}

// GET /api/daily-summary - Get daily attendance summary records with pagination and filtering
function handleGetAll($db) {
    $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 50;
    $offset = isset($_GET['offset']) ? intval($_GET['offset']) : 0;
    $employee_uid = $_GET['employee_uid'] ?? null;
    $id_number = $_GET['id_number'] ?? null;
    $date = $_GET['date'] ?? null;
    $start_date = $_GET['start_date'] ?? null;
    $end_date = $_GET['end_date'] ?? null;
    $department = $_GET['department'] ?? null;
    $has_overtime = $_GET['has_overtime'] ?? null;
    $is_incomplete = $_GET['is_incomplete'] ?? null;
    $has_late_entry = $_GET['has_late_entry'] ?? null;
    $sort_by = $_GET['sort_by'] ?? 'date';
    $sort_order = strtoupper($_GET['sort_order'] ?? 'DESC');
    
    // Build WHERE clause based on filters
    $conditions = [];
    $params = [];
    
    if ($employee_uid) {
        $conditions[] = "s.employee_uid = ?";
        $params[] = $employee_uid;
    }
    
    if ($id_number) {
        $conditions[] = "s.id_number = ?";
        $params[] = $id_number;
    }
    
    if ($date) {
        $conditions[] = "s.date = ?";
        $params[] = $date;
    }
    
    if ($department) {
        $conditions[] = "s.department = ?";
        $params[] = $department;
    }
    
    if ($has_overtime !== null) {
        $conditions[] = "s.has_overtime = ?";
        $params[] = ($has_overtime === 'true') ? 1 : 0;
    }
    
    if ($is_incomplete !== null) {
        $conditions[] = "s.is_incomplete = ?";
        $params[] = ($is_incomplete === 'true') ? 1 : 0;
    }
    
    if ($has_late_entry !== null) {
        $conditions[] = "s.has_late_entry = ?";
        $params[] = ($has_late_entry === 'true') ? 1 : 0;
    }
    
    if ($start_date && $end_date) {
        $conditions[] = "s.date BETWEEN ? AND ?";
        $params[] = $start_date;
        $params[] = $end_date;
    } elseif ($start_date) {
        $conditions[] = "s.date >= ?";
        $params[] = $start_date;
    } elseif ($end_date) {
        $conditions[] = "s.date <= ?";
        $params[] = $end_date;
    }
    
    $whereClause = count($conditions) > 0 ? "WHERE " . implode(" AND ", $conditions) : "";
    
    // Validate sort parameters
    $allowedSortColumns = [
        'date', 'employee_name', 'department', 'total_hours',
        'regular_hours', 'overtime_hours', 'last_updated'
    ];
    $sortColumn = in_array($sort_by, $allowedSortColumns) ? $sort_by : 'date';
    $sortDirection = ($sort_order === 'ASC') ? 'ASC' : 'DESC';
    
    // Main query with employee details
    $query = "
        SELECT 
            s.*,
            e.email,
            e.position,
            e.hire_date,
            e.status as employee_status
        FROM daily_attendance_summary s
        LEFT JOIN emp_list e ON s.employee_uid = e.uid
        {$whereClause}
        ORDER BY s.{$sortColumn} {$sortDirection}
        LIMIT ? OFFSET ?
    ";
    
    $queryParams = array_merge($params, [$limit, $offset]);
    $stmt = $db->prepare($query);
    $stmt->execute($queryParams);
    $records = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get total count
    $countQuery = "
        SELECT COUNT(*) as total 
        FROM daily_attendance_summary s 
        {$whereClause}
    ";
    $countStmt = $db->prepare($countQuery);
    $countStmt->execute($params);
    $totalResult = $countStmt->fetch(PDO::FETCH_ASSOC);
    
    sendSuccessResponse([
        'data' => $records,
        'pagination' => [
            'total' => intval($totalResult['total']),
            'limit' => $limit,
            'offset' => $offset,
            'pages' => ceil($totalResult['total'] / $limit)
        ]
    ]);
}

// POST /api/daily-summary - Handle daily summary sync from Electron app
function handleSync($db) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Handle both single record and array formats
    $records = [];
    if (isset($input['daily_summary_data'])) {
        $records = is_array($input['daily_summary_data']) ? $input['daily_summary_data'] : [$input['daily_summary_data']];
    } elseif (is_array($input) && isset($input[0])) {
        $records = $input;
    }
    
    if (count($records) === 0) {
        sendSuccessResponse([
            'message' => 'No daily summary records to process',
            'processed_count' => 0
        ]);
        return;
    }
    
    error_log("Processing " . count($records) . " daily summary records from sync");
    
    $processedCount = 0;
    $duplicateCount = 0;
    $errorCount = 0;
    $errors = [];
    $createdRecords = [];
    $updatedRecords = [];
    
    try {
        $db->beginTransaction();
        
        foreach ($records as $i => $record) {
            try {
                // Validate required fields
                if (empty($record['employee_uid']) || empty($record['date']) || empty($record['employee_name'])) {
                    $errors[] = [
                        'index' => $i,
                        'error' => 'Missing required fields (employee_uid, date, employee_name)',
                        'record_id' => $record['id'] ?? 'unknown'
                    ];
                    $errorCount++;
                    continue;
                }
                
                // Check for existing record
                $stmt = $db->prepare("
                    SELECT id, last_updated FROM daily_attendance_summary 
                    WHERE employee_uid = ? AND date = ?
                ");
                $stmt->execute([$record['employee_uid'], $record['date']]);
                $existingRecord = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($existingRecord) {
                    // Compare timestamps
                    $existingTimestamp = strtotime($existingRecord['last_updated'] ?? '1970-01-01');
                    $newTimestamp = strtotime($record['last_updated'] ?? '1970-01-01');
                    
                    if ($newTimestamp <= $existingTimestamp) {
                        $duplicateCount++;
                        error_log("Skipping older/duplicate record for employee {$record['employee_uid']} on {$record['date']}");
                        continue;
                    }
                    
                    // Update existing record
                    $updateStmt = $db->prepare("
                        UPDATE daily_attendance_summary SET
                            id_number = ?,
                            id_barcode = ?,
                            employee_name = ?,
                            first_name = ?,
                            last_name = ?,
                            department = ?,
                            first_clock_in = ?,
                            last_clock_out = ?,
                            morning_in = ?,
                            morning_out = ?,
                            afternoon_in = ?,
                            afternoon_out = ?,
                            evening_in = ?,
                            evening_out = ?,
                            overtime_in = ?,
                            overtime_out = ?,
                            regular_hours = ?,
                            overtime_hours = ?,
                            total_hours = ?,
                            morning_hours = ?,
                            afternoon_hours = ?,
                            evening_hours = ?,
                            overtime_session_hours = ?,
                            is_incomplete = ?,
                            has_late_entry = ?,
                            has_overtime = ?,
                            has_evening_session = ?,
                            total_sessions = ?,
                            completed_sessions = ?,
                            pending_sessions = ?,
                            total_minutes_worked = ?,
                            break_time_minutes = ?,
                            last_updated = ?
                        WHERE id = ?
                    ");
                    
                    $updateStmt->execute([
                    $record['id_number'] ?? null,
                    $record['id_barcode'] ?? null,
                    $record['employee_name'],
                    $record['first_name'] ?? null,
                    $record['last_name'] ?? null,
                    $record['department'] ?? null,
                    convertIsoToMysql($record['first_clock_in'] ?? null),  // Convert
                    convertIsoToMysql($record['last_clock_out'] ?? null),  // Convert
                    convertIsoToMysql($record['morning_in'] ?? null),      // Convert
                    convertIsoToMysql($record['morning_out'] ?? null),     // Convert
                    convertIsoToMysql($record['afternoon_in'] ?? null),    // Convert
                    convertIsoToMysql($record['afternoon_out'] ?? null),   // Convert
                    convertIsoToMysql($record['evening_in'] ?? null),      // Convert
                    convertIsoToMysql($record['evening_out'] ?? null),     // Convert
                    convertIsoToMysql($record['overtime_in'] ?? null),     // Convert
                    convertIsoToMysql($record['overtime_out'] ?? null),    // Convert
                    $record['regular_hours'] ?? 0,
                    $record['overtime_hours'] ?? 0,
                    $record['total_hours'] ?? 0,
                    $record['morning_hours'] ?? 0,
                    $record['afternoon_hours'] ?? 0,
                    $record['evening_hours'] ?? 0,
                    $record['overtime_session_hours'] ?? 0,
                    $record['is_incomplete'] ?? 0,
                    $record['has_late_entry'] ?? 0,
                    $record['has_overtime'] ?? 0,
                    $record['has_evening_session'] ?? 0,
                    $record['total_sessions'] ?? 0,
                    $record['completed_sessions'] ?? 0,
                    $record['pending_sessions'] ?? 0,
                    $record['total_minutes_worked'] ?? 0,
                    $record['break_time_minutes'] ?? 0,
                    convertIsoToMysql($record['last_updated'] ?? date('c')),  // Convert
                    $existingRecord['id']
                ]);
                    
                    $updatedRecords[] = [
                        'id' => $existingRecord['id'],
                        'employee_uid' => $record['employee_uid'],
                        'date' => $record['date']
                    ];
                } else {
                    // Insert new record
                    $insertStmt = $db->prepare("
                        INSERT INTO daily_attendance_summary (
                            employee_uid, id_number, id_barcode, employee_name, first_name, last_name,
                            department, date, first_clock_in, last_clock_out, morning_in, morning_out,
                            afternoon_in, afternoon_out, evening_in, evening_out, overtime_in, overtime_out,
                            regular_hours, overtime_hours, total_hours, morning_hours, afternoon_hours,
                            evening_hours, overtime_session_hours, is_incomplete, has_late_entry,
                            has_overtime, has_evening_session, total_sessions, completed_sessions,
                            pending_sessions, total_minutes_worked, break_time_minutes, last_updated, created_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ");
                    
                    $insertStmt->execute([
                    $record['employee_uid'],
                    $record['id_number'] ?? null,
                    $record['id_barcode'] ?? null,
                    $record['employee_name'],
                    $record['first_name'] ?? null,
                    $record['last_name'] ?? null,
                    $record['department'] ?? null,
                    $record['date'],
                    convertIsoToMysql($record['first_clock_in'] ?? null),  // Convert
                    convertIsoToMysql($record['last_clock_out'] ?? null),  // Convert
                    convertIsoToMysql($record['morning_in'] ?? null),      // Convert
                    convertIsoToMysql($record['morning_out'] ?? null),     // Convert
                    convertIsoToMysql($record['afternoon_in'] ?? null),    // Convert
                    convertIsoToMysql($record['afternoon_out'] ?? null),   // Convert
                    convertIsoToMysql($record['evening_in'] ?? null),      // Convert
                    convertIsoToMysql($record['evening_out'] ?? null),     // Convert
                    convertIsoToMysql($record['overtime_in'] ?? null),     // Convert
                    convertIsoToMysql($record['overtime_out'] ?? null),    // Convert
                    $record['regular_hours'] ?? 0,
                    $record['overtime_hours'] ?? 0,
                    $record['total_hours'] ?? 0,
                    $record['morning_hours'] ?? 0,
                    $record['afternoon_hours'] ?? 0,
                    $record['evening_hours'] ?? 0,
                    $record['overtime_session_hours'] ?? 0,
                    $record['is_incomplete'] ?? 0,
                    $record['has_late_entry'] ?? 0,
                    $record['has_overtime'] ?? 0,
                    $record['has_evening_session'] ?? 0,
                    $record['total_sessions'] ?? 0,
                    $record['completed_sessions'] ?? 0,
                    $record['pending_sessions'] ?? 0,
                    $record['total_minutes_worked'] ?? 0,
                    $record['break_time_minutes'] ?? 0,
                    convertIsoToMysql($record['last_updated'] ?? date('c')),   // Convert
                    convertIsoToMysql($record['created_at'] ?? date('c'))      // Convert
                ]);
                    
                    $newId = $db->lastInsertId();
                    $createdRecords[] = [
                        'id' => $newId,
                        'employee_uid' => $record['employee_uid'],
                        'date' => $record['date']
                    ];
                }
                
                $processedCount++;
                
            } catch (Exception $recordError) {
                error_log("Error processing daily summary record {$i}: " . $recordError->getMessage());
                $errors[] = [
                    'index' => $i,
                    'error' => $recordError->getMessage(),
                    'employee_uid' => $record['employee_uid'] ?? null,
                    'date' => $record['date'] ?? null
                ];
                $errorCount++;
            }
        }
        
        $db->commit();
        
        // Emit socket events for successful operations
        $socketEvents = getSocketEvents();
        
        // Emit sync event
        if ($processedCount > 0) {
            $socketEvents->dailySummarySynced([
                'synced_count' => $processedCount,
                'processed_count' => $processedCount
            ]);
        }
        
        // Emit individual created events
        foreach ($createdRecords as $created) {
            $socketEvents->dailySummaryCreated($created);
        }
        
        // Emit individual updated events
        foreach ($updatedRecords as $updated) {
            $socketEvents->dailySummaryUpdated($updated);
        }
        
        sendSuccessResponse([
            'message' => "Successfully processed {$processedCount} daily summary records",
            'processed_count' => $processedCount,
            'duplicate_count' => $duplicateCount,
            'error_count' => $errorCount,
            'total_submitted' => count($records),
            'errors' => count($errors) > 0 ? $errors : null
        ]);
        
    } catch (Exception $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        throw $e;
    }
}

// Helper function to convert ISO 8601 datetime to MySQL format
function convertIsoToMysql($isoString) {
    if (empty($isoString) || $isoString === null) {
        return null;
    }
    
    try {
        $date = new DateTime($isoString);
        return $date->format('Y-m-d H:i:s');
    } catch (Exception $e) {
        error_log("Error converting datetime '{$isoString}': " . $e->getMessage());
        return null;
    }
}

// GET /api/daily-summary/stats - Get daily summary statistics
function handleGetStats($db) {
    $date = $_GET['date'] ?? date('Y-m-d');
    $start_date = $_GET['start_date'] ?? null;
    $end_date = $_GET['end_date'] ?? null;
    
    $dateFilter = "s.date = ?";
    $dateParams = [$date];
    
    if ($start_date && $end_date) {
        $dateFilter = "s.date BETWEEN ? AND ?";
        $dateParams = [$start_date, $end_date];
    }
    
    // Summary statistics
    $summaryStmt = $db->prepare("
        SELECT 
            COUNT(*) as total_records,
            COUNT(DISTINCT s.employee_uid) as unique_employees,
            COUNT(DISTINCT s.department) as departments_count,
            SUM(s.regular_hours) as total_regular_hours,
            SUM(s.overtime_hours) as total_overtime_hours,
            SUM(s.total_hours) as grand_total_hours,
            AVG(s.total_hours) as avg_hours_per_employee,
            SUM(CASE WHEN s.has_overtime = 1 THEN 1 ELSE 0 END) as employees_with_overtime,
            SUM(CASE WHEN s.is_incomplete = 1 THEN 1 ELSE 0 END) as incomplete_records,
            SUM(CASE WHEN s.has_late_entry = 1 THEN 1 ELSE 0 END) as employees_with_late_entry
        FROM daily_attendance_summary s
        WHERE {$dateFilter}
    ");
    $summaryStmt->execute($dateParams);
    $summaryStats = $summaryStmt->fetch(PDO::FETCH_ASSOC);
    
    // Department breakdown
    $deptStmt = $db->prepare("
        SELECT 
            s.department,
            COUNT(*) as employee_count,
            SUM(s.regular_hours) as total_regular_hours,
            SUM(s.overtime_hours) as total_overtime_hours,
            SUM(s.total_hours) as total_hours,
            AVG(s.total_hours) as avg_hours
        FROM daily_attendance_summary s
        WHERE {$dateFilter}
        GROUP BY s.department
        ORDER BY total_hours DESC
    ");
    $deptStmt->execute($dateParams);
    $departmentStats = $deptStmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Top overtime earners
    $overtimeStmt = $db->prepare("
        SELECT 
            s.employee_name,
            s.department,
            s.date,
            s.overtime_hours,
            s.total_hours
        FROM daily_attendance_summary s
        WHERE {$dateFilter} AND s.overtime_hours > 0
        ORDER BY s.overtime_hours DESC
        LIMIT 10
    ");
    $overtimeStmt->execute($dateParams);
    $overtimeLeaders = $overtimeStmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Recent activity summary
    $recentStmt = $db->prepare("
        SELECT 
            s.employee_name,
            s.department,
            s.date,
            s.total_hours,
            s.is_incomplete,
            s.has_late_entry,
            s.has_overtime,
            s.last_updated
        FROM daily_attendance_summary s
        ORDER BY s.last_updated DESC
        LIMIT 10
    ");
    $recentStmt->execute();
    $recentActivity = $recentStmt->fetchAll(PDO::FETCH_ASSOC);
    
    sendSuccessResponse([
        'data' => [
            'date_range' => ($start_date && $end_date) ? ['start_date' => $start_date, 'end_date' => $end_date] : ['date' => $date],
            'summary' => $summaryStats,
            'by_department' => $departmentStats,
            'overtime_leaders' => $overtimeLeaders,
            'recent_activity' => $recentActivity
        ]
    ]);
}

// GET /api/daily-summary/:id - Get specific daily summary record
function handleGetById($db, $id) {
    $stmt = $db->prepare("
        SELECT 
            s.*,
            e.email,
            e.position,
            e.hire_date,
            e.status as employee_status
        FROM daily_attendance_summary s
        LEFT JOIN emp_list e ON s.employee_uid = e.uid
        WHERE s.id = ?
    ");
    $stmt->execute([$id]);
    $record = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$record) {
        sendErrorResponse('Daily summary record not found', 404);
        return;
    }
    
    sendSuccessResponse(['data' => $record]);
}

// GET /api/daily-summary/employee/:employee_uid - Get daily summary for specific employee
function handleGetEmployeeSummary($db, $employee_uid) {
    $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 50;
    $offset = isset($_GET['offset']) ? intval($_GET['offset']) : 0;
    $start_date = $_GET['start_date'] ?? null;
    $end_date = $_GET['end_date'] ?? null;
    
    $conditions = ["s.employee_uid = ?"];
    $params = [$employee_uid];
    
    if ($start_date && $end_date) {
        $conditions[] = "s.date BETWEEN ? AND ?";
        $params[] = $start_date;
        $params[] = $end_date;
    }
    
    $whereClause = implode(" AND ", $conditions);
    
    // Get records
    $stmt = $db->prepare("
        SELECT 
            s.*,
            e.email,
            e.position
        FROM daily_attendance_summary s
        LEFT JOIN emp_list e ON s.employee_uid = e.uid
        WHERE {$whereClause}
        ORDER BY s.date DESC
        LIMIT ? OFFSET ?
    ");
    $stmt->execute(array_merge($params, [$limit, $offset]));
    $records = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get total count
    $countStmt = $db->prepare("
        SELECT COUNT(*) as total 
        FROM daily_attendance_summary s 
        WHERE {$whereClause}
    ");
    $countStmt->execute($params);
    $totalResult = $countStmt->fetch(PDO::FETCH_ASSOC);
    
    // Calculate summary
    $summaryStmt = $db->prepare("
        SELECT 
            COUNT(*) as total_days,
            SUM(s.regular_hours) as total_regular_hours,
            SUM(s.overtime_hours) as total_overtime_hours,
            SUM(s.total_hours) as grand_total_hours,
            AVG(s.total_hours) as avg_daily_hours,
            SUM(CASE WHEN s.has_overtime = 1 THEN 1 ELSE 0 END) as days_with_overtime,
            SUM(CASE WHEN s.has_late_entry = 1 THEN 1 ELSE 0 END) as days_with_late_entry,
            SUM(CASE WHEN s.is_incomplete = 1 THEN 1 ELSE 0 END) as incomplete_days
        FROM daily_attendance_summary s 
        WHERE {$whereClause}
    ");
    $summaryStmt->execute($params);
    $employeeSummary = $summaryStmt->fetch(PDO::FETCH_ASSOC);
    
    sendSuccessResponse([
        'data' => [
            'records' => $records,
            'summary' => $employeeSummary,
            'pagination' => [
                'total' => intval($totalResult['total']),
                'limit' => $limit,
                'offset' => $offset
            ]
        ]
    ]);
}

// DELETE /api/daily-summary/:id - Delete daily summary record
function handleDelete($db, $id) {
    // Check if record exists
    $stmt = $db->prepare("SELECT id, employee_uid, date FROM daily_attendance_summary WHERE id = ?");
    $stmt->execute([$id]);
    $existingRecord = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$existingRecord) {
        sendErrorResponse('Daily summary record not found', 404);
        return;
    }
    
    $deleteStmt = $db->prepare("DELETE FROM daily_attendance_summary WHERE id = ?");
    $deleteStmt->execute([$id]);
    
    // Emit socket event
    $socketEvents = getSocketEvents();
    $socketEvents->dailySummaryDeleted([
        'id' => intval($id),
        'employee_uid' => $existingRecord['employee_uid'],
        'date' => $existingRecord['date']
    ]);
    
    sendSuccessResponse(['message' => 'Daily summary record deleted successfully']);
}

// POST /api/daily-summary/rebuild - Rebuild daily summary for date range
function handleRebuild($db) {
    $input = json_decode(file_get_contents('php://input'), true);
    $start_date = $input['start_date'] ?? null;
    $end_date = $input['end_date'] ?? null;
    
    if (!$start_date || !$end_date) {
        sendErrorResponse('start_date and end_date are required', 400);
        return;
    }
    
    error_log("Rebuilding daily summary from {$start_date} to {$end_date}");
    
    try {
        // Get all unique employee-date combinations
        $stmt = $db->prepare("
            SELECT DISTINCT employee_uid, date
            FROM attendance 
            WHERE date BETWEEN ? AND ?
            ORDER BY employee_uid, date
        ");
        $stmt->execute([$start_date, $end_date]);
        $employeeDates = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $successCount = 0;
        $failCount = 0;
        
        $db->beginTransaction();
        
        foreach ($employeeDates as $row) {
            $employee_uid = $row['employee_uid'];
            $date = $row['date'];
            
            try {
                // Get employee info
                $empStmt = $db->prepare("
                    SELECT uid, id_number, id_barcode, first_name, last_name, department
                    FROM emp_list WHERE uid = ?
                ");
                $empStmt->execute([$employee_uid]);
                $employee = $empStmt->fetch(PDO::FETCH_ASSOC);
                
                if (!$employee) {
                    $failCount++;
                    continue;
                }
                
                // Get attendance records
                $attStmt = $db->prepare("
                    SELECT * FROM attendance 
                    WHERE employee_uid = ? AND date = ?
                    ORDER BY clock_time ASC
                ");
                $attStmt->execute([$employee_uid, $date]);
                $attendanceRecords = $attStmt->fetchAll(PDO::FETCH_ASSOC);
                
                if (count($attendanceRecords) === 0) {
                    $failCount++;
                    continue;
                }
                
                // Process records to build summary
                $sessionTimes = [
                    'morning_in' => null, 'morning_out' => null,
                    'afternoon_in' => null, 'afternoon_out' => null,
                    'evening_in' => null, 'evening_out' => null,
                    'overtime_in' => null, 'overtime_out' => null
                ];
                
                $totalRegularHours = 0;
                $totalOvertimeHours = 0;
                $totalSessions = 0;
                $completedSessions = 0;
                $pendingSessions = 0;
                $hasLateEntry = false;
                $hasOvertime = false;
                $hasEveningSession = false;
                
                foreach ($attendanceRecords as $record) {
                    $clockType = $record['clock_type'];
                    
                    if (array_key_exists($clockType, $sessionTimes)) {
                        $sessionTimes[$clockType] = $record['clock_time'];
                    }
                    
                    $totalRegularHours += floatval($record['regular_hours'] ?? 0);
                    $totalOvertimeHours += floatval($record['overtime_hours'] ?? 0);
                    
                    if (substr($clockType, -3) === '_in') {
                        $totalSessions++;
                        $outType = str_replace('_in', '_out', $clockType);
                        $hasOut = false;
                        foreach ($attendanceRecords as $r) {
                            if ($r['clock_type'] === $outType && $r['clock_time'] > $record['clock_time']) {
                                $hasOut = true;
                                break;
                            }
                        }
                        if ($hasOut) {
                            $completedSessions++;
                        } else {
                            $pendingSessions++;
                        }
                    }
                    
                    if ($record['is_late']) $hasLateEntry = true;
                    if (strpos($clockType, 'overtime') === 0 || strpos($clockType, 'evening') === 0) {
                        $hasOvertime = true;
                        if (strpos($clockType, 'evening') === 0) $hasEveningSession = true;
                    }
                }
                
                // Calculate session hours
                $morningSession = $sessionTimes['morning_in'] && $sessionTimes['morning_out'];
                $afternoonSession = $sessionTimes['afternoon_in'] && $sessionTimes['afternoon_out'];
                $eveningSession = $sessionTimes['evening_in'] && $sessionTimes['evening_out'];
                $overtimeSession = $sessionTimes['overtime_in'] && $sessionTimes['overtime_out'];
                
                $morningHours = 0;
                $afternoonHours = 0;
                $eveningHours = 0;
                $overtimeSessionHours = 0;
                
                if ($morningSession || $afternoonSession) {
                    $regularSessionCount = ($morningSession ? 1 : 0) + ($afternoonSession ? 1 : 0);
                    if ($morningSession) $morningHours = $totalRegularHours / $regularSessionCount;
                    if ($afternoonSession) $afternoonHours = $totalRegularHours / $regularSessionCount;
                }
                
                if ($eveningSession) $eveningHours = $totalOvertimeHours * 0.7;
                if ($overtimeSession) $overtimeSessionHours = $totalOvertimeHours * 0.3;
                
                // Get first clock in and last clock out
                $firstClockIn = null;
                $lastClockOut = null;
                
                foreach ($attendanceRecords as $record) {
                    if (substr($record['clock_type'], -3) === '_in' && !$firstClockIn) {
                        $firstClockIn = $record['clock_time'];
                    }
                }
                
                for ($i = count($attendanceRecords) - 1; $i >= 0; $i--) {
                    if (substr($attendanceRecords[$i]['clock_type'], -4) === '_out') {
                        $lastClockOut = $attendanceRecords[$i]['clock_time'];
                        break;
                    }
                }
                
                // Calculate total minutes worked
                $totalMinutesWorked = 0;
                if ($firstClockIn && $lastClockOut) {
                    $firstTime = strtotime($firstClockIn);
                    $lastTime = strtotime($lastClockOut);
                    $totalMinutesWorked = round(($lastTime - $firstTime) / 60);
                    if ($morningSession && $afternoonSession) {
                        $totalMinutesWorked = max(0, $totalMinutesWorked - 60);
                    }
                }
                
                $breakTimeMinutes = ($morningSession && $afternoonSession) ? 60 : 0;
                
                // Upsert summary record
                $upsertStmt = $db->prepare("
                    INSERT OR REPLACE INTO daily_attendance_summary (
                        employee_uid, id_number, id_barcode, employee_name, first_name, last_name,
                        department, date, first_clock_in, last_clock_out,
                        morning_in, morning_out, afternoon_in, afternoon_out,
                        evening_in, evening_out, overtime_in, overtime_out,
                        regular_hours, overtime_hours, total_hours,
                        morning_hours, afternoon_hours, evening_hours, overtime_session_hours,
                        is_incomplete, has_late_entry, has_overtime, has_evening_session,
                        total_sessions, completed_sessions, pending_sessions,
                        total_minutes_worked, break_time_minutes, last_updated
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ");
                
                $upsertStmt->execute([
                    $employee['uid'],
                    $employee['id_number'],
                    $employee['id_barcode'],
                    $employee['first_name'] . ' ' . $employee['last_name'],
                    $employee['first_name'],
                    $employee['last_name'],
                    $employee['department'],
                    $date,
                    $firstClockIn,
                    $lastClockOut,
                    $sessionTimes['morning_in'],
                    $sessionTimes['morning_out'],
                    $sessionTimes['afternoon_in'],
                    $sessionTimes['afternoon_out'],
                    $sessionTimes['evening_in'],
                    $sessionTimes['evening_out'],
                    $sessionTimes['overtime_in'],
                    $sessionTimes['overtime_out'],
                    $totalRegularHours,
                    $totalOvertimeHours,
                    $totalRegularHours + $totalOvertimeHours,
                    $morningHours,
                    $afternoonHours,
                    $eveningHours,
                    $overtimeSessionHours,
                    $pendingSessions > 0 ? 1 : 0,
                    $hasLateEntry ? 1 : 0,
                    $hasOvertime ? 1 : 0,
                    $hasEveningSession ? 1 : 0,
                    $totalSessions,
                    $completedSessions,
                    $pendingSessions,
                    $totalMinutesWorked,
                    $breakTimeMinutes,
                    date('c')
                ]);
                
                $successCount++;
                
            } catch (Exception $recordError) {
                error_log("Error rebuilding summary for employee {$employee_uid} on {$date}: " . $recordError->getMessage());
                $failCount++;
            }
        }
        
        $db->commit();
        
        error_log("Daily summary rebuild completed: {$successCount} successful, {$failCount} failed");
        
        // Emit socket event
        $socketEvents = getSocketEvents();
        $socketEvents->dailySummaryRebuilt([
            'processed_count' => $successCount + $failCount,
            'success_count' => $successCount,
            'fail_count' => $failCount
        ]);
        
        sendSuccessResponse([
            'message' => 'Daily summary rebuild completed',
            'processed_count' => $successCount + $failCount,
            'success_count' => $successCount,
            'fail_count' => $failCount,
            'date_range' => ['start_date' => $start_date, 'end_date' => $end_date]
        ]);
        
    } catch (Exception $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        throw $e;
    }
}

// PUT /api/daily-summary/:id - Update daily summary record
function handleUpdate($db, $id) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Check if record exists
    $stmt = $db->prepare("SELECT * FROM daily_attendance_summary WHERE id = ?");
    $stmt->execute([$id]);
    $existingRecord = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$existingRecord) {
        sendErrorResponse('Daily summary record not found', 404);
        return;
    }
    
    try {
        $db->beginTransaction();
        
        // Build update query dynamically based on provided fields
        $updateFields = [];
        $params = [];
        
        // Session times
        $timeFields = [
            'morning_in', 'morning_out', 'afternoon_in', 'afternoon_out',
            'evening_in', 'evening_out', 'overtime_in', 'overtime_out',
            'first_clock_in', 'last_clock_out'
        ];
        
        foreach ($timeFields as $field) {
            if (isset($input[$field])) {
                $updateFields[] = "$field = ?";
                $params[] = convertIsoToMysql($input[$field]);
            }
        }
        
        // Hours fields
        $hoursFields = [
            'regular_hours', 'overtime_hours', 'total_hours',
            'morning_hours', 'afternoon_hours', 'evening_hours', 'overtime_session_hours'
        ];
        
        foreach ($hoursFields as $field) {
            if (isset($input[$field])) {
                $updateFields[] = "$field = ?";
                $params[] = floatval($input[$field]);
            }
        }
        
        // Boolean fields
        $boolFields = [
            'is_incomplete', 'has_late_entry', 'has_overtime', 'has_evening_session'
        ];
        
        foreach ($boolFields as $field) {
            if (isset($input[$field])) {
                $updateFields[] = "$field = ?";
                $params[] = $input[$field] ? 1 : 0;
            }
        }
        
        // Integer fields
        $intFields = [
            'total_sessions', 'completed_sessions', 'pending_sessions',
            'total_minutes_worked', 'break_time_minutes'
        ];
        
        foreach ($intFields as $field) {
            if (isset($input[$field])) {
                $updateFields[] = "$field = ?";
                $params[] = intval($input[$field]);
            }
        }
        
        // Always update last_updated
        $updateFields[] = "last_updated = ?";
        $params[] = date('Y-m-d H:i:s');
        
        if (count($updateFields) === 1) { // Only last_updated
            sendErrorResponse('No fields to update', 400);
            return;
        }
        
        // Build and execute update query
        $updateQuery = "UPDATE daily_attendance_summary SET " . 
                       implode(", ", $updateFields) . 
                       " WHERE id = ?";
        $params[] = $id;
        
        $updateStmt = $db->prepare($updateQuery);
        $updateStmt->execute($params);
        
        // Recalculate total_hours if regular_hours or overtime_hours was updated
        if (isset($input['regular_hours']) || isset($input['overtime_hours'])) {
            $recalcStmt = $db->prepare("
                UPDATE daily_attendance_summary 
                SET total_hours = regular_hours + overtime_hours 
                WHERE id = ?
            ");
            $recalcStmt->execute([$id]);
        }
        
        $db->commit();
        
        // Fetch updated record
        $stmt = $db->prepare("SELECT * FROM daily_attendance_summary WHERE id = ?");
        $stmt->execute([$id]);
        $updatedRecord = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Emit socket event
        $socketEvents = getSocketEvents();
        $socketEvents->dailySummaryUpdated([
            'id' => intval($id),
            'employee_uid' => $updatedRecord['employee_uid'],
            'date' => $updatedRecord['date']
        ]);
        
        sendSuccessResponse([
            'message' => 'Daily summary record updated successfully',
            'data' => $updatedRecord
        ]);
        
    } catch (Exception $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        error_log("Error updating daily summary record: " . $e->getMessage());
        sendErrorResponse('Failed to update record', 500, [
            'message' => $e->getMessage()
        ]);
    }
}

?>