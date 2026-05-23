<?php
/**
 * AESOP AI Academy — Assessment Chat Proxy
 * Server path: public_html/aesop-api/assessment-proxy.php
 * URL: /aesop-api/assessment-proxy.php
 *
 * Dedicated proxy for student assessment conversations.
 * Uses Sonnet (smarter signal extraction) with a higher token cap than
 * the lab proxy, since assessment responses embed a structured JSON payload.
 *
 * Receives POST JSON: { messages: [...], system_prompt: "...", max_tokens: N }
 * Returns Anthropic Messages API response directly.
 */

require_once dirname(__DIR__) . '/secrets.php';

// ── CONFIG ──────────────────────────────────────────────────────────────
$API_KEY        = aesop_secret('AESOP_ANTHROPIC_API_KEY', '');
$MODEL          = 'claude-sonnet-4-6';
$MAX_TOKENS_CAP = 800;   // Assessment needs structured JSON payload; lab proxy caps at 400
$RATE_LIMIT_RPM = 10;    // Max requests per minute per IP

// ── HEADERS ─────────────────────────────────────────────────────────────
header('Content-Type: application/json');
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

if ($API_KEY === '') {
    http_response_code(500);
    echo json_encode(['error' => 'Server is missing AESOP_ANTHROPIC_API_KEY']);
    exit;
}

// ── RATE LIMITING ───────────────────────────────────────────────────────
$ip       = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$rlFile   = sys_get_temp_dir() . '/aesop_rl_' . md5($ip) . '.json';
$now      = time();
$rl       = @json_decode(@file_get_contents($rlFile), true) ?: ['ts' => $now, 'count' => 0];

if ($now - $rl['ts'] >= 60) {
    $rl = ['ts' => $now, 'count' => 0];
}

$rl['count']++;
@file_put_contents($rlFile, json_encode($rl), LOCK_EX);

if ($rl['count'] > $RATE_LIMIT_RPM) {
    http_response_code(429);
    echo json_encode(['error' => 'Too many requests. Please wait a moment and try again.']);
    exit;
}

// ── PARSE REQUEST ───────────────────────────────────────────────────────
$raw   = file_get_contents('php://input');
$input = json_decode($raw, true);

if (!$input || !isset($input['messages']) || !is_array($input['messages'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid request. Required: { messages: [...] }']);
    exit;
}

$messages  = $input['messages'];
$system    = isset($input['system_prompt']) ? trim($input['system_prompt']) : '';
$maxTokens = min((int)($input['max_tokens'] ?? $MAX_TOKENS_CAP), $MAX_TOKENS_CAP);

// Validate messages
foreach ($messages as $msg) {
    if (!isset($msg['role']) || !isset($msg['content'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Each message needs role and content.']);
        exit;
    }
    if (!in_array($msg['role'], ['user', 'assistant'], true)) {
        http_response_code(400);
        echo json_encode(['error' => 'Message role must be "user" or "assistant".']);
        exit;
    }
}

// Cap conversation length (assessment is short; 20 turns is generous)
if (count($messages) > 20) {
    $messages = array_slice($messages, -20);
}

// ── BUILD ANTHROPIC REQUEST ─────────────────────────────────────────────
$payload = [
    'model'      => $MODEL,
    'max_tokens' => $maxTokens,
    'messages'   => $messages,
];

if (!empty($system)) {
    $payload['system'] = $system;
}

$jsonPayload = json_encode($payload);

// ── CALL ANTHROPIC API ──────────────────────────────────────────────────
$ch = curl_init('https://api.anthropic.com/v1/messages');
curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $jsonPayload,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 45,
    CURLOPT_HTTPHEADER     => [
        'Content-Type: application/json',
        'x-api-key: ' . $API_KEY,
        'anthropic-version: 2023-06-01',
    ],
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr  = curl_error($ch);
curl_close($ch);

// ── HANDLE ERRORS ───────────────────────────────────────────────────────
if ($curlErr) {
    http_response_code(502);
    echo json_encode(['error' => 'Connection failed: ' . $curlErr]);
    exit;
}

if ($httpCode !== 200) {
    http_response_code($httpCode);
    echo $response;
    exit;
}

// ── RETURN RESPONSE ─────────────────────────────────────────────────────
echo $response;
