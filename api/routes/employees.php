<?php
// routes/employees.php - Employee Management Routes

// Get database connection

$pdo = getConnection();

// Debug logging
error_log("Full URI: " . $_SERVER['REQUEST_URI']);
error_log("Segments: " . print_r($segments, true));
error_log("EmployeeId variable: " . ($employeeId ?? 'NULL'));

// Get request method and parse input
$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true);

$employeeId = $segments[1] ?? null;  // Changed from $segments[2] to $segments[1]
$action = $segments[2] ?? null;       // Changed from $segments[3] to $segments[2]

// Handle different HTTP methods and routes
switch ($method) {
    case 'GET':
    if (($segments[1] ?? null) === 'validate') {
        // Validate employee data
        validateEmployee($pdo);
    } elseif ($employeeId) {
        // Get single employee by ID
        getEmployeeById($pdo, $employeeId);
    } else {
        // Get all employees with filtering and pagination
        getAllEmployees($pdo);
    }
    break;
        
    case 'POST':
        // Create new employee
        createEmployee($pdo, $input);
        break;
        
    
        
    case 'PUT':
    if ($employeeId) {
        // Debug logging
        error_log("PUT request for employee ID: {$employeeId}, action: " . ($action ?? 'none'));
        
        // Check if this is a password update request
        if ($action === 'password') {
            // Update employee password
            updateEmployeePassword($pdo, $employeeId, $input);
        } else {
            // Update employee by ID
            updateEmployee($pdo, $employeeId, $input);
        }
    } else {
        sendErrorResponse('Employee ID is required for update', 400);
    }
    break;
        
    case 'PATCH':
        if ($employeeId && $action === 'status') {
            // Update employee status
            updateEmployeeStatus($pdo, $employeeId, $input);
        } else {
            sendErrorResponse('Invalid endpoint for PATCH request', 400);
        }
        break;
        
    case 'DELETE':
        if ($employeeId === 'bulk') {
            // Bulk delete employees
            bulkDeleteEmployees($pdo, $input);
        } elseif ($employeeId) {
            // Delete single employee
            deleteEmployee($pdo, $employeeId);
        } else {
            sendErrorResponse('Employee ID is required for deletion', 400);
        }
        break;
        
    default:
        sendErrorResponse('Method not allowed', 405);
}

/**
 * Update employee password
 */
function updateEmployeePassword($pdo, $id, $input) {
    try {
        // Check if employee exists
        $stmt = $pdo->prepare("SELECT uid, first_name, last_name, username FROM emp_list WHERE uid = ?");
        $stmt->execute([$id]);
        $employee = $stmt->fetch();
        
        if (!$employee) {
            sendErrorResponse('Employee not found', 404);
            return;
        }
        
        // Extract and validate password
        $newPassword = $input['newPassword'] ?? null;
        
        if (!$newPassword) {
            sendErrorResponse('New password is required', 400);
            return;
        }
        
        if (strlen($newPassword) < 8) {
            sendErrorResponse('Password must be at least 8 characters long', 400);
            return;
        }
        
        // Hash the password
        $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
        
        // Update password
        $stmt = $pdo->prepare("UPDATE emp_list SET password_hash = ?, updated_at = NOW() WHERE uid = ?");
        $stmt->execute([$hashedPassword, $id]);
        
        if ($stmt->rowCount() === 0) {
            sendErrorResponse('Failed to update password', 500);
            return;
        }
        
        $responseData = [
            'id' => (int)$employee['uid'],
            'name' => "{$employee['first_name']} {$employee['last_name']}",
            'username' => $employee['username']
        ];
        
        error_log("Successfully updated password for employee: {$employee['first_name']} {$employee['last_name']} (ID: {$id})");
        
        sendSuccessResponse($responseData, "Password updated successfully for {$employee['first_name']} {$employee['last_name']}");
        
    } catch (PDOException $e) {
        error_log("Error updating employee password: " . $e->getMessage());
        sendErrorResponse('Failed to update password', 500, ['message' => $e->getMessage()]);
    }
}

/**
 * Validate employee data
 */
