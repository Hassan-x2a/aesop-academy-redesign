<?php
/**
 * Aesop Academy Course Catalog API
 *
 * Returns a JSON catalog of all courses (live and coming-soon) with SHA-256 hash
 * for change detection. Used by 25experts.com to sync course data for video mapping.
 */

// Set JSON response header
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only allow GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

try {
    // Path to courses-data.json
    $coursesDataPath = __DIR__ . '/../ai-academy/modules/courses-data.json';

    // Verify file exists
    if (!file_exists($coursesDataPath)) {
        http_response_code(500);
        echo json_encode(['error' => 'courses-data.json not found']);
        exit;
    }

    // Read and parse courses-data.json
    $jsonContent = file_get_contents($coursesDataPath);
    if ($jsonContent === false) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to read courses-data.json']);
        exit;
    }

    $coursesData = json_decode($jsonContent, true);
    if ($coursesData === null || !isset($coursesData['courses']) || !is_array($coursesData['courses'])) {
        http_response_code(500);
        echo json_encode(['error' => 'Invalid courses-data.json format']);
        exit;
    }

    // Compute SHA-256 hash of the file content
    $catalogHash = hash_file('sha256', $coursesDataPath);

    // Extract minimal course fields and build course array
    $courses = [];
    foreach ($coursesData['courses'] as $course) {
        $courses[] = [
            'id' => $course['id'] ?? '',
            'name' => $course['name'] ?? '',
            'desc' => $course['desc'] ?? '',
            'url' => 'https://aesopacademy.org/ai-academy/electives-hub.html?course=' . urlencode($course['id'] ?? ''),
            'live' => $course['live'] ?? false
        ];
    }

    // Build response
    $response = [
        'catalog_hash' => $catalogHash,
        'generated_at' => gmdate('c'),
        'courses' => $courses
    ];

    // Return JSON
    http_response_code(200);
    echo json_encode($response, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
}
?>
