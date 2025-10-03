<?php
// websocket-server.php
require_once __DIR__ . '/vendor/autoload.php';

use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;
use Ratchet\Server\IoServer;
use Ratchet\Http\HttpServer;
use Ratchet\WebSocket\WsServer;

class WebSocketServer implements MessageComponentInterface {
    protected $clients;
    protected $rooms;

    public function __construct() {
        $this->clients = new \SplObjectStorage;
        $this->rooms = [
            'employees' => new \SplObjectStorage,
            'departments' => new \SplObjectStorage,
            'auth' => new \SplObjectStorage,
            'daily-summary' => new \SplObjectStorage,
            'attendance' => new \SplObjectStorage,
        ];
        echo "🔌 WebSocket server initialized\n";
    }

    public function onOpen(ConnectionInterface $conn) {
        $this->clients->attach($conn);
        echo "🔌 Client connected: {$conn->resourceId}\n";
        
        // Send connection confirmation
        $conn->send(json_encode([
            'type' => 'connection',
            'message' => 'Connected successfully',
            'clientId' => $conn->resourceId
        ]));
    }

    public function onMessage(ConnectionInterface $from, $msg) {
        $data = json_decode($msg, true);
        
        if (!$data || !isset($data['type'])) {
            return;
        }

        switch ($data['type']) {
            case 'join-employees':
                $this->joinRoom($from, 'employees');
                echo "👥 Client {$from->resourceId} joined employees room\n";
                break;

            case 'join-departments':
                $this->joinRoom($from, 'departments');
                echo "🏢 Client {$from->resourceId} joined departments room\n";
                break;

            case 'join-auth':
                $this->joinRoom($from, 'auth');
                echo "🔐 Client {$from->resourceId} joined auth room\n";
                break;

            case 'join-daily-summary':
                $this->joinRoom($from, 'daily-summary');
                echo "📊 Client {$from->resourceId} joined daily-summary room\n";
                break;

            case 'join-attendance':
                $this->joinRoom($from, 'attendance');
                echo "⏰ Client {$from->resourceId} joined attendance room\n";
                break;

            case 'ping':
                $from->send(json_encode(['type' => 'pong']));
                break;

            case 'leave-room':
                if (isset($data['room'])) {
                    $this->leaveRoom($from, $data['room']);
                }
                break;

            default:
                echo "❓ Unknown message type: {$data['type']}\n";
        }
    }

    public function onClose(ConnectionInterface $conn) {
        // Remove from all rooms
        foreach ($this->rooms as $roomName => $room) {
            if ($room->contains($conn)) {
                $room->detach($conn);
            }
        }
        
        $this->clients->detach($conn);
        echo "🔌 Client disconnected: {$conn->resourceId}\n";
    }

    public function onError(ConnectionInterface $conn, \Exception $e) {
        echo "❌ Error: {$e->getMessage()}\n";
        $conn->close();
    }

    // Room management
    private function joinRoom(ConnectionInterface $conn, $roomName) {
        if (isset($this->rooms[$roomName])) {
            $this->rooms[$roomName]->attach($conn);
            $conn->send(json_encode([
                'type' => 'room-joined',
                'room' => $roomName
            ]));
        }
    }

    private function leaveRoom(ConnectionInterface $conn, $roomName) {
        if (isset($this->rooms[$roomName]) && $this->rooms[$roomName]->contains($conn)) {
            $this->rooms[$roomName]->detach($conn);
            $conn->send(json_encode([
                'type' => 'room-left',
                'room' => $roomName
            ]));
        }
    }

    // Broadcast to specific room
    public function broadcastToRoom($roomName, $message) {
        if (!isset($this->rooms[$roomName])) {
            return;
        }

        $data = json_encode($message);
        foreach ($this->rooms[$roomName] as $client) {
            $client->send($data);
        }
    }

    // Broadcast to all clients
    public function broadcast($message) {
        $data = json_encode($message);
        foreach ($this->clients as $client) {
            $client->send($data);
        }
    }

    // Event emitters (called from API routes)
    public function emitEmployeeCreated($employee) {
        $this->broadcastToRoom('employees', [
            'type' => 'employee:created',
            'data' => $employee
        ]);
        echo "📡 Emitted employee:created for ID {$employee['id']}\n";
    }

    public function emitEmployeeUpdated($employee) {
        $this->broadcastToRoom('employees', [
            'type' => 'employee:updated',
            'data' => $employee
        ]);
        echo "📡 Emitted employee:updated for ID {$employee['id']}\n";
    }

    public function emitEmployeeDeleted($employeeId) {
        $this->broadcastToRoom('employees', [
            'type' => 'employee:deleted',
            'data' => ['id' => $employeeId]
        ]);
        echo "📡 Emitted employee:deleted for ID {$employeeId}\n";
    }