function validateEmployee($pdo) {
    try {
        // Get validation parameters
        $email = $_GET['email'] ?? null;
        $username = $_GET['username'] ?? null;
        $idNumber = $_GET['idNumber'] ?? null;
        $idBarcode = $_GET['idBarcode'] ?? null;
        $employeeId = $_GET['employeeId'] ?? null; // For update - exclude this ID from checks
        
        $validationResults = [
            'emailAvailable' => true,
            'usernameAvailable' => true,
            'employeeIdAvailable' => true,
            'idBarcodeAvailable' => true
        ];
        
        // Validate email if provided
        if ($email) {
            // Check email format
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $validationResults['emailAvailable'] = false;
            } else {
                // Check if email exists
                if ($employeeId) {
                    $stmt = $pdo->prepare("SELECT uid FROM emp_list WHERE LOWER(email) = LOWER(?) AND uid != ?");
                    $stmt->execute([$email, $employeeId]);
                } else {
                    $stmt = $pdo->prepare("SELECT uid FROM emp_list WHERE LOWER(email) = LOWER(?)");
                    $stmt->execute([$email]);
                }
                
                if ($stmt->fetch()) {
                    $validationResults['emailAvailable'] = false;
                }
            }
        }
        
        // Validate username if provided
        if ($username) {
            if ($employeeId) {
                $stmt = $pdo->prepare("SELECT uid FROM emp_list WHERE LOWER(username) = LOWER(?) AND uid != ?");
                $stmt->execute([$username, $employeeId]);
            } else {
                $stmt = $pdo->prepare("SELECT uid FROM emp_list WHERE LOWER(username) = LOWER(?)");
                $stmt->execute([$username]);
            }
            
            if ($stmt->fetch()) {
                $validationResults['usernameAvailable'] = false;
            }
        }
        
        // Validate ID number if provided
        if ($idNumber) {
            if ($employeeId) {
                $stmt = $pdo->prepare("SELECT uid FROM emp_list WHERE id_number = ? AND uid != ?");
                $stmt->execute([$idNumber, $employeeId]);
            } else {
                $stmt = $pdo->prepare("SELECT uid FROM emp_list WHERE id_number = ?");
                $stmt->execute([$idNumber]);
            }
            
            if ($stmt->fetch()) {
                $validationResults['employeeIdAvailable'] = false;
            }
        }
        
        // Validate ID barcode if provided
        if ($idBarcode) {
            if ($employeeId) {
                $stmt = $pdo->prepare("SELECT uid FROM emp_list WHERE id_barcode = ? AND uid != ?");
                $stmt->execute([$idBarcode, $employeeId]);
            } else {
                $stmt = $pdo->prepare("SELECT uid FROM emp_list WHERE id_barcode = ?");
                $stmt->execute([$idBarcode]);
            }
            
            if ($stmt->fetch()) {
                $validationResults['idBarcodeAvailable'] = false;
            }
        }
        
        sendSuccessResponse($validationResults);
        
    } catch (PDOException $e) {
        error_log("Error validating employee: " . $e->getMessage());
        sendErrorResponse('Failed to validate employee data', 500, ['message' => $e->getMessage()]);
    }
}

/**
 * Get all departments with employee counts
 */
 
