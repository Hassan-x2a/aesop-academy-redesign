<?php
/**
 * AESOP AI Academy - Product request email notification
 * URL: /aesop-api/product-request-email.php
 *
 * Receives POST JSON from /theladder-products/ and emails Scott when a
 * learner requests a missing product course.
 */

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'POST only']);
    exit;
}

$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$rateFile = sys_get_temp_dir() . '/aesop_product_request_email_' . md5($ip) . '.json';
$now = time();
$limit = 8;
$window = 600;

$fp = @fopen($rateFile, 'c+');
if ($fp) {
    flock($fp, LOCK_EX);
    $content = stream_get_contents($fp);
    $rate = json_decode($content, true) ?: ['ts' => $now, 'count' => 0];
    if ($now - ($rate['ts'] ?? 0) >= $window) {
        $rate = ['ts' => $now, 'count' => 0];
    }
    $rate['count']++;
    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, json_encode($rate));
    flock($fp, LOCK_UN);
    fclose($fp);
} else {
    $rate = ['ts' => $now, 'count' => 1];
}

if (($rate['count'] ?? 1) > $limit) {
    http_response_code(429);
    echo json_encode(['error' => 'Too many product request notifications. Please wait and try again.']);
    exit;
}

$raw = file_get_contents('php://input');
$input = json_decode($raw, true);

if (!is_array($input)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON body']);
    exit;
}

$productName = clean_text($input['productName'] ?? '', 120);
$productType = clean_text($input['productType'] ?? 'Unassigned', 100);
$reason = clean_text($input['reason'] ?? '', 1600);
$requesterEmail = clean_text($input['requesterEmail'] ?? '', 180);
$sourceProductName = clean_text($input['sourceProductName'] ?? '', 120);
$sourcePath = clean_text($input['sourcePath'] ?? '', 220);
$requestId = clean_text($input['requestId'] ?? '', 160);
$storage = clean_text($input['storage'] ?? '', 80);
$createdAtIso = clean_text($input['createdAtIso'] ?? gmdate('c'), 80);

if ($productName === '' || $reason === '') {
    http_response_code(400);
    echo json_encode(['error' => 'productName and reason are required']);
    exit;
}

if ($requesterEmail !== '' && !filter_var($requesterEmail, FILTER_VALIDATE_EMAIL)) {
    $requesterEmail = '';
}

$to = 'scott@aesopacademy.org';
$subject = 'AESOP product training request: ' . str_replace("\n", ' ', $productName);

$lines = [
    'A new product training request was submitted.',
    '',
    'Product: ' . $productName,
    'Type: ' . ($productType !== '' ? $productType : 'Unassigned'),
    'Requested by: ' . ($requesterEmail !== '' ? $requesterEmail : 'Not provided'),
    'Submitted at: ' . $createdAtIso,
    'Request ID: ' . ($requestId !== '' ? $requestId : 'Not provided'),
    'Storage: ' . ($storage !== '' ? $storage : 'Not provided'),
    '',
    'Reason:',
    $reason,
];

if ($sourceProductName !== '' || $sourcePath !== '') {
    $lines[] = '';
    $lines[] = 'Submitted from:';
    if ($sourceProductName !== '') {
        $lines[] = 'Selected product: ' . $sourceProductName;
    }
    if ($sourcePath !== '') {
        $lines[] = 'Page: https://aesopacademy.org' . $sourcePath;
    }
}

$body = implode("\n", $lines) . "\n";

$from = 'no-reply@aesopacademy.org';
$headers = [
    'From: AESOP Product Requests <' . $from . '>',
    'Reply-To: ' . ($requesterEmail !== '' ? $requesterEmail : $from),
    'Content-Type: text/plain; charset=UTF-8',
    'X-Mailer: PHP/' . phpversion(),
];

$sent = @mail($to, $subject, wordwrap($body, 78), implode("\r\n", $headers));

if (!$sent) {
    error_log('product-request-email mail() returned false for product: ' . $productName);
    http_response_code(502);
    echo json_encode(['error' => 'Email notification could not be sent']);
    exit;
}

echo json_encode(['ok' => true, 'emailSent' => true]);

function clean_text($value, $maxLength) {
    $value = is_scalar($value) ? (string) $value : '';
    $value = str_replace(["\r", "\0"], '', $value);
    $value = trim($value);
    if (strlen($value) > $maxLength) {
        $value = substr($value, 0, $maxLength);
    }
    return $value;
}
?>
