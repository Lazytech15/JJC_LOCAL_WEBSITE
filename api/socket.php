<?php
// socket.php - Real-time event system for shared hosting (GoDaddy compatible)
// FIXED: Removed duplicate event emissions

// Load configuration files
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/config/headers.php';

class SocketEvents {
    private static $instance = null;
    private $eventsFile;
    private $lockFile;
    
    private function __construct() {
        // Store events in a temporary file
        $this->eventsFile = __DIR__ . '/temp/socket_events.json';
        $this->lockFile = __DIR__ . '/temp/socket_events.lock';
        
        // Create temp directory if it doesn't exist
        if (!file_exists(__DIR__ . '/temp')) {
            mkdir(__DIR__ . '/temp', 0755, true);
        }
        
        // Initialize events file if it doesn't exist
        if (!file_exists($this->eventsFile)) {
            file_put_contents($this->eventsFile, json_encode([]));
        }
    }
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    /**
     * Add an event to the queue
     */
    private function addEvent($event, $data, $room = null) {
        // Acquire lock
        $lock = fopen($this->lockFile, 'w');
        flock($lock, LOCK_EX);
        
        try {
            // Read existing events
            $events = json_decode(file_get_contents($this->eventsFile), true) ?: [];
            
            // Add new event
            $events[] = [
                'id' => uniqid('evt_', true),
                'event' => $event,
                'data' => $data,
                'room' => $room,
                'timestamp' => microtime(true),
                'created_at' => date('c')
            ];
            
            // Keep only last 100 events to prevent file from growing too large
            if (count($events) > 100) {
                $events = array_slice($events, -100);
            }
            
            // Save events
            file_put_contents($this->eventsFile, json_encode($events));
            
            // Log the event
            error_log("ðŸ“¡ Socket Event: {$event}" . ($room ? " (room: {$room})" : ""));
        } finally {
            // Release lock
            flock($lock, LOCK_UN);
            fclose($lock);
        }
    }
    
    /**
     * Get events newer than a given timestamp
     */
    public function getEvents($since = 0, $room = null) {
        if (!file_exists($this->eventsFile)) {
            return [];
        }
        
        $events = json_decode(file_get_contents($this->eventsFile), true) ?: [];
        
        // Filter events
        $filtered = array_filter($events, function($event) use ($since, $room) {
            $isNewer = $event['timestamp'] > $since;
            $isInRoom = $room === null || $event['room'] === null || $event['room'] === $room;
            return $isNewer && $isInRoom;
        });
        
        return array_values($filtered);
    }
    
    /**
     * Clear old events (cleanup)
     */
    public function clearOldEvents($olderThanSeconds = 300) {
        $lock = fopen($this->lockFile, 'w');
        flock($lock, LOCK_EX);
        
        try {
            $events = json_decode(file_get_contents($this->eventsFile), true) ?: [];
            $cutoff = microtime(true) - $olderThanSeconds;
            
            $filtered = array_filter($events, function($event) use ($cutoff) {
                return $event['timestamp'] > $cutoff;
            });
            
            file_put_contents($this->eventsFile, json_encode(array_values($filtered)));
        } finally {
            flock($lock, LOCK_UN);
            fclose($lock);
        }
    }
    
    // Employee events
    public function employeeCreated($employee) {
        $this->addEvent('employee:created', $employee, 'employees');
        error_log("ðŸ“¡ Emitted employee:created for ID {$employee['id']}");
    }
    
    public function employeeUpdated($employee) {
        $this->addEvent('employee:updated', $employee, 'employees');
        error_log("ðŸ“¡ Emitted employee:updated for ID {$employee['id']}");
    }
    
    public function employeeDeleted($employeeId) {
        $this->addEvent('employee:deleted', ['id' => $employeeId], 'employees');
        error_log("ðŸ“¡ Emitted employee:deleted for ID {$employeeId}");
    }
    
