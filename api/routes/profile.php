<?php
// routes/profile.php - Profile Picture Management API with Landing Page & Gallery

/**
 * Helper function to get profile picture info for a single employee
 */
function getEmployeeProfileInfo($uid) {
    $profileDir = getcwd() . "/uploads/{$uid}/profiles";
    
    if (!is_dir($profileDir)) {
        return [];
    }
    
    $files = scandir($profileDir);
    $imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    $profilePictures = [];
    
    foreach ($files as $file) {
        if ($file === '.' || $file === '..') continue;
        
        $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
        if (in_array('.' . $ext, $imageExtensions)) {
            $filePath = $profileDir . '/' . $file;
            $stats = stat($filePath);
            
            $profilePictures[] = [
                'filename' => $file,
                'size' => $stats['size'],
                'modified' => date('c', $stats['mtime']),
                'extension' => '.' . $ext,
                'url' => "/api/profile/{$uid}/{$file}"
            ];
        }
    }
    
    // Sort by modification date, newest first
    usort($profilePictures, function($a, $b) {
        return strtotime($b['modified']) - strtotime($a['modified']);
    });
    
    return $profilePictures;
}

/**
 * Route handler
 */
$method = $_SERVER['REQUEST_METHOD'];
$pathSegments = array_slice($segments, 1); // Remove 'profile' from segments

// ============================================================================
// LANDING PAGE IMAGE MANAGEMENT ROUTES
// ============================================================================

// GET /api/profile/landing - Get all landing page images
if ($method === 'GET' && $endpoint === 'landing' && !isset($pathSegments[1])) {
    try {
        $landingDir = getcwd() . "/uploads/landing";
        
        if (!is_dir($landingDir)) {
            sendJsonResponse([
                'success' => true,
                'data' => [
                    'images' => [],
                    'count' => 0
                ]
            ]);
            exit;
        }
        
        $files = scandir($landingDir);
        $imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
        $images = [];
        
        foreach ($files as $file) {
            if ($file === '.' || $file === '..') continue;
            
            $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
            if (in_array('.' . $ext, $imageExtensions)) {
                $filePath = $landingDir . '/' . $file;
                $stats = stat($filePath);
                
                $images[] = [
                    'filename' => $file,
                    'size' => $stats['size'],
                    'modified' => date('c', $stats['mtime']),
                    'extension' => '.' . $ext,
                    'url' => "/api/profile/landing/{$file}"
                ];
            }
        }
        
        // Sort by modification date, newest first
        usort($images, function($a, $b) {
            return strtotime($b['modified']) - strtotime($a['modified']);
        });
        
        sendJsonResponse([
            'success' => true,
            'data' => [
                'images' => $images,
                'count' => count($images)
            ]
        ]);
        
    } catch (Exception $e) {
        error_log("Error fetching landing images: " . $e->getMessage());
        sendErrorResponse('Failed to fetch landing images', 500, ['message' => $e->getMessage()]);
    }
}

// POST /api/profile/landing/upload - Upload landing page image
elseif ($method === 'POST' && $endpoint === 'landing' && isset($pathSegments[1]) && $pathSegments[1] === 'upload') {
    try {
        if (!isset($_FILES['image'])) {
            sendErrorResponse('No file uploaded', 400);
        }
        
        $file = $_FILES['image'];
        
        if ($file['error'] !== UPLOAD_ERR_OK) {
            sendErrorResponse('File upload error', 400);
        }
        
        // Validate file size (10MB)
        if ($file['size'] > 10 * 1024 * 1024) {
            sendErrorResponse('File size exceeds 10MB limit', 400);
        }
        
        // Validate file type
        $allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);
        
        if (!in_array($mimeType, $allowedMimes)) {
            sendErrorResponse('Invalid file type. Only image files are allowed.', 400);
        }
        
        // Create directory
        $landingDir = getcwd() . "/uploads/landing";
        if (!is_dir($landingDir)) {
            if (!mkdir($landingDir, 0755, true)) {
                sendErrorResponse('Failed to create upload directory', 500);
            }
        }
        
        // Generate filename
        $timestamp = time();
        $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $filename = "landing_{$timestamp}.{$extension}";
        $filePath = $landingDir . '/' . $filename;
        
        if (!move_uploaded_file($file['tmp_name'], $filePath)) {
            sendErrorResponse('Failed to save uploaded file', 500);
        }
        
        $fileSize = filesize($filePath);
        
        sendJsonResponse([
            'success' => true,
            'message' => 'Landing page image uploaded successfully',
            'data' => [
                'file' => [
                    'filename' => $filename,
                    'originalName' => $file['name'],
                    'size' => $fileSize,
                    'mimetype' => $mimeType,
                    'url' => "/api/profile/landing/{$filename}",
                    'uploadedAt' => date('c')
                ]
            ]
        ], 201);
        
    } catch (Exception $e) {
        error_log("Error uploading landing image: " . $e->getMessage());
        sendErrorResponse('Failed to upload landing image', 500, ['message' => $e->getMessage()]);
    }
}

// GET /api/profile/landing/:filename - Get specific landing page image
elseif ($method === 'GET' && $endpoint === 'landing' && isset($pathSegments[1]) && $pathSegments[1] !== 'upload') {
    try {
        $filename = $pathSegments[1];
        
        if (empty($filename)) {
            sendErrorResponse('Filename is required', 400);
        }
        
        // Validate filename to prevent directory traversal
        if (strpos($filename, '..') !== false || strpos($filename, '/') !== false || strpos($filename, '\\') !== false) {
            sendErrorResponse('Invalid filename', 400);
        }
        
        $landingPath = getcwd() . "/uploads/landing/{$filename}";
        
        if (!file_exists($landingPath)) {
            sendErrorResponse('Landing page image not found', 404);
        }
        
        // Validate file extension
        $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        $imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
        
        if (!in_array($ext, $imageExtensions)) {
            sendErrorResponse('Invalid image file type', 400);
        }
        
        // Set appropriate content type
        $contentTypes = [
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'gif' => 'image/gif',
            'webp' => 'image/webp',
            'bmp' => 'image/bmp'
        ];
        
        $contentType = $contentTypes[$ext] ?? 'application/octet-stream';
        $fileSize = filesize($landingPath);
        $lastModified = filemtime($landingPath);
        
        // Set headers
        header("Content-Type: {$contentType}");
        header("Content-Length: {$fileSize}");
        header('Cache-Control: public, max-age=3600');
        header('Last-Modified: ' . gmdate('D, d M Y H:i:s', $lastModified) . ' GMT');
        header("Content-Disposition: inline; filename=\"{$filename}\"");
        
        // Check if client has cached version
        if (isset($_SERVER['HTTP_IF_MODIFIED_SINCE'])) {
            $ifModifiedSince = strtotime($_SERVER['HTTP_IF_MODIFIED_SINCE']);
            if ($ifModifiedSince >= $lastModified) {
                http_response_code(304);
                exit();
            }
        }
        
        // Stream the file
        readfile($landingPath);
        exit();
        
    } catch (Exception $e) {
        error_log("Error retrieving landing image: " . $e->getMessage());
        sendErrorResponse('Failed to retrieve landing image', 500, ['message' => $e->getMessage()]);
    }
}