function getDepartments($pdo) {
    try {
        // Get departments with employee counts from database
        $stmt = $pdo->query("
            SELECT 
                COALESCE(department, 'Unassigned') as name,
                COUNT(*) as employee_count,
                COUNT(CASE WHEN status = 'Active' THEN 1 END) as active_count
            FROM emp_list 
            WHERE department IS NOT NULL AND department != ''
            GROUP BY department 
            ORDER BY employee_count DESC
        ");
        
        $departments = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Predefined departments that might not have employees yet
        $predefinedDepts = [
            'Human Resources',
            'Engineering',
            'Finance',
            'Marketing',
            'Information Technology',
            'Operations',
            'Procurement'
        ];
        
        // Get existing department names
        $existingDeptNames = array_column($departments, 'name');
        
        // Add predefined departments with zero counts if they don't exist
        foreach ($predefinedDepts as $dept) {
            if (!in_array($dept, $existingDeptNames)) {
                $departments[] = [
                    'name' => $dept,
                    'employee_count' => 0,
                    'active_count' => 0
                ];
            }
        }
        
        // Format the response
        $formattedDepartments = array_map(function($dept) {
            return [
                'name' => $dept['name'],
                'employeeCount' => (int)$dept['employee_count'],
                'activeCount' => (int)$dept['active_count']
            ];
        }, $departments);
        
        sendSuccessResponse($formattedDepartments);
        
    } catch (PDOException $e) {
        error_log("Error fetching departments: " . $e->getMessage());
        sendErrorResponse('Failed to fetch departments', 500, ['message' => $e->getMessage()]);
    }
}


/**
 * Get all employees with filtering and pagination
 */
function getAllEmployees($pdo) {
    try {
        // Get query parameters with defaults
        $limit = min(max(1, (int)($_GET['limit'] ?? 100)), 1000);
        $offset = max(0, (int)($_GET['offset'] ?? 0));
        $search = $_GET['search'] ?? '';
        $department = $_GET['department'] ?? '';
        $status = $_GET['status'] ?? 'Active';
        $sortBy = $_GET['sortBy'] ?? 'hire_date';
        $sortOrder = strtoupper($_GET['sortOrder'] ?? 'DESC');
        
        // Validate sort parameters
        $allowedSortFields = ['last_name', 'first_name', 'hire_date', 'position', 'salary', 'age'];
        $validSortBy = in_array($sortBy, $allowedSortFields) ? $sortBy : 'hire_date';
        $validSortOrder = in_array($sortOrder, ['ASC', 'DESC']) ? $sortOrder : 'DESC';
        
        // Build WHERE clause
        $whereConditions = [];
        $params = [];
        
        // Search functionality
        if (!empty($search)) {
            $whereConditions[] = "(
                LOWER(CONCAT(first_name, ' ', COALESCE(middle_name, ''), ' ', last_name)) LIKE LOWER(?) OR
                LOWER(position) LIKE LOWER(?) OR
                LOWER(department) LIKE LOWER(?) OR
                LOWER(email) LIKE LOWER(?)
            )";
            $searchTerm = "%{$search}%";
            $params[] = $searchTerm;
            $params[] = $searchTerm;
            $params[] = $searchTerm;
            $params[] = $searchTerm;
        }
        
        // Filter by department
        if (!empty($department)) {
            $whereConditions[] = "LOWER(department) = LOWER(?)";
            $params[] = $department;
        }
        
        // Filter by status
        if (!empty($status)) {
            $whereConditions[] = "LOWER(status) = LOWER(?)";
            $params[] = $status;
        }
        
        $whereClause = !empty($whereConditions) ? "WHERE " . implode(" AND ", $whereConditions) : "";
        
        // Main query to fetch employee data
        $employeeQuery = "
            SELECT 
                uid as id,
                CONCAT(first_name, ' ', COALESCE(CONCAT(middle_name, ' '), ''), last_name) as full_name,
                first_name,
                middle_name,
                last_name,
                age,
                birth_date,
                contact_number,
                email,
                civil_status,
                address,
                hire_date,
                position,
                department,
                id_number,
                id_barcode,
                tin_number,
                sss_number,
                pagibig_number,
                philhealth_number,
                status,
                salary,
                profile_picture,
                face_descriptor,
                document,
                created_at,
                CASE 
                    WHEN hire_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 
                    ELSE 0 
                END as is_new_hire
            FROM emp_list
            {$whereClause}
            ORDER BY {$validSortBy} {$validSortOrder}
            LIMIT ? OFFSET ?
        ";
        
        $stmt = $pdo->prepare($employeeQuery);
        $stmt->execute([...$params, $limit, $offset]);
        $employees = $stmt->fetchAll();
        
        // Get total count for pagination
        $countQuery = "SELECT COUNT(*) as total FROM emp_list {$whereClause}";
        $stmt = $pdo->prepare($countQuery);
        $stmt->execute($params);
        $totalResult = $stmt->fetch();
        
        // Get departments with count
        $departmentsQuery = "
            SELECT 
                department as name,
                COUNT(*) as totalCount
            FROM emp_list
            WHERE department IS NOT NULL AND department != ''
            GROUP BY department
            ORDER BY department
        ";
        $stmt = $pdo->query($departmentsQuery);
        $departments = $stmt->fetchAll();
        
        // Get statistics
        $statsQuery = "
            SELECT 
                COUNT(*) as total_employees,
                SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) as active_employees,
                SUM(CASE WHEN status = 'Inactive' THEN 1 ELSE 0 END) as inactive_employees,
                SUM(CASE WHEN hire_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as new_hires_last_30_days,
                SUM(CASE WHEN department IS NULL OR department = '' THEN 1 ELSE 0 END) as employees_without_department,
                AVG(CASE WHEN salary IS NOT NULL AND salary != '' 
                    THEN CAST(REPLACE(REPLACE(salary, '₱', ''), ',', '') AS DECIMAL(10,2)) 
                    END) as average_salary,
                COUNT(DISTINCT department) as total_departments
            FROM emp_list
            {$whereClause}
        ";
        $stmt = $pdo->prepare($statsQuery);
        $stmt->execute($params);
        $stats = $stmt->fetch();
        
        // Format the response
        $formattedEmployees = array_map(function($emp) {
            return [
                'id' => (int)$emp['id'],
                'fullName' => $emp['full_name'],
                'firstName' => $emp['first_name'],
                'middleName' => $emp['middle_name'],
                'lastName' => $emp['last_name'],
                'age' => $emp['age'] ? (int)$emp['age'] : null,
                'birthDate' => $emp['birth_date'],
                'contactNumber' => $emp['contact_number'],
                'email' => $emp['email'],
                'civilStatus' => $emp['civil_status'],
                'address' => $emp['address'],
                'hireDate' => $emp['hire_date'],
                'position' => $emp['position'],
                'department' => $emp['department'],
                'idNumber' => $emp['id_number'],
                'idBarcode' => $emp['id_barcode'],
                'tinNumber' => $emp['tin_number'],
                'sssNumber' => $emp['sss_number'],
                'pagibigNumber' => $emp['pagibig_number'],
                'philhealthNumber' => $emp['philhealth_number'],
                'status' => $emp['status'],
                'salary' => $emp['salary'],
                'profilePicture' => $emp['profile_picture'],
                'faceDescriptor' => $emp['face_descriptor'],
                'document' => $emp['document'],
                'createdAt' => $emp['created_at'],
                'isNewHire' => (bool)$emp['is_new_hire']
            ];
        }, $employees);
        
        sendSuccessResponse([
            'employees' => $formattedEmployees,
            'departments' => $departments,
            'pagination' => [
                'total' => (int)$totalResult['total'],
                'limit' => $limit,
                'offset' => $offset,
                'pages' => ceil($totalResult['total'] / $limit),
                'currentPage' => floor($offset / $limit) + 1
            ],
            'statistics' => [
                'totalEmployees' => (int)$stats['total_employees'],
                'activeEmployees' => (int)$stats['active_employees'],
                'inactiveEmployees' => (int)$stats['inactive_employees'],
                'newHiresLast30Days' => (int)$stats['new_hires_last_30_days'],
                'employeesWithoutDepartment' => (int)$stats['employees_without_department'],
                'averageSalary' => $stats['average_salary'] 
                    ? '₱' . number_format($stats['average_salary'], 2) 
                    : null,
                'totalDepartments' => (int)$stats['total_departments']
            ]
        ]);
        
    } catch (PDOException $e) {
        error_log("Error fetching employees: " . $e->getMessage());
        sendErrorResponse('Failed to fetch employees', 500, ['message' => $e->getMessage()]);
    }
}

