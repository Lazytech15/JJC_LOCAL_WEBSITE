//client attendance.jsx - Enhanced with employee details modal, statistics, and Excel export
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { pollingManager } from "../../utils/api/websocket/polling-manager";
import apiService from "../../utils/api/api-service";
import * as XLSX from "xlsx";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import AttendanceEdit from "./AttendanceEdit"
import FaceRecognitionModal from './FaceRecognitionDetection';
import GearLoadingSpinner from "../../../public/LoadingGear";

function Attendance() {
  const { user, isDarkMode } = useAuth();
  const [attendanceData, setAttendanceData] = useState([]);
  const [profilePictures, setProfilePictures] = useState({});
  const [profileLoadingState, setProfileLoadingState] = useState("idle");
  const [stats, setStats] = useState({
    total_records: 0,
    unique_employees: 0,
    total_regular_hours: 0,
    total_overtime_hours: 0,
    late_count: 0,
    clock_ins: 0,
    clock_outs: 0,
    unsynced_count: 0,
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [lastUpdate, setLastUpdate] = useState(null);
  const [filters, setFilters] = useState({
    date: "", // Changed from new Date().toISOString().split("T")[0] to empty string
    startDate: "",
    endDate: "",
    useRange: false,
    employee_uid: "",
    clock_type: "",
    limit: 20,
    offset: 0,
  });
  // Add state for modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [newRecordIds, setNewRecordIds] = useState(new Set());

  // Employee Details Modal State
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [employeeStats, setEmployeeStats] = useState(null);
  const [employeeHistory, setEmployeeHistory] = useState([]);
  const [loadingEmployeeData, setLoadingEmployeeData] = useState(false);
  const [selectedRecordsToUnsync, setSelectedRecordsToUnsync] = useState(new Set());

  // Export State
  const [isExporting, setIsExporting] = useState(false);
  const [showFaceRecognition, setShowFaceRecognition] = useState(false);

  // Group attendance records by employee and date
  const groupAttendanceByEmployee = (records) => {
    const grouped = {};

    records.forEach((record) => {
      const key = `${record.employee_uid}-${record.date}`;
      if (!grouped[key]) {
        grouped[key] = {
          employee_uid: record.employee_uid,
          employee_info: {
            last_name: record.last_name,
            first_name: record.first_name,
            middle_name: record.middle_name,
            id_number: record.id_number,
            department: record.department,
            position: record.position,
          },
          date: record.date,
          records: [],
          total_regular_hours: 0,
          total_overtime_hours: 0,
          is_late: false,
          has_unsynced: false,
          latest_clock_time: null,
        };
      }

      grouped[key].records.push(record);
      grouped[key].total_regular_hours += record.regular_hours || 0;
      grouped[key].total_overtime_hours += record.overtime_hours || 0;
      grouped[key].is_late = grouped[key].is_late || record.is_late;
      grouped[key].has_unsynced =
        grouped[key].has_unsynced || !record.is_synced;

      // Track the latest clock time for sorting
      const clockTime = new Date(record.clock_time);
      if (
        !grouped[key].latest_clock_time ||
        clockTime > new Date(grouped[key].latest_clock_time)
      ) {
        grouped[key].latest_clock_time = record.clock_time;
      }
    });

    // Convert to array and sort by latest clock time
    return Object.values(grouped).sort(
      (a, b) => new Date(b.latest_clock_time) - new Date(a.latest_clock_time)
    );
  };

  const handleEmployeeIdentified = (employee, descriptor) => {
    fetchAttendanceData();
    fetchAttendanceStats();

    // Close the modal after a delay
    setTimeout(() => {
      setShowFaceRecognition(false);
    }, 2000);
  };

  // Load detailed employee data
  const loadEmployeeDetails = async (employee_uid, employee_info) => {
    setSelectedEmployee({ uid: employee_uid, info: employee_info });
    setShowEmployeeModal(true);
    setLoadingEmployeeData(true);

    try {
      // Get employee's daily summary for the past 30 days
      const endDate = new Date().toISOString().split("T")[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      const [summaryResult, statsResult] = await Promise.all([
        apiService.summary.getEmployeeDailySummary(employee_uid, {
          start_date: startDate,
          end_date: endDate,
          limit: 30,
        }),
        apiService.summary.getDailySummaryStats({
          start_date: startDate,
          end_date: endDate,
        }),
      ]);

      if (summaryResult.success) {
        setEmployeeHistory(summaryResult.data.records || []);
        setEmployeeStats(summaryResult.data.summary || {});
      } else {
        throw new Error(
          summaryResult.error || "Failed to load employee summary"
        );
      }
    } catch (error) {
      console.error("Error loading employee details:", error);
      setEmployeeHistory([]);
      setEmployeeStats(null);
    } finally {
      setLoadingEmployeeData(false);
    }
  };

  // Close employee modal
  const closeEmployeeModal = () => {
    setShowEmployeeModal(false);
    setSelectedEmployee(null);
    setEmployeeStats(null);
    setEmployeeHistory([]);
  };

  // Prepare chart data for employee history
  const prepareChartData = (history) => {
    return history
      .map((record) => ({
        date: record.date,
        regular_hours: record.regular_hours || 0,
        overtime_hours: record.overtime_hours || 0,
        total_hours: record.total_hours || 0,
        is_late: record.has_late_entry ? 1 : 0,
        is_incomplete: record.is_incomplete ? 1 : 0,
      }))
      .reverse(); // Reverse to show chronological order
  };

  // Prepare pie chart data for hours distribution
  const preparePieData = (stats) => {
    if (!stats) return [];
    return [
      {
        name: "Regular Hours",
        value: stats.total_regular_hours || 0,
        color: "#10b981",
      },
      {
        name: "Overtime Hours",
        value: stats.total_overtime_hours || 0,
        color: "#f59e0b",
      },
    ].filter((item) => item.value > 0);
  };

  // Enhanced Excel Export Functions with intelligent remarks and professional styling
  const exportToExcel = async () => {
    try {
      setIsExporting(true);

      // Determine date parameters based on range mode
      const dateParams = {};
      if (filters.useRange && filters.startDate && filters.endDate) {
        dateParams.start_date = filters.startDate;
        dateParams.end_date = filters.endDate;
      } else {
        dateParams.date = filters.date;
      }

      // Get comprehensive data for the selected date/range
      const [attendanceResult, summaryResult] = await Promise.all([
        apiService.attendance.getAttendanceRecords({
          ...dateParams,
          limit: "1000",
          sort_by: "employee_uid,clock_time",
          sort_order: "ASC",
        }),
        apiService.summary.getDailySummaryRecords({
          ...dateParams,
          limit: "1000",
          sort_by: "employee_uid,date",
          sort_order: "ASC",
        }),
      ]);

      if (!attendanceResult.success) {
        throw new Error(
          attendanceResult.error || "Failed to fetch attendance data"
        );
      }

      const workbook = XLSX.utils.book_new();

      // Date range for display
      const dateRange =
        filters.useRange && filters.startDate && filters.endDate
          ? `${new Date(filters.startDate).toLocaleDateString()} - ${new Date(
            filters.endDate
          ).toLocaleDateString()}`
          : new Date(filters.date).toLocaleDateString();

      // 1. Enhanced Summary Sheet with additional statistics
      const summaryData = [];

      // Header information with professional styling
      summaryData.push(["COMPREHENSIVE ATTENDANCE ANALYSIS REPORT"]);
      summaryData.push([`Period: ${dateRange}`]);
      summaryData.push([`Generated: ${new Date().toLocaleString()}`]);
      summaryData.push([`Report Generated By: ${user?.name || 'System'}`]);
      summaryData.push([]); // Empty row

      // Calculate enhanced statistics
      const rangeStats = {
        total_records: attendanceResult.data.length,
        unique_employees: new Set(attendanceResult.data.map(r => r.employee_uid)).size,
        total_regular_hours: attendanceResult.data.reduce((sum, r) => sum + (r.regular_hours || 0), 0),
        total_overtime_hours: attendanceResult.data.reduce((sum, r) => sum + (r.overtime_hours || 0), 0),
        late_count: attendanceResult.data.filter(r => r.is_late).length,
        clock_ins: attendanceResult.data.filter(r => r.clock_type.includes("_in")).length,
        clock_outs: attendanceResult.data.filter(r => r.clock_type.includes("_out")).length,
        unsynced_count: attendanceResult.data.filter(r => !r.is_synced).length,
        // Additional statistics
        incomplete_records: attendanceResult.data.filter(r => !r.is_synced || r.is_late).length,
        peak_hour_activity: {},
        department_breakdown: {},
        position_breakdown: {}
      };

      // Calculate peak hour activity
      attendanceResult.data.forEach(record => {
        const hour = new Date(record.clock_time).getHours();
        rangeStats.peak_hour_activity[hour] = (rangeStats.peak_hour_activity[hour] || 0) + 1;
      });

      // Department and position breakdown
      attendanceResult.data.forEach(record => {
        if (record.department) {
          rangeStats.department_breakdown[record.department] =
            (rangeStats.department_breakdown[record.department] || 0) + 1;
        }
        if (record.position) {
          rangeStats.position_breakdown[record.position] =
            (rangeStats.position_breakdown[record.position] || 0) + 1;
        }
      });

      // Executive Summary
      summaryData.push(["EXECUTIVE SUMMARY"]);
      summaryData.push(["Key Performance Indicators", "Value", "Status", "Recommendation"]);

      const avgHoursPerEmployee = rangeStats.unique_employees > 0 ?
        rangeStats.total_regular_hours / rangeStats.unique_employees : 0;
      const latePercentage = rangeStats.total_records > 0 ?
        (rangeStats.late_count / rangeStats.total_records) * 100 : 0;
      const syncPercentage = rangeStats.total_records > 0 ?
        ((rangeStats.total_records - rangeStats.unsynced_count) / rangeStats.total_records) * 100 : 0;

      summaryData.push([
        "Average Hours per Employee",
        avgHoursPerEmployee.toFixed(2) + "h",
        avgHoursPerEmployee >= 8 ? "Good" : "Below Standard",
        avgHoursPerEmployee < 8 ? "Monitor productivity levels" : "Maintain current performance"
      ]);

      summaryData.push([
        "Punctuality Rate",
        (100 - latePercentage).toFixed(1) + "%",
        latePercentage <= 5 ? "Excellent" : latePercentage <= 15 ? "Good" : "Needs Improvement",
        latePercentage > 15 ? "Implement punctuality improvement program" : "Continue monitoring"
      ]);

      summaryData.push([
        "Data Sync Compliance",
        syncPercentage.toFixed(1) + "%",
        syncPercentage >= 95 ? "Excellent" : syncPercentage >= 85 ? "Good" : "Critical",
        syncPercentage < 95 ? "Address technical sync issues immediately" : "System performing optimally"
      ]);

      summaryData.push([]); // Empty row

      // Detailed Statistics
      summaryData.push(["DETAILED STATISTICS"]);
      summaryData.push(["Metric", "Count", "Hours", "Percentage"]);
      summaryData.push(["Total Records", rangeStats.total_records, "", "100%"]);
      summaryData.push(["Unique Employees", rangeStats.unique_employees, "", ""]);
      summaryData.push(["Regular Hours", "", rangeStats.total_regular_hours.toFixed(2),
        ((rangeStats.total_regular_hours / (rangeStats.total_regular_hours + rangeStats.total_overtime_hours)) * 100).toFixed(1) + "%"]);
      summaryData.push(["Overtime Hours", "", rangeStats.total_overtime_hours.toFixed(2),
        ((rangeStats.total_overtime_hours / (rangeStats.total_regular_hours + rangeStats.total_overtime_hours)) * 100).toFixed(1) + "%"]);
      summaryData.push(["Late Arrivals", rangeStats.late_count, "", (latePercentage).toFixed(1) + "%"]);
      summaryData.push(["Clock Ins", rangeStats.clock_ins, "", ""]);
      summaryData.push(["Clock Outs", rangeStats.clock_outs, "", ""]);
      summaryData.push(["Unsynced Records", rangeStats.unsynced_count, "", (100 - syncPercentage).toFixed(1) + "%"]);
      summaryData.push([]); // Empty row

      // Department Breakdown
      if (Object.keys(rangeStats.department_breakdown).length > 0) {
        summaryData.push(["DEPARTMENT ANALYSIS"]);
        summaryData.push(["Department", "Records", "Percentage", "Average per Employee"]);
        Object.entries(rangeStats.department_breakdown)
          .sort(([, a], [, b]) => b - a)
          .forEach(([dept, count]) => {
            const percentage = ((count / rangeStats.total_records) * 100).toFixed(1);
            const employeesInDept = new Set(
              attendanceResult.data.filter(r => r.department === dept).map(r => r.employee_uid)
            ).size;
            const avgPerEmployee = employeesInDept > 0 ? (count / employeesInDept).toFixed(1) : "0";
            summaryData.push([dept, count, percentage + "%", avgPerEmployee + " records"]);
          });
        summaryData.push([]); // Empty row
      }

      // Peak Activity Analysis
      const peakHour = Object.entries(rangeStats.peak_hour_activity)
        .sort(([, a], [, b]) => b - a)[0];

      summaryData.push(["ACTIVITY ANALYSIS"]);
      summaryData.push(["Analysis Type", "Result", "Impact", "Insight"]);
      summaryData.push([
        "Peak Activity Hour",
        peakHour ? `${peakHour[0]}:00 (${peakHour[1]} records)` : "No data",
        "High server load expected",
        "Consider staggered break times"
      ]);
      summaryData.push([
        "Clock In/Out Balance",
        `${Math.abs(rangeStats.clock_ins - rangeStats.clock_outs)}`,
        rangeStats.clock_ins === rangeStats.clock_outs ? "Balanced" : "Imbalanced",
        rangeStats.clock_ins !== rangeStats.clock_outs ? "Some employees may have incomplete records" : "All clock cycles complete"
      ]);
      summaryData.push([]); // Empty row

      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);

      // Enhanced styling for summary sheet
      const summaryRange = XLSX.utils.decode_range(summarySheet['!ref']);

      // Style headers and important rows
      for (let R = summaryRange.s.r; R <= summaryRange.e.r; R++) {
        for (let C = summaryRange.s.c; C <= summaryRange.e.c; C++) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          if (!summarySheet[cellAddress]) continue;

          // Main title (row 0)
          if (R === 0) {
            summarySheet[cellAddress].s = {
              font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } },
              fill: { fgColor: { rgb: "2563EB" } }, // Blue background
              alignment: { horizontal: "center", vertical: "center" }
            };
          }
          // Section headers
          else if (summaryData[R] && typeof summaryData[R][0] === 'string' &&
            summaryData[R][0].includes('SUMMARY') || summaryData[R][0].includes('STATISTICS') ||
            summaryData[R][0].includes('ANALYSIS') || summaryData[R][0].includes('BREAKDOWN')) {
            summarySheet[cellAddress].s = {
              font: { bold: true, sz: 12, color: { rgb: "FFFFFF" } },
              fill: { fgColor: { rgb: "059669" } }, // Green background
              alignment: { horizontal: "center" }
            };
          }
          // Sub-headers (table headers)
          else if (summaryData[R] && summaryData[R].includes("Value") || summaryData[R].includes("Count") ||
            summaryData[R].includes("Metric") || summaryData[R].includes("Department")) {
            summarySheet[cellAddress].s = {
              font: { bold: true, color: { rgb: "FFFFFF" } },
              fill: { fgColor: { rgb: "7C3AED" } }, // Purple background
              alignment: { horizontal: "center" }
            };
          }
        }
      }

      summarySheet["!cols"] = [
        { wch: 35 }, { wch: 20 }, { wch: 20 }, { wch: 30 }
      ];

      XLSX.utils.book_append_sheet(workbook, summarySheet, "Executive Summary");

      // 2. Enhanced Detailed Attendance Sheet
      const detailedHeaders = [
        "Employee ID", "Employee Name", "Department", "Position", "Date",
        "Clock Type", "Clock Time", "Regular Hours", "Overtime Hours",
        "Is Late", "Is Synced", "Location", "Device Info", "Data Quality Score"
      ];

      const detailedData = [detailedHeaders];

      attendanceResult.data.forEach((record) => {
        const employeeName = formatEmployeeName({
          last_name: record.last_name,
          middle_name: record.middle_name,
          first_name: record.first_name,
        });

        // Calculate data quality score
        let qualityScore = 100;
        if (!record.is_synced) qualityScore -= 30;
        if (record.is_late) qualityScore -= 20;
        if (!record.location) qualityScore -= 15;
        if (!record.device_info) qualityScore -= 10;

        detailedData.push([
          record.employee_uid || "N/A",
          employeeName,
          record.department || "N/A",
          record.position || "N/A",
          record.date,
          formatClockType(record.clock_type),
          formatTime(record.clock_time),
          (record.regular_hours || 0).toFixed(2),
          (record.overtime_hours || 0).toFixed(2),
          record.is_late ? "YES" : "NO",
          record.is_synced ? "YES" : "NO",
          record.location || "N/A",
          record.device_info || "N/A",
          qualityScore + "%"
        ]);
      });

      const detailedSheet = XLSX.utils.aoa_to_sheet(detailedData);

      // Style detailed sheet headers
      const detailedRange = XLSX.utils.decode_range(detailedSheet['!ref']);
      for (let C = detailedRange.s.c; C <= detailedRange.e.c; C++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
        if (detailedSheet[cellAddress]) {
          detailedSheet[cellAddress].s = {
            font: { bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "1F2937" } }, // Dark gray background
            alignment: { horizontal: "center" }
          };
        }
      }

      detailedSheet["!cols"] = [
        { wch: 12 }, { wch: 25 }, { wch: 15 }, { wch: 20 }, { wch: 12 },
        { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 8 },
        { wch: 8 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
      ];

      XLSX.utils.book_append_sheet(workbook, detailedSheet, "Detailed Records");

      // 3. Enhanced Employee Summary Sheet with intelligent remarks - FIXED SORTING
      if (summaryResult.success && summaryResult.data.length > 0) {
        const employeeSummaryHeaders = [
          "EMPLOYEE_NAME", "DATE_OF_LOG", "MORNING_IN", "MORNING_OUT",
          "AFTERNOON_IN", "AFTERNOON_OUT", "OVERTIME_IN", "OVERTIME_OUT",
          "REG HRS", "OT HRS", "SUNDAY", "REMARKS"
        ];

        // Start with empty array - no initial header row
        const employeeSummaryData = [];

        // Helper function to generate intelligent remarks - FIXED VERSION
        const generateRemarks = (summary) => {
          const remarks = [];

          // Check for clock records existence - FIXED: properly define variables
          const hasAnyClockIn = summary.morning_in || summary.afternoon_in || summary.evening_in;
          const hasAnyClockOut = summary.morning_out || summary.afternoon_out || summary.evening_out;

          // Check for perfect attendance first - if perfect, return empty
          if (summary.total_hours >= 8 && !summary.has_late_entry && hasAnyClockIn && hasAnyClockOut) {
            return ""; // Perfect attendance = no remarks
          }

          // Check specific incomplete cycles
          const missingOuts = [];
          if (summary.morning_in && !summary.morning_out) {
            missingOuts.push("Morning Out");
          }
          if (summary.afternoon_in && !summary.afternoon_out) {
            missingOuts.push("Afternoon Out");
          }
          if (summary.evening_in && !summary.evening_out) {
            missingOuts.push("Overtime Out");
          }

          const missingIns = [];
          if (!summary.morning_in && summary.morning_out) {
            missingIns.push("Morning In");
          }
          if (!summary.afternoon_in && summary.afternoon_out) {
            missingIns.push("Afternoon In");
          }
          if (!summary.evening_in && summary.evening_out) {
            missingIns.push("Overtime In");
          }

          // Add specific missing clock out remarks
          if (missingOuts.length > 0) {
            remarks.push("INCOMPLETE - Missing " + missingOuts.join(", "));
          }

          // Add specific missing clock in remarks
          if (missingIns.length > 0) {
            remarks.push("INCOMPLETE - Missing " + missingIns.join(", "));
          }

          // Check for late entry
          if (summary.has_late_entry) {
            remarks.push("LATE ARRIVAL");
          }

          // Check for overtime without regular hours
          if ((summary.overtime_hours > 0) && (summary.regular_hours === 0 || !summary.regular_hours)) {
            remarks.push("OT WITHOUT REG HOURS");
          }

          // Check for excessive overtime
          if (summary.overtime_hours > 4) {
            remarks.push("EXCESSIVE OT (" + summary.overtime_hours.toFixed(1) + "h)");
          }

          // Check for minimal hours
          if (summary.total_hours > 0 && summary.total_hours < 4) {
            remarks.push("MINIMAL HOURS (" + summary.total_hours.toFixed(1) + "h)");
          }

          // Check for weekend work
          const date = new Date(summary.date);
          const dayOfWeek = date.getDay();
          if (dayOfWeek === 0 || dayOfWeek === 6) { // Sunday or Saturday
            remarks.push("WEEKEND WORK");
          }

          // Check for no activity - FIXED: use the properly defined variables
          if (!hasAnyClockIn && !hasAnyClockOut && (summary.total_hours === 0 || !summary.total_hours)) {
            remarks.push("NO ACTIVITY");
          }

          return remarks.length > 0 ? remarks.join("; ") : "";
        };

        // Helper function to check if date is Sunday and calculate total hours
        const getSundayHours = (dateStr, regularHours, overtimeHours) => {
          const date = new Date(dateStr);
          const dayOfWeek = date.getDay();

          if (dayOfWeek === 0) { // Sunday
            const totalHours = (regularHours || 0) + (overtimeHours || 0);
            return totalHours > 0 ? parseFloat(totalHours || 0) : "";
          }
          return "";
        };

        const formatTimeOnly = (datetime) => {
          if (!datetime) return "";
          try {
            return formatTime(datetime);
          } catch {
            return "";
          }
        };

        // FIXED SORTING: Sort by last_name, then first_name, then date
        const sortedData = summaryResult.data.sort((a, b) => {
          // First compare last names
          const lastNameComparison = (a.last_name || "").localeCompare(b.last_name || "");
          if (lastNameComparison !== 0) return lastNameComparison;

          // If last names are the same, compare first names
          const firstNameComparison = (a.first_name || "").localeCompare(b.first_name || "");
          if (firstNameComparison !== 0) return firstNameComparison;

          // If both names are the same, compare dates
          return new Date(a.date) - new Date(b.date);
        });

        // FIXED GROUPING: Group by both last_name and first_name
        const groupedByEmployee = {};
        sortedData.forEach((summary) => {
          // Create a unique key combining last_name and first_name
          const key = `${summary.last_name || "Unknown"}, ${summary.first_name || "Unknown"}`;
          if (!groupedByEmployee[key]) {
            groupedByEmployee[key] = [];
          }
          groupedByEmployee[key].push(summary);
        });

        // Track totals
        let grandTotalRegularHours = 0;
        let grandTotalOvertimeHours = 0;
        let grandTotalSundayHours = 0;
        let totalLateCount = 0;
        let totalIncompleteCount = 0;
        let totalPerfectAttendanceCount = 0;

        // Process each employee group
        Object.keys(groupedByEmployee).sort().forEach((employeeKey, groupIndex) => {
          const employeeRecords = groupedByEmployee[employeeKey];

          // Add header row for each employee (like in the sample Excel)
          if (groupIndex > 0) {
            // Add empty row before new employee section (except for first employee)
            employeeSummaryData.push(["", "", "", "", "", "", "", "", "", "", "", ""]);
          }

          // Add the header row for this employee section (using the main header names)
          employeeSummaryData.push([
            "EMPLOYEE_NAME", "DATE_OF_LOG", "MORNING_IN", "MORNING_OUT",
            "AFTERNOON_IN", "AFTERNOON_OUT", "OVERTIME_IN", "OVERTIME_OUT",
            "REG HRS", "OT HRS", "SUNDAY", "REMARKS"
          ]);

          let subtotalRegularHours = 0;
          let subtotalOvertimeHours = 0;
          let subtotalSundayHours = 0;
          let employeeLateCount = 0;
          let employeeIncompleteCount = 0;
          let employeePerfectCount = 0;

          // Add employee records
          employeeRecords.forEach((summary) => {
            const employeeName = formatEmployeeName({
              last_name: summary.last_name,
              middle_name: summary.middle_name,
              first_name: summary.first_name,
            });

            const sundayHours = getSundayHours(summary.date, summary.regular_hours, summary.overtime_hours);
            const regularHours = summary.regular_hours || 0;
            const overtimeHours = summary.overtime_hours || 0;
            const remarks = generateRemarks(summary);

            // Track statistics
            subtotalRegularHours += regularHours;
            subtotalOvertimeHours += overtimeHours;
            if (sundayHours) {
              subtotalSundayHours += parseFloat(sundayHours);
            }
            if (summary.has_late_entry) employeeLateCount++;
            if (remarks.includes("INCOMPLETE")) employeeIncompleteCount++;
            if (!remarks || remarks === "") employeePerfectCount++; // Perfect attendance = empty remarks

            employeeSummaryData.push([
              employeeName,
              summary.date,
              formatTimeOnly(summary.morning_in),
              formatTimeOnly(summary.morning_out),
              formatTimeOnly(summary.afternoon_in),
              formatTimeOnly(summary.afternoon_out),
              formatTimeOnly(summary.evening_in),
              formatTimeOnly(summary.evening_out),
              regularHours.toFixed(1),
              overtimeHours.toFixed(1),
              sundayHours,
              remarks // Will be empty for perfect attendance
            ]);
          });

          // Add employee summary row
          employeeSummaryData.push([
            "", "", "", "", "", "", "",
            `TOTAL HOURS`,
            subtotalRegularHours.toFixed(1),
            subtotalOvertimeHours.toFixed(1),
            subtotalSundayHours > 0 ? subtotalSundayHours.toFixed(1) : "",
            `Late: ${employeeLateCount} | Inc: ${employeeIncompleteCount} | Perfect: ${employeePerfectCount}`
          ]);

          // Add to grand totals
          grandTotalRegularHours += subtotalRegularHours;
          grandTotalOvertimeHours += subtotalOvertimeHours;
          grandTotalSundayHours += subtotalSundayHours;
          totalLateCount += employeeLateCount;
          totalIncompleteCount += employeeIncompleteCount;
          totalPerfectAttendanceCount += employeePerfectCount;
        });

        // Add final totals
        employeeSummaryData.push(["", "", "", "", "", "", "", "", "", "", "", ""]);
        employeeSummaryData.push([
          "", "", "", "", "", "", "",
          "GRAND TOTALS",
          grandTotalRegularHours.toFixed(1),
          grandTotalOvertimeHours.toFixed(1),
          grandTotalSundayHours > 0 ? grandTotalSundayHours.toFixed(1) : "",
          `Late: ${totalLateCount} | Inc: ${totalIncompleteCount} | Perfect: ${totalPerfectAttendanceCount}`
        ]);

        const employeeSummarySheet = XLSX.utils.aoa_to_sheet(employeeSummaryData);

        // Enhanced styling for employee summary
        const empRange = XLSX.utils.decode_range(employeeSummarySheet['!ref']);

        // Style employee section headers and subtotal rows
        for (let R = empRange.s.r; R <= empRange.e.r; R++) {
          // Check if this row contains employee headers (EMPLOYEE_NAME, DATE_OF_LOG, etc.)
          const cellA = XLSX.utils.encode_cell({ r: R, c: 0 });
          if (employeeSummarySheet[cellA] &&
            employeeSummarySheet[cellA].v === "EMPLOYEE_NAME") {

            // Style employee section header row
            for (let C = empRange.s.c; C <= empRange.e.c; C++) {
              const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
              if (employeeSummarySheet[cellAddress]) {
                employeeSummarySheet[cellAddress].s = {
                  font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } },
                  fill: { fgColor: { rgb: "DC2626" } }, // Red background
                  alignment: { horizontal: "center", vertical: "center" },
                  border: {
                    top: { style: "thin", color: { rgb: "000000" } },
                    bottom: { style: "thin", color: { rgb: "000000" } },
                    left: { style: "thin", color: { rgb: "000000" } },
                    right: { style: "thin", color: { rgb: "000000" } }
                  }
                };
              }
            }
          }

          // Check if this row contains subtotal or total information
          const cellH = XLSX.utils.encode_cell({ r: R, c: 7 });
          if (employeeSummarySheet[cellH] &&
            (employeeSummarySheet[cellH].v === "TOTAL HOURS" ||
              employeeSummarySheet[cellH].v === "GRAND TOTALS")) {

            // Style subtotal/total row
            for (let C = empRange.s.c; C <= empRange.e.c; C++) {
              const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
              if (employeeSummarySheet[cellAddress]) {
                employeeSummarySheet[cellAddress].s = {
                  font: { bold: true, color: { rgb: "FFFFFF" } },
                  fill: { fgColor: { rgb: "059669" } }, // Green background
                  alignment: { horizontal: "center" },
                  border: {
                    top: { style: "thin", color: { rgb: "000000" } },
                    bottom: { style: "thin", color: { rgb: "000000" } },
                    left: { style: "thin", color: { rgb: "000000" } },
                    right: { style: "thin", color: { rgb: "000000" } }
                  }
                };
              }
            }
          }
        }

        employeeSummarySheet["!cols"] = [
          { wch: 20 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
          { wch: 10 }, { wch: 10 }, { wch: 25 }, { wch: 10 }, { wch: 8 },
          { wch: 8 }, { wch: 40 }
        ];

        XLSX.utils.book_append_sheet(workbook, employeeSummarySheet, "Employee Summary");
      }

      // 4. Enhanced Time Analysis Sheet
      const timeAnalysisData = [];
      timeAnalysisData.push(["COMPREHENSIVE TIME ANALYSIS REPORT"]);

      const displayDate = filters.useRange && filters.startDate && filters.endDate
        ? `${filters.startDate} to ${filters.endDate}`
        : filters.date;

      timeAnalysisData.push([`Period: ${displayDate}`]);
      timeAnalysisData.push([]);

      // Hourly breakdown with insights
      const hourlyBreakdown = {};
      const timeSlotInsights = {};

      attendanceResult.data.forEach((record) => {
        const hour = new Date(record.clock_time).getHours();
        const timeSlot = `${hour.toString().padStart(2, "0")}:00 - ${(hour + 1).toString().padStart(2, "0")}:00`;

        if (!hourlyBreakdown[timeSlot]) {
          hourlyBreakdown[timeSlot] = {
            morning_in: 0, morning_out: 0, afternoon_in: 0,
            afternoon_out: 0, evening_in: 0, evening_out: 0, total: 0
          };
          timeSlotInsights[timeSlot] = { late_count: 0, departments: new Set() };
        }

        hourlyBreakdown[timeSlot][record.clock_type] = (hourlyBreakdown[timeSlot][record.clock_type] || 0) + 1;
        hourlyBreakdown[timeSlot].total++;

        if (record.is_late) timeSlotInsights[timeSlot].late_count++;
        if (record.department) timeSlotInsights[timeSlot].departments.add(record.department);
      });

      timeAnalysisData.push(["DETAILED HOURLY BREAKDOWN"]);
      timeAnalysisData.push([
        "Time Slot", "Morning In", "Morning Out", "Afternoon In", "Afternoon Out",
        "Overtime In", "Overtime Out", "Total Activity", "Late Count", "Unique Depts", "Efficiency Rating"
      ]);

      Object.entries(hourlyBreakdown)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([timeSlot, counts]) => {
          const insights = timeSlotInsights[timeSlot];
          const latePercentage = counts.total > 0 ? (insights.late_count / counts.total) * 100 : 0;
          const efficiencyRating = latePercentage <= 5 ? "Excellent" :
            latePercentage <= 15 ? "Good" :
              latePercentage <= 25 ? "Fair" : "Poor";

          timeAnalysisData.push([
            timeSlot, counts.morning_in || 0, counts.morning_out || 0,
            counts.afternoon_in || 0, counts.afternoon_out || 0,
            counts.evening_in || 0, counts.evening_out || 0,
            counts.total || 0, insights.late_count,
            insights.departments.size, efficiencyRating
          ]);
        });

      const timeAnalysisSheet = XLSX.utils.aoa_to_sheet(timeAnalysisData);

      // Style time analysis headers
      const timeRange = XLSX.utils.decode_range(timeAnalysisSheet['!ref']);
      for (let C = timeRange.s.c; C <= timeRange.e.c; C++) {
        const headerCell = XLSX.utils.encode_cell({ r: 0, c: C });
        const subHeaderCell = XLSX.utils.encode_cell({ r: 3, c: C });

        if (timeAnalysisSheet[headerCell]) {
          timeAnalysisSheet[headerCell].s = {
            font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "7C2D12" } }, // Brown background
            alignment: { horizontal: "center" }
          };
        }

        if (timeAnalysisSheet[subHeaderCell]) {
          timeAnalysisSheet[subHeaderCell].s = {
            font: { bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "9333EA" } }, // Purple background
            alignment: { horizontal: "center" }
          };
        }
      }

      timeAnalysisSheet["!cols"] = [
        { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
        { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 15 }
      ];

      XLSX.utils.book_append_sheet(workbook, timeAnalysisSheet, "Time Analysis");

      // 5. Performance Analytics Sheet
      const performanceData = [];
      performanceData.push(["EMPLOYEE PERFORMANCE ANALYTICS"]);
      performanceData.push([`Analysis Period: ${dateRange}`]);
      performanceData.push([]);

      // Employee performance metrics
      const employeePerformance = {};

      if (summaryResult.success && summaryResult.data.length > 0) {
        summaryResult.data.forEach(summary => {
          const empKey = `${summary.first_name} ${summary.last_name}`.trim();
          if (!employeePerformance[empKey]) {
            employeePerformance[empKey] = {
              total_days: 0,
              total_hours: 0,
              late_days: 0,
              incomplete_days: 0,
              overtime_days: 0,
              perfect_days: 0,
              weekend_days: 0,
              department: summary.department,
              position: summary.position
            };
          }

          const perf = employeePerformance[empKey];
          perf.total_days++;
          perf.total_hours += (summary.regular_hours || 0) + (summary.overtime_hours || 0);
          if (summary.has_late_entry) perf.late_days++;
          if (summary.is_incomplete) perf.incomplete_days++;
          if (summary.overtime_hours > 0) perf.overtime_days++;

          // Check for weekend
          const date = new Date(summary.date);
          if (date.getDay() === 0 || date.getDay() === 6) perf.weekend_days++;

          // Perfect day: on time, complete, adequate hours
          if (!summary.has_late_entry && !summary.is_incomplete &&
            (summary.regular_hours + summary.overtime_hours) >= 8) {
            perf.perfect_days++;
          }
        });

        performanceData.push(["EMPLOYEE PERFORMANCE RANKING"]);
        performanceData.push([
          "Employee Name", "Department", "Position", "Total Days", "Avg Hours/Day",
          "Punctuality %", "Completion %", "Performance Score", "Grade", "Key Issues", "Recommendations"
        ]);

        // Calculate performance scores and sort
        const performanceArray = Object.entries(employeePerformance).map(([name, data]) => {
          const avgHours = data.total_days > 0 ? data.total_hours / data.total_days : 0;
          const punctualityRate = data.total_days > 0 ? ((data.total_days - data.late_days) / data.total_days) * 100 : 0;
          const completionRate = data.total_days > 0 ? ((data.total_days - data.incomplete_days) / data.total_days) * 100 : 0;

          // Performance score calculation (out of 100)
          let score = 0;
          score += Math.min(avgHours / 8 * 30, 30); // 30 points for adequate hours
          score += punctualityRate * 0.25; // 25 points for punctuality
          score += completionRate * 0.25; // 25 points for completion
          score += Math.min(data.perfect_days / data.total_days * 20, 20); // 20 points for perfect days

          const grade = score >= 90 ? "A+" : score >= 85 ? "A" : score >= 80 ? "A-" :
            score >= 75 ? "B+" : score >= 70 ? "B" : score >= 65 ? "B-" :
              score >= 60 ? "C+" : score >= 55 ? "C" : score >= 50 ? "C-" : "D";

          // Identify key issues
          const issues = [];
          if (punctualityRate < 80) issues.push("Frequent lateness");
          if (completionRate < 90) issues.push("Incomplete records");
          if (avgHours < 6) issues.push("Low work hours");
          if (data.overtime_days / data.total_days > 0.3) issues.push("Excessive overtime");

          // Generate recommendations
          const recommendations = [];
          if (punctualityRate < 90) recommendations.push("Punctuality coaching");
          if (avgHours < 7) recommendations.push("Workload assessment");
          if (completionRate < 95) recommendations.push("System training");
          if (score >= 85) recommendations.push("Recognition program");

          return {
            name, data, avgHours, punctualityRate, completionRate, score, grade,
            issues: issues.length > 0 ? issues.join("; ") : "None",
            recommendations: recommendations.length > 0 ? recommendations.join("; ") : "Continue current performance"
          };
        }).sort((a, b) => b.score - a.score);

        // Add performance data
        performanceArray.forEach(emp => {
          performanceData.push([
            emp.name,
            emp.data.department || "N/A",
            emp.data.position || "N/A",
            emp.data.total_days,
            emp.avgHours.toFixed(1),
            parseFloat(emp.punctualityRate).toFixed(1) + "%",
            emp.completionRate.toFixed(1) + "%",
            emp.score.toFixed(1),
            emp.grade,
            emp.issues,
            emp.recommendations
          ]);
        });

        performanceData.push([]);

        // Performance distribution
        performanceData.push(["PERFORMANCE DISTRIBUTION"]);
        performanceData.push(["Grade", "Count", "Percentage", "Score Range"]);

        const gradeDistribution = {};
        performanceArray.forEach(emp => {
          gradeDistribution[emp.grade] = (gradeDistribution[emp.grade] || 0) + 1;
        });

        const gradeRanges = {
          "A+": "90-100", "A": "85-89", "A-": "80-84", "B+": "75-79",
          "B": "70-74", "B-": "65-69", "C+": "60-64", "C": "55-59", "C-": "50-54", "D": "0-49"
        };

        Object.entries(gradeDistribution).forEach(([grade, count]) => {
          const percentage = (parseFloat(count) / parseFloat(performanceArray.length) * 100);
          performanceData.push([grade, count, percentage + "%", gradeRanges[grade] || ""]);
        });
      }

      const performanceSheet = XLSX.utils.aoa_to_sheet(performanceData);

      // Style performance sheet
      const perfRange = XLSX.utils.decode_range(performanceSheet['!ref']);
      for (let R = 0; R < perfRange.e.r; R++) {
        for (let C = 0; C <= perfRange.e.c; C++) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          if (!performanceSheet[cellAddress]) continue;

          // Main headers
          if (R === 0 || (performanceData[R] && performanceData[R][0] &&
            performanceData[R][0].includes('PERFORMANCE'))) {
            performanceSheet[cellAddress].s = {
              font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } },
              fill: { fgColor: { rgb: "DC2626" } },
              alignment: { horizontal: "center" }
            };
          }
          // Table headers
          else if (performanceData[R] && (performanceData[R].includes("Employee Name") ||
            performanceData[R].includes("Grade"))) {
            performanceSheet[cellAddress].s = {
              font: { bold: true, color: { rgb: "FFFFFF" } },
              fill: { fgColor: { rgb: "7C3AED" } },
              alignment: { horizontal: "center" }
            };
          }
        }
      }

      performanceSheet["!cols"] = [
        { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 12 },
        { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 25 }, { wch: 30 }
      ];

      XLSX.utils.book_append_sheet(workbook, performanceSheet, "Performance Analytics");

      // 6. Attendance Patterns & Insights Sheet
      const patternsData = [];
      patternsData.push(["ATTENDANCE PATTERNS & BEHAVIORAL INSIGHTS"]);
      patternsData.push([`Analysis Period: ${dateRange}`]);
      patternsData.push([]);

      // Daily patterns
      const dayOfWeekPattern = {};
      const monthlyPattern = {};

      attendanceResult.data.forEach(record => {
        const date = new Date(record.clock_time);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        const monthName = date.toLocaleDateString('en-US', { month: 'long' });

        if (!dayOfWeekPattern[dayName]) {
          dayOfWeekPattern[dayName] = { total: 0, late: 0, overtime: 0 };
        }
        if (!monthlyPattern[monthName]) {
          monthlyPattern[monthName] = { total: 0, late: 0, overtime: 0 };
        }

        dayOfWeekPattern[dayName].total++;
        monthlyPattern[monthName].total++;

        if (record.is_late) {
          dayOfWeekPattern[dayName].late++;
          monthlyPattern[monthName].late++;
        }
        if (record.overtime_hours > 0) {
          dayOfWeekPattern[dayName].overtime++;
          monthlyPattern[monthName].overtime++;
        }
      });

      // Day of week analysis
      patternsData.push(["WEEKLY PATTERN ANALYSIS"]);
      patternsData.push(["Day of Week", "Total Records", "Late Count", "Late %", "OT Records", "OT %", "Risk Level", "Recommendations"]);

      const weekOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
      weekOrder.forEach(day => {
        if (dayOfWeekPattern[day]) {
          const data = dayOfWeekPattern[day];
          const latePercent = ((parseFloat(data.late) / parseFloat(data.total) * 100) || 0);
          const otPercent = ((parseFloat(data.overtime) / parseFloat(data.total) * 100) || 0);

          let riskLevel = "Low";
          let recommendations = "Monitor regularly";

          if (data.late / data.total > 0.2) {
            riskLevel = "High";
            recommendations = "Implement punctuality measures";
          } else if (data.late / data.total > 0.1) {
            riskLevel = "Medium";
            recommendations = "Provide schedule flexibility";
          }

          if (day === "Monday" && data.late / data.total > 0.15) {
            recommendations += "; Consider Monday morning meetings";
          }

          patternsData.push([
            day, data.total, data.late, latePercent + "%",
            data.overtime, otPercent + "%", riskLevel, recommendations
          ]);
        }
      });

      patternsData.push([]);

      // Behavioral insights
      patternsData.push(["BEHAVIORAL INSIGHTS & RECOMMENDATIONS"]);
      patternsData.push(["Insight Category", "Finding", "Impact Level", "Recommended Action", "Timeline"]);

      // Generate insights based on data patterns
      const insights = [];

      // Monday late pattern
      if (dayOfWeekPattern["Monday"] && dayOfWeekPattern["Monday"].late / dayOfWeekPattern["Monday"].total > 0.15) {
        insights.push({
          category: "Monday Blues Effect",
          finding: `${(parseFloat(dayOfWeekPattern["Monday"].late) / parseFloat(dayOfWeekPattern["Monday"].total) * 100)}% late rate on Mondays`,
          impact: "Medium",
          action: "Consider flexible Monday start times or team building activities",
          timeline: "2-4 weeks"
        });
      }

      // Weekend work pattern
      const weekendWork = (dayOfWeekPattern["Saturday"]?.total || 0) + (dayOfWeekPattern["Sunday"]?.total || 0);
      if (weekendWork > rangeStats.total_records * 0.1) {
        insights.push({
          category: "Weekend Work Concern",
          finding: `${weekendWork} weekend records (${(parseFloat(weekendWork) / parseFloat(rangeStats.total_records) * 100)}%)`,
          impact: "High",
          action: "Review workload distribution and implement work-life balance policies",
          timeline: "1-2 weeks"
        });
      }

      // Clock in/out imbalance
      if (Math.abs(rangeStats.clock_ins - rangeStats.clock_outs) > rangeStats.total_records * 0.05) {
        insights.push({
          category: "System Usage Issue",
          finding: `${Math.abs(rangeStats.clock_ins - rangeStats.clock_outs)} record imbalance`,
          impact: "High",
          action: "Audit time tracking system and provide user training",
          timeline: "Immediate"
        });
      }

      // Add insights to data
      insights.forEach(insight => {
        patternsData.push([
          insight.category, insight.finding, insight.impact,
          insight.action, insight.timeline
        ]);
      });

      const patternsSheet = XLSX.utils.aoa_to_sheet(patternsData);

      // Style patterns sheet
      const patternRange = XLSX.utils.decode_range(patternsSheet['!ref']);
      for (let R = 0; R <= patternRange.e.r; R++) {
        for (let C = 0; C <= patternRange.e.c; C++) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          if (!patternsSheet[cellAddress]) continue;

          if (R === 0 || (patternsData[R] && patternsData[R][0] &&
            (patternsData[R][0].includes('PATTERNS') || patternsData[R][0].includes('ANALYSIS')))) {
            patternsSheet[cellAddress].s = {
              font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } },
              fill: { fgColor: { rgb: "059669" } },
              alignment: { horizontal: "center" }
            };
          }
          else if (patternsData[R] && (patternsData[R].includes("Day of Week") ||
            patternsData[R].includes("Insight Category"))) {
            patternsSheet[cellAddress].s = {
              font: { bold: true, color: { rgb: "FFFFFF" } },
              fill: { fgColor: { rgb: "DC2626" } },
              alignment: { horizontal: "center" }
            };
          }
        }
      }

      patternsSheet["!cols"] = [
        { wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 10 }, { wch: 12 },
        { wch: 10 }, { wch: 12 }, { wch: 40 }, { wch: 15 }
      ];

      XLSX.utils.book_append_sheet(workbook, patternsSheet, "Patterns & Insights");

      // Generate filename
      const filenameDatePart = filters.useRange && filters.startDate && filters.endDate
        ? `${filters.startDate}_to_${filters.endDate}`
        : filters.date;

      const fileName = `Enhanced_Attendance_Report_${filenameDatePart}_${new Date().getTime()}.xlsx`;
      XLSX.writeFile(workbook, fileName);

    } catch (error) {
      console.error("Error exporting to Excel:", error);
      alert("Failed to export data. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleMarkAsUnsynced = async () => {
    if (selectedRecordsToUnsync.size === 0) {
      alert("Please select at least one record to mark as unsynced");
      return;
    }

    const confirmed = window.confirm(
      `Mark ${selectedRecordsToUnsync.size} record(s) as unsynced?\n\nThis will allow you to edit them in the Attendance Editor.`
    );

    if (!confirmed) return;

    try {
      // Get full attendance records for selected dates
      const recordsToMark = [];

      for (const historyId of selectedRecordsToUnsync) {
        const historyRecord = employeeHistory.find(h => h.id === historyId);
        if (historyRecord) {
          // Fetch attendance records for this date
          const result = await apiService.attendance.getAttendanceRecordsWithCleanup({
            employee_uid: selectedEmployee.uid,
            date: historyRecord.date,
            limit: "100"
          });

          if (result.success) {
            const syncedRecords = result.data.filter(r => r.is_synced);
            recordsToMark.push(...syncedRecords.map(r => ({
              id: r.id,
              notes: `Marked for editing on ${new Date().toLocaleString()}`
            })));
          }
        }
      }

      if (recordsToMark.length === 0) {
        alert("No synced records found for the selected dates");
        return;
      }

      const batchResult = await apiService.editAttendance.batchEditRecords(recordsToMark);

      if (batchResult.success) {
        alert(`Successfully marked ${batchResult.success_count} records as unsynced!`);
        setSelectedRecordsToUnsync(new Set());
        fetchAttendanceData();
        fetchAttendanceStats();
        closeEmployeeModal();
      } else {
        throw new Error(batchResult.error || "Failed to mark records as unsynced");
      }
    } catch (error) {
      console.error("Error marking records as unsynced:", error);
      alert("Failed to mark records as unsynced: " + error.message);
    }
  };

    const loadProfilePictures = async (uniqueUids) => {
    if (!uniqueUids || uniqueUids.length === 0) return;

    // Filter out UIDs that we already have loaded or are currently loading
    const uidsToLoad = uniqueUids.filter(
      (uid) => uid && !profilePictures[uid] && profilePictures[uid] !== null
    );

    if (uidsToLoad.length === 0) return;

    console.log(`Loading ${uidsToLoad.length} profile pictures individually...`, uidsToLoad);
    setProfileLoadingState("loading");

    // Load each profile picture individually
    const loadPromises = uidsToLoad.map(async (uid) => {
      try {
        const result = await apiService.profiles.getProfileByUid(uid);
        
        if (result.success && result.url) {
          // Update state immediately for this UID
          setProfilePictures(prev => ({
            ...prev,
            [uid]: result.url
          }));
          console.log(`✅ Loaded profile picture for UID: ${uid}`);
          return { uid, success: true };
        } else {
          // Mark as no profile available
          setProfilePictures(prev => ({
            ...prev,
            [uid]: null
          }));
          console.log(`⚠️ No profile picture found for UID: ${uid}`);
          return { uid, success: false };
        }
      } catch (error) {
        console.warn(`Failed to load profile for UID ${uid}:`, error);
        // Mark as failed to load
        setProfilePictures(prev => ({
          ...prev,
          [uid]: null
        }));
        return { uid, success: false, error };
      }
    });

    // Wait for all to complete
    try {
      const results = await Promise.allSettled(loadPromises);
      const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      console.log(`✅ Successfully loaded ${successCount} out of ${uidsToLoad.length} profile pictures`);
      setProfileLoadingState("loaded");
    } catch (error) {
      console.error("Error loading profile pictures:", error);
      setProfileLoadingState("error");
    }
  };

  // Extract unique UIDs from attendance records
  const getUniqueUids = (records) => {
    return [
      ...new Set(records.map((record) => record.employee_uid).filter(Boolean)),
    ];
  };

  // Load profile pictures for new records that come via WebSocket
  const loadNewProfilePicture = async (uid) => {
    if (!uid || profilePictures[uid] || profilePictures[uid] === null) return;

    try {
      const result = await apiService.profiles.getProfileByUid(uid);
      if (result.success) {
        setProfilePictures((prev) => ({
          ...prev,
          [uid]: result.url,
        }));
      } else {
        setProfilePictures((prev) => ({
          ...prev,
          [uid]: null,
        }));
      }
    } catch (error) {
      console.error(`Failed to load profile for ${uid}:`, error);
      setProfilePictures((prev) => ({
        ...prev,
        [uid]: null,
      }));
    }
  };

  useEffect(() => {
    // Initialize polling manager if not already running
    if (!pollingManager.isPolling) {
      pollingManager.initialize();
      pollingManager.joinAllRooms();
    }

    // Only fetch on mount
    fetchAttendanceData();
    fetchAttendanceStats();

    setConnectionStatus("connecting");

     // Load initial data before showing UI
  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchAttendanceData(),
        fetchAttendanceStats()
      ]);
    } catch (error) {
      console.error("Error loading initial data:", error);
    } finally {
      setLoading(false);
    }
  };

  loadInitialData();

    // Subscribe to attendance events
    const unsubscribeAttendanceCreated = pollingManager.subscribeToUpdates(
      "attendance_created",
      (data) => {
        console.log("[Attendance] New attendance record:", data);
        setConnectionStatus("connected");
        setLastUpdate(new Date());

        // Check if the record matches current filters
        const matchesFilters =
          (!filters.date || data.date === filters.date) &&
          (!filters.employee_uid || data.employee_uid === filters.employee_uid) &&
          (!filters.clock_type || data.clock_type === filters.clock_type);

        if (matchesFilters) {
          setAttendanceData((prev) => {
            const exists = prev.some((record) => record.id === data.id);
            if (!exists) {
              setNewRecordIds((prev) => new Set([...prev, data.id]));
              setTimeout(() => {
                setNewRecordIds((prev) => {
                  const updated = new Set(prev);
                  updated.delete(data.id);
                  return updated;
                });
              }, 5000);

              if (data.employee_uid) {
                loadNewProfilePicture(data.employee_uid);
              }

              return [data, ...prev].slice(0, filters.limit);
            }
            return prev;
          });
          fetchAttendanceStats();
        }
      }
    );

    const unsubscribeAttendanceUpdated = pollingManager.subscribeToUpdates(
      "attendance_updated",
      (data) => {
        console.log("[Attendance] Attendance record updated:", data);
        setConnectionStatus("connected");
        setLastUpdate(new Date());

        setAttendanceData((prev) => {
          const updated = prev.map((record) =>
            record.id === data.id ? { ...record, ...data } : record
          );
          return [...updated];
        });
        fetchAttendanceStats();
      }
    );

    const unsubscribeAttendanceDeleted = pollingManager.subscribeToUpdates(
      "attendance_deleted",
      (data) => {
        console.log("[Attendance] Attendance record deleted:", data);
        setConnectionStatus("connected");
        setLastUpdate(new Date());

        setAttendanceData((prev) => {
          const filtered = prev.filter((record) => record.id !== data.id);
          return [...filtered];
        });
        fetchAttendanceStats();
      }
    );

    const unsubscribeAttendanceSynced = pollingManager.subscribeToUpdates(
      "attendance_synced",
      (data) => {
        console.log("[Attendance] Attendance records synced:", data);
        setConnectionStatus("connected");
        setLastUpdate(new Date());

        fetchAttendanceData();
        fetchAttendanceStats();
      }
    );

    const unsubscribeEmployeeUpdated = pollingManager.subscribeToUpdates(
      "employee_updated",
      (data) => {
        console.log("[Attendance] Employee updated, refreshing attendance data");
        setConnectionStatus("connected");
        setLastUpdate(new Date());

        fetchAttendanceData();
      }
    );

    const unsubscribeConnection = pollingManager.subscribeToUpdates(
      "connection",
      (data) => {
        console.log("[Attendance] Connection status:", data.status);
        setConnectionStatus(data.status);
      }
    );

    return () => {
      // Unsubscribe from all events
      unsubscribeAttendanceCreated();
      unsubscribeAttendanceUpdated();
      unsubscribeAttendanceDeleted();
      unsubscribeAttendanceSynced();
      unsubscribeEmployeeUpdated();
      unsubscribeConnection();

      setConnectionStatus("disconnected");

      // Clean up profile picture URLs
      Object.values(profilePictures).forEach((url) => {
        if (url && url.startsWith("blob:")) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, []); // Only run on mount

  // Separate effect for filter changes
  useEffect(() => {
    // Skip the initial render (when component first mounts)
    if (attendanceData.length > 0 || filters.date || filters.employee_uid || filters.clock_type) {
      fetchAttendanceData();
      fetchAttendanceStats();
    }
  }, [filters.date, filters.startDate, filters.endDate, filters.useRange,
  filters.employee_uid, filters.clock_type, filters.limit]);

  const fetchAttendanceData = async () => {
  try {
    setLoading(true);
    const params = {
      limit: filters.limit.toString(),
      offset: filters.offset.toString(),
      sort_by: "clock_time",
      sort_order: "DESC",
    };

    if (filters.employee_uid) params.employee_uid = filters.employee_uid;
    if (filters.clock_type) params.clock_type = filters.clock_type;
    if (filters.date) params.date = filters.date;

    // ✅ CHANGED: Use getAttendanceRecordsWithCleanup instead of getAttendanceRecords
    const result = await apiService.attendance.getAttendanceRecordsWithCleanup(params);

    if (result.success) {
      setAttendanceData(result.data);
      setError(null);

      // ✅ NEW: Show notification if duplicates were removed
      if (result.duplicates_removed && result.duplicates_removed.removed_count > 0) {
        console.log(`✅ Removed ${result.duplicates_removed.removed_count} duplicate entries`);
        // Optional: Show a toast notification
        // toast.success(`Cleaned up ${result.duplicates_removed.removed_count} duplicate entries`);
      }

      // Load profile pictures individually for the fetched records
      const uniqueUids = getUniqueUids(result.data);
      if (uniqueUids.length > 0) {
        await loadProfilePictures(uniqueUids);
      }
    } else {
      throw new Error(result.error || "Failed to fetch attendance data");
    }
  } catch (err) {
    setError(err.message);
    console.error("Error fetching attendance data:", err);
  } finally {
    setLoading(false);
  }
};

  const fetchAttendanceStats = async () => {
    try {
      const result = await apiService.attendance.getAttendanceStats({
        date: filters.date,
      });

      if (result.success) {
        setStats(result.data.statistics);
        setRecentActivity(result.data.recent_activity || []);

        // Load profile pictures individually for recent activity
        if (result.data.recent_activity) {
          const uniqueUids = getUniqueUids(result.data.recent_activity);
          if (uniqueUids.length > 0) {
            await loadProfilePictures(uniqueUids);
          }
        }
      } else {
        throw new Error(
          result.error || "Failed to fetch attendance statistics"
        );
      }
    } catch (err) {
      console.error("Error fetching attendance stats:", err);
    }
  };

  const formatClockType = (clockType) => {
    const types = {
      morning_in: "Morning In",
      morning_out: "Morning Out",
      afternoon_in: "Afternoon In",
      afternoon_out: "Afternoon Out",
      overtime_in: "Overtime In",
      overtime_out: "Overtime Out",
    };
    return types[clockType] || clockType;
  };

const formatTime = (timeString) => {
  if (!timeString) return "-";
  try {
    const dateStr = timeString.includes(' ') ? timeString.replace(' ', 'T') : timeString;
    const time = new Date(dateStr);
    
    // Check if date is valid
    if (isNaN(time.getTime())) {
      console.warn('Invalid date format:', timeString);
      return "-";
    }
    
    return time.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch (error) {
    console.error('Error formatting time:', error, timeString);
    return "-";
  }
};

  const formatEmployeeName = (employeeInfo) => {
    const parts = [
      employeeInfo.last_name,
      employeeInfo.first_name,
      employeeInfo.middle_name,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : "Unknown Employee";
  };

  const getClockTypeColor = (clockType) => {
    const colors = {
      morning_in:
        "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800/30",
      morning_out:
        "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/20 dark:text-sky-300 dark:border-sky-800/30",
      afternoon_in:
        "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800/30",
      afternoon_out:
        "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-300 dark:border-violet-800/30",
      overtime_in:
        "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800/30",
      overtime_out:
        "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-800/30",
    };
    return (
      colors[clockType] ||
      "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700"
    );
  };

  const getClockTypeIcon = (clockType) => {
    const icons = {
      morning_in: "🌅",
      morning_out: "☕",
      afternoon_in: "🌞",
      afternoon_out: "🌆",
      overtime_in: "🌙",
      overtime_out: "⭐",
    };
    return icons[clockType] || "⏰";
  };

  // Profile Picture Component with loading state
  const ProfilePicture = ({ uid, name, size = "w-16 h-16" }) => {
    const profileUrl = profilePictures[uid];
    const isLoading =
      profileLoadingState === "loading" && !profileUrl && profileUrl !== null;
    const initials = name
      ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()
      : "??";

    // Handle image loading errors
    const handleImageError = (e) => {
      console.warn(`Failed to load image for ${uid}:`, profileUrl);
      // Hide the broken image and show initials fallback
      e.target.style.display = "none";
      const fallback = e.target.nextSibling;
      if (fallback) {
        fallback.style.display = "flex";
      }

      // Clean up the broken blob URL and mark as failed
      if (
        profileUrl &&
        typeof profileUrl === "string" &&
        profileUrl.startsWith("blob:")
      ) {
        try {
          URL.revokeObjectURL(profileUrl);
        } catch (error) {
          console.warn("Failed to revoke broken blob URL:", error);
        }
      }

      setProfilePictures((prev) => ({
        ...prev,
        [uid]: null,
      }));
    };

    // Show loading state
    if (isLoading) {
      return (
        <GearLoadingSpinner isDarkMode={isDarkMode}/>
      );
    }

    // Only render image if we have a valid URL
    if (profileUrl && profileUrl !== "undefined" && profileUrl !== null) {
      return (
        <div className="relative">
          <img
            src={profileUrl}
            alt={`${name} profile`}
            className={`${size} rounded-2xl object-cover ring-4 ring-white/50 dark:ring-gray-700/50 shadow-lg`}
            onError={handleImageError}
            onLoad={(e) => {
              // Image loaded successfully, ensure fallback is hidden
              const fallback = e.target.nextSibling;
              if (fallback) {
                fallback.style.display = "none";
              }
            }}
          />
          <div
            className={`${size} rounded-2xl bg-linear-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg ring-4 ring-white/50 dark:ring-gray-700/50 shadow-lg`}
            style={{ display: "none" }}
          >
            {initials}
          </div>
        </div>
      );
    }

    // Default fallback to initials
    return (
      <div
        className={`${size} rounded-2xl bg-linear-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg ring-4 ring-white/50 dark:ring-gray-700/50 shadow-lg`}
      >
        {initials}
      </div>
    );
  };

  // Employee Details Modal Component
  const EmployeeDetailsModal = () => {
    if (!showEmployeeModal || !selectedEmployee) return null;

    const employeeName = formatEmployeeName(selectedEmployee.info);
    const chartData = prepareChartData(employeeHistory);
    const pieData = preparePieData(employeeStats);

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
          {/* Modal Header */}
          <div className="sticky top-0 bg-linear-to-r from-indigo-600 to-purple-600 p-6 rounded-t-3xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <ProfilePicture
                  uid={selectedEmployee.uid}
                  name={employeeName}
                  size="w-20 h-20"
                />
                <div>
                  <h2 className="text-3xl font-bold text-white">
                    {employeeName}
                  </h2>
                  <div className="text-indigo-100 mt-2 space-y-1">
                    <p>
                      <span className="font-medium">ID:</span>{" "}
                      {selectedEmployee.info.id_number || selectedEmployee.uid}
                    </p>
                    <p>
                      <span className="font-medium">Department:</span>{" "}
                      {selectedEmployee.info.department || "N/A"}
                    </p>
                    <p>
                      <span className="font-medium">Position:</span>{" "}
                      {selectedEmployee.info.position || "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                {/* Mark as Unsynced Button */}
                <button
                  onClick={handleMarkAsUnsynced}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg"
                  title="Mark records as unsynced for editing"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>Mark for Editing</span>
                </button>

                {/* Close Button */}
                <button
                  onClick={closeEmployeeModal}
                  className="p-3 bg-white/20 hover:bg-white/30 rounded-2xl text-white transition-colors"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Modal Content */}
          <div className="p-6">
            {loadingEmployeeData ? (
              <div className="text-center py-16">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 dark:border-indigo-800 mx-auto mb-4"></div>
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-transparent border-t-indigo-600 dark:border-t-indigo-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-8"></div>
                <p className="text-slate-600 dark:text-slate-400 text-lg">
                  Loading employee statistics...
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Summary Statistics */}
                {employeeStats && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-linear-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-2xl p-6">
                      <div className="text-center">
                        <div className="text-3xl mb-2">📅</div>
                        <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                          {employeeStats.total_days || 0}
                        </div>
                        <div className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                          Total Days
                        </div>
                      </div>
                    </div>

                    <div className="bg-linear-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-2xl p-6">
                      <div className="text-center">
                        <div className="text-3xl mb-2">⏰</div>
                        <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                          {(parseFloat(employeeStats.total_regular_hours) || 0)}h
                        </div>
                        <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
                          Regular Hours
                        </div>
                      </div>
                    </div>

                    <div className="bg-linear-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-2xl p-6">
                      <div className="text-center">
                        <div className="text-3xl mb-2">🌙</div>
                        <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                          {(parseFloat(employeeStats.total_overtime_hours) || 0)}
                          h
                        </div>
                        <div className="text-sm font-medium text-orange-600 dark:text-orange-400">
                          Overtime Hours
                        </div>
                      </div>
                    </div>

                    <div className="bg-linear-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-2xl p-6">
                      <div className="text-center">
                        <div className="text-3xl mb-2">⚠️</div>
                        <div className="text-2xl font-bold text-red-700 dark:text-red-300">
                          {employeeStats.days_with_late_entry || 0}
                        </div>
                        <div className="text-sm font-medium text-red-600 dark:text-red-400">
                          Late Days
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Hours Trend Chart */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                      📈 Hours Trend (Last 30 Days)
                    </h3>
                    {chartData.length > 0 ? (
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData}>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              className="opacity-30"
                            />
                            <XAxis
                              dataKey="date"
                              tick={{ fontSize: 12 }}
                              tickFormatter={(value) =>
                                new Date(value).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                })
                              }
                            />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip
                              labelFormatter={(value) =>
                                new Date(value).toLocaleDateString()
                              }
                              formatter={(value, name) => [
                                value + "h",
                                name.replace("_", " ").toUpperCase(),
                              ]}
                            />
                            <Line
                              type="monotone"
                              dataKey="regular_hours"
                              stroke="#10b981"
                              strokeWidth={3}
                              name="Regular Hours"
                              dot={{ fill: "#10b981", strokeWidth: 2, r: 4 }}
                            />
                            <Line
                              type="monotone"
                              dataKey="overtime_hours"
                              stroke="#f59e0b"
                              strokeWidth={3}
                              name="Overtime Hours"
                              dot={{ fill: "#f59e0b", strokeWidth: 2, r: 4 }}
                            />
                            <Line
                              type="monotone"
                              dataKey="total_hours"
                              stroke="#6366f1"
                              strokeWidth={2}
                              strokeDasharray="5 5"
                              name="Total Hours"
                              dot={{ fill: "#6366f1", strokeWidth: 2, r: 3 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-80 flex items-center justify-center text-slate-500 dark:text-slate-400">
                        No data available for chart
                      </div>
                    )}
                  </div>

                  {/* Hours Distribution Pie Chart */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                      📊 Hours Distribution
                    </h3>
                    {pieData.length > 0 ? (
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={pieData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, value }) =>
                                `${name}: ${(parseFloat(value) || 0)}h`
                              }
                              outerRadius={100}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {pieData.map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={entry.color}
                                />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value) => [
                                (parseFloat(value) || 0) + "h",
                                "Hours",
                              ]}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-80 flex items-center justify-center text-slate-500 dark:text-slate-400">
                        No data available for chart
                      </div>
                    )}
                  </div>
                  {/* Daily Performance Bar Chart */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                      📊 Daily Performance Analysis
                    </h3>
                    {chartData.length > 0 ? (
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData}>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              className="opacity-30"
                            />
                            <XAxis
                              dataKey="date"
                              tick={{ fontSize: 12 }}
                              tickFormatter={(value) =>
                                new Date(value).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                })
                              }
                            />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip
                              labelFormatter={(value) =>
                                new Date(value).toLocaleDateString()
                              }
                              formatter={(value, name) => {
                                if (
                                  name === "is_late" ||
                                  name === "is_incomplete"
                                ) {
                                  return [
                                    value ? "Yes" : "No",
                                    name
                                      .replace("_", " ")
                                      .replace("is", "")
                                      .trim(),
                                  ];
                                }
                                return [
                                  value + "h",
                                  name.replace("_", " ").toUpperCase(),
                                ];
                              }}
                            />
                            <Bar
                              dataKey="regular_hours"
                              stackId="a"
                              fill="#10b981"
                              name="Regular Hours"
                            />
                            <Bar
                              dataKey="overtime_hours"
                              stackId="a"
                              fill="#f59e0b"
                              name="Overtime Hours"
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-80 flex items-center justify-center text-slate-500 dark:text-slate-400">
                        No data available for chart
                      </div>
                    )}
                  </div>
                  {/* Attendance Pattern Heatmap-style Chart */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                      🔥 Attendance Pattern
                    </h3>
                    {chartData.length > 0 ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-7 gap-2">
                          {[
                            "Sun",
                            "Mon",
                            "Tue",
                            "Wed",
                            "Thu",
                            "Fri",
                            "Sat",
                          ].map((day) => (
                            <div
                              key={day}
                              className="text-center text-xs font-medium text-slate-600 dark:text-slate-400 p-2"
                            >
                              {day}
                            </div>
                          ))}
                        </div>
                        <div className="grid grid-cols-7 gap-2">
                          {chartData.slice(-28).map((record, index) => {
                            const date = new Date(record.date);
                            const dayOfWeek = date.getDay();
                            const intensity = Math.min(
                              record.total_hours / 12,
                              1
                            ); // Max 12 hours for full intensity
                            const isLate = record.is_late;
                            const isIncomplete = record.is_incomplete;

                            return (
                              <div
                                key={index}
                                className={`
                                  h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold border-2
                                  ${isLate
                                    ? "border-red-400"
                                    : isIncomplete
                                      ? "border-amber-400"
                                      : "border-transparent"
                                  }
                                  ${intensity > 0.8
                                    ? "bg-emerald-600 text-white"
                                    : intensity > 0.6
                                      ? "bg-emerald-500 text-white"
                                      : intensity > 0.4
                                        ? "bg-emerald-400 text-white"
                                        : intensity > 0.2
                                          ? "bg-emerald-300 text-slate-800"
                                          : intensity > 0
                                            ? "bg-emerald-200 text-slate-800"
                                            : "bg-slate-200 dark:bg-slate-700 text-slate-500"
                                  }
                                `}
                                title={`${record.date}: ${record.total_hours}h${isLate ? " (Late)" : ""
                                  }${isIncomplete ? " (Incomplete)" : ""}`}
                              >
                                {parseFloat(record.total_hours)}
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                          <span>Less productive</span>
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-slate-200 dark:bg-slate-700 rounded"></div>
                            <div className="w-3 h-3 bg-emerald-200 rounded"></div>
                            <div className="w-3 h-3 bg-emerald-300 rounded"></div>
                            <div className="w-3 h-3 bg-emerald-400 rounded"></div>
                            <div className="w-3 h-3 bg-emerald-500 rounded"></div>
                            <div className="w-3 h-3 bg-emerald-600 rounded"></div>
                          </div>
                          <span>More productive</span>
                        </div>
                      </div>
                    ) : (
                      <div className="h-80 flex items-center justify-center text-slate-500 dark:text-slate-400">
                        No data available for pattern analysis
                      </div>
                    )}
                  </div>
                </div>

                {/* Additional Statistics Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Weekly Performance Breakdown */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                      📅 Weekly Breakdown
                    </h3>
                    {(() => {
                      const weeklyData = chartData.reduce((acc, record) => {
                        const date = new Date(record.date);
                        const dayName = date.toLocaleDateString("en-US", {
                          weekday: "short",
                        });
                        if (!acc[dayName]) {
                          acc[dayName] = {
                            total_hours: 0,
                            count: 0,
                            late_count: 0,
                          };
                        }
                        acc[dayName].total_hours += record.total_hours;
                        acc[dayName].count += 1;
                        if (record.is_late) acc[dayName].late_count += 1;
                        return acc;
                      }, {});

                      const days = [
                        "Mon",
                        "Tue",
                        "Wed",
                        "Thu",
                        "Fri",
                        "Sat",
                        "Sun",
                      ];

                      return (
                        <div className="space-y-3">
                          {days.map((day) => {
                            const data = weeklyData[day];
                            if (!data) return null;
                            const avgHours = data.total_hours / data.count;
                            const latePercentage =
                              (data.late_count / data.count) * 100;

                            return (
                              <div
                                key={day}
                                className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
                              >
                                <div>
                                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                                    {day}
                                  </div>
                                  <div className="text-sm text-slate-600 dark:text-slate-400">
                                    {data.count} days worked
                                  </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-slate-800 dark:text-slate-200">
                                    {(parseFloat(avgHours) || 0).toFixed(1)}h avg
                                  </div>
                                  {latePercentage > 0 && (
                                    <div className="text-xs text-red-600 dark:text-red-400">
                                      {(parseFloat(latePercentage) || 0)}% late
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Performance Trends */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                      📈 Trends & Patterns
                    </h3>
                    {(() => {
                      if (chartData.length === 0)
                        return (
                          <div className="text-slate-500">
                            No data available
                          </div>
                        );

                      const recentData = chartData.slice(-7);
                      const olderData = chartData.slice(-14, -7);

                      const recentAvg =
                        recentData.reduce((sum, r) => sum + r.total_hours, 0) /
                        recentData.length;
                      const olderAvg =
                        olderData.length > 0
                          ? olderData.reduce(
                            (sum, r) => sum + r.total_hours,
                            0
                          ) / olderData.length
                          : recentAvg;

                      const trend = recentAvg - olderAvg;
                      const trendPercentage =
                        olderAvg > 0 ? (trend / olderAvg) * 100 : 0;

                      const recentLateCount = recentData.filter(
                        (r) => r.is_late
                      ).length;
                      const olderLateCount = olderData.filter(
                        (r) => r.is_late
                      ).length;

                      const mostProductiveDay = chartData.reduce(
                        (max, record) =>
                          record.total_hours > max.total_hours ? record : max,
                        chartData[0] || {}
                      );

                      const leastProductiveDay = chartData.reduce(
                        (min, record) =>
                          record.total_hours < min.total_hours ? record : min,
                        chartData[0] || {}
                      );

                      return (
                        <div className="space-y-4">
                          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                            <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                              Hours Trend
                            </div>
                            <div
                              className={`text-lg font-bold ${trend >= 0 ? "text-emerald-600" : "text-red-600"
                                }`}
                            >
                              {trend >= 0 ? "↗️" : "↘️"}{" "}
                              {(parseFloat(Math.abs(trendPercentage)) || 0)}%
                            </div>
                            <div className="text-xs text-slate-600 dark:text-slate-400">
                              vs previous week
                            </div>
                          </div>

                          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                            <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                              Punctuality
                            </div>
                            <div
                              className={`text-lg font-bold ${recentLateCount <= olderLateCount
                                ? "text-emerald-600"
                                : "text-red-600"
                                }`}
                            >
                              {recentLateCount <= olderLateCount ? "✅" : "⚠️"}{" "}
                              {recentLateCount} late days
                            </div>
                            <div className="text-xs text-slate-600 dark:text-slate-400">
                              in last 7 days
                            </div>
                          </div>

                          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                            <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                              Peak Performance
                            </div>
                            <div className="text-lg font-bold text-indigo-600">
                              🏆{" "}
                              {parseFloat(mostProductiveDay.total_hours) || 0}h
                            </div>
                            <div className="text-xs text-slate-600 dark:text-slate-400">
                              {mostProductiveDay.date
                                ? new Date(
                                  mostProductiveDay.date
                                ).toLocaleDateString()
                                : "N/A"}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Monthly Summary */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                      📊 Monthly Summary
                    </h3>
                    {(() => {
                      if (!employeeStats)
                        return (
                          <div className="text-slate-500">
                            No data available
                          </div>
                        );

                      const expectedWorkingDays = 22; // Average working days per month
                      const attendanceRate = employeeStats.total_days
                        ? (employeeStats.total_days / expectedWorkingDays) * 100
                        : 0;
                      const overtimeRate = employeeStats.total_days
                        ? (employeeStats.days_with_overtime /
                          employeeStats.total_days) *
                        100
                        : 0;
                      const punctualityRate = employeeStats.total_days
                        ? ((employeeStats.total_days -
                          (employeeStats.days_with_late_entry || 0)) /
                          employeeStats.total_days) *
                        100
                        : 0;

                      return (
                        <div className="space-y-4">
                          <div className="flex justify-between items-center p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                            <div>
                              <div className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                                Attendance Rate
                              </div>
                              <div className="text-2xl font-bold text-emerald-800 dark:text-emerald-200">
                                {(parseFloat(attendanceRate) || 0).toFixed(0)}%
                              </div>
                            </div>
                            <div className="text-3xl">📈</div>
                          </div>

                          <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <div>
                              <div className="text-sm font-medium text-blue-700 dark:text-blue-300">
                                Punctuality Rate
                              </div>
                              <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                                {parseFloat(punctualityRate).toFixed(0)}%
                              </div>
                            </div>
                            <div className="text-3xl">⏰</div>
                          </div>

                          <div className="flex justify-between items-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                            <div>
                              <div className="text-sm font-medium text-amber-700 dark:text-amber-300">
                                Overtime Days
                              </div>
                              <div className="text-2xl font-bold text-amber-800 dark:text-amber-200">
                                {overtimeRate.toFixed(0)}%
                              </div>
                            </div>
                            <div className="text-3xl">🌙</div>
                          </div>

                          <div className="flex justify-between items-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                            <div>
                              <div className="text-sm font-medium text-purple-700 dark:text-purple-300">
                                Total Hours
                              </div>
                              <div className="text-2xl font-bold text-purple-800 dark:text-purple-200">
                                {(parseFloat(employeeStats.grand_total_hours) || 0).toFixed(0)}h
                              </div>
                            </div>
                            <div className="text-3xl">⚡</div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Attendance History Table */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      📋 Attendance History
                    </h3>
                  </div>

                  <div className="overflow-x-auto">
                    {employeeHistory.length > 0 ? (
                      <table className="w-full">
                        <thead className="bg-slate-50 dark:bg-slate-800">
                          <tr>
                            <th className="text-left p-4 font-semibold text-slate-700 dark:text-slate-300">
                              Date
                            </th>
                            <th className="text-left p-4 font-semibold text-slate-700 dark:text-slate-300">
                              Regular Hours
                            </th>
                            <th className="text-left p-4 font-semibold text-slate-700 dark:text-slate-300">
                              Overtime Hours
                            </th>
                            <th className="text-left p-4 font-semibold text-slate-700 dark:text-slate-300">
                              Total Hours
                            </th>
                            <th className="text-left p-4 font-semibold text-slate-700 dark:text-slate-300">
                              Status
                            </th>
                            <th className="text-left p-4 font-semibold text-slate-700 dark:text-slate-300">
                              Clock Times
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {employeeHistory.map((record, index) => (
                            <tr
                              key={record.id || index}
                              className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                            >
                              <td className="p-4">
                                <input
                                  type="checkbox"
                                  checked={selectedRecordsToUnsync.has(record.id)}
                                  onChange={(e) => {
                                    const newSet = new Set(selectedRecordsToUnsync);
                                    if (e.target.checked) {
                                      newSet.add(record.id);
                                    } else {
                                      newSet.delete(record.id);
                                    }
                                    setSelectedRecordsToUnsync(newSet);
                                  }}
                                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                />
                              </td>
                              <td className="p-4 font-medium text-slate-800 dark:text-slate-200">
                                {new Date(record.date).toLocaleDateString()}
                              </td>
                              <td className="p-4 text-slate-700 dark:text-slate-300">
                                {(parseFloat(record.regular_hours) || 0)}h
                              </td>
                              <td className="p-4 text-slate-700 dark:text-slate-300">
                                {(parseFloat(record.overtime_hours) || 0)}h
                              </td>
                              <td className="p-4 font-semibold text-slate-800 dark:text-slate-200">
                                {(parseFloat(record.total_hours) || 0)}h
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  {record.has_late_entry ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800/30">
                                      ⚠️ Late
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800/30">
                                      ✅ On Time
                                    </span>
                                  )}
                                  {record.is_incomplete ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800/30">
                                      ⏳ Incomplete
                                    </span>
                                  ) : null}
                                  {record.has_overtime ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800/30">
                                      🌙 Overtime
                                    </span>
                                  ) : null}
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="text-sm text-slate-600 dark:text-slate-400">
                                  {record.first_clock_in && (
                                    <div>
                                      In: {formatTime(record.first_clock_in)}
                                    </div>
                                  )}
                                  {record.last_clock_out && (
                                    <div>
                                      Out: {formatTime(record.last_clock_out)}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="text-center py-16">
                        <div className="text-6xl mb-4">📭</div>
                        <h4 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">
                          No History Found
                        </h4>
                        <p className="text-slate-500 dark:text-slate-400">
                          No attendance history available for this employee.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Performance Insights */}
                {employeeStats && (
                  <div className="bg-linear-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl p-6 border border-indigo-200 dark:border-indigo-800/30">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                      💡 Performance Insights
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-3">
                          Attendance Metrics
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-600 dark:text-slate-400">
                              Average Daily Hours:
                            </span>
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                              {(parseFloat(employeeStats.avg_daily_hours) || 0).toFixed(0)}h
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600 dark:text-slate-400">
                              Days with Overtime:
                            </span>
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                              {employeeStats.days_with_overtime || 0}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600 dark:text-slate-400">
                              Incomplete Days:
                            </span>
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                              {employeeStats.incomplete_days || 0}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600 dark:text-slate-400">
                              Punctuality Rate:
                            </span>
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                              {employeeStats.total_days > 0
                                ? (
                                  ((employeeStats.total_days -
                                    (employeeStats.days_with_late_entry ||
                                      0)) /
                                    employeeStats.total_days) *
                                  100
                                ).toFixed(0)
                                : 0}
                              %
                            </span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-3">
                          Work Pattern
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-600 dark:text-slate-400">
                              Most Active Period:
                            </span>
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                              {(employeeStats.total_regular_hours || 0) >
                                (employeeStats.total_overtime_hours || 0)
                                ? "Regular Hours"
                                : "Overtime Hours"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600 dark:text-slate-400">
                              Consistency Score:
                            </span>
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                              {employeeStats.incomplete_days === 0 &&
                                (employeeStats.days_with_late_entry || 0) === 0
                                ? "Excellent"
                                : (employeeStats.incomplete_days || 0) <= 2 &&
                                  (employeeStats.days_with_late_entry || 0) <= 2
                                  ? "Good"
                                  : "Needs Improvement"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const groupedAttendance = useMemo(() => {
    return groupAttendanceByEmployee(attendanceData);
  }, [attendanceData]);

  return (
    <div className="space-y-8">
      {/* Full-screen Loading State */}
    {loading && attendanceData.length === 0 ? (
      <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center ${
        isDarkMode 
          ? "bg-slate-900" 
          : "bg-white"
      }`}>
        <GearLoadingSpinner isDarkMode={isDarkMode} />
      </div>
    ) : (
      <>
      {/* Employee Details Modal */}
      <EmployeeDetailsModal />

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className={`text-4xl font-bold bg-linear-to-r bg-clip-text text-transparent ${
            isDarkMode 
              ? "from-slate-100 to-slate-300" 
              : "from-slate-800 to-slate-600"
          }`}>
            Attendance Management
          </h1>
          <p className={`text-lg mt-2 ${
            isDarkMode ? "text-slate-400" : "text-slate-600"
          }`}>
            Track employee attendance and working hours in real-time
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Export Button with Tooltip */}
          <div className="relative group">
            {/* Tooltip */}
            <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-4 py-2 text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10 ${
              isDarkMode ? "bg-slate-800 text-white" : "bg-slate-800 text-white"
            }`}>
              <div className="text-center">
                <div className="font-semibold">Export includes:</div>
                <div>
                  Summary, Detailed Records, Employee Summary, Time Analysis
                </div>
              </div>
              <div className={`absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent ${
                isDarkMode ? "border-t-slate-800" : "border-t-slate-800"
              }`}></div>
            </div>
          </div>

          {/* Profile Loading Indicator */}
          {profileLoadingState === "loading" && (
            <div className={`flex items-center gap-2 px-3 py-2 backdrop-blur-sm rounded-xl border ${
              isDarkMode 
                ? "bg-blue-900/20 border-blue-800/30" 
                : "bg-blue-50 border-blue-200/30"
            }`}>
              <div className={`w-3 h-3 border rounded-full animate-spin ${
                isDarkMode 
                  ? "border-blue-500 border-t-transparent" 
                  : "border-blue-500 border-t-transparent"
              }`}></div>
              <span className={`text-sm font-medium ${
                isDarkMode ? "text-blue-300" : "text-blue-700"
              }`}>
                Loading profiles...
              </span>
            </div>
          )}

          {/* Connection Status */}
          <div className={`flex items-center gap-3 px-4 py-2 backdrop-blur-sm rounded-xl border ${
            isDarkMode 
              ? "bg-gray-800/70 border-gray-700/30" 
              : "bg-white/70 border-white/30"
          }`}>
            <div
              className={`w-3 h-3 rounded-full ${connectionStatus === "connected"
                ? "bg-emerald-500 shadow-lg shadow-emerald-500/50"
                : connectionStatus === "connecting"
                  ? "bg-amber-500 animate-pulse shadow-lg shadow-amber-500/50"
                  : "bg-red-500 shadow-lg shadow-red-500/50"
              }`}
            ></div>
            <span className={`text-sm font-medium ${
              isDarkMode ? "text-slate-300" : "text-slate-700"
            }`}>
              {connectionStatus === "connected"
                ? "Live Updates"
                : connectionStatus === "connecting"
                  ? "Connecting..."
                  : "Disconnected"}
            </span>
            {lastUpdate && (
              <span className={`text-xs ml-2 ${
                isDarkMode ? "text-slate-400" : "text-slate-500"
              }`}>
                {lastUpdate.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className={`backdrop-blur-sm border rounded-2xl p-6 ${
          isDarkMode 
            ? "bg-red-900/20 border-red-800/50" 
            : "bg-red-50 border-red-200"
        }`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">❌</span>
            <div>
              <h3 className={`font-semibold ${
                isDarkMode ? "text-red-300" : "text-red-800"
              }`}>
                Error Loading Data
              </h3>
              <p className={`mt-1 ${
                isDarkMode ? "text-red-400" : "text-red-600"
              }`}>{error}</p>
              <button
                onClick={fetchAttendanceData}
                className={`mt-3 px-4 py-2 rounded-lg font-medium transition-colors ${
                  isDarkMode 
                    ? "bg-red-800 hover:bg-red-700 text-red-300" 
                    : "bg-red-100 hover:bg-red-200 text-red-700"
                }`}
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className={`group backdrop-blur-xl rounded-3xl p-6 border shadow-2xl hover:shadow-3xl transition-all duration-300 hover:-translate-y-1 ${
            isDarkMode 
              ? "bg-linear-to-br from-slate-800/80 to-slate-900/60 border-slate-700/40" 
              : "bg-linear-to-br from-white/80 to-white/60 border-white/40"
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-2xl ${
                isDarkMode ? "bg-slate-800" : "bg-slate-100"
              }`}>
                <span className="text-2xl">📊</span>
              </div>
              <div className="text-right">
                <p className={`text-3xl font-bold ${
                  isDarkMode ? "text-slate-200" : "text-slate-800"
                }`}>
                  {stats.total_records || 0}
                </p>
                <p className={`text-sm font-medium ${
                  isDarkMode ? "text-slate-400" : "text-slate-600"
                }`}>
                  Total Records
                </p>
              </div>
            </div>
            <p className={`text-sm ${
              isDarkMode ? "text-slate-500" : "text-slate-500"
            }`}>
              {filters.date ? `Today (${filters.date})` : "All Dates"}
            </p>
          </div>

          <div className={`group backdrop-blur-xl rounded-3xl p-6 border shadow-2xl hover:shadow-3xl transition-all duration-300 hover:-translate-y-1 ${
            isDarkMode 
              ? "bg-linear-to-br from-emerald-900/20 to-emerald-800/20 border-emerald-800/40" 
              : "bg-linear-to-br from-emerald-50/80 to-emerald-100/60 border-emerald-200/40"
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-2xl ${
                isDarkMode ? "bg-emerald-900/30" : "bg-emerald-100"
              }`}>
                <span className="text-2xl">👥</span>
              </div>
              <div className="text-right">
                <p className={`text-3xl font-bold ${
                  isDarkMode ? "text-emerald-300" : "text-emerald-700"
                }`}>
                  {stats.unique_employees || 0}
                </p>
                <p className={`text-sm font-medium ${
                  isDarkMode ? "text-emerald-400" : "text-emerald-600"
                }`}>
                  Active Employees
                </p>
              </div>
            </div>
            <p className={`text-sm ${
              isDarkMode ? "text-emerald-500" : "text-emerald-500"
            }`}>
              Clocked in today
            </p>
          </div>

          <div className={`group backdrop-blur-xl rounded-3xl p-6 border shadow-2xl hover:shadow-3xl transition-all duration-300 hover:-translate-y-1 ${
            isDarkMode 
              ? "bg-linear-to-br from-orange-900/20 to-orange-800/20 border-orange-800/40" 
              : "bg-linear-to-br from-orange-50/80 to-orange-100/60 border-orange-200/40"
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-2xl ${
                isDarkMode ? "bg-orange-900/30" : "bg-orange-100"
              }`}>
                <span className="text-2xl">⏱️</span>
              </div>
              <div className="text-right">
                <p className={`text-3xl font-bold ${
                  isDarkMode ? "text-orange-300" : "text-orange-700"
                }`}>
                  {(parseFloat(stats.total_regular_hours) || 0)}h
                </p>
                <p className={`text-sm font-medium ${
                  isDarkMode ? "text-orange-400" : "text-orange-600"
                }`}>
                  Regular Hours
                </p>
              </div>
            </div>
            <p className={`text-sm ${
              isDarkMode ? "text-orange-500" : "text-orange-500"
            }`}>
              Total for today
            </p>
          </div>

          <div className={`group backdrop-blur-xl rounded-3xl p-6 border shadow-2xl hover:shadow-3xl transition-all duration-300 hover:-translate-y-1 ${
            isDarkMode 
              ? "bg-linear-to-br from-red-900/20 to-red-800/20 border-red-800/40" 
              : "bg-linear-to-br from-red-50/80 to-red-100/60 border-red-200/40"
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-2xl ${
                isDarkMode ? "bg-red-900/30" : "bg-red-100"
              }`}>
                <span className="text-2xl">⚠️</span>
              </div>
              <div className="text-right">
                <p className={`text-3xl font-bold ${
                  isDarkMode ? "text-red-300" : "text-red-700"
                }`}>
                  {stats.late_count || 0}
                </p>
                <p className={`text-sm font-medium ${
                  isDarkMode ? "text-red-400" : "text-red-600"
                }`}>
                  Late Arrivals
                </p>
              </div>
            </div>
            <p className={`text-sm ${
              isDarkMode ? "text-red-500" : "text-red-500"
            }`}>Today</p>
          </div>
        </div>
      )}

      {/* Additional Stats Row */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className={`backdrop-blur-xl rounded-2xl p-6 border ${
            isDarkMode 
              ? "bg-linear-to-br from-blue-900/20 to-blue-800/20 border-blue-800/40" 
              : "bg-linear-to-br from-blue-50/80 to-blue-100/60 border-blue-200/40"
          }`}>
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${
                isDarkMode ? "bg-blue-900/30" : "bg-blue-100"
              }`}>
                <span className="text-xl">📥</span>
              </div>
              <div>
                <p className={`text-2xl font-bold ${
                  isDarkMode ? "text-blue-300" : "text-blue-700"
                }`}>
                  {stats.clock_ins || 0}
                </p>
                <p className={`text-sm font-medium ${
                  isDarkMode ? "text-blue-400" : "text-blue-600"
                }`}>
                  Clock Ins
                </p>
              </div>
            </div>
          </div>

          <div className={`backdrop-blur-xl rounded-2xl p-6 border ${
            isDarkMode 
              ? "bg-linear-to-br from-purple-900/20 to-purple-800/20 border-purple-800/40" 
              : "bg-linear-to-br from-purple-50/80 to-purple-100/60 border-purple-200/40"
          }`}>
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${
                isDarkMode ? "bg-purple-900/30" : "bg-purple-100"
              }`}>
                <span className="text-xl">📤</span>
              </div>
              <div>
                <p className={`text-2xl font-bold ${
                  isDarkMode ? "text-purple-300" : "text-purple-700"
                }`}>
                  {stats.clock_outs || 0}
                </p>
                <p className={`text-sm font-medium ${
                  isDarkMode ? "text-purple-400" : "text-purple-600"
                }`}>
                  Clock Outs
                </p>
              </div>
            </div>
          </div>

          <div className={`backdrop-blur-xl rounded-2xl p-6 border ${
            isDarkMode 
              ? "bg-linear-to-br from-yellow-900/20 to-yellow-800/20 border-yellow-800/40" 
              : "bg-linear-to-br from-yellow-50/80 to-yellow-100/60 border-yellow-200/40"
          }`}>
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${
                isDarkMode ? "bg-yellow-900/30" : "bg-yellow-100"
              }`}>
                <span className="text-xl">🌙</span>
              </div>
              <div>
                <p className={`text-2xl font-bold ${
                  isDarkMode ? "text-yellow-300" : "text-yellow-700"
                }`}>
                  {(parseFloat(stats.total_overtime_hours) || 0)}h
                </p>
                <p className={`text-sm font-medium ${
                  isDarkMode ? "text-yellow-400" : "text-yellow-600"
                }`}>
                  Overtime Hours
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Combined Filters and Export Section */}
      <div className="space-y-6">
        {/* Main Container - Filters and Export */}
        <div className={`backdrop-blur-xl rounded-3xl p-8 border shadow-2xl ${
          isDarkMode 
            ? "bg-gray-800/70 border-gray-700/40" 
            : "bg-white/70 border-white/40"
        }`}>
          {/* Header with Filters and Export */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${
                isDarkMode ? "bg-slate-800" : "bg-slate-100"
              }`}>
                <span className="text-xl">🔍</span>
              </div>
              <h2 className={`text-2xl font-bold ${
                isDarkMode ? "text-slate-200" : "text-slate-800"
              }`}>
                Filters
              </h2>
            </div>
            <button
              onClick={exportToExcel}
              disabled={isExporting}
              className={`flex items-center gap-2 px-5 py-3 text-white rounded-xl font-semibold transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl disabled:hover:translate-y-0 disabled:hover:shadow-none disabled:cursor-not-allowed ${
                isDarkMode 
                  ? "bg-linear-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 disabled:from-slate-600 disabled:to-slate-700" 
                  : "bg-linear-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 disabled:from-slate-400 disabled:to-slate-500"
              }`}
            >
              {isExporting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Exporting...</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <span>Export to Excel</span>
                </>
              )}
            </button>
            <button
              onClick={() => setShowEditModal(true)}
              className={`px-5 py-3 text-white rounded-xl font-semibold transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl flex items-center gap-2 ${
                isDarkMode 
                  ? "bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700" 
                  : "bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              }`}
            >
              <span>✏️</span>
              <span>Edit Records ({stats.unsynced_count || 0})</span>
            </button>

            <button
              onClick={() => setShowFaceRecognition(true)}
              className={`flex items-center gap-2 px-5 py-3 text-white rounded-xl font-semibold transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl ${
                isDarkMode 
                  ? "bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700" 
                  : "bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>Face Recognition</span>
            </button>
          </div>

          {/* Date Mode Toggle */}
          <div className="mb-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.useRange}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    useRange: e.target.checked,
                    startDate: e.target.checked ? prev.startDate : "",
                    endDate: e.target.checked ? prev.endDate : "",
                  }))
                }
                className={`w-4 h-4 rounded focus:ring-2 ${
                  isDarkMode 
                    ? "text-indigo-600 bg-gray-700 border-gray-600 focus:ring-indigo-600 ring-offset-gray-800" 
                    : "text-indigo-600 bg-gray-100 border-gray-300 focus:ring-indigo-500"
                }`}
              />
              <span className={`text-sm font-medium ${
                isDarkMode ? "text-slate-300" : "text-slate-700"
              }`}>
                Use date range instead of single date
              </span>
            </label>
          </div>

          {/* Date Inputs */}
          <div
            className={`grid gap-6 ${filters.useRange ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
              }`}
          >
            {filters.useRange ? (
              <>
                <div>
                  <label className={`block text-sm font-semibold mb-2 ${
                    isDarkMode ? "text-slate-300" : "text-slate-700"
                  }`}>
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        startDate: e.target.value,
                      }))
                    }
                    className={`w-full px-4 py-3 rounded-xl border backdrop-blur-sm focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all ${
                      isDarkMode 
                        ? "bg-gray-700/60 border-gray-600/40 text-slate-200" 
                        : "bg-white/60 border-white/40 text-slate-800"
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-semibold mb-2 ${
                    isDarkMode ? "text-slate-300" : "text-slate-700"
                  }`}>
                    End Date
                  </label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        endDate: e.target.value,
                      }))
                    }
                    min={filters.startDate}
                    className={`w-full px-4 py-3 rounded-xl border backdrop-blur-sm focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all ${
                      isDarkMode 
                        ? "bg-gray-700/60 border-gray-600/40 text-slate-200" 
                        : "bg-white/60 border-white/40 text-slate-800"
                    }`}
                  />
                </div>
              </>
            ) : (
              <div>
                <label className={`block text-sm font-semibold mb-2 ${
                  isDarkMode ? "text-slate-300" : "text-slate-700"
                }`}>
                  Date
                </label>
                <input
                  type="date"
                  value={filters.date}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, date: e.target.value }))
                  }
                  className={`w-full px-4 py-3 rounded-xl border backdrop-blur-sm focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all ${
                    isDarkMode 
                      ? "bg-gray-700/60 border-gray-600/40 text-slate-200" 
                      : "bg-white/60 border-white/40 text-slate-800"
                  }`}
                />
              </div>
            )}
          </div>

          {/* Date Status Messages */}
          <div className="mt-6">
            {filters.useRange &&
              filters.startDate &&
              filters.endDate &&
              new Date(filters.startDate) > new Date(filters.endDate) && (
                <div className={`p-3 border rounded-lg mb-4 ${
                  isDarkMode 
                    ? "bg-red-900/20 border-red-800/30" 
                    : "bg-red-50 border-red-200"
                }`}>
                  <p className={`text-sm ${
                    isDarkMode ? "text-red-400" : "text-red-600"
                  }`}>
                    ⚠️ Start date cannot be later than end date.
                  </p>
                </div>
              )}

            {filters.useRange &&
              filters.startDate &&
              filters.endDate &&
              new Date(filters.startDate) <= new Date(filters.endDate) && (
                <div className={`p-3 border rounded-lg ${
                  isDarkMode 
                    ? "bg-blue-900/20 border-blue-800/30" 
                    : "bg-blue-50 border-blue-200"
                }`}>
                  <p className={`text-sm ${
                    isDarkMode ? "text-blue-400" : "text-blue-600"
                  }`}>
                    📅 Selected range:{" "}
                    {new Date(filters.startDate).toLocaleDateString()} -{" "}
                    {new Date(filters.endDate).toLocaleDateString()}(
                    {Math.ceil(
                      (new Date(filters.endDate) -
                        new Date(filters.startDate)) /
                      (1000 * 60 * 60 * 24)
                    ) + 1}{" "}
                    days)
                  </p>
                </div>
              )}
          </div>
        </div>

        {/* Display Options & Actions Section */}
        <div className={`backdrop-blur-xl rounded-3xl p-8 border shadow-2xl ${
          isDarkMode 
            ? "bg-gray-800/70 border-gray-700/40" 
            : "bg-white/70 border-white/40"
        }`}>
          <div className="flex items-center gap-3 mb-6">
            <div className={`p-2 rounded-xl ${
              isDarkMode ? "bg-blue-900" : "bg-blue-100"
            }`}>
              <span className="text-xl">⚙️</span>
            </div>
            <h3 className={`text-xl font-bold ${
              isDarkMode ? "text-slate-200" : "text-slate-800"
            }`}>
              Display Options & Actions
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            {/* Clock Type Filter */}
            <div>
              <label className={`block text-sm font-semibold mb-3 ${
                isDarkMode ? "text-slate-300" : "text-slate-700"
              }`}>
                Clock Type
              </label>
              <select
                value={filters.clock_type}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    clock_type: e.target.value,
                  }))
                }
                className={`w-full px-4 py-3 rounded-xl border backdrop-blur-sm focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all ${
                  isDarkMode 
                    ? "bg-gray-700/60 border-gray-600/40 text-slate-200" 
                    : "bg-white/60 border-white/40 text-slate-800"
                }`}
              >
                <option value="">All Types</option>
                <option value="morning_in">Morning In</option>
                <option value="morning_out">Morning Out</option>
                <option value="afternoon_in">Afternoon In</option>
                <option value="afternoon_out">Afternoon Out</option>
                <option value="overtime_in">Overtime In</option>
                <option value="overtime_out">Overtime Out</option>
              </select>
            </div>

            {/* Records Per Page Filter */}
            <div>
              <label className={`block text-sm font-semibold mb-3 ${
                isDarkMode ? "text-slate-300" : "text-slate-700"
              }`}>
                Records per page
              </label>
              <select
                value={filters.limit}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    limit: parseInt(e.target.value),
                  }))
                }
                className={`w-full px-4 py-3 rounded-xl border backdrop-blur-sm focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all ${
                  isDarkMode 
                    ? "bg-gray-700/60 border-gray-600/40 text-slate-200" 
                    : "bg-white/60 border-white/40 text-slate-800"
                }`}
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>

            {/* Refresh Button */}
            <div>
              <button
                onClick={() => {
                  fetchAttendanceData();
                  fetchAttendanceStats();
                }}
                className={`w-full px-6 py-3 text-white rounded-xl font-semibold transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl ${
                  isDarkMode 
                    ? "bg-linear-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800" 
                    : "bg-linear-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800"
                }`}
              >
                Refresh Data
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grouped Employee Cards */}
      {!loading && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${
              isDarkMode ? "bg-slate-800" : "bg-slate-100"
            }`}>
              <span className="text-xl">👤</span>
            </div>
            <h2 className={`text-2xl font-bold ${
              isDarkMode ? "text-slate-200" : "text-slate-800"
            }`}>
              Employee Attendance
            </h2>
            <div className={`text-sm ${
              isDarkMode ? "text-slate-400" : "text-slate-500"
            }`}>
              Click on any card to view detailed statistics
            </div>
          </div>

          {groupedAttendance.length === 0 ? (
            <div className={`text-center py-16 backdrop-blur-xl rounded-3xl border ${
              isDarkMode 
                ? "bg-gray-800/40 border-gray-700/40" 
                : "bg-white/40 border-white/40"
            }`}>
              <div className="text-6xl mb-4">📭</div>
              <h3 className={`text-xl font-semibold mb-2 ${
                isDarkMode ? "text-slate-300" : "text-slate-700"
              }`}>
                No Records Found
              </h3>
              <p className={`${
                isDarkMode ? "text-slate-400" : "text-slate-500"
              }`}>
                No attendance records found for the selected filters.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {groupedAttendance.map((employee, index) => {
                const employeeName = formatEmployeeName(employee.employee_info);
                const hasNewRecords = employee.records.some((record) =>
                  newRecordIds.has(record.id)
                );

                return (
                  <div
                    key={`${employee.employee_uid}-${employee.date}-${employee.records.length}-${employee.latest_clock_time}`}
                    onClick={() =>
                      loadEmployeeDetails(
                        employee.employee_uid,
                        employee.employee_info
                      )
                    }
                    className={`group relative overflow-hidden rounded-3xl border transition-all duration-500 transform hover:-translate-y-2 hover:shadow-2xl cursor-pointer ${
                      hasNewRecords
                        ? isDarkMode
                          ? "bg-linear-to-br from-emerald-900/30 to-emerald-800/20 border-emerald-700/60 shadow-2xl animate-pulse shadow-emerald-500/20"
                          : "bg-linear-to-br from-emerald-50/90 to-emerald-100/70 border-emerald-300/60 shadow-2xl animate-pulse shadow-emerald-500/20"
                        : isDarkMode
                          ? "bg-linear-to-br from-slate-800/80 to-slate-900/60 border-slate-700/40 hover:shadow-xl backdrop-blur-xl hover:border-indigo-700/60"
                          : "bg-linear-to-br from-white/80 to-white/60 border-white/40 hover:shadow-xl backdrop-blur-xl hover:border-indigo-300/60"
                    }`}
                  >
                    {/* New Record Indicator */}
                    {hasNewRecords && (
                      <div className="absolute top-4 right-4 px-3 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full animate-bounce">
                        NEW
                      </div>
                    )}

                    {/* Click to View Details Indicator */}
                    <div className={`absolute top-4 right-4 px-3 py-1 text-xs font-medium rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                      isDarkMode 
                        ? "bg-indigo-500/10 text-indigo-400" 
                        : "bg-indigo-500/10 text-indigo-600"
                    }`}>
                      Click for details
                    </div>

                    <div className="p-6">
                      {/* Header Section */}
                      <div className="flex items-start gap-4 mb-6">
                        <div className="shrink-0">
                          <ProfilePicture
                            uid={employee.employee_uid}
                            name={employeeName}
                            size="w-16 h-16"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className={`text-lg font-bold truncate ${
                              isDarkMode ? "text-slate-200" : "text-slate-800"
                            }`}>
                              {employeeName}
                            </h3>
                            {employee.is_late ? (
                              <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${
                                isDarkMode 
                                  ? "bg-red-900/20 text-red-300 border-red-800/30" 
                                  : "bg-red-50 text-red-700 border-red-200"
                              }`}>
                                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                                Late
                              </span>
                            ) : (
                              <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${
                                isDarkMode 
                                  ? "bg-emerald-900/20 text-emerald-300 border-emerald-800/30" 
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
                              }`}>
                                <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                                On Time
                              </span>
                            )}
                            {employee.has_unsynced && (
                              <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${
                                isDarkMode 
                                  ? "bg-amber-900/20 text-amber-300 border-amber-800/30" 
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                              }`}>
                                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>
                                Unsynced
                              </span>
                            )}
                          </div>

                          <div className={`text-sm space-y-1 ${
                            isDarkMode ? "text-slate-400" : "text-slate-600"
                          }`}>
                            <p>
                              <span className="font-medium">ID:</span>{" "}
                              {employee.employee_info.id_number ||
                                employee.employee_uid ||
                                "N/A"}
                            </p>
                            <p>
                              <span className="font-medium">Department:</span>{" "}
                              {employee.employee_info.department || "N/A"}
                            </p>
                            <p>
                              <span className="font-medium">Position:</span>{" "}
                              {employee.employee_info.position || "N/A"}
                            </p>
                            <p>
                              <span className="font-medium">Date:</span>{" "}
                              {employee.date}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Clock Records Section */}
                      <div className={`backdrop-blur-sm rounded-2xl p-4 mb-4 ${
                        isDarkMode 
                          ? "bg-slate-700/30" 
                          : "bg-white/50"
                      }`}>
                        <h4 className={`text-sm font-semibold mb-3 ${
                          isDarkMode ? "text-slate-300" : "text-slate-700"
                        }`}>
                          Clock Records ({employee.records.length})
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {employee.records.map((record, recordIndex) => (
                            <div
                              key={record.id || recordIndex}
                              className={`flex items-center justify-between p-3 rounded-xl border ${getClockTypeColor(
                                record.clock_type
                              )}`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-lg">
                                  {getClockTypeIcon(record.clock_type)}
                                </span>
                                <div>
                                  <p className="font-semibold text-sm">
                                    {formatClockType(record.clock_type)}
                                  </p>
                                  <p className="text-xs opacity-75">
                                    {formatTime(record.clock_time)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                {record.is_synced ? (
                                  <span
                                    className="w-2 h-2 bg-emerald-500 rounded-full"
                                    title="Synced"
                                  ></span>
                                ) : (
                                  <span
                                    className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"
                                    title="Pending sync"
                                  ></span>
                                )}
                                {record.is_late && (
                                  <span
                                    className="w-2 h-2 bg-red-500 rounded-full ml-1"
                                    title="Late arrival"
                                  ></span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Hours Summary Section */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className={`backdrop-blur-sm rounded-xl p-3 ${
                          isDarkMode 
                            ? "bg-slate-800/30" 
                            : "bg-slate-50/50"
                        }`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">⏰</span>
                            <span className={`text-sm font-medium ${
                              isDarkMode ? "text-slate-400" : "text-slate-600"
                            }`}>
                              Regular Hours
                            </span>
                          </div>
                          <p className={`text-xl font-bold ${
                            isDarkMode ? "text-slate-200" : "text-slate-800"
                          }`}>
                            {parseFloat(employee.total_regular_hours).toFixed(1)}h
                          </p>
                        </div>

                        <div className={`backdrop-blur-sm rounded-xl p-3 ${
                          isDarkMode 
                            ? "bg-orange-900/20" 
                            : "bg-orange-50/50"
                        }`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">🌙</span>
                            <span className={`text-sm font-medium ${
                              isDarkMode ? "text-orange-400" : "text-orange-600"
                            }`}>
                              Overtime Hours
                            </span>
                          </div>
                          <p className={`text-xl font-bold ${
                            isDarkMode ? "text-orange-300" : "text-orange-700"
                          }`}>
                            {parseFloat(employee.total_overtime_hours)}h
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Hover Effect Overlay */}
                    <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none ${
                      isDarkMode 
                        ? "bg-linear-to-r from-transparent via-white/5 to-transparent" 
                        : "bg-linear-to-r from-transparent via-white/10 to-transparent"
                    }`}></div>

                    {/* Interactive Indicator */}
                    <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="p-2 bg-indigo-500 text-white rounded-full shadow-lg">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 7l5 5m0 0l-5 5m5-5H6"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Recent Activity */}
      {!loading && recentActivity.length > 0 && (
        <div className={`backdrop-blur-xl rounded-3xl p-8 border shadow-2xl ${
          isDarkMode 
            ? "bg-gray-800/70 border-gray-700/40" 
            : "bg-white/70 border-white/40"
        }`}>
          <div className="flex items-center gap-3 mb-6">
            <div className={`p-2 rounded-xl ${
              isDarkMode ? "bg-slate-800" : "bg-slate-100"
            }`}>
              <span className="text-xl">🔄</span>
            </div>
            <h2 className={`text-2xl font-bold ${
              isDarkMode ? "text-slate-200" : "text-slate-800"
            }`}>
              Recent Activity
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentActivity.slice(0, 6).map((activity, index) => {
              const activityName = `${activity.first_name} ${activity.last_name}`;

              return (
                <div
                  key={index}
                  onClick={() =>
                    loadEmployeeDetails(activity.employee_uid, {
                      first_name: activity.first_name,
                      last_name: activity.last_name,
                      id_number: activity.id_number,
                      department: activity.department,
                      position: activity.position,
                    })
                  }
                  className={`group backdrop-blur-sm rounded-2xl p-4 border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg cursor-pointer ${
                    isDarkMode 
                      ? "bg-slate-700/60 border-slate-600/40 hover:bg-slate-700/80 hover:border-indigo-700/60" 
                      : "bg-white/60 border-white/40 hover:bg-white/80 hover:border-indigo-300/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <ProfilePicture
                      uid={activity.employee_uid}
                      name={activityName}
                      size="w-12 h-12"
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold truncate ${
                        isDarkMode ? "text-slate-200" : "text-slate-800"
                      }`}>
                        {activityName}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm">
                          {getClockTypeIcon(activity.clock_type)}
                        </span>
                        <span className={`text-sm ${
                          isDarkMode ? "text-slate-400" : "text-slate-600"
                        }`}>
                          {formatClockType(activity.clock_type)}
                        </span>
                      </div>
                      <p className={`text-xs mt-1 ${
                        isDarkMode ? "text-slate-500" : "text-slate-500"
                      }`}>
                        {formatTime(activity.clock_time)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Unsynced Alert */}
      {stats.unsynced_count > 0 && (
        <div className={`backdrop-blur-xl border rounded-2xl p-6 shadow-xl ${
          isDarkMode 
            ? "bg-linear-to-r from-amber-900/20 to-orange-900/20 border-amber-700/60" 
            : "bg-linear-to-r from-amber-50/90 to-orange-50/90 border-amber-200/60"
        }`}>
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${
              isDarkMode ? "bg-amber-900/30" : "bg-amber-100"
            }`}>
              <span className="text-2xl">⚠️</span>
            </div>
            <div>
              <h3 className={`text-lg font-semibold ${
                isDarkMode ? "text-amber-300" : "text-amber-800"
              }`}>
                Attention Required
              </h3>
              <p className={`${
                isDarkMode ? "text-amber-400" : "text-amber-700"
              }`}>
                There are{" "}
                <span className="font-bold">{stats.unsynced_count}</span>{" "}
                unsynced attendance records that need attention.
              </p>
            </div>
          </div>
        </div>
      )}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 overflow-y-auto">
          <div className="min-h-screen p-4">
            <div className="max-w-7xl mx-auto my-8">
              <div className={`rounded-3xl shadow-2xl ${
                isDarkMode ? "bg-slate-900" : "bg-white"
              }`}>
                {/* Optional: Add a header bar with close button (alternative placement) */}
                <div className={`sticky top-0 p-4 rounded-t-3xl flex justify-between items-center z-10 ${
                  isDarkMode 
                    ? "bg-linear-to-r from-indigo-600 to-purple-600" 
                    : "bg-linear-to-r from-indigo-600 to-purple-600"
                }`}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">✏️</span>
                    <h2 className="text-2xl font-bold text-white">
                      Attendance Editor
                    </h2>
                  </div>
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors text-white group"
                    title="Close Editor"
                  >
                    <svg className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="p-6">
                  <AttendanceEdit
                    apiService={apiService}
                    pollingManager={pollingManager}
                    onClose={() => setShowEditModal(false)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showFaceRecognition && (
        <FaceRecognitionModal
          apiService={apiService}
          onClose={() => setShowFaceRecognition(false)}
          onEmployeeIdentified={handleEmployeeIdentified}
        />
      )}
      </>
    )}
    </div>
  );
}

export default Attendance;



