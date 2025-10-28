<?php
// api/routes/announcements.php - Announcement Management Routes

$pdo = getConnection();

error_log("Announcements Route - Full URI: " . $_SERVER['REQUEST_URI']);
error_log("Segments: " . print_r($segments, true));

$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true);

$announcementId = $segments[1] ?? null;
$action = $segments[2] ?? null;

switch ($method) {
    case 'GET':
        if ($announcementId === 'employee' && $action) {
            getEmployeeAnnouncements($pdo, $action);
        } elseif ($announcementId === 'stats') {
            getAnnouncementStats($pdo);
        } elseif ($announcementId) {
            getAnnouncementById($pdo, $announcementId);
        } else {
            getAllAnnouncements($pdo);
        }
        break;
        
    case 'POST':
        if ($announcementId === 'mark-read') {
            markAnnouncementAsRead($pdo, $input);
        } else {
            createAnnouncement($pdo, $input);
        }
        break;
        
    case 'PUT':
        if ($announcementId) {
            updateAnnouncement($pdo, $announcementId, $input);
        } else {
            sendErrorResponse('Announcement ID is required for update', 400);
        }
        break;
        
    case 'DELETE':
        if ($announcementId) {
            deleteAnnouncement($pdo, $announcementId);
        } else {
            sendErrorResponse('Announcement ID is required for deletion', 400);
        }
        break;
        
    default:
        sendErrorResponse('Method not allowed', 405);
}

/**
 * Get all announcements with filtering and pagination
 */
