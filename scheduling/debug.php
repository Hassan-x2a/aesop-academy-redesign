<?php
/**
 * Scheduler Diagnostics — Run this to troubleshoot scheduler issues
 * URL: https://aesopacademy.org/scheduling/debug.php
 *
 * WARNING: Delete this file after troubleshooting. It reveals configuration.
 */

ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/config.php';

header('Content-Type: text/plain; charset=utf-8');

echo "=== AESOP SCHEDULER DIAGNOSTICS ===\n\n";

// Check which secrets are available
echo "1. ENVIRONMENT VARIABLES\n";
echo "   ─────────────────────────────────\n";

$critical_secrets = [
    'AESOP_DB_HOST' => 'Database host',
    'AESOP_DB_NAME' => 'Database name',
    'AESOP_DB_USER' => 'Database user',
    'AESOP_DB_PASS' => 'Database password',
    'AESOP_AZURE_CLIENT_SECRET' => 'Azure OAuth secret',
    'AESOP_SECOND_CALENDAR_ICS' => 'Secondary calendar ICS URL',
];

foreach ($critical_secrets as $key => $label) {
    $value = getenv($key);
    if ($value !== false && $value !== '') {
        echo "   ✓ $key (set)\n";
    } else {
        echo "   ✗ $key (MISSING)\n";
    }
}

echo "\n2. DATABASE CONNECTION TEST\n";
echo "   ─────────────────────────────────\n";

try {
    require_once __DIR__ . '/db.php';
    $db = getDB();
    $result = $db->query("SELECT VERSION()");
    $row = $result->fetch();
    echo "   ✓ Connected to MySQL\n";
    echo "   Version: " . $row[0] . "\n";

    // Check tables
    $stmt = $db->query("SHOW TABLES LIKE 'oauth_tokens'");
    if ($stmt && $stmt->rowCount() > 0) {
        echo "   ✓ oauth_tokens table exists\n";

        $count = $db->query("SELECT COUNT(*) as cnt FROM oauth_tokens")->fetch();
        echo "   Stored tokens: " . $count['cnt'] . "\n";
    } else {
        echo "   ✗ oauth_tokens table NOT FOUND\n";
        echo "     → Run setup.php to initialize database\n";
    }
} catch (Throwable $e) {
    echo "   ✗ DATABASE CONNECTION FAILED\n";
    echo "   Error: " . $e->getMessage() . "\n";
}

echo "\n3. OAUTH TOKEN STATUS\n";
echo "   ─────────────────────────────────\n";

try {
    require_once __DIR__ . '/graph.php';
    $token = getValidAccessToken();
    if ($token) {
        echo "   ✓ Valid OAuth token available\n";
    } else {
        echo "   ✗ No valid OAuth token in database\n";
        echo "     → Visit setup.php to authorize\n";
    }
} catch (Throwable $e) {
    echo "   ✗ Error checking token: " . $e->getMessage() . "\n";
}

echo "\n4. NEXT STEPS\n";
echo "   ─────────────────────────────────\n";
echo "   If you see missing environment variables above:\n";
echo "   1. Go to cPanel > Environment Variables (if available)\n";
echo "   2. OR add them to a .env file in the project root\n";
echo "   3. OR contact your hosting provider to set them\n";
echo "\n";