    // Department events
    public function departmentCreated($department) {
        $this->addEvent('department:created', $department, 'departments');
        error_log("ðŸ“¡ Emitted department:created for ID {$department['id']}");
    }
    
    public function departmentUpdated($department) {
        $this->addEvent('department:updated', $department, 'departments');
        error_log("ðŸ“¡ Emitted department:updated for ID {$department['id']}");
    }
    
    public function departmentDeleted($departmentId) {
        $this->addEvent('department:deleted', ['id' => $departmentId], 'departments');
        error_log("ðŸ“¡ Emitted department:deleted for ID {$departmentId}");
    }
    
    // Auth events
    public function userLoggedIn($user) {
        $this->addEvent('user:logged-in', [
            'id' => $user['id'],
            'username' => $user['username'],
            'role' => $user['role'],
            'timestamp' => date('c')
        ], 'auth');
        error_log("ðŸ“¡ Emitted user:logged-in for {$user['username']}");
    }
    
    // Generic data change event
    public function dataChanged($table, $action, $data) {
        $this->addEvent('data:changed', [
            'table' => $table,
            'action' => $action,
            'data' => $data,
            'timestamp' => date('c')
        ]);
        error_log("ðŸ“¡ Emitted data:changed for table {$table}, action {$action}");
    }
    
    // ========================================================================
    // ATTENDANCE EVENTS - Fixed to emit globally (no room)
    // ========================================================================
    
    // ✅ CORRECTED: Single definition with both events
        public function attendanceCreated($data) {
            $this->addEvent('attendance_created', $data);
            $this->addEvent('attendance_update', $data); // Also emit for immediate refresh
            error_log("📡 Emitted attendance_created + attendance_update events");
        }
        
        public function attendanceUpdated($data) {
            $this->addEvent('attendance_updated', $data);
            $this->addEvent('attendance_update', $data); // Also emit for immediate refresh
            error_log("📡 Emitted attendance_updated + attendance_update events");
        }
        
        public function attendanceDeleted($data) {
            $this->addEvent('attendance_deleted', $data);
            error_log("📡 Emitted attendance_deleted event: " . json_encode($data));
        }
        
        public function attendanceSynced($data) {
            $payload = [
                'success' => true,
                'synced_count' => $data['synced_count'] ?? $data['processed_count'] ?? 0,
                'timestamp' => date('c')
            ];
            $this->addEvent('attendance_synced', $payload);
            error_log("📡 Emitted attendance_synced event: {$payload['synced_count']} records");
        }
        
        // ✅ NEW: Standalone method for attendance_update
        public function attendanceUpdate($data) {
            $this->addEvent('attendance_update', $data);
            error_log("📡 Emitted attendance_update event: " . json_encode($data));
        }
    
    // ========================================================================
    // ATTENDANCE EDIT EVENTS
    // ========================================================================
    public function attendanceEditCreated($data) {
        $this->addEvent('attendance_edit_created', $data); // Global
        error_log("📡 Emitted attendance_edit_created event: " . json_encode($data));
    }
    
    public function attendanceEditUpdated($data) {
        $this->addEvent('attendance_edit_updated', $data); // Global
        error_log("📡 Emitted attendance_edit_updated event: " . json_encode($data));
    }
    
    public function attendanceEditDeleted($data) {
        $this->addEvent('attendance_edit_deleted', $data); // Global
        error_log("📡 Emitted attendance_edit_deleted event: " . json_encode($data));
    }
    
    public function attendanceBatchEdited($data) {
        $this->addEvent('attendance_batch_edited', $data); // Global
        error_log("📡 Emitted attendance_batch_edited event: " . json_encode($data));
    }

    public function attendanceBatchUploaded($data) {
        $this->addEvent('attendance_batch_uploaded', $data); // Global
        error_log("📡 Emitted attendance_batch_uploaded event: " . json_encode($data));
    }
    
