<?php
// images.php - Item images management (upload, replace, list, serve)

function getItemsImagesBaseDir() {
    $cwd = getcwd();
    $preferred = $cwd . '/images/Items'; // Preferred per server (GoDaddy) path
    $fallback = $cwd . '/images/items';  // Fallback for local lowercase path

    if (is_dir($preferred)) return $preferred;
    if (is_dir($fallback)) return $fallback;

    // Neither exists, create preferred
    if (!@mkdir($preferred, 0775, true) && !is_dir($preferred)) {
        // If creating preferred fails, try fallback
        if (!@mkdir($fallback, 0775, true) && !is_dir($fallback)) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Failed to initialize images directory']);
            exit;
        }
        return $fallback;
    }
    return $preferred;
}

function ensureItemImageDir($itemId) {
    $base = getItemsImagesBaseDir();
    $dir = rtrim($base, '/\\') . '/' . intval($itemId);
    if (!is_dir($dir)) {
        if (!@mkdir($dir, 0775, true) && !is_dir($dir)) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Failed to create item image directory']);
            exit;
        }
    }
    return $dir;
}

function getItemImages($itemId) {
    $dir = ensureItemImageDir($itemId);
    $files = scandir($dir);
    $images = [];
    $allowed = ['jpg','jpeg','png','gif','webp','bmp'];

    foreach ($files as $file) {
        if ($file === '.' || $file === '..') continue;
        $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
        if (!in_array($ext, $allowed, true)) continue;
        $path = $dir . '/' . $file;
        $stat = @stat($path);
        if ($stat === false) continue;
        $images[] = [
            'filename' => $file,
            'size' => $stat['size'] ?? 0,
            'modified' => isset($stat['mtime']) ? date('c', $stat['mtime']) : null,
            'url' => "/api/items/images/{$itemId}/file/" . rawurlencode($file),
        ];
    }

    // Sort by modified desc
    usort($images, function($a, $b) {
        return strtotime($b['modified'] ?? '0') <=> strtotime($a['modified'] ?? '0');
    });

    return $images;
}

function handleItemImageList($itemId) {
    validateItemId($itemId);
    $images = getItemImages($itemId);
    echo json_encode(['success' => true, 'data' => $images]);
}

function handleItemImageUpload($itemId, $replace = false) {
    validateItemId($itemId);
    $dir = ensureItemImageDir($itemId);

    if (!isset($_FILES) || (empty($_FILES['image']) && empty($_FILES['file']))) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'No image file uploaded']);
        return;
    }

    $file = $_FILES['image'] ?? $_FILES['file'];
    if (!is_array($file) || $file['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        $err = isset($file['error']) ? $file['error'] : 'Unknown error';
        echo json_encode(['success' => false, 'error' => 'Upload failed', 'code' => $err]);
        return;
    }

    // Validate MIME and extension
    $allowedExt = ['jpg','jpeg','png','gif','webp','bmp'];
    $origName = $file['name'];
    $ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));
    if (!in_array($ext, $allowedExt, true)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid file type']);
        return;
    }

    // Size limit 10MB
    if ($file['size'] > 10 * 1024 * 1024) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'File too large (max 10MB)']);
        return;
    }

    if ($replace) {
        // Delete existing images
        $existing = getItemImages($itemId);
        foreach ($existing as $img) {
            $p = $dir . '/' . $img['filename'];
            @unlink($p);
        }
    }

    // Generate safe filename: timestamp + random + original base sanitized
    $base = preg_replace('/[^a-zA-Z0-9_-]/', '_', pathinfo($origName, PATHINFO_FILENAME));
    $newName = date('Ymd_His') . '_' . substr(md5(uniqid((string)$itemId, true)), 0, 6) . '_' . $base . '.' . $ext;
    $target = $dir . '/' . $newName;

    if (!move_uploaded_file($file['tmp_name'], $target)) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to save uploaded file']);
        return;
    }

    // Return updated list
    $images = getItemImages($itemId);
    echo json_encode([
        'success' => true,
        'message' => $replace ? 'Image replaced successfully' : 'Image uploaded successfully',
        'data' => [
            'uploaded' => $newName,
            'images' => $images,
            'latest_url' => "/api/items/images/{$itemId}/latest",
        ]
    ]);
}

function handleItemImageServe($itemId, $filename) {
    validateItemId($itemId);
    $dir = ensureItemImageDir($itemId);
    $safe = basename($filename);
    $path = $dir . '/' . $safe;

    if (!is_file($path)) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Image not found']);
        return;
    }

    $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
    $mimeMap = [
        'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png',
        'gif' => 'image/gif', 'webp' => 'image/webp', 'bmp' => 'image/bmp'
    ];
    $mime = $mimeMap[$ext] ?? 'application/octet-stream';

    header('Content-Type: ' . $mime);
    header('Content-Length: ' . filesize($path));
    header('Cache-Control: public, max-age=86400');
    readfile($path);
    exit;
}

function handleItemImageLatest($itemId) {
    validateItemId($itemId);
    $images = getItemImages($itemId);
    if (count($images) === 0) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'No images found']);
        return;
    }

    $latest = $images[0]['filename'];
    handleItemImageServe($itemId, $latest);
}

function handleItemImageDelete($itemId, $filename) {
    validateItemId($itemId);
    $dir = ensureItemImageDir($itemId);
    $safe = basename($filename);
    $path = $dir . '/' . $safe;

    if (!is_file($path)) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Image not found']);
        return;
    }

    if (!@unlink($path)) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to delete image']);
        return;
    }

    echo json_encode(['success' => true, 'message' => 'Image deleted']);
}
