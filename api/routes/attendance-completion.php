<?php
// routes/attendance-completion.php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../socket.php';

$db = getConnection();
$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true) ?? [];

$resourceId = $segments[1] ?? null;
$action = $segments[2] ?? null;

try {
    if ($method === 'POST' && $resourceId === 'auto-complete') {
        handleAutoCompleteAttendance($db, $input);
    } elseif ($method === 'POST' && $resourceId === 'validate-and-fix') {
        handleValidateAndFix($db, $input);
    } elseif ($method === 'POST' && $resourceId === 'compute-missing') {
        handleComputeMissing($db, $input);
    } elseif ($method === 'GET' && $resourceId === 'missing-records') {
        handleGetMissingRecords($db);
    } elseif ($method === 'POST' && $resourceId === 'rebuild-summary') {
        handleRebuildSummary($db, $input);
    } else {
        sendErrorResponse('Invalid endpoint', 404);
    }
} catch (Exception $e) {
    error_log("Attendance Completion Error: " . $e->getMessage());
    sendErrorResponse('Failed to process request', 500, ['message' => $e->getMessage()]);
}

// ============================================================================
// TIME CALCULATOR CLASS (Ported from JavaScript)
// ============================================================================

class TimeCalculator {
    const MORNING_START = 480;      // 8:00 AM
    const MORNING_END = 720;        // 12:00 PM
    const AFTERNOON_START = 780;    // 1:00 PM
    const AFTERNOON_END = 1020;     // 5:00 PM
    const EVENING_START = 1020;     // 5:00 PM
    const OVERTIME_END = 1320;      // 10:00 PM
    const EARLY_MORNING_START = 360; // 6:00 AM
    const GRACE_PERIOD = 5;         // 5 minutes
    const OVERTIME_GRACE = 15;      // 15 minutes for overtime
    const MAX_REGULAR_HOURS = 8;    // Maximum regular hours per day
    
    /**
     * Calculate hours for a clock-out event
     */
    public static function calculateHours($clockType, $clockOutTime, $clockInTime = null) {
        $regularHours = 0;
        $overtimeHours = 0;
        
        error_log("=== CALCULATE HOURS ===");
        error_log("Clock type: $clockType");
        error_log("Clock out time: " . ($clockOutTime ? $clockOutTime->format('Y-m-d H:i:s') : 'null'));
        error_log("Clock in time: " . ($clockInTime ? $clockInTime->format('Y-m-d H:i:s') : 'null'));
        
        switch ($clockType) {
            case 'morning_in':
            case 'afternoon_in':
            case 'evening_in':
            case 'overtime_in':
                // Clock-in types don't calculate hours
                break;
                
            case 'morning_out':
                if ($clockInTime) {
                    $result = self::calculateContinuousHours($clockInTime, $clockOutTime, 'morning');
                    $regularHours = $result['regularHours'];
                    $overtimeHours = $result['overtimeHours'];
                }
                break;
                
            case 'afternoon_out':
                if ($clockInTime) {
                    $result = self::calculateContinuousHours($clockInTime, $clockOutTime, 'afternoon');
                    $regularHours = $result['regularHours'];
                    $overtimeHours = $result['overtimeHours'];
                }
                break;
                
            case 'evening_out':
                if ($clockInTime) {
                    $overtimeHours = self::calculateEveningSessionHours($clockInTime, $clockOutTime);
                }
                break;
                
            case 'overtime_out':
                if ($clockInTime) {
                    $overtimeHours = self::calculateOvertimeSessionHours($clockInTime, $clockOutTime);
                }
                break;
        }
        
        // Apply 8-hour regular rule for morning/afternoon sessions
        if ($clockType === 'morning_out' || $clockType === 'afternoon_out') {
            $adjusted = self::apply8HourRule($regularHours, $overtimeHours);
            $regularHours = $adjusted['regularHours'];
            $overtimeHours = $adjusted['overtimeHours'];
        }
        
        return [
            'regularHours' => round($regularHours, 2),
            'overtimeHours' => round($overtimeHours, 2)
        ];
    }
    
    /**
     * Apply 8-hour regular cap rule
     */
    private static function apply8HourRule($regularHours, $overtimeHours) {
        if ($regularHours <= self::MAX_REGULAR_HOURS) {
            return ['regularHours' => $regularHours, 'overtimeHours' => $overtimeHours];
        }
        
        $excess = $regularHours - self::MAX_REGULAR_HOURS;
        return [
            'regularHours' => self::MAX_REGULAR_HOURS,
            'overtimeHours' => $overtimeHours + $excess
        ];
    }
    
