<?php
/**
 * Concept Request Email Endpoint
 * POST /aesop-api/concept-request-email.php
 *
 * Sends email notification when a learner submits a concept request on The Ladder.
 * Recipient: scott@aesopacademy.org
 */

header('Content-Type: application/json');

// Only accept POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['error' => 'POST only']);
  exit;
}

// Get JSON payload
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
  http_response_code(400);
  echo json_encode(['error' => 'Invalid JSON']);
  exit;
}

// Validate required fields
$required = ['conceptName', 'description'];
foreach ($required as $field) {
  if (empty($input[$field])) {
    http_response_code(400);
    echo json_encode(['error' => "Missing field: $field"]);
    exit;
  }
}

// Rate limit: 8 requests per 10 minutes per IP
$ip = $_SERVER['REMOTE_ADDR'];
$cache_key = "concept_request_limit_$ip";
$cache_file = sys_get_temp_dir() . '/' . md5($cache_key);

$count = 0;
if (file_exists($cache_file)) {
  $data = json_decode(file_get_contents($cache_file), true);
  if ($data && time() - $data['time'] < 600) {
    $count = $data['count'];
  }
}

if ($count >= 8) {
  http_response_code(429);
  echo json_encode(['error' => 'Too many requests. Try again in 10 minutes.']);
  exit;
}

$count++;
file_put_contents($cache_file, json_encode(['time' => time(), 'count' => $count]));

// Prepare email
$to = 'scott@aesopacademy.org';
$conceptName = sanitize_text($input['conceptName']);
$description = sanitize_text($input['description']);
$learnerId = sanitize_text($input['learnerId'] ?? 'Unknown');
$createdAt = sanitize_text($input['createdAt'] ?? date('c'));
$sourcePath = sanitize_text($input['sourcePath'] ?? '/theladder/');

$subject = "New Concept Request: $conceptName";

$body = "A learner has submitted a new concept request for The Ladder.\n\n";
$body .= "Concept: $conceptName\n";
$body .= "Description:\n$description\n\n";
$body .= "Learner ID: $learnerId\n";
$body .= "Source: $sourcePath\n";
$body .= "Submitted: $createdAt\n\n";
$body .= "Review and approve this concept at: https://aesopacademy.org/theladder/admin.html\n";

$headers = [
  'From' => 'noreply@aesopacademy.org',
  'Reply-To' => 'scott@aesopacademy.org',
  'Content-Type' => 'text/plain; charset=utf-8'
];

// Send email (non-blocking)
$header_string = '';
foreach ($headers as $k => $v) {
  $header_string .= "$k: $v\r\n";
}

$mail_sent = mail($to, $subject, $body, $header_string);

// Return response (success regardless of email delivery)
http_response_code(200);
echo json_encode([
  'status' => 'received',
  'message' => 'Concept request received. Thank you for your suggestion!',
  'concept' => $conceptName,
  'learnerId' => $learnerId,
  'timestamp' => $createdAt
]);

function sanitize_text($text) {
  return htmlspecialchars(strip_tags(trim($text)), ENT_QUOTES, 'UTF-8');
}
?>
