<?php
// config/database.php - Database Connection

// Include timezone configuration FIRST
require_once __DIR__ . '/timezone.php';

// Import schema manager
require_once __DIR__ . '/schema.php';

/**
 * Get database connection instance
 * Returns a PDO connection object
 */
function getConnection() {
    static $pdo = null;
    
    // Return existing connection if available
    if ($pdo !== null) {
        return $pdo;
    }
    
    // Database credentials
    $host = '127.0.0.1';
    $dbName = 'jjcdatabase';
    $username = 'jjc_1999';
    $password = 'w@iOX[rNYBZR';
    $charset = 'utf8mb4';
    
    try {
        $dsn = "mysql:host={$host};dbname={$dbName};charset={$charset}";
        
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::ATTR_PERSISTENT => false
        ];
        
        $pdo = new PDO($dsn, $username, $password, $options);
        
        // Set MySQL specific optimizations
        $pdo->exec("SET SESSION sql_mode = 'TRADITIONAL'");
        $pdo->exec("SET NAMES {$charset}");
        
        // Set database timezone to Philippines
        setDatabaseTimezone($pdo);
        
        // Initialize database schema (auto-create tables and indexes)
        initializeDatabase($pdo);
        
        return $pdo;
        
    } catch (PDOException $e) {
        error_log("Database connection failed: " . $e->getMessage());
        sendErrorResponse('Database connection failed', 500, [
            'message' => $e->getMessage()
        ]);
    }
}
?>