function getAllAnnouncements($pdo) {
    try {
        $limit = min(max(1, (int)($_GET['limit'] ?? 50)), 100);
        $offset = max(0, (int)($_GET['offset'] ?? 0));
        $priority = $_GET['priority'] ?? '';
        $status = $_GET['status'] ?? 'active';
        $recipientType = $_GET['recipientType'] ?? '';
        
        $whereConditions = [];
        $params = [];
        
        if (!empty($priority)) {
            $whereConditions[] = "priority = ?";
            $params[] = $priority;
        }
        
        if (!empty($status)) {
            $whereConditions[] = "status = ?";
            $params[] = $status;
        }
        
        if (!empty($recipientType)) {
            $whereConditions[] = "recipient_type = ?";
            $params[] = $recipientType;
        }
        
        // Build WHERE clause for main query
        $mainWhereConditions = [];
        if (!empty($whereConditions)) {
            foreach ($whereConditions as $condition) {
                $mainWhereConditions[] = "a." . $condition;
            }
        }
        
        // Auto-expire announcements
        $pdo->exec("UPDATE announcements SET status = 'expired' 
                    WHERE expiry_date IS NOT NULL 
                    AND expiry_date < CURDATE() 
                    AND status = 'active'");
        
        $whereClause = !empty($mainWhereConditions) ? "WHERE " . implode(" AND ", $mainWhereConditions) : "";
        
        // FIXED: Use COLLATE to normalize collations in comparisons
        $query = "
            SELECT 
                a.id,
                a.title,
                a.message,
                a.recipient_type,
                a.priority,
                a.expiry_date,
                a.created_by,
                a.created_at,
                a.updated_at,
                a.status,
                CONCAT(e.first_name, ' ', e.last_name) as created_by_name,
                (SELECT COUNT(*) FROM announcement_reads ar WHERE ar.announcement_id = a.id) as read_count,
                (SELECT COUNT(DISTINCT CASE 
                    WHEN a.recipient_type = 'all' THEN el.uid
                    WHEN a.recipient_type = 'department' THEN 
                        (SELECT el2.uid FROM emp_list el2 
                         INNER JOIN announcement_recipients ar2 
                            ON ar2.department_name COLLATE utf8mb4_general_ci = el2.department COLLATE utf8mb4_general_ci
                         WHERE ar2.announcement_id = a.id AND el2.uid = el.uid)
                    WHEN a.recipient_type = 'specific' THEN 
                        (SELECT ar3.employee_id FROM announcement_recipients ar3 
                         WHERE ar3.announcement_id = a.id AND ar3.employee_id = el.uid)
                END) FROM emp_list el WHERE el.status = 'Active') as total_recipients
            FROM announcements a
            LEFT JOIN emp_list e ON a.created_by = e.uid
            {$whereClause}
            ORDER BY a.created_at DESC
            LIMIT ? OFFSET ?
        ";
        
        error_log("Executing query: " . $query);
        error_log("With params: " . print_r([...$params, $limit, $offset], true));
        
        $stmt = $pdo->prepare($query);
        $stmt->execute([...$params, $limit, $offset]);
        $announcements = $stmt->fetchAll();
        
        // Get total count - use same WHERE conditions
        $countWhereClause = !empty($mainWhereConditions) ? "WHERE " . implode(" AND ", $mainWhereConditions) : "";
        $countQuery = "SELECT COUNT(*) as total FROM announcements a {$countWhereClause}";
        $stmt = $pdo->prepare($countQuery);
        $stmt->execute($params);
        $totalResult = $stmt->fetch();
        
        // Fetch recipients for each announcement
        $formattedAnnouncements = array_map(function($announcement) use ($pdo) {
            $recipients = [];
            
            if ($announcement['recipient_type'] === 'department' || $announcement['recipient_type'] === 'specific') {
                $stmt = $pdo->prepare("
                    SELECT 
                        recipient_type,
                        department_name,
                        employee_id,
                        CONCAT(e.first_name, ' ', e.last_name) as employee_name
                    FROM announcement_recipients ar
                    LEFT JOIN emp_list e ON ar.employee_id = e.uid
                    WHERE ar.announcement_id = ?
                ");
                $stmt->execute([$announcement['id']]);
                $recipients = $stmt->fetchAll();
            }
            
            return [
                'id' => (int)$announcement['id'],
                'title' => $announcement['title'],
                'message' => $announcement['message'],
                'recipientType' => $announcement['recipient_type'],
                'priority' => $announcement['priority'],
                'expiryDate' => $announcement['expiry_date'],
                'createdBy' => (int)$announcement['created_by'],
                'createdByName' => $announcement['created_by_name'],
                'createdAt' => $announcement['created_at'],
                'updatedAt' => $announcement['updated_at'],
                'status' => $announcement['status'],
                'readCount' => (int)$announcement['read_count'],
                'totalRecipients' => (int)$announcement['total_recipients'],
                'recipients' => $recipients
            ];
        }, $announcements);
        
        sendSuccessResponse([
            'announcements' => $formattedAnnouncements,
            'pagination' => [
                'total' => (int)$totalResult['total'],
                'limit' => $limit,
                'offset' => $offset,
                'pages' => ceil($totalResult['total'] / $limit),
                'currentPage' => floor($offset / $limit) + 1
            ]
        ]);
        
    } catch (PDOException $e) {
        error_log("Error fetching announcements: " . $e->getMessage());
        sendErrorResponse('Failed to fetch announcements', 500, ['message' => $e->getMessage()]);
    }
}

/**
 * Get single announcement by ID
 */
function getAnnouncementById($pdo, $id) {
    try {
        $stmt = $pdo->prepare("
            SELECT 
                a.id,
                a.title,
                a.message,
                a.recipient_type,
                a.priority,
                a.expiry_date,
                a.created_by,
                a.created_at,
                a.updated_at,
                a.status,
                CONCAT(e.first_name, ' ', e.last_name) as created_by_name
            FROM announcements a
            LEFT JOIN emp_list e ON a.created_by = e.uid
            WHERE a.id = ?
        ");
        
        $stmt->execute([$id]);
        $announcement = $stmt->fetch();
        
        if (!$announcement) {
            sendErrorResponse('Announcement not found', 404);
            return;
        }
        
        // Get recipients
        $recipients = [];
        if ($announcement['recipient_type'] !== 'all') {
            $stmt = $pdo->prepare("
                SELECT 
                    recipient_type,
                    department_name,
                    employee_id,
                    CONCAT(e.first_name, ' ', e.last_name) as employee_name
                FROM announcement_recipients ar
                LEFT JOIN emp_list e ON ar.employee_id = e.uid
                WHERE ar.announcement_id = ?
            ");
            $stmt->execute([$id]);
            $recipients = $stmt->fetchAll();
        }
        
        $formattedAnnouncement = [
            'id' => (int)$announcement['id'],
            'title' => $announcement['title'],
            'message' => $announcement['message'],
            'recipientType' => $announcement['recipient_type'],
            'priority' => $announcement['priority'],
            'expiryDate' => $announcement['expiry_date'],
            'createdBy' => (int)$announcement['created_by'],
            'createdByName' => $announcement['created_by_name'],
            'createdAt' => $announcement['created_at'],
            'updatedAt' => $announcement['updated_at'],
            'status' => $announcement['status'],
            'recipients' => $recipients
        ];
        
        sendSuccessResponse($formattedAnnouncement);
        
    } catch (PDOException $e) {
        error_log("Error fetching announcement: " . $e->getMessage());
        sendErrorResponse('Failed to fetch announcement', 500, ['message' => $e->getMessage()]);
    }
}

/**
 * Get announcements for specific employee
 */
function getEmployeeAnnouncements($pdo, $employeeId) {
    try {
        // Get employee's department
        $stmt = $pdo->prepare("SELECT department FROM emp_list WHERE uid = ?");
        $stmt->execute([$employeeId]);
        $employee = $stmt->fetch();
        
        if (!$employee) {
            sendErrorResponse('Employee not found', 404);
            return;
        }
        
        $department = $employee['department'];
        
        // FIXED: Use CAST instead of COLLATE to handle binary charset
        $query = "
            SELECT DISTINCT
                a.id,
                a.title,
                a.message,
                a.recipient_type,
                a.priority,
                a.expiry_date,
                a.created_at,
                a.status,
                ar.read_at,
                CASE WHEN ar.id IS NOT NULL THEN 1 ELSE 0 END as is_read
            FROM announcements a
            LEFT JOIN announcement_reads ar ON a.id = ar.announcement_id AND ar.employee_id = ?
            WHERE a.status = 'active'
            AND (
                a.recipient_type = 'all'
                OR (a.recipient_type = 'department' AND EXISTS (
                    SELECT 1 FROM announcement_recipients ar2 
                    WHERE ar2.announcement_id = a.id 
                    AND CAST(ar2.department_name AS CHAR) = ?
                ))
                OR (a.recipient_type = 'specific' AND EXISTS (
                    SELECT 1 FROM announcement_recipients ar3 
                    WHERE ar3.announcement_id = a.id 
                    AND ar3.employee_id = ?
                ))
            )
            AND (a.expiry_date IS NULL OR a.expiry_date >= CURDATE())
            ORDER BY a.priority DESC, a.created_at DESC
        ";
        
        $stmt = $pdo->prepare($query);
        $stmt->execute([$employeeId, $department, $employeeId]);
        $announcements = $stmt->fetchAll();
        
        $formattedAnnouncements = array_map(function($announcement) {
            return [
                'id' => (int)$announcement['id'],
                'title' => $announcement['title'],
                'message' => $announcement['message'],
                'content' => $announcement['message'], // Alias for flexibility
                'description' => $announcement['message'], // Alias for frontend compatibility
                'recipientType' => $announcement['recipient_type'],
                'priority' => $announcement['priority'],
                'expiryDate' => $announcement['expiry_date'],
                'createdAt' => $announcement['created_at'],
                'created_at' => $announcement['created_at'], // Alias
                'status' => $announcement['status'],
                'read' => (bool)$announcement['is_read'], // Frontend expects 'read'
                'is_read' => (bool)$announcement['is_read'], // Keep both for compatibility
                'readAt' => $announcement['read_at'],
                'read_at' => $announcement['read_at'] // Alias
            ];
        }, $announcements);
        
        // Wrap response in 'data' property for consistency
        sendSuccessResponse([
            'data' => $formattedAnnouncements
        ]);
        
    } catch (PDOException $e) {
        error_log("Error fetching employee announcements: " . $e->getMessage());
        sendErrorResponse('Failed to fetch announcements', 500, ['message' => $e->getMessage()]);
    }
}

/**
 * Create new announcement
 */
function createAnnouncement($pdo, $input) {
    try {
        $title = $input['title'] ?? null;
        $message = $input['message'] ?? null;
        $recipientType = $input['recipientType'] ?? 'all';
        $priority = $input['priority'] ?? 'normal';
        $expiryDate = $input['expiryDate'] ?? null;
        $createdBy = $input['createdBy'] ?? null;
        $selectedDepartments = $input['selectedDepartments'] ?? [];
        $selectedEmployees = $input['selectedEmployees'] ?? [];
        
        // Validation
        if (!$title || !$message) {
            sendErrorResponse('Title and message are required', 400);
            return;
        }
        
        if (!$createdBy) {
            sendErrorResponse('Creator ID is required', 400);
            return;
        }
        
        if (!in_array($recipientType, ['all', 'department', 'specific'])) {
            sendErrorResponse('Invalid recipient type', 400);
            return;
        }
        
        if (!in_array($priority, ['normal', 'important', 'urgent'])) {
            sendErrorResponse('Invalid priority', 400);
            return;
        }
        
        // Begin transaction
        $pdo->beginTransaction();
        
        try {
            // Insert announcement
            $stmt = $pdo->prepare("
                INSERT INTO announcements (
                    title, message, recipient_type, priority, 
                    expiry_date, created_by, status
                ) VALUES (?, ?, ?, ?, ?, ?, 'active')
            ");
            
            $stmt->execute([
                $title,
                $message,
                $recipientType,
                $priority,
                $expiryDate ?: null,
                $createdBy
            ]);
            
            $announcementId = $pdo->lastInsertId();
            
            // Insert recipients
            if ($recipientType === 'department' && !empty($selectedDepartments)) {
                $stmt = $pdo->prepare("
                    INSERT INTO announcement_recipients (announcement_id, recipient_type, department_name)
                    VALUES (?, 'department', ?)
                ");
                
                foreach ($selectedDepartments as $department) {
                    $stmt->execute([$announcementId, $department]);
                }
            } elseif ($recipientType === 'specific' && !empty($selectedEmployees)) {
                $stmt = $pdo->prepare("
                    INSERT INTO announcement_recipients (announcement_id, recipient_type, employee_id)
                    VALUES (?, 'employee', ?)
                ");
                
                foreach ($selectedEmployees as $employeeId) {
                    $stmt->execute([$announcementId, $employeeId]);
                }
            }
            
            $pdo->commit();
            
            // Fetch the created announcement
            $stmt = $pdo->prepare("
                SELECT 
                    a.*,
                    CONCAT(e.first_name, ' ', e.last_name) as created_by_name
                FROM announcements a
                LEFT JOIN emp_list e ON a.created_by = e.uid
                WHERE a.id = ?
            ");
            $stmt->execute([$announcementId]);
            $newAnnouncement = $stmt->fetch();
            
            error_log("Successfully created announcement: {$title} (ID: {$announcementId})");
            
            sendSuccessResponse([
                'id' => (int)$newAnnouncement['id'],
                'title' => $newAnnouncement['title'],
                'message' => $newAnnouncement['message'],
                'recipientType' => $newAnnouncement['recipient_type'],
                'priority' => $newAnnouncement['priority'],
                'expiryDate' => $newAnnouncement['expiry_date'],
                'createdBy' => (int)$newAnnouncement['created_by'],
                'createdByName' => $newAnnouncement['created_by_name'],
                'createdAt' => $newAnnouncement['created_at'],
                'status' => $newAnnouncement['status']
            ], "Announcement created successfully", 201);
            
        } catch (Exception $e) {
            $pdo->rollBack();
            throw $e;
        }
        
    } catch (PDOException $e) {
        error_log("Error creating announcement: " . $e->getMessage());
        sendErrorResponse('Failed to create announcement', 500, ['message' => $e->getMessage()]);
    }
}

/**
 * Update announcement
 */
function updateAnnouncement($pdo, $id, $input) {
    try {
        // Check if announcement exists
        $stmt = $pdo->prepare("SELECT id FROM announcements WHERE id = ?");
        $stmt->execute([$id]);
        if (!$stmt->fetch()) {
            sendErrorResponse('Announcement not found', 404);
            return;
        }
        
        $updateFields = [];
        $updateValues = [];
        
        $fieldsToUpdate = [
            'title' => $input['title'] ?? null,
            'message' => $input['message'] ?? null,
            'priority' => $input['priority'] ?? null,
            'expiry_date' => $input['expiryDate'] ?? null,
            'status' => $input['status'] ?? null
        ];
        
        foreach ($fieldsToUpdate as $dbField => $value) {
            if ($value !== null) {
                $updateFields[] = "{$dbField} = ?";
                $updateValues[] = $value;
            }
        }
        
        if (empty($updateFields)) {
            sendErrorResponse('No fields to update', 400);
            return;
        }
        
        $updateValues[] = $id;
        
        $updateQuery = "UPDATE announcements SET " . implode(", ", $updateFields) . " WHERE id = ?";
        $stmt = $pdo->prepare($updateQuery);
        $stmt->execute($updateValues);
        
        sendSuccessResponse(['id' => (int)$id], "Announcement updated successfully");
        
    } catch (PDOException $e) {
        error_log("Error updating announcement: " . $e->getMessage());
        sendErrorResponse('Failed to update announcement', 500, ['message' => $e->getMessage()]);
    }
}

/**
 * Delete announcement
 */
function deleteAnnouncement($pdo, $id) {
    try {
        $stmt = $pdo->prepare("SELECT title FROM announcements WHERE id = ?");
        $stmt->execute([$id]);
        $announcement = $stmt->fetch();
        
        if (!$announcement) {
            sendErrorResponse('Announcement not found', 404);
            return;
        }
        
        $stmt = $pdo->prepare("DELETE FROM announcements WHERE id = ?");
        $stmt->execute([$id]);
        
        sendSuccessResponse(
            ['id' => (int)$id],
            "Announcement '{$announcement['title']}' has been deleted successfully"
        );
        
    } catch (PDOException $e) {
        error_log("Error deleting announcement: " . $e->getMessage());
        sendErrorResponse('Failed to delete announcement', 500, ['message' => $e->getMessage()]);
    }
}

/**
 * Mark announcement as read
 */
function markAnnouncementAsRead($pdo, $input) {
    try {
        $announcementId = $input['announcementId'] ?? null;
        $employeeId = $input['employeeId'] ?? null;
        
        if (!$announcementId || !$employeeId) {
            sendErrorResponse('Announcement ID and Employee ID are required', 400);
            return;
        }
        
        // Insert or update read status
        $stmt = $pdo->prepare("
            INSERT INTO announcement_reads (announcement_id, employee_id, read_at)
            VALUES (?, ?, NOW())
            ON DUPLICATE KEY UPDATE read_at = NOW()
        ");
        
        $stmt->execute([$announcementId, $employeeId]);
        
        sendSuccessResponse(['success' => true], "Announcement marked as read");
        
    } catch (PDOException $e) {
        error_log("Error marking announcement as read: " . $e->getMessage());
        sendErrorResponse('Failed to mark announcement as read', 500, ['message' => $e->getMessage()]);
    }
}

/**
 * Get announcement statistics
 */
function getAnnouncementStats($pdo) {
    try {
        $stmt = $pdo->query("
            SELECT 
                COUNT(*) as total_announcements,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_announcements,
                SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) as expired_announcements,
                SUM(CASE WHEN priority = 'urgent' THEN 1 ELSE 0 END) as urgent_announcements,
                SUM(CASE WHEN priority = 'important' THEN 1 ELSE 0 END) as important_announcements,
                SUM(CASE WHEN recipient_type = 'all' THEN 1 ELSE 0 END) as company_wide_announcements
            FROM announcements
        ");
        
        $stats = $stmt->fetch();
        
        sendSuccessResponse([
            'totalAnnouncements' => (int)$stats['total_announcements'],
            'activeAnnouncements' => (int)$stats['active_announcements'],
            'expiredAnnouncements' => (int)$stats['expired_announcements'],
            'urgentAnnouncements' => (int)$stats['urgent_announcements'],
            'importantAnnouncements' => (int)$stats['important_announcements'],
            'companyWideAnnouncements' => (int)$stats['company_wide_announcements']
        ]);
        
    } catch (PDOException $e) {
        error_log("Error fetching announcement stats: " . $e->getMessage());
        sendErrorResponse('Failed to fetch announcement statistics', 500, ['message' => $e->getMessage()]);
    }
}

?>