    public function emitDepartmentCreated($department) {
        $this->broadcastToRoom('departments', [
            'type' => 'department:created',
            'data' => $department
        ]);
        echo "📡 Emitted department:created for ID {$department['id']}\n";
    }

    public function emitDepartmentUpdated($department) {
        $this->broadcastToRoom('departments', [
            'type' => 'department:updated',
            'data' => $department
        ]);
        echo "📡 Emitted department:updated for ID {$department['id']}\n";
    }

    public function emitDepartmentDeleted($departmentId) {
        $this->broadcastToRoom('departments', [
            'type' => 'department:deleted',
            'data' => ['id' => $departmentId]
        ]);
        echo "📡 Emitted department:deleted for ID {$departmentId}\n";
    }

    public function emitAttendanceCreated($data) {
        $this->broadcast([
            'type' => 'attendance_created',
            'data' => $data
        ]);
        echo "📡 Emitted attendance_created event: {$data['id']}\n";
    }

    public function emitAttendanceUpdated($data) {
        $this->broadcast([
            'type' => 'attendance_updated',
            'data' => $data
        ]);
        echo "📡 Emitted attendance_updated event: {$data['id']}\n";
    }

    public function emitAttendanceDeleted($data) {
        $this->broadcast([
            'type' => 'attendance_deleted',
            'data' => $data
        ]);
        echo "📡 Emitted attendance_deleted event: {$data['id']}\n";
    }

    public function emitAttendanceSynced($data) {
        $this->broadcast([
            'type' => 'attendance_synced',
            'data' => $data
        ]);
        echo "📡 Emitted attendance_synced event: {$data['synced_count']}\n";
    }

    public function emitDailySummarySynced($data) {
        $message = [
            'type' => 'daily_summary_synced',
            'data' => [
                'success' => true,
                'synced_count' => $data['synced_count'] ?? $data['processed_count'] ?? 0,
                'timestamp' => date('c')
            ]
        ];
        
        $this->broadcastToRoom('daily-summary', $message);
        $this->broadcast($message);
        echo "📡 Emitted daily_summary_synced event: " . ($data['synced_count'] ?? $data['processed_count'] ?? 0) . "\n";
    }

    public function emitDailySummaryDeleted($data) {
        $message = [
            'type' => 'daily_summary_deleted',
            'data' => $data
        ];
        
        $this->broadcastToRoom('daily-summary', $message);
        $this->broadcast($message);
        echo "📡 Emitted daily_summary_deleted event: {$data['id']}\n";
    }

    public function emitDailySummaryRebuilt($data) {
        $message = [
            'type' => 'daily_summary_rebuilt',
            'data' => [
                'success' => true,
                'processed_count' => $data['processed_count'] ?? 0,
                'success_count' => $data['success_count'] ?? 0,
                'fail_count' => $data['fail_count'] ?? 0,
                'timestamp' => date('c')
            ]
        ];
        
        $this->broadcastToRoom('daily-summary', $message);
        $this->broadcast($message);
        echo "📡 Emitted daily_summary_rebuilt event: {$data['processed_count']}\n";
    }

    public function emitDailySummaryCreated($data) {
        $message = [
            'type' => 'daily_summary_created',
            'data' => $data
        ];
        
        $this->broadcastToRoom('daily-summary', $message);
        $this->broadcast($message);
        echo "📡 Emitted daily_summary_created event: {$data['id']}\n";
    }

    public function emitDailySummaryUpdated($data) {
        $message = [
            'type' => 'daily_summary_updated',
            'data' => $data
        ];
        
        $this->broadcastToRoom('daily-summary', $message);
        $this->broadcast($message);
        echo "📡 Emitted daily_summary_updated event: {$data['id']}\n";
    }

    public function emitUserLoggedIn($user) {
        $this->broadcastToRoom('auth', [
            'type' => 'user:logged-in',
            'data' => [
                'id' => $user['id'],
                'username' => $user['username'],
                'role' => $user['role'],
                'timestamp' => date('c')
            ]
        ]);
        echo "📡 Emitted user:logged-in for {$user['username']}\n";
    }

    public function emitDataChanged($table, $action, $data) {
        $this->broadcast([
            'type' => 'data:changed',
            'data' => [
                'table' => $table,
                'action' => $action,
                'data' => $data,
                'timestamp' => date('c')
            ]
        ]);
        echo "📡 Emitted data:changed for table {$table}, action {$action}\n";
    }
}

// Start the WebSocket server
$port = 8080;
echo "🚀 Starting WebSocket server on port {$port}...\n";

$server = IoServer::factory(
    new HttpServer(
        new WsServer(
            new WebSocketServer()
        )
    ),
    $port
);

echo "✅ WebSocket server running on ws://localhost:{$port}\n";
echo "Press Ctrl+C to stop\n\n";

$server->run();
?>