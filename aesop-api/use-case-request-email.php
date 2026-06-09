<?php
/**
 * AESOP AI Academy - Use case request email notification
 * URL: /aesop-api/use-case-request-email.php
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
$rateFile = sys_get_temp_dir() . '/aesop_use_case_request_email_' . md5($ip) . '.json';
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
    echo json_encode(['error' => 'Too many use case request notifications. Please wait and try again.']);
    exit;
}

$raw = file_get_contents('php://input');
$input = json_decode($raw, true);

if (!is_array($input)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON body']);
    exit;
}

$useCaseName = clean_text($input['useCaseName'] ?? '', 140);
$topic = clean_text($input['topic'] ?? 'Unassigned', 120);
$reason = clean_text($input['reason'] ?? '', 1600);
$requesterEmail = clean_text($input['requesterEmail'] ?? '', 180);
$sourceUseCaseName = clean_text($input['sourceUseCaseName'] ?? '', 140);
$sourcePath = clean_text($input['sourcePath'] ?? '', 220);
$requestId = clean_text($input['requestId'] ?? '', 160);
$storage = clean_text($input['storage'] ?? '', 80);
$createdAtIso = clean_text($input['createdAtIso'] ?? gmdate('c'), 80);

if ($useCaseName === '' || $reason === '') {
    http_response_code(400);
    echo json_encode(['error' => 'useCaseName and reason are required']);
    exit;
}

if ($requesterEmail !== '' && !filter_var($requesterEmail, FILTER_VALIDATE_EMAIL)) {
    $requesterEmail = '';
}

$to = 'scott@aesopacademy.org';
$subject = 'AESOP use case training request: ' . str_replace("\n", ' ', $useCaseName);

$lines = [
    'A new use case training request was submitted.',
    '',
    'Use case: ' . $useCaseName,
    'Topic: ' . ($topic !== '' ? $topic : 'Unassigned'),
    'Requested by: ' . ($requesterEmail !== '' ? $requesterEmail : 'Not provided'),
    'Submitted at: ' . $createdAtIso,
    'Request ID: ' . ($requestId !== '' ? $requestId : 'Not provided'),
    'Storage: ' . ($storage !== '' ? $storage : 'Not provided'),
    '',
    'Reason:',
    $reason,
];

if ($sourceUseCaseName !== '' || $sourcePath !== '') {
    $lines[] = '';
    $lines[] = 'Submitted from:';
    if ($sourceUseCaseName !== '') {
        $lines[] = 'Selected use case: ' . $sourceUseCaseName;
    }
    if ($sourcePath !== '') {
        $lines[] = 'Page: https://aesopacademy.org' . $sourcePath;
    }
}

$body = implode("\n", $lines) . "\n";

$from = 'no-reply@aesopacademy.org';
$headers = [
    'From: AESOP Use Case Requests <' . $from . '>',
    'Reply-To: ' . ($requesterEmail !== '' ? $requesterEmail : $from),
    'Content-Type: text/plain; charset=UTF-8',
    'X-Mailer: PHP/' . phpversion(),
];

$sent = @mail($to, $subject, wordwrap($body, 78), implode("\r\n", $headers));

if (!$sent) {
    error_log('use-case-request-email mail() returned false for use case: ' . $useCaseName);
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
