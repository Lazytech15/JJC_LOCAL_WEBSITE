<?php
// index.php - Main API router (Updated with Operations)
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Ensure PHP timezone is set to Philippines (Manila)
date_default_timezone_set('Asia/Manila');

// Load configuration files
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/config/headers.php';

// Set API headers
setApiHeaders();

// Log the request
logRequest();

// Parse the request URI
$requestUri = $_SERVER['REQUEST_URI'];
$scriptName = dirname($_SERVER['SCRIPT_NAME']);

// Remove the script directory from the URI
$path = str_replace($scriptName, '', $requestUri);
$path = trim($path, '/');

// Remove query string
$path = strtok($path, '?');

// Split path into segments
$segments = explode('/', $path);

// Get the module (e.g., 'auth', 'employees', 'departments')
$module = $segments[0] ?? null;
$endpoint = $segments[1] ?? null;

// Route to appropriate module
try {
    switch ($module) {
        case 'auth':
            require_once __DIR__ . '/routes/auth.php';
            break;
            
        case 'validation':
            require_once __DIR__ . '/routes/validation.php';
            break;
            
        case 'employees':
            require_once __DIR__ . '/routes/employees.php';
            break;
            
        case 'departments':
            require_once __DIR__ . '/routes/departments.php';
            break;
            
        case 'attendance':
            require_once __DIR__ . '/routes/attendance.php';
            break;
            
        case 'daily-summary':
            require_once __DIR__ . '/routes/daily-summary.php';
            break;
            
        case 'profile':
            require_once __DIR__ . '/routes/profile.php';
            break;
            
        case 'document':
            require_once __DIR__ . '/routes/document.php';
            break;
            
        case 'items':
            require_once __DIR__ . '/routes/item.php';
            break;
            
        case 'employee-logs':
            require_once __DIR__ . '/routes/employee-logs.php';
            break;
            
        case 'events':
            require_once __DIR__ . '/routes/events.php';
            break;
        
        case 'attendanceEdit':
            require_once __DIR__ . '/routes/attendance-edits.php';
            break;
            
        case 'announcements':
            require_once __DIR__ . '/routes/announcement.php';
            break;
            
        case 'operations':
            require_once __DIR__ . '/routes/operation.php';
            break;
            
        case 'test':
            require_once __DIR__ . '/routes/test.php';
            break;
            
        case 'health':
            // Health check endpoint
            sendSuccessResponse([
                'status' => 'OK',
                'timestamp' => date('c'),
                'timezone' => date_default_timezone_get(),
                'current_time' => date('Y-m-d H:i:s'),
                'environment' => getenv('ENV') ?: 'production',
                'database' => 'connected'
            ]);
            break;
            
        default:
            sendErrorResponse('API endpoint not found', 404, [
                'path' => $path,
                'module' => $module,
                'availableModules' => [
                    'auth', 'validation', 'employees', 'departments', 
                    'attendance', 'daily-summary', 'profile', 'documents', 
                    'items', 'employee-logs', 'events', 'attendanceEdit',
                    'announcements', 'operations', 'test', 'health'
                ]
            ]);
    }
} catch (Exception $e) {
    error_log("API Error: " . $e->getMessage());
    sendErrorResponse('Internal server error', 500, [
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
}
?>