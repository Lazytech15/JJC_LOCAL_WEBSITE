<?php 
// config/database.php - Database Connection 
 
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
    $host = 'localhost'; 
    $dbName = 'jjcdatabase'; 
    $username = 'jjc'; 
    $password = 'sbcPEXi5QYHxGV9'; 
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
        
        // FIX: Set MySQL timezone to Philippines/Asia Manila (UTC+8)
        $pdo->exec("SET time_zone = '+08:00'");
         
        return $pdo; 
         
    } catch (PDOException $e) { 
        error_log("Database connection failed: " . $e->getMessage()); 
        sendErrorResponse('Database connection failed', 500, [ 
            'message' => $e->getMessage() 
        ]); 
    } 
} 
?>