    /**
     * Calculate continuous hours (morning or afternoon sessions)
     */
    private static function calculateContinuousHours($clockInTime, $clockOutTime, $session) {
        $clockInMinutes = $clockInTime->format('H') * 60 + $clockInTime->format('i');
        $clockOutMinutes = $clockOutTime->format('H') * 60 + $clockOutTime->format('i');
        
        // Check if Sunday
        $isSunday = $clockInTime->format('w') == 0;
        
        // Handle overnight shifts
        if ($clockOutMinutes < $clockInMinutes) {
            $potentialNextDay = $clockOutMinutes + (24 * 60);
            $potentialDuration = $potentialNextDay - $clockInMinutes;
            
            if ($potentialDuration > 0 && $potentialDuration <= (16 * 60)) {
                $clockOutMinutes = $potentialNextDay;
            } else {
                return ['regularHours' => 0, 'overtimeHours' => 0];
            }
        }
        
        $totalRegularHours = 0;
        $totalOvertimeHours = 0;
        
        // Set boundaries based on day type
        if ($isSunday) {
            $morningStart = 420;  // 7:00 AM
            $afternoonEnd = 960;  // 4:00 PM (no overtime on Sunday)
            $clockOutMinutes = min($clockOutMinutes, $afternoonEnd);
        } else {
            $morningStart = self::MORNING_START;
            $afternoonEnd = self::AFTERNOON_END;
        }
        
        // Early morning overtime (6:00-8:00 AM) - weekdays only
        if (!$isSunday && $session === 'morning' && 
            $clockInMinutes >= (self::EARLY_MORNING_START - 60) && 
            $clockInMinutes < $morningStart) {
            
            if ($clockInMinutes <= self::EARLY_MORNING_START + self::GRACE_PERIOD) {
                $totalOvertimeHours += 2.0;
            } else {
                // Hour-by-hour calculation
                $earlyOT = 0;
                
                // Hour 1: 6:00-7:00
                if ($clockInMinutes < 420) {
                    $lateBy = max(0, $clockInMinutes - 360);
                    if ($lateBy <= self::GRACE_PERIOD) {
                        $earlyOT += 1.0;
                    }
                }
                
                // Hour 2: 7:00-8:00
                if ($clockInMinutes < 480) {
                    $lateBy = max(0, $clockInMinutes - 420);
                    if ($lateBy <= self::GRACE_PERIOD) {
                        $earlyOT += 1.0;
                    }
                }
                
                $totalOvertimeHours += $earlyOT;
            }
        }
        
        // Calculate morning session hours
        if ($session === 'morning') {
            if ($clockInMinutes < self::MORNING_END && $clockOutMinutes > $morningStart) {
                $morningHours = self::calculateRegularHours(
                    $clockInTime,
                    min($clockOutMinutes, self::MORNING_END),
                    $morningStart,
                    self::MORNING_END
                );
                $totalRegularHours += $morningHours;
            }
            
            // Afternoon hours if extends past lunch
            if ($clockOutMinutes > self::AFTERNOON_START) {
                $afternoonHours = self::calculateRegularHours(
                    max($clockInMinutes, self::AFTERNOON_START),
                    min($clockOutMinutes, $afternoonEnd),
                    self::AFTERNOON_START,
                    $afternoonEnd
                );
                $totalRegularHours += $afternoonHours;
            }
            
            // Overtime after 5 PM (weekdays only)
            if (!$isSunday && $clockOutMinutes > $afternoonEnd) {
                $overtimeStart = $afternoonEnd;
                $overtimeEnd = min($clockOutMinutes, self::OVERTIME_END);
                
                if ($overtimeEnd > $overtimeStart) {
                    $totalOvertimeHours += self::calculateSimpleOvertimeHours(
                        $overtimeStart,
                        $overtimeEnd
                    );
                }
            }
            
            // Night shift overtime (after 10 PM, weekdays only)
            if (!$isSunday && $clockOutMinutes > self::OVERTIME_END) {
                $nightStart = self::OVERTIME_END;
                $nightEnd = $clockOutMinutes;
                $totalOvertimeHours += self::calculateSimpleOvertimeHours($nightStart, $nightEnd);
            }
        }
        
        // Calculate afternoon session hours
        if ($session === 'afternoon') {
            $effectiveClockIn = $clockInMinutes;
            
            // Early afternoon arrival (before lunch, weekdays only)
            if (!$isSunday && $clockInMinutes < self::MORNING_END) {
                $earlyEnd = min($clockOutMinutes, self::AFTERNOON_START);
                if ($earlyEnd > $clockInMinutes) {
                    $totalOvertimeHours += self::calculateSimpleOvertimeHours(
                        $clockInMinutes,
                        $earlyEnd
                    );
                }
            }
            
            // Regular afternoon hours
            if ($effectiveClockIn < $afternoonEnd && $clockOutMinutes > self::AFTERNOON_START) {
                $afternoonHours = self::calculateRegularHours(
                    max($effectiveClockIn, self::AFTERNOON_START),
                    min($clockOutMinutes, $afternoonEnd),
                    self::AFTERNOON_START,
                    $afternoonEnd
                );
                $totalRegularHours += $afternoonHours;
            }
            
            // Overtime after 5 PM (weekdays only)
            if (!$isSunday && $clockOutMinutes > $afternoonEnd) {
                $overtimeStart = $afternoonEnd;
                $overtimeEnd = min($clockOutMinutes, self::OVERTIME_END);
                
                if ($overtimeEnd > $overtimeStart) {
                    $totalOvertimeHours += self::calculateSimpleOvertimeHours(
                        $overtimeStart,
                        $overtimeEnd
                    );
                }
            }
            
            // Night shift (weekdays only)
            if (!$isSunday && $clockOutMinutes > self::OVERTIME_END) {
                $totalOvertimeHours += self::calculateSimpleOvertimeHours(
                    self::OVERTIME_END,
                    $clockOutMinutes
                );
            }
        }
        
        return [
            'regularHours' => $totalRegularHours,
            'overtimeHours' => $totalOvertimeHours
        ];
    }
    