    // ========================================================================
    // DAILY SUMMARY EVENTS - Fixed to emit ONCE globally (no duplicates!)
    // ========================================================================
    public function dailySummarySynced($data) {
        $payload = [
            'success' => true,
            'synced_count' => $data['synced_count'] ?? $data['processed_count'] ?? 0,
            'timestamp' => date('c')
        ];
        // FIXED: Only emit once globally, not twice!
        $this->addEvent('daily_summary_synced', $payload);
        error_log("ðŸ“¡ Emitted daily_summary_synced event: {$payload['synced_count']} records");
    }
    
    public function dailySummaryDeleted($data) {
        // FIXED: Only emit once globally
        $this->addEvent('daily_summary_deleted', $data);
        error_log("ðŸ“¡ Emitted daily_summary_deleted event: " . json_encode($data));
    }
    
    public function dailySummaryRebuilt($data) {
        $payload = [
            'success' => true,
            'processed_count' => $data['processed_count'] ?? 0,
            'success_count' => $data['success_count'] ?? 0,
            'fail_count' => $data['fail_count'] ?? 0,
            'timestamp' => date('c')
        ];
        // FIXED: Only emit once globally
        $this->addEvent('daily_summary_rebuilt', $payload);
        error_log("ðŸ“¡ Emitted daily_summary_rebuilt event: {$payload['processed_count']} records");
    }
    
    public function dailySummaryCreated($data) {
        // FIXED: Only emit once globally
        $this->addEvent('daily_summary_created', $data);
        error_log("ðŸ“¡ Emitted daily_summary_created event: " . json_encode($data));
    }
    
    public function dailySummaryUpdated($data) {
        // FIXED: Only emit once globally
        $this->addEvent('daily_summary_updated', $data);
        error_log("ðŸ“¡ Emitted daily_summary_updated event: " . json_encode($data));
    }
    
    // ========================================================================
    // STOCK MANAGEMENT EVENTS - Real-time inventory synchronization
    // ========================================================================
    
    public function stockUpdated($itemData) {
        $this->addEvent('stock_updated', [
            'item_no' => $itemData['item_no'],
            'item_name' => $itemData['item_name'],
            'previous_balance' => $itemData['previous_balance'] ?? null,
            'new_balance' => $itemData['balance'],
            'change_type' => $itemData['change_type'] ?? 'manual',
            'reason' => $itemData['reason'] ?? null,
            'updated_by' => $itemData['updated_by'] ?? null,
            'timestamp' => date('c')
        ]);
        error_log("📦 Emitted stock_updated event for item {$itemData['item_no']}: {$itemData['previous_balance']} → {$itemData['balance']}");
    }
    
    public function stockInserted($itemData) {
        $this->addEvent('stock_inserted', [
            'item_no' => $itemData['item_no'],
            'item_name' => $itemData['item_name'],
            'quantity_added' => $itemData['quantity_added'],
            'previous_balance' => $itemData['previous_balance'],
            'new_balance' => $itemData['new_balance'],
            'reason' => $itemData['reason'] ?? null,
            'timestamp' => date('c')
        ]);
        error_log("📦 Emitted stock_inserted event for item {$itemData['item_no']}: +{$itemData['quantity_added']} units");
    }
    
    public function stockRemoved($itemData) {
        $this->addEvent('stock_removed', [
            'item_no' => $itemData['item_no'],
            'item_name' => $itemData['item_name'],
            'quantity_removed' => $itemData['quantity_removed'],
            'previous_balance' => $itemData['previous_balance'],
            'new_balance' => $itemData['new_balance'],
            'reason' => $itemData['reason'] ?? null,
            'removed_by' => $itemData['removed_by'] ?? null,
            'timestamp' => date('c')
        ]);
        error_log("📦 Emitted stock_removed event for item {$itemData['item_no']}: -{$itemData['quantity_removed']} units");
    }
    