// DELETE /api/profile/landing/:filename - Delete landing page image
elseif ($method === 'DELETE' && $endpoint === 'landing' && isset($pathSegments[1])) {
    try {
        $filename = $pathSegments[1];
        
        if (empty($filename)) {
            sendErrorResponse('Filename is required', 400);
        }
        
        // Validate filename to prevent directory traversal
        if (strpos($filename, '..') !== false || strpos($filename, '/') !== false || strpos($filename, '\\') !== false) {
            sendErrorResponse('Invalid filename', 400);
        }
        
        $landingPath = getcwd() . "/uploads/landing/{$filename}";
        
        if (!file_exists($landingPath)) {
            sendErrorResponse('Landing page image not found', 404);
        }
        
        if (!unlink($landingPath)) {
            sendErrorResponse('Failed to delete landing page image', 500);
        }
        
        sendJsonResponse([
            'success' => true,
            'message' => 'Landing page image deleted successfully',
            'data' => [
                'filename' => $filename
            ]
        ]);
        
    } catch (Exception $e) {
        error_log("Error deleting landing image: " . $e->getMessage());
        sendErrorResponse('Failed to delete landing image', 500, ['message' => $e->getMessage()]);
    }
}

// ============================================================================
// GALLERY IMAGE MANAGEMENT ROUTES
// ============================================================================

// GET /api/profile/gallery - Get all gallery images
elseif ($method === 'GET' && $endpoint === 'gallery' && !isset($pathSegments[1])) {
    try {
        $galleryDir = getcwd() . "/uploads/gallery";
        
        if (!is_dir($galleryDir)) {
            sendJsonResponse([
                'success' => true,
                'data' => [
                    'images' => [],
                    'count' => 0
                ]
            ]);
            exit;
        }
        
        $files = scandir($galleryDir);
        $imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
        $images = [];
        
        foreach ($files as $file) {
            if ($file === '.' || $file === '..') continue;
            
            $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
            if (in_array('.' . $ext, $imageExtensions)) {
                $filePath = $galleryDir . '/' . $file;
                $stats = stat($filePath);
                
                $images[] = [
                    'filename' => $file,
                    'size' => $stats['size'],
                    'modified' => date('c', $stats['mtime']),
                    'extension' => '.' . $ext,
                    'url' => "/api/profile/gallery/{$file}",
                    'thumbnail_url' => "/api/profile/gallery/{$file}?thumb=1"
                ];
            }
        }
        
        // Sort by modification date, newest first
        usort($images, function($a, $b) {
            return strtotime($b['modified']) - strtotime($a['modified']);
        });
        
        sendJsonResponse([
            'success' => true,
            'data' => [
                'images' => $images,
                'count' => count($images)
            ]
        ]);
        
    } catch (Exception $e) {
        error_log("Error fetching gallery images: " . $e->getMessage());
        sendErrorResponse('Failed to fetch gallery images', 500, ['message' => $e->getMessage()]);
    }
}

// POST /api/profile/gallery/upload - Upload gallery image(s)
elseif ($method === 'POST' && $endpoint === 'gallery' && isset($pathSegments[1]) && $pathSegments[1] === 'upload') {
    try {
        if (!isset($_FILES['images'])) {
            sendErrorResponse('No files uploaded', 400);
        }
        
        $files = $_FILES['images'];
        $uploadedFiles = [];
        $errors = [];
        
        // Handle both single and multiple file uploads
        $fileCount = is_array($files['name']) ? count($files['name']) : 1;
        
        // Create directory
        $galleryDir = getcwd() . "/uploads/gallery";
        if (!is_dir($galleryDir)) {
            if (!mkdir($galleryDir, 0755, true)) {
                sendErrorResponse('Failed to create upload directory', 500);
            }
        }
        
        $allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
        
        for ($i = 0; $i < $fileCount; $i++) {
            try {
                $fileName = is_array($files['name']) ? $files['name'][$i] : $files['name'];
                $fileTmpName = is_array($files['tmp_name']) ? $files['tmp_name'][$i] : $files['tmp_name'];
                $fileSize = is_array($files['size']) ? $files['size'][$i] : $files['size'];
                $fileError = is_array($files['error']) ? $files['error'][$i] : $files['error'];
                
                if ($fileError !== UPLOAD_ERR_OK) {
                    $errors[] = [
                        'file' => $fileName,
                        'error' => 'Upload error'
                    ];
                    continue;
                }
                
                // Validate file size (10MB)
                if ($fileSize > 10 * 1024 * 1024) {
                    $errors[] = [
                        'file' => $fileName,
                        'error' => 'File size exceeds 10MB limit'
                    ];
                    continue;
                }
                
                // Validate file type
                $finfo = finfo_open(FILEINFO_MIME_TYPE);
                $mimeType = finfo_file($finfo, $fileTmpName);
                finfo_close($finfo);
                
                if (!in_array($mimeType, $allowedMimes)) {
                    $errors[] = [
                        'file' => $fileName,
                        'error' => 'Invalid file type'
                    ];
                    continue;
                }
                
                // Generate filename
                $timestamp = time() . '_' . $i;
                $extension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
                $newFilename = "gallery_{$timestamp}.{$extension}";
                $filePath = $galleryDir . '/' . $newFilename;
                
                if (!move_uploaded_file($fileTmpName, $filePath)) {
                    $errors[] = [
                        'file' => $fileName,
                        'error' => 'Failed to save file'
                    ];
                    continue;
                }
                
                $uploadedFiles[] = [
                    'filename' => $newFilename,
                    'originalName' => $fileName,
                    'size' => filesize($filePath),
                    'mimetype' => $mimeType,
                    'url' => "/api/profile/gallery/{$newFilename}",
                    'uploadedAt' => date('c')
                ];
                
            } catch (Exception $e) {
                $errors[] = [
                    'file' => $fileName ?? 'unknown',
                    'error' => $e->getMessage()
                ];
            }
        }
        
        sendJsonResponse([
            'success' => true,
            'message' => count($uploadedFiles) . ' image(s) uploaded successfully',
            'data' => [
                'uploaded' => $uploadedFiles,
                'errors' => $errors,
                'total_uploaded' => count($uploadedFiles),
                'total_errors' => count($errors)
            ]
        ], 201);
        
    } catch (Exception $e) {
        error_log("Error uploading gallery images: " . $e->getMessage());
        sendErrorResponse('Failed to upload gallery images', 500, ['message' => $e->getMessage()]);
    }
}

