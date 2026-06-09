<?php
/**
 * AESOP AI Academy — Lab Chat Proxy
 * Server path: public_html/aesop-api/proxy.php
 * URL: /aesop-api/proxy.php
 *
 * Receives POST JSON: { messages: [...], system_prompt: "...", max_tokens: 1024, model?: "..." }
 * Forwards to Anthropic Messages API, returns response directly.
 * No user account needed — key is server-side only.
 */

// Try to load secrets from multiple locations
$secretsFile = dirname(__DIR__) . '/secrets.php';
$apiKeyLoaded = false;
$API_KEY = '';

log_error("Secrets file path: $secretsFile");
log_error("Secrets file exists: " . (file_exists($secretsFile) ? 'yes' : 'no'));

if (file_exists($secretsFile)) {
    require_once $secretsFile;
    if (function_exists('aesop_secret')) {
        $API_KEY = aesop_secret('AESOP_ANTHROPIC_API_KEY', '');
        $apiKeyLoaded = ($API_KEY !== '');
        log_error("API key from aesop_secret: " . ($apiKeyLoaded ? 'loaded' : 'empty'));
    } else {
        log_error("aesop_secret function not found");
    }
} else {
    log_error("secrets.php file not found");
}

// Fallback: check environment variable directly
if (!$apiKeyLoaded) {
    // Try AESOP_ANTHROPIC_API_KEY first, then ANTHROPIC_API_KEY
    $API_KEY = getenv('AESOP_ANTHROPIC_API_KEY') ?: getenv('ANTHROPIC_API_KEY') ?: '';

    // Also check $_ENV and $_SERVER
    if (!$API_KEY && isset($_ENV['AESOP_ANTHROPIC_API_KEY'])) {
        $API_KEY = $_ENV['AESOP_ANTHROPIC_API_KEY'];
    }
    if (!$API_KEY && isset($_ENV['ANTHROPIC_API_KEY'])) {
        $API_KEY = $_ENV['ANTHROPIC_API_KEY'];
    }
    if (!$API_KEY && isset($_SERVER['AESOP_ANTHROPIC_API_KEY'])) {
        $API_KEY = $_SERVER['AESOP_ANTHROPIC_API_KEY'];
    }
    if (!$API_KEY && isset($_SERVER['ANTHROPIC_API_KEY'])) {
        $API_KEY = $_SERVER['ANTHROPIC_API_KEY'];
    }

    $apiKeyLoaded = ($API_KEY !== '');
    log_error("API key from environment: " . ($apiKeyLoaded ? 'loaded' : 'empty'));
}

// ── CONFIG ──────────────────────────────────────────────────────────────
$MODEL_DEFAULT = 'claude-haiku-4-5-20251001';
$ALLOWED_MODELS = [
    'claude-haiku-4-5-20251001',
    'claude-sonnet-4-5-20250929',
];
$MAX_TOKENS_CAP = 1024;

// ── HEADERS ─────────────────────────────────────────────────────────────
header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');

// Error logging to file
$debugLog = dirname(__DIR__) . '/aesop-api-debug.log';
function log_error($msg) {
    global $debugLog;
    file_put_contents($debugLog, date('Y-m-d H:i:s') . ' - ' . $msg . "\n", FILE_APPEND);
}

set_error_handler(function($errno, $errstr, $errfile, $errline) {
    log_error("PHP Error [$errno]: $errstr in $errfile:$errline");
    return false;
});

set_exception_handler(function($e) {
    log_error("Exception: " . $e->getMessage() . " in " . $e->getFile() . ":" . $e->getLine());
    http_response_code(500);
    echo json_encode(['error' => 'Server error']);
    exit;
});

// Only POST
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'POST only']);
    exit;
}

if ($API_KEY === '') {
    log_error("API_KEY is empty, returning 500 error");
    http_response_code(500);
    echo json_encode(['error' => 'Server is missing AESOP_ANTHROPIC_API_KEY']);
    exit;
}

log_error("API_KEY is present, proceeding with request");

// ── PARSE REQUEST ───────────────────────────────────────────────────────
$raw = file_get_contents('php://input');
$input = json_decode($raw, true);

if (!$input || !isset($input['messages']) || !is_array($input['messages'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid request. Required: { messages: [...] }']);
    exit;
}

$messages    = $input['messages'];
$system      = isset($input['system_prompt']) ? trim($input['system_prompt']) : '';
$maxTokens   = min((int)($input['max_tokens'] ?? 1024), $MAX_TOKENS_CAP);
$requestedModel = isset($input['model']) ? trim($input['model']) : '';
$model = in_array($requestedModel, $ALLOWED_MODELS, true) ? $requestedModel : $MODEL_DEFAULT;

// Validate messages
foreach ($messages as $msg) {
    if (!isset($msg['role']) || !isset($msg['content'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Each message needs role and content.']);
        exit;
    }
}

// Cap conversation length
if (count($messages) > 40) {
    $messages = array_slice($messages, -40);
}

// ── BUILD ANTHROPIC REQUEST ─────────────────────────────────────────────
$payload = [
    'model'      => $model,
    'max_tokens' => $maxTokens,
    'messages'   => $messages,
];

if (!empty($system)) {
    $payload['system'] = $system;
}

$jsonPayload = json_encode($payload);

// ── CALL ANTHROPIC API ──────────────────────────────────────────────────
$headers = [
    'Content-Type: application/json',
    'x-api-key: ' . $API_KEY,
    'anthropic-version: 2023-06-01',
];

if (function_exists('curl_init')) {
    $ch = curl_init('https://api.anthropic.com/v1/messages');
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $jsonPayload,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 30,
        CURLOPT_HTTPHEADER     => $headers,
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr  = curl_error($ch);
    curl_close($ch);
} else {
    $context = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => implode("\r\n", $headers),
            'content' => $jsonPayload,
            'ignore_errors' => true,
            'timeout' => 30,
        ],
    ]);
    $response = file_get_contents('https://api.anthropic.com/v1/messages', false, $context);
    $httpCode = 0;
    $curlErr = '';
    if (isset($http_response_header[0]) && preg_match('/\s(\d{3})\s/', $http_response_header[0], $matches)) {
        $httpCode = (int) $matches[1];
    }
    if ($response === false) {
        $curlErr = 'PHP cURL is unavailable and stream fallback failed.';
    }
}

// ── HANDLE ERRORS ───────────────────────────────────────────────────────
if ($curlErr) {
    http_response_code(502);
    echo json_encode(['error' => 'Connection failed: ' . $curlErr]);
    exit;
}

if ($httpCode !== 200) {
    http_response_code($httpCode);
    echo $response; // Pass through Anthropic's error message
    exit;
}

// ── RETURN RESPONSE ─────────────────────────────────────────────────────
echo $response;
