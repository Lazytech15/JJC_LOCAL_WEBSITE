<?php
/**
 * Get user role and permissions
 */
function getUserRoleAndPermissions($user, $department) {
    $role = 'user';
    $permissions = [];
    
    // Only SuperAdmin (admin access_level + superAdmin department) gets full permissions
    if ($user['access_level'] === 'admin' && $user['department'] === 'superAdmin' && $department === 'superAdmin') {
        $role = 'admin';
        $permissions = ['*'];
    } else {
        $role = 'user';
        $permissions = [
            'view_own_profile',
            'view_own_attendance'
        ];
    }
    
    return [
        'role' => $role,
        'permissions' => $permissions
    ];
}

// Handle authentication endpoint
if ($endpoint === 'login' || $endpoint === null) {
    try {
        $pdo = getConnection();
        
        // Get credentials from request
        $method = $_SERVER['REQUEST_METHOD'];
        if ($method === 'POST') {
            $input = json_decode(file_get_contents('php://input'), true);
            $username = $input['username'] ?? null;
            $password = $input['password'] ?? null;
            $department = $input['department'] ?? null;
        } else {
            $username = $_GET['username'] ?? null;
            $password = $_GET['password'] ?? null;
            $department = $_GET['department'] ?? null;
        }
        
        // Validate required fields
        if (empty($username) || empty($password)) {
            sendErrorResponse('Username and password are required', 400);
        }
        
        if (empty($department)) {
            sendErrorResponse('Department is required', 400);
        }
        
        // Validate department
        $validDepartments = [
            'Human Resources',
            'Operations',
            'Finance',
            'Procurement',
            'Engineering',
            'superAdmin'
        ];
        
        if (!in_array($department, $validDepartments)) {
            sendErrorResponse('Invalid department', 400);
        }
        
        // Build query
        $query = "SELECT * FROM emp_list WHERE username = :username";
        $params = [':username' => $username];
        
        // Execute query
        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            sendErrorResponse('User not found', 404);
        }
        
        // Verify password
        if (!password_verify($password, $user['password_hash'])) {
            sendErrorResponse('Invalid credentials', 401);
        }
        
        // ========================================================================
        // CRITICAL: Only admin access_level can login to the system
        // ========================================================================
        if ($user['access_level'] !== 'admin') {
            sendErrorResponse('Access denied. Only administrators can access this system.', 403);
        }
        
        // ========================================================================
        // FIXED: Department Access Control
        // ========================================================================
        
        // Check if user is TRUE SuperAdmin (admin access_level + superAdmin department)
        $isTrueSuperAdmin = ($user['access_level'] === 'admin' && $user['department'] === 'superAdmin');
        
        if ($department === 'superAdmin') {
            // Only TRUE SuperAdmins can access superAdmin dashboard
            if (!$isTrueSuperAdmin) {
                sendErrorResponse('Insufficient privileges for Super Admin access. Only SuperAdmin department members can access this area.', 403);
            }
        } else {
            // For regular departments:
            // - TRUE SuperAdmins can access any department
            // - Other users (including admins from other departments) must match their own department
            if (!$isTrueSuperAdmin && $user['department'] !== $department) {
                sendErrorResponse('User not authorized for this department. You can only access your assigned department: ' . $user['department'], 403);
            }
        }
        
        // Get role and permissions based on actual user department
        $roleData = getUserRoleAndPermissions($user, $department);
        
        // Prepare user data
        $userData = [
            'id' => $user['uid'],
            'name' => trim($user['first_name'] . ' ' . $user['last_name']),
            'username' => $username,
            'access_level' => $user['access_level'],
            'department' => $user['department'], // User's ACTUAL department
            'loginDepartment' => $department, // The department they're logging into
            'role' => $roleData['role'],
            'permissions' => $roleData['permissions'],
            'isSuperAdmin' => $isTrueSuperAdmin // Only true if admin + superAdmin department
        ];
        
        sendSuccessResponse(['user' => $userData]);
        
    } catch (PDOException $e) {
        sendErrorResponse('Authentication failed', 500, ['message' => $e->getMessage()]);
    }
} else {
    sendErrorResponse('Invalid auth endpoint', 404);
}
?>