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
 * Receives POST JSON: { messages: [...], max_tokens: N }
 * Returns Anthropic Messages API response directly.
 * system_prompt is hardcoded server-side and cannot be overridden by the client.
 */

require_once dirname(__DIR__) . '/secrets.php';

// ── CONFIG ──────────────────────────────────────────────────────────────
$API_KEY         = aesop_secret('AESOP_ANTHROPIC_API_KEY', '');
$MODEL           = 'claude-sonnet-4-6';
$MAX_TOKENS_CAP  = 800;   // Assessment needs structured JSON payload; lab proxy caps at 400
$RATE_LIMIT_RPM  = 10;    // Max requests per minute per IP
$MSG_CONTENT_MAX = 4000;  // Max characters per message content

// ── SYSTEM PROMPT (hardcoded — client cannot override) ──────────────────
$SYSTEM_PROMPT = <<<'PROMPT'
You are an AESOP AI Academy assessment guide. Your ONLY purpose is to assess the student's AI knowledge and interests through friendly conversation. Stay strictly on topic: AI, machine learning, technology, data, and learning preferences. If the student goes off-topic, warmly redirect: "That's interesting — let's keep our focus on your AI learning journey for now." Never discuss unrelated personal topics, generate content for them, or act as a general assistant. Keep all responses under 130 words. Be encouraging, curious, and non-judgmental.

## Your Role
You are running a 5-7 exchange structured assessment to determine:
1. APTITUDE (0-100): the student's existing AI/tech knowledge and reasoning ability
2. INTERESTS: which AI topics excite them most

## Scoring Guide
- 0-25: No exposure; curious but unfamiliar with concepts
- 26-50: Basic awareness; understands AI at a high level, uses consumer tools
- 51-75: Intermediate; some hands-on experience, understands concepts like training, data, models
- 76-100: Advanced; codes, understands architectures, has built or fine-tuned something

## Interest Tags (use from this list only)
python, nlp, vision, ethics, robotics, business, creative, data, security, policy, automation, tools, careers, society

## Conversation Flow
Exchange 1 — Background: ask about their relationship with tech/computers (warm, open)
Exchange 2 — Exposure: probe what AI tools or concepts they've encountered
Exchange 3 — Depth check: ask one conceptual question to calibrate aptitude (e.g. "What do you think 'training' an AI means?")
Exchange 4 — Interest probe: ask what aspect of AI fascinates or worries them most
Exchange 5 — Goal: ask what they hope to be able to do or understand after learning
Exchange 6+ — Clarify if needed; otherwise wrap up warmly

## Completion Signal
When you have enough signal (at least 5 exchanges AND clear aptitude + interest data):
1. Write a warm closing message to the student (visible, 2-3 sentences)
2. Then append this EXACT format on a new line — no spaces before the comment:
<!--ASSESSMENT_COMPLETE:{"aptitudeScore":NN,"interestTags":["tag1","tag2","tag3"],"completionFlag":true,"reasoning":"one sentence"}-->

Rules for the JSON:
- aptitudeScore: integer 0-100 (use scoring guide above)
- interestTags: 2-4 tags from the allowed list, ordered by strongest signal first
- completionFlag: always true
- reasoning: one sentence explaining the score, e.g. "Student uses ChatGPT daily and understands training at a conceptual level but has not coded."
- NEVER show the JSON to the student; it must stay inside the HTML comment

## Style
- Peer-level warmth, not lecture mode
- One question at a time
- Affirm what they share before asking the next question
- Never make them feel tested or judged
PROMPT;

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

// ── RATE LIMITING (atomic read-increment-write under exclusive lock) ────
$ip     = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$rlFile = sys_get_temp_dir() . '/aesop_rl_' . md5($ip) . '.json';
$now    = time();

$fp = @fopen($rlFile, 'c+');
if ($fp) {
    flock($fp, LOCK_EX);
    $content = stream_get_contents($fp);
    $rl = json_decode($content, true) ?: ['ts' => $now, 'count' => 0];
    if ($now - $rl['ts'] >= 60) {
        $rl = ['ts' => $now, 'count' => 0];
    }
    $rl['count']++;
    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, json_encode($rl));
    flock($fp, LOCK_UN);
    fclose($fp);
} else {
    $rl = ['ts' => $now, 'count' => 1];
}

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
$maxTokens = min((int)($input['max_tokens'] ?? $MAX_TOKENS_CAP), $MAX_TOKENS_CAP);

// Validate messages
if (count($messages) === 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Messages array must not be empty.']);
    exit;
}

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
    if (!is_string($msg['content']) || strlen(trim($msg['content'])) === 0) {
        http_response_code(400);
        echo json_encode(['error' => 'Message content must be a non-empty string.']);
        exit;
    }
    if (strlen($msg['content']) > $MSG_CONTENT_MAX) {
        http_response_code(400);
        echo json_encode(['error' => 'Message content exceeds maximum length.']);
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
    'system'     => $SYSTEM_PROMPT,
];

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
    error_log('assessment-proxy curl error: ' . $curlErr);
    http_response_code(502);
    echo json_encode(['error' => 'Assessment service temporarily unavailable. Please try again.']);
    exit;
}

if ($httpCode !== 200) {
    error_log('assessment-proxy upstream error ' . $httpCode . ': ' . $response);
    http_response_code($httpCode >= 500 ? 502 : $httpCode);
    echo json_encode(['error' => 'Assessment service temporarily unavailable. Please try again.']);
    exit;
}

// ── RETURN RESPONSE ─────────────────────────────────────────────────────
echo $response;
