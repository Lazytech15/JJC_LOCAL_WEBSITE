<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/headers.php';

// CALL THIS AT THE START
setApiHeaders();

// Then all your route handling code...
$requestMethod = $_SERVER['REQUEST_METHOD'];
$pathSegments = explode('/', trim($path, '/'));

// Helper function to get document info for a single employee
function getEmployeeDocumentInfo($uid) {
    $documentsDir = __DIR__ . "/../uploads/{$uid}/documents";
    
    if (!is_dir($documentsDir)) {
        return [];
    }
    
    $allowedExtensions = [
        '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
        '.txt', '.csv', '.rtf', '.jpg', '.jpeg', '.png', '.gif', 
        '.webp', '.bmp', '.zip', '.rar'
    ];
    
    $documents = [];
    $files = scandir($documentsDir);
    
    foreach ($files as $file) {
        if ($file === '.' || $file === '..') continue;
        
        $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
        $extWithDot = '.' . $ext;
        
        if (in_array($extWithDot, $allowedExtensions)) {
            $filePath = $documentsDir . '/' . $file;
            $stats = stat($filePath);
            
            $documents[] = [
                'filename' => $file,
                'size' => $stats['size'],
                'modified' => date('c', $stats['mtime']),
                'extension' => $extWithDot,
                'url' => "/api/documents/{$uid}/{$file}",
                'type' => getDocumentType($extWithDot),
                'originalName' => preg_replace('/_\d+\./', '.', $file) // Extract original name
            ];
        }
    }
    
    // Sort by modification date, newest first
    usort($documents, function($a, $b) {
        return strtotime($b['modified']) - strtotime($a['modified']);
    });
    
    return $documents;
}

// Helper function to determine document type based on extension
function getDocumentType($extension) {
    $types = [
        '.pdf' => 'PDF Document',
        '.doc' => 'Word Document',
        '.docx' => 'Word Document',
        '.xls' => 'Excel Spreadsheet',
        '.xlsx' => 'Excel Spreadsheet',
        '.ppt' => 'PowerPoint Presentation',
        '.pptx' => 'PowerPoint Presentation',
        '.txt' => 'Text File',
        '.csv' => 'CSV File',
        '.rtf' => 'Rich Text Format',
        '.jpg' => 'Image',
        '.jpeg' => 'Image',
        '.png' => 'Image',
        '.gif' => 'Image',
        '.webp' => 'Image',
        '.bmp' => 'Image',
        '.zip' => 'Archive',
        '.rar' => 'Archive'
    ];
    return $types[strtolower($extension)] ?? 'Document';
}

// Helper function to get MIME type
function getContentType($extension) {
    $contentTypes = [
        '.pdf' => 'application/pdf',
        '.doc' => 'application/msword',
        '.docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.xls' => 'application/vnd.ms-excel',
        '.xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.ppt' => 'application/vnd.ms-powerpoint',
        '.pptx' => 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        '.txt' => 'text/plain',
        '.csv' => 'text/csv',
        '.rtf' => 'application/rtf',
        '.jpg' => 'image/jpeg',
        '.jpeg' => 'image/jpeg',
        '.png' => 'image/png',
        '.gif' => 'image/gif',
        '.webp' => 'image/webp',
        '.bmp' => 'image/bmp',
        '.zip' => 'application/zip',
        '.rar' => 'application/x-rar-compressed'
    ];
    return $contentTypes[strtolower($extension)] ?? 'application/octet-stream';
}

// Parse request
$requestMethod = $_SERVER['REQUEST_METHOD'];
$pathSegments = explode('/', trim($path, '/'));
array_shift($pathSegments); // Remove 'documents'

$action = $pathSegments[0] ?? null;
$uid = null;
$filename = null;