// GET /api/profile/gallery/:filename - Get specific gallery image
elseif ($method === 'GET' && $endpoint === 'gallery' && isset($pathSegments[1]) && $pathSegments[1] !== 'upload') {
    try {
        $filename = $pathSegments[1];
        
        if (empty($filename)) {
            sendErrorResponse('Filename is required', 400);
        }
        
        // Validate filename to prevent directory traversal
        if (strpos($filename, '..') !== false || strpos($filename, '/') !== false || strpos($filename, '\\') !== false) {
            sendErrorResponse('Invalid filename', 400);
        }
        
        $galleryPath = getcwd() . "/uploads/gallery/{$filename}";
        
        if (!file_exists($galleryPath)) {
            sendErrorResponse('Gallery image not found', 404);
        }
        
        // Validate file extension
        $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        $imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
        
        if (!in_array($ext, $imageExtensions)) {
            sendErrorResponse('Invalid image file type', 400);
        }
        
        // Set appropriate content type
        $contentTypes = [
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'gif' => 'image/gif',
            'webp' => 'image/webp',
            'bmp' => 'image/bmp'
        ];
        
        $contentType = $contentTypes[$ext] ?? 'application/octet-stream';
        $fileSize = filesize($galleryPath);
        $lastModified = filemtime($galleryPath);
        
        // Set headers
        header("Content-Type: {$contentType}");
        header("Content-Length: {$fileSize}");
        header('Cache-Control: public, max-age=3600');
        header('Last-Modified: ' . gmdate('D, d M Y H:i:s', $lastModified) . ' GMT');
        header("Content-Disposition: inline; filename=\"{$filename}\"");
        
        // Check if client has cached version
        if (isset($_SERVER['HTTP_IF_MODIFIED_SINCE'])) {
            $ifModifiedSince = strtotime($_SERVER['HTTP_IF_MODIFIED_SINCE']);
            if ($ifModifiedSince >= $lastModified) {
                http_response_code(304);
                exit();
            }
        }
        
        // Stream the file
        readfile($galleryPath);
        exit();
        
    } catch (Exception $e) {
        error_log("Error retrieving gallery image: " . $e->getMessage());
        sendErrorResponse('Failed to retrieve gallery image', 500, ['message' => $e->getMessage()]);
    }
}

// DELETE /api/profile/gallery/:filename - Delete gallery image
elseif ($method === 'DELETE' && $endpoint === 'gallery' && isset($pathSegments[1])) {
    try {
        $filename = $pathSegments[1];
        
        if (empty($filename)) {
            sendErrorResponse('Filename is required', 400);
        }
        
        // Validate filename to prevent directory traversal
        if (strpos($filename, '..') !== false || strpos($filename, '/') !== false || strpos($filename, '\\') !== false) {
            sendErrorResponse('Invalid filename', 400);
        }
        
        $galleryPath = getcwd() . "/uploads/gallery/{$filename}";
        
        if (!file_exists($galleryPath)) {
            sendErrorResponse('Gallery image not found', 404);
        }
        
        if (!unlink($galleryPath)) {
            sendErrorResponse('Failed to delete gallery image', 500);
        }
        
        sendJsonResponse([
            'success' => true,
            'message' => 'Gallery image deleted successfully',
            'data' => [
                'filename' => $filename
            ]
        ]);
        
    } catch (Exception $e) {
        error_log("Error deleting gallery image: " . $e->getMessage());
        sendErrorResponse('Failed to delete gallery image', 500, ['message' => $e->getMessage()]);
    }
}

// ============================================================================
// SPECIAL ROUTES - Must be checked first to avoid conflicts with :uid routes
// ============================================================================

// GET /api/profile/bulk - Get all employees with their profile pictures
elseif ($method === 'GET' && $endpoint === 'bulk' && !isset($pathSegments[1])) {
    try {
        $pdo = getConnection();
        
        // Get query parameters
        $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
        $offset = ($page - 1) * $limit;
        $search = $_GET['search'] ?? '';
        $department = $_GET['department'] ?? '';
        
        // Build query with filters
        $whereClause = 'WHERE 1=1';
        $params = [];
        
        if ($search) {
            $whereClause .= ' AND (first_name LIKE ? OR last_name LIKE ? OR CONCAT(first_name, " ", last_name) LIKE ?)';
            $searchParam = "%{$search}%";
            $params[] = $searchParam;
            $params[] = $searchParam;
            $params[] = $searchParam;
        }
        
        if ($department) {
            $whereClause .= ' AND department = ?';
            $params[] = $department;
        }
        
        // Get total count
        $countQuery = "SELECT COUNT(*) as total FROM emp_list {$whereClause}";
        $stmt = $pdo->prepare($countQuery);
        $stmt->execute($params);
        $totalEmployees = $stmt->fetch()['total'];
        
        // Get employees with pagination
        $employeesQuery = "
            SELECT uid, first_name, last_name, department, position, email, profile_picture
            FROM emp_list 
            {$whereClause}
            ORDER BY first_name, last_name
            LIMIT ? OFFSET ?
        ";
        $params[] = $limit;
        $params[] = $offset;
        
        $stmt = $pdo->prepare($employeesQuery);
        $stmt->execute($params);
        $employees = $stmt->fetchAll();
        
        // Get profile picture info for each employee
        $employeesWithProfiles = [];
        $failedResults = [];
        
        foreach ($employees as $employee) {
            try {
                $profilePictures = getEmployeeProfileInfo($employee['uid']);
                
                $employeesWithProfiles[] = [
                    'uid' => $employee['uid'],
                    'name' => "{$employee['first_name']} {$employee['last_name']}",
                    'first_name' => $employee['first_name'],
                    'last_name' => $employee['last_name'],
                    'department' => $employee['department'],
                    'position' => $employee['position'],
                    'email' => $employee['email'],
                    'has_blob_data' => !empty($employee['profile_picture']),
                    'profile_pictures' => $profilePictures,
                    'current_profile' => count($profilePictures) > 0 ? $profilePictures[0] : null,
                    'profile_url' => count($profilePictures) > 0 ? "/api/profile/{$employee['uid']}" : null
                ];
            } catch (Exception $e) {
                $failedResults[] = [
                    'employee' => $employee,
                    'error' => $e->getMessage()
                ];
            }
        }
        
        // Calculate pagination info
        $totalPages = ceil($totalEmployees / $limit);
        $hasNextPage = $page < $totalPages;
        $hasPreviousPage = $page > 1;
        
        $response = [
            'success' => true,
            'data' => [
                'employees' => $employeesWithProfiles,
                'pagination' => [
                    'current_page' => $page,
                    'total_pages' => $totalPages,
                    'total_employees' => $totalEmployees,
                    'employees_per_page' => $limit,
                    'has_next_page' => $hasNextPage,
                    'has_previous_page' => $hasPreviousPage,
                    'next_page' => $hasNextPage ? $page + 1 : null,
                    'previous_page' => $hasPreviousPage ? $page - 1 : null
                ],
                'filters' => [
                    'search' => $search ?: null,
                    'department' => $department ?: null
                ],
                'statistics' => [
                    'employees_with_profiles' => count(array_filter($employeesWithProfiles, fn($e) => count($e['profile_pictures']) > 0)),
                    'employees_without_profiles' => count(array_filter($employeesWithProfiles, fn($e) => count($e['profile_pictures']) === 0)),
                    'employees_with_blob_data' => count(array_filter($employeesWithProfiles, fn($e) => $e['has_blob_data'])),
                    'failed_retrievals' => count($failedResults)
                ]
            ]
        ];
        
        if (count($failedResults) > 0) {
            $response['failed_results'] = $failedResults;
        }
        
        sendJsonResponse($response);
        
    } catch (Exception $e) {
        error_log("Error fetching bulk employee profiles: " . $e->getMessage());
        sendErrorResponse('Failed to fetch employee profiles', 500, ['message' => $e->getMessage()]);
    }
}