    /**
     * Calculate regular hours with 45-minute rule
     */
    private static function calculateRegularHours($clockInMinutes, $clockOutMinutes, $sessionStart, $sessionEnd) {
        if (is_object($clockInMinutes)) {
            $clockInMinutes = $clockInMinutes->format('H') * 60 + $clockInMinutes->format('i');
        }
        if (is_object($clockOutMinutes)) {
            $clockOutMinutes = $clockOutMinutes->format('H') * 60 + $clockOutMinutes->format('i');
        }
        
        $actualStart = max($clockInMinutes, $sessionStart);
        $actualEnd = min($clockOutMinutes, $sessionEnd);
        
        if ($actualEnd <= $actualStart) {
            return 0;
        }
        
        $totalMinutesWorked = $actualEnd - $actualStart;
        $lateMinutes = max(0, $clockInMinutes - $sessionStart);
        
        if ($lateMinutes <= self::GRACE_PERIOD) {
            // On time - round UP to nearest 0.5 hour
            return ceil($totalMinutesWorked / 30) * 0.5;
        } elseif ($lateMinutes <= 45) {
            // Late but within 45 minutes - round DOWN to nearest 0.5 hour
            return floor($totalMinutesWorked / 30) * 0.5;
        } else {
            // More than 45 minutes late - deduct 1 hour penalty
            $penalizedMinutes = max(0, $totalMinutesWorked - 60);
            return round($penalizedMinutes / 30) * 0.5;
        }
    }
    
    /**
     * Calculate simple overtime hours (30-minute rounding)
     */
    private static function calculateSimpleOvertimeHours($startMinutes, $endMinutes) {
        $totalMinutes = $endMinutes - $startMinutes;
        
        if ($totalMinutes <= 0) {
            return 0;
        }
        
        $wholeHours = floor($totalMinutes / 60);
        $remainingMinutes = $totalMinutes % 60;
        
        $finalHours = $wholeHours;
        
        if ($remainingMinutes >= 30) {
            $finalHours += 0.5;
        }
        
        return $finalHours;
    }
    
    /**
     * Calculate evening session hours
     */
    private static function calculateEveningSessionHours($clockInTime, $clockOutTime) {
        $clockInMinutes = $clockInTime->format('H') * 60 + $clockInTime->format('i');
        $clockOutMinutes = $clockOutTime->format('H') * 60 + $clockOutTime->format('i');
        
        // Handle overnight shift
        if ($clockOutMinutes < $clockInMinutes) {
            $clockOutMinutes += 24 * 60;
        }
        
        $totalMinutes = $clockOutMinutes - $clockInMinutes;
        
        if ($totalMinutes <= 0) {
            return 0;
        }
        
        $eveningStart = self::EVENING_START;
        $eveningGraceEnd = $eveningStart + self::OVERTIME_GRACE;
        $firstHourEnd = $eveningStart + 60;
        
        $totalHours = 0;
        
        // First hour credit (17:00-18:00)
        if ($clockInMinutes <= $eveningGraceEnd) {
            $totalHours += 1.0;
        } elseif ($clockInMinutes < $firstHourEnd) {
            $totalHours += 0.5;
        }
        
        // Remaining hours after 18:00 with evening rounding rule
        if ($clockOutMinutes > $firstHourEnd) {
            $remainingStart = max($clockInMinutes, $firstHourEnd);
            $remainingMinutes = $clockOutMinutes - $remainingStart;
            
            if ($remainingMinutes > 0) {
                $wholeHours = floor($remainingMinutes / 60);
                $remainingFraction = $remainingMinutes % 60;
                
                $additionalHours = $wholeHours;
                
                // Evening rounding: 25-44 = 0.5, 45+ = 1.0
                if ($remainingFraction >= 45) {
                    $additionalHours += 1.0;
                } elseif ($remainingFraction >= 25) {
                    $additionalHours += 0.5;
                }
                
                $totalHours += $additionalHours;
            }
        }
        
        return $totalHours;
    }
    
    /**
     * Calculate overtime session hours
     */
    private static function calculateOvertimeSessionHours($clockInTime, $clockOutTime) {
        $clockInMinutes = $clockInTime->format('H') * 60 + $clockInTime->format('i');
        $clockOutMinutes = $clockOutTime->format('H') * 60 + $clockOutTime->format('i');
        
        $totalMinutes = $clockOutMinutes - $clockInMinutes;
        $effectiveMinutes = max(0, $totalMinutes - self::OVERTIME_GRACE);
        
        return $effectiveMinutes / 60;
    }
    
    /**
     * Determine next clock type based on last clock type and current time
     */
    public static function determineClockType($lastClockType, $currentTime, $lastClockTime = null) {
        $hour = (int)$currentTime->format('H');
        $minute = (int)$currentTime->format('i');
        $totalMinutes = $hour * 60 + $minute;
        
        $eveningStart = self::EVENING_START + self::OVERTIME_GRACE;
        $nightShiftStart = 1320; // 10:00 PM
        
        // Check if different day
        $isNewDay = false;
        if ($lastClockTime) {
            $lastDate = $lastClockTime->format('Y-m-d');
            $currentDate = $currentTime->format('Y-m-d');
            $isNewDay = ($lastDate !== $currentDate);
        }
        
        // Fresh start if new day or no previous clock
        if ($isNewDay || !$lastClockType) {
            if ($totalMinutes >= $nightShiftStart) {
                return 'overtime_in';
            }
            if ($totalMinutes >= $eveningStart) {
                return 'evening_in';
            }
            return $hour < 12 ? 'morning_in' : 'afternoon_in';
        }
        
        // Sequence-based logic
        switch ($lastClockType) {
            case 'morning_in':
                return 'morning_out';
            case 'morning_out':
                return 'afternoon_in';
            case 'afternoon_in':
                return 'afternoon_out';
            case 'afternoon_out':
                return 'evening_in';
            case 'evening_in':
                return 'evening_out';
            case 'evening_out':
                if ($totalMinutes >= $eveningStart) {
                    return 'evening_in';
                }
                return $hour < 12 ? 'morning_in' : 'afternoon_in';
            case 'overtime_in':
                return 'overtime_out';
            case 'overtime_out':
                if ($totalMinutes >= $nightShiftStart) {
                    return 'overtime_in';
                }
                if ($totalMinutes >= $eveningStart) {
                    return 'evening_in';
                }
                return $hour < 12 ? 'morning_in' : 'afternoon_in';
            default:
                return 'morning_in';
        }
    }
    
