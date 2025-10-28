<?php
// attendance-edits.php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../socket.php';

// Get database connection
$db = getConnection();

// Create attendance_deletions table if it doesn't exist
try {
    $db->exec("
        CREATE TABLE IF NOT EXISTS attendance_deletions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            attendance_id INT NOT NULL,
            employee_uid VARCHAR(255) NOT NULL,
            date DATE NOT NULL,
            clock_type VARCHAR(50),
            clock_time DATETIME,
            deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            deleted_by VARCHAR(255),
            INDEX idx_deleted_at (deleted_at),
            INDEX idx_attendance_id (attendance_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
} catch (Exception $e) {
    error_log("Failed to create attendance_deletions table: " . $e->getMessage());
}

// Get request method and parse request body
$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true) ?? [];

// Use segments from index.php router
$resourceId = $segments[1] ?? null;
$action = $segments[2] ?? null;

error_log("Attendance-Edits - Method: {$method}");
error_log("Attendance-Edits - ResourceId: " . print_r($resourceId, true));
error_log("Attendance-Edits - Action: " . print_r($action, true));

try {
    // Route based on method and path
    if ($method === 'GET' && $resourceId === 'range') {
        // GET /api/attendanceEdit/range - Get records for date range (for comparison)
        error_log("Route: GET attendance by date range");
        getAttendanceByDateRange($db);
        
    } elseif ($method === 'GET' && !$resourceId) {
        // Existing GET /api/attendanceEdit route
        error_log("Route: GET edited/deleted records");
        getEditedRecords($db);
        
    } elseif ($method === 'POST' && !$resourceId) {
        // POST /api/attendanceEdit - Add new attendance record
        error_log("Route: POST add attendance record");
        addAttendanceRecord($db, $input);
        
    } elseif ($method === 'PUT' && $resourceId && is_numeric($resourceId)) {
        // PUT /api/attendanceEdit/:id - Edit attendance record
        error_log("Route: PUT edit attendance record");
        editAttendanceRecord($db, $resourceId, $input);
        
    } elseif ($method === 'DELETE' && $resourceId && is_numeric($resourceId)) {
        // DELETE /api/attendanceEdit/:id - Delete attendance record
        error_log("Route: DELETE attendance record");
        deleteAttendanceRecord($db, $resourceId);
        
    } elseif ($method === 'POST' && $resourceId === 'batch') {
        // POST /api/attendanceEdit/batch - Batch edit multiple records
        error_log("Route: POST batch edit");
        batchEditRecords($db, $input);
        
    } elseif ($method === 'POST' && $resourceId === 'mark-synced') {
        // POST /api/attendanceEdit/mark-synced - Mark records as synced
        error_log("Route: POST mark records as synced");
        markRecordsAsSynced($db, $input);
    
    } elseif ($method === 'POST' && $resourceId === 'batch-upload') {
        // POST /api/attendanceEdit/batch-upload - Upload batch of new attendance records
        error_log("Route: POST batch upload attendance");
        batchUploadAttendance($db, $input);
        
    } elseif ($method === 'POST' && $resourceId === 'batch-upload-summaries') {
        // POST /api/daily-summary/batch-upload - Upload batch of regenerated summaries
        error_log("Route: POST batch upload summaries");
        batchUploadSummaries($db, $input);
        
    } else {
        error_log("Route: NO MATCH");
        sendErrorResponse('Invalid endpoint or method', 404);
    }
    
} catch (Exception $e) {
    error_log("Attendance-Edits API Error: " . $e->getMessage());
    sendErrorResponse('Failed to process request', 500, ['message' => $e->getMessage()]);
}

/**
 * GET /api/attendanceEdit
 * Get records that have been edited or deleted since a specific timestamp
 * NOTE: include_summaries parameter is IGNORED - summaries are NOT included
 * because client will regenerate them locally after validation
 */
function getEditedRecords($db) {
    $since = $_GET['since'] ?? null;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 100;
    
    // Ignore include_summaries parameter - we never send summaries here
    // Client will regenerate summaries locally after validating the attendance data
    
    $edited = [];
    $deleted = [];
    
    try {
        // Get edited records (is_synced = 0 or NULL)
        if ($since) {
            $stmt = $db->prepare("
                SELECT 
                    a.*,
                    e.first_name,
                    e.middle_name,
                    e.last_name,
                    e.department
                FROM attendance a
                LEFT JOIN emp_list e ON a.employee_uid = e.uid
                WHERE (a.is_synced = 0 OR a.is_synced IS NULL)
                  AND a.updated_at > ?
                ORDER BY a.updated_at DESC
                LIMIT ?
            ");
            $stmt->execute([$since, $limit]);
        } else {
            $stmt = $db->prepare("
                SELECT 
                    a.*,
                    e.first_name,
                    e.middle_name,
                    e.last_name,
                    e.department
                FROM attendance a
                LEFT JOIN emp_list e ON a.employee_uid = e.uid
                WHERE (a.is_synced = 0 OR a.is_synced IS NULL)
                ORDER BY a.updated_at DESC
                LIMIT ?
            ");
            $stmt->execute([$limit]);
        }
        
        $edited = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Get deleted records from audit log
        if ($since) {
            $stmt = $db->prepare("
                SELECT * FROM attendance_deletions
                WHERE deleted_at > ?
                ORDER BY deleted_at DESC
                LIMIT ?
            ");
            $stmt->execute([$since, $limit]);
            $deletedRecords = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $deleted = array_column($deletedRecords, 'attendance_id');
        }
        
        // FIXED: Properly count arrays before logging
        $editedCount = count($edited);
        $deletedCount = count($deleted);
        error_log("✓ Sending {$editedCount} edited and {$deletedCount} deleted records (NO SUMMARIES - client will regenerate)");

        sendSuccessResponse([
            'data' => [
                'edited' => $edited,
                'deleted' => $deleted,
                'timestamp' => date('c')
            ],
            'total_edited' => $editedCount,
            'total_deleted' => $deletedCount
        ]);
        
    } catch (Exception $e) {
        throw $e;
    }
}


/**
 * POST /api/attendanceEdit
 * Add a new attendance record
 * DELETES daily summary - client will upload regenerated summary
 */
function addAttendanceRecord($db, $input) {
    // Validate required fields
    if (!isset($input['employee_uid']) || !isset($input['clock_type']) || 
        !isset($input['clock_time']) || !isset($input['date'])) {
        sendErrorResponse('Missing required fields: employee_uid, clock_type, clock_time, date', 400);
        return;
    }
    
    // Validate clock_type
    $validClockTypes = ['morning_in', 'morning_out', 'afternoon_in', 'afternoon_out', 
                       'evening_in', 'evening_out', 'overtime_in', 'overtime_out'];
    if (!in_array($input['clock_type'], $validClockTypes)) {
        sendErrorResponse('Invalid clock_type', 400, ['valid_types' => $validClockTypes]);
        return;
    }
    
    // Check if employee exists
    $stmt = $db->prepare("SELECT uid, id_number, first_name, last_name, department FROM emp_list WHERE uid = ?");
    $stmt->execute([$input['employee_uid']]);
    $employee = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$employee) {
        sendErrorResponse('Employee not found', 404);
        return;
    }
    
    try {
        $db->beginTransaction();
        
        // Insert new attendance record
        $stmt = $db->prepare("
            INSERT INTO attendance (
                employee_uid, id_number, clock_type, clock_time, date,
                regular_hours, overtime_hours, is_late, notes, location,
                is_synced, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ");
        
        $stmt->execute([
            $input['employee_uid'],
            $employee['id_number'],
            $input['clock_type'],
            $input['clock_time'],
            $input['date'],
            $input['regular_hours'] ?? 0,
            $input['overtime_hours'] ?? 0,
            isset($input['is_late']) ? (int)(bool)$input['is_late'] : 0,
            $input['notes'] ?? null,
            $input['location'] ?? null
        ]);
        
        $newId = $db->lastInsertId();
        
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
        $stmt->execute([$newId]);
        $newRecord = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // DELETE daily summary immediately - client will upload regenerated one
        deleteDailySummaryForEmployee($db, $input['employee_uid'], $input['date']);
        
        $db->commit();
        
        // Emit socket events
        $socketEvents = getSocketEvents();
        
        // 1. Emit standard attendance created event
        $socketEvents->attendanceCreated($newRecord);
        
        // 2. Emit edit-specific event
        $socketEvents->attendanceEditCreated([
            'id' => (int)$newId,
            'action' => 'created',
            'record' => $newRecord,
            'timestamp' => date('c')
        ]);
        
        // 3. Emit attendance_update event
        $socketEvents->attendanceUpdate([
            'id' => (int)$newId,
            'employee_uid' => $input['employee_uid'],
            'clock_type' => $input['clock_type'],
            'date' => $input['date'],
            'action' => 'created',
            'record' => $newRecord,
            'timestamp' => date('c')
        ]);
        
        // 4. Emit daily summary deleted event
        $socketEvents->dailySummaryDeleted([
            'employee_uid' => $input['employee_uid'],
            'date' => $input['date'],
            'action' => 'attendance_created',
            'reason' => 'waiting_for_client_regeneration'
        ]);
        
        error_log("✓ Attendance record created, daily summary deleted - ID: {$newId} (waiting for client upload)");
        
        sendSuccessResponse([
            'message' => 'Attendance record created successfully',
            'data' => $newRecord
        ], 201);
        
    } catch (Exception $e) {
        $db->rollBack();
        error_log("Error creating attendance record: " . $e->getMessage());
        throw $e;
    }
}

/**
 * PUT /api/attendanceEdit/:id
 * Edit an attendance record and mark as unsynced
 * DELETES daily summary - client will upload regenerated summary
 */
function editAttendanceRecord($db, $id, $input) {
    // Check if record exists
    $stmt = $db->prepare("
        SELECT a.*, e.first_name, e.last_name, e.department
        FROM attendance a
        LEFT JOIN emp_list e ON a.employee_uid = e.uid
        WHERE a.id = ?
    ");
    $stmt->execute([$id]);
    $existingRecord = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$existingRecord) {
        sendErrorResponse('Attendance record not found', 404);
        return;
    }
    
    // Validate clock_type if provided
    if (isset($input['clock_type'])) {
        $validClockTypes = ['morning_in', 'morning_out', 'afternoon_in', 'afternoon_out', 
                           'evening_in', 'evening_out', 'overtime_in', 'overtime_out'];
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
        'overtime_hours', 'date', 'is_late', 'notes', 'location'
    ];
    
    foreach ($allowedFields as $field) {
        if (isset($input[$field])) {
            $value = $input[$field];
            
            // Handle is_late: convert empty string to 0, ensure it's 0 or 1
            if ($field === 'is_late') {
                if ($value === '' || $value === null) {
                    $value = 0;
                } else {
                    $value = (int)(bool)$value;
                }
            }
            
            // Handle numeric fields: convert empty strings to 0
            if (in_array($field, ['regular_hours', 'overtime_hours']) && $value === '') {
                $value = 0;
            }
            
            // Skip empty strings for required fields
            if ($value === '' && in_array($field, ['employee_uid', 'id_number', 'clock_type', 'clock_time', 'date'])) {
                continue;
            }
            
            $updates[] = "$field = ?";
            $params[] = $value;
        }
    }
    
    if (empty($updates)) {
        sendErrorResponse('No fields to update', 400);
        return;
    }
    
    // Force is_synced to 0 (mark as unsynced)
    $updates[] = "is_synced = 0";
    $updates[] = "updated_at = CURRENT_TIMESTAMP";
    $params[] = $id;
    
    try {
        $db->beginTransaction();
        
        // Update attendance record
        $stmt = $db->prepare("
            UPDATE attendance 
            SET " . implode(", ", $updates) . "
            WHERE id = ?
        ");
        $stmt->execute($params);
        
        // Fetch updated record
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
        
        // Get affected dates and employees
        $affectedDate = $input['date'] ?? $existingRecord['date'];
        $affectedEmployeeUid = $input['employee_uid'] ?? $existingRecord['employee_uid'];
        
        // DELETE daily summary immediately - client will upload regenerated one
        deleteDailySummaryForEmployee($db, $affectedEmployeeUid, $affectedDate);
        
        // If date or employee changed, delete old date/employee summary too
        if (isset($input['date']) && $input['date'] !== $existingRecord['date']) {
            deleteDailySummaryForEmployee($db, $existingRecord['employee_uid'], $existingRecord['date']);
        }
        if (isset($input['employee_uid']) && $input['employee_uid'] !== $existingRecord['employee_uid']) {
            deleteDailySummaryForEmployee($db, $existingRecord['employee_uid'], $existingRecord['date']);
        }
        
        $db->commit();
        
        // Emit socket events
        $socketEvents = getSocketEvents();
        $socketEvents->attendanceUpdated($updatedRecord);
        $socketEvents->attendanceEditCreated([
            'id' => (int)$id,
            'action' => 'edited',
            'timestamp' => date('c')
        ]);
        
        // Emit daily summary deleted event
        $socketEvents->dailySummaryDeleted([
            'employee_uid' => $affectedEmployeeUid,
            'date' => $affectedDate,
            'action' => 'attendance_edited',
            'reason' => 'waiting_for_client_regeneration'
        ]);
        
        error_log("✓ Attendance record edited, daily summary deleted - ID: {$id} (waiting for client upload)");
        
        sendSuccessResponse([
            'message' => 'Attendance record edited successfully and marked as unsynced',
            'data' => $updatedRecord
        ]);
        
    } catch (Exception $e) {
        $db->rollBack();
        throw $e;
    }
}

/**
 * DELETE /api/attendanceEdit/:id
 * Delete attendance record and log deletion
 * DELETES daily summary - client will upload regenerated summary (or none if no records remain)
 */
function deleteAttendanceRecord($db, $id) {
    // Check if record exists
    $stmt = $db->prepare("
        SELECT a.*, e.first_name, e.last_name
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
    
    try {
        $db->beginTransaction();
        
        // Store employee_uid and date for reference
        $employeeUid = $record['employee_uid'];
        $date = $record['date'];
        
        // Log deletion
        $stmt = $db->prepare("
            INSERT INTO attendance_deletions (
                attendance_id, employee_uid, date, clock_type, clock_time, deleted_by
            ) VALUES (?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $id,
            $employeeUid,
            $date,
            $record['clock_type'],
            $record['clock_time'],
            $_SERVER['REMOTE_USER'] ?? 'admin'
        ]);
        
        // Delete the record
        $stmt = $db->prepare("DELETE FROM attendance WHERE id = ?");
        $stmt->execute([$id]);
        
        // DELETE daily summary immediately - client will upload regenerated one (or none)
        deleteDailySummaryForEmployee($db, $employeeUid, $date);
        
        $db->commit();
        
        // Emit socket events
        $socketEvents = getSocketEvents();
        $socketEvents->attendanceDeleted(['id' => (int)$id]);
        $socketEvents->attendanceEditDeleted([
            'id' => (int)$id,
            'action' => 'deleted',
            'timestamp' => date('c')
        ]);
        
        // Emit daily summary deleted event
        $socketEvents->dailySummaryDeleted([
            'employee_uid' => $employeeUid,
            'date' => $date,
            'action' => 'attendance_deleted',
            'reason' => 'waiting_for_client_regeneration'
        ]);
        
        error_log("✓ Attendance record deleted, daily summary deleted - ID: {$id} (waiting for client upload)");
        
        sendSuccessResponse([
            'message' => 'Attendance record deleted successfully',
            'data' => [
                'id' => (int)$id,
                'employee_uid' => $employeeUid,
                'date' => $date
            ]
        ]);
        
    } catch (Exception $e) {
        $db->rollBack();
        throw $e;
    }
}

/**
 * POST /api/attendanceEdit/batch
 * Batch edit multiple attendance records
 * DELETES daily summaries for affected dates - client will upload regenerated summaries
 */
function batchEditRecords($db, $input) {
    if (!isset($input['records']) || !is_array($input['records']) || empty($input['records'])) {
        sendErrorResponse('records array is required', 400);
        return;
    }
    
    $successCount = 0;
    $failCount = 0;
    $errors = [];
    $affectedDates = []; // Track affected employee-date combinations
    
    try {
        $db->beginTransaction();
        
        foreach ($input['records'] as $i => $record) {
            if (!isset($record['id'])) {
                $errors[] = ['index' => $i, 'error' => 'Missing record id'];
                $failCount++;
                continue;
            }
            
            $id = $record['id'];
            unset($record['id']);
            
            // Check if record exists
            $stmt = $db->prepare("SELECT employee_uid, date FROM attendance WHERE id = ?");
            $stmt->execute([$id]);
            $existingRecord = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$existingRecord) {
                $errors[] = ['index' => $i, 'id' => $id, 'error' => 'Record not found'];
                $failCount++;
                continue;
            }
            
            // Build update query
            $updates = [];
            $params = [];
            
            $allowedFields = [
                'clock_type', 'clock_time', 'regular_hours', 'overtime_hours',
                'date', 'is_late', 'notes'
            ];
            
            foreach ($allowedFields as $field) {
                if (isset($record[$field])) {
                    $value = $record[$field];
                    
                    // Handle is_late: convert empty string to 0, ensure it's 0 or 1
                    if ($field === 'is_late') {
                        if ($value === '' || $value === null) {
                            $value = 0;
                        } else {
                            $value = (int)(bool)$value;
                        }
                    }
                    
                    // Handle numeric fields: convert empty strings to 0
                    if (in_array($field, ['regular_hours', 'overtime_hours']) && $value === '') {
                        $value = 0;
                    }
                    
                    // Skip empty strings for required fields
                    if ($value === '' && in_array($field, ['clock_type', 'clock_time', 'date'])) {
                        continue;
                    }
                    
                    $updates[] = "$field = ?";
                    $params[] = $value;
                }
            }
            
            if (empty($updates)) {
                $failCount++;
                continue;
            }
            
            $updates[] = "is_synced = 0";
            $updates[] = "updated_at = CURRENT_TIMESTAMP";
            $params[] = $id;
            
            try {
                $stmt = $db->prepare("
                    UPDATE attendance 
                    SET " . implode(", ", $updates) . "
                    WHERE id = ?
                ");
                $stmt->execute($params);
                
                // Track affected dates for summary deletion
                $affectedDate = $record['date'] ?? $existingRecord['date'];
                $affectedEmployeeUid = $existingRecord['employee_uid'];
                $affectedDates[] = [
                    'employee_uid' => $affectedEmployeeUid,
                    'date' => $affectedDate
                ];
                
                $successCount++;
                
            } catch (Exception $recordError) {
                $errors[] = [
                    'index' => $i,
                    'id' => $id,
                    'error' => $recordError->getMessage()
                ];
                $failCount++;
            }
        }
        
        // DELETE daily summaries for all affected dates immediately
        $uniqueAffected = array_unique($affectedDates, SORT_REGULAR);
        foreach ($uniqueAffected as $affected) {
            deleteDailySummaryForEmployee(
                $db,
                $affected['employee_uid'],
                $affected['date']
            );
        }
        
        $db->commit();
        
        // Emit socket event
        if ($successCount > 0) {
            $socketEvents = getSocketEvents();
            $socketEvents->attendanceBatchEdited([
                'action' => 'batch_edited',
                'count' => $successCount,
                'timestamp' => date('c')
            ]);
            
            // Emit daily summary deleted events for affected dates
            foreach ($uniqueAffected as $affected) {
                $socketEvents->dailySummaryDeleted([
                    'employee_uid' => $affected['employee_uid'],
                    'date' => $affected['date'],
                    'action' => 'batch_edited',
                    'reason' => 'waiting_for_client_regeneration'
                ]);
            }
        }
        
        error_log("✓ Batch edit completed: {$successCount} records, " . count($uniqueAffected) . " summaries deleted (waiting for client upload)");
        
        sendSuccessResponse([
            'message' => "Batch edit completed: {$successCount} successful, {$failCount} failed",
            'success_count' => $successCount,
            'fail_count' => $failCount,
            'total_submitted' => count($input['records']),
            'errors' => !empty($errors) ? $errors : null
        ]);
        
    } catch (Exception $e) {
        $db->rollBack();
        throw $e;
    }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Delete daily summary for specific employee and date
 * Server deletes immediately when attendance is edited
 * Client will regenerate and upload the new summary
 */
function deleteDailySummaryForEmployee($db, $employeeUid, $date) {
    try {
        $stmt = $db->prepare("
            DELETE FROM daily_attendance_summary
            WHERE employee_uid = ? AND date = ?
        ");
        $stmt->execute([$employeeUid, $date]);
        
        $rowsDeleted = $stmt->rowCount();
        if ($rowsDeleted > 0) {
            error_log("✓ Deleted daily summary for employee {$employeeUid} on {$date} - waiting for client to upload regenerated summary");
        } else {
            error_log("ℹ️ No daily summary found to delete for employee {$employeeUid} on {$date}");
        }
        
        return $rowsDeleted;
        
    } catch (Exception $e) {
        error_log("❌ Error deleting daily summary for employee {$employeeUid} on {$date}: " . $e->getMessage());
        throw $e;
    }
}

// ============================================================================
// SYNC HANDLER FUNCTIONS
// ============================================================================

/**
 * POST /api/attendanceEdit/mark-synced
 * Mark edited/deleted records as synced after client confirms receipt
 */
function markRecordsAsSynced($db, $input) {
    $editedIds = $input['editedIds'] ?? [];
    $deletedIds = $input['deletedIds'] ?? [];
    
    if (empty($editedIds) && empty($deletedIds)) {
        sendErrorResponse('No IDs provided', 400);
        return;
    }
    
    try {
        $db->beginTransaction();
        
        $markedEdited = 0;
        $markedDeleted = 0;
        
        // Mark edited records as synced
        if (!empty($editedIds)) {
            $placeholders = implode(',', array_fill(0, count($editedIds), '?'));
            $stmt = $db->prepare("
                UPDATE attendance 
                SET is_synced = 1, updated_at = CURRENT_TIMESTAMP
                WHERE id IN ($placeholders)
            ");
            $stmt->execute($editedIds);
            $markedEdited = $stmt->rowCount();
        }
        
        // Mark deleted records as acknowledged
        if (!empty($deletedIds)) {
            $markedDeleted = count($deletedIds);
        }
        
        $db->commit();
        
        error_log("✓ Marked {$markedEdited} edited + {$markedDeleted} deleted as synced");
        
        sendSuccessResponse([
            'message' => 'Records marked as synced',
            'edited_marked' => $markedEdited,
            'deleted_marked' => $markedDeleted
        ]);
        
    } catch (Exception $e) {
        $db->rollBack();
        throw $e;
    }
}

/**
 * POST /api/attendanceEdit/batch-upload
 * Upload batch of new attendance records from client
 */
function batchUploadAttendance($db, $input) {
    if (!isset($input['records']) || !is_array($input['records']) || empty($input['records'])) {
        sendErrorResponse('records array is required', 400);
        return;
    }
    
    $records = $input['records'];
    $successCount = 0;
    $failCount = 0;
    $errors = [];
    
    try {
        $db->beginTransaction();
        
        foreach ($records as $i => $record) {
            try {
                // Validate required fields
                if (!isset($record['employee_uid']) || !isset($record['clock_type']) || 
                    !isset($record['clock_time']) || !isset($record['date'])) {
                    $errors[] = [
                        'index' => $i,
                        'id' => $record['id'] ?? null,
                        'error' => 'Missing required fields'
                    ];
                    $failCount++;
                    continue;
                }
                
                // Check if record with this ID already exists
                if (isset($record['id'])) {
                    $stmt = $db->prepare("SELECT id FROM attendance WHERE id = ?");
                    $stmt->execute([$record['id']]);
                    $exists = $stmt->fetch(PDO::FETCH_ASSOC);
                    
                    if ($exists) {
                        // Record exists, update it instead
                        $stmt = $db->prepare("
                            UPDATE attendance 
                            SET employee_uid = ?,
                                id_number = ?,
                                clock_type = ?,
                                clock_time = ?,
                                date = ?,
                                regular_hours = ?,
                                overtime_hours = ?,
                                is_late = ?,
                                notes = ?,
                                location = ?,
                                ip_address = ?,
                                device_info = ?,
                                is_synced = 1,
                                updated_at = CURRENT_TIMESTAMP
                            WHERE id = ?
                        ");
                        
                        $stmt->execute([
                            $record['employee_uid'],
                            $record['id_number'] ?? null,
                            $record['clock_type'],
                            $record['clock_time'],
                            $record['date'],
                            $record['regular_hours'] ?? 0,
                            $record['overtime_hours'] ?? 0,
                            isset($record['is_late']) ? (int)(bool)$record['is_late'] : 0,
                            $record['notes'] ?? null,
                            $record['location'] ?? null,
                            $record['ip_address'] ?? null,
                            $record['device_info'] ?? null,
                            $record['id']
                        ]);
                        
                        $successCount++;
                        continue;
                    }
                }
                
                // Insert new record
                $stmt = $db->prepare("
                    INSERT INTO attendance (
                        id, employee_uid, id_number, clock_type, clock_time, date,
                        regular_hours, overtime_hours, is_late, notes, location,
                        ip_address, device_info, is_synced, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 
                              COALESCE(?, CURRENT_TIMESTAMP), 
                              COALESCE(?, CURRENT_TIMESTAMP))
                ");
                
                $stmt->execute([
                    $record['id'] ?? null,
                    $record['employee_uid'],
                    $record['id_number'] ?? null,
                    $record['clock_type'],
                    $record['clock_time'],
                    $record['date'],
                    $record['regular_hours'] ?? 0,
                    $record['overtime_hours'] ?? 0,
                    isset($record['is_late']) ? (int)(bool)$record['is_late'] : 0,
                    $record['notes'] ?? null,
                    $record['location'] ?? null,
                    $record['ip_address'] ?? null,
                    $record['device_info'] ?? null,
                    $record['created_at'] ?? null,
                    $record['updated_at'] ?? null
                ]);
                
                $successCount++;
                
            } catch (Exception $recordError) {
                $errors[] = [
                    'index' => $i,
                    'id' => $record['id'] ?? null,
                    'error' => $recordError->getMessage()
                ];
                $failCount++;
                error_log("Failed to upload record: " . $recordError->getMessage());
            }
        }
        
        $db->commit();
        
        // Emit socket event
        if ($successCount > 0) {
            $socketEvents = getSocketEvents();
            $socketEvents->attendanceBatchUploaded([
                'action' => 'batch_uploaded',
                'count' => $successCount,
                'timestamp' => date('c')
            ]);
        }
        
        error_log("✓ Batch upload completed: {$successCount} successful, {$failCount} failed");
        
        sendSuccessResponse([
            'message' => "Batch upload completed: {$successCount} successful, {$failCount} failed",
            'success_count' => $successCount,
            'fail_count' => $failCount,
            'total_submitted' => count($records),
            'errors' => !empty($errors) ? $errors : null
        ]);
        
    } catch (Exception $e) {
        $db->rollBack();
        throw $e;
    }
}

/**
 * POST /api/daily-summary/batch-upload
 * Upload batch of regenerated summaries from client after validation
 * This receives summaries that were regenerated by the client after applying server edits
 */
function batchUploadSummaries($db, $input) {
    if (!isset($input['summaries']) || !is_array($input['summaries']) || empty($input['summaries'])) {
        sendErrorResponse('summaries array is required', 400);
        return;
    }
    
    $summaries = $input['summaries'];
    $successCount = 0;
    $updatedCount = 0;
    $skippedCount = 0;
    $errorCount = 0;
    $errors = [];
    
    try {
        $db->beginTransaction();
        
        foreach ($summaries as $i => $summary) {
            try {
                // Validate required fields
                if (empty($summary['employee_uid']) || empty($summary['date'])) {
                    $errors[] = [
                        'index' => $i,
                        'error' => 'Missing required fields (employee_uid, date)'
                    ];
                    $errorCount++;
                    continue;
                }
                
                // Check for existing record
                $stmt = $db->prepare("
                    SELECT id, last_updated FROM daily_attendance_summary 
                    WHERE employee_uid = ? AND date = ?
                ");
                $stmt->execute([$summary['employee_uid'], $summary['date']]);
                $existingRecord = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($existingRecord) {
                    // Compare timestamps to decide if we should update
                    $existingTimestamp = strtotime($existingRecord['last_updated'] ?? '1970-01-01');
                    $newTimestamp = strtotime($summary['last_updated'] ?? '1970-01-01');
                    
                    if ($newTimestamp <= $existingTimestamp) {
                        $skippedCount++;
                        error_log("Skipping older/duplicate summary for employee {$summary['employee_uid']} on {$summary['date']}");
                        continue;
                    }
                    
                    // Update existing record (UPSERT behavior)
                    $updateStmt = $db->prepare("
                        UPDATE daily_attendance_summary SET
                            id_number = ?, id_barcode = ?, employee_name = ?,
                            first_name = ?, last_name = ?, department = ?,
                            first_clock_in = ?, last_clock_out = ?,
                            morning_in = ?, morning_out = ?, afternoon_in = ?, afternoon_out = ?,
                            evening_in = ?, evening_out = ?, overtime_in = ?, overtime_out = ?,
                            regular_hours = ?, overtime_hours = ?, total_hours = ?,
                            morning_hours = ?, afternoon_hours = ?, evening_hours = ?, overtime_session_hours = ?,
                            is_incomplete = ?, has_late_entry = ?, has_overtime = ?, has_evening_session = ?,
                            total_sessions = ?, completed_sessions = ?, pending_sessions = ?,
                            total_minutes_worked = ?, break_time_minutes = ?, last_updated = ?
                        WHERE id = ?
                    ");
                    
                    $updateStmt->execute([
                        $summary['id_number'] ?? null,
                        $summary['id_barcode'] ?? null,
                        $summary['employee_name'] ?? null,
                        $summary['first_name'] ?? null,
                        $summary['last_name'] ?? null,
                        $summary['department'] ?? null,
                        convertIsoToMysql($summary['first_clock_in'] ?? null),
                        convertIsoToMysql($summary['last_clock_out'] ?? null),
                        convertIsoToMysql($summary['morning_in'] ?? null),
                        convertIsoToMysql($summary['morning_out'] ?? null),
                        convertIsoToMysql($summary['afternoon_in'] ?? null),
                        convertIsoToMysql($summary['afternoon_out'] ?? null),
                        convertIsoToMysql($summary['evening_in'] ?? null),
                        convertIsoToMysql($summary['evening_out'] ?? null),
                        convertIsoToMysql($summary['overtime_in'] ?? null),
                        convertIsoToMysql($summary['overtime_out'] ?? null),
                        $summary['regular_hours'] ?? 0,
                        $summary['overtime_hours'] ?? 0,
                        $summary['total_hours'] ?? 0,
                        $summary['morning_hours'] ?? 0,
                        $summary['afternoon_hours'] ?? 0,
                        $summary['evening_hours'] ?? 0,
                        $summary['overtime_session_hours'] ?? 0,
                        $summary['is_incomplete'] ?? 0,
                        $summary['has_late_entry'] ?? 0,
                        $summary['has_overtime'] ?? 0,
                        $summary['has_evening_session'] ?? 0,
                        $summary['total_sessions'] ?? 0,
                        $summary['completed_sessions'] ?? 0,
                        $summary['pending_sessions'] ?? 0,
                        $summary['total_minutes_worked'] ?? 0,
                        $summary['break_time_minutes'] ?? 0,
                        convertIsoToMysql($summary['last_updated'] ?? date('c')),
                        $existingRecord['id']
                    ]);
                    
                    $updatedCount++;
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
                        $summary['employee_uid'],
                        $summary['id_number'] ?? null,
                        $summary['id_barcode'] ?? null,
                        $summary['employee_name'] ?? null,
                        $summary['first_name'] ?? null,
                        $summary['last_name'] ?? null,
                        $summary['department'] ?? null,
                        $summary['date'],
                        convertIsoToMysql($summary['first_clock_in'] ?? null),
                        convertIsoToMysql($summary['last_clock_out'] ?? null),
                        convertIsoToMysql($summary['morning_in'] ?? null),
                        convertIsoToMysql($summary['morning_out'] ?? null),
                        convertIsoToMysql($summary['afternoon_in'] ?? null),
                        convertIsoToMysql($summary['afternoon_out'] ?? null),
                        convertIsoToMysql($summary['evening_in'] ?? null),
                        convertIsoToMysql($summary['evening_out'] ?? null),
                        convertIsoToMysql($summary['overtime_in'] ?? null),
                        convertIsoToMysql($summary['overtime_out'] ?? null),
                        $summary['regular_hours'] ?? 0,
                        $summary['overtime_hours'] ?? 0,
                        $summary['total_hours'] ?? 0,
                        $summary['morning_hours'] ?? 0,
                        $summary['afternoon_hours'] ?? 0,
                        $summary['evening_hours'] ?? 0,
                        $summary['overtime_session_hours'] ?? 0,
                        $summary['is_incomplete'] ?? 0,
                        $summary['has_late_entry'] ?? 0,
                        $summary['has_overtime'] ?? 0,
                        $summary['has_evening_session'] ?? 0,
                        $summary['total_sessions'] ?? 0,
                        $summary['completed_sessions'] ?? 0,
                        $summary['pending_sessions'] ?? 0,
                        $summary['total_minutes_worked'] ?? 0,
                        $summary['break_time_minutes'] ?? 0,
                        convertIsoToMysql($summary['last_updated'] ?? date('c')),
                        convertIsoToMysql($summary['created_at'] ?? date('c'))
                    ]);
                    
                    $successCount++;
                }
                
            } catch (Exception $recordError) {
                error_log("Error processing summary {$i}: " . $recordError->getMessage());
                $errors[] = [
                    'index' => $i,
                    'error' => $recordError->getMessage(),
                    'employee_uid' => $summary['employee_uid'] ?? null,
                    'date' => $summary['date'] ?? null
                ];
                $errorCount++;
            }
        }
        
        $db->commit();
        
        // Emit socket event for summary sync
        if ($successCount > 0 || $updatedCount > 0) {
            $socketEvents = getSocketEvents();
            $socketEvents->dailySummarySynced([
                'synced_count' => $successCount + $updatedCount,
                'created_count' => $successCount,
                'updated_count' => $updatedCount,
                'source' => 'client_regeneration'
            ]);
        }
        
        error_log("✓ Summary batch upload: {$successCount} created, {$updatedCount} updated, {$skippedCount} skipped, {$errorCount} failed");
        
        sendSuccessResponse([
            'message' => "Summary batch upload completed",
            'success_count' => $successCount,
            'updated_count' => $updatedCount,
            'skipped_count' => $skippedCount,
            'error_count' => $errorCount,
            'total_submitted' => count($summaries),
            'errors' => !empty($errors) ? $errors : null
        ]);
        
    } catch (Exception $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        throw $e;
    }
}

/**
 * GET /api/attendance/range
 * Get attendance records for a date range
 * Used for server-local comparison
 */
function getAttendanceByDateRange($db) {
    $startDate = $_GET['start_date'] ?? null;
    $endDate = $_GET['end_date'] ?? null;
    
    if (!$startDate || !$endDate) {
        sendErrorResponse('start_date and end_date are required', 400);
        return;
    }
    
    // Validate date format
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $startDate) || 
        !preg_match('/^\d{4}-\d{2}-\d{2}$/', $endDate)) {
        sendErrorResponse('Invalid date format. Use YYYY-MM-DD', 400);
        return;
    }
    
    try {
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
            WHERE a.date BETWEEN ? AND ?
            ORDER BY a.date ASC, a.employee_uid ASC, a.clock_time ASC
        ");
        
        $stmt->execute([$startDate, $endDate]);
        $records = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        error_log("✓ Fetched " . count($records) . " attendance records for date range {$startDate} to {$endDate}");
        
        sendSuccessResponse([
            'data' => $records,
            'total' => count($records),
            'start_date' => $startDate,
            'end_date' => $endDate
        ]);
        
    } catch (Exception $e) {
        error_log("Error fetching attendance by date range: " . $e->getMessage());
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

?>