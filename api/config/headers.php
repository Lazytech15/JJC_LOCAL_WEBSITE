<?php
// config/headers.php - Reusable headers configuration with CORS support and URL whitelist

// Define allowed origins (domains that can access your API)
$allowedOrigins = [
    'http://localhost:5173',           // Local development
    'http://localhost:3000',           // Alternative local port
    'http://127.0.0.1:5173',          // Localhost IP
    'https://yourdomain.com',          // Production domain
    'https://www.yourdomain.com',      // Production with www
    'http://qxw.2ee.mytemp.website',   // Your current development domain
];

function setApiHeaders() {
    global $allowedOrigins;
    
    // Set JSON content type
    header('Content-Type: application/json');
    
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    
    // Check if origin is in whitelist
    if (!empty($origin) && in_array($origin, $allowedOrigins)) {
        header("Access-Control-Allow-Origin: $origin");
        header('Access-Control-Allow-Credentials: true');
        error_log("CORS header set for origin: $origin");
    } elseif (!empty($origin)) {
        // Log unauthorized origin attempt
        error_log("CORS request from unauthorized origin: $origin");
        // Optionally: don't set CORS header for unauthorized origins
        // Or set it anyway for development: header("Access-Control-Allow-Origin: $origin");
    } else {
        // Fallback if no origin header (for direct server requests)
        header('Access-Control-Allow-Origin: *');
        error_log("CORS header set to * (no origin provided)");
    }
    
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH');
    
    // Add X-Download and other custom headers to allowed list
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Download, X-File-Download, Accept');
    
    header('Access-Control-Max-Age: 86400');
    
    // Security headers
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: SAMEORIGIN');
    header('X-XSS-Protection: 1; mode=block');
    
    // Handle preflight OPTIONS request
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        error_log("OPTIONS request handled - CORS preflight approved");
        http_response_code(200);
        exit();
    }
}

function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data, JSON_PRETTY_PRINT);
    exit();
}

function sendErrorResponse($message, $statusCode = 500, $details = []) {
    $response = [
        'success' => false,
        'error' => $message
    ];
    
    if (!empty($details)) {
        $response['details'] = $details;
    }
    
    sendJsonResponse($response, $statusCode);
}

function sendSuccessResponse($data, $message = null) {
    $response = [
        'success' => true
    ];
    
    if ($message !== null) {
        $response['message'] = $message;
    }
    
    if (is_array($data)) {
        $response = array_merge($response, $data);
    } else {
        $response['data'] = $data;
    }
    
    sendJsonResponse($response, 200);
}

function logRequest() {
    $logMessage = sprintf(
        "%s - %s %s\n",
        date('Y-m-d H:i:s'),
        $_SERVER['REQUEST_METHOD'],
        $_SERVER['REQUEST_URI']
    );
    
    error_log($logMessage);
}
?>