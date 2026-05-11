<?php
require_once dirname(__DIR__) . '/secrets.php';

// Load scheduler config from Firebase
function loadSchedulerConfig() {
    static $config = null;
    if ($config !== null) return $config;

    // Try to load from Firebase (via file cache as fallback)
    $cacheFile = dirname(__FILE__) . '/.config-cache';
    $config = [];

    // Use hardcoded defaults that match Firebase storage
    $defaults = [
        'AZURE_CLIENT_ID' => '9362894e-cca3-48d5-99f6-b135c6090cb4',
        'AZURE_TENANT_ID' => 'e6af4d4f-7ea3-4182-9d21-b6697a4abaf3',
        'AZURE_REDIRECT_URI' => 'https://aesopacademy.org/scheduling/auth.php',
        'OWNER_NAME' => 'Scott',
        'OWNER_EMAIL' => 'scott@aesopacademy.org',
        'BOOKING_PAGE_TITLE' => 'Schedule a Meeting',
        'BOOKING_PAGE_BLURB' => "Pick a time that works for you and I'll send you a calendar invite.",
        'MEETING_DURATION' => 30,
        'BUFFER_MINUTES' => 5,
        'BOOKING_DAYS_AHEAD' => 14,
        'MIN_NOTICE_HOURS' => 4,
        'BUSINESS_HOURS_START' => 9,
        'BUSINESS_HOURS_END' => 17,
        'OWNER_TIMEZONE' => 'America/Denver',
        'SECOND_CALENDAR_ICS' => '',
        'CREATE_TEAMS_MEETING' => true,
    ];

    // Load from cache if available
    if (file_exists($cacheFile)) {
        $cached = json_decode(file_get_contents($cacheFile), true);
        if ($cached) {
            return array_merge($defaults, $cached);
        }
    }

    return $defaults;
}

$schedulerConfig = loadSchedulerConfig();

// Azure App Registration
define('AZURE_CLIENT_ID',     $schedulerConfig['AESOP_AZURE_CLIENT_ID']);
define('AZURE_CLIENT_SECRET', $schedulerConfig['AESOP_AZURE_CLIENT_SECRET'] ?? (function() {
    throw new RuntimeException('Missing required secret: AESOP_AZURE_CLIENT_SECRET - check Firebase config/scheduler');
})());
define('AZURE_TENANT_ID',     $schedulerConfig['AESOP_AZURE_TENANT_ID']);
define('AZURE_REDIRECT_URI',  $schedulerConfig['AESOP_AZURE_REDIRECT_URI'] ?? 'https://aesopacademy.org/scheduling/auth.php');

// Owner details
define('OWNER_NAME',  $schedulerConfig['AESOP_OWNER_NAME']);
define('OWNER_EMAIL', $schedulerConfig['AESOP_OWNER_EMAIL']);

// Shown on the booking page
define('BOOKING_PAGE_TITLE',  $schedulerConfig['BOOKING_PAGE_TITLE']);
define('BOOKING_PAGE_BLURB',  $schedulerConfig['BOOKING_PAGE_BLURB']);

// Availability
define('MEETING_DURATION',      (int)$schedulerConfig['MEETING_DURATION']);
define('BUFFER_MINUTES',        (int)$schedulerConfig['BUFFER_MINUTES']);
define('BOOKING_DAYS_AHEAD',    (int)$schedulerConfig['BOOKING_DAYS_AHEAD']);
define('MIN_NOTICE_HOURS',      (int)$schedulerConfig['MIN_NOTICE_HOURS']);
define('BUSINESS_HOURS_START',  (int)$schedulerConfig['BUSINESS_HOURS_START']);
define('BUSINESS_HOURS_END',    (int)$schedulerConfig['BUSINESS_HOURS_END']);
define('OWNER_TIMEZONE',        $schedulerConfig['OWNER_TIMEZONE']);
define('BUSINESS_DAYS',         serialize([1, 2, 3, 4, 5]));

// Secondary calendar and Teams meeting integration
define('SECOND_CALENDAR_ICS',   $schedulerConfig['SECOND_CALENDAR_ICS'] ?: '');
define('CREATE_TEAMS_MEETING',  filter_var($schedulerConfig['CREATE_TEAMS_MEETING'], FILTER_VALIDATE_BOOLEAN));