// GET /api/profile/bulk/simple - Get simplified list
elseif ($method === 'GET' && $endpoint === 'bulk' && isset($pathSegments[1]) && $pathSegments[1] === 'simple') {
    try {
        $pdo = getConnection();
        
        $stmt = $pdo->query("
            SELECT uid, first_name, last_name, department, profile_picture
            FROM emp_list 
            ORDER BY first_name, last_name
        ");
        $employees = $stmt->fetchAll();
        
        $employeesWithProfileStatus = [];
        $imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
        
        foreach ($employees as $employee) {
            $profileDir = getcwd() . "/uploads/{$employee['uid']}/profiles";
            $hasProfileFile = false;
            
            if (is_dir($profileDir)) {
                $files = scandir($profileDir);
                foreach ($files as $file) {
                    if ($file === '.' || $file === '..') continue;
                    $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
                    if (in_array('.' . $ext, $imageExtensions)) {
                        $hasProfileFile = true;
                        break;
                    }
                }
            }
            
            $employeesWithProfileStatus[] = [
                'uid' => $employee['uid'],
                'name' => "{$employee['first_name']} {$employee['last_name']}",
                'department' => $employee['department'],
                'has_profile_file' => $hasProfileFile,
                'has_blob_data' => !empty($employee['profile_picture']),
                'profile_url' => $hasProfileFile ? "/api/profile/{$employee['uid']}" : null
            ];
        }
        
        $statistics = [
            'total_employees' => count($employeesWithProfileStatus),
            'with_profile_files' => count(array_filter($employeesWithProfileStatus, fn($e) => $e['has_profile_file'])),
            'with_blob_data' => count(array_filter($employeesWithProfileStatus, fn($e) => $e['has_blob_data'])),
            'without_any_profile' => count(array_filter($employeesWithProfileStatus, fn($e) => !$e['has_profile_file'] && !$e['has_blob_data']))
        ];
        
        sendJsonResponse([
            'success' => true,
            'data' => [
                'employees' => $employeesWithProfileStatus,
                'statistics' => $statistics
            ]
        ]);
        
    } catch (Exception $e) {
        error_log("Error fetching simple employee profiles: " . $e->getMessage());
        sendErrorResponse('Failed to fetch employee profiles', 500, ['message' => $e->getMessage()]);
    }
}

// GET /api/profile/bulk/download - Download all profile images as ZIP
elseif ($method === 'GET' && $endpoint === 'bulk' && isset($pathSegments[1]) && $pathSegments[1] === 'download') {
    try {
        $pdo = getConnection();
        
        // Get query parameters
        $department = $_GET['department'] ?? '';
        $search = $_GET['search'] ?? '';
        $uidsParam = $_GET['uids'] ?? '';
        $uids = $uidsParam ? array_filter(array_map('intval', explode(',', $uidsParam)), fn($id) => $id > 0) : [];
        
        // Build query
        $whereClause = 'WHERE 1=1';
        $params = [];
        
        if (count($uids) > 0) {
            $placeholders = implode(',', array_fill(0, count($uids), '?'));
            $whereClause .= " AND uid IN ({$placeholders})";
            $params = array_merge($params, $uids);
        } else {
            if ($search) {
                $whereClause .= ' AND (first_name LIKE ? OR last_name LIKE ? OR CONCAT(first_name, " ", last_name) LIKE ?)';
                $searchParam = "%{$search}%";
                $params[] = $searchParam;
                $params[] = $searchParam;
                $params[] = $searchParam;
            }
            
            if ($department) {
                $whereClause .= ' AND department = ?';
                $params[] = $department;
            }
        }
        
        $query = "
            SELECT uid, first_name, last_name, department, position
            FROM emp_list 
            {$whereClause}
            ORDER BY first_name, last_name
        ";
        
        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $employees = $stmt->fetchAll();
        
        if (count($employees) === 0) {
            sendErrorResponse('No employees found matching the criteria', 404);
        }
        
        // Create ZIP file
        $timestamp = date('Y-m-d\TH-i-s');
        $zipFilename = "profile_images_{$timestamp}.zip";
        $zipPath = sys_get_temp_dir() . '/' . $zipFilename;
        
        $zip = new ZipArchive();
        if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            sendErrorResponse('Failed to create archive', 500);
        }
        
        $addedCount = 0;
        $skippedCount = 0;
        $errors = [];
        $imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
        
        foreach ($employees as $employee) {
            $profileDir = getcwd() . "/uploads/{$employee['uid']}/profiles";
            
            if (!is_dir($profileDir)) {
                $skippedCount++;
                $errors[] = [
                    'uid' => $employee['uid'],
                    'name' => "{$employee['first_name']} {$employee['last_name']}",
                    'reason' => 'Profile directory not found'
                ];
                continue;
            }
            
            $files = scandir($profileDir);
            $mostRecentFile = null;
            $mostRecentTime = 0;
            
            foreach ($files as $file) {
                if ($file === '.' || $file === '..') continue;
                $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
                if (in_array('.' . $ext, $imageExtensions)) {
                    $filePath = $profileDir . '/' . $file;
                    $mtime = filemtime($filePath);
                    if ($mtime > $mostRecentTime) {
                        $mostRecentTime = $mtime;
                        $mostRecentFile = ['file' => $file, 'ext' => '.' . $ext];
                    }
                }
            }
            
            if ($mostRecentFile) {
                $sourcePath = $profileDir . '/' . $mostRecentFile['file'];
                $employeeName = preg_replace('/[^a-zA-Z0-9]/', '_', "{$employee['first_name']}_{$employee['last_name']}");
                $archiveFilename = "{$employee['uid']}_{$employeeName}{$mostRecentFile['ext']}";
                
                $zip->addFile($sourcePath, $archiveFilename);
                $addedCount++;
            } else {
                $skippedCount++;
                $errors[] = [
                    'uid' => $employee['uid'],
                    'name' => "{$employee['first_name']} {$employee['last_name']}",
                    'reason' => 'No image files found'
                ];
            }
        }
        
        // Add summary
        $summary = [
            'generated_at' => date('c'),
            'total_employees' => count($employees),
            'images_included' => $addedCount,
            'images_skipped' => $skippedCount,
            'filters_applied' => [
                'department' => $department ?: null,
                'search' => $search ?: null,
                'specific_uids' => count($uids) > 0 ? $uids : null
            ],
            'errors' => $errors
        ];
        
        $zip->addFromString('download_summary.json', json_encode($summary, JSON_PRETTY_PRINT));
        $zip->close();
        
        // Send file
        header('Content-Type: application/zip');
        header("Content-Disposition: attachment; filename=\"{$zipFilename}\"");
        header('Cache-Control: private, no-cache');
        header('Content-Length: ' . filesize($zipPath));
        
        readfile($zipPath);
        unlink($zipPath);
        exit();
        
    } catch (Exception $e) {
        error_log("Error creating bulk download: " . $e->getMessage());
        sendErrorResponse('Failed to create bulk download', 500, ['message' => $e->getMessage()]);
    }
}

