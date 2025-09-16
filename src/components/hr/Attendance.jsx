//client attendance.jsx - Enhanced with employee details modal, statistics, and Excel export
import { useState, useEffect } from "react";
import { useAuth } from "../../App";
import apiService from "../../utils/api/api-service";
import JSZip from "jszip";
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

function Attendance() {
  const { user } = useAuth();
  const [attendanceData, setAttendanceData] = useState([]);
  const [profilePictures, setProfilePictures] = useState({});
  const [profileLoadingState, setProfileLoadingState] = useState("idle"); // 'idle', 'loading', 'loaded', 'error'
  const [currentBulkRequest, setCurrentBulkRequest] = useState(null); // Track ongoing bulk requests
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
    date: new Date().toISOString().split("T")[0],
    startDate: "", // New field for range start
    endDate: "", // New field for range end
    useRange: false, // Toggle for range mode
    employee_uid: "",
    clock_type: "",
    limit: 20,
    offset: 0,
  });
  const [newRecordIds, setNewRecordIds] = useState(new Set());

  // Employee Details Modal State
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [employeeStats, setEmployeeStats] = useState(null);
  const [employeeHistory, setEmployeeHistory] = useState([]);
  const [loadingEmployeeData, setLoadingEmployeeData] = useState(false);

  // Export State
  const [isExporting, setIsExporting] = useState(false);

  // Group attendance records by employee and date
  const groupAttendanceByEmployee = (records) => {
    const grouped = {};

    records.forEach((record) => {
      const key = `${record.employee_uid}-${record.date}`;
      if (!grouped[key]) {
        grouped[key] = {
          employee_uid: record.employee_uid,
          employee_info: {
            first_name: record.first_name,
            middle_name: record.middle_name,
            last_name: record.last_name,
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

  // Excel Export Functions
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

      // Updated header information for range support
      const dateRange =
        filters.useRange && filters.startDate && filters.endDate
          ? `${new Date(filters.startDate).toLocaleDateString()} - ${new Date(
              filters.endDate
            ).toLocaleDateString()}`
          : new Date(filters.date).toLocaleDateString();

      // 1. Summary Sheet
      const summaryData = [];

      // Header information
      summaryData.push(["ATTENDANCE SUMMARY REPORT"]);
      summaryData.push([`Date Range: ${dateRange}`]);
      summaryData.push([`Generated: ${new Date().toLocaleString()}`]);
      summaryData.push([`Total Records: ${attendanceResult.data.length}`]);
      summaryData.push([]); // Empty row

      // Calculate statistics for the range
      const rangeStats = {
        total_records: attendanceResult.data.length,
        unique_employees: new Set(
          attendanceResult.data.map((r) => r.employee_uid)
        ).size,
        total_regular_hours: attendanceResult.data.reduce(
          (sum, r) => sum + (r.regular_hours || 0),
          0
        ),
        total_overtime_hours: attendanceResult.data.reduce(
          (sum, r) => sum + (r.overtime_hours || 0),
          0
        ),
        late_count: attendanceResult.data.filter((r) => r.is_late).length,
        clock_ins: attendanceResult.data.filter((r) =>
          r.clock_type.includes("_in")
        ).length,
        clock_outs: attendanceResult.data.filter((r) =>
          r.clock_type.includes("_out")
        ).length,
        unsynced_count: attendanceResult.data.filter((r) => !r.is_synced)
          .length,
      };

      // Overall statistics
      summaryData.push(["OVERALL STATISTICS"]);
      summaryData.push(["Metric", "Count", "Hours"]);
      summaryData.push(["Total Records", rangeStats.total_records, ""]);
      summaryData.push(["Unique Employees", rangeStats.unique_employees, ""]);
      summaryData.push([
        "Regular Hours",
        "",
        rangeStats.total_regular_hours.toFixed(2),
      ]);
      summaryData.push([
        "Overtime Hours",
        "",
        rangeStats.total_overtime_hours.toFixed(2),
      ]);
      summaryData.push(["Late Arrivals", rangeStats.late_count, ""]);
      summaryData.push(["Clock Ins", rangeStats.clock_ins, ""]);
      summaryData.push(["Clock Outs", rangeStats.clock_outs, ""]);
      summaryData.push(["Unsynced Records", rangeStats.unsynced_count, ""]);
      summaryData.push([]); // Empty row

      // Daily breakdown for range reports
      if (filters.useRange && filters.startDate && filters.endDate) {
        const dailyBreakdown = {};
        attendanceResult.data.forEach((record) => {
          const date = record.date;
          if (!dailyBreakdown[date]) {
            dailyBreakdown[date] = {
              records: 0,
              employees: new Set(),
              regular_hours: 0,
              overtime_hours: 0,
              late_count: 0,
            };
          }
          dailyBreakdown[date].records++;
          dailyBreakdown[date].employees.add(record.employee_uid);
          dailyBreakdown[date].regular_hours += record.regular_hours || 0;
          dailyBreakdown[date].overtime_hours += record.overtime_hours || 0;
          if (record.is_late) dailyBreakdown[date].late_count++;
        });

        summaryData.push(["DAILY BREAKDOWN"]);
        summaryData.push([
          "Date",
          "Records",
          "Employees",
          "Regular Hours",
          "Overtime Hours",
          "Late Count",
        ]);
        Object.entries(dailyBreakdown)
          .sort(([a], [b]) => new Date(a) - new Date(b))
          .forEach(([date, data]) => {
            summaryData.push([
              new Date(date).toLocaleDateString(),
              data.records,
              data.employees.size,
              data.regular_hours.toFixed(2),
              data.overtime_hours.toFixed(2),
              data.late_count,
            ]);
          });
        summaryData.push([]); // Empty row
      }

      // Clock type breakdown (rest of the existing code remains the same...)
      const clockTypeBreakdown = {};
      attendanceResult.data.forEach((record) => {
        clockTypeBreakdown[record.clock_type] =
          (clockTypeBreakdown[record.clock_type] || 0) + 1;
      });

      summaryData.push(["CLOCK TYPE BREAKDOWN"]);
      summaryData.push(["Clock Type", "Count"]);
      Object.entries(clockTypeBreakdown).forEach(([type, count]) => {
        summaryData.push([formatClockType(type), count]);
      });

      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);

      // Style the summary sheet
      const summaryRange = XLSX.utils.decode_range(summarySheet["!ref"]);
      summarySheet["!cols"] = [
        { wch: 25 }, // Column A
        { wch: 15 }, // Column B
        { wch: 15 }, // Column C
        { wch: 15 }, // Column D
        { wch: 15 }, // Column E
        { wch: 15 }, // Column F
      ];

      XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

      // 2. Detailed Attendance Sheet
      const detailedHeaders = [
        "Employee ID",
        "Employee Name",
        "Department",
        "Position",
        "Date",
        "Clock Type",
        "Clock Time",
        "Regular Hours",
        "Overtime Hours",
        "Is Late",
        "Is Synced",
        "Location",
        "Device Info",
      ];

      const detailedData = [detailedHeaders];

      attendanceResult.data.forEach((record) => {
        const employeeName = formatEmployeeName({
          first_name: record.first_name,
          middle_name: record.middle_name,
          last_name: record.last_name,
        });

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
        ]);
      });

      const detailedSheet = XLSX.utils.aoa_to_sheet(detailedData);

      // Style the detailed sheet
      detailedSheet["!cols"] = [
        { wch: 12 }, // Employee ID
        { wch: 25 }, // Employee Name
        { wch: 15 }, // Department
        { wch: 20 }, // Position
        { wch: 12 }, // Date
        { wch: 15 }, // Clock Type
        { wch: 12 }, // Clock Time
        { wch: 12 }, // Regular Hours
        { wch: 12 }, // Overtime Hours
        { wch: 8 }, // Is Late
        { wch: 8 }, // Is Synced
        { wch: 15 }, // Location
        { wch: 15 }, // Device Info
      ];

      XLSX.utils.book_append_sheet(workbook, detailedSheet, "Detailed Records");

      // 3. Employee Summary Sheet (if daily summary data is available)
      if (summaryResult.success && summaryResult.data.length > 0) {
        const employeeSummaryHeaders = [
          "Employee ID",
          "Employee Name",
          "Department",
          "Position",
          "Date",
          "Morning In",
          "Morning Out",
          "Afternoon In",
          "Afternoon Out",
          "Overtime In",
          "Overtime Out",
          "Regular Hours",
          "Overtime Hours",
          "Total Hours",
          "Has Late Entry",
          "Is Incomplete",
          "Has Overtime",
        ];

        const employeeSummaryData = [employeeSummaryHeaders];

        summaryResult.data.forEach((summary) => {
          const employeeName = formatEmployeeName({
            first_name: summary.first_name,
            middle_name: summary.middle_name,
            last_name: summary.last_name,
          });

          employeeSummaryData.push([
            summary.employee_uid || "N/A",
            employeeName,
            summary.department || "N/A",
            summary.position || "N/A",
            summary.date,
            summary.morning_in ? formatTime(summary.morning_in) : "N/A",
            summary.morning_out ? formatTime(summary.morning_out) : "N/A",
            summary.afternoon_in ? formatTime(summary.afternoon_in) : "N/A",
            summary.afternoon_out ? formatTime(summary.afternoon_out) : "N/A",
            summary.overtime_in ? formatTime(summary.overtime_in) : "N/A",
            summary.overtime_out ? formatTime(summary.overtime_out) : "N/A",
            (summary.regular_hours || 0).toFixed(2),
            (summary.overtime_hours || 0).toFixed(2),
            (summary.total_hours || 0).toFixed(2),
            summary.has_late_entry ? "YES" : "NO",
            summary.is_incomplete ? "YES" : "NO",
            summary.has_overtime ? "YES" : "NO",
          ]);
        });

        const employeeSummarySheet =
          XLSX.utils.aoa_to_sheet(employeeSummaryData);

        // Style the employee summary sheet
        employeeSummarySheet["!cols"] = [
          { wch: 12 }, // Employee ID
          { wch: 25 }, // Employee Name
          { wch: 15 }, // Department
          { wch: 20 }, // Position
          { wch: 12 }, // Date
          { wch: 12 }, // Morning In
          { wch: 12 }, // Morning Out
          { wch: 12 }, // Afternoon In
          { wch: 12 }, // Afternoon Out
          { wch: 12 }, // Overtime In
          { wch: 12 }, // Overtime Out
          { wch: 12 }, // Regular Hours
          { wch: 12 }, // Overtime Hours
          { wch: 12 }, // Total Hours
          { wch: 12 }, // Has Late Entry
          { wch: 12 }, // Is Incomplete
          { wch: 12 }, // Has Overtime
        ];

        XLSX.utils.book_append_sheet(
          workbook,
          employeeSummarySheet,
          "Employee Summary"
        );
      }

      // 4. Time Analysis Sheet - showing patterns by time slots
      const timeAnalysisData = [];
      timeAnalysisData.push(["TIME ANALYSIS REPORT"]);

      // Fix: Use the appropriate date based on filter mode
      const displayDate =
        filters.useRange && filters.startDate && filters.endDate
          ? `${filters.startDate} to ${filters.endDate}`
          : filters.date;

      timeAnalysisData.push([`Date: ${displayDate}`]);
      timeAnalysisData.push([]);

      // Group by hour
      const hourlyBreakdown = {};
      attendanceResult.data.forEach((record) => {
        const hour = new Date(record.clock_time).getHours();
        const timeSlot = `${hour.toString().padStart(2, "0")}:00 - ${(hour + 1)
          .toString()
          .padStart(2, "0")}:00`;
        if (!hourlyBreakdown[timeSlot]) {
          hourlyBreakdown[timeSlot] = {
            morning_in: 0,
            morning_out: 0,
            afternoon_in: 0,
            afternoon_out: 0,
            overtime_in: 0,
            overtime_out: 0,
            total: 0,
          };
        }
        hourlyBreakdown[timeSlot][record.clock_type] =
          (hourlyBreakdown[timeSlot][record.clock_type] || 0) + 1;
        hourlyBreakdown[timeSlot].total++;
      });

      timeAnalysisData.push(["HOURLY BREAKDOWN"]);
      timeAnalysisData.push([
        "Time Slot",
        "Morning In",
        "Morning Out",
        "Afternoon In",
        "Afternoon Out",
        "Overtime In",
        "Overtime Out",
        "Total",
      ]);

      Object.entries(hourlyBreakdown)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([timeSlot, counts]) => {
          timeAnalysisData.push([
            timeSlot,
            counts.morning_in || 0,
            counts.morning_out || 0,
            counts.afternoon_in || 0,
            counts.afternoon_out || 0,
            counts.overtime_in || 0,
            counts.overtime_out || 0,
            counts.total || 0,
          ]);
        });

      const timeAnalysisSheet = XLSX.utils.aoa_to_sheet(timeAnalysisData);
      timeAnalysisSheet["!cols"] = [
        { wch: 15 }, // Time Slot
        { wch: 12 }, // Morning In
        { wch: 12 }, // Morning Out
        { wch: 12 }, // Afternoon In
        { wch: 12 }, // Afternoon Out
        { wch: 12 }, // Overtime In
        { wch: 12 }, // Overtime Out
        { wch: 10 }, // Total
      ];

      XLSX.utils.book_append_sheet(
        workbook,
        timeAnalysisSheet,
        "Time Analysis"
      );

      // Generate filename with appropriate date range
      const filenameDatePart =
        filters.useRange && filters.startDate && filters.endDate
          ? `${filters.startDate}_to_${filters.endDate}`
          : filters.date;

      const fileName = `Attendance_Report_${filenameDatePart}_${new Date().getTime()}.xlsx`;
      XLSX.writeFile(workbook, fileName);
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      alert("Failed to export data. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  // Bulk load all profile pictures as a zip file with deduplication
  const loadBulkProfilePictures = async (uniqueUids) => {
    if (!uniqueUids || uniqueUids.length === 0) return;

    // Filter out UIDs that we already have loaded or are currently loading
    const uidsToLoad = uniqueUids.filter(
      (uid) => uid && !profilePictures[uid] && profilePictures[uid] !== null
    );

    if (uidsToLoad.length === 0) return;

    // Check if there's already a bulk request in progress with the same UIDs
    const requestKey = uidsToLoad.sort().join(",");
    if (currentBulkRequest === requestKey) {
      console.log(
        "Bulk request already in progress for these UIDs, skipping..."
      );
      return;
    }

    // If there's a different bulk request in progress, wait for it to complete
    if (currentBulkRequest) {
      console.log("Another bulk request in progress, waiting...");
      // Wait a bit and try again
      setTimeout(() => loadBulkProfilePictures(uniqueUids), 100);
      return;
    }

    try {
      setCurrentBulkRequest(requestKey);
      setProfileLoadingState("loading");
      console.log(
        `Loading ${uidsToLoad.length} profile pictures in bulk...`,
        uidsToLoad
      );

      // Use POST method for bulk download with specific UIDs
      const result = await apiService.profiles.downloadBulkProfilesPost(
        uidsToLoad,
        {
          include_summary: false, // We don't need summary for this use case
          compression_level: 6,
        }
      );

      if (result.success) {
        // Extract the zip file using JSZip
        const zip = new JSZip();
        const zipContent = await zip.loadAsync(result.blob);
        const newProfilePictures = { ...profilePictures };

        console.log("Zip file contents:", Object.keys(zipContent.files));

        // Process each file in the zip
        for (const [filename, file] of Object.entries(zipContent.files)) {
          if (!file.dir) {
            // Extract UID from the file path
            // Handle both formats: "uid/filename.ext" and "filename.ext"
            let extractedUid = null;

            if (filename.includes("/")) {
              // Format: "uid/filename.ext"
              const pathParts = filename.split("/");
              extractedUid = pathParts[0];
            } else {
              // Try to extract UID from filename if it starts with the UID
              // Format might be "uid_filename.ext" or just "uid.ext"
              const filenameParts = filename.split("_")[0].split(".")[0];
              extractedUid = filenameParts;
            }

            // Convert to number if it's a numeric string to match employee_uid format
            const numericUid = !isNaN(extractedUid)
              ? Number(extractedUid)
              : extractedUid;

            console.log(
              `Processing file: ${filename}, extracted UID: ${extractedUid}, numeric UID: ${numericUid}`
            );

            // Check if this UID matches any of the UIDs we requested
            const matchingUid = uidsToLoad.find(
              (uid) =>
                uid == extractedUid ||
                uid == numericUid ||
                String(uid) === String(extractedUid) ||
                String(uid) === String(numericUid)
            );

            if (matchingUid) {
              try {
                // Get the file as a blob
                const fileBlob = await file.async("blob");

                // Create object URL for the image
                const imageUrl = URL.createObjectURL(fileBlob);

                // Store using the original UID format from our data
                newProfilePictures[matchingUid] = imageUrl;
                console.log(
                  `Successfully loaded profile picture for UID: ${matchingUid} from file: ${filename}`
                );
              } catch (fileError) {
                console.warn(`Failed to process file ${filename}:`, fileError);
                newProfilePictures[matchingUid] = null;
              }
            } else {
              console.log(
                `No matching UID found for file: ${filename} (extracted: ${extractedUid})`
              );
            }
          }
        }

        // Mark UIDs that weren't found in the zip as null (no profile available)
        uidsToLoad.forEach((uid) => {
          if (!newProfilePictures.hasOwnProperty(uid)) {
            newProfilePictures[uid] = null;
            console.log(`No profile picture found for UID: ${uid}`);
          }
        });

        setProfilePictures(newProfilePictures);
        setProfileLoadingState("loaded");

        const loadedCount = uidsToLoad.filter(
          (uid) => newProfilePictures[uid] && newProfilePictures[uid] !== null
        ).length;
        console.log(
          `Successfully loaded ${loadedCount} out of ${uidsToLoad.length} requested profile pictures`
        );
      } else {
        console.error("Failed to download bulk profiles:", result.error);
        // Mark all requested UIDs as null (failed to load)
        const updatedProfiles = { ...profilePictures };
        uidsToLoad.forEach((uid) => {
          updatedProfiles[uid] = null;
        });
        setProfilePictures(updatedProfiles);
        setProfileLoadingState("error");
      }
    } catch (error) {
      console.error("Bulk profile loading error:", error);
      // Mark all requested UIDs as null (failed to load)
      const updatedProfiles = { ...profilePictures };
      uidsToLoad.forEach((uid) => {
        updatedProfiles[uid] = null;
      });
      setProfilePictures(updatedProfiles);
      setProfileLoadingState("error");
    } finally {
      setCurrentBulkRequest(null);
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
    fetchAttendanceData();
    fetchAttendanceStats();

    setConnectionStatus("connecting");

    const unsubscribeAttendanceCreated = apiService.socket.subscribeToUpdates(
      "attendance_created",
      (data) => {
        console.log("[Attendance] New attendance record:", data);
        setConnectionStatus("connected");
        setLastUpdate(new Date());

        if (!filters.date || data.date === filters.date) {
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

              // Load profile picture for new record individually (real-time update)
              if (data.employee_uid) {
                loadNewProfilePicture(data.employee_uid);
              }

              return [data, ...prev.slice(0, filters.limit - 1)];
            }
            return prev;
          });
        }
        fetchAttendanceStats();
      }
    );

    const unsubscribeAttendanceUpdated = apiService.socket.subscribeToUpdates(
      "attendance_updated",
      (data) => {
        console.log("[Attendance] Attendance record updated:", data);
        setConnectionStatus("connected");
        setLastUpdate(new Date());

        setAttendanceData((prev) =>
          prev.map((record) =>
            record.id === data.id ? { ...record, ...data } : record
          )
        );
        fetchAttendanceStats();
      }
    );

    const unsubscribeAttendanceDeleted = apiService.socket.subscribeToUpdates(
      "attendance_deleted",
      (data) => {
        console.log("[Attendance] Attendance record deleted:", data);
        setConnectionStatus("connected");
        setLastUpdate(new Date());

        setAttendanceData((prev) =>
          prev.filter((record) => record.id !== data.id)
        );
        fetchAttendanceStats();
      }
    );

    const unsubscribeAttendanceSynced = apiService.socket.subscribeToUpdates(
      "attendance_synced",
      (data) => {
        console.log("[Attendance] Attendance records synced:", data);
        setConnectionStatus("connected");
        setLastUpdate(new Date());

        fetchAttendanceData();
        fetchAttendanceStats();
      }
    );

    const unsubscribeEmployeeUpdated = apiService.socket.subscribeToUpdates(
      "employee_updated",
      (data) => {
        console.log(
          "[Attendance] Employee updated, refreshing attendance data"
        );
        setConnectionStatus("connected");
        setLastUpdate(new Date());

        fetchAttendanceData();
      }
    );

    setTimeout(() => {
      if (connectionStatus === "connecting") {
        setConnectionStatus("connected");
      }
    }, 2000);

    return () => {
      unsubscribeAttendanceCreated();
      unsubscribeAttendanceUpdated();
      unsubscribeAttendanceDeleted();
      unsubscribeAttendanceSynced();
      unsubscribeEmployeeUpdated();
      setConnectionStatus("disconnected");

      // Clean up profile picture URLs to prevent memory leaks
      Object.values(profilePictures).forEach((url) => {
        if (url && url.startsWith("blob:")) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [filters]);

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

      const result = await apiService.attendance.getAttendanceRecords(params);

      if (result.success) {
        setAttendanceData(result.data);
        setError(null);

        // Load profile pictures in bulk for the fetched records
        const uniqueUids = getUniqueUids(result.data);
        if (uniqueUids.length > 0) {
          await loadBulkProfilePictures(uniqueUids);
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

        // Load profile pictures in bulk for recent activity
        if (result.data.recent_activity) {
          const uniqueUids = getUniqueUids(result.data.recent_activity);
          if (uniqueUids.length > 0) {
            await loadBulkProfilePictures(uniqueUids);
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
      const time = new Date(timeString);
      return time.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return timeString;
    }
  };

  const formatEmployeeName = (employeeInfo) => {
    const parts = [
      employeeInfo.first_name,
      employeeInfo.middle_name,
      employeeInfo.last_name,
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
        <div
          className={`${size} rounded-2xl bg-gradient-to-br from-slate-200 via-slate-300 to-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 flex items-center justify-center ring-4 ring-white/50 dark:ring-gray-700/50 shadow-lg animate-pulse`}
        >
          <div className="w-6 h-6 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
        </div>
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
            className={`${size} rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg ring-4 ring-white/50 dark:ring-gray-700/50 shadow-lg`}
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
        className={`${size} rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg ring-4 ring-white/50 dark:ring-gray-700/50 shadow-lg`}
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
          <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 p-6 rounded-t-3xl">
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
                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-2xl p-6">
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

                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-2xl p-6">
                      <div className="text-center">
                        <div className="text-3xl mb-2">⏰</div>
                        <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                          {(employeeStats.total_regular_hours || 0).toFixed(1)}h
                        </div>
                        <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
                          Regular Hours
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-2xl p-6">
                      <div className="text-center">
                        <div className="text-3xl mb-2">🌙</div>
                        <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                          {(employeeStats.total_overtime_hours || 0).toFixed(1)}
                          h
                        </div>
                        <div className="text-sm font-medium text-orange-600 dark:text-orange-400">
                          Overtime Hours
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-2xl p-6">
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
                                `${name}: ${value.toFixed(1)}h`
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
                                value.toFixed(1) + "h",
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
                                  ${
                                    isLate
                                      ? "border-red-400"
                                      : isIncomplete
                                      ? "border-amber-400"
                                      : "border-transparent"
                                  }
                                  ${
                                    intensity > 0.8
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
                                title={`${record.date}: ${record.total_hours}h${
                                  isLate ? " (Late)" : ""
                                }${isIncomplete ? " (Incomplete)" : ""}`}
                              >
                                {record.total_hours.toFixed(0)}
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
                                    {avgHours.toFixed(1)}h avg
                                  </div>
                                  {latePercentage > 0 && (
                                    <div className="text-xs text-red-600 dark:text-red-400">
                                      {latePercentage.toFixed(0)}% late
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
                              className={`text-lg font-bold ${
                                trend >= 0 ? "text-emerald-600" : "text-red-600"
                              }`}
                            >
                              {trend >= 0 ? "↗️" : "↘️"}{" "}
                              {Math.abs(trendPercentage).toFixed(1)}%
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
                              className={`text-lg font-bold ${
                                recentLateCount <= olderLateCount
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
                              {mostProductiveDay.total_hours?.toFixed(1) || 0}h
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
                                {attendanceRate.toFixed(0)}%
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
                                {punctualityRate.toFixed(0)}%
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
                                {(employeeStats.grand_total_hours || 0).toFixed(
                                  0
                                )}
                                h
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
                              <td className="p-4 font-medium text-slate-800 dark:text-slate-200">
                                {new Date(record.date).toLocaleDateString()}
                              </td>
                              <td className="p-4 text-slate-700 dark:text-slate-300">
                                {(record.regular_hours || 0).toFixed(1)}h
                              </td>
                              <td className="p-4 text-slate-700 dark:text-slate-300">
                                {(record.overtime_hours || 0).toFixed(1)}h
                              </td>
                              <td className="p-4 font-semibold text-slate-800 dark:text-slate-200">
                                {(record.total_hours || 0).toFixed(1)}h
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
                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl p-6 border border-indigo-200 dark:border-indigo-800/30">
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
                              {(employeeStats.avg_daily_hours || 0).toFixed(1)}h
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
                                  ).toFixed(1)
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

  // Group the attendance data
  const groupedAttendance = groupAttendanceByEmployee(attendanceData);

  return (
    <div className="space-y-8">
      {/* Employee Details Modal */}
      <EmployeeDetailsModal />

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
            Attendance Management
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg mt-2">
            Track employee attendance and working hours in real-time
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Export Button with Tooltip */}
          <div className="relative group">
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-4 py-2 bg-slate-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
              <div className="text-center">
                <div className="font-semibold">Export includes:</div>
                <div>
                  Summary, Detailed Records, Employee Summary, Time Analysis
                </div>
              </div>
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800"></div>
            </div>
          </div>

          {/* Profile Loading Indicator */}
          {profileLoadingState === "loading" && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 backdrop-blur-sm rounded-xl border border-blue-200/30 dark:border-blue-800/30">
              <div className="w-3 h-3 border border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                Loading profiles...
              </span>
            </div>
          )}

          {/* Connection Status */}
          <div className="flex items-center gap-3 px-4 py-2 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl border border-white/30 dark:border-gray-700/30">
            <div
              className={`w-3 h-3 rounded-full ${
                connectionStatus === "connected"
                  ? "bg-emerald-500 shadow-lg shadow-emerald-500/50"
                  : connectionStatus === "connecting"
                  ? "bg-amber-500 animate-pulse shadow-lg shadow-amber-500/50"
                  : "bg-red-500 shadow-lg shadow-red-500/50"
              }`}
            ></div>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {connectionStatus === "connected"
                ? "Live Updates"
                : connectionStatus === "connecting"
                ? "Connecting..."
                : "Disconnected"}
            </span>
            {lastUpdate && (
              <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
                {lastUpdate.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && attendanceData.length === 0 && (
        <div className="text-center py-16">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-200 dark:border-slate-700 mx-auto"></div>
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-transparent border-t-slate-600 dark:border-t-slate-400 absolute top-0 left-1/2 transform -translate-x-1/2"></div>
          </div>
          <p className="text-slate-600 dark:text-slate-400 mt-6 text-lg">
            Loading attendance data...
          </p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 backdrop-blur-sm border border-red-200 dark:border-red-800/50 rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">❌</span>
            <div>
              <h3 className="text-red-800 dark:text-red-300 font-semibold">
                Error Loading Data
              </h3>
              <p className="text-red-600 dark:text-red-400 mt-1">{error}</p>
              <button
                onClick={fetchAttendanceData}
                className="mt-3 px-4 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-800 dark:hover:bg-red-700 text-red-700 dark:text-red-300 rounded-lg font-medium transition-colors"
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
          <div className="group bg-gradient-to-br from-white/80 to-white/60 dark:from-slate-800/80 dark:to-slate-900/60 backdrop-blur-xl rounded-3xl p-6 border border-white/40 dark:border-slate-700/40 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                <span className="text-2xl">📊</span>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-slate-800 dark:text-slate-200">
                  {stats.total_records || 0}
                </p>
                <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">
                  Total Records
                </p>
              </div>
            </div>
            <p className="text-slate-500 dark:text-slate-500 text-sm">
              Today ({filters.date})
            </p>
          </div>

          <div className="group bg-gradient-to-br from-emerald-50/80 to-emerald-100/60 dark:from-emerald-900/20 dark:to-emerald-800/20 backdrop-blur-xl rounded-3xl p-6 border border-emerald-200/40 dark:border-emerald-800/40 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl">
                <span className="text-2xl">👥</span>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">
                  {stats.unique_employees || 0}
                </p>
                <p className="text-emerald-600 dark:text-emerald-400 text-sm font-medium">
                  Active Employees
                </p>
              </div>
            </div>
            <p className="text-emerald-500 dark:text-emerald-500 text-sm">
              Clocked in today
            </p>
          </div>

          <div className="group bg-gradient-to-br from-orange-50/80 to-orange-100/60 dark:from-orange-900/20 dark:to-orange-800/20 backdrop-blur-xl rounded-3xl p-6 border border-orange-200/40 dark:border-orange-800/40 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-2xl">
                <span className="text-2xl">⏱️</span>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-orange-700 dark:text-orange-300">
                  {(stats.total_regular_hours || 0).toFixed(1)}h
                </p>
                <p className="text-orange-600 dark:text-orange-400 text-sm font-medium">
                  Regular Hours
                </p>
              </div>
            </div>
            <p className="text-orange-500 dark:text-orange-500 text-sm">
              Total for today
            </p>
          </div>

          <div className="group bg-gradient-to-br from-red-50/80 to-red-100/60 dark:from-red-900/20 dark:to-red-800/20 backdrop-blur-xl rounded-3xl p-6 border border-red-200/40 dark:border-red-800/40 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-2xl">
                <span className="text-2xl">⚠️</span>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-red-700 dark:text-red-300">
                  {stats.late_count || 0}
                </p>
                <p className="text-red-600 dark:text-red-400 text-sm font-medium">
                  Late Arrivals
                </p>
              </div>
            </div>
            <p className="text-red-500 dark:text-red-500 text-sm">Today</p>
          </div>
        </div>
      )}

      {/* Additional Stats Row */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-blue-50/80 to-blue-100/60 dark:from-blue-900/20 dark:to-blue-800/20 backdrop-blur-xl rounded-2xl p-6 border border-blue-200/40 dark:border-blue-800/40">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <span className="text-xl">📥</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                  {stats.clock_ins || 0}
                </p>
                <p className="text-blue-600 dark:text-blue-400 text-sm font-medium">
                  Clock Ins
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50/80 to-purple-100/60 dark:from-purple-900/20 dark:to-purple-800/20 backdrop-blur-xl rounded-2xl p-6 border border-purple-200/40 dark:border-purple-800/40">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                <span className="text-xl">📤</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                  {stats.clock_outs || 0}
                </p>
                <p className="text-purple-600 dark:text-purple-400 text-sm font-medium">
                  Clock Outs
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-50/80 to-yellow-100/60 dark:from-yellow-900/20 dark:to-yellow-800/20 backdrop-blur-xl rounded-2xl p-6 border border-yellow-200/40 dark:border-yellow-800/40">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl">
                <span className="text-xl">🌙</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                  {(stats.total_overtime_hours || 0).toFixed(1)}h
                </p>
                <p className="text-yellow-600 dark:text-yellow-400 text-sm font-medium">
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
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-3xl p-8 border border-white/40 dark:border-gray-700/40 shadow-2xl">
          {/* Header with Filters and Export */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <span className="text-xl">🔍</span>
              </div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                Filters
              </h2>
            </div>
            <button
              onClick={exportToExcel}
              disabled={isExporting}
              className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 disabled:from-slate-400 disabled:to-slate-500 text-white rounded-xl font-semibold transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl disabled:hover:translate-y-0 disabled:hover:shadow-none disabled:cursor-not-allowed"
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
                className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 dark:focus:ring-indigo-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Use date range instead of single date
              </span>
            </label>
          </div>

          {/* Date Inputs */}
          <div
            className={`grid gap-6 ${
              filters.useRange ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
            }`}
          >
            {filters.useRange ? (
              <>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
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
                    className="w-full px-4 py-3 bg-white/60 dark:bg-gray-700/60 rounded-xl border border-white/40 dark:border-gray-600/40 text-slate-800 dark:text-slate-200 backdrop-blur-sm focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
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
                    className="w-full px-4 py-3 bg-white/60 dark:bg-gray-700/60 rounded-xl border border-white/40 dark:border-gray-600/40 text-slate-800 dark:text-slate-200 backdrop-blur-sm focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={filters.date}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, date: e.target.value }))
                  }
                  className="w-full px-4 py-3 bg-white/60 dark:bg-gray-700/60 rounded-xl border border-white/40 dark:border-gray-600/40 text-slate-800 dark:text-slate-200 backdrop-blur-sm focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
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
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-lg mb-4">
                  <p className="text-sm text-red-600 dark:text-red-400">
                    ⚠️ Start date cannot be later than end date.
                  </p>
                </div>
              )}

            {filters.useRange &&
              filters.startDate &&
              filters.endDate &&
              new Date(filters.startDate) <= new Date(filters.endDate) && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 rounded-lg">
                  <p className="text-sm text-blue-600 dark:text-blue-400">
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
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-3xl p-8 border border-white/40 dark:border-gray-700/40 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-xl">
              <span className="text-xl">⚙️</span>
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">
              Display Options & Actions
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            {/* Clock Type Filter */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
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
                className="w-full px-4 py-3 bg-white/60 dark:bg-gray-700/60 rounded-xl border border-white/40 dark:border-gray-600/40 text-slate-800 dark:text-slate-200 backdrop-blur-sm focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
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
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
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
                className="w-full px-4 py-3 bg-white/60 dark:bg-gray-700/60 rounded-xl border border-white/40 dark:border-gray-600/40 text-slate-800 dark:text-slate-200 backdrop-blur-sm focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
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
                className="w-full px-6 py-3 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white rounded-xl font-semibold transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl"
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
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <span className="text-xl">👤</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
              Employee Attendance
            </h2>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Click on any card to view detailed statistics
            </div>
          </div>

          {groupedAttendance.length === 0 ? (
            <div className="text-center py-16 bg-white/40 dark:bg-gray-800/40 backdrop-blur-xl rounded-3xl border border-white/40 dark:border-gray-700/40">
              <div className="text-6xl mb-4">📭</div>
              <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">
                No Records Found
              </h3>
              <p className="text-slate-500 dark:text-slate-400">
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
                    key={`${employee.employee_uid}-${employee.date}-${index}`}
                    onClick={() =>
                      loadEmployeeDetails(
                        employee.employee_uid,
                        employee.employee_info
                      )
                    }
                    className={`group relative overflow-hidden rounded-3xl border transition-all duration-500 transform hover:-translate-y-2 hover:shadow-2xl cursor-pointer ${
                      hasNewRecords
                        ? "bg-gradient-to-br from-emerald-50/90 to-emerald-100/70 dark:from-emerald-900/30 dark:to-emerald-800/20 border-emerald-300/60 dark:border-emerald-700/60 shadow-2xl animate-pulse shadow-emerald-500/20"
                        : "bg-gradient-to-br from-white/80 to-white/60 dark:from-slate-800/80 dark:to-slate-900/60 border-white/40 dark:border-slate-700/40 hover:shadow-xl backdrop-blur-xl hover:border-indigo-300/60 dark:hover:border-indigo-700/60"
                    }`}
                  >
                    {/* New Record Indicator */}
                    {hasNewRecords && (
                      <div className="absolute top-4 right-4 px-3 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full animate-bounce">
                        NEW
                      </div>
                    )}

                    {/* Click to View Details Indicator */}
                    <div className="absolute top-4 right-4 px-3 py-1 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-medium rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      Click for details
                    </div>

                    <div className="p-6">
                      {/* Header Section */}
                      <div className="flex items-start gap-4 mb-6">
                        <div className="flex-shrink-0">
                          <ProfilePicture
                            uid={employee.employee_uid}
                            name={employeeName}
                            size="w-16 h-16"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 truncate">
                              {employeeName}
                            </h3>
                            {employee.is_late ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800/30">
                                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                                Late
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800/30">
                                <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                                On Time
                              </span>
                            )}
                            {employee.has_unsynced && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800/30">
                                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>
                                Unsynced
                              </span>
                            )}
                          </div>

                          <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
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
                      <div className="bg-white/50 dark:bg-slate-700/30 backdrop-blur-sm rounded-2xl p-4 mb-4">
                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
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
                        <div className="bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-sm rounded-xl p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">⏰</span>
                            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                              Regular Hours
                            </span>
                          </div>
                          <p className="text-xl font-bold text-slate-800 dark:text-slate-200">
                            {employee.total_regular_hours.toFixed(1)}h
                          </p>
                        </div>

                        <div className="bg-orange-50/50 dark:bg-orange-900/20 backdrop-blur-sm rounded-xl p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">🌙</span>
                            <span className="text-sm font-medium text-orange-600 dark:text-orange-400">
                              Overtime Hours
                            </span>
                          </div>
                          <p className="text-xl font-bold text-orange-700 dark:text-orange-300">
                            {employee.total_overtime_hours.toFixed(1)}h
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Hover Effect Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>

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
      {recentActivity.length > 0 && (
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-3xl p-8 border border-white/40 dark:border-gray-700/40 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <span className="text-xl">🔄</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
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
                  className="group bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm rounded-2xl p-4 border border-white/40 dark:border-slate-600/40 hover:bg-white/80 dark:hover:bg-slate-700/80 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg cursor-pointer hover:border-indigo-300/60 dark:hover:border-indigo-700/60"
                >
                  <div className="flex items-center gap-3">
                    <ProfilePicture
                      uid={activity.employee_uid}
                      name={activityName}
                      size="w-12 h-12"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {activityName}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm">
                          {getClockTypeIcon(activity.clock_type)}
                        </span>
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {formatClockType(activity.clock_type)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
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
        <div className="bg-gradient-to-r from-amber-50/90 to-orange-50/90 dark:from-amber-900/20 dark:to-orange-900/20 backdrop-blur-xl border border-amber-200/60 dark:border-amber-700/60 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
              <span className="text-2xl">⚠️</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-300">
                Attention Required
              </h3>
              <p className="text-amber-700 dark:text-amber-400">
                There are{" "}
                <span className="font-bold">{stats.unsynced_count}</span>{" "}
                unsynced attendance records that need attention.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Attendance;