// Route handling
try {
    // GET /api/documents/bulk - Get all employees with their documents
    if ($requestMethod === 'GET' && $action === 'bulk' && !isset($pathSegments[1])) {
        $db = getConnection();
        
        // Get query parameters
        $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
        $offset = ($page - 1) * $limit;
        $search = $_GET['search'] ?? '';
        $department = $_GET['department'] ?? '';
        $documentType = $_GET['document_type'] ?? '';
        
        // Build query
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
        $countStmt = $db->prepare("SELECT COUNT(*) as total FROM emp_list {$whereClause}");
        foreach ($params as $i => $param) {
            $countStmt->bindValue($i + 1, $param);
        }
        $countStmt->execute();
        $totalEmployees = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];
        
        // Get employees
        $employeesStmt = $db->prepare("
            SELECT uid, first_name, last_name, department, position, email
            FROM emp_list 
            {$whereClause}
            ORDER BY first_name, last_name
            LIMIT ? OFFSET ?
        ");
        foreach ($params as $i => $param) {
            $employeesStmt->bindValue($i + 1, $param);
        }
        $employeesStmt->bindValue(count($params) + 1, $limit, PDO::PARAM_INT);
        $employeesStmt->bindValue(count($params) + 2, $offset, PDO::PARAM_INT);
        $employeesStmt->execute();
        $employees = $employeesStmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Get documents for each employee
        $employeesWithDocuments = [];
        foreach ($employees as $employee) {
            $documents = getEmployeeDocumentInfo($employee['uid']);
            
            // Filter by document type if specified
            if ($documentType) {
                $documents = array_filter($documents, function($doc) use ($documentType) {
                    return stripos($doc['type'], $documentType) !== false;
                });
                $documents = array_values($documents);
            }
            
            $employeesWithDocuments[] = [
                'uid' => $employee['uid'],
                'name' => "{$employee['first_name']} {$employee['last_name']}",
                'first_name' => $employee['first_name'],
                'last_name' => $employee['last_name'],
                'department' => $employee['department'],
                'position' => $employee['position'],
                'email' => $employee['email'],
                'documents' => $documents,
                'document_count' => count($documents),
                'total_size' => array_sum(array_column($documents, 'size')),
                'document_types' => array_values(array_unique(array_column($documents, 'type')))
            ];
        }
        
        // Calculate pagination
        $totalPages = ceil($totalEmployees / $limit);
        $hasNextPage = $page < $totalPages;
        $hasPreviousPage = $page > 1;
        
        sendSuccessResponse([
            'employees' => $employeesWithDocuments,
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
                'department' => $department ?: null,
                'document_type' => $documentType ?: null
            ],
            'statistics' => [
                'employees_with_documents' => count(array_filter($employeesWithDocuments, fn($e) => $e['document_count'] > 0)),
                'employees_without_documents' => count(array_filter($employeesWithDocuments, fn($e) => $e['document_count'] === 0)),
                'total_documents' => array_sum(array_column($employeesWithDocuments, 'document_count')),
                'total_size_bytes' => array_sum(array_column($employeesWithDocuments, 'total_size'))
            ]
        ]);
    }
    
    // GET /api/documents/bulk/simple - Get simplified list
    elseif ($requestMethod === 'GET' && $action === 'bulk' && ($pathSegments[1] ?? '') === 'simple') {
        $db = getConnection();
        
        $stmt = $db->query("
            SELECT uid, first_name, last_name, department
            FROM emp_list 
            ORDER BY first_name, last_name
        ");
        $employees = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $results = [];
        foreach ($employees as $employee) {
            $documentsDir = __DIR__ . "/../uploads/{$employee['uid']}/documents";
            $documentCount = 0;
            
            if (is_dir($documentsDir)) {
                $files = scandir($documentsDir);
                $allowedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv', '.rtf', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.zip', '.rar'];
                
                foreach ($files as $file) {
                    if ($file === '.' || $file === '..') continue;
                    $ext = '.' . strtolower(pathinfo($file, PATHINFO_EXTENSION));
                    if (in_array($ext, $allowedExtensions)) {
                        $documentCount++;
                    }
                }
            }
            
            $results[] = [
                'uid' => $employee['uid'],
                'name' => "{$employee['first_name']} {$employee['last_name']}",
                'department' => $employee['department'],
                'has_documents' => $documentCount > 0,
                'document_count' => $documentCount
            ];
        }
        
        sendSuccessResponse([
            'employees' => $results,
            'statistics' => [
                'total_employees' => count($results),
                'with_documents' => count(array_filter($results, fn($e) => $e['has_documents'])),
                'without_documents' => count(array_filter($results, fn($e) => !$e['has_documents'])),
                'total_document_count' => array_sum(array_column($results, 'document_count'))
            ]
        ]);
    }
    
    // GET /api/documents/bulk/download - Download all documents as ZIP
    elseif ($requestMethod === 'GET' && $action === 'bulk' && ($pathSegments[1] ?? '') === 'download') {
        $db = getConnection();
        
        $department = $_GET['department'] ?? '';
        $search = $_GET['search'] ?? '';
        $documentType = $_GET['document_type'] ?? '';
        $uids = isset($_GET['uids']) ? array_map('intval', explode(',', $_GET['uids'])) : [];
        
        // Build query
        $whereClause = 'WHERE 1=1';
        $params = [];
        
        if (!empty($uids)) {
            $placeholders = implode(',', array_fill(0, count($uids), '?'));
            $whereClause .= " AND uid IN ({$placeholders})";
            $params = $uids;
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
        
        $stmt = $db->prepare("
            SELECT uid, first_name, last_name, department, position
            FROM emp_list 
            {$whereClause}
            ORDER BY first_name, last_name
        ");
        foreach ($params as $i => $param) {
            $stmt->bindValue($i + 1, $param);
        }
        $stmt->execute();
        $employees = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (empty($employees)) {
            sendErrorResponse('No employees found matching the criteria', 404);
        }
        
        // Create ZIP
        $timestamp = date('Y-m-d_H-i-s');
        $zipFilename = "employee_documents_{$timestamp}.zip";
        $zipPath = sys_get_temp_dir() . '/' . $zipFilename;
        
        $zip = new ZipArchive();
        if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            sendErrorResponse('Failed to create ZIP archive', 500);
        }
        
        $addedCount = 0;
        $skippedCount = 0;
        $errors = [];
        $allowedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv', '.rtf', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.zip', '.rar'];
        
        foreach ($employees as $employee) {
            $documentsDir = __DIR__ . "/../uploads/{$employee['uid']}/documents";
            
            if (!is_dir($documentsDir)) {
                $skippedCount++;
                $errors[] = [
                    'uid' => $employee['uid'],
                    'name' => "{$employee['first_name']} {$employee['last_name']}",
                    'reason' => 'Documents directory not found'
                ];
                continue;
            }
            
            $files = scandir($documentsDir);
            $documentFiles = [];
            
            foreach ($files as $file) {
                if ($file === '.' || $file === '..') continue;
                $ext = '.' . strtolower(pathinfo($file, PATHINFO_EXTENSION));
                
                if (in_array($ext, $allowedExtensions)) {
                    if ($documentType) {
                        $type = getDocumentType($ext);
                        if (stripos($type, $documentType) !== false) {
                            $documentFiles[] = $file;
                        }
                    } else {
                        $documentFiles[] = $file;
                    }
                }
            }
            
            if (empty($documentFiles)) {
                $skippedCount++;
                $errors[] = [
                    'uid' => $employee['uid'],
                    'name' => "{$employee['first_name']} {$employee['last_name']}",
                    'reason' => 'No matching document files found'
                ];
                continue;
            }
            
            $employeeName = preg_replace('/[^a-zA-Z0-9]/', '_', "{$employee['first_name']}_{$employee['last_name']}");
            $employeeFolder = "{$employee['uid']}_{$employeeName}/";
            
            foreach ($documentFiles as $file) {
                $sourcePath = $documentsDir . '/' . $file;
                $zip->addFile($sourcePath, $employeeFolder . $file);
                $addedCount++;
            }
        }
        
        // Add summary
        $summary = [
            'generated_at' => date('c'),
            'total_employees' => count($employees),
            'documents_included' => $addedCount,
            'employees_skipped' => $skippedCount,
            'filters_applied' => [
                'department' => $department ?: null,
                'search' => $search ?: null,
                'document_type' => $documentType ?: null,
                'specific_uids' => !empty($uids) ? $uids : null
            ],
            'errors' => $errors
        ];
        
        $zip->addFromString('download_summary.json', json_encode($summary, JSON_PRETTY_PRINT));
        $zip->close();
        
        // Send file
        header('Content-Type: application/zip');
        header("Content-Disposition: attachment; filename=\"{$zipFilename}\"");
        header('Content-Length: ' . filesize($zipPath));
        header('Cache-Control: private, no-cache');
        readfile($zipPath);
        unlink($zipPath);
        exit;
    }
    
    // POST /api/documents/bulk/download - Download with POST body
    elseif ($requestMethod === 'POST' && $action === 'bulk' && ($pathSegments[1] ?? '') === 'download') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $uids = $input['uids'] ?? [];
        $documentType = $input['document_type'] ?? '';
        $includeSummary = $input['include_summary'] ?? true;
        $compressionLevel = max(0, min(9, $input['compression_level'] ?? 6));
        
        if (empty($uids) || !is_array($uids)) {
            sendErrorResponse('UIDs array is required in request body', 400);
        }
        
        $validUids = array_map('intval', array_filter($uids, 'is_numeric'));
        
        if (empty($validUids)) {
            sendErrorResponse('No valid UIDs provided', 400);
        }
        
        $db = getConnection();
        $placeholders = implode(',', array_fill(0, count($validUids), '?'));
        $stmt = $db->prepare("
            SELECT uid, first_name, last_name, department, position
            FROM emp_list 
            WHERE uid IN ({$placeholders})
            ORDER BY first_name, last_name
        ");
        foreach ($validUids as $i => $uid) {
            $stmt->bindValue($i + 1, $uid, PDO::PARAM_INT);
        }
        $stmt->execute();
        $employees = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (empty($employees)) {
            sendErrorResponse('No employees found for the provided UIDs', 404);
        }
        
        // Create ZIP (same as GET method)
        $timestamp = date('Y-m-d_H-i-s');
        $zipFilename = "employee_documents_{$timestamp}.zip";
        $zipPath = sys_get_temp_dir() . '/' . $zipFilename;
        
        $zip = new ZipArchive();
        if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            sendErrorResponse('Failed to create ZIP archive', 500);
        }
        
        $addedCount = 0;
        $skippedCount = 0;
        $errors = [];
        $allowedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv', '.rtf', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.zip', '.rar'];
        
        foreach ($employees as $employee) {
            $documentsDir = __DIR__ . "/../uploads/{$employee['uid']}/documents";
            
            if (!is_dir($documentsDir)) {
                $skippedCount++;
                $errors[] = [
                    'uid' => $employee['uid'],
                    'name' => "{$employee['first_name']} {$employee['last_name']}",
                    'reason' => 'Documents directory not found'
                ];
                continue;
            }
            
            $files = scandir($documentsDir);
            $documentFiles = [];
            
            foreach ($files as $file) {
                if ($file === '.' || $file === '..') continue;
                $ext = '.' . strtolower(pathinfo($file, PATHINFO_EXTENSION));
                
                if (in_array($ext, $allowedExtensions)) {
                    if ($documentType) {
                        $type = getDocumentType($ext);
                        if (stripos($type, $documentType) !== false) {
                            $documentFiles[] = $file;
                        }
                    } else {
                        $documentFiles[] = $file;
                    }
                }
            }
            
            if (empty($documentFiles)) {
                $skippedCount++;
                $errors[] = [
                    'uid' => $employee['uid'],
                    'name' => "{$employee['first_name']} {$employee['last_name']}",
                    'reason' => 'No matching document files found'
                ];
                continue;
            }
            
            $employeeName = preg_replace('/[^a-zA-Z0-9]/', '_', "{$employee['first_name']}_{$employee['last_name']}");
            $employeeFolder = "{$employee['uid']}_{$employeeName}/";
            
            foreach ($documentFiles as $file) {
                $sourcePath = $documentsDir . '/' . $file;
                $zip->addFile($sourcePath, $employeeFolder . $file);
                $addedCount++;
            }
        }
        
        if ($includeSummary) {
            $summary = [
                'generated_at' => date('c'),
                'requested_uids' => $validUids,
                'total_employees_found' => count($employees),
                'documents_included' => $addedCount,
                'employees_skipped' => $skippedCount,
                'compression_level' => $compressionLevel,
                'document_type_filter' => $documentType ?: null,
                'errors' => $errors
            ];
            
            $zip->addFromString('download_summary.json', json_encode($summary, JSON_PRETTY_PRINT));
        }
        
        $zip->close();
        
        // Send file
        header('Content-Type: application/zip');
        header("Content-Disposition: attachment; filename=\"{$zipFilename}\"");
        header('Content-Length: ' . filesize($zipPath));
        header('Cache-Control: private, no-cache');
        readfile($zipPath);
        unlink($zipPath);
        exit;
    }
    
    // POST /api/documents/:uid/upload - Upload documents
    elseif ($requestMethod === 'POST' && is_numeric($action) && ($pathSegments[1] ?? '') === 'upload') {
        $uid = (int)$action;
        
        if (empty($_FILES['documents'])) {
            sendErrorResponse('No files uploaded', 400);
        }
        
        $db = getConnection();
        $stmt = $db->prepare("SELECT uid, first_name, last_name FROM emp_list WHERE uid = ?");
        $stmt->execute([$uid]);
        $employee = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$employee) {
            sendErrorResponse('Employee not found', 404);
        }
        
        $documentsDir = __DIR__ . "/../uploads/{$uid}/documents";
        if (!is_dir($documentsDir)) {
            mkdir($documentsDir, 0755, true);
        }
        
        $uploadedFiles = [];
        $errors = [];
        $allowedMimes = [
            'application/pdf', 'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'text/plain', 'text/csv', 'application/rtf',
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
            'image/webp', 'image/bmp',
            'application/zip', 'application/x-rar-compressed'
        ];
        
        $files = $_FILES['documents'];
        $fileCount = is_array($files['name']) ? count($files['name']) : 1;
        
        for ($i = 0; $i < $fileCount; $i++) {
            $fileName = is_array($files['name']) ? $files['name'][$i] : $files['name'];
            $fileTmpName = is_array($files['tmp_name']) ? $files['tmp_name'][$i] : $files['tmp_name'];
            $fileSize = is_array($files['size']) ? $files['size'][$i] : $files['size'];
            $fileError = is_array($files['error']) ? $files['error'][$i] : $files['error'];
            $fileType = is_array($files['type']) ? $files['type'][$i] : $files['type'];
            
            if ($fileError !== UPLOAD_ERR_OK) {
                $errors[] = ['filename' => $fileName, 'error' => 'Upload error'];
                continue;
            }
            
            if ($fileSize > 50 * 1024 * 1024) {
                $errors[] = ['filename' => $fileName, 'error' => 'File too large (max 50MB)'];
                continue;
            }
            
            if (!in_array($fileType, $allowedMimes)) {
                $errors[] = ['filename' => $fileName, 'error' => 'Invalid file type'];
                continue;
            }
            
            $timestamp = time();
            $ext = pathinfo($fileName, PATHINFO_EXTENSION);
            $baseName = pathinfo($fileName, PATHINFO_FILENAME);
            $newFileName = "{$baseName}_{$timestamp}.{$ext}";
            $destination = $documentsDir . '/' . $newFileName;
            
            if (move_uploaded_file($fileTmpName, $destination)) {
                $uploadedFiles[] = [
                    'filename' => $newFileName,
                    'originalName' => $fileName,
                    'size' => filesize($destination),
                    'mimetype' => $fileType,
                    'type' => getDocumentType('.' . $ext),
                    'url' => "/api/documents/{$uid}/{$newFileName}",
                    'uploadedAt' => date('c')
                ];
            } else {
                $errors[] = ['filename' => $fileName, 'error' => 'Failed to save file'];
            }
        }
        
        $statusCode = empty($errors) ? 201 : (count($uploadedFiles) > 0 ? 207 : 500);
        
        http_response_code($statusCode);
        echo json_encode([
            'success' => count($uploadedFiles) > 0,
            'message' => empty($errors) ? 
                'Documents uploaded successfully' : 
                count($uploadedFiles) . ' documents uploaded successfully, ' . count($errors) . ' failed',
            'data' => [
                'employee' => [
                    'uid' => $employee['uid'],
                    'name' => "{$employee['first_name']} {$employee['last_name']}"
                ],
                'uploaded_files' => $uploadedFiles,
                'failed_files' => count($errors) > 0 ? $errors : null,
                'directory' => $documentsDir
            ]
        ]);
        exit;
    }
    
    // GET /api/documents/:uid - Get employee document list
    elseif ($requestMethod === 'GET' && is_numeric($action) && !isset($pathSegments[1])) {
        $uid = (int)$action;
        
        $db = getConnection();
        $stmt = $db->prepare("SELECT uid, first_name, last_name FROM emp_list WHERE uid = ?");
        $stmt->execute([$uid]);
        $employee = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$employee) {
            sendErrorResponse('Employee not found', 404);
        }
        
        $documents = getEmployeeDocumentInfo($uid);
        
        sendSuccessResponse([
            'employee' => [
                'uid' => $employee['uid'],
                'name' => "{$employee['first_name']} {$employee['last_name']}"
            ],
            'documents' => $documents,
            'document_count' => count($documents),
            'total_size' => array_sum(array_column($documents, 'size')),
            'document_types' => array_values(array_unique(array_column($documents, 'type')))
        ]);
    }
    
    // GET /api/document/:uid/:filename - Get specific document
    elseif ($requestMethod === 'GET' && is_numeric($action) && isset($pathSegments[1]) && $pathSegments[1] !== 'upload') {
        $uid = (int)$action;
        $filename = $pathSegments[1];
        
        // IMPORTANT: Decode URL-encoded filename (%20 becomes space, etc)
        $filename = urldecode($filename);
        
        // Security: prevent path traversal attacks
        $filename = basename($filename);
        
        // Check if this is a download request via header or query parameter
        $isDownload = (isset($_SERVER['HTTP_X_DOWNLOAD']) && $_SERVER['HTTP_X_DOWNLOAD'] === 'true') 
                      || (isset($_GET['download']) && $_GET['download'] === 'true');
        
        $db = getConnection();
        $stmt = $db->prepare("SELECT uid FROM emp_list WHERE uid = ?");
        $stmt->execute([$uid]);
        
        if (!$stmt->fetch()) {
            sendErrorResponse('Employee not found', 404);
        }
        
        $documentPath = __DIR__ . "/../uploads/{$uid}/documents/{$filename}";
        
        // Debug: log the path being checked
        error_log("[Document API] Looking for document at: {$documentPath}");
        error_log("[Document API] Document exists: " . (file_exists($documentPath) ? 'YES' : 'NO'));
        error_log("[Document API] Decoded filename: {$filename}");
        error_log("[Document API] UID: {$uid}");
        
        if (!file_exists($documentPath)) {
            // List available files for debugging
            $docsDir = __DIR__ . "/../uploads/{$uid}/documents";
            if (is_dir($docsDir)) {
                $availableFiles = scandir($docsDir);
                error_log("[Document API] Available files: " . json_encode($availableFiles));
            }
            sendErrorResponse('Document file not found', 404);
        }
        
        $ext = '.' . strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        $allowedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv', '.rtf', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.zip', '.rar'];
        
        if (!in_array($ext, $allowedExtensions)) {
            sendErrorResponse('Invalid document file type', 400);
        }
        
        $contentType = getContentType($ext);
        $fileSize = filesize($documentPath);
        $lastModified = filemtime($documentPath);
        
        // Check if-modified-since header (only for inline, not downloads)
        if (isset($_SERVER['HTTP_IF_MODIFIED_SINCE']) && !$isDownload) {
            $ifModifiedSince = strtotime($_SERVER['HTTP_IF_MODIFIED_SINCE']);
            if ($ifModifiedSince >= $lastModified) {
                http_response_code(304);
                exit;
            }
        }
        
        // Set standard headers
        header('Content-Type: ' . $contentType);
        header('Content-Length: ' . $fileSize);
        header('Last-Modified: ' . gmdate('D, d M Y H:i:s', $lastModified) . ' GMT');
        
        if ($isDownload) {
            // Extract original filename for download
            // Remove timestamp suffix if present (format: originalname_timestamp.ext)
            $cleanFilename = preg_replace('/_\d+\./', '.', $filename);
            
            header('Content-Disposition: attachment; filename="' . $cleanFilename . '"');
            header('Cache-Control: private, no-cache, no-store, must-revalidate');
            header('Pragma: no-cache');
            header('Expires: 0');
        } else {
            // Inline display for preview
            header('Content-Disposition: inline; filename="' . $filename . '"');
            header('Cache-Control: public, max-age=3600');
        }
        
        error_log("[Document API] Serving document: {$filename} (size: {$fileSize} bytes)");
        
        readfile($documentPath);
        exit;
    }
    
    // DELETE /api/document/:uid/:filename - Delete specific document
    elseif ($requestMethod === 'DELETE' && is_numeric($action) && isset($pathSegments[1])) {
        $uid = (int)$action;
        $filename = $pathSegments[1];
        
        // Decode and sanitize filename
        $filename = urldecode($filename);
        $filename = basename($filename);
        
        $db = getConnection();
        $stmt = $db->prepare("SELECT uid, first_name, last_name FROM emp_list WHERE uid = ?");
        $stmt->execute([$uid]);
        $employee = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$employee) {
            sendErrorResponse('Employee not found', 404);
        }
        
        $documentPath = __DIR__ . "/../uploads/{$uid}/documents/{$filename}";
        
        if (!file_exists($documentPath)) {
            sendErrorResponse('Document file not found', 404);
        }
        
        $ext = '.' . strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        $fileSize = filesize($documentPath);
        
        if (unlink($documentPath)) {
            error_log("[Document API] Deleted document: {$filename} from employee {$uid}");
            sendSuccessResponse([
                'message' => 'Document deleted successfully',
                'employee' => [
                    'uid' => $employee['uid'],
                    'name' => "{$employee['first_name']} {$employee['last_name']}"
                ],
                'deleted_file' => [
                    'filename' => $filename,
                    'size' => $fileSize,
                    'type' => getDocumentType($ext)
                ]
            ]);
    }
    
    // DELETE /api/documents/:uid - Delete all documents for an employee
    elseif ($requestMethod === 'DELETE' && is_numeric($action) && !isset($pathSegments[1])) {
        $uid = (int)$action;
        
        $db = getConnection();
        $stmt = $db->prepare("SELECT uid, first_name, last_name FROM emp_list WHERE uid = ?");
        $stmt->execute([$uid]);
        $employee = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$employee) {
            sendErrorResponse('Employee not found', 404);
        }
        
        $documentsDir = __DIR__ . "/../uploads/{$uid}/documents";
        
        if (!is_dir($documentsDir)) {
            sendSuccessResponse([
                'message' => 'No documents directory found',
                'employee' => [
                    'uid' => $employee['uid'],
                    'name' => "{$employee['first_name']} {$employee['last_name']}"
                ],
                'deleted_count' => 0
            ]);
        }
        
        $files = scandir($documentsDir);
        $allowedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv', '.rtf', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.zip', '.rar'];
        
        $deletedFiles = [];
        $errors = [];
        
        foreach ($files as $file) {
            if ($file === '.' || $file === '..') continue;
            
            $ext = '.' . strtolower(pathinfo($file, PATHINFO_EXTENSION));
            if (!in_array($ext, $allowedExtensions)) continue;
            
            $filePath = $documentsDir . '/' . $file;
            $fileSize = filesize($filePath);
            
            if (unlink($filePath)) {
                $deletedFiles[] = [
                    'filename' => $file,
                    'size' => $fileSize,
                    'type' => getDocumentType($ext)
                ];
            } else {
                $errors[] = [
                    'filename' => $file,
                    'error' => 'Failed to delete'
                ];
            }
        }
        
        sendSuccessResponse([
            'message' => count($deletedFiles) . ' documents deleted successfully',
            'employee' => [
                'uid' => $employee['uid'],
                'name' => "{$employee['first_name']} {$employee['last_name']}"
            ],
            'deleted_files' => $deletedFiles,
            'deleted_count' => count($deletedFiles),
            'failed_deletions' => count($errors) > 0 ? $errors : null
        ]);
    }
    
    // GET /api/documents/stats/overview - Get document statistics overview
    elseif ($requestMethod === 'GET' && $action === 'stats' && ($pathSegments[1] ?? '') === 'overview') {
        $db = getConnection();
        
        $stmt = $db->query("
            SELECT uid, first_name, last_name, department
            FROM emp_list 
            ORDER BY first_name, last_name
        ");
        $employees = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $totalDocuments = 0;
        $totalSize = 0;
        $employeesWithDocs = 0;
        $departmentStats = [];
        $typeStats = [];
        
        foreach ($employees as $employee) {
            $documents = getEmployeeDocumentInfo($employee['uid']);
            
            if (count($documents) > 0) {
                $employeesWithDocs++;
                $totalDocuments += count($documents);
                
                // Department stats
                if (!isset($departmentStats[$employee['department']])) {
                    $departmentStats[$employee['department']] = [
                        'employees' => 0,
                        'documents' => 0,
                        'size' => 0
                    ];
                }
                $departmentStats[$employee['department']]['employees']++;
                $departmentStats[$employee['department']]['documents'] += count($documents);
                
                // Process each document
                foreach ($documents as $doc) {
                    $totalSize += $doc['size'];
                    $departmentStats[$employee['department']]['size'] += $doc['size'];
                    
                    // Type stats
                    if (!isset($typeStats[$doc['type']])) {
                        $typeStats[$doc['type']] = [
                            'count' => 0,
                            'size' => 0
                        ];
                    }
                    $typeStats[$doc['type']]['count']++;
                    $typeStats[$doc['type']]['size'] += $doc['size'];
                }
            }
        }
        
        sendSuccessResponse([
            'overview' => [
                'total_employees' => count($employees),
                'employees_with_documents' => $employeesWithDocs,
                'employees_without_documents' => count($employees) - $employeesWithDocs,
                'total_documents' => $totalDocuments,
                'total_size_bytes' => $totalSize,
                'total_size_mb' => round($totalSize / (1024 * 1024), 2),
                'average_documents_per_employee' => round($totalDocuments / count($employees), 2)
            ],
            'department_breakdown' => $departmentStats,
            'document_type_breakdown' => $typeStats,
            'generated_at' => date('c')
        ]);
    }
    
    else {
        sendErrorResponse('Invalid endpoint or method', 404);
    }
    
} catch (Exception $e) {
    error_log("Document API Error: " . $e->getMessage());
    sendErrorResponse('Internal server error', 500, [
        'message' => $e->getMessage()
    ]);
}
?>