// POST /api/profile/bulk/download - Download with request body
elseif ($method === 'POST' && $endpoint === 'bulk' && isset($pathSegments[1]) && $pathSegments[1] === 'download') {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        $uids = $input['uids'] ?? [];
        $includeSummary = $input['include_summary'] ?? true;
        $compressionLevel = min(max($input['compression_level'] ?? 6, 0), 9);
        
        if (!is_array($uids) || count($uids) === 0) {
            sendErrorResponse('UIDs array is required in request body', 400);
        }
        
        $validUids = array_filter(array_map('intval', $uids), fn($uid) => $uid > 0);
        
        if (count($validUids) === 0) {
            sendErrorResponse('No valid UIDs provided', 400);
        }
        
        $pdo = getConnection();
        
        $placeholders = implode(',', array_fill(0, count($validUids), '?'));
        $stmt = $pdo->prepare("
            SELECT uid, first_name, last_name, department, position
            FROM emp_list 
            WHERE uid IN ({$placeholders})
            ORDER BY first_name, last_name
        ");
        $stmt->execute($validUids);
        $employees = $stmt->fetchAll();
        
        if (count($employees) === 0) {
            sendErrorResponse('No employees found for the provided UIDs', 404);
        }
        
        // Create ZIP (similar to GET method)
        $timestamp = date('Y-m-d\TH-i-s');
        $zipFilename = "profile_images_{$timestamp}.zip";
        $zipPath = sys_get_temp_dir() . '/' . $zipFilename;
        
        $zip = new ZipArchive();
        if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            sendErrorResponse('Failed to create archive', 500);
        }
        
        $addedCount = 0;
        $skippedCount = 0;
        $errors = [];
        $imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
        
        foreach ($employees as $employee) {
            $profileDir = getcwd() . "/uploads/{$employee['uid']}/profiles";
            
            if (!is_dir($profileDir)) {
                $skippedCount++;
                $errors[] = [
                    'uid' => $employee['uid'],
                    'name' => "{$employee['first_name']} {$employee['last_name']}",
                    'reason' => 'Profile directory not found'
                ];
                continue;
            }
            
            $files = scandir($profileDir);
            $mostRecentFile = null;
            $mostRecentTime = 0;
            
            foreach ($files as $file) {
                if ($file === '.' || $file === '..') continue;
                $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
                if (in_array('.' . $ext, $imageExtensions)) {
                    $filePath = $profileDir . '/' . $file;
                    $mtime = filemtime($filePath);
                    if ($mtime > $mostRecentTime) {
                        $mostRecentTime = $mtime;
                        $mostRecentFile = ['file' => $file, 'ext' => '.' . $ext];
                    }
                }
            }
            
            if ($mostRecentFile) {
                $sourcePath = $profileDir . '/' . $mostRecentFile['file'];
                $employeeName = preg_replace('/[^a-zA-Z0-9]/', '_', "{$employee['first_name']}_{$employee['last_name']}");
                $archiveFilename = "{$employee['uid']}_{$employeeName}{$mostRecentFile['ext']}";
                
                $zip->addFile($sourcePath, $archiveFilename);
                $addedCount++;
            } else {
                $skippedCount++;
                $errors[] = [
                    'uid' => $employee['uid'],
                    'name' => "{$employee['first_name']} {$employee['last_name']}",
                    'reason' => 'No image files found'
                ];
            }
        }
        
        if ($includeSummary) {
            $summary = [
                'generated_at' => date('c'),
                'requested_uids' => $validUids,
                'total_employees_found' => count($employees),
                'images_included' => $addedCount,
                'images_skipped' => $skippedCount,
                'compression_level' => $compressionLevel,
                'errors' => $errors
            ];
            
            $zip->addFromString('download_summary.json', json_encode($summary, JSON_PRETTY_PRINT));
        }
        
        $zip->close();
        
        header('Content-Type: application/zip');
        header("Content-Disposition: attachment; filename=\"{$zipFilename}\"");
        header('Cache-Control: private, no-cache');
        header('Content-Length: ' . filesize($zipPath));
        
        readfile($zipPath);
        unlink($zipPath);
        exit();
        
    } catch (Exception $e) {
        error_log("Error creating bulk download: " . $e->getMessage());
        sendErrorResponse('Failed to create bulk download', 500, ['message' => $e->getMessage()]);
    }
}

// GET /api/profile/descriptors - Get all employees with face descriptors
elseif ($method === 'GET' && $endpoint === 'descriptors') {
    try {
        $pdo = getConnection();
        
        $stmt = $pdo->query("
            SELECT uid, first_name, last_name, department, position, face_descriptor
            FROM emp_list 
            WHERE face_descriptor IS NOT NULL
            ORDER BY first_name, last_name
        ");
        $employees = $stmt->fetchAll();
        
        $employeesWithDescriptors = [];
        
        foreach ($employees as $employee) {
            $employeesWithDescriptors[] = [
                'uid' => $employee['uid'],
                'name' => "{$employee['first_name']} {$employee['last_name']}",
                'first_name' => $employee['first_name'],
                'last_name' => $employee['last_name'],
                'department' => $employee['department'],
                'position' => $employee['position'],
                'has_descriptor' => !empty($employee['face_descriptor'])
            ];
        }
        
        sendJsonResponse([
            'success' => true,
            'count' => count($employeesWithDescriptors),
            'data' => $employeesWithDescriptors
        ]);
        
    } catch (Exception $e) {
        error_log("Error fetching employees with descriptors: " . $e->getMessage());
        sendErrorResponse('Failed to fetch employees with descriptors', 500, ['message' => $e->getMessage()]);
    }
}

// ============================================================================
// INDIVIDUAL EMPLOYEE ROUTES WITH :uid
// ============================================================================

// POST /api/profile/:uid/upload - Upload profile picture
elseif ($method === 'POST' && is_numeric($endpoint) && isset($pathSegments[1]) && $pathSegments[1] === 'upload') {
    try {
        $uid = (int)$endpoint;
        
        if (!isset($_FILES['profile_picture'])) {
            sendErrorResponse('No file uploaded', 400);
        }
        
        $file = $_FILES['profile_picture'];
        
        if ($file['error'] !== UPLOAD_ERR_OK) {
            sendErrorResponse('File upload error', 400);
        }
        
        // Validate file size (10MB)
        if ($file['size'] > 10 * 1024 * 1024) {
            sendErrorResponse('File size exceeds 10MB limit', 400);
        }
        
        // Validate file type
        $allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);
        
        if (!in_array($mimeType, $allowedMimes)) {
            sendErrorResponse('Invalid file type. Only image files are allowed.', 400);
        }
        
        $pdo = getConnection();
        $stmt = $pdo->prepare("SELECT uid, first_name, last_name FROM emp_list WHERE uid = ?");
        $stmt->execute([$uid]);
        $employee = $stmt->fetch();
        
        if (!$employee) {
            sendErrorResponse('Employee not found', 404);
        }
        
        // Create directory
        $profileDir = getcwd() . "/uploads/{$uid}/profiles";
        if (!is_dir($profileDir)) {
            if (!mkdir($profileDir, 0755, true)) {
                sendErrorResponse('Failed to create upload directory', 500);
            }
        }
        
        // Generate filename
        $timestamp = time();
        $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $filename = "profile_{$timestamp}.{$extension}";
        $filePath = $profileDir . '/' . $filename;
        
        if (!move_uploaded_file($file['tmp_name'], $filePath)) {
            sendErrorResponse('Failed to save uploaded file', 500);
        }
        
        $fileSize = filesize($filePath);
        
        sendJsonResponse([
            'success' => true,
            'message' => 'Profile picture uploaded successfully',
            'data' => [
                'employee' => [
                    'uid' => $employee['uid'],
                    'name' => "{$employee['first_name']} {$employee['last_name']}"
                ],
                'file' => [
                    'filename' => $filename,
                    'originalName' => $file['name'],
                    'size' => $fileSize,
                    'mimetype' => $mimeType,
                    'url' => "/api/profile/{$uid}/{$filename}",
                    'uploadedAt' => date('c')
                ],
                'directory' => $profileDir
            ]
        ], 201);
        
    } catch (Exception $e) {
        error_log("Error uploading profile picture: " . $e->getMessage());
        sendErrorResponse('Failed to upload profile picture', 500, ['message' => $e->getMessage()]);
    }
}

