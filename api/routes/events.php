<?php
// routes/events.php - Real-time events polling endpoint
require_once __DIR__ . '/../config/headers.php';
require_once __DIR__ . '/../socket.php';

// Set API headers (including CORS) - MUST be called before any output
setApiHeaders();

$method = $_SERVER['REQUEST_METHOD'];

// GET /events/poll - Long polling for events
// GET /events/poll?room=employees - Poll for specific room
// GET /events/poll?since=1234567890.1234 - Get events since timestamp
if ($method === 'GET' && $endpoint === 'poll') {
    $room = $_GET['room'] ?? null;
    handlePolling($room);
    exit;
}

// GET /events/stream - Server-Sent Events (SSE)
// GET /events/stream?room=employees - Stream for specific room
if ($method === 'GET' && $endpoint === 'stream') {
    $room = $_GET['room'] ?? null;
    handleSSE($room);
    exit;
}

// GET /events/status - Check events system status
if ($method === 'GET' && $endpoint === 'status') {
    sendSuccessResponse([
        'status' => 'active',
        'method' => 'polling',
        'endpoints' => [
            'poll' => '/events/poll',
            'stream' => '/events/stream'
        ],
        'rooms' => ['employees', 'departments', 'auth', 'daily-summary']
    ]);
    exit;
}

sendErrorResponse('Invalid events endpoint', 404);
?>