    public function checkoutCompleted($checkoutData) {
        $this->addEvent('checkout_completed', [
            'checkout_id' => $checkoutData['checkout_id'] ?? uniqid('checkout_', true),
            'items' => $checkoutData['items'],
            'checkout_by' => $checkoutData['checkout_by'],
            'purpose' => $checkoutData['purpose'] ?? null,
            'timestamp' => date('c')
        ]);
        error_log("🛒 Emitted checkout_completed event with " . count($checkoutData['items']) . " items");
    }
    
    // ========================================================================
    // ITEM CRUD EVENTS - Real-time item management
    // ========================================================================
    
    public function itemCreated($itemData) {
        $this->addEvent('item_created', [
            'item_no' => $itemData['item_no'],
            'item_name' => $itemData['item_name'],
            'brand' => $itemData['brand'] ?? null,
            'item_type' => $itemData['item_type'] ?? null,
            'balance' => $itemData['balance'],
            'timestamp' => date('c')
        ]);
        error_log("📦 Emitted item_created event for item {$itemData['item_no']}: {$itemData['item_name']}");
    }
    
    public function itemUpdated($itemData) {
        $this->addEvent('item_updated', [
            'item_no' => $itemData['item_no'],
            'item_name' => $itemData['item_name'],
            'brand' => $itemData['brand'] ?? null,
            'item_type' => $itemData['item_type'] ?? null,
            'balance' => $itemData['balance'],
            'timestamp' => date('c')
        ]);
        error_log("📦 Emitted item_updated event for item {$itemData['item_no']}: {$itemData['item_name']}");
    }
    
    public function itemDeleted($itemData) {
        $this->addEvent('item_deleted', [
            'item_no' => $itemData['item_no'],
            'item_name' => $itemData['item_name'] ?? null,
            'timestamp' => date('c')
        ]);
        error_log("📦 Emitted item_deleted event for item {$itemData['item_no']}");
    }
    
    // ========================================================================
    // EMPLOYEE LOG EVENTS - Real-time transaction logging
    // ========================================================================
    
    public function employeeLogCreated($logData) {
        $this->addEvent('employee_log_created', [
            'id' => $logData['id'],
            'username' => $logData['username'] ?? null,
            'details' => $logData['details'] ?? null,
            'log_date' => $logData['log_date'],
            'log_time' => $logData['log_time'],
            'purpose' => $logData['purpose'] ?? null,
            'timestamp' => date('c')
        ]);
        error_log("📝 Emitted employee_log_created event for log ID {$logData['id']}");
    }
    
    // ========================================================================
    // PROCUREMENT EVENTS - Real-time purchase order management
    // ========================================================================
    
    public function poCreated($poData) {
        $this->addEvent('po_created', [
            'id' => $poData['id'],
            'po_number' => $poData['po_number'],
            'supplier' => $poData['supplier'],
            'status' => $poData['status'],
            'total_amount' => $poData['total_amount'] ?? null,
            'order_date' => $poData['order_date'],
            'timestamp' => date('c')
        ]);
        error_log("📋 Emitted po_created event for PO {$poData['po_number']}");
    }
    
    public function poUpdated($poData) {
        $this->addEvent('po_updated', [
            'id' => $poData['id'],
            'po_number' => $poData['po_number'],
            'supplier' => $poData['supplier'],
            'status' => $poData['status'],
            'total_amount' => $poData['total_amount'] ?? null,
            'timestamp' => date('c')
        ]);
        error_log("📋 Emitted po_updated event for PO {$poData['po_number']}");
    }
    
    public function poDeleted($poData) {
        $this->addEvent('po_deleted', [
            'id' => $poData['id'],
            'po_number' => $poData['po_number'],
            'timestamp' => date('c')
        ]);
        error_log("📋 Emitted po_deleted event for PO {$poData['po_number']}");
    }
    