// POST /api/profile/:uid/upload-replace - Upload and replace
elseif ($method === 'POST' && is_numeric($endpoint) && isset($pathSegments[1]) && $pathSegments[1] === 'upload-replace') {
    try {
        $uid = (int)$endpoint;
        
        if (!isset($_FILES['profile_picture'])) {
            sendErrorResponse('No file uploaded', 400);
        }
        
        $file = $_FILES['profile_picture'];
        
        if ($file['error'] !== UPLOAD_ERR_OK) {
            sendErrorResponse('File upload error', 400);
        }
        
        if ($file['size'] > 10 * 1024 * 1024) {
            sendErrorResponse('File size exceeds 10MB limit', 400);
        }
        
        $allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);
        
        if (!in_array($mimeType, $allowedMimes)) {
            sendErrorResponse('Invalid file type. Only image files are allowed.', 400);
        }
        
        $pdo = getConnection();
        $stmt = $pdo->prepare("SELECT uid, first_name, last_name FROM emp_list WHERE uid = ?");
        $stmt->execute([$uid]);
        $employee = $stmt->fetch();
        
        if (!$employee) {
            sendErrorResponse('Employee not found', 404);
        }
        
        $profileDir = getcwd() . "/uploads/{$uid}/profiles";
        if (!is_dir($profileDir)) {
            mkdir($profileDir, 0755, true);
        }
        
        // Delete existing files
        $deletedFiles = [];
        $imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
        
        if (is_dir($profileDir)) {
            $files = scandir($profileDir);
            foreach ($files as $existingFile) {
                if ($existingFile === '.' || $existingFile === '..') continue;
                $ext = strtolower(pathinfo($existingFile, PATHINFO_EXTENSION));
                if (in_array('.' . $ext, $imageExtensions)) {
                    $existingPath = $profileDir . '/' . $existingFile;
                    if (unlink($existingPath)) {
                        $deletedFiles[] = $existingFile;
                    }
                }
            }
        }
        
        // Save new file
        $timestamp = time();
        $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $filename = "profile_{$timestamp}.{$extension}";
        $filePath = $profileDir . '/' . $filename;
        
        if (!move_uploaded_file($file['tmp_name'], $filePath)) {
            sendErrorResponse('Failed to save uploaded file', 500);
        }
        
        $fileSize = filesize($filePath);
        
        sendJsonResponse([
            'success' => true,
            'message' => 'Profile picture uploaded and replaced successfully',
            'data' => [
                'employee' => [
                    'uid' => $employee['uid'],
                    'name' => "{$employee['first_name']} {$employee['last_name']}"
                ],
                'file' => [
                    'filename' => $filename,
                    'originalName' => $file['name'],
                    'size' => $fileSize,
                    'mimetype' => $mimeType,
                    'url' => "/api/profile/{$uid}/{$filename}",
                    'uploadedAt' => date('c')
                ],
                'deleted_files' => $deletedFiles,
                'directory' => $profileDir
            ]
        ], 201);
        
    } catch (Exception $e) {
        error_log("Error uploading profile picture: " . $e->getMessage());
        sendErrorResponse('Failed to upload profile picture', 500, ['message' => $e->getMessage()]);
    }
}

// GET /api/profile/:uid/descriptor - Get face descriptor for specific employee
elseif ($method === 'GET' && is_numeric($endpoint) && isset($pathSegments[1]) && $pathSegments[1] === 'descriptor') {
    try {
        $uid = (int)$endpoint;
        
        $pdo = getConnection();
        $stmt = $pdo->prepare("
            SELECT uid, first_name, last_name, face_descriptor
            FROM emp_list 
            WHERE uid = ?
        ");
        $stmt->execute([$uid]);
        $employee = $stmt->fetch();
        
        if (!$employee) {
            sendErrorResponse('Employee not found', 404);
        }
        
        if (empty($employee['face_descriptor'])) {
            sendErrorResponse('No face descriptor found for this employee', 404);
        }
        
        // Decode the JSON descriptor
        $descriptor = json_decode($employee['face_descriptor'], true);
        
        if (!is_array($descriptor)) {
            sendErrorResponse('Invalid descriptor data', 500);
        }
        
        sendJsonResponse([
            'success' => true,
            'data' => [
                'uid' => $employee['uid'],
                'name' => "{$employee['first_name']} {$employee['last_name']}",
                'descriptor' => $descriptor
            ],
            'descriptor' => $descriptor
        ]);
        
    } catch (Exception $e) {
        error_log("Error fetching face descriptor: " . $e->getMessage());
        sendErrorResponse('Failed to fetch face descriptor', 500, ['message' => $e->getMessage()]);
    }
}

// POST /api/profile/:uid/descriptor - Save face descriptor for employee
elseif ($method === 'POST' && is_numeric($endpoint) && isset($pathSegments[1]) && $pathSegments[1] === 'descriptor') {
    try {
        $uid = (int)$endpoint;
        
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['descriptor']) || !is_array($input['descriptor'])) {
            sendErrorResponse('Descriptor array is required', 400);
        }
        
        $descriptor = $input['descriptor'];
        
        // Validate descriptor is an array of 128 numbers
        if (count($descriptor) !== 128) {
            sendErrorResponse('Descriptor must contain exactly 128 values', 400);
        }
        
        foreach ($descriptor as $value) {
            if (!is_numeric($value)) {
                sendErrorResponse('Descriptor must contain only numeric values', 400);
            }
        }
        
        $pdo = getConnection();
        
        // Check if employee exists
        $stmt = $pdo->prepare("SELECT uid, first_name, last_name FROM emp_list WHERE uid = ?");
        $stmt->execute([$uid]);
        $employee = $stmt->fetch();
        
        if (!$employee) {
            sendErrorResponse('Employee not found', 404);
        }
        
        // Save descriptor as JSON
        $descriptorJson = json_encode($descriptor);
        
        $stmt = $pdo->prepare("
            UPDATE emp_list 
            SET face_descriptor = ?,
                updated_at = NOW()
            WHERE uid = ?
        ");
        $stmt->execute([$descriptorJson, $uid]);
        
        sendJsonResponse([
            'success' => true,
            'message' => 'Face descriptor saved successfully',
            'data' => [
                'uid' => $employee['uid'],
                'name' => "{$employee['first_name']} {$employee['last_name']}",
                'descriptor_length' => count($descriptor)
            ]
        ], 201);
        
    } catch (Exception $e) {
        error_log("Error saving face descriptor: " . $e->getMessage());
        sendErrorResponse('Failed to save face descriptor', 500, ['message' => $e->getMessage()]);
    }
}

