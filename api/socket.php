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