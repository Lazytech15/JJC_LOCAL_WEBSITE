<?php
// config/schema.php - Database Schema Manager

require_once __DIR__ . '/timezone.php';

/**
 * Initialize database schema - creates tables and indexes if they don't exist
 */
function initializeDatabase($pdo)
{
    try {
        
        // Timezone already set in database.php, but calling again doesn't hurt
        if (function_exists('setDatabaseTimezone')) {
            setDatabaseTimezone($pdo);
        }
        
        // Initialize emp_list table
        $empTableExists = checkTableExists($pdo, 'emp_list');

        if (!$empTableExists) {
            createEmployeeTable($pdo);
            error_log("Created emp_list table with indexes");
        } else {
            ensureEmployeeTableColumns($pdo);
            error_log("Verified emp_list table schema");
        }

        ensureEmployeeIndexes($pdo);

        // Initialize attendance table
        $attTableExists = checkTableExists($pdo, 'attendance');

        if (!$attTableExists) {
            createAttendanceTable($pdo);
            error_log("Created attendance table with indexes");
        } else {
            ensureAttendanceTableColumns($pdo);
            error_log("Verified attendance table schema");
        }

        ensureAttendanceIndexes($pdo);

        // Initialize daily_attendance_summary table
        $summaryTableExists = checkTableExists($pdo, 'daily_attendance_summary');

        if (!$summaryTableExists) {
            createDailySummaryTable($pdo);
            error_log("Created daily_attendance_summary table with indexes");
        } else {
            ensureDailySummaryTableColumns($pdo);
            error_log("Verified daily_attendance_summary table schema");
        }

        ensureDailySummaryIndexes($pdo);

        // Initialize itemsdb table
        $itemsTableExists = checkTableExists($pdo, 'itemsdb');

        if (!$itemsTableExists) {
            createItemsTable($pdo);
            error_log("Created itemsdb table with indexes");
        } else {
            ensureItemsTableColumns($pdo);
            error_log("Verified itemsdb table schema");
        }

        ensureItemsIndexes($pdo);

        // Initialize suppliers table
        $suppliersTableExists = checkTableExists($pdo, 'suppliers');

        if (!$suppliersTableExists) {
            createSuppliersTable($pdo);
            error_log("Created suppliers table with indexes");
        } else {
            ensureSuppliersTableColumns($pdo);
            error_log("Verified suppliers table schema");
        }

        ensureSuppliersIndexes($pdo);

        // Initialize purchase_orders table
        $poTableExists = checkTableExists($pdo, 'purchase_orders');

        if (!$poTableExists) {
            createPurchaseOrdersTable($pdo);
            error_log("Created purchase_orders table with indexes");
        } else {
            ensurePurchaseOrdersTableColumns($pdo);
            error_log("Verified purchase_orders table schema");
        }

        ensurePurchaseOrdersIndexes($pdo);

        // Initialize purchase_order_items table
        $poItemsTableExists = checkTableExists($pdo, 'purchase_order_items');

        if (!$poItemsTableExists) {
            createPurchaseOrderItemsTable($pdo);
            error_log("Created purchase_order_items table with indexes");
        } else {
            ensurePurchaseOrderItemsTableColumns($pdo);
            error_log("Verified purchase_order_items table schema");
        }

        ensurePurchaseOrderItemsIndexes($pdo);

        // Initialize announcements table
        $announcementsTableExists = checkTableExists($pdo, 'announcements');

        if (!$announcementsTableExists) {
            createAnnouncementsTable($pdo);
            error_log("Created announcements table with indexes");
        } else {
            ensureAnnouncementsTableColumns($pdo);
            error_log("Verified announcements table schema");
        }

        ensureAnnouncementsIndexes($pdo);

        // Initialize announcement_recipients table
        $announcementRecipientsTableExists = checkTableExists($pdo, 'announcement_recipients');

        if (!$announcementRecipientsTableExists) {
            createAnnouncementRecipientsTable($pdo);
            error_log("Created announcement_recipients table with indexes");
        } else {
            ensureAnnouncementRecipientsTableColumns($pdo);
            error_log("Verified announcement_recipients table schema");
        }

        ensureAnnouncementRecipientsIndexes($pdo);

        // Initialize announcement_reads table
        $announcementReadsTableExists = checkTableExists($pdo, 'announcement_reads');

        if (!$announcementReadsTableExists) {
            createAnnouncementReadsTable($pdo);
            error_log("Created announcement_reads table with indexes");
        } else {
            ensureAnnouncementReadsTableColumns($pdo);
            error_log("Verified announcement_reads table schema");
        }

        ensureAnnouncementReadsIndexes($pdo);

        // Initialize employee_logs table
        $employeeLogsTableExists = checkTableExists($pdo, 'employee_logs');

        if (!$employeeLogsTableExists) {
            createEmployeeLogsTable($pdo);
            error_log("Created employee_logs table with indexes");
        } else {
            ensureEmployeeLogsTableColumns($pdo);
            error_log("Verified employee_logs table schema");
        }

        ensureEmployeeLogsIndexes($pdo);

        // Initialize employee_logs_audit table
        $employeeLogsAuditTableExists = checkTableExists($pdo, 'employee_logs_audit');

        if (!$employeeLogsAuditTableExists) {
            createEmployeeLogsAuditTable($pdo);
            error_log("Created employee_logs_audit table with indexes");
        } else {
            ensureEmployeeLogsAuditTableColumns($pdo);
            error_log("Verified employee_logs_audit table schema");
        }

        ensureEmployeeLogsAuditIndexes($pdo);

        // Initialize operations tables
        initializeOperationsTables($pdo);
    } catch (PDOException $e) {
        error_log("Error initializing database: " . $e->getMessage());
        throw $e;
    }
}

/**
 * Initialize operations tables - add this to your initializeDatabase() function
 */
function initializeOperationsTables($pdo)
{
    try {
        // Initialize operations_items table
        $itemsTableExists = checkTableExists($pdo, 'operations_items');

        if (!$itemsTableExists) {
            createOperationsItemsTable($pdo);
            error_log("Created operations_items table with indexes");
        } else {
            ensureOperationsItemsTableColumns($pdo);
            error_log("Verified operations_items table schema");
        }

        ensureOperationsItemsIndexes($pdo);

        // Initialize operations_phases table
        $phasesTableExists = checkTableExists($pdo, 'operations_phases');

        if (!$phasesTableExists) {
            createOperationsPhasesTable($pdo);
            error_log("Created operations_phases table with indexes");
        } else {
            ensureOperationsPhasesTableColumns($pdo);
            error_log("Verified operations_phases table schema");
        }

        ensureOperationsPhasesIndexes($pdo);

        // Initialize operations_subphases table
        $subphasesTableExists = checkTableExists($pdo, 'operations_subphases');

        if (!$subphasesTableExists) {
            createOperationsSubphasesTable($pdo);
            error_log("Created operations_subphases table with indexes");
        } else {
            ensureOperationsSubphasesTableColumns($pdo);
            error_log("Verified operations_subphases table schema");
        }

        ensureOperationsSubphasesIndexes($pdo);

        // Initialize operations_audit_log table
        $auditLogTableExists = checkTableExists($pdo, 'operations_audit_log');

        if (!$auditLogTableExists) {
            createOperationsAuditLogTable($pdo);
            error_log("Created operations_audit_log table with indexes");
        } else {
            ensureOperationsAuditLogTableColumns($pdo);
            error_log("Verified operations_audit_log table schema");
        }

        ensureOperationsAuditLogIndexes($pdo);

        error_log("Operations tables initialized successfully");
    } catch (PDOException $e) {
        error_log("Error initializing operations tables: " . $e->getMessage());
        throw $e;
    }
}

/**
 * Get operations statistics (updated for actual_hours in phases)
 */