// PUT /api/profile/:uid/descriptor - Update face descriptor for employee
elseif ($method === 'PUT' && is_numeric($endpoint) && isset($pathSegments[1]) && $pathSegments[1] === 'descriptor') {
    try {
        $uid = (int)$endpoint;
        
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['descriptor']) || !is_array($input['descriptor'])) {
            sendErrorResponse('Descriptor array is required', 400);
        }
        
        $descriptor = $input['descriptor'];
        
        // Validate descriptor is an array of 128 numbers
        if (count($descriptor) !== 128) {
            sendErrorResponse('Descriptor must contain exactly 128 values', 400);
        }
        
        foreach ($descriptor as $value) {
            if (!is_numeric($value)) {
                sendErrorResponse('Descriptor must contain only numeric values', 400);
            }
        }
        
        $pdo = getConnection();
        
        // Check if employee exists and has a descriptor
        $stmt = $pdo->prepare("
            SELECT uid, first_name, last_name, face_descriptor 
            FROM emp_list 
            WHERE uid = ?
        ");
        $stmt->execute([$uid]);
        $employee = $stmt->fetch();
        
        if (!$employee) {
            sendErrorResponse('Employee not found', 404);
        }
        
        if (empty($employee['face_descriptor'])) {
            sendErrorResponse('No existing descriptor found. Use POST to create a new descriptor.', 404);
        }
        
        // Update descriptor
        $descriptorJson = json_encode($descriptor);
        
        $stmt = $pdo->prepare("
            UPDATE emp_list 
            SET face_descriptor = ?,
                updated_at = NOW()
            WHERE uid = ?
        ");
        $stmt->execute([$descriptorJson, $uid]);
        
        sendJsonResponse([
            'success' => true,
            'message' => 'Face descriptor updated successfully',
            'data' => [
                'uid' => $employee['uid'],
                'name' => "{$employee['first_name']} {$employee['last_name']}",
                'descriptor_length' => count($descriptor)
            ]
        ]);
        
    } catch (Exception $e) {
        error_log("Error updating face descriptor: " . $e->getMessage());
        sendErrorResponse('Failed to update face descriptor', 500, ['message' => $e->getMessage()]);
    }
}

