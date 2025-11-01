<?php
// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Set header to return JSON
header('Content-Type: application/json');

// Database configuration
$host = 'localhost'; // Usually 'localhost' on GoDaddy
$dbname = 'jjcdatabase'; // Replace with your database name
$username = 'jjc'; // Replace with your database username
$password = 'sbcPEXi5QYHxGV9'; // Replace with your database password

// Initialize response array
$response = [
    'success' => false,
    'message' => '',
    'details' => []
];

try {
    // Create PDO connection
    $dsn = "mysql:host=$host;dbname=$dbname;charset=utf8mb4";
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ];
    
    $pdo = new PDO($dsn, $username, $password, $options);
    
    // If connection successful
    $response['success'] = true;
    $response['message'] = 'Database connection successful!';
    
    // Get server information
    $response['details']['server_info'] = $pdo->getAttribute(PDO::ATTR_SERVER_INFO);
    $response['details']['server_version'] = $pdo->getAttribute(PDO::ATTR_SERVER_VERSION);
    $response['details']['connection_status'] = $pdo->getAttribute(PDO::ATTR_CONNECTION_STATUS);
    $response['details']['database_name'] = $dbname;
    
    // Test query - get current timestamp
    $stmt = $pdo->query('SELECT NOW() as server_time');
    $result = $stmt->fetch();
    $response['details']['current_server_time'] = $result['server_time'];
    
    // Get list of tables (optional)
    $stmt = $pdo->query('SHOW TABLES');
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    $response['details']['tables_count'] = count($tables);
    $response['details']['tables'] = $tables;
    
} catch (PDOException $e) {
    $response['success'] = false;
    $response['message'] = 'Database connection failed!';
    $response['details']['error'] = $e->getMessage();
    $response['details']['error_code'] = $e->getCode();
}

// Output JSON response
echo json_encode($response, JSON_PRETTY_PRINT);
?>