function getOperationsStatistics($pdo)
{
    try {
        $stats = [];

        // Total items
        $stmt = $pdo->query("SELECT COUNT(*) as total FROM operations_items");
        $stats['total_items'] = $stmt->fetch()['total'];

        // Items by status
        $stmt = $pdo->query("
            SELECT status, COUNT(*) as count 
            FROM operations_items 
            GROUP BY status
        ");
        while ($row = $stmt->fetch()) {
            $stats['items_by_status'][$row['status']] = $row['count'];
        }

        // Total phases
        $stmt = $pdo->query("SELECT COUNT(*) as total FROM operations_phases");
        $stats['total_phases'] = $stmt->fetch()['total'];

        // Total subphases
        $stmt = $pdo->query("SELECT COUNT(*) as total FROM operations_subphases");
        $stats['total_subphases'] = $stmt->fetch()['total'];

        // Completed subphases
        $stmt = $pdo->query("SELECT COUNT(*) as total FROM operations_subphases WHERE completed = 1");
        $stats['completed_subphases'] = $stmt->fetch()['total'];

        // Average completion time (from phases)
        $stmt = $pdo->query("
            SELECT AVG(actual_hours) as avg_hours 
            FROM operations_phases 
            WHERE actual_hours > 0
        ");
        $stats['avg_completion_hours'] = round($stmt->fetch()['avg_hours'] ?? 0, 2);

        // Employee performance
        $stmt = $pdo->query("
            SELECT 
                employee_uid,
                employee_name,
                COUNT(*) as tasks_completed,
                COUNT(CASE WHEN completed = 1 THEN 1 END) as completed_tasks
            FROM operations_subphases 
            WHERE completed = 1 AND employee_uid IS NOT NULL
            GROUP BY employee_uid, employee_name
            ORDER BY tasks_completed DESC
            LIMIT 10
        ");
        $stats['top_performers'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return $stats;
    } catch (PDOException $e) {
        error_log("Error getting operations statistics: " . $e->getMessage());
        return null;
    }
}


/**
 * Create the operations_items table with all required columns and indexes
 */
function createOperationsItemsTable($pdo)
{
    $createTableSQL = "
    CREATE TABLE IF NOT EXISTS operations_items (
        part_number VARCHAR(100) PRIMARY KEY,
        
        -- Item Information
        name VARCHAR(255) NOT NULL,
        description TEXT DEFAULT NULL,
        client_name VARCHAR(255) DEFAULT NULL,
        priority ENUM('High', 'Medium', 'Low') DEFAULT 'Medium',
        remarks TEXT DEFAULT NULL,
        qty INT DEFAULT 1,
        total_qty INT DEFAULT 1,
        
        -- Status and Progress
        overall_progress DECIMAL(5,2) DEFAULT 0.00,
        status ENUM('not_started', 'in_progress', 'completed') DEFAULT 'not_started',
        
        -- Timestamps
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        completed_at TIMESTAMP NULL DEFAULT NULL,
        
        -- Indexes for fast retrieval
        INDEX idx_name (name),
        INDEX idx_status (status),
        INDEX idx_overall_progress (overall_progress),
        INDEX idx_created_at (created_at),
        INDEX idx_completed_at (completed_at),
        INDEX idx_status_progress (status, overall_progress),
        INDEX idx_client_name (client_name),
        INDEX idx_priority (priority),
        INDEX idx_qty (qty),
        INDEX idx_total_qty (total_qty),
        
        -- Full-text search index
        FULLTEXT INDEX ft_item_search (name, description, remarks)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";
    $pdo->exec($createTableSQL);
    error_log("Successfully created operations_items table");
}

/**
 * Create the operations_phases table with all required columns and indexes
 */
function createOperationsPhasesTable($pdo)
{
    $createTableSQL = "
    CREATE TABLE IF NOT EXISTS operations_phases (
        id INT AUTO_INCREMENT PRIMARY KEY,
        
        -- Item Reference (using part_number)
        item_part_number VARCHAR(100) NOT NULL,
        
        -- Phase Information
        name VARCHAR(255) NOT NULL,
        phase_order INT DEFAULT 0,
        
        -- Progress
        progress DECIMAL(5,2) DEFAULT 0.00,
        
        -- Timing
        start_time TIMESTAMP NULL DEFAULT NULL,
        pause_time TIMESTAMP NULL DEFAULT NULL,
        paused_duration INT DEFAULT 0,
        end_time TIMESTAMP NULL DEFAULT NULL,
        
        -- Duration Tracking
        actual_hours DECIMAL(5,2) DEFAULT 0.00,
        
        -- Timestamps
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        -- Foreign Key
        FOREIGN KEY (item_part_number) REFERENCES operations_items(part_number) ON DELETE CASCADE,
        
        -- Indexes for fast retrieval
        INDEX idx_item_part_number (item_part_number),
        INDEX idx_name (name),
        INDEX idx_phase_order (phase_order),
        INDEX idx_progress (progress),
        INDEX idx_item_order (item_part_number, phase_order),
        INDEX idx_created_at (created_at),
        INDEX idx_start_time (start_time),
        INDEX idx_pause_time (pause_time),
        INDEX idx_paused_duration (paused_duration),
        INDEX idx_end_time (end_time),
        INDEX idx_actual_hours (actual_hours)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";

    $pdo->exec($createTableSQL);
    error_log("Successfully created operations_phases table with timing and actual_hours columns");
}

/**
 * Create the operations_subphases table with all required columns and indexes
 */
function createOperationsSubphasesTable($pdo)
{
    $createTableSQL = "
    CREATE TABLE IF NOT EXISTS operations_subphases (
        id INT AUTO_INCREMENT PRIMARY KEY,
        
        -- Phase Reference
        item_part_number VARCHAR(100) NOT NULL,
        phase_id INT NOT NULL,
        
        -- Subphase Information
        name VARCHAR(255) NOT NULL,
        time_duration INT NOT NULL,
        subphase_order INT DEFAULT 0,
        quantity INT DEFAULT 1,
        
        -- Duration Tracking
        expected_duration INT NOT NULL,
        expected_quantity INT DEFAULT 0,
        current_completed_quantity INT DEFAULT 0,
        
        -- Employee Assignment
        employee_barcode VARCHAR(100) DEFAULT NULL,
        employee_name VARCHAR(255) DEFAULT NULL,
        employee_uid INT DEFAULT NULL,
        
        -- Status
        completed TINYINT(1) DEFAULT 0,
        
        -- Timestamps (Philippines timezone)
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        completed_at TIMESTAMP NULL DEFAULT NULL,
        
        -- Foreign Keys
        FOREIGN KEY (item_part_number) REFERENCES operations_items(part_number) ON DELETE CASCADE,
        FOREIGN KEY (phase_id) REFERENCES operations_phases(id) ON DELETE CASCADE,
        FOREIGN KEY (employee_uid) REFERENCES emp_list(uid) ON DELETE SET NULL,
        
        -- Indexes for fast retrieval
        INDEX idx_item_part_number (item_part_number),
        INDEX idx_phase_id (phase_id),
        INDEX idx_employee_barcode (employee_barcode),
        INDEX idx_employee_uid (employee_uid),
        INDEX idx_completed (completed),
        INDEX idx_subphase_order (subphase_order),
        INDEX idx_item_phase (item_part_number, phase_id),
        INDEX idx_phase_order (phase_id, subphase_order),
        INDEX idx_employee_completed (employee_uid, completed),
        INDEX idx_completed_at (completed_at),
        INDEX idx_time_duration (time_duration),
        
        -- Full-text search index
        FULLTEXT INDEX ft_subphase_search (name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";

    $pdo->exec($createTableSQL);
    error_log("Successfully created operations_subphases table with time_duration");
}


/**
 * Create the operations_audit_log table for tracking changes
 */
function createOperationsAuditLogTable($pdo)
{
    $createTableSQL = "
    CREATE TABLE IF NOT EXISTS operations_audit_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        
        -- Reference Information (using part_number)
        item_part_number VARCHAR(100) DEFAULT NULL,
        phase_id INT DEFAULT NULL,
        subphase_id INT DEFAULT NULL,
        
        -- Action Information
        action_type ENUM('create', 'update', 'delete', 'complete', 'assign') NOT NULL,
        entity_type ENUM('item', 'phase', 'subphase') NOT NULL,
        
        -- Change Details
        old_value TEXT DEFAULT NULL,
        new_value TEXT DEFAULT NULL,
        
        -- User Information
        performed_by_uid INT DEFAULT NULL,
        performed_by_name VARCHAR(255) DEFAULT NULL,
        
        -- Additional Context
        notes TEXT DEFAULT NULL,
        
        -- Timestamp
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        -- Foreign Keys
        FOREIGN KEY (item_part_number) REFERENCES operations_items(part_number) ON DELETE SET NULL,
        FOREIGN KEY (phase_id) REFERENCES operations_phases(id) ON DELETE SET NULL,
        FOREIGN KEY (subphase_id) REFERENCES operations_subphases(id) ON DELETE SET NULL,
        FOREIGN KEY (performed_by_uid) REFERENCES emp_list(uid) ON DELETE SET NULL,
        
        -- Indexes for fast retrieval
        INDEX idx_item_part_number (item_part_number),
        INDEX idx_phase_id (phase_id),
        INDEX idx_subphase_id (subphase_id),
        INDEX idx_action_type (action_type),
        INDEX idx_entity_type (entity_type),
        INDEX idx_performed_by (performed_by_uid),
        INDEX idx_created_at (created_at),
        INDEX idx_item_action (item_part_number, action_type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";

    $pdo->exec($createTableSQL);
    error_log("Successfully created operations_audit_log table with part_number reference");
}

/**
 * Ensure all required columns exist in the operations_items table
 */
function ensureOperationsItemsTableColumns($pdo)
{
    $requiredColumns = [
        'part_number' => "VARCHAR(100) PRIMARY KEY",
        'name' => "VARCHAR(255) NOT NULL",
        'description' => "TEXT DEFAULT NULL",
        'client_name' => "VARCHAR(255) DEFAULT NULL",
        'priority' => "ENUM('High', 'Medium', 'Low') DEFAULT 'Medium'",
        'remarks' => "TEXT DEFAULT NULL",
        'qty' => "INT DEFAULT 1",
        'total_qty' => "INT DEFAULT 1",
        'overall_progress' => "DECIMAL(5,2) DEFAULT 0.00",
        'status' => "ENUM('not_started', 'in_progress', 'completed') DEFAULT 'not_started'",
        'created_at' => "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
        'updated_at' => "TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
        'completed_at' => "TIMESTAMP NULL DEFAULT NULL"
    ];

    ensureTableColumns($pdo, 'operations_items', $requiredColumns);
}

/**
 * Ensure all required columns exist in the operations_phases table
 */
function ensureOperationsPhasesTableColumns($pdo)
{
    $requiredColumns = [
        'id' => "INT AUTO_INCREMENT PRIMARY KEY",
        'item_part_number' => "VARCHAR(100) NOT NULL",
        'name' => "VARCHAR(255) NOT NULL",
        'phase_order' => "INT DEFAULT 0",
        'progress' => "DECIMAL(5,2) DEFAULT 0.00",
        'start_time' => "TIMESTAMP NULL DEFAULT NULL",
        'pause_time' => "TIMESTAMP NULL DEFAULT NULL",
        'end_time' => "TIMESTAMP NULL DEFAULT NULL",
        'actual_hours' => "DECIMAL(5,2) DEFAULT 0.00",
        'created_at' => "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
        'updated_at' => "TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
    ];

    ensureTableColumns($pdo, 'operations_phases', $requiredColumns);
}

/**
 * Ensure all required columns exist in the operations_subphases table
 */
function ensureOperationsSubphasesTableColumns($pdo)
{
    $requiredColumns = [
        'id' => "INT AUTO_INCREMENT PRIMARY KEY",
        'item_part_number' => "VARCHAR(100) NOT NULL",
        'phase_id' => "INT NOT NULL",
        'name' => "VARCHAR(255) NOT NULL",
        'time_duration' => "INT DEFAULT 0 COMMENT 'Duration in seconds until subphase completion'",
        'subphase_order' => "INT DEFAULT 0",
        'quantity' => "INT DEFAULT 1",
        'expected_duration' => "INT DEFAULT 0",
        'expected_quantity' => "INT DEFAULT 0",
        'current_completed_quantity' => "INT DEFAULT 0",
        'employee_barcode' => "VARCHAR(100) DEFAULT NULL",
        'employee_name' => "VARCHAR(255) DEFAULT NULL",
        'employee_uid' => "INT DEFAULT NULL",
        'completed' => "TINYINT(1) DEFAULT 0",
        'created_at' => "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
        'updated_at' => "TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
        'completed_at' => "TIMESTAMP NULL DEFAULT NULL"
    ];

    ensureTableColumns($pdo, 'operations_subphases', $requiredColumns);
}

/**
 * Ensure all required columns exist in the operations_audit_log table
 */
function ensureOperationsAuditLogTableColumns($pdo)
{
    $requiredColumns = [
        'id' => "INT AUTO_INCREMENT PRIMARY KEY",
        'item_part_number' => "VARCHAR(100) DEFAULT NULL",
        'phase_id' => "INT DEFAULT NULL",
        'subphase_id' => "INT DEFAULT NULL",
        'action_type' => "ENUM('create', 'update', 'delete', 'complete', 'assign') NOT NULL",
        'entity_type' => "ENUM('item', 'phase', 'subphase') NOT NULL",
        'old_value' => "TEXT DEFAULT NULL",
        'new_value' => "TEXT DEFAULT NULL",
        'performed_by_uid' => "INT DEFAULT NULL",
        'performed_by_name' => "VARCHAR(255) DEFAULT NULL",
        'notes' => "TEXT DEFAULT NULL",
        'created_at' => "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
    ];

    ensureTableColumns($pdo, 'operations_audit_log', $requiredColumns);
}

/**
 * Ensure all required indexes exist for operations_items table
 */
function ensureOperationsItemsIndexes($pdo)
{
    $requiredIndexes = [
        'idx_name' => 'name',
        'idx_status' => 'status',
        'idx_overall_progress' => 'overall_progress',
        'idx_created_at' => 'created_at',
        'idx_completed_at' => 'completed_at',
        'idx_status_progress' => 'status, overall_progress',
        'idx_client_name' => 'client_name',
        'idx_priority' => 'priority',
        'idx_qty' => 'qty',
        'idx_total_qty' => 'total_qty'
    ];

    ensureIndexes($pdo, 'operations_items', $requiredIndexes);
    ensureFulltextIndex($pdo, 'operations_items', 'ft_item_search', 'name, description, remarks');
}

/**
 * Ensure all required indexes exist for operations_phases table
 */
function ensureOperationsPhasesIndexes($pdo)
{
    $requiredIndexes = [
        'idx_item_part_number' => 'item_part_number',
        'idx_name' => 'name',
        'idx_phase_order' => 'phase_order',
        'idx_progress' => 'progress',
        'idx_item_order' => 'item_part_number, phase_order',
        'idx_created_at' => 'created_at',
        'idx_start_time' => 'start_time',
        'idx_pause_time' => 'pause_time',
        'idx_end_time' => 'end_time',
        'idx_actual_hours' => 'actual_hours'
    ];

    ensureIndexes($pdo, 'operations_phases', $requiredIndexes);
}

/**
 * Ensure all required indexes exist for operations_subphases table
 */
function ensureOperationsSubphasesIndexes($pdo)
{
    $requiredIndexes = [
        'idx_item_part_number' => 'item_part_number',
        'idx_phase_id' => 'phase_id',
        'idx_employee_barcode' => 'employee_barcode',
        'idx_employee_uid' => 'employee_uid',
        'idx_completed' => 'completed',
        'idx_subphase_order' => 'subphase_order',
        'idx_item_phase' => 'item_part_number, phase_id',
        'idx_phase_order' => 'phase_id, subphase_order',
        'idx_employee_completed' => 'employee_uid, completed',
        'idx_completed_at' => 'completed_at',
        'idx_time_duration' => 'time_duration'
    ];

    ensureIndexes($pdo, 'operations_subphases', $requiredIndexes);
    ensureFulltextIndex($pdo, 'operations_subphases', 'ft_subphase_search', 'name');
}
/**
 * Ensure all required indexes exist for operations_audit_log table
 */
function ensureOperationsAuditLogIndexes($pdo)
{
    $requiredIndexes = [
        'idx_item_part_number' => 'item_part_number',
        'idx_phase_id' => 'phase_id',
        'idx_subphase_id' => 'subphase_id',
        'idx_action_type' => 'action_type',
        'idx_entity_type' => 'entity_type',
        'idx_performed_by' => 'performed_by_uid',
        'idx_created_at' => 'created_at',
        'idx_item_action' => 'item_part_number, action_type'
    ];

    ensureIndexes($pdo, 'operations_audit_log', $requiredIndexes);
}

/**
 * Check if a table exists in the database
 */
function checkTableExists($pdo, $tableName)
{
    try {
        $stmt = $pdo->prepare("
            SELECT COUNT(*) as count 
            FROM information_schema.tables 
            WHERE table_schema = DATABASE() 
            AND table_name = ?
        ");
        $stmt->execute([$tableName]);
        $result = $stmt->fetch();
        return $result['count'] > 0;
    } catch (PDOException $e) {
        error_log("Error checking table existence: " . $e->getMessage());
        return false;
    }
}

/**
 * Create the emp_list table with all required columns and indexes
 */
function createEmployeeTable($pdo)
{
    $createTableSQL = "
    CREATE TABLE IF NOT EXISTS emp_list (
        uid INT AUTO_INCREMENT PRIMARY KEY,
        
        -- Personal Information
        first_name VARCHAR(100) NOT NULL,
        middle_name VARCHAR(100) DEFAULT NULL,
        last_name VARCHAR(100) NOT NULL,
        age INT DEFAULT NULL,
        birth_date DATE DEFAULT NULL,
        contact_number VARCHAR(20) DEFAULT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        civil_status ENUM('Single', 'Married', 'Divorced', 'Widowed') DEFAULT 'Single',
        address TEXT DEFAULT NULL,
        
        -- Employment Information
        hire_date DATE NOT NULL DEFAULT (CURRENT_DATE),
        position VARCHAR(150) NOT NULL,
        department VARCHAR(150) NOT NULL,
        status ENUM('Active', 'Inactive', 'On Leave', 'Terminated') DEFAULT 'Active',
        salary VARCHAR(50) DEFAULT NULL,
        
        -- Government IDs
        id_number VARCHAR(50) NOT NULL UNIQUE,
        id_barcode VARCHAR(100) DEFAULT NULL UNIQUE,
        tin_number VARCHAR(20) DEFAULT NULL,
        sss_number VARCHAR(20) DEFAULT NULL,
        pagibig_number VARCHAR(20) DEFAULT NULL,
        philhealth_number VARCHAR(20) DEFAULT NULL,
        
        -- Media & Documents
        profile_picture TEXT DEFAULT NULL,
        face_descriptor TEXT DEFAULT NULL,
        document TEXT DEFAULT NULL,
        
        -- Authentication
        username VARCHAR(100) NOT NULL UNIQUE,
        password_hash VARCHAR(255) DEFAULT NULL,
        access_level ENUM('admin', 'manager', 'user') DEFAULT 'user',
        
        -- Timestamps
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        -- Indexes for fast retrieval
        INDEX idx_email (email),
        INDEX idx_department (department),
        INDEX idx_status (status),
        INDEX idx_position (position),
        INDEX idx_hire_date (hire_date),
        INDEX idx_id_number (id_number),
        INDEX idx_username (username),
        INDEX idx_full_name (last_name, first_name),
        INDEX idx_created_at (created_at),
        INDEX idx_dept_status (department, status),
        INDEX idx_hire_status (hire_date, status),
        
        -- Full-text search index for better search performance
        FULLTEXT INDEX ft_search (first_name, middle_name, last_name, position, department, email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";

    $pdo->exec($createTableSQL);
    error_log("Successfully created emp_list table with indexes");
}

/**
 * Create the attendance table with all required columns and indexes
 */
function createAttendanceTable($pdo)
{
    $createTableSQL = "
    CREATE TABLE IF NOT EXISTS attendance (
        id INT AUTO_INCREMENT PRIMARY KEY,
        
        -- Employee Reference
        employee_uid INT NOT NULL,
        id_number VARCHAR(50) DEFAULT NULL,
        
        -- Clock Information
        clock_type ENUM('morning_in', 'morning_out', 'afternoon_in', 'afternoon_out', 'overtime_in', 'overtime_out') NOT NULL,
        clock_time TIME NOT NULL,
        date DATE NOT NULL,
        
        -- Hours Tracking
        regular_hours DECIMAL(5,2) DEFAULT 0.00,
        overtime_hours DECIMAL(5,2) DEFAULT 0.00,
        
        -- Status Flags
        is_late TINYINT(1) DEFAULT 0,
        is_synced TINYINT(1) DEFAULT 0,
        
        -- Additional Information
        notes TEXT DEFAULT NULL,
        location VARCHAR(255) DEFAULT NULL,
        ip_address VARCHAR(45) DEFAULT NULL,
        device_info VARCHAR(255) DEFAULT NULL,
        
        -- Timestamps
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        -- Foreign Key
        FOREIGN KEY (employee_uid) REFERENCES emp_list(uid) ON DELETE CASCADE,
        
        -- Indexes for fast retrieval
        INDEX idx_employee_uid (employee_uid),
        INDEX idx_date (date),
        INDEX idx_clock_type (clock_type),
        INDEX idx_clock_time (clock_time),
        INDEX idx_is_late (is_late),
        INDEX idx_is_synced (is_synced),
        INDEX idx_id_number (id_number),
        INDEX idx_created_at (created_at),
        INDEX idx_employee_date (employee_uid, date),
        INDEX idx_date_clock_type (date, clock_type),
        INDEX idx_employee_date_clock (employee_uid, date, clock_type),
        
        -- Unique constraint to prevent exact duplicates
        UNIQUE KEY unique_attendance (employee_uid, clock_time, date, clock_type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";

    $pdo->exec($createTableSQL);
    error_log("Successfully created attendance table with indexes");
}

/**
 * Create the daily_attendance_summary table with all required columns and indexes
 */
function createDailySummaryTable($pdo)
{
    $createTableSQL = "
    CREATE TABLE IF NOT EXISTS daily_attendance_summary (
        id INT AUTO_INCREMENT PRIMARY KEY,
        
        -- Employee Reference
        employee_uid INT NOT NULL,
        id_number VARCHAR(50) DEFAULT NULL,
        id_barcode VARCHAR(100) DEFAULT NULL,
        employee_name VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) DEFAULT NULL,
        last_name VARCHAR(100) DEFAULT NULL,
        department VARCHAR(150) DEFAULT NULL,
        
        -- Date
        date DATE NOT NULL,
        
        -- Clock Times
        first_clock_in DATETIME DEFAULT NULL,
        last_clock_out DATETIME DEFAULT NULL,
        
        -- Session Times - Morning
        morning_in DATETIME DEFAULT NULL,
        morning_out DATETIME DEFAULT NULL,
        
        -- Session Times - Afternoon
        afternoon_in DATETIME DEFAULT NULL,
        afternoon_out DATETIME DEFAULT NULL,
        
        -- Session Times - Evening
        evening_in DATETIME DEFAULT NULL,
        evening_out DATETIME DEFAULT NULL,
        
        -- Session Times - Overtime
        overtime_in DATETIME DEFAULT NULL,
        overtime_out DATETIME DEFAULT NULL,
        
        -- Hours Tracking
        regular_hours DECIMAL(5,2) DEFAULT 0.00,
        overtime_hours DECIMAL(5,2) DEFAULT 0.00,
        total_hours DECIMAL(5,2) DEFAULT 0.00,
        
        -- Session Hours
        morning_hours DECIMAL(5,2) DEFAULT 0.00,
        afternoon_hours DECIMAL(5,2) DEFAULT 0.00,
        evening_hours DECIMAL(5,2) DEFAULT 0.00,
        overtime_session_hours DECIMAL(5,2) DEFAULT 0.00,
        
        -- Status Flags
        is_incomplete TINYINT(1) DEFAULT 0,
        has_late_entry TINYINT(1) DEFAULT 0,
        has_overtime TINYINT(1) DEFAULT 0,
        has_evening_session TINYINT(1) DEFAULT 0,
        
        -- Session Statistics
        total_sessions INT DEFAULT 0,
        completed_sessions INT DEFAULT 0,
        pending_sessions INT DEFAULT 0,
        
        -- Additional Metrics
        total_minutes_worked INT DEFAULT 0,
        break_time_minutes INT DEFAULT 0,
        
        -- Timestamps
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        -- Foreign Key
        FOREIGN KEY (employee_uid) REFERENCES emp_list(uid) ON DELETE CASCADE,
        
        -- Indexes for fast retrieval
        INDEX idx_employee_uid (employee_uid),
        INDEX idx_date (date),
        INDEX idx_employee_name (employee_name),
        INDEX idx_department (department),
        INDEX idx_id_number (id_number),
        INDEX idx_has_overtime (has_overtime),
        INDEX idx_is_incomplete (is_incomplete),
        INDEX idx_has_late_entry (has_late_entry),
        INDEX idx_last_updated (last_updated),
        INDEX idx_total_hours (total_hours),
        INDEX idx_employee_date (employee_uid, date),
        INDEX idx_date_department (date, department),
        INDEX idx_dept_date (department, date),
        
        -- Unique constraint to prevent duplicate summaries
        UNIQUE KEY unique_daily_summary (employee_uid, date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";

    $pdo->exec($createTableSQL);
    error_log("Successfully created daily_attendance_summary table with indexes");
}

/**
 * Create the itemsdb table with all required columns and indexes
 */
function createItemsTable($pdo)
{
    $createTableSQL = "
    CREATE TABLE IF NOT EXISTS itemsdb (
        item_no INT AUTO_INCREMENT PRIMARY KEY,
        
        -- Item Information
        item_name VARCHAR(255) NOT NULL,
        brand VARCHAR(150) DEFAULT NULL,
        item_type VARCHAR(150) DEFAULT NULL,
        location VARCHAR(150) DEFAULT NULL,
        barcode VARCHAR(100) DEFAULT NULL,
        
        -- Quantities
        unit_of_measure VARCHAR(50) DEFAULT NULL,
        in_qty DECIMAL(10,2) DEFAULT 0.00,
        out_qty DECIMAL(10,2) DEFAULT 0.00,
        balance DECIMAL(10,2) GENERATED ALWAYS AS (in_qty - out_qty) STORED,
        min_stock DECIMAL(10,2) DEFAULT 0.00,
        moq DECIMAL(10,2) DEFAULT 0.00,
        deficit DECIMAL(10,2) GENERATED ALWAYS AS (GREATEST(min_stock - (in_qty - out_qty), 0)) STORED,
        
        -- Pricing
        price_per_unit DECIMAL(10,2) DEFAULT 0.00,
        cost DECIMAL(10,2) GENERATED ALWAYS AS ((in_qty - out_qty) * price_per_unit) STORED,
        
        -- Status
        item_status VARCHAR(50) GENERATED ALWAYS AS (
            CASE 
                WHEN (in_qty - out_qty) = 0 THEN 'Out Of Stock'
                WHEN min_stock > 0 AND (in_qty - out_qty) < min_stock THEN 'Low In Stock'
                ELSE 'In Stock'
            END
        ) STORED,
        
        -- Supplier Information
        supplier VARCHAR(255) DEFAULT NULL,
        last_po VARCHAR(50) DEFAULT NULL,
        
        -- Timestamps
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        -- Indexes for fast retrieval
        INDEX idx_item_name (item_name),
        INDEX idx_brand (brand),
        INDEX idx_item_type (item_type),
        INDEX idx_location (location),
        INDEX idx_supplier (supplier),
        INDEX idx_item_status (item_status),
        INDEX idx_balance (balance),
        INDEX idx_barcode (barcode),
        INDEX idx_last_po (last_po),
        INDEX idx_created_at (created_at),
        INDEX idx_type_location (item_type, location),
        INDEX idx_supplier_status (supplier, item_status),
        INDEX idx_status_balance (item_status, balance),
        
        -- Full-text search index
        FULLTEXT INDEX ft_item_search (item_name, brand, item_type, supplier)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";

    $pdo->exec($createTableSQL);
    error_log("Successfully created itemsdb table with indexes");
}

/**
 * Create the suppliers table with all required columns and indexes
 */
function createSuppliersTable($pdo)
{
    $createTableSQL = "
    CREATE TABLE IF NOT EXISTS suppliers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        
        -- Basic Information
        name VARCHAR(255) NOT NULL UNIQUE,
        contact_person VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        phone VARCHAR(20) NOT NULL,
        
        -- Address Information
        address TEXT DEFAULT NULL,
        city VARCHAR(100) DEFAULT NULL,
        country VARCHAR(100) DEFAULT 'Philippines',
        postal_code VARCHAR(20) DEFAULT NULL,
        
        -- Business Information
        website VARCHAR(255) DEFAULT NULL,
        tax_id VARCHAR(50) DEFAULT NULL,
        payment_terms VARCHAR(100) DEFAULT 'Net 30',
        
        -- Additional Information
        notes TEXT DEFAULT NULL,
        status ENUM('active', 'inactive') DEFAULT 'active',
        supplier_snapshot TEXT DEFAULT NULL,
        
        -- Timestamps
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        -- Indexes for fast retrieval
        INDEX idx_name (name),
        INDEX idx_email (email),
        INDEX idx_status (status),
        INDEX idx_contact_person (contact_person),
        INDEX idx_city (city),
        INDEX idx_country (country),
        INDEX idx_created_at (created_at),
        
        -- Full-text search index
        FULLTEXT INDEX ft_supplier_search (name, contact_person, email, city)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";

    $pdo->exec($createTableSQL);
    error_log("Successfully created suppliers table with indexes");
}

/**
 * Create the purchase_orders table with all required columns and indexes
 */
function createPurchaseOrdersTable($pdo)
{
    $createTableSQL = "
    CREATE TABLE IF NOT EXISTS purchase_orders (
        id VARCHAR(50) PRIMARY KEY,
        
        -- Supplier Information
        supplier VARCHAR(255) NOT NULL,
        supplier_name VARCHAR(255) DEFAULT NULL,
        supplier_address TEXT DEFAULT NULL,
        attention_person VARCHAR(255) DEFAULT NULL,
        
        -- Order Information
        status ENUM('requested', 'approved', 'ordered', 'received', 'cancelled') DEFAULT 'requested',
        order_date DATE NOT NULL,
        po_date DATE DEFAULT NULL,
        expected_delivery_date DATE DEFAULT NULL,
        actual_delivery_date DATE DEFAULT NULL,
        
        -- Order Summary
        total_items INT DEFAULT 0,
        total_quantity DECIMAL(10,2) DEFAULT 0.00,
        total_value DECIMAL(10,2) DEFAULT 0.00,
        
        -- Additional Information
        notes TEXT DEFAULT NULL,
        terms TEXT DEFAULT NULL,
        priority ENUM('P0', 'P1', 'P2', 'P3', 'P4', 'low', 'normal', 'high', 'urgent') DEFAULT 'P2',
        
        -- Approval Information
        prepared_by VARCHAR(255) DEFAULT NULL,
        verified_by VARCHAR(255) DEFAULT NULL,
        approved_by VARCHAR(255) DEFAULT NULL,
        
        -- Version Control
        is_overwritten TINYINT(1) DEFAULT 0,
        overwrite_timestamp TIMESTAMP NULL DEFAULT NULL,
        previous_version TEXT DEFAULT NULL,
        
        -- Timestamps
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        -- Indexes for fast retrieval
        INDEX idx_supplier (supplier),
        INDEX idx_supplier_name (supplier_name),
        INDEX idx_status (status),
        INDEX idx_order_date (order_date),
        INDEX idx_po_date (po_date),
        INDEX idx_expected_delivery (expected_delivery_date),
        INDEX idx_actual_delivery (actual_delivery_date),
        INDEX idx_priority (priority),
        INDEX idx_created_at (created_at),
        INDEX idx_last_updated (last_updated),
        INDEX idx_supplier_status (supplier, status),
        INDEX idx_status_date (status, order_date),
        INDEX idx_date_supplier (order_date, supplier)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";

    $pdo->exec($createTableSQL);
    error_log("Successfully created purchase_orders table with indexes");
}

/**
 * Create the purchase_order_items table with all required columns and indexes
 */
function createPurchaseOrderItemsTable($pdo)
{
    $createTableSQL = "
    CREATE TABLE IF NOT EXISTS purchase_order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        
        -- Order Reference
        purchase_order_id VARCHAR(50) NOT NULL,
        
        -- Item Information
        item_no INT NOT NULL,
        item_name VARCHAR(255) NOT NULL,
        
        -- Quantity and Pricing
        quantity DECIMAL(10,2) NOT NULL,
        unit VARCHAR(50) DEFAULT 'pcs',
        unit_price DECIMAL(10,2) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        
        -- Status
        status ENUM('ordered', 'received', 'cancelled') DEFAULT 'ordered',
        
        -- Additional Information
        custom_quantity DECIMAL(10,2) DEFAULT NULL,
        recommended_quantity DECIMAL(10,2) DEFAULT NULL,
        supplier_specific VARCHAR(255) DEFAULT NULL,
        delivery_method VARCHAR(50) DEFAULT 'delivery',
        
        -- Timestamps
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        -- Foreign Keys
        FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
        FOREIGN KEY (item_no) REFERENCES itemsdb(item_no) ON DELETE RESTRICT,
        
        -- Indexes for fast retrieval
        INDEX idx_purchase_order_id (purchase_order_id),
        INDEX idx_item_no (item_no),
        INDEX idx_status (status),
        INDEX idx_item_name (item_name),
        INDEX idx_supplier_specific (supplier_specific),
        INDEX idx_po_item (purchase_order_id, item_no),
        INDEX idx_po_status (purchase_order_id, status),
        INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";

    $pdo->exec($createTableSQL);
    error_log("Successfully created purchase_order_items table with indexes");
}

/**
 * Create the announcements table with all required columns and indexes
 */
function createAnnouncementsTable($pdo)
{
    $createTableSQL = "
    CREATE TABLE IF NOT EXISTS announcements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        
        -- Announcement Content
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        
        -- Recipient Information
        recipient_type ENUM('all', 'department', 'specific') DEFAULT 'all',
        
        -- Priority and Status
        priority ENUM('normal', 'important', 'urgent') DEFAULT 'normal',
        status ENUM('active', 'expired', 'draft') DEFAULT 'active',
        
        -- Dates
        expiry_date DATE DEFAULT NULL,
        
        -- Creator Information
        created_by INT NOT NULL,
        
        -- Timestamps
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        -- Foreign Key
        FOREIGN KEY (created_by) REFERENCES emp_list(uid) ON DELETE CASCADE,
        
        -- Indexes for fast retrieval
        INDEX idx_recipient_type (recipient_type),
        INDEX idx_priority (priority),
        INDEX idx_status (status),
        INDEX idx_expiry_date (expiry_date),
        INDEX idx_created_by (created_by),
        INDEX idx_created_at (created_at),
        INDEX idx_status_priority (status, priority),
        INDEX idx_status_expiry (status, expiry_date),
        INDEX idx_recipient_status (recipient_type, status),
        
        -- Full-text search index
        FULLTEXT INDEX ft_announcement_search (title, message)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";

    $pdo->exec($createTableSQL);
    error_log("Successfully created announcements table with indexes");
}

/**
 * Create the announcement_recipients table with all required columns and indexes
 */
function createAnnouncementRecipientsTable($pdo)
{
    $createTableSQL = "
    CREATE TABLE IF NOT EXISTS announcement_recipients (
        id INT AUTO_INCREMENT PRIMARY KEY,
        
        -- Announcement Reference
        announcement_id INT NOT NULL,
        
        -- Recipient Information
        recipient_type ENUM('department', 'employee') NOT NULL,
        department_name VARCHAR(150) DEFAULT NULL,
        employee_id INT DEFAULT NULL,
        
        -- Timestamps
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        -- Foreign Keys
        FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
        FOREIGN KEY (employee_id) REFERENCES emp_list(uid) ON DELETE CASCADE,
        
        -- Indexes for fast retrieval
        INDEX idx_announcement_id (announcement_id),
        INDEX idx_recipient_type (recipient_type),
        INDEX idx_department_name (department_name),
        INDEX idx_employee_id (employee_id),
        INDEX idx_announcement_recipient (announcement_id, recipient_type),
        INDEX idx_announcement_department (announcement_id, department_name),
        INDEX idx_announcement_employee (announcement_id, employee_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";

    $pdo->exec($createTableSQL);
    error_log("Successfully created announcement_recipients table with indexes");
}

/**
 * Create the announcement_reads table with all required columns and indexes
 */
function createAnnouncementReadsTable($pdo)
{
    $createTableSQL = "
    CREATE TABLE IF NOT EXISTS announcement_reads (
        id INT AUTO_INCREMENT PRIMARY KEY,
        
        -- Announcement Reference
        announcement_id INT NOT NULL,
        
        -- Employee Reference
        employee_id INT NOT NULL,
        
        -- Read Timestamp
        read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        -- Foreign Keys
        FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
        FOREIGN KEY (employee_id) REFERENCES emp_list(uid) ON DELETE CASCADE,
        
        -- Indexes for fast retrieval
        INDEX idx_announcement_id (announcement_id),
        INDEX idx_employee_id (employee_id),
        INDEX idx_read_at (read_at),
        INDEX idx_announcement_employee (announcement_id, employee_id),
        
        -- Unique constraint to prevent duplicate reads
        UNIQUE KEY unique_announcement_read (announcement_id, employee_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";

    $pdo->exec($createTableSQL);
    error_log("Successfully created announcement_reads table with indexes");
}

/**
 * Create the employee_logs table with all required columns and indexes
 */
function createEmployeeLogsTable($pdo)
{
    $createTableSQL = "
    CREATE TABLE IF NOT EXISTS employee_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        
        -- Employee Information
        username VARCHAR(100) DEFAULT NULL,
        id_number VARCHAR(50) DEFAULT NULL,
        id_barcode VARCHAR(100) DEFAULT NULL,
        
        -- Activity Information
        log_date DATE DEFAULT NULL,
        log_time TIME DEFAULT NULL,
        details TEXT DEFAULT NULL,
        purpose TEXT DEFAULT NULL,
        
        -- Item Reference (for inventory activities)
        item_no VARCHAR(50) DEFAULT NULL,
        
        -- Edit History (immutable logs pattern)
        supersedes_original_id INT DEFAULT NULL,
        status ENUM('ACTIVE', 'SUPERSEDED', 'DELETED') DEFAULT 'ACTIVE',
        edited_by_admin_id INT DEFAULT NULL,
        edited_at TIMESTAMP NULL DEFAULT NULL,
        
        -- Timestamps
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        -- Indexes for fast retrieval
        INDEX idx_username (username),
        INDEX idx_id_number (id_number),
        INDEX idx_id_barcode (id_barcode),
        INDEX idx_log_date (log_date),
        INDEX idx_log_time (log_time),
        INDEX idx_item_no (item_no),
        INDEX idx_status (status),
        INDEX idx_supersedes (supersedes_original_id),
        INDEX idx_created_at (created_at),
        INDEX idx_username_date (username, log_date),
        INDEX idx_date_time (log_date, log_time),
        INDEX idx_status_date (status, log_date),
        
        -- Full-text search index
        FULLTEXT INDEX ft_log_search (username, details, purpose)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";

    $pdo->exec($createTableSQL);
    error_log("Successfully created employee_logs table with indexes");
}

/**
 * Create the employee_logs_audit table for tracking log edits
 */
function createEmployeeLogsAuditTable($pdo)
{
    $createTableSQL = "
    CREATE TABLE IF NOT EXISTS employee_logs_audit (
        audit_id INT AUTO_INCREMENT PRIMARY KEY,
        
        -- Log References
        original_log_id INT NOT NULL,
        new_log_id INT NOT NULL,
        
        -- Original Values (before edit)
        old_username VARCHAR(100) DEFAULT NULL,
        old_id_number VARCHAR(50) DEFAULT NULL,
        old_id_barcode VARCHAR(100) DEFAULT NULL,
        old_log_date DATE DEFAULT NULL,
        old_log_time TIME DEFAULT NULL,
        old_details TEXT DEFAULT NULL,
        old_purpose TEXT DEFAULT NULL,
        old_item_no VARCHAR(50) DEFAULT NULL,
        
        -- New Values (after edit)
        new_username VARCHAR(100) DEFAULT NULL,
        new_id_number VARCHAR(50) DEFAULT NULL,
        new_id_barcode VARCHAR(100) DEFAULT NULL,
        new_log_date DATE DEFAULT NULL,
        new_log_time TIME DEFAULT NULL,
        new_details TEXT DEFAULT NULL,
        new_purpose TEXT DEFAULT NULL,
        new_item_no VARCHAR(50) DEFAULT NULL,
        
        -- Item Corrections (for inventory adjustments)
        item_corrections_json TEXT DEFAULT NULL,
        
        -- Edit Metadata
        edited_by_admin_id INT DEFAULT NULL,
        edit_reason TEXT DEFAULT NULL,
        edited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        -- Indexes for fast retrieval
        INDEX idx_original_log_id (original_log_id),
        INDEX idx_new_log_id (new_log_id),
        INDEX idx_edited_by (edited_by_admin_id),
        INDEX idx_edited_at (edited_at),
        INDEX idx_original_new (original_log_id, new_log_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";

    $pdo->exec($createTableSQL);
    error_log("Successfully created employee_logs_audit table with indexes");
}

/**
 * Ensure all required columns exist in the attendance table
 */
function ensureAttendanceTableColumns($pdo)
{
    $requiredColumns = [
        'id' => "INT AUTO_INCREMENT PRIMARY KEY",
        'employee_uid' => "INT NOT NULL",
        'id_number' => "VARCHAR(50) DEFAULT NULL",
        'clock_type' => "ENUM('morning_in', 'morning_out', 'afternoon_in', 'afternoon_out', 'overtime_in', 'overtime_out') NOT NULL",
        'clock_time' => "TIME NOT NULL",
        'date' => "DATE NOT NULL",
        'regular_hours' => "DECIMAL(5,2) DEFAULT 0.00",
        'overtime_hours' => "DECIMAL(5,2) DEFAULT 0.00",
        'is_late' => "TINYINT(1) DEFAULT 0",
        'is_synced' => "TINYINT(1) DEFAULT 0",
        'notes' => "TEXT DEFAULT NULL",
        'location' => "VARCHAR(255) DEFAULT NULL",
        'ip_address' => "VARCHAR(45) DEFAULT NULL",
        'device_info' => "VARCHAR(255) DEFAULT NULL",
        'created_at' => "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
        'updated_at' => "TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
    ];

    ensureTableColumns($pdo, 'attendance', $requiredColumns);
}

/**
 * Ensure all required columns exist in the daily_attendance_summary table
 */
function ensureDailySummaryTableColumns($pdo)
{
    $requiredColumns = [
        'id' => "INT AUTO_INCREMENT PRIMARY KEY",
        'employee_uid' => "INT NOT NULL",
        'id_number' => "VARCHAR(50) DEFAULT NULL",
        'id_barcode' => "VARCHAR(100) DEFAULT NULL",
        'employee_name' => "VARCHAR(255) NOT NULL",
        'first_name' => "VARCHAR(100) DEFAULT NULL",
        'last_name' => "VARCHAR(100) DEFAULT NULL",
        'department' => "VARCHAR(150) DEFAULT NULL",
        'date' => "DATE NOT NULL",
        'first_clock_in' => "DATETIME DEFAULT NULL",
        'last_clock_out' => "DATETIME DEFAULT NULL",
        'morning_in' => "DATETIME DEFAULT NULL",
        'morning_out' => "DATETIME DEFAULT NULL",
        'afternoon_in' => "DATETIME DEFAULT NULL",
        'afternoon_out' => "DATETIME DEFAULT NULL",
        'evening_in' => "DATETIME DEFAULT NULL",
        'evening_out' => "DATETIME DEFAULT NULL",
        'overtime_in' => "DATETIME DEFAULT NULL",
        'overtime_out' => "DATETIME DEFAULT NULL",
        'regular_hours' => "DECIMAL(5,2) DEFAULT 0.00",
        'overtime_hours' => "DECIMAL(5,2) DEFAULT 0.00",
        'total_hours' => "DECIMAL(5,2) DEFAULT 0.00",
        'morning_hours' => "DECIMAL(5,2) DEFAULT 0.00",
        'afternoon_hours' => "DECIMAL(5,2) DEFAULT 0.00",
        'evening_hours' => "DECIMAL(5,2) DEFAULT 0.00",
        'overtime_session_hours' => "DECIMAL(5,2) DEFAULT 0.00",
        'is_incomplete' => "TINYINT(1) DEFAULT 0",
        'has_late_entry' => "TINYINT(1) DEFAULT 0",
        'has_overtime' => "TINYINT(1) DEFAULT 0",
        'has_evening_session' => "TINYINT(1) DEFAULT 0",
        'total_sessions' => "INT DEFAULT 0",
        'completed_sessions' => "INT DEFAULT 0",
        'pending_sessions' => "INT DEFAULT 0",
        'total_minutes_worked' => "INT DEFAULT 0",
        'break_time_minutes' => "INT DEFAULT 0",
        'last_updated' => "TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
        'created_at' => "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
    ];

    ensureTableColumns($pdo, 'daily_attendance_summary', $requiredColumns);
}

/**
 * Ensure all required columns exist in the itemsdb table
 */
function ensureItemsTableColumns($pdo)
{
    $requiredColumns = [
        'item_no' => "INT AUTO_INCREMENT PRIMARY KEY",
        'item_name' => "VARCHAR(255) NOT NULL",
        'brand' => "VARCHAR(150) DEFAULT NULL",
        'item_type' => "VARCHAR(150) DEFAULT NULL",
        'location' => "VARCHAR(150) DEFAULT NULL",
        'barcode' => "VARCHAR(100) DEFAULT NULL",
        'unit_of_measure' => "VARCHAR(50) DEFAULT NULL",
        'moq' => "DECIMAL(10,2) DEFAULT 0.00",
        'in_qty' => "DECIMAL(10,2) DEFAULT 0.00",
        'out_qty' => "DECIMAL(10,2) DEFAULT 0.00",
        'min_stock' => "DECIMAL(10,2) DEFAULT 0.00",
        'price_per_unit' => "DECIMAL(10,2) DEFAULT 0.00",
        'supplier' => "VARCHAR(255) DEFAULT NULL",
        'last_po' => "VARCHAR(50) DEFAULT NULL",
        'created_at' => "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
        'updated_at' => "TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
    ];

    ensureTableColumns($pdo, 'itemsdb', $requiredColumns, ['balance', 'deficit', 'cost', 'item_status']);
}

/**
 * Ensure all required columns exist in the suppliers table
 */
function ensureSuppliersTableColumns($pdo)
{
    $requiredColumns = [
        'id' => "INT AUTO_INCREMENT PRIMARY KEY",
        'name' => "VARCHAR(255) NOT NULL",
        'contact_person' => "VARCHAR(255) NOT NULL",
        'email' => "VARCHAR(255) NOT NULL",
        'phone' => "VARCHAR(20) NOT NULL",
        'address' => "TEXT DEFAULT NULL",
        'city' => "VARCHAR(100) DEFAULT NULL",
        'country' => "VARCHAR(100) DEFAULT 'Philippines'",
        'postal_code' => "VARCHAR(20) DEFAULT NULL",
        'website' => "VARCHAR(255) DEFAULT NULL",
        'tax_id' => "VARCHAR(50) DEFAULT NULL",
        'payment_terms' => "VARCHAR(100) DEFAULT 'Net 30'",
        'notes' => "TEXT DEFAULT NULL",
        'status' => "ENUM('active', 'inactive') DEFAULT 'active'",
        'supplier_snapshot' => "TEXT DEFAULT NULL",
        'created_at' => "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
        'updated_at' => "TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
    ];

    ensureTableColumns($pdo, 'suppliers', $requiredColumns);
}

/**
 * Ensure all required columns exist in the purchase_orders table
 */
function ensurePurchaseOrdersTableColumns($pdo)
{
    $requiredColumns = [
        'id' => "VARCHAR(50) PRIMARY KEY",
        'supplier' => "VARCHAR(255) NOT NULL",
        'supplier_name' => "VARCHAR(255) DEFAULT NULL",
        'supplier_address' => "TEXT DEFAULT NULL",
        'attention_person' => "VARCHAR(255) DEFAULT NULL",
        'status' => "ENUM('requested', 'approved', 'ordered', 'received', 'cancelled') DEFAULT 'requested'",
        'order_date' => "DATE NOT NULL",
        'po_date' => "DATE DEFAULT NULL",
        'expected_delivery_date' => "DATE DEFAULT NULL",
        'actual_delivery_date' => "DATE DEFAULT NULL",
        'total_items' => "INT DEFAULT 0",
        'total_quantity' => "DECIMAL(10,2) DEFAULT 0.00",
        'total_value' => "DECIMAL(10,2) DEFAULT 0.00",
        'notes' => "TEXT DEFAULT NULL",
        'terms' => "TEXT DEFAULT NULL",
        'priority' => "ENUM('P0', 'P1', 'P2', 'P3', 'P4', 'low', 'normal', 'high', 'urgent') DEFAULT 'P2'",
        'prepared_by' => "VARCHAR(255) DEFAULT NULL",
        'verified_by' => "VARCHAR(255) DEFAULT NULL",
        'approved_by' => "VARCHAR(255) DEFAULT NULL",
        'is_overwritten' => "TINYINT(1) DEFAULT 0",
        'overwrite_timestamp' => "TIMESTAMP NULL DEFAULT NULL",
        'previous_version' => "TEXT DEFAULT NULL",
        'created_at' => "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
        'last_updated' => "TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
    ];

    ensureTableColumns($pdo, 'purchase_orders', $requiredColumns);
}

/**
 * Ensure all required columns exist in the purchase_order_items table
 */
function ensurePurchaseOrderItemsTableColumns($pdo)
{
    $requiredColumns = [
        'id' => "INT AUTO_INCREMENT PRIMARY KEY",
        'purchase_order_id' => "VARCHAR(50) NOT NULL",
        'item_no' => "INT NOT NULL",
        'item_name' => "VARCHAR(255) NOT NULL",
        'quantity' => "DECIMAL(10,2) NOT NULL",
        'unit' => "VARCHAR(50) DEFAULT 'pcs'",
        'unit_price' => "DECIMAL(10,2) NOT NULL",
        'amount' => "DECIMAL(10,2) NOT NULL",
        'status' => "ENUM('ordered', 'received', 'cancelled') DEFAULT 'ordered'",
        'custom_quantity' => "DECIMAL(10,2) DEFAULT NULL",
        'recommended_quantity' => "DECIMAL(10,2) DEFAULT NULL",
        'supplier_specific' => "VARCHAR(255) DEFAULT NULL",
        'delivery_method' => "VARCHAR(50) DEFAULT 'delivery'",
        'created_at' => "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
        'updated_at' => "TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
    ];

    ensureTableColumns($pdo, 'purchase_order_items', $requiredColumns);
}

/**
 * Ensure all required columns exist in the announcements table
 */
function ensureAnnouncementsTableColumns($pdo)
{
    $requiredColumns = [
        'id' => "INT AUTO_INCREMENT PRIMARY KEY",
        'title' => "VARCHAR(255) NOT NULL",
        'message' => "TEXT NOT NULL",
        'recipient_type' => "ENUM('all', 'department', 'specific') DEFAULT 'all'",
        'priority' => "ENUM('normal', 'important', 'urgent') DEFAULT 'normal'",
        'status' => "ENUM('active', 'expired', 'draft') DEFAULT 'active'",
        'expiry_date' => "DATE DEFAULT NULL",
        'created_by' => "INT NOT NULL",
        'created_at' => "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
        'updated_at' => "TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
    ];

    ensureTableColumns($pdo, 'announcements', $requiredColumns);
}

/**
 * Ensure all required columns exist in the announcement_recipients table
 */
function ensureAnnouncementRecipientsTableColumns($pdo)
{
    $requiredColumns = [
        'id' => "INT AUTO_INCREMENT PRIMARY KEY",
        'announcement_id' => "INT NOT NULL",
        'recipient_type' => "ENUM('department', 'employee') NOT NULL",
        'department_name' => "VARCHAR(150) DEFAULT NULL",
        'employee_id' => "INT DEFAULT NULL",
        'created_at' => "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
    ];

    ensureTableColumns($pdo, 'announcement_recipients', $requiredColumns);
}

/**
 * Ensure all required columns exist in the announcement_reads table
 */
function ensureAnnouncementReadsTableColumns($pdo)
{
    $requiredColumns = [
        'id' => "INT AUTO_INCREMENT PRIMARY KEY",
        'announcement_id' => "INT NOT NULL",
        'employee_id' => "INT NOT NULL",
        'read_at' => "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
    ];

    ensureTableColumns($pdo, 'announcement_reads', $requiredColumns);
}

/**
 * Ensure all required columns exist in the employee_logs table
 */
function ensureEmployeeLogsTableColumns($pdo)
{
    $requiredColumns = [
        'id' => "INT AUTO_INCREMENT PRIMARY KEY",
        'username' => "VARCHAR(100) DEFAULT NULL",
        'id_number' => "VARCHAR(50) DEFAULT NULL",
        'id_barcode' => "VARCHAR(100) DEFAULT NULL",
        'log_date' => "DATE DEFAULT NULL",
        'log_time' => "TIME DEFAULT NULL",
        'details' => "TEXT DEFAULT NULL",
        'purpose' => "TEXT DEFAULT NULL",
        'item_no' => "VARCHAR(50) DEFAULT NULL",
        'supersedes_original_id' => "INT DEFAULT NULL",
        'status' => "ENUM('ACTIVE', 'SUPERSEDED', 'DELETED') DEFAULT 'ACTIVE'",
        'edited_by_admin_id' => "INT DEFAULT NULL",
        'edited_at' => "TIMESTAMP NULL DEFAULT NULL",
        'created_at' => "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
    ];

    ensureTableColumns($pdo, 'employee_logs', $requiredColumns);
}

/**
 * Ensure all required columns exist in the employee_logs_audit table
 */
function ensureEmployeeLogsAuditTableColumns($pdo)
{
    $requiredColumns = [
        'audit_id' => "INT AUTO_INCREMENT PRIMARY KEY",
        'original_log_id' => "INT NOT NULL",
        'new_log_id' => "INT NOT NULL",
        'old_username' => "VARCHAR(100) DEFAULT NULL",
        'old_id_number' => "VARCHAR(50) DEFAULT NULL",
        'old_id_barcode' => "VARCHAR(100) DEFAULT NULL",
        'old_log_date' => "DATE DEFAULT NULL",
        'old_log_time' => "TIME DEFAULT NULL",
        'old_details' => "TEXT DEFAULT NULL",
        'old_purpose' => "TEXT DEFAULT NULL",
        'old_item_no' => "VARCHAR(50) DEFAULT NULL",
        'new_username' => "VARCHAR(100) DEFAULT NULL",
        'new_id_number' => "VARCHAR(50) DEFAULT NULL",
        'new_id_barcode' => "VARCHAR(100) DEFAULT NULL",
        'new_log_date' => "DATE DEFAULT NULL",
        'new_log_time' => "TIME DEFAULT NULL",
        'new_details' => "TEXT DEFAULT NULL",
        'new_purpose' => "TEXT DEFAULT NULL",
        'new_item_no' => "VARCHAR(50) DEFAULT NULL",
        'item_corrections_json' => "TEXT DEFAULT NULL",
        'edited_by_admin_id' => "INT DEFAULT NULL",
        'edit_reason' => "TEXT DEFAULT NULL",
        'edited_at' => "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
    ];

    ensureTableColumns($pdo, 'employee_logs_audit', $requiredColumns);
}

/**
 * Generic function to ensure table columns exist
 */
function ensureTableColumns($pdo, $tableName, $requiredColumns, $skipColumns = [])
{
    // Get existing columns
    $stmt = $pdo->prepare("
        SELECT COLUMN_NAME 
        FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = ?
    ");
    $stmt->execute([$tableName]);
    $existingColumns = $stmt->fetchAll(PDO::FETCH_COLUMN);

    // Add missing columns
    $columnsAdded = 0;
    foreach ($requiredColumns as $columnName => $columnDefinition) {
        if (in_array($columnName, $skipColumns)) {
            continue; // Skip generated columns
        }

        if (!in_array($columnName, $existingColumns)) {
            try {
                if (
                    strpos($columnDefinition, 'PRIMARY KEY') !== false ||
                    strpos($columnDefinition, 'AUTO_INCREMENT') !== false
                ) {
                    continue; // Skip primary key columns
                }

                $alterSQL = "ALTER TABLE {$tableName} ADD COLUMN {$columnName} {$columnDefinition}";
                $pdo->exec($alterSQL);
                error_log("Added missing column to {$tableName}: {$columnName}");
                $columnsAdded++;
            } catch (PDOException $e) {
                error_log("Error adding column {$columnName} to {$tableName}: " . $e->getMessage());
            }
        }
    }

    if ($columnsAdded > 0) {
        error_log("Added {$columnsAdded} missing column(s) to {$tableName} table");
    }
}

/**
 * Ensure all required indexes exist for emp_list table
 */
function ensureEmployeeIndexes($pdo)
{
    $requiredIndexes = [
        'idx_email' => 'email',
        'idx_department' => 'department',
        'idx_status' => 'status',
        'idx_position' => 'position',
        'idx_hire_date' => 'hire_date',
        'idx_id_number' => 'id_number',
        'idx_username' => 'username',
        'idx_full_name' => 'last_name, first_name',
        'idx_created_at' => 'created_at',
        'idx_dept_status' => 'department, status',
        'idx_hire_status' => 'hire_date, status'
    ];

    ensureIndexes($pdo, 'emp_list', $requiredIndexes);
    ensureFulltextIndex($pdo, 'emp_list', 'ft_search', 'first_name, middle_name, last_name, position, department, email');
}

/**
 * Ensure all required indexes exist for attendance table
 */
function ensureAttendanceIndexes($pdo)
{
    $requiredIndexes = [
        'idx_employee_uid' => 'employee_uid',
        'idx_date' => 'date',
        'idx_clock_type' => 'clock_type',
        'idx_clock_time' => 'clock_time',
        'idx_is_late' => 'is_late',
        'idx_is_synced' => 'is_synced',
        'idx_id_number' => 'id_number',
        'idx_created_at' => 'created_at',
        'idx_employee_date' => 'employee_uid, date',
        'idx_date_clock_type' => 'date, clock_type',
        'idx_employee_date_clock' => 'employee_uid, date, clock_type'
    ];

    ensureIndexes($pdo, 'attendance', $requiredIndexes);
    ensureUniqueConstraint($pdo, 'attendance', 'unique_attendance', 'employee_uid, clock_time, date, clock_type');
}

/**
 * Ensure all required indexes exist for daily_attendance_summary table
 */
function ensureDailySummaryIndexes($pdo)
{
    $requiredIndexes = [
        'idx_employee_uid' => 'employee_uid',
        'idx_date' => 'date',
        'idx_employee_name' => 'employee_name',
        'idx_department' => 'department',
        'idx_id_number' => 'id_number',
        'idx_has_overtime' => 'has_overtime',
        'idx_is_incomplete' => 'is_incomplete',
        'idx_has_late_entry' => 'has_late_entry',
        'idx_last_updated' => 'last_updated',
        'idx_total_hours' => 'total_hours',
        'idx_employee_date' => 'employee_uid, date',
        'idx_date_department' => 'date, department',
        'idx_dept_date' => 'department, date'
    ];

    ensureIndexes($pdo, 'daily_attendance_summary', $requiredIndexes);
    ensureUniqueConstraint($pdo, 'daily_attendance_summary', 'unique_daily_summary', 'employee_uid, date');
}

/**
 * Ensure all required indexes exist for itemsdb table
 */
function ensureItemsIndexes($pdo)
{
    $requiredIndexes = [
        'idx_item_name' => 'item_name',
        'idx_brand' => 'brand',
        'idx_item_type' => 'item_type',
        'idx_location' => 'location',
        'idx_supplier' => 'supplier',
        'idx_item_status' => 'item_status',
        'idx_balance' => 'balance',
        'idx_barcode' => 'barcode',
        'idx_last_po' => 'last_po',
        'idx_created_at' => 'created_at',
        'idx_type_location' => 'item_type, location',
        'idx_supplier_status' => 'supplier, item_status',
        'idx_status_balance' => 'item_status, balance'
    ];

    ensureIndexes($pdo, 'itemsdb', $requiredIndexes);
    ensureFulltextIndex($pdo, 'itemsdb', 'ft_item_search', 'item_name, brand, item_type, supplier');
}

/**
 * Ensure all required indexes exist for suppliers table
 */
function ensureSuppliersIndexes($pdo)
{
    $requiredIndexes = [
        'idx_name' => 'name',
        'idx_email' => 'email',
        'idx_status' => 'status',
        'idx_contact_person' => 'contact_person',
        'idx_city' => 'city',
        'idx_country' => 'country',
        'idx_created_at' => 'created_at'
    ];

    ensureIndexes($pdo, 'suppliers', $requiredIndexes);
    ensureFulltextIndex($pdo, 'suppliers', 'ft_supplier_search', 'name, contact_person, email, city');
}

/**
 * Ensure all required indexes exist for purchase_orders table
 */
function ensurePurchaseOrdersIndexes($pdo)
{
    $requiredIndexes = [
        'idx_supplier' => 'supplier',
        'idx_supplier_name' => 'supplier_name',
        'idx_status' => 'status',
        'idx_order_date' => 'order_date',
        'idx_po_date' => 'po_date',
        'idx_expected_delivery' => 'expected_delivery_date',
        'idx_actual_delivery' => 'actual_delivery_date',
        'idx_priority' => 'priority',
        'idx_created_at' => 'created_at',
        'idx_last_updated' => 'last_updated',
        'idx_supplier_status' => 'supplier, status',
        'idx_status_date' => 'status, order_date',
        'idx_date_supplier' => 'order_date, supplier'
    ];

    ensureIndexes($pdo, 'purchase_orders', $requiredIndexes);
}

/**
 * Ensure all required indexes exist for purchase_order_items table
 */
function ensurePurchaseOrderItemsIndexes($pdo)
{
    $requiredIndexes = [
        'idx_purchase_order_id' => 'purchase_order_id',
        'idx_item_no' => 'item_no',
        'idx_status' => 'status',
        'idx_item_name' => 'item_name',
        'idx_supplier_specific' => 'supplier_specific',
        'idx_po_item' => 'purchase_order_id, item_no',
        'idx_po_status' => 'purchase_order_id, status',
        'idx_created_at' => 'created_at'
    ];

    ensureIndexes($pdo, 'purchase_order_items', $requiredIndexes);
}

/**
 * Ensure all required indexes exist for announcements table
 */
function ensureAnnouncementsIndexes($pdo)
{
    $requiredIndexes = [
        'idx_recipient_type' => 'recipient_type',
        'idx_priority' => 'priority',
        'idx_status' => 'status',
        'idx_expiry_date' => 'expiry_date',
        'idx_created_by' => 'created_by',
        'idx_created_at' => 'created_at',
        'idx_status_priority' => 'status, priority',
        'idx_status_expiry' => 'status, expiry_date',
        'idx_recipient_status' => 'recipient_type, status'
    ];

    ensureIndexes($pdo, 'announcements', $requiredIndexes);
    ensureFulltextIndex($pdo, 'announcements', 'ft_announcement_search', 'title, message');
}

/**
 * Ensure all required indexes exist for announcement_recipients table
 */
function ensureAnnouncementRecipientsIndexes($pdo)
{
    $requiredIndexes = [
        'idx_announcement_id' => 'announcement_id',
        'idx_recipient_type' => 'recipient_type',
        'idx_department_name' => 'department_name',
        'idx_employee_id' => 'employee_id',
        'idx_announcement_recipient' => 'announcement_id, recipient_type',
        'idx_announcement_department' => 'announcement_id, department_name',
        'idx_announcement_employee' => 'announcement_id, employee_id'
    ];

    ensureIndexes($pdo, 'announcement_recipients', $requiredIndexes);
}

/**
 * Ensure all required indexes exist for announcement_reads table
 */
function ensureAnnouncementReadsIndexes($pdo)
{
    $requiredIndexes = [
        'idx_announcement_id' => 'announcement_id',
        'idx_employee_id' => 'employee_id',
        'idx_read_at' => 'read_at',
        'idx_announcement_employee' => 'announcement_id, employee_id'
    ];

    ensureIndexes($pdo, 'announcement_reads', $requiredIndexes);
    ensureUniqueConstraint($pdo, 'announcement_reads', 'unique_announcement_read', 'announcement_id, employee_id');
}

/**
 * Ensure all required indexes exist in the employee_logs table
 */
function ensureEmployeeLogsIndexes($pdo)
{
    $requiredIndexes = [
        'idx_username' => 'username',
        'idx_id_number' => 'id_number',
        'idx_id_barcode' => 'id_barcode',
        'idx_log_date' => 'log_date',
        'idx_log_time' => 'log_time',
        'idx_item_no' => 'item_no',
        'idx_status' => 'status',
        'idx_supersedes' => 'supersedes_original_id',
        'idx_created_at' => 'created_at',
        'idx_username_date' => 'username, log_date',
        'idx_date_time' => 'log_date, log_time',
        'idx_status_date' => 'status, log_date'
    ];

    ensureIndexes($pdo, 'employee_logs', $requiredIndexes);
    ensureFulltextIndex($pdo, 'employee_logs', 'ft_log_search', 'username, details, purpose');
}

/**
 * Ensure all required indexes exist in the employee_logs_audit table
 */
function ensureEmployeeLogsAuditIndexes($pdo)
{
    $requiredIndexes = [
        'idx_original_log_id' => 'original_log_id',
        'idx_new_log_id' => 'new_log_id',
        'idx_edited_by' => 'edited_by_admin_id',
        'idx_edited_at' => 'edited_at',
        'idx_original_new' => 'original_log_id, new_log_id'
    ];

    ensureIndexes($pdo, 'employee_logs_audit', $requiredIndexes);
}

/**
 * Generic function to ensure indexes exist
 */
function ensureIndexes($pdo, $tableName, $requiredIndexes)
{
    // Get existing indexes
    $stmt = $pdo->query("SHOW INDEX FROM {$tableName}");
    $existingIndexes = [];
    while ($row = $stmt->fetch()) {
        $existingIndexes[] = $row['Key_name'];
    }

    // Add missing indexes
    $indexesAdded = 0;
    foreach ($requiredIndexes as $indexName => $columns) {
        if (!in_array($indexName, $existingIndexes)) {
            try {
                $createIndexSQL = "CREATE INDEX {$indexName} ON {$tableName} ({$columns})";
                $pdo->exec($createIndexSQL);
                error_log("Created index on {$tableName}: {$indexName}");
                $indexesAdded++;
            } catch (PDOException $e) {
                error_log("Error creating index {$indexName} on {$tableName}: " . $e->getMessage());
            }
        }
    }

    if ($indexesAdded > 0) {
        error_log("Created {$indexesAdded} missing index(es) on {$tableName} table");
    }
}

/**
 * Ensure fulltext index exists
 */
function ensureFulltextIndex($pdo, $tableName, $indexName, $columns)
{
    // Get existing indexes
    $stmt = $pdo->query("SHOW INDEX FROM {$tableName}");
    $existingIndexes = [];
    while ($row = $stmt->fetch()) {
        $existingIndexes[] = $row['Key_name'];
    }

    if (!in_array($indexName, $existingIndexes)) {
        try {
            $pdo->exec("CREATE FULLTEXT INDEX {$indexName} ON {$tableName} ({$columns})");
            error_log("Created fulltext index on {$tableName}: {$indexName}");
        } catch (PDOException $e) {
            error_log("Error creating fulltext index {$indexName} on {$tableName}: " . $e->getMessage());
        }
    }
}

/**
 * Ensure unique constraint exists
 */
function ensureUniqueConstraint($pdo, $tableName, $constraintName, $columns)
{
    // Get existing indexes
    $stmt = $pdo->query("SHOW INDEX FROM {$tableName}");
    $existingIndexes = [];
    while ($row = $stmt->fetch()) {
        $existingIndexes[] = $row['Key_name'];
    }

    if (!in_array($constraintName, $existingIndexes)) {
        try {
            $pdo->exec("ALTER TABLE {$tableName} ADD UNIQUE KEY {$constraintName} ({$columns})");
            error_log("Created unique constraint on {$tableName}: {$constraintName}");
        } catch (PDOException $e) {
            error_log("Error creating unique constraint {$constraintName} on {$tableName}: " . $e->getMessage());
        }
    }
}

/**
 * Get database statistics for all tables
 */
function getDatabaseStats($pdo)
{
    try {
        $stats = [];

        $tables = [
            'emp_list',
            'attendance',
            'daily_attendance_summary',
            'itemsdb',
            'suppliers',
            'purchase_orders',
            'purchase_order_items',
            'announcements',
            'announcement_recipients',
            'announcement_reads',
            'operations_items',
            'operations_phases',
            'operations_subphases',
            'operations_audit_log'
        ];

        foreach ($tables as $tableName) {
            // Get table size
            $stmt = $pdo->prepare("
                SELECT 
                    ? as table_name,
                    ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2) AS size_mb,
                    TABLE_ROWS as row_count
                FROM information_schema.TABLES
                WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = ?
            ");
            $stmt->execute([$tableName, $tableName]);
            $tableInfo = $stmt->fetch();

            // Get index count
            $stmt = $pdo->prepare("
                SELECT COUNT(*) as index_count 
                FROM information_schema.STATISTICS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = ?
                AND INDEX_NAME != 'PRIMARY'
            ");
            $stmt->execute([$tableName]);
            $indexInfo = $stmt->fetch();

            $stats[$tableName] = [
                'table_size_mb' => $tableInfo['size_mb'] ?? 0,
                'total_rows' => $tableInfo['row_count'] ?? 0,
                'index_count' => $indexInfo['index_count'] ?? 0
            ];
        }

        $stats['schema_version'] = '2.1';
        $stats['last_check'] = date('Y-m-d H:i:s');

        return $stats;
    } catch (PDOException $e) {
        error_log("Error getting database stats: " . $e->getMessage());
        return null;
    }
}

/**
 * Optimize tables and rebuild indexes
 */
function optimizeDatabase($pdo)
{
    try {
        $tables = [
            'emp_list',
            'attendance',
            'daily_attendance_summary',
            'itemsdb',
            'suppliers',
            'purchase_orders',
            'purchase_order_items',
            'announcements',
            'announcement_recipients',
            'announcement_reads',
            'operations_items',
            'operations_phases',
            'operations_subphases',
            'operations_audit_log'
        ];

        foreach ($tables as $tableName) {
            $pdo->exec("ANALYZE TABLE {$tableName}");
            $pdo->exec("OPTIMIZE TABLE {$tableName}");
            error_log("Optimized {$tableName} table");
        }

        error_log("Database optimization completed successfully");
        return true;
    } catch (PDOException $e) {
        error_log("Error optimizing database: " . $e->getMessage());
        return false;
    }
}

/**
 * Ensure all required columns exist in the emp_list table
 */
function ensureEmployeeTableColumns($pdo)
{
    $requiredColumns = [
        'uid' => "INT AUTO_INCREMENT PRIMARY KEY",
        'first_name' => "VARCHAR(100) NOT NULL",
        'middle_name' => "VARCHAR(100) DEFAULT NULL",
        'last_name' => "VARCHAR(100) NOT NULL",
        'age' => "INT DEFAULT NULL",
        'birth_date' => "DATE DEFAULT NULL",
        'contact_number' => "VARCHAR(20) DEFAULT NULL",
        'email' => "VARCHAR(255) NOT NULL",
        'civil_status' => "ENUM('Single', 'Married', 'Divorced', 'Widowed') DEFAULT 'Single'",
        'address' => "TEXT DEFAULT NULL",
        'hire_date' => "DATE NOT NULL DEFAULT (CURRENT_DATE)",
        'position' => "VARCHAR(150) NOT NULL",
        'department' => "VARCHAR(150) NOT NULL",
        'status' => "ENUM('Active', 'Inactive', 'On Leave', 'Terminated') DEFAULT 'Active'",
        'salary' => "VARCHAR(50) DEFAULT NULL",
        'id_number' => "VARCHAR(50) NOT NULL",
        'id_barcode' => "VARCHAR(100) DEFAULT NULL",
        'tin_number' => "VARCHAR(20) DEFAULT NULL",
        'sss_number' => "VARCHAR(20) DEFAULT NULL",
        'pagibig_number' => "VARCHAR(20) DEFAULT NULL",
        'philhealth_number' => "VARCHAR(20) DEFAULT NULL",
        'profile_picture' => "TEXT DEFAULT NULL",
        'face_descriptor' => "TEXT DEFAULT NULL",
        'document' => "TEXT DEFAULT NULL",
        'username' => "VARCHAR(100) NOT NULL",
        'password_hash' => "VARCHAR(255) DEFAULT NULL",
        'access_level' => "ENUM('admin', 'manager', 'user') DEFAULT 'user'",
        'created_at' => "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
        'updated_at' => "TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
    ];

    ensureTableColumns($pdo, 'emp_list', $requiredColumns);
}

/**
 * Clean up orphaned records
 */
function cleanupOrphanedRecords($pdo)
{
    try {
        $deleted = 0;

        // Clean orphaned attendance records
        $count = $pdo->exec("
            DELETE FROM attendance 
            WHERE employee_uid NOT IN (SELECT uid FROM emp_list)
        ");
        $deleted += $count;

        // Clean orphaned daily summaries
        $count = $pdo->exec("
            DELETE FROM daily_attendance_summary 
            WHERE employee_uid NOT IN (SELECT uid FROM emp_list)
        ");
        $deleted += $count;

        // Clean orphaned purchase order items
        $count = $pdo->exec("
            DELETE FROM purchase_order_items 
            WHERE purchase_order_id NOT IN (SELECT id FROM purchase_orders)
        ");
        $deleted += $count;

        // Clean orphaned announcement recipients
        $count = $pdo->exec("
            DELETE FROM announcement_recipients 
            WHERE announcement_id NOT IN (SELECT id FROM announcements)
        ");
        $deleted += $count;

        // Clean orphaned announcement reads
        $count = $pdo->exec("
            DELETE FROM announcement_reads 
            WHERE announcement_id NOT IN (SELECT id FROM announcements)
        ");
        $deleted += $count;

        error_log("Cleaned up {$deleted} orphaned records");
        return ['status' => 'success', 'deleted' => $deleted];
    } catch (PDOException $e) {
        error_log("Error cleaning up orphaned records: " . $e->getMessage());
        return ['status' => 'error', 'message' => $e->getMessage()];
    }
}

/**
 * Clean up orphaned operations records (updated for part_number)
 */
function cleanupOperationsOrphanedRecords($pdo)
{
    try {
        $deleted = 0;

        // Clean orphaned phases
        $count = $pdo->exec("
            DELETE FROM operations_phases 
            WHERE item_part_number NOT IN (SELECT part_number FROM operations_items)
        ");
        $deleted += $count;

        // Clean orphaned subphases
        $count = $pdo->exec("
            DELETE FROM operations_subphases 
            WHERE phase_id NOT IN (SELECT id FROM operations_phases)
        ");
        $deleted += $count;

        // Clean orphaned audit logs
        $count = $pdo->exec("
            DELETE FROM operations_audit_log 
            WHERE item_part_number IS NOT NULL 
            AND item_part_number NOT IN (SELECT part_number FROM operations_items)
        ");
        $deleted += $count;

        error_log("Cleaned up {$deleted} orphaned operations records");
        return ['status' => 'success', 'deleted' => $deleted];
    } catch (PDOException $e) {
        error_log("Error cleaning up orphaned operations records: " . $e->getMessage());
        return ['status' => 'error', 'message' => $e->getMessage()];
    }
}

/**
 * Verify database integrity and foreign key relationships
 */
function verifyDatabaseIntegrity($pdo)
{
    try {
        $issues = [];

        // Check if tables exist first
        $requiredTables = [
            'emp_list',
            'attendance',
            'daily_attendance_summary',
            'itemsdb',
            'suppliers',
            'purchase_orders',
            'purchase_order_items',
            'announcements',
            'announcement_recipients',
            'announcement_reads',
            'employee_logs',
            'employee_logs_audit'
        ];

        foreach ($requiredTables as $table) {
            if (!checkTableExists($pdo, $table)) {
                $issues[] = "Required table '{$table}' does not exist";
            }
        }

        // If tables are missing, return early
        if (!empty($issues)) {
            return ['status' => 'issues_found', 'issues' => $issues];
        }

        // Check attendance foreign keys
        $stmt = $pdo->query("
            SELECT COUNT(*) as orphaned 
            FROM attendance 
            WHERE employee_uid NOT IN (SELECT uid FROM emp_list)
        ");
        $result = $stmt->fetch();
        if ($result['orphaned'] > 0) {
            $issues[] = "Found {$result['orphaned']} orphaned attendance records";
        }

        // Check daily_attendance_summary foreign keys
        $stmt = $pdo->query("
            SELECT COUNT(*) as orphaned 
            FROM daily_attendance_summary 
            WHERE employee_uid NOT IN (SELECT uid FROM emp_list)
        ");
        $result = $stmt->fetch();
        if ($result['orphaned'] > 0) {
            $issues[] = "Found {$result['orphaned']} orphaned daily summary records";
        }

        // Check purchase_order_items foreign keys
        $stmt = $pdo->query("
            SELECT COUNT(*) as orphaned 
            FROM purchase_order_items 
            WHERE purchase_order_id NOT IN (SELECT id FROM purchase_orders)
        ");
        $result = $stmt->fetch();
        if ($result['orphaned'] > 0) {
            $issues[] = "Found {$result['orphaned']} orphaned purchase order items";
        }

        // Check purchase_order_items item references
        $stmt = $pdo->query("
            SELECT COUNT(*) as invalid 
            FROM purchase_order_items 
            WHERE item_no NOT IN (SELECT item_no FROM itemsdb)
        ");
        $result = $stmt->fetch();
        if ($result['invalid'] > 0) {
            $issues[] = "Found {$result['invalid']} purchase order items with invalid item references";
        }

        // Check announcement_recipients foreign keys
        $stmt = $pdo->query("
            SELECT COUNT(*) as orphaned 
            FROM announcement_recipients 
            WHERE announcement_id NOT IN (SELECT id FROM announcements)
        ");
        $result = $stmt->fetch();
        if ($result['orphaned'] > 0) {
            $issues[] = "Found {$result['orphaned']} orphaned announcement recipients";
        }

        // Check announcement_reads foreign keys
        $stmt = $pdo->query("
            SELECT COUNT(*) as orphaned 
            FROM announcement_reads 
            WHERE announcement_id NOT IN (SELECT id FROM announcements)
        ");
        $result = $stmt->fetch();
        if ($result['orphaned'] > 0) {
            $issues[] = "Found {$result['orphaned']} orphaned announcement reads";
        }

        // Check announcement_recipients employee references
        $stmt = $pdo->query("
            SELECT COUNT(*) as orphaned 
            FROM announcement_recipients 
            WHERE employee_id IS NOT NULL 
            AND employee_id NOT IN (SELECT uid FROM emp_list)
        ");
        $result = $stmt->fetch();
        if ($result['orphaned'] > 0) {
            $issues[] = "Found {$result['orphaned']} announcement recipients with invalid employee references";
        }

        // Check announcement_reads employee references
        $stmt = $pdo->query("
            SELECT COUNT(*) as orphaned 
            FROM announcement_reads 
            WHERE employee_id NOT IN (SELECT uid FROM emp_list)
        ");
        $result = $stmt->fetch();
        if ($result['orphaned'] > 0) {
            $issues[] = "Found {$result['orphaned']} announcement reads with invalid employee references";
        }

        // Check announcements creator references
        $stmt = $pdo->query("
            SELECT COUNT(*) as orphaned 
            FROM announcements 
            WHERE created_by NOT IN (SELECT uid FROM emp_list)
        ");
        $result = $stmt->fetch();
        if ($result['orphaned'] > 0) {
            $issues[] = "Found {$result['orphaned']} announcements with invalid creator references";
        }

        if (empty($issues)) {
            error_log("Database integrity check passed - no issues found");
            return ['status' => 'ok', 'issues' => []];
        } else {
            error_log("Database integrity issues found: " . implode(', ', $issues));
            return ['status' => 'issues_found', 'issues' => $issues];
        }
    } catch (PDOException $e) {
        error_log("Error verifying database integrity: " . $e->getMessage());
        return ['status' => 'error', 'message' => $e->getMessage()];
    }
}

/**
 * Export database schema as SQL
 */
function exportDatabaseSchema($pdo, $outputFile = null)
{
    try {
        $tables = [
            'emp_list',
            'attendance',
            'daily_attendance_summary',
            'itemsdb',
            'suppliers',
            'purchase_orders',
            'purchase_order_items',
            'announcements',
            'announcement_recipients',
            'announcement_reads',
            'employee_logs',
            'employee_logs_audit',
            'operations_items',
            'operations_phases',
            'operations_subphases',
            'operations_audit_log'

        ];

        $schema = "-- Database Schema Export\n";
        $schema .= "-- Generated: " . date('Y-m-d H:i:s') . "\n\n";
        $schema .= "SET FOREIGN_KEY_CHECKS=0;\n\n";

        foreach ($tables as $table) {
            $stmt = $pdo->query("SHOW CREATE TABLE {$table}");
            $result = $stmt->fetch();
            $schema .= "-- Table: {$table}\n";
            $schema .= "DROP TABLE IF EXISTS `{$table}`;\n";
            $schema .= $result['Create Table'] . ";\n\n";
        }

        $schema .= "SET FOREIGN_KEY_CHECKS=1;\n";

        if ($outputFile) {
            file_put_contents($outputFile, $schema);
            error_log("Schema exported to {$outputFile}");
        }

        return $schema;
    } catch (PDOException $e) {
        error_log("Error exporting schema: " . $e->getMessage());
        return null;
    }
}

/**
 * Get schema version information
 */
function getSchemaVersion()
{
    return [
        'version' => '2.2',
        'date' => '2025-11-01',
        'tables' => [
            'emp_list',
            'attendance',
            'daily_attendance_summary',
            'itemsdb',
            'suppliers',
            'purchase_orders',
            'purchase_order_items',
            'announcements',
            'announcement_recipients',
            'announcement_reads',
            'employee_logs',
            'employee_logs_audit',
            'operations_items',
            'operations_phases',
            'operations_subphases',
            'operations_audit_log'

        ],
        'features' => [
            'Full-text search indexes',
            'Composite indexes for performance',
            'Foreign key constraints',
            'Generated columns for computed values',
            'Unique constraints for data integrity',
            'Employee activity logging with audit trail',
            'Immutable log pattern with superseded tracking',
            'Auto-sync suppliers from inventory'
        ]
    ];
}

/**
 * Sync suppliers from itemsdb to suppliers table
 * This function extracts unique suppliers from itemsdb and creates/updates supplier records
 */
function syncSuppliersFromItems($pdo)
{
    try {
        // Get all unique suppliers from itemsdb (excluding nulls and empty strings)
        $stmt = $pdo->query("
            SELECT DISTINCT 
                supplier,
                COUNT(*) as item_count,
                SUM(balance) as total_stock,
                SUM(cost) as total_value,
                MAX(updated_at) as last_item_update
            FROM itemsdb 
            WHERE supplier IS NOT NULL 
            AND supplier != '' 
            GROUP BY supplier
            ORDER BY supplier
        ");

        $suppliersFromItems = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (empty($suppliersFromItems)) {
            error_log("No suppliers found in itemsdb to sync");
            return [
                'success' => true,
                'synced' => 0,
                'created' => 0,
                'updated' => 0,
                'message' => 'No suppliers found in inventory'
            ];
        }

        $created = 0;
        $updated = 0;
        $errors = [];

        foreach ($suppliersFromItems as $supplierData) {
            $supplierName = $supplierData['supplier'];

            // Check if supplier already exists
            $checkStmt = $pdo->prepare("SELECT id FROM suppliers WHERE name = ?");
            $checkStmt->execute([$supplierName]);
            $existingSupplier = $checkStmt->fetch(PDO::FETCH_ASSOC);

            if ($existingSupplier) {
                // Update existing supplier with fresh snapshot data
                try {
                    $snapshot = json_encode([
                        'item_count' => (int)$supplierData['item_count'],
                        'total_stock' => (float)$supplierData['total_stock'],
                        'total_value' => (float)$supplierData['total_value'],
                        'last_item_update' => $supplierData['last_item_update'],
                        'synced_at' => date('Y-m-d H:i:s')
                    ], JSON_UNESCAPED_UNICODE);

                    $updateStmt = $pdo->prepare("
                        UPDATE suppliers 
                        SET supplier_snapshot = ?, 
                            updated_at = CURRENT_TIMESTAMP 
                        WHERE id = ?
                    ");
                    $updateStmt->execute([$snapshot, $existingSupplier['id']]);
                    $updated++;
                } catch (PDOException $e) {
                    $errors[] = "Failed to update supplier '{$supplierName}': " . $e->getMessage();
                }
            } else {
                // Create new supplier with default values
                try {
                    $snapshot = json_encode([
                        'item_count' => (int)$supplierData['item_count'],
                        'total_stock' => (float)$supplierData['total_stock'],
                        'total_value' => (float)$supplierData['total_value'],
                        'last_item_update' => $supplierData['last_item_update'],
                        'synced_at' => date('Y-m-d H:i:s'),
                        'auto_created' => true
                    ], JSON_UNESCAPED_UNICODE);

                    $insertStmt = $pdo->prepare("
                        INSERT INTO suppliers (
                            name, 
                            contact_person, 
                            email, 
                            phone, 
                            status, 
                            supplier_snapshot,
                            notes
                        ) VALUES (?, ?, ?, ?, 'active', ?, ?)
                    ");

                    // Generate default contact info
                    $defaultEmail = strtolower(str_replace([' ', '&', ',', '.'], ['_', 'and', '', ''], $supplierName)) . '@supplier.local';
                    $defaultPhone = 'N/A';
                    $defaultContact = 'Contact Person';
                    $defaultNotes = 'Auto-created from inventory. Please update contact information.';

                    $insertStmt->execute([
                        $supplierName,
                        $defaultContact,
                        $defaultEmail,
                        $defaultPhone,
                        $snapshot,
                        $defaultNotes
                    ]);
                    $created++;
                } catch (PDOException $e) {
                    $errors[] = "Failed to create supplier '{$supplierName}': " . $e->getMessage();
                }
            }
        }

        $result = [
            'success' => true,
            'synced' => count($suppliersFromItems),
            'created' => $created,
            'updated' => $updated,
            'message' => "Synced {$created} new and {$updated} existing suppliers from inventory"
        ];

        if (!empty($errors)) {
            $result['errors'] = $errors;
            error_log("Supplier sync completed with errors: " . implode('; ', $errors));
        }

        error_log("Supplier sync completed: {$created} created, {$updated} updated");
        return $result;
    } catch (PDOException $e) {
        error_log("Error syncing suppliers from items: " . $e->getMessage());
        return [
            'success' => false,
            'error' => $e->getMessage(),
            'message' => 'Failed to sync suppliers from inventory'
        ];
    }
}

/**
 * Get supplier statistics from itemsdb
 */
function getSupplierStatistics($pdo, $supplierName = null)
{
    try {
        if ($supplierName) {
            // Get stats for specific supplier
            $stmt = $pdo->prepare("
                SELECT 
                    supplier,
                    COUNT(*) as item_count,
                    SUM(balance) as total_stock,
                    SUM(CASE WHEN item_status = 'In Stock' THEN 1 ELSE 0 END) as in_stock_items,
                    SUM(CASE WHEN item_status = 'Low In Stock' THEN 1 ELSE 0 END) as low_stock_items,
                    SUM(CASE WHEN item_status = 'Out Of Stock' THEN 1 ELSE 0 END) as out_of_stock_items,
                    SUM(cost) as total_value,
                    AVG(price_per_unit) as avg_price,
                    MIN(updated_at) as first_item_added,
                    MAX(updated_at) as last_item_updated
                FROM itemsdb 
                WHERE supplier = ?
                GROUP BY supplier
            ");
            $stmt->execute([$supplierName]);
            return $stmt->fetch(PDO::FETCH_ASSOC);
        } else {
            // Get stats for all suppliers
            $stmt = $pdo->query("
                SELECT 
                    supplier,
                    COUNT(*) as item_count,
                    SUM(balance) as total_stock,
                    SUM(CASE WHEN item_status = 'In Stock' THEN 1 ELSE 0 END) as in_stock_items,
                    SUM(CASE WHEN item_status = 'Low In Stock' THEN 1 ELSE 0 END) as low_stock_items,
                    SUM(CASE WHEN item_status = 'Out Of Stock' THEN 1 ELSE 0 END) as out_of_stock_items,
                    SUM(cost) as total_value,
                    AVG(price_per_unit) as avg_price,
                    MIN(updated_at) as first_item_added,
                    MAX(updated_at) as last_item_updated
                FROM itemsdb 
                WHERE supplier IS NOT NULL 
                AND supplier != ''
                GROUP BY supplier
                ORDER BY total_value DESC
            ");
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        }
    } catch (PDOException $e) {
        error_log("Error getting supplier statistics: " . $e->getMessage());
        return null;
    }
}
