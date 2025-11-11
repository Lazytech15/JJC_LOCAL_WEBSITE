<?php
// routes/validation.php - Employee Validation Routes

// Get database connection
$pdo = getConnection();

// Get request method
$method = $_SERVER['REQUEST_METHOD'];

// Handle different HTTP methods
switch ($method) {
    case 'GET':
        if ($endpoint === 'health') {
            handleHealthCheck();
        } elseif ($endpoint === 'employees') {
            validateEmployee($pdo);
        } else {
            sendErrorResponse('Invalid validation endpoint', 404);
        }
        break;
        
    default:
        sendErrorResponse('Method not allowed', 405);
}

/**
 * Health check endpoint
 */
function handleHealthCheck() {
    try {
        $pdo = getConnection();
        
        sendSuccessResponse([
            'status' => 'healthy',
            'database' => $pdo ? 'connected' : 'disconnected',
            'timestamp' => date('c'),
            'environment' => getenv('ENV') ?: 'production',
            'phpVersion' => PHP_VERSION,
            'processInfo' => [
                'pid' => getmypid(),
                'cwd' => getcwd(),
                'user' => get_current_user()
            ]
        ]);
    } catch (Exception $e) {
        sendErrorResponse('Health check failed', 500, ['message' => $e->getMessage()]);
    }
}

/**
 * Validate employee fields for uniqueness
 */
function validateEmployee($pdo) {
    try {
        error_log("=== VALIDATION ENDPOINT START ===");
        error_log("Raw query params: " . json_encode($_GET));

        // Get query parameters
        $email = $_GET['email'] ?? null;
        $username = $_GET['username'] ?? null;
        $idNumber = $_GET['idNumber'] ?? $_GET['employeeId'] ?? null;
        $idBarcode = $_GET['idBarcode'] ?? null;
        $excludeId = $_GET['excludeId'] ?? null;
        $philhealthNumber = $_GET['philhealthNumber'] ?? null;
        $tinNumber = $_GET['tinNumber'] ?? null;
        $sssNumber = $_GET['sssNumber'] ?? null;
        $pagibigNumber = $_GET['pagibigNumber'] ?? null;
        $contactNumber = $_GET['contactNumber'] ?? null;

        error_log("Validation request received: " . json_encode([
            'email' => $email,
            'username' => $username,
            'idNumber' => $idNumber,
            'idBarcode' => $idBarcode,
            'philhealthNumber' => $philhealthNumber,
            'tinNumber' => $tinNumber,
            'sssNumber' => $sssNumber,
            'pagibigNumber' => $pagibigNumber,
            'contactNumber' => $contactNumber,
            'excludeId' => $excludeId
        ]));

        // Validate that at least one field is provided
        if (!$email && !$username && !$idNumber && !$idBarcode && 
            !$philhealthNumber && !$tinNumber && !$sssNumber && 
            !$pagibigNumber && !$contactNumber) {
            error_log("No validation fields provided");
            sendErrorResponse('At least one field must be provided for validation', 400);
            return;
        }

        $validationResults = [];

        // Check email uniqueness with format validation
        if ($email && trim($email)) {
            $trimmedEmail = trim($email);
            
            // Validate email format
            if (!filter_var($trimmedEmail, FILTER_VALIDATE_EMAIL)) {
                $validationResults['emailAvailable'] = false;
                error_log("Email format validation failed: {$trimmedEmail}");
            } else {
                $validationResults['emailAvailable'] = checkFieldUniqueness(
                    $pdo, 'email', $trimmedEmail, 'Email', $excludeId
                );
            }
        }

        // Check username uniqueness
        if ($username && trim($username)) {
            $validationResults['usernameAvailable'] = checkFieldUniqueness(
                $pdo, 'username', trim($username), 'Username', $excludeId
            );
        }

        // Check ID number uniqueness
        if ($idNumber && trim($idNumber)) {
            $isAvailable = checkFieldUniqueness(
                $pdo, 'id_number', trim($idNumber), 'ID Number', $excludeId
            );
            $validationResults['idNumberAvailable'] = $isAvailable;
            // For backward compatibility
            $validationResults['employeeIdAvailable'] = $isAvailable;
        }

        // Check other fields
        $fieldsToCheck = [
            ['param' => $idBarcode, 'field' => 'idBarcodeAvailable', 'column' => 'id_barcode', 'name' => 'ID Barcode'],
            ['param' => $philhealthNumber, 'field' => 'philhealthNumberAvailable', 'column' => 'philhealth_number', 'name' => 'PhilHealth Number'],
            ['param' => $tinNumber, 'field' => 'tinNumberAvailable', 'column' => 'tin_number', 'name' => 'TIN Number'],
            ['param' => $sssNumber, 'field' => 'sssNumberAvailable', 'column' => 'sss_number', 'name' => 'SSS Number'],
            ['param' => $pagibigNumber, 'field' => 'pagibigNumberAvailable', 'column' => 'pagibig_number', 'name' => 'Pag-IBIG Number'],
            ['param' => $contactNumber, 'field' => 'contactNumberAvailable', 'column' => 'contact_number', 'name' => 'Contact Number']
        ];

        foreach ($fieldsToCheck as $fieldInfo) {
            if ($fieldInfo['param'] && trim($fieldInfo['param'])) {
                $validationResults[$fieldInfo['field']] = checkFieldUniqueness(
                    $pdo, 
                    $fieldInfo['column'], 
                    trim($fieldInfo['param']), 
                    $fieldInfo['name'], 
                    $excludeId
                );
            }
        }

        error_log("Final validation results: " . json_encode($validationResults));
        error_log("=== VALIDATION ENDPOINT END ===");

        sendSuccessResponse([
            'data' => $validationResults
        ]);

    } catch (PDOException $e) {
        error_log("Validation error: " . $e->getMessage());
        sendErrorResponse('Validation failed', 500, [
            'message' => $e->getMessage()
        ]);
    }
}

/**
 * Check if a field value is unique in the database
 * 
 * @param PDO $pdo Database connection
 * @param string $columnName Database column name
 * @param string $value Value to check
 * @param string $displayName Human-readable field name
 * @param int|null $excludeId Employee ID to exclude from check
 * @return bool True if available (unique), false if already exists
 */
function checkFieldUniqueness($pdo, $columnName, $value, $displayName, $excludeId = null) {
    try {
        $trimmedValue = trim($value);

        // Build query with proper parameterization
        $query = "SELECT uid FROM emp_list 
                  WHERE LOWER(TRIM(COALESCE({$columnName}, ''))) = LOWER(TRIM(?)) 
                  AND COALESCE({$columnName}, '') != ''";
        
        $params = [$trimmedValue];

        // Add exclusion condition if excludeId is provided
        if ($excludeId && is_numeric($excludeId)) {
            $query .= " AND uid != ?";
            $params[] = (int)$excludeId;
        }

        error_log("Executing {$displayName} query: " . json_encode([
            'query' => $query,
            'params' => $params,
            'trimmedValue' => $trimmedValue
        ]));

        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $result = $stmt->fetch();

        $isAvailable = !$result;

        error_log("{$displayName} validation result: " . json_encode([
            'value' => $trimmedValue,
            'available' => $isAvailable,
            'foundRecord' => $result ? $result['uid'] : null
        ]));

        return $isAvailable;

    } catch (PDOException $e) {
        error_log("Database error checking {$displayName}: " . json_encode([
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString(),
            'query' => "{$columnName} validation",
            'value' => $value
        ]));
        
        throw new Exception("Database error while checking {$displayName}: " . $e->getMessage());
    }
}
?>