    /**
     * Check if employee is late
     */
    public static function isLate($clockType, $clockTime) {
        $totalMinutes = $clockTime->format('H') * 60 + $clockTime->format('i');
        
        if ($clockType === 'morning_in') {
            $earlyMorningStart = self::EARLY_MORNING_START;
            if ($totalMinutes >= $earlyMorningStart && 
                $totalMinutes <= $earlyMorningStart + self::GRACE_PERIOD) {
                return false;
            }
            return $totalMinutes > (self::MORNING_START + self::GRACE_PERIOD);
        } elseif ($clockType === 'afternoon_in') {
            return $totalMinutes > (self::AFTERNOON_START + self::GRACE_PERIOD);
        }
        
        return false;
    }
}

// ============================================================================
// HANDLER FUNCTIONS
// ============================================================================

/**
 * POST /api/attendance-completion/auto-complete
 * Automatically complete missing clock-out records
 */
function handleAutoCompleteAttendance($db, $input) {
    $employeeUid = $input['employee_uid'] ?? null;
    $date = $input['date'] ?? date('Y-m-d');
    $dryRun = $input['dry_run'] ?? false;
    
    try {
        $db->beginTransaction();
        
        // Find all pending clock-ins
        $query = "
            SELECT a.*, e.first_name, e.last_name, e.department
            FROM attendance a
            LEFT JOIN emp_list e ON a.employee_uid = e.uid
            WHERE a.clock_type LIKE '%_in'
              AND a.date = ?
              AND a.id NOT IN (
                  SELECT a1.id FROM attendance a1
                  JOIN attendance a2 ON a1.employee_uid = a2.employee_uid
                  WHERE a1.clock_type LIKE '%_in'
                    AND a2.clock_type = REPLACE(a1.clock_type, '_in', '_out')
                    AND a2.clock_time > a1.clock_time
                    AND a1.date = a2.date
                    AND a1.date = ?
              )
        ";
        
        $params = [$date, $date];
        
        if ($employeeUid) {
            $query .= " AND a.employee_uid = ?";
            $params[] = $employeeUid;
        }
        
        $query .= " ORDER BY a.employee_uid, a.clock_time";
        
        $stmt = $db->prepare($query);
        $stmt->execute($params);
        $pendingClocks = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $completedCount = 0;
        $completedRecords = [];
        
        foreach ($pendingClocks as $pendingClock) {
            $clockInTime = new DateTime($pendingClock['clock_time']);
            $clockInType = $pendingClock['clock_type'];
            $clockOutType = str_replace('_in', '_out', $clockInType);
            
            // Determine appropriate clock-out time
            $clockOutTime = self::estimateClockOutTime($clockInTime, $clockInType);
            
            // Calculate hours
            $hours = TimeCalculator::calculateHours(
                $clockOutType,
                $clockOutTime,
                $clockInTime
            );
            
            if (!$dryRun) {
                // Insert clock-out record
                $insertStmt = $db->prepare("
                    INSERT INTO attendance (
                        employee_uid, id_number, clock_type, clock_time,
                        regular_hours, overtime_hours, date, is_late,
                        notes, is_synced
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
                ");
                
                $insertStmt->execute([
                    $pendingClock['employee_uid'],
                    $pendingClock['id_number'],
                    $clockOutType,
                    $clockOutTime->format('Y-m-d H:i:s'),
                    $hours['regularHours'],
                    $hours['overtimeHours'],
                    $date,
                    0,
                    'Auto-completed by system'
                ]);
                
                $newId = $db->lastInsertId();
                
                $completedRecords[] = [
                    'id' => $newId,
                    'employee_uid' => $pendingClock['employee_uid'],
                    'employee_name' => $pendingClock['first_name'] . ' ' . $pendingClock['last_name'],
                    'clock_in_time' => $clockInTime->format('Y-m-d H:i:s'),
                    'clock_out_time' => $clockOutTime->format('Y-m-d H:i:s'),
                    'clock_type' => $clockOutType,
                    'regular_hours' => $hours['regularHours'],
                    'overtime_hours' => $hours['overtimeHours']
                ];
            }
            
            $completedCount++;
        }
        
        if (!$dryRun) {
            $db->commit();
            
            // Emit socket event
            if ($completedCount > 0) {
                $socketEvents = getSocketEvents();
                $socketEvents->attendanceCreated([
                    'type' => 'auto_completed',
                    'count' => $completedCount,
                    'date' => $date
                ]);
            }
        } else {
            $db->rollBack();
        }
        
        sendSuccessResponse([
            'message' => $dryRun ? 
                "Found {$completedCount} records that can be auto-completed" :
                "Successfully auto-completed {$completedCount} attendance records",
            'completed_count' => $completedCount,
            'dry_run' => $dryRun,
            'records' => $completedRecords
        ]);
        
    } catch (Exception $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        throw $e;
    }
}

/**
 * Estimate clock-out time based on clock-in type
 */
function estimateClockOutTime($clockInTime, $clockInType) {
    $clockOutTime = clone $clockInTime;
    
    switch ($clockInType) {
        case 'morning_in':
            // Assume 4-hour morning shift
            $clockOutTime->modify('+4 hours');
            break;
        case 'afternoon_in':
            // Assume 4-hour afternoon shift
            $clockOutTime->modify('+4 hours');
            break;
        case 'evening_in':
            // Assume 3-hour evening shift
            $clockOutTime->modify('+3 hours');
            break;
        case 'overtime_in':
            // Assume 2-hour overtime shift
            $clockOutTime->modify('+2 hours');
            break;
    }
    
    return $clockOutTime;
}

/**
 * POST /api/attendance-completion/validate-and-fix
 * Validate all attendance records and fix discrepancies
 */
function handleValidateAndFix($db, $input) {
    $startDate = $input['start_date'] ?? date('Y-m-d');
    $endDate = $input['end_date'] ?? date('Y-m-d');
    $employeeUid = $input['employee_uid'] ?? null;
    $autoFix = $input['auto_fix'] ?? false;
    
    try {
        $query = "
            SELECT * FROM attendance 
            WHERE date BETWEEN ? AND ?
              AND clock_type LIKE '%_out'
        ";
        
        $params = [$startDate, $endDate];
        
        if ($employeeUid) {
            $query .= " AND employee_uid = ?";
            $params[] = $employeeUid;
        }
        
        $query .= " ORDER BY employee_uid, date, clock_time";
        
        $stmt = $db->prepare($query);
        $stmt->execute($params);
        $clockOuts = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $validCount = 0;
        $fixedCount = 0;
        $errors = [];
        $fixes = [];
        
        $db->beginTransaction();
        
        foreach ($clockOuts as $clockOut) {
            // Find corresponding clock-in
            $clockInType = str_replace('_out', '_in', $clockOut['clock_type']);
            
            $clockInStmt = $db->prepare("
                SELECT * FROM attendance 
                WHERE employee_uid = ?
                  AND date = ?
                  AND clock_type = ?
                  AND clock_time < ?
                ORDER BY clock_time DESC
                LIMIT 1
            ");
            
            $clockInStmt->execute([
                $clockOut['employee_uid'],
                $clockOut['date'],
                $clockInType,
                $clockOut['clock_time']
            ]);
            
            $clockIn = $clockInStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$clockIn) {
                $errors[] = [
                    'id' => $clockOut['id'],
                    'error' => 'No matching clock-in found',
                    'clock_type' => $clockOut['clock_type']
                ];
                continue;
            }
            
            // Recalculate hours
            $clockInTime = new DateTime($clockIn['clock_time']);
            $clockOutTime = new DateTime($clockOut['clock_time']);
            
            $expectedHours = TimeCalculator::calculateHours(
                $clockOut['clock_type'],
                $clockOutTime,
                $clockInTime
            );
            
            $regularDiff = abs($clockOut['regular_hours'] - $expectedHours['regularHours']);
            $overtimeDiff = abs($clockOut['overtime_hours'] - $expectedHours['overtimeHours']);
            
            $tolerance = 0.01;
            
            if ($regularDiff > $tolerance || $overtimeDiff > $tolerance) {
                $fixes[] = [
                    'id' => $clockOut['id'],
                    'employee_uid' => $clockOut['employee_uid'],
                    'date' => $clockOut['date'],
                    'clock_type' => $clockOut['clock_type'],
                    'old_regular' => $clockOut['regular_hours'],
                    'new_regular' => $expectedHours['regularHours'],
                    'old_overtime' => $clockOut['overtime_hours'],
                    'new_overtime' => $expectedHours['overtimeHours']
                ];
                
                if ($autoFix) {
                    $updateStmt = $db->prepare("
                        UPDATE attendance 
                        SET regular_hours = ?,
                            overtime_hours = ?,
                            is_synced = 0
                        WHERE id = ?
                    ");
                    
                    $updateStmt->execute([
                        $expectedHours['regularHours'],
                        $expectedHours['overtimeHours'],
                        $clockOut['id']
                    ]);
                    
                    $fixedCount++;
                }
            } else {
                $validCount++;
            }
        }
        
        if ($autoFix) {
            $db->commit();
            
            // Emit socket event
            if ($fixedCount > 0) {
                $socketEvents = getSocketEvents();
                $socketEvents->attendanceUpdated([
                    'type' => 'validation_fix',
                    'count' => $fixedCount,
                    'date_range' => ['start' => $startDate, 'end' => $endDate]
                ]);
            }
        } else {
            $db->rollBack();
        }
        
        sendSuccessResponse([
            'message' => $autoFix ?
                "Validated and fixed {$fixedCount} records" :
                "Validation complete - {$fixedCount} records need fixing",
            'total_checked' => count($clockOuts),
            'valid_count' => $validCount,
            'fixed_count' => $fixedCount,
            'error_count' => count($errors),
            'auto_fix' => $autoFix,
            'fixes' => $fixes,
            'errors' => $errors
        ]);
        
    } catch (Exception $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        throw $e;
    }
}

/**
 * POST /api/attendance-completion/compute-missing
 * Compute and fill missing attendance records
 */
function handleComputeMissing($db, $input) {
    $startDate = $input['start_date'] ?? null;
    $endDate = $input['end_date'] ?? null;
    $employeeUid = $input['employee_uid'] ?? null;
    $fillMissing = $input['fill_missing'] ?? false;
    
    if (!$startDate || !$endDate) {
        sendErrorResponse('start_date and end_date are required', 400);
        return;
    }
    
    try {
        // Get all employees or specific employee
        $empQuery = "SELECT uid, id_number, first_name, last_name, department FROM emp_list";
        $empParams = [];
        
        if ($employeeUid) {
            $empQuery .= " WHERE uid = ?";
            $empParams[] = $employeeUid;
        }
        
        $empStmt = $db->prepare($empQuery);
        $empStmt->execute($empParams);
        $employees = $empStmt->fetchAll(PDO::FETCH_ASSOC);
        
        $missingRecords = [];
        $filledCount = 0;
        
        $db->beginTransaction();
        
        foreach ($employees as $employee) {
            // Get all dates in range
            $currentDate = new DateTime($startDate);
            $endDateObj = new DateTime($endDate);
            
            while ($currentDate <= $endDateObj) {
                $dateStr = $currentDate->format('Y-m-d');
                
                // Check if employee has attendance on this date
                $checkStmt = $db->prepare("
                    SELECT COUNT(*) as count 
                    FROM attendance 
                    WHERE employee_uid = ? AND date = ?
                ");
                $checkStmt->execute([$employee['uid'], $dateStr]);
                $result = $checkStmt->fetch(PDO::FETCH_ASSOC);
                
                if ($result['count'] == 0) {
                    // Skip weekends (Saturday = 6, Sunday = 0)
                    $dayOfWeek = (int)$currentDate->format('w');
                    if ($dayOfWeek == 0 || $dayOfWeek == 6) {
                        $currentDate->modify('+1 day');
                        continue;
                    }
                    
                    $missingRecords[] = [
                        'employee_uid' => $employee['uid'],
                        'employee_name' => $employee['first_name'] . ' ' . $employee['last_name'],
                        'department' => $employee['department'],
                        'date' => $dateStr,
                        'day_of_week' => $currentDate->format('l')
                    ];
                    
                    if ($fillMissing) {
                        // Create default attendance records (8-hour day)
                        $morningIn = clone $currentDate;
                        $morningIn->setTime(8, 0, 0);
                        
                        $morningOut = clone $currentDate;
                        $morningOut->setTime(12, 0, 0);
                        
                        $afternoonIn = clone $currentDate;
                        $afternoonIn->setTime(13, 0, 0);
                        
                        $afternoonOut = clone $currentDate;
                        $afternoonOut->setTime(17, 0, 0);
                        
                        // Insert morning_in
                        self::insertAttendanceRecord($db, $employee, 'morning_in', $morningIn, $dateStr, 0, 0, 'Auto-generated');
                        
                        // Insert morning_out with hours
                        self::insertAttendanceRecord($db, $employee, 'morning_out', $morningOut, $dateStr, 4, 0, 'Auto-generated');
                        
                        // Insert afternoon_in
                        self::insertAttendanceRecord($db, $employee, 'afternoon_in', $afternoonIn, $dateStr, 0, 0, 'Auto-generated');
                        
                        // Insert afternoon_out with hours
                        self::insertAttendanceRecord($db, $employee, 'afternoon_out', $afternoonOut, $dateStr, 4, 0, 'Auto-generated');
                        
                        $filledCount++;
                    }
                }
                
                $currentDate->modify('+1 day');
            }
        }
        
        if ($fillMissing) {
            $db->commit();
            
            // Emit socket event
            if ($filledCount > 0) {
                $socketEvents = getSocketEvents();
                $socketEvents->attendanceCreated([
                    'type' => 'auto_filled',
                    'count' => $filledCount * 4, // 4 records per day
                    'employee_days' => $filledCount
                ]);
            }
        } else {
            $db->rollBack();
        }
        
        sendSuccessResponse([
            'message' => $fillMissing ?
                "Auto-filled {$filledCount} employee-days with default attendance" :
                "Found {$filledCount} employee-days with missing attendance",
            'missing_count' => count($missingRecords),
            'filled_count' => $fillMissing ? $filledCount : 0,
            'fill_missing' => $fillMissing,
            'missing_records' => array_slice($missingRecords, 0, 50), // Limit to 50 for response
            'date_range' => ['start' => $startDate, 'end' => $endDate]
        ]);
        
    } catch (Exception $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        throw $e;
    }
}

/**
 * Helper function to insert attendance record
 */
function insertAttendanceRecord($db, $employee, $clockType, $clockTime, $date, $regularHours, $overtimeHours, $notes) {
    $insertStmt = $db->prepare("
        INSERT INTO attendance (
            employee_uid, id_number, clock_type, clock_time,
            regular_hours, overtime_hours, date, is_late,
            notes, is_synced
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 0)
    ");
    
    $insertStmt->execute([
        $employee['uid'],
        $employee['id_number'],
        $clockType,
        $clockTime->format('Y-m-d H:i:s'),
        $regularHours,
        $overtimeHours,
        $date,
        $notes
    ]);
}

/**
 * GET /api/attendance-completion/missing-records
 * Get list of missing attendance records
 */
function handleGetMissingRecords($db) {
    $startDate = $_GET['start_date'] ?? date('Y-m-d', strtotime('-7 days'));
    $endDate = $_GET['end_date'] ?? date('Y-m-d');
    $employeeUid = $_GET['employee_uid'] ?? null;
    
    try {
        // Get incomplete sessions (clock-in without clock-out)
        $incompleteQuery = "
            SELECT 
                a.id,
                a.employee_uid,
                a.clock_type,
                a.clock_time,
                a.date,
                e.first_name,
                e.last_name,
                e.department
            FROM attendance a
            LEFT JOIN emp_list e ON a.employee_uid = e.uid
            WHERE a.clock_type LIKE '%_in'
              AND a.date BETWEEN ? AND ?
              AND a.id NOT IN (
                  SELECT a1.id FROM attendance a1
                  JOIN attendance a2 ON a1.employee_uid = a2.employee_uid
                  WHERE a1.clock_type LIKE '%_in'
                    AND a2.clock_type = REPLACE(a1.clock_type, '_in', '_out')
                    AND a2.clock_time > a1.clock_time
                    AND a1.date = a2.date
              )
        ";
        
        $params = [$startDate, $endDate];
        
        if ($employeeUid) {
            $incompleteQuery .= " AND a.employee_uid = ?";
            $params[] = $employeeUid;
        }
        
        $incompleteQuery .= " ORDER BY a.date DESC, a.clock_time DESC";
        
        $stmt = $db->prepare($incompleteQuery);
        $stmt->execute($params);
        $incompleteSessions = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Get employees with no attendance on working days
        $missingDaysQuery = "
            SELECT DISTINCT
                e.uid as employee_uid,
                e.first_name,
                e.last_name,
                e.department,
                dates.date
            FROM emp_list e
            CROSS JOIN (
                SELECT DATE(?) + INTERVAL (a.a + (10 * b.a) + (100 * c.a)) DAY as date
                FROM (SELECT 0 AS a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) AS a
                CROSS JOIN (SELECT 0 AS a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) AS b
                CROSS JOIN (SELECT 0 AS a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) AS c
            ) dates
            WHERE dates.date BETWEEN ? AND ?
              AND DAYOFWEEK(dates.date) NOT IN (1, 7)
              AND NOT EXISTS (
                  SELECT 1 FROM attendance a
                  WHERE a.employee_uid = e.uid
                    AND a.date = dates.date
              )
        ";
        
        $missingParams = [$startDate, $startDate, $endDate];
        
        if ($employeeUid) {
            $missingDaysQuery .= " AND e.uid = ?";
            $missingParams[] = $employeeUid;
        }
        
        $missingDaysQuery .= " ORDER BY dates.date DESC, e.last_name, e.first_name LIMIT 100";
        
        $stmt = $db->prepare($missingDaysQuery);
        $stmt->execute($missingParams);
        $missingDays = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        sendSuccessResponse([
            'data' => [
                'incomplete_sessions' => $incompleteSessions,
                'missing_days' => $missingDays,
                'summary' => [
                    'incomplete_sessions_count' => count($incompleteSessions),
                    'missing_days_count' => count($missingDays),
                    'total_issues' => count($incompleteSessions) + count($missingDays)
                ]
            ],
            'date_range' => ['start' => $startDate, 'end' => $endDate]
        ]);
        
    } catch (Exception $e) {
        throw $e;
    }
}

/**
 * POST /api/attendance-completion/rebuild-summary
 * Rebuild daily summary for specific date range
 */
function handleRebuildSummary($db, $input) {
    $startDate = $input['start_date'] ?? null;
    $endDate = $input['end_date'] ?? null;
    $employeeUid = $input['employee_uid'] ?? null;
    
    if (!$startDate || !$endDate) {
        sendErrorResponse('start_date and end_date are required', 400);
        return;
    }
    
    try {
        // Get all employee-date combinations with attendance
        $query = "
            SELECT DISTINCT employee_uid, date
            FROM attendance 
            WHERE date BETWEEN ? AND ?
        ";
        
        $params = [$startDate, $endDate];
        
        if ($employeeUid) {
            $query .= " AND employee_uid = ?";
            $params[] = $employeeUid;
        }
        
        $query .= " ORDER BY employee_uid, date";
        
        $stmt = $db->prepare($query);
        $stmt->execute($params);
        $employeeDates = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $successCount = 0;
        $failCount = 0;
        
        $db->beginTransaction();
        
        foreach ($employeeDates as $row) {
            try {
                $rebuilt = self::rebuildDailySummaryForEmployeeDate(
                    $db,
                    $row['employee_uid'],
                    $row['date']
                );
                
                if ($rebuilt) {
                    $successCount++;
                } else {
                    $failCount++;
                }
            } catch (Exception $e) {
                error_log("Error rebuilding summary for {$row['employee_uid']} on {$row['date']}: " . $e->getMessage());
                $failCount++;
            }
        }
        
        $db->commit();
        
        // Emit socket event
        if ($successCount > 0) {
            $socketEvents = getSocketEvents();
            $socketEvents->dailySummaryRebuilt([
                'processed_count' => $successCount + $failCount,
                'success_count' => $successCount,
                'fail_count' => $failCount
            ]);
        }
        
        sendSuccessResponse([
            'message' => "Rebuilt {$successCount} daily summary records",
            'success_count' => $successCount,
            'fail_count' => $failCount,
            'total_processed' => $successCount + $failCount,
            'date_range' => ['start' => $startDate, 'end' => $endDate]
        ]);
        
    } catch (Exception $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        throw $e;
    }
}

/**
 * Rebuild daily summary for a specific employee and date
 */
function rebuildDailySummaryForEmployeeDate($db, $employeeUid, $date) {
    // Get employee info
    $empStmt = $db->prepare("
        SELECT uid, id_number, id_barcode, first_name, last_name, department
        FROM emp_list WHERE uid = ?
    ");
    $empStmt->execute([$employeeUid]);
    $employee = $empStmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$employee) {
        return false;
    }
    
    // Get all attendance records for this date
    $attStmt = $db->prepare("
        SELECT * FROM attendance 
        WHERE employee_uid = ? AND date = ?
        ORDER BY clock_time ASC
    ");
    $attStmt->execute([$employeeUid, $date]);
    $records = $attStmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (count($records) == 0) {
        return false;
    }
    
    // Initialize session times
    $sessionTimes = [
        'morning_in' => null, 'morning_out' => null,
        'afternoon_in' => null, 'afternoon_out' => null,
        'evening_in' => null, 'evening_out' => null,
        'overtime_in' => null, 'overtime_out' => null
    ];
    
    $totalRegular = 0;
    $totalOvertime = 0;
    $hasLate = false;
    $hasOvertime = false;
    $hasEvening = false;
    $totalSessions = 0;
    $completedSessions = 0;
    $pendingSessions = 0;
    
    // Process records
    foreach ($records as $record) {
        $clockType = $record['clock_type'];
        
        if (array_key_exists($clockType, $sessionTimes)) {
            $sessionTimes[$clockType] = $record['clock_time'];
        }
        
        $totalRegular += floatval($record['regular_hours'] ?? 0);
        $totalOvertime += floatval($record['overtime_hours'] ?? 0);
        
        if ($record['is_late']) {
            $hasLate = true;
        }
        
        if (strpos($clockType, '_in') !== false) {
            $totalSessions++;
            
            // Check if has corresponding out
            $outType = str_replace('_in', '_out', $clockType);
            $hasOut = false;
            
            foreach ($records as $r) {
                if ($r['clock_type'] == $outType && $r['clock_time'] > $record['clock_time']) {
                    $hasOut = true;
                    break;
                }
            }
            
            if ($hasOut) {
                $completedSessions++;
            } else {
                $pendingSessions++;
            }
        }
        
        if (strpos($clockType, 'overtime') === 0 || strpos($clockType, 'evening') === 0) {
            $hasOvertime = true;
            if (strpos($clockType, 'evening') === 0) {
                $hasEvening = true;
            }
        }
    }
    
    // Get first clock in and last clock out
    $firstClockIn = null;
    $lastClockOut = null;
    
    foreach ($records as $record) {
        if (strpos($record['clock_type'], '_in') !== false && !$firstClockIn) {
            $firstClockIn = $record['clock_time'];
        }
    }
    
    for ($i = count($records) - 1; $i >= 0; $i--) {
        if (strpos($records[$i]['clock_type'], '_out') !== false) {
            $lastClockOut = $records[$i]['clock_time'];
            break;
        }
    }
    
    // Calculate total minutes worked
    $totalMinutes = 0;
    if ($firstClockIn && $lastClockOut) {
        $start = strtotime($firstClockIn);
        $end = strtotime($lastClockOut);
        $totalMinutes = round(($end - $start) / 60);
    }
    
    // Break time (1 hour if both morning and afternoon sessions)
    $breakTime = ($sessionTimes['morning_out'] && $sessionTimes['afternoon_in']) ? 60 : 0;
    
    // Upsert summary
    $upsertStmt = $db->prepare("
        INSERT INTO daily_attendance_summary (
            employee_uid, id_number, id_barcode, employee_name, first_name, last_name,
            department, date, first_clock_in, last_clock_out,
            morning_in, morning_out, afternoon_in, afternoon_out,
            evening_in, evening_out, overtime_in, overtime_out,
            regular_hours, overtime_hours, total_hours,
            is_incomplete, has_late_entry, has_overtime, has_evening_session,
            total_sessions, completed_sessions, pending_sessions,
            total_minutes_worked, break_time_minutes, last_updated, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE
            id_number = VALUES(id_number),
            id_barcode = VALUES(id_barcode),
            employee_name = VALUES(employee_name),
            first_name = VALUES(first_name),
            last_name = VALUES(last_name),
            department = VALUES(department),
            first_clock_in = VALUES(first_clock_in),
            last_clock_out = VALUES(last_clock_out),
            morning_in = VALUES(morning_in),
            morning_out = VALUES(morning_out),
            afternoon_in = VALUES(afternoon_in),
            afternoon_out = VALUES(afternoon_out),
            evening_in = VALUES(evening_in),
            evening_out = VALUES(evening_out),
            overtime_in = VALUES(overtime_in),
            overtime_out = VALUES(overtime_out),
            regular_hours = VALUES(regular_hours),
            overtime_hours = VALUES(overtime_hours),
            total_hours = VALUES(total_hours),
            is_incomplete = VALUES(is_incomplete),
            has_late_entry = VALUES(has_late_entry),
            has_overtime = VALUES(has_overtime),
            has_evening_session = VALUES(has_evening_session),
            total_sessions = VALUES(total_sessions),
            completed_sessions = VALUES(completed_sessions),
            pending_sessions = VALUES(pending_sessions),
            total_minutes_worked = VALUES(total_minutes_worked),
            break_time_minutes = VALUES(break_time_minutes),
            last_updated = NOW()
    ");
    
    $upsertStmt->execute([
        $employee['uid'],
        $employee['id_number'],
        $employee['id_barcode'],
        $employee['first_name'] . ' ' . $employee['last_name'],
        $employee['first_name'],
        $employee['last_name'],
        $employee['department'],
        $date,
        $firstClockIn,
        $lastClockOut,
        $sessionTimes['morning_in'],
        $sessionTimes['morning_out'],
        $sessionTimes['afternoon_in'],
        $sessionTimes['afternoon_out'],
        $sessionTimes['evening_in'],
        $sessionTimes['evening_out'],
        $sessionTimes['overtime_in'],
        $sessionTimes['overtime_out'],
        $totalRegular,
        $totalOvertime,
        $totalRegular + $totalOvertime,
        $pendingSessions > 0 ? 1 : 0,
        $hasLate ? 1 : 0,
        $hasOvertime ? 1 : 0,
        $hasEvening ? 1 : 0,
        $totalSessions,
        $completedSessions,
        $pendingSessions,
        $totalMinutes,
        $breakTime
    ]);
    
    return true;
}

?>