// DELETE /api/profile/:uid/descriptor - Delete face descriptor for employee
elseif ($method === 'DELETE' && is_numeric($endpoint) && isset($pathSegments[1]) && $pathSegments[1] === 'descriptor') {
    try {
        $uid = (int)$endpoint;
        
        $pdo = getConnection();
        
        // Check if employee exists
        $stmt = $pdo->prepare("
            SELECT uid, first_name, last_name, face_descriptor 
            FROM emp_list 
            WHERE uid = ?
        ");
        $stmt->execute([$uid]);
        $employee = $stmt->fetch();
        
        if (!$employee) {
            sendErrorResponse('Employee not found', 404);
        }
        
        if (empty($employee['face_descriptor'])) {
            sendErrorResponse('No face descriptor found for this employee', 404);
        }
        
        // Delete descriptor
        $stmt = $pdo->prepare("
            UPDATE emp_list 
            SET face_descriptor = NULL,
                updated_at = NOW()
            WHERE uid = ?
        ");
        $stmt->execute([$uid]);
        
        sendJsonResponse([
            'success' => true,
            'message' => 'Face descriptor deleted successfully',
            'data' => [
                'uid' => $employee['uid'],
                'name' => "{$employee['first_name']} {$employee['last_name']}"
            ]
        ]);
        
    } catch (Exception $e) {
        error_log("Error deleting face descriptor: " . $e->getMessage());
        sendErrorResponse('Failed to delete face descriptor', 500, ['message' => $e->getMessage()]);
    }
}

// GET /api/profile/:uid/info - Get profile picture information
elseif ($method === 'GET' && is_numeric($endpoint) && isset($pathSegments[1]) && $pathSegments[1] === 'info') {
    try {
        $uid = (int)$endpoint;
        
        $pdo = getConnection();
        $stmt = $pdo->prepare("SELECT uid, first_name, last_name, profile_picture FROM emp_list WHERE uid = ?");
        $stmt->execute([$uid]);
        $employee = $stmt->fetch();
        
        if (!$employee) {
            sendErrorResponse('Employee not found', 404);
        }
        
        $profileDir = getcwd() . "/uploads/{$uid}/profiles";
        $profilePictures = [];
        
        if (is_dir($profileDir)) {
            $files = scandir($profileDir);
            $imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
            
            foreach ($files as $file) {
                if ($file === '.' || $file === '..') continue;
                $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
                if (in_array('.' . $ext, $imageExtensions)) {
                    $filePath = $profileDir . '/' . $file;
                    $stats = stat($filePath);
                    
                    $profilePictures[] = [
                        'filename' => $file,
                        'size' => $stats['size'],
                        'modified' => date('c', $stats['mtime']),
                        'extension' => '.' . $ext,
                        'url' => "/api/profile/{$uid}/{$file}"
                    ];
                }
            }
        }
        
        sendJsonResponse([
            'success' => true,
            'data' => [
                'employee' => [
                    'uid' => $employee['uid'],
                    'name' => "{$employee['first_name']} {$employee['last_name']}",
                    'has_blob_data' => !empty($employee['profile_picture'])
                ],
                'profile_pictures' => $profilePictures,
                'directory' => $profileDir
            ]
        ]);
        
    } catch (Exception $e) {
        error_log("Error retrieving profile picture info: " . $e->getMessage());
        sendErrorResponse('Failed to retrieve profile picture information', 500, ['message' => $e->getMessage()]);
    }
}

// GET /api/profile/:uid/:filename - Get specific profile picture file
elseif ($method === 'GET' && is_numeric($endpoint) && isset($pathSegments[1]) && $pathSegments[1] !== 'info' && $pathSegments[1] !== 'upload' && $pathSegments[1] !== 'upload-replace' && $pathSegments[1] !== 'descriptor') {
    try {
        $uid = (int)$endpoint;
        $filename = $pathSegments[1];
        
        if (empty($filename)) {
            sendErrorResponse('Filename is required', 400);
        }
        
        $pdo = getConnection();
        $stmt = $pdo->prepare("SELECT uid FROM emp_list WHERE uid = ?");
        $stmt->execute([$uid]);
        $employee = $stmt->fetch();
        
        if (!$employee) {
            sendErrorResponse('Employee not found', 404);
        }
        
        // Validate filename to prevent directory traversal
        if (strpos($filename, '..') !== false || strpos($filename, '/') !== false || strpos($filename, '\\') !== false) {
            sendErrorResponse('Invalid filename', 400);
        }
        
        $profilePath = getcwd() . "/uploads/{$uid}/profiles/{$filename}";
        
        if (!file_exists($profilePath)) {
            sendErrorResponse('Profile picture file not found', 404);
        }
        
        // Validate file extension
        $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        $imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
        
        if (!in_array($ext, $imageExtensions)) {
            sendErrorResponse('Invalid image file type', 400);
        }
        
        // Set appropriate content type
        $contentTypes = [
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'gif' => 'image/gif',
            'webp' => 'image/webp',
            'bmp' => 'image/bmp'
        ];
        
        $contentType = $contentTypes[$ext] ?? 'application/octet-stream';
        $fileSize = filesize($profilePath);
        $lastModified = filemtime($profilePath);
        
        // Set headers
        header("Content-Type: {$contentType}");
        header("Content-Length: {$fileSize}");
        header('Cache-Control: public, max-age=3600');
        header('Last-Modified: ' . gmdate('D, d M Y H:i:s', $lastModified) . ' GMT');
        header("Content-Disposition: inline; filename=\"{$filename}\"");
        
        // Check if client has cached version
        if (isset($_SERVER['HTTP_IF_MODIFIED_SINCE'])) {
            $ifModifiedSince = strtotime($_SERVER['HTTP_IF_MODIFIED_SINCE']);
            if ($ifModifiedSince >= $lastModified) {
                http_response_code(304);
                exit();
            }
        }
        
        // Stream the file
        readfile($profilePath);
        exit();
        
    } catch (Exception $e) {
        error_log("Error retrieving specific profile picture: " . $e->getMessage());
        sendErrorResponse('Failed to retrieve profile picture', 500, ['message' => $e->getMessage()]);
    }
}

// DELETE /api/profile/:uid/:filename - Delete specific profile picture
elseif ($method === 'DELETE' && is_numeric($endpoint) && isset($pathSegments[1]) && $pathSegments[1] !== 'descriptor') {
    try {
        $uid = (int)$endpoint;
        $filename = $pathSegments[1];
        
        if (empty($filename)) {
            sendErrorResponse('Filename is required', 400);
        }
        
        $pdo = getConnection();
        $stmt = $pdo->prepare("SELECT uid FROM emp_list WHERE uid = ?");
        $stmt->execute([$uid]);
        $employee = $stmt->fetch();
        
        if (!$employee) {
            sendErrorResponse('Employee not found', 404);
        }
        
        // Validate filename to prevent directory traversal
        if (strpos($filename, '..') !== false || strpos($filename, '/') !== false || strpos($filename, '\\') !== false) {
            sendErrorResponse('Invalid filename', 400);
        }
        
        $profilePath = getcwd() . "/uploads/{$uid}/profiles/{$filename}";
        
        if (!file_exists($profilePath)) {
            sendErrorResponse('Profile picture file not found', 404);
        }
        
        if (!unlink($profilePath)) {
            sendErrorResponse('Failed to delete profile picture', 500);
        }
        
        sendJsonResponse([
            'success' => true,
            'message' => 'Profile picture deleted successfully',
            'data' => [
                'uid' => $uid,
                'filename' => $filename
            ]
        ]);
        
    } catch (Exception $e) {
        error_log("Error deleting profile picture: " . $e->getMessage());
        sendErrorResponse('Failed to delete profile picture', 500, ['message' => $e->getMessage()]);
    }
}
elseif ($method === 'GET' && is_numeric($endpoint) && !isset($pathSegments[1])) {
    try {
        $uid = (int)$endpoint;
        
        $pdo = getConnection();
        $stmt = $pdo->prepare("SELECT uid, first_name, last_name FROM emp_list WHERE uid = ?");
        $stmt->execute([$uid]);
        $employee = $stmt->fetch();
        
        if (!$employee) {
            sendErrorResponse('Employee not found', 404);
        }
        
        $profileDir = getcwd() . "/uploads/{$uid}/profiles";
        
        if (!is_dir($profileDir)) {
            sendErrorResponse('Profile picture directory not found for this employee', 404);
        }
        
        $files = scandir($profileDir);
        $imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
        $profilePictures = [];
        
        foreach ($files as $file) {
            if ($file === '.' || $file === '..') continue;
            $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
            if (in_array('.' . $ext, $imageExtensions)) {
                $profilePictures[] = $file;
            }
        }
        
        if (count($profilePictures) === 0) {
            sendErrorResponse('No profile picture found for this employee', 404);
        }
        
        $profilePicture = $profilePictures[0];
        $profilePath = $profileDir . '/' . $profilePicture;
        
        $ext = strtolower(pathinfo($profilePicture, PATHINFO_EXTENSION));
        $contentTypes = [
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'gif' => 'image/gif',
            'webp' => 'image/webp',
            'bmp' => 'image/bmp'
        ];
        
        $contentType = $contentTypes[$ext] ?? 'application/octet-stream';
        $fileSize = filesize($profilePath);
        $lastModified = filemtime($profilePath);
        
        // Set headers
        header("Content-Type: {$contentType}");
        header("Content-Length: {$fileSize}");
        header('Cache-Control: public, max-age=3600');
        header('Last-Modified: ' . gmdate('D, d M Y H:i:s', $lastModified) . ' GMT');
        
        // Check if client has cached version
        if (isset($_SERVER['HTTP_IF_MODIFIED_SINCE'])) {
            $ifModifiedSince = strtotime($_SERVER['HTTP_IF_MODIFIED_SINCE']);
            if ($ifModifiedSince >= $lastModified) {
                http_response_code(304);
                exit();
            }
        }
        
        // Stream the file
        readfile($profilePath);
        exit();
        
    } catch (Exception $e) {
        error_log("Error retrieving profile picture: " . $e->getMessage());
        sendErrorResponse('Failed to retrieve profile picture', 500, ['message' => $e->getMessage()]);
    }
}

// Unknown route
else {
    sendErrorResponse('Profile endpoint not found', 404, [
        'method' => $method,
        'endpoint' => $endpoint
    ]);
}
?>