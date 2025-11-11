<?php
// config/timezone.php - Timezone Configuration for Philippines

// Set default timezone to Philippines (Manila)
date_default_timezone_set('Asia/Manila');

/**
 * Set database timezone to Philippines
 * @param PDO $pdo Database connection
 * @return bool Success status
 */
function setDatabaseTimezone($pdo)
{
    try {
        $pdo->exec("SET time_zone = '+08:00'");
        $pdo->exec("SET SESSION time_zone = '+08:00'");
        error_log("Database timezone set to Asia/Manila (+08:00)");
        return true;
    } catch (PDOException $e) {
        error_log("Error setting database timezone: " . $e->getMessage());
        return false;
    }
}

/**
 * Get current timestamp in Philippines timezone
 * @return string Current timestamp in Y-m-d H:i:s format
 */
function getPhilippinesTimestamp()
{
    $timezone = new DateTimeZone('Asia/Manila');
    $datetime = new DateTime('now', $timezone);
    return $datetime->format('Y-m-d H:i:s');
}

/**
 * Format timestamp for Philippines timezone
 * @param string|null $timestamp Input timestamp
 * @param string $format Output format (default: 'Y-m-d H:i:s')
 * @return string|null Formatted timestamp or null
 */
function formatPhilippinesTimestamp($timestamp, $format = 'Y-m-d H:i:s')
{
    if (empty($timestamp)) {
        return null;
    }
    
    try {
        $timezone = new DateTimeZone('Asia/Manila');
        $datetime = new DateTime($timestamp, $timezone);
        return $datetime->format($format);
    } catch (Exception $e) {
        error_log("Error formatting timestamp: " . $e->getMessage());
        return null;
    }
}

/**
 * Get Philippines date only
 * @return string Current date in Y-m-d format
 */
function getPhilippinesDate()
{
    $timezone = new DateTimeZone('Asia/Manila');
    $datetime = new DateTime('now', $timezone);
    return $datetime->format('Y-m-d');
}

/**
 * Get Philippines time only
 * @return string Current time in H:i:s format
 */
function getPhilippinesTime()
{
    $timezone = new DateTimeZone('Asia/Manila');
    $datetime = new DateTime('now', $timezone);
    return $datetime->format('H:i:s');
}

/**
 * Convert timestamp to Philippines timezone
 * @param string $timestamp Input timestamp
 * @return string Converted timestamp
 */
function convertToPhilippinesTime($timestamp)
{
    if (empty($timestamp)) {
        return null;
    }
    
    try {
        $datetime = new DateTime($timestamp);
        $datetime->setTimezone(new DateTimeZone('Asia/Manila'));
        return $datetime->format('Y-m-d H:i:s');
    } catch (Exception $e) {
        error_log("Error converting timestamp: " . $e->getMessage());
        return $timestamp;
    }
}

/**
 * Get timezone information
 * @return array Timezone details
 */
function getTimezoneInfo()
{
    $timezone = new DateTimeZone('Asia/Manila');
    $datetime = new DateTime('now', $timezone);
    
    return [
        'timezone' => 'Asia/Manila',
        'offset' => '+08:00',
        'current_time' => $datetime->format('Y-m-d H:i:s'),
        'current_date' => $datetime->format('Y-m-d'),
        'current_time_only' => $datetime->format('H:i:s'),
        'day_of_week' => $datetime->format('l'),
        'formatted' => $datetime->format('F d, Y g:i A')
    ];
}

/**
 * Calculate duration between two timestamps in hours
 * @param string $start_time Start timestamp
 * @param string $end_time End timestamp
 * @return float Duration in hours
 */
function calculateDurationInHours($start_time, $end_time)
{
    try {
        $timezone = new DateTimeZone('Asia/Manila');
        $start = new DateTime($start_time, $timezone);
        $end = new DateTime($end_time, $timezone);
        
        $interval = $start->diff($end);
        
        // Convert to total hours
        $hours = ($interval->days * 24) + $interval->h + ($interval->i / 60) + ($interval->s / 3600);
        
        return round($hours, 2);
    } catch (Exception $e) {
        error_log("Error calculating duration: " . $e->getMessage());
        return 0.00;
    }
}

/**
 * Add hours to a timestamp
 * @param string $timestamp Base timestamp
 * @param float $hours Hours to add
 * @return string New timestamp
 */
function addHoursToTimestamp($timestamp, $hours)
{
    try {
        $timezone = new DateTimeZone('Asia/Manila');
        $datetime = new DateTime($timestamp, $timezone);
        
        $minutes = $hours * 60;
        $datetime->modify("+{$minutes} minutes");
        
        return $datetime->format('Y-m-d H:i:s');
    } catch (Exception $e) {
        error_log("Error adding hours to timestamp: " . $e->getMessage());
        return $timestamp;
    }
}