    public function poStatusChanged($poData) {
        $this->addEvent('po_status_changed', [
            'id' => $poData['id'],
            'po_number' => $poData['po_number'],
            'old_status' => $poData['old_status'],
            'new_status' => $poData['new_status'],
            'changed_by' => $poData['changed_by'] ?? null,
            'timestamp' => date('c')
        ]);
        error_log("📋 Emitted po_status_changed event for PO {$poData['po_number']}: {$poData['old_status']} → {$poData['new_status']}");
    }
    
    public function poApproved($poData) {
        $this->addEvent('po_approved', [
            'id' => $poData['id'],
            'po_number' => $poData['po_number'],
            'approved_by' => $poData['approved_by'] ?? null,
            'timestamp' => date('c')
        ]);
        error_log("✅ Emitted po_approved event for PO {$poData['po_number']}");
    }
    
    public function poRejected($poData) {
        $this->addEvent('po_rejected', [
            'id' => $poData['id'],
            'po_number' => $poData['po_number'],
            'rejected_by' => $poData['rejected_by'] ?? null,
            'reason' => $poData['reason'] ?? null,
            'timestamp' => date('c')
        ]);
        error_log("❌ Emitted po_rejected event for PO {$poData['po_number']}");
    }
    
        public function poReceived($poData) {
        $this->addEvent('po_received', [
            'id' => $poData['id'],
            'po_number' => $poData['po_number'],
            'received_by' => $poData['received_by'] ?? null,
            'received_date' => $poData['received_date'] ?? date('Y-m-d'),
            'timestamp' => date('c')
        ]);
        error_log("📦 Emitted po_received event for PO {$poData['po_number']}");
    }
    
    // ========================================================================
    // OPERATIONS EVENTS - ADD AFTER PROCUREMENT, BEFORE CLASS CLOSING BRACE
    // ========================================================================
    
    public function operationsItemCreated($data) {
        $this->addEvent('operations:item_created', [
            'part_number' => $data['part_number'],
            'name' => $data['name'],
            'client_name' => $data['client_name'] ?? null,
            'priority' => $data['priority'] ?? 'Medium',
            'qty' => $data['qty'] ?? 1,
            'timestamp' => date('c')
        ]);
        error_log("⚙️ Emitted operations:item_created for {$data['part_number']}");
    }

    public function operationsItemUpdated($data) {
        $this->addEvent('operations:item_updated', [
            'part_number' => $data['part_number'],
            'updated_fields' => $data['updated_fields'] ?? [],
            'timestamp' => date('c')
        ]);
        error_log("⚙️ Emitted operations:item_updated for {$data['part_number']}");
    }

    public function operationsItemDeleted($data) {
        $this->addEvent('operations:item_deleted', [
            'part_number' => $data['part_number'],
            'timestamp' => date('c')
        ]);
        error_log("⚙️ Emitted operations:item_deleted for {$data['part_number']}");
    }

    public function operationsPhaseStarted($data) {
        $this->addEvent('operations:phase_started', [
            'part_number' => $data['part_number'],
            'phase_id' => $data['phase_id'],
            'start_time' => $data['start_time'] ?? date('Y-m-d H:i:s'),
            'timestamp' => date('c')
        ]);
        error_log("▶️ Emitted operations:phase_started for phase {$data['phase_id']}");
    }

    public function operationsPhaseStopped($data) {
        $this->addEvent('operations:phase_stopped', [
            'part_number' => $data['part_number'],
            'phase_id' => $data['phase_id'],
            'end_time' => $data['end_time'] ?? date('Y-m-d H:i:s'),
            'timestamp' => date('c')
        ]);
        error_log("⏹️ Emitted operations:phase_stopped for phase {$data['phase_id']}");
    }

    public function operationsPhasePaused($data) {
        $this->addEvent('operations:phase_paused', [
            'part_number' => $data['part_number'],
            'phase_id' => $data['phase_id'],
            'pause_time' => $data['pause_time'] ?? date('Y-m-d H:i:s'),
            'timestamp' => date('c')
        ]);
        error_log("⏸️ Emitted operations:phase_paused for phase {$data['phase_id']}");
    }