/**
 * Get single employee by ID
 */
function getEmployeeById($pdo, $id) {
    try {
        $stmt = $pdo->prepare("
            SELECT 
                uid as id,
                CONCAT(first_name, ' ', COALESCE(CONCAT(middle_name, ' '), ''), last_name) as full_name,
                first_name,
                middle_name,
                last_name,
                age,
                birth_date,
                contact_number,
                email,
                civil_status,
                address,
                hire_date,
                position,
                department,
                id_number,
                id_barcode,
                tin_number,
                sss_number,
                pagibig_number,
                philhealth_number,
                status,
                salary,
                profile_picture,
                face_descriptor,
                document,
                created_at
            FROM emp_list
            WHERE uid = ?
        ");
        
        $stmt->execute([$id]);
        $employee = $stmt->fetch();
        
        if (!$employee) {
            sendErrorResponse('Employee not found', 404);
            return;
        }
        
        $formattedEmployee = [
            'id' => (int)$employee['id'],
            'fullName' => $employee['full_name'],
            'firstName' => $employee['first_name'],
            'middleName' => $employee['middle_name'],
            'lastName' => $employee['last_name'],
            'age' => $employee['age'] ? (int)$employee['age'] : null,
            'birthDate' => $employee['birth_date'],
            'contactNumber' => $employee['contact_number'],
            'email' => $employee['email'],
            'civilStatus' => $employee['civil_status'],
            'address' => $employee['address'],
            'hireDate' => $employee['hire_date'],
            'position' => $employee['position'],
            'department' => $employee['department'],
            'idNumber' => $employee['id_number'],
            'idBarcode' => $employee['id_barcode'],
            'tinNumber' => $employee['tin_number'],
            'sssNumber' => $employee['sss_number'],
            'pagibigNumber' => $employee['pagibig_number'],
            'philhealthNumber' => $employee['philhealth_number'],
            'status' => $employee['status'],
            'salary' => $employee['salary'],
            'profilePicture' => $employee['profile_picture'],
            'faceDescriptor' => $employee['face_descriptor'],
            'document' => $employee['document'],
            'createdAt' => $employee['created_at']
        ];
        
        sendSuccessResponse($formattedEmployee);
        
    } catch (PDOException $e) {
        error_log("Error fetching employee: " . $e->getMessage());
        sendErrorResponse('Failed to fetch employee', 500, ['message' => $e->getMessage()]);
    }
}

/**
 * Create new employee
 */
function createEmployee($pdo, $input) {
    try {
        // Extract input data
        $firstName = $input['firstName'] ?? null;
        $middleName = $input['middleName'] ?? null;
        $lastName = $input['lastName'] ?? null;
        $age = $input['age'] ?? null;
        $birthDate = $input['birthDate'] ?? null;
        $contactNumber = $input['contactNumber'] ?? null;
        $email = $input['email'] ?? null;
        $civilStatus = $input['civilStatus'] ?? null;
        $address = $input['address'] ?? null;
        $position = $input['position'] ?? null;
        $department = $input['department'] ?? null;
        $salary = $input['salary'] ?? null;
        $hireDate = $input['hireDate'] ?? date('Y-m-d');
        $status = $input['status'] ?? 'Active';
        $employeeId = $input['employeeId'] ?? null;
        $idBarcode = $input['idBarcode'] ?? null;
        $tinNumber = $input['tinNumber'] ?? null;
        $sssNumber = $input['sssNumber'] ?? null;
        $pagibigNumber = $input['pagibigNumber'] ?? null;
        $philhealthNumber = $input['philhealthNumber'] ?? null;
        $profilePicture = $input['profilePicture'] ?? null;
        $faceDescriptor = $input['faceDescriptor'] ?? null;
        $document = $input['document'] ?? null;
        $username = $input['username'] ?? null;
        $accessLevel = $input['accessLevel'] ?? 'user';
        
        // Validation - required fields
        if (!$firstName || !$lastName) {
            sendErrorResponse('First name and last name are required', 400);
            return;
        }
        
        if (!$email || !$position || !$department) {
            sendErrorResponse('Email, position, and department are required', 400);
            return;
        }
        
        if (!$employeeId) {
            sendErrorResponse('Employee ID is required', 400);
            return;
        }
        
        // Email validation
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            sendErrorResponse('Please provide a valid email address', 400);
            return;
        }
        
        // Check if email already exists
        $stmt = $pdo->prepare("SELECT uid, email FROM emp_list WHERE LOWER(email) = LOWER(?)");
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            sendErrorResponse('An employee with this email address already exists', 400);
            return;
        }
        
        // Check if employee ID already exists
        $stmt = $pdo->prepare("SELECT uid, id_number FROM emp_list WHERE id_number = ?");
        $stmt->execute([$employeeId]);
        if ($stmt->fetch()) {
            sendErrorResponse('An employee with this ID already exists', 400);
            return;
        }
        
        // Generate username if not provided
        $generatedUsername = $username ?: strtolower(preg_replace('/\s+/', '', $firstName . $lastName));
        
        // Insert new employee
        $insertQuery = "
            INSERT INTO emp_list (
                first_name, middle_name, last_name, age, birth_date, contact_number, email,
                civil_status, address, hire_date, position, department, status, id_number, id_barcode, salary,
                tin_number, sss_number, pagibig_number, philhealth_number,
                profile_picture, face_descriptor, document, username, access_level, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ";
        
        $stmt = $pdo->prepare($insertQuery);
        $stmt->execute([
            $firstName, $middleName, $lastName, $age, $birthDate, $contactNumber, $email,
            $civilStatus, $address, $hireDate, $position, $department, $status, $employeeId,
            $idBarcode, $salary, $tinNumber, $sssNumber, $pagibigNumber, $philhealthNumber,
            $profilePicture, $faceDescriptor, $document, $generatedUsername, $accessLevel
        ]);
        
        $newId = $pdo->lastInsertId();
        
        // Fetch the newly created employee
        $stmt = $pdo->prepare("
            SELECT 
                uid as id,
                CONCAT(first_name, ' ', COALESCE(CONCAT(middle_name, ' '), ''), last_name) as full_name,
                first_name, middle_name, last_name, age, birth_date, contact_number, email,
                civil_status, address, hire_date, position, department, status, id_number, id_barcode, salary,
                tin_number, sss_number, pagibig_number, philhealth_number,
                profile_picture, face_descriptor, document, username, access_level, created_at
            FROM emp_list 
            WHERE uid = ?
        ");
        $stmt->execute([$newId]);
        $newEmployee = $stmt->fetch();
        
        $employeeData = [
            'id' => (int)$newEmployee['id'],
            'fullName' => $newEmployee['full_name'],
            'firstName' => $newEmployee['first_name'],
            'middleName' => $newEmployee['middle_name'],
            'lastName' => $newEmployee['last_name'],
            'age' => $newEmployee['age'] ? (int)$newEmployee['age'] : null,
            'birthDate' => $newEmployee['birth_date'],
            'contactNumber' => $newEmployee['contact_number'],
            'email' => $newEmployee['email'],
            'civilStatus' => $newEmployee['civil_status'],
            'address' => $newEmployee['address'],
            'hireDate' => $newEmployee['hire_date'],
            'position' => $newEmployee['position'],
            'department' => $newEmployee['department'],
            'status' => $newEmployee['status'],
            'employeeId' => $newEmployee['id_number'],
            'idBarcode' => $newEmployee['id_barcode'],
            'salary' => $newEmployee['salary'],
            'tinNumber' => $newEmployee['tin_number'],
            'sssNumber' => $newEmployee['sss_number'],
            'pagibigNumber' => $newEmployee['pagibig_number'],
            'philhealthNumber' => $newEmployee['philhealth_number'],
            'profilePicture' => $newEmployee['profile_picture'],
            'faceDescriptor' => $newEmployee['face_descriptor'],
            'document' => $newEmployee['document'],
            'username' => $newEmployee['username'],
            'accessLevel' => $newEmployee['access_level'],
            'createdAt' => $newEmployee['created_at']
        ];
        
        error_log("Successfully added employee: {$newEmployee['full_name']} (ID: {$newId}, Employee ID: {$newEmployee['id_number']})");
        
        sendSuccessResponse($employeeData, "Employee {$newEmployee['full_name']} has been added successfully", 201);
        
    } catch (PDOException $e) {
        error_log("Error adding employee: " . $e->getMessage());
        sendErrorResponse('Failed to add employee', 500, ['message' => $e->getMessage()]);
    }
}

/**
 * Update employee by ID
 */
function updateEmployee($pdo, $id, $input) {
    try {
        // Check if employee exists
        $stmt = $pdo->prepare("SELECT uid FROM emp_list WHERE uid = ?");
        $stmt->execute([$id]);
        if (!$stmt->fetch()) {
            sendErrorResponse('Employee not found', 404);
            return;
        }
        
        // Extract input data
        $firstName = $input['firstName'] ?? null;
        $middleName = $input['middleName'] ?? null;
        $lastName = $input['lastName'] ?? null;
        $email = $input['email'] ?? null;
        $position = $input['position'] ?? null;
        $department = $input['department'] ?? null;
        
        // Validation - required fields
        if (!$firstName || !$lastName) {
            sendErrorResponse('First name and last name are required', 400);
            return;
        }
        
        if (!$email || !$position || !$department) {
            sendErrorResponse('Email, position, and department are required', 400);
            return;
        }
        
        // Email validation
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            sendErrorResponse('Please provide a valid email address', 400);
            return;
        }
        
        // Check if email already exists for other employees
        $stmt = $pdo->prepare("SELECT uid, email FROM emp_list WHERE LOWER(email) = LOWER(?) AND uid != ?");
        $stmt->execute([$email, $id]);
        if ($stmt->fetch()) {
            sendErrorResponse('An employee with this email address already exists', 400);
            return;
        }
        
        // Check if username already exists for other employees (if username is being updated)
        if (!empty($input['username'])) {
            $stmt = $pdo->prepare("SELECT uid, username FROM emp_list WHERE LOWER(username) = LOWER(?) AND uid != ?");
            $stmt->execute([$input['username'], $id]);
            if ($stmt->fetch()) {
                sendErrorResponse('An employee with this username already exists', 400);
                return;
            }
        }
        
        // Check if employee ID already exists for other employees
        if (!empty($input['idNumber'])) {
            $stmt = $pdo->prepare("SELECT uid, id_number FROM emp_list WHERE id_number = ? AND uid != ?");
            $stmt->execute([$input['idNumber'], $id]);
            if ($stmt->fetch()) {
                sendErrorResponse('An employee with this ID already exists', 400);
                return;
            }
        }
        
        // Build dynamic update query
        $updateFields = [];
        $updateValues = [];
        
        $fieldsToUpdate = [
            'first_name' => $input['firstName'] ?? null,
            'middle_name' => $input['middleName'] ?? null,
            'last_name' => $input['lastName'] ?? null,
            'age' => $input['age'] ?? null,
            'birth_date' => $input['birthDate'] ?? null,
            'contact_number' => $input['contactNumber'] ?? null,
            'email' => $input['email'] ?? null,
            'civil_status' => $input['civilStatus'] ?? null,
            'address' => $input['address'] ?? null,
            'hire_date' => $input['hireDate'] ?? null,
            'position' => $input['position'] ?? null,
            'department' => $input['department'] ?? null,
            'status' => $input['status'] ?? null,
            'id_number' => $input['idNumber'] ?? null,
            'id_barcode' => $input['idBarcode'] ?? null,
            'salary' => $input['salary'] ?? null,
            'tin_number' => $input['tinNumber'] ?? null,
            'sss_number' => $input['sssNumber'] ?? null,
            'pagibig_number' => $input['pagibigNumber'] ?? null,
            'philhealth_number' => $input['philhealthNumber'] ?? null,
            'profile_picture' => $input['profilePicture'] ?? null,
            'face_descriptor' => $input['faceDescriptor'] ?? null,
            'document' => $input['document'] ?? null,
            // ADD THESE TWO FIELDS
            'username' => $input['username'] ?? null,
            'access_level' => $input['accessLevel'] ?? null
        ];
        
        foreach ($fieldsToUpdate as $dbField => $value) {
            if ($value !== null) {
                $updateFields[] = "{$dbField} = ?";
                $updateValues[] = $value;
            }
        }
        
        // Always update the updated_at timestamp
        $updateFields[] = "updated_at = NOW()";
        $updateValues[] = $id;
        
        $updateQuery = "UPDATE emp_list SET " . implode(", ", $updateFields) . " WHERE uid = ?";
        
        $stmt = $pdo->prepare($updateQuery);
        $stmt->execute($updateValues);
        
        // Fetch the updated employee
        $stmt = $pdo->prepare("
            SELECT 
                uid as id,
                CONCAT(first_name, ' ', COALESCE(CONCAT(middle_name, ' '), ''), last_name) as full_name,
                first_name, middle_name, last_name, age, birth_date, contact_number, email,
                civil_status, address, hire_date, position, department, status, id_number, id_barcode, salary,
                tin_number, sss_number, pagibig_number, philhealth_number,
                profile_picture, face_descriptor, document, username, access_level, created_at, updated_at
            FROM emp_list 
            WHERE uid = ?
        ");
        $stmt->execute([$id]);
        $updatedEmployee = $stmt->fetch();
        
        $employeeData = [
            'id' => (int)$updatedEmployee['id'],
            'fullName' => $updatedEmployee['full_name'],
            'firstName' => $updatedEmployee['first_name'],
            'middleName' => $updatedEmployee['middle_name'],
            'lastName' => $updatedEmployee['last_name'],
            'age' => $updatedEmployee['age'] ? (int)$updatedEmployee['age'] : null,
            'birthDate' => $updatedEmployee['birth_date'],
            'contactNumber' => $updatedEmployee['contact_number'],
            'email' => $updatedEmployee['email'],
            'civilStatus' => $updatedEmployee['civil_status'],
            'address' => $updatedEmployee['address'],
            'hireDate' => $updatedEmployee['hire_date'],
            'position' => $updatedEmployee['position'],
            'department' => $updatedEmployee['department'],
            'status' => $updatedEmployee['status'],
            'idNumber' => $updatedEmployee['id_number'],
            'idBarcode' => $updatedEmployee['id_barcode'],
            'salary' => $updatedEmployee['salary'],
            'tinNumber' => $updatedEmployee['tin_number'],
            'sssNumber' => $updatedEmployee['sss_number'],
            'pagibigNumber' => $updatedEmployee['pagibig_number'],
            'philhealthNumber' => $updatedEmployee['philhealth_number'],
            'profilePicture' => $updatedEmployee['profile_picture'],
            'faceDescriptor' => $updatedEmployee['face_descriptor'],
            'document' => $updatedEmployee['document'],
            'username' => $updatedEmployee['username'],
            'accessLevel' => $updatedEmployee['access_level'],
            'createdAt' => $updatedEmployee['created_at'],
            'updatedAt' => $updatedEmployee['updated_at']
        ];
        
        error_log("Successfully updated employee: {$updatedEmployee['full_name']} (ID: {$id})");
        
        sendSuccessResponse($employeeData, "Employee {$updatedEmployee['full_name']} has been updated successfully");
        
    } catch (PDOException $e) {
        error_log("Error updating employee: " . $e->getMessage());
        sendErrorResponse('Failed to update employee', 500, ['message' => $e->getMessage()]);
    }
}

/**
 * Update employee status
 */
function updateEmployeeStatus($pdo, $id, $input) {
    try {
        $status = $input['status'] ?? null;
        
        // Validate status
        $validStatuses = ['Active', 'Inactive', 'On Leave', 'Terminated'];
        if (!$status || !in_array($status, $validStatuses)) {
            sendErrorResponse('Invalid status. Must be one of: ' . implode(', ', $validStatuses), 400);
            return;
        }
        
        // Check if employee exists
        $stmt = $pdo->prepare("SELECT uid, first_name, last_name FROM emp_list WHERE uid = ?");
        $stmt->execute([$id]);
        $existingEmployee = $stmt->fetch();
        
        if (!$existingEmployee) {
            sendErrorResponse('Employee not found', 404);
            return;
        }
        
        // Update employee status
        $stmt = $pdo->prepare("UPDATE emp_list SET status = ?, updated_at = NOW() WHERE uid = ?");
        $stmt->execute([$status, $id]);
        
        if ($stmt->rowCount() === 0) {
            sendErrorResponse('Employee not found or no changes made', 404);
            return;
        }
        
        $updatedEmployeeData = [
            'id' => (int)$id,
            'name' => "{$existingEmployee['first_name']} {$existingEmployee['last_name']}",
            'status' => $status
        ];
        
        sendSuccessResponse($updatedEmployeeData, "Employee status updated to {$status}");
        
    } catch (PDOException $e) {
        error_log("Error updating employee status: " . $e->getMessage());
        sendErrorResponse('Failed to update employee status', 500, ['message' => $e->getMessage()]);
    }
}

/**
 * Delete single employee
 */
function deleteEmployee($pdo, $id) {
    try {
        // Check if employee exists
        $stmt = $pdo->prepare("SELECT uid, first_name, last_name, id_number, position, department FROM emp_list WHERE uid = ?");
        $stmt->execute([$id]);
        $employee = $stmt->fetch();
        
        if (!$employee) {
            sendErrorResponse('Employee not found', 404);
            return;
        }
        
        // Delete employee
        $stmt = $pdo->prepare("DELETE FROM emp_list WHERE uid = ?");
        $stmt->execute([$id]);
        
        if ($stmt->rowCount() === 0) {
            sendErrorResponse('Employee not found or already deleted', 404);
            return;
        }
        
        $deletedEmployeeData = [
            'deletedEmployee' => [
                'id' => (int)$employee['uid'],
                'name' => "{$employee['first_name']} {$employee['last_name']}",
                'idNumber' => $employee['id_number'],
                'position' => $employee['position'],
                'department' => $employee['department']
            ]
        ];
        
        sendSuccessResponse(
            $deletedEmployeeData,
            "Employee {$employee['first_name']} {$employee['last_name']} (ID: {$employee['id_number']}) has been successfully deleted"
        );
        
    } catch (PDOException $e) {
        error_log("Error deleting employee: " . $e->getMessage());
        sendErrorResponse('Failed to delete employee', 500, ['message' => $e->getMessage()]);
    }
}

/**
 * Bulk delete employees
 */
function bulkDeleteEmployees($pdo, $input) {
    try {
        $employeeIds = $input['employeeIds'] ?? null;
        
        // Validate input
        if (!$employeeIds || !is_array($employeeIds) || empty($employeeIds)) {
            sendErrorResponse('Employee IDs array is required and cannot be empty', 400);
            return;
        }
        
        // Validate all IDs are numbers
        $invalidIds = array_filter($employeeIds, function($id) {
            return !$id || !is_numeric($id);
        });
        
        if (!empty($invalidIds)) {
            sendErrorResponse('All employee IDs must be valid numbers', 400);
            return;
        }
        
        // Get employee info before deletion
        $placeholders = implode(',', array_fill(0, count($employeeIds), '?'));
        $stmt = $pdo->prepare("
            SELECT uid, first_name, last_name, id_number 
            FROM emp_list 
            WHERE uid IN ({$placeholders})
        ");
        $stmt->execute($employeeIds);
        $employees = $stmt->fetchAll();
        
        if (empty($employees)) {
            sendErrorResponse('No employees found with the provided IDs', 404);
            return;
        }
        
        // Perform bulk deletion
        $stmt = $pdo->prepare("DELETE FROM emp_list WHERE uid IN ({$placeholders})");
        $stmt->execute($employeeIds);
        
        $deletedCount = $stmt->rowCount();
        
        $deletedEmployeesData = [
            'deletedCount' => $deletedCount,
            'deletedEmployees' => array_map(function($emp) {
                return [
                    'id' => (int)$emp['uid'],
                    'name' => "{$emp['first_name']} {$emp['last_name']}",
                    'idNumber' => $emp['id_number']
                ];
            }, $employees)
        ];
        
        sendSuccessResponse($deletedEmployeesData, "Successfully deleted {$deletedCount} employee(s)");
        
    } catch (PDOException $e) {
        error_log("Error bulk deleting employees: " . $e->getMessage());
        sendErrorResponse('Failed to delete employees', 500, ['message' => $e->getMessage()]);
    }
}

?>