    public function operationsPhaseResumed($data) {
        $this->addEvent('operations:phase_resumed', [
            'part_number' => $data['part_number'],
            'phase_id' => $data['phase_id'],
            'resumed_at' => $data['resumed_at'] ?? date('Y-m-d H:i:s'),
            'paused_duration' => $data['paused_duration'] ?? 0,
            'timestamp' => date('c')
        ]);
        error_log("▶️ Emitted operations:phase_resumed for phase {$data['phase_id']}");
    }

    public function operationsSubphaseCompleted($data) {
        $this->addEvent('operations:subphase_completed', [
            'part_number' => $data['part_number'],
            'phase_id' => $data['phase_id'],
            'subphase_id' => $data['subphase_id'],
            'completed' => $data['completed'] ?? true,
            'time_duration' => $data['time_duration'] ?? 0,
            'timestamp' => date('c')
        ]);
        error_log("✅ Emitted operations:subphase_completed for subphase {$data['subphase_id']}");
    }

    public function operationsEmployeeAssigned($data) {
        $this->addEvent('operations:employee_assigned', [
            'part_number' => $data['part_number'],
            'phase_id' => $data['phase_id'],
            'subphase_id' => $data['subphase_id'],
            'employee_barcode' => $data['employee_barcode'],
            'employee_name' => $data['employee_name'],
            'employee_uid' => $data['employee_uid'],
            'timestamp' => date('c')
        ]);
        error_log("👤 Emitted operations:employee_assigned: {$data['employee_name']} → subphase {$data['subphase_id']}");
    }

    public function operationsGoogleSheetsImport($data) {
        $this->addEvent('operations:google_sheets_import', [
            'part_number' => $data['part_number'],
            'base_part_number' => $data['base_part_number'],
            'name' => $data['name'],
            'client_name' => $data['client_name'],
            'qty' => $data['qty'],
            'template_used' => $data['template_used'] ?? false,
            'phases_created' => $data['phases_created'] ?? 0,
            'subphases_created' => $data['subphases_created'] ?? 0,
            'timestamp' => date('c')
        ]);
        error_log("📊 Emitted operations:google_sheets_import for {$data['part_number']}");
    }

}

// Global function to get socket events instance
function getSocketEvents() {
    return SocketEvents::getInstance();
}

// SSE endpoint handler - call this from a route
function handleSSE($room = null) {
    header('Content-Type: text/event-stream');
    header('Cache-Control: no-cache');
    header('Connection: keep-alive');
    header('X-Accel-Buffering: no'); // Disable nginx buffering
    
    // Get last event timestamp from client
    $lastEventId = isset($_SERVER['HTTP_LAST_EVENT_ID']) ? floatval($_SERVER['HTTP_LAST_EVENT_ID']) : 0;
    
    $socketEvents = getSocketEvents();
    
    // Clean up old events
    $socketEvents->clearOldEvents(300);
    
    // Get new events
    $events = $socketEvents->getEvents($lastEventId, $room);
    
    foreach ($events as $event) {
        echo "id: {$event['timestamp']}\n";
        echo "event: {$event['event']}\n";
        echo "data: " . json_encode($event['data']) . "\n\n";
        flush();
    }
    
    // Send a comment to keep connection alive
    if (empty($events)) {
        echo ": heartbeat\n\n";
        flush();
    }
    
    exit;
}

// Polling endpoint handler - simpler alternative to SSE
function handlePolling($room = null) {
    $lastTimestamp = isset($_GET['since']) ? floatval($_GET['since']) : 0;
    
    $socketEvents = getSocketEvents();
    $socketEvents->clearOldEvents(300);
    
    $events = $socketEvents->getEvents($lastTimestamp, $room);
    
    header('Content-Type: application/json');
    echo json_encode([
        'success' => true,
        'events' => $events,
        'timestamp' => microtime(true)
    ]);
    exit;
}
?>