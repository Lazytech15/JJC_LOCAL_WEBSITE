import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { X, Eye, Download, FileText, ImageIcon, Trash2, Search, Loader2, Lock } from "lucide-react";
import apiService from "../../utils/api/api-service";
import { getStoredToken } from "../../utils/auth";

function EmployeeRecords() {
  const { user, isDarkMode } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [error, setError] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [statistics, setStatistics] = useState({});
  const [departments, setDepartments] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0,
    currentPage: 1,
    limit: 20,
  });

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDocumentViewerOpen, setIsDocumentViewerOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [deleteEmployee, setDeleteEmployee] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // File upload states - support multiple documents
  const [selectedProfileFile, setSelectedProfileFile] = useState(null);
  const [selectedDocumentFiles, setSelectedDocumentFiles] = useState([]);
  const [profilePreview, setProfilePreview] = useState(null);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  // Document viewer states
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [currentDocumentIndex, setCurrentDocumentIndex] = useState(0);
  const [documentPreviewUrl, setDocumentPreviewUrl] = useState(null);

  // Employee documents data
  const [employeeDocuments, setEmployeeDocuments] = useState([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);

  // Profile picture cache - use id as key
  const [profilePictures, setProfilePictures] = useState(new Map());

  // Filters
  const [filterDepartment, setFilterDepartment] = useState("");
  const [filterStatus, setFilterStatus] = useState("Active");
  const [sortBy, setSortBy] = useState("hireDate");
  const [sortOrder, setSortOrder] = useState("DESC");

  // New states for autocomplete
  const [searchTerm, setSearchTerm] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const searchRef = useRef(null);
  const suggestionsRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true); // Only for first load
  const [searchLoading, setSearchLoading] = useState(false); // For search/filter changes

  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  // Debounce timer ref
  const debounceTimer = useRef(null);
  const searchAbortController = useRef(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Debounced search function
  const debouncedSearch = useCallback((value) => {
    // Clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Cancel previous search request
    if (searchAbortController.current) {
      searchAbortController.current.abort();
    }

    // If empty, clear suggestions
    if (!value.trim()) {
      setSearchSuggestions([]);
      setShowSuggestions(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    // Set new timer
    debounceTimer.current = setTimeout(async () => {
      try {
        // Create new abort controller for this request
        searchAbortController.current = new AbortController();

        // Fetch suggestions
        const params = {
          search: value,
          limit: "10", // Limit suggestions to 10
          offset: "0",
          sortBy: "last_name",
          sortOrder: "ASC",
        };

        console.log("[EmployeeRecords] Fetching search suggestions:", value);

        const result = await apiService.employees.getEmployees(params, {
          signal: searchAbortController.current.signal,
        });

        if (result.success) {
          const suggestions = result.employees || [];
          setSearchSuggestions(suggestions);
          setShowSuggestions(suggestions.length > 0);
          console.log(`[EmployeeRecords] Found ${suggestions.length} suggestions`);
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error("Error fetching suggestions:", err);
        }
      } finally {
        setIsSearching(false);
      }
    }, 300); // 300ms delay
  }, []);

  // Handle search input change
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setSelectedSuggestionIndex(-1);
    debouncedSearch(value);
  };

  // Handle suggestion selection
  const handleSuggestionClick = (employee) => {
    setSearchTerm(employee.fullName);
    setSelectedEmployee(employee);
    setShowSuggestions(false);
    setSearchSuggestions([]);

    // Scroll to employee details
    const detailsSection = document.getElementById('employee-details');
    if (detailsSection) {
      detailsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Handle keyboard navigation
  const handleSearchKeyDown = (e) => {
    if (!showSuggestions || searchSuggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex((prev) =>
          prev < searchSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0) {
          handleSuggestionClick(searchSuggestions[selectedSuggestionIndex]);
        } else {
          // Perform full search
          setShowSuggestions(false);
          setPagination((prev) => ({ ...prev, currentPage: 1 }));
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        break;
      default:
        break;
    }
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchTerm("");
    setSearchSuggestions([]);
    setShowSuggestions(false);
    setIsSearching(false);
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    if (searchAbortController.current) {
      searchAbortController.current.abort();
    }
  };

  // Highlight matching text in suggestions
  const highlightMatch = (text, query) => {
    if (!query.trim()) return text;

    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <span>
        {parts.map((part, index) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark
              key={index}
              className="bg-yellow-200 dark:bg-yellow-600 font-semibold"
            >
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  // Load employee documents when selected employee changes
  useEffect(() => {
    if (selectedEmployee?.id) {
      fetchEmployeeDocuments(selectedEmployee.id);
    } else {
      setEmployeeDocuments([]);
    }
  }, [selectedEmployee]);

  // Clear caches on component unmount
  useEffect(() => {
    return () => {
      // No need to revoke URLs anymore since we're using direct URLs with service worker caching
      profilePictures.clear();
    };
  }, []);

  const loadProfilePicturesIndividually = async (employeeList = employees) => {
    if (!employeeList || employeeList.length === 0) return;

    try {
      const employeesToLoad = employeeList.filter(employee =>
        employee.id && !profilePictures.has(employee.id)
      );

      if (employeesToLoad.length === 0) return;

      console.log(`[EmployeeRecords] Loading ${employeesToLoad.length} profile pictures individually`);

      // Load each profile picture independently
      employeesToLoad.forEach((employee) => {
        (async () => {
          try {
            // Construct the profile URL directly
            const profileUrl = apiService.profiles.getProfileUrlByUid(employee.id);

            // Test if the image exists by fetching it
            const response = await fetch(profileUrl, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${getStoredToken()}`
              }
            });

            if (response.ok) {
              // Store the URL directly (service worker will cache it)
              setProfilePictures(prev => new Map(prev).set(employee.id, profileUrl));
              console.log(`[EmployeeRecords] ✓ Profile available for ID: ${employee.id}`);
            } else {
              console.log(`[EmployeeRecords] ✗ No profile for ID: ${employee.id}`);
            }
          } catch (err) {
            console.log(`[EmployeeRecords] ✗ Error loading profile for ID ${employee.id}:`, err.message);
          }
        })();
      });

    } catch (err) {
      console.error(`[EmployeeRecords] Profile loading error: ${err.message}`);
    }
  };


  const fetchEmployeeDocuments = async (employeeId) => {
    if (!employeeId) {
      console.error("[EmployeeRecords] No employeeId provided for document fetch");
      setEmployeeDocuments([]);
      return;
    }

    try {
      setLoadingDocuments(true);
      setError(null); // Clear any previous errors

      console.log(`[EmployeeRecords] Fetching documents for employee ID: ${employeeId}`);

      const result = await apiService.document.getEmployeeDocuments(employeeId);

      console.log(`[EmployeeRecords] Document fetch result:`, result);

      if (result.success) {
        // Handle different response structures
        let documents = [];

        if (result.data && Array.isArray(result.data.documents)) {
          documents = result.data.documents;
        } else if (result.data && result.data.data && Array.isArray(result.data.data.documents)) {
          documents = result.data.data.documents;
        } else if (result.documents && Array.isArray(result.documents)) {
          documents = result.documents;
        } else {
          console.warn("[EmployeeRecords] Unexpected response structure:", result);
          documents = [];
        }

        setEmployeeDocuments(documents);
        console.log(`[EmployeeRecords] Loaded ${documents.length} documents for employee ID: ${employeeId}`);

        if (documents.length === 0) {
          console.log("[EmployeeRecords] No documents found for this employee");
        }
      } else {
        console.error("[EmployeeRecords] Failed to fetch employee documents:", result.error);
        setEmployeeDocuments([]);

        // Don't show error if it's just "no documents found"
        if (result.error && !result.error.toLowerCase().includes('not found')) {
          setError(`Failed to load documents: ${result.error}`);
        }
      }
    } catch (err) {
      console.error("[EmployeeRecords] Error fetching employee documents:", err);
      setEmployeeDocuments([]);

      // Don't show error for 404s (no documents)
      if (err.message && !err.message.includes('404')) {
        setError(`Failed to load documents: ${err.message}`);
      }
    } finally {
      setLoadingDocuments(false);
    }
  };

  const getProfilePictureUrl = (employee) => {
    if (!employee?.id) return null;

    // Check if we have the URL in our state
    if (profilePictures.has(employee.id)) {
      return profilePictures.get(employee.id);
    }

    return null;
  };

  const getDocumentUrl = (employeeId, filename) => {
    if (!employeeId || !filename) {
      console.error("[EmployeeRecords] Missing employeeId or filename for document URL");
      return null;
    }

    const baseURL = apiService.document.baseURL || window.location.origin;
    const token = getStoredToken();

    // Include token in URL for documents that need authentication
    const url = `${baseURL}/api/document/${employeeId}/${filename}`;
    console.log(`[EmployeeRecords] Document URL generated:`, url);

    return url;
  };

  // Get file icon based on file type
  const getFileIcon = (filename) => {
    if (!filename) return <FileText className="w-4 h-4" />;

    const ext = filename.split(".").pop()?.toLowerCase();

    if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) {
      return <ImageIcon className="w-4 h-4" />;
    } else if (["pdf"].includes(ext)) {
      return <FileText className="w-4 h-4 text-red-500" />;
    } else if (["doc", "docx"].includes(ext)) {
      return <FileText className="w-4 h-4 text-blue-500" />;
    } else if (["xls", "xlsx"].includes(ext)) {
      return <FileText className="w-4 h-4 text-green-500" />;
    } else if (["ppt", "pptx"].includes(ext)) {
      return <FileText className="w-4 h-4 text-orange-500" />;
    }

    return <FileText className="w-4 h-4" />;
  };

  // Open document viewer
  const openDocumentViewer = () => {
    if (!employeeDocuments || employeeDocuments.length === 0) {
      console.log("[EmployeeRecords] No documents to view");
      setError("No documents available to view");
      return;
    }

    if (!selectedEmployee?.id) {
      console.error("[EmployeeRecords] No employee selected");
      setError("No employee selected");
      return;
    }

    console.log(`[EmployeeRecords] Opening document viewer with ${employeeDocuments.length} documents`);

    setSelectedDocuments(employeeDocuments);
    setCurrentDocumentIndex(0);
    setIsDocumentViewerOpen(true);

    // Set preview URL for first document
    const firstDoc = employeeDocuments[0];
    const previewUrl = getDocumentPreviewUrl(selectedEmployee.id, firstDoc.filename);

    console.log("[EmployeeRecords] First document preview URL:", previewUrl);
    setDocumentPreviewUrl(previewUrl);
  };

  // Navigate documents in viewer
  const navigateDocument = (direction) => {
    if (!selectedDocuments || selectedDocuments.length === 0) {
      console.error("[EmployeeRecords] No documents to navigate");
      return;
    }

    const newIndex = direction === "next"
      ? Math.min(currentDocumentIndex + 1, selectedDocuments.length - 1)
      : Math.max(currentDocumentIndex - 1, 0);

    console.log(`[EmployeeRecords] Navigating to document index ${newIndex}`);

    setCurrentDocumentIndex(newIndex);

    const newDoc = selectedDocuments[newIndex];
    const previewUrl = getDocumentPreviewUrl(selectedEmployee.id, newDoc.filename);

    console.log("[EmployeeRecords] New document preview URL:", previewUrl);
    setDocumentPreviewUrl(previewUrl);
  };
  const downloadDocument = async (document) => {
    if (!document || !document.filename) {
      setError("Invalid document data");
      return;
    }

    if (!selectedEmployee?.id) {
      setError("No employee selected");
      return;
    }

    try {
      console.log("[EmployeeRecords] Downloading document:", {
        employeeId: selectedEmployee.id,
        filename: document.filename,
        originalName: document.originalName
      });

      setLoadingDocuments(true);

      // Method 1: Using the document service
      try {
        const blob = await apiService.document.downloadDocument(
          selectedEmployee.id,
          document.filename
        );

        const downloadFilename = document.originalName || document.filename;
        apiService.document.downloadBlob(blob, downloadFilename);

        console.log("[EmployeeRecords] Document downloaded successfully:", downloadFilename);
        return;
      } catch (serviceError) {
        console.warn("[EmployeeRecords] Service download failed, trying direct method:", serviceError);

        // Method 2: Direct fetch as fallback
        const token = getStoredToken();
        const baseURL = apiService.document.baseURL || window.location.origin;
        const url = `${baseURL}/api/document/${selectedEmployee.id}/${document.filename}/download`;

        console.log("[EmployeeRecords] Attempting direct download from:", url);

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error(`Download failed: HTTP ${response.status}`);
        }

        const blob = await response.blob();
        const downloadFilename = document.originalName || document.filename;

        // Create download link
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = downloadFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(downloadUrl);

        console.log("[EmployeeRecords] Document downloaded successfully via direct method");
      }

    } catch (err) {
      console.error("[EmployeeRecords] Download error:", err);
      setError(`Failed to download document: ${err.message}`);
    } finally {
      setLoadingDocuments(false);
    }
  };

  const deleteDocument = async (document) => {
    if (!document || !document.filename) {
      setError("Invalid document data");
      return;
    }

    if (!selectedEmployee?.id) {
      setError("No employee selected");
      return;
    }

    // Confirm deletion
    if (!window.confirm(`Are you sure you want to delete "${document.originalName || document.filename}"?`)) {
      return;
    }

    try {
      console.log("[EmployeeRecords] Deleting document:", {
        employeeId: selectedEmployee.id,
        filename: document.filename
      });

      setLoadingDocuments(true);

      await apiService.document.deleteDocument(
        selectedEmployee.id,
        document.filename
      );

      console.log("[EmployeeRecords] Document deleted successfully");

      // Refresh the documents list
      await fetchEmployeeDocuments(selectedEmployee.id);

      // Handle document viewer state
      if (isDocumentViewerOpen) {
        const remainingDocs = employeeDocuments.filter(
          doc => doc.filename !== document.filename
        );

        if (remainingDocs.length === 0) {
          // No more documents, close viewer
          console.log("[EmployeeRecords] No more documents, closing viewer");
          setIsDocumentViewerOpen(false);
          setSelectedDocuments([]);
          setCurrentDocumentIndex(0);
          setDocumentPreviewUrl(null);
        } else {
          // Navigate to next document or previous if at the end
          const newIndex = Math.min(currentDocumentIndex, remainingDocs.length - 1);
          console.log(`[EmployeeRecords] Navigating to document index ${newIndex} after deletion`);

          setSelectedDocuments(remainingDocs);
          setCurrentDocumentIndex(newIndex);

          const newDoc = remainingDocs[newIndex];
          const previewUrl = getDocumentPreviewUrl(selectedEmployee.id, newDoc.filename);
          setDocumentPreviewUrl(previewUrl);
        }
      }

    } catch (err) {
      console.error("[EmployeeRecords] Document deletion error:", err);
      setError(`Failed to delete document: ${err.message}`);
    } finally {
      setLoadingDocuments(false);
    }
  };

  // Initial load only
  useEffect(() => {
    fetchEmployees(true); // Pass true for initial load

    const unsubscribeUpdated = apiService.socket.subscribeToUpdates(
      "employee_updated",
      (data) => {
        console.log("[EmployeeRecords] Employee updated:", data);
        fetchEmployees(false);
      }
    );

    const unsubscribeCreated = apiService.socket.subscribeToUpdates(
      "employee_created",
      (data) => {
        console.log("[EmployeeRecords] Employee created:", data);
        fetchEmployees(false);
      }
    );

    const unsubscribeDeleted = apiService.socket.subscribeToUpdates(
      "employee_deleted",
      (data) => {
        console.log("[EmployeeRecords] Employee deleted:", data);
        fetchEmployees(false);
        if (selectedEmployee?.id === data.id) {
          setSelectedEmployee(null);
        }
      }
    );

    return () => {
      unsubscribeUpdated();
      unsubscribeCreated();
      unsubscribeDeleted();
    };
  }, []);

  useEffect(() => {
    if (initialLoading) return; // Don't run on initial load

    const timer = setTimeout(() => {
      fetchEmployees(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [filterDepartment, filterStatus, sortBy, sortOrder, pagination.currentPage]);

  // Search term effect
  useEffect(() => {
    if (initialLoading) return; // Don't run on initial load

    const timer = setTimeout(() => {
      setPagination((prev) => ({ ...prev, currentPage: 1 }));
      fetchEmployees(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);


  const fetchEmployees = async (isInitial = false) => {
    try {
      // Only show full page loading on initial load
      if (isInitial) {
        setInitialLoading(true);
      } else {
        setSearchLoading(true);
      }

      setError(null);

      const params = {
        limit: pagination.limit.toString(),
        offset: ((pagination.currentPage - 1) * pagination.limit).toString(),
        search: searchTerm,
        department: filterDepartment,
        status: filterStatus,
        sortBy: sortBy,
        sortOrder: sortOrder,
      };

      console.log("[EmployeeRecords] Fetching employees with params:", params);

      const result = await apiService.employees.getEmployees(params);

      if (result.success) {
        const employeesData = result.employees || [];
        setEmployees(employeesData);
        setStatistics(result.statistics || {});
        setDepartments(result.departments || []);
        setPagination((prev) => ({
          ...prev,
          total: result.pagination.total,
        }));

        console.log(`[EmployeeRecords] Loaded ${employeesData.length} employees`);

        // Load profile pictures using individual fetching
        if (employeesData.length > 0) {
          loadProfilePicturesIndividually(employeesData);
        }
      } else {
        throw new Error(result.error || "Failed to fetch employees");
      }
    } catch (err) {
      setError(err.message);
      console.error("Error fetching employees:", err);
    } finally {
      setLoading(false);
      setInitialLoading(false);
      setSearchLoading(false);
    }
  };

  const handleEditEmployee = async (employee) => {
    setEditingEmployee({
      ...employee,
      birthDate: employee.birthDate ? employee.birthDate.split("T")[0] : "",
      hireDate: employee.hireDate ? employee.hireDate.split("T")[0] : "",
    });

    // Reset file states
    setSelectedProfileFile(null);
    setSelectedDocumentFiles([]);
    setProfilePreview(null);

    // Set existing profile picture preview if available
    const profileUrl = getProfilePictureUrl(employee);
    if (profileUrl) {
      setProfilePreview(profileUrl);
    }

    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (employee) => {
    setDeleteEmployee(employee);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteEmployee) return;

    try {
      setIsSaving(true);
      await apiService.employees.deleteEmployee(deleteEmployee.id);

      await fetchEmployees();
      setSelectedEmployee(null);
      setIsDeleteModalOpen(false);
      setDeleteEmployee(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      // Use ProfileService validation
      apiService.profiles.validateFile(file);

      setSelectedProfileFile(file);

      // Create preview using FileReader
      const reader = new FileReader();
      reader.onload = (event) => {
        setProfilePreview(event.target.result);
        setError(null);
      };
      reader.onerror = () => {
        setError("Error creating image preview");
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError(err.message);
      setSelectedProfileFile(null);
      setProfilePreview(null);
    }
  };

  // Handle multiple document selection with validation
  const handleDocumentChange = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = [];
    const errors = [];

    files.forEach((file) => {
      try {
        apiService.document.validateDocumentFile(file);
        validFiles.push(file);
      } catch (err) {
        errors.push(`${file.name}: ${err.message}`);
      }
    });

    if (errors.length > 0) {
      setError("Some files were rejected: " + errors.join(", "));
    } else {
      setError(null);
    }

    setSelectedDocumentFiles((prev) => [...prev, ...validFiles]);
  };

  // Remove selected document file
  const removeSelectedDocument = (index) => {
    setSelectedDocumentFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    const uploadResults = {};

    try {
      setUploadingFiles(true);

      // Upload profile picture if selected
      if (selectedProfileFile) {
        try {
          console.log(
            "[EmployeeRecords] Uploading profile picture for employee:",
            editingEmployee.uid
          );
          const result = await apiService.profiles.uploadProfileByUid(
            editingEmployee.id,
            selectedProfileFile
          );
          console.log("[EmployeeRecords] Profile upload result:", result);

          if (result.success) {
            uploadResults.profilePicture =
              result.data?.relativePath || result.relativePath;

            // Clear and reload profile picture cache for this employee
            apiService.profiles.clearProfileFromCache(editingEmployee.id);
            const newProfileResult = await apiService.profiles.getProfileUrlByUid(
              editingEmployee.id
            );
            if (newProfileResult.success) {
              setProfilePictures(
                (prev) =>
                  new Map(prev.set(editingEmployee.id, newProfileResult.url))
              );
            }
          } else {
            throw new Error(result.error || "Failed to upload profile picture");
          }
        } catch (err) {
          console.error("[EmployeeRecords] Profile upload error:", err);
          throw new Error(`Failed to upload profile picture: ${err.message}`);
        }
      }

      // Upload multiple documents if selected
      if (selectedDocumentFiles.length > 0) {
        try {
          console.log(
            "[EmployeeRecords] Uploading documents for employee:",
            editingEmployee.id
          );
          const result = await apiService.document.uploadDocuments(
            editingEmployee.id,
            selectedDocumentFiles
          );
          console.log("[EmployeeRecords] Documents upload result:", result);

          if (!result.success) {
            throw new Error(`Failed to upload documents: ${result.error}`);
          }

          console.log("[EmployeeRecords] Documents uploaded successfully");
        } catch (err) {
          console.error("[EmployeeRecords] Documents upload error:", err);
          throw new Error(`Failed to upload documents: ${err.message}`);
        }
      }

      console.log(
        "[EmployeeRecords] All files uploaded successfully:",
        uploadResults
      );
      return uploadResults;
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleSaveEmployee = async () => {
    if (!editingEmployee) return;

    try {
      setIsSaving(true);

      // Upload any selected files first
      const uploadResults = await uploadFiles();

      // Update employee data with uploaded file information
      const updatedEmployeeData = {
        ...editingEmployee,
        ...uploadResults,
      };

      await apiService.employees.updateEmployee(
        editingEmployee.id,
        updatedEmployeeData
      );

      await fetchEmployees();
      setIsEditModalOpen(false);
      setEditingEmployee(null);
      setSelectedProfileFile(null);
      setSelectedDocumentFiles([]);
      setProfilePreview(null);

      // Update selected employee if it was the one being edited
      if (selectedEmployee?.id === editingEmployee.id) {
        const updatedEmployee = { ...selectedEmployee, ...updatedEmployeeData };
        setSelectedEmployee(updatedEmployee);

        // If profile picture was updated, clear from cache
        if (uploadResults.profilePicture) {
          // Clear from state
          setProfilePictures(prev => {
            const newMap = new Map(prev);
            newMap.delete(editingEmployee.id);
            return newMap;
          });

          // Clear from service worker cache
          if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: 'CLEAR_PROFILE',
              uid: editingEmployee.id
            });
          }

          // Reload the profile picture
          setTimeout(() => {
            loadProfilePicturesIndividually([updatedEmployee]);
          }, 500);
        }

        // Refresh documents for the updated employee
        await fetchEmployeeDocuments(updatedEmployee.id);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, currentPage: newPage }));
  };

  const formatPhoneNumber = (phone) => {
    if (!phone) return "N/A";
    return phone.replace(/(\+63)(\d{3})(\d{3})(\d{4})/, "$1 $2 $3 $4");
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleInputChange = (field, value) => {
    setEditingEmployee((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleChangePassword = async () => {
    setPasswordError("");
    setPasswordSuccess("");

    if (!passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordError("Both password fields are required");
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters long");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    try {
      setIsSaving(true);
      await apiService.employees.updateEmployeePassword(editingEmployee.id, {
        newPassword: passwordForm.newPassword,
      });

      setPasswordSuccess("Password changed successfully!");
      setPasswordForm({ newPassword: "", confirmPassword: "" });

      setTimeout(() => {
        setIsChangePasswordOpen(false);
        setPasswordSuccess("");
      }, 2000);
    } catch (err) {
      setPasswordError(err.message || "Failed to change password");
    } finally {
      setIsSaving(false);
    }
  };

  const canPreviewInline = (filename) => {
    if (!filename) return false;

    const ext = filename.split('.').pop()?.toLowerCase();

    // Files that can be previewed directly
    const previewableTypes = [
      'pdf',      // PDF documents
      'txt',      // Text files
      'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp',  // Images
      'svg'       // SVG images
    ];

    const canPreview = previewableTypes.includes(ext);
    console.log(`[EmployeeRecords] File ${filename} can preview inline:`, canPreview);

    return canPreview;
  };

  const getDocumentPreviewUrl = (employeeId, filename) => {
    if (!employeeId || !filename) {
      console.error("[EmployeeRecords] Missing employeeId or filename for preview URL");
      return null;
    }

    const baseURL = apiService.document.baseURL || window.location.origin;
    const token = getStoredToken();

    // Add inline parameter and token for authenticated preview
    const url = `${baseURL}/api/document/${employeeId}/${filename}?inline=true&token=${encodeURIComponent(token)}`;
    console.log(`[EmployeeRecords] Preview URL generated:`, url);

    return url;
  };

  const renderDocumentViewer = () => {
    if (!isDocumentViewerOpen || !selectedDocuments || selectedDocuments.length === 0) {
      return null;
    }

    const currentDoc = selectedDocuments[currentDocumentIndex];
    if (!currentDoc) {
      console.error("[EmployeeRecords] No current document at index", currentDocumentIndex);
      return null;
    }

    const filename = currentDoc.filename;
    const ext = filename?.split('.').pop()?.toLowerCase();
    const previewUrl = documentPreviewUrl || getDocumentPreviewUrl(selectedEmployee.id, filename);

    console.log("[EmployeeRecords] Rendering document viewer:", {
      filename,
      ext,
      previewUrl,
      currentIndex: currentDocumentIndex,
      totalDocs: selectedDocuments.length
    });

    return (
      <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
          {/* Header - Navigation Controls */}
          <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                Document Viewer
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {currentDocumentIndex + 1} of {selectedDocuments.length}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => navigateDocument("prev")}
                    disabled={currentDocumentIndex === 0}
                    className="px-3 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded disabled:opacity-50 hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                    title="Previous document"
                  >
                    ‹ Prev
                  </button>
                  <button
                    onClick={() => navigateDocument("next")}
                    disabled={currentDocumentIndex === selectedDocuments.length - 1}
                    className="px-3 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded disabled:opacity-50 hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                    title="Next document"
                  >
                    Next ›
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => downloadDocument(currentDoc)}
                className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
                title="Download current document"
                disabled={loadingDocuments}
              >
                <Download size={16} />
                <span className="text-sm">Download</span>
              </button>
              <button
                onClick={() => deleteDocument(currentDoc)}
                className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2"
                title="Delete current document"
                disabled={loadingDocuments}
              >
                <Trash2 size={16} />
                <span className="text-sm">Delete</span>
              </button>
              <button
                onClick={() => {
                  setIsDocumentViewerOpen(false);
                  setDocumentPreviewUrl(null);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Close viewer"
              >
                <X size={20} className="text-gray-500 dark:text-gray-400" />
              </button>
            </div>
          </div>

          {/* Document Preview Area */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden min-h-[500px]">
              {renderDocumentPreview(currentDoc, ext, previewUrl)}
            </div>

            {/* Document Info */}
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <h4 className="font-medium text-gray-800 dark:text-gray-100 mb-2">
                Document Information
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="text-gray-600 dark:text-gray-300 block mb-1">Original Name:</label>
                  <p className="text-gray-800 dark:text-gray-100 font-mono text-xs break-all">
                    {currentDoc.originalName || currentDoc.filename}
                  </p>
                </div>
                <div>
                  <label className="text-gray-600 dark:text-gray-300 block mb-1">File Size:</label>
                  <p className="text-gray-800 dark:text-gray-100">
                    {currentDoc.size
                      ? apiService.document.formatFileSize(currentDoc.size)
                      : "Unknown"}
                  </p>
                </div>
                <div>
                  <label className="text-gray-600 dark:text-gray-300 block mb-1">File Type:</label>
                  <p className="text-gray-800 dark:text-gray-100 uppercase">
                    {ext || "Unknown"}
                  </p>
                </div>
                <div>
                  <label className="text-gray-600 dark:text-gray-300 block mb-1">Uploaded:</label>
                  <p className="text-gray-800 dark:text-gray-100">
                    {currentDoc.created
                      ? formatDate(currentDoc.created)
                      : "Unknown"}
                  </p>
                </div>
              </div>
            </div>

            {/* Document List Thumbnails */}
            {selectedDocuments.length > 1 && (
              <div className="mt-4">
                <h4 className="font-medium text-gray-800 dark:text-gray-100 mb-2">
                  All Documents ({selectedDocuments.length})
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {selectedDocuments.map((doc, index) => {
                    const isActive = index === currentDocumentIndex;
                    return (
                      <button
                        key={index}
                        onClick={() => {
                          setCurrentDocumentIndex(index);
                          const url = getDocumentPreviewUrl(selectedEmployee.id, doc.filename);
                          setDocumentPreviewUrl(url);
                        }}
                        className={`p-3 text-left rounded-lg border transition-all ${isActive
                            ? "bg-blue-100 dark:bg-blue-900/40 border-blue-400 dark:border-blue-600 ring-2 ring-blue-500"
                            : "bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
                          }`}
                      >
                        <div className="flex items-center gap-2">
                          {getFileIcon(doc.filename)}
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs truncate ${isActive
                                ? "text-blue-800 dark:text-blue-200 font-medium"
                                : "text-gray-800 dark:text-gray-100"
                              }`}>
                              {doc.originalName || doc.filename}
                            </p>
                            {doc.size && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {apiService.document.formatFileSize(doc.size)}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderDocumentPreview = (doc, ext, previewUrl) => {
    if (!doc || !previewUrl) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[500px] text-gray-500">
          <FileText size={48} className="mb-4" />
          <p>Unable to load document preview</p>
        </div>
      );
    }

    // Images
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) {
      return (
        <div className="flex justify-center items-center min-h-[500px] bg-gray-50 dark:bg-gray-800 p-4">
          <img
            src={previewUrl}
            alt={doc.originalName || doc.filename}
            className="max-w-full max-h-[600px] object-contain rounded-lg shadow-lg"
            onError={(e) => {
              console.error("[EmployeeRecords] Image failed to load:", previewUrl);
              e.target.style.display = 'none';
              e.target.nextElementSibling.style.display = 'flex';
            }}
          />
          <div className="hidden flex-col items-center justify-center min-h-[500px] text-gray-500">
            <ImageIcon size={48} className="mb-4" />
            <p>Unable to preview image</p>
            <button
              onClick={() => downloadDocument(doc)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Download to View
            </button>
          </div>
        </div>
      );
    }

    // PDF Files
    if (ext === 'pdf') {
      return (
        <div className="relative min-h-[500px]">
          <iframe
            src={previewUrl}
            className="w-full h-[600px] border-0"
            title={`PDF: ${doc.originalName || doc.filename}`}
            onLoad={() => console.log("[EmployeeRecords] PDF loaded successfully")}
            onError={(e) => {
              console.error("[EmployeeRecords] PDF iframe failed to load");
            }}
          />
          <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-3 py-1 rounded text-sm">
            PDF Document
          </div>
        </div>
      );
    }

    // Text Files
    if (ext === 'txt') {
      return (
        <div className="p-4 bg-white dark:bg-gray-800 min-h-[500px]">
          <iframe
            src={previewUrl}
            className="w-full h-[600px] border-0 bg-white dark:bg-gray-900"
            title={`Text: ${doc.originalName || doc.filename}`}
          />
        </div>
      );
    }

    // Office Documents (Word, Excel, PowerPoint)
    if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) {
      // Try using Microsoft Office Online Viewer
      const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(previewUrl)}`;

      return (
        <div className="relative min-h-[500px]">
          <iframe
            src={officeViewerUrl}
            className="w-full h-[600px] border-0"
            title={`Document: ${doc.originalName || doc.filename}`}
            onLoad={(e) => {
              console.log("[EmployeeRecords] Office document loaded");
              const loadingDiv = e.target.parentElement.querySelector('.loading-message');
              if (loadingDiv) loadingDiv.style.display = 'none';
            }}
            onError={(e) => {
              console.error("[EmployeeRecords] Office viewer failed");
              const errorDiv = e.target.parentElement.querySelector('.error-message');
              if (errorDiv) errorDiv.style.display = 'flex';
              e.target.style.display = 'none';
            }}
          />

          {/* Loading Message */}
          <div className="loading-message absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-700">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-300">Loading document preview...</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">This may take a moment</p>
            </div>
          </div>

          {/* Error Message */}
          <div className="error-message hidden absolute inset-0 flex-col items-center justify-center bg-gray-100 dark:bg-gray-700">
            <FileText size={64} className="mb-4 text-gray-400" />
            <p className="text-gray-600 dark:text-gray-300 mb-4 text-lg">Unable to preview this document</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {doc.originalName || doc.filename}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => window.open(previewUrl, '_blank')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Eye size={16} />
                Open in New Tab
              </button>
              <button
                onClick={() => downloadDocument(doc)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <Download size={16} />
                Download
              </button>
            </div>
          </div>

          <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-3 py-1 rounded text-sm">
            {ext.toUpperCase()} Document
          </div>
        </div>
      );
    }

    // Unsupported file types
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-gray-500">
        <FileText size={64} className="mb-4 text-gray-400" />
        <p className="text-lg mb-2">Preview not available for {ext?.toUpperCase()} files</p>
        <p className="text-sm text-gray-400 mb-6">{doc.originalName || doc.filename}</p>
        <div className="flex gap-3">
          <button
            onClick={() => window.open(previewUrl, '_blank')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Eye size={16} />
            Try Opening in New Tab
          </button>
          <button
            onClick={() => downloadDocument(doc)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <Download size={16} />
            Download
          </button>
        </div>
      </div>
    );
  };

  if (initialLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600 dark:border-slate-400 mx-auto"></div>
        <p className="text-gray-600 dark:text-gray-300 mt-4">
          Loading employee records...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Statistics */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            👥 Employee Records
          </h2>
          <div className="flex gap-4 mt-2 text-sm text-gray-600 dark:text-gray-300">
            <span>Total: {statistics.totalEmployees || 0}</span>
            <span>Active: {statistics.activeEmployees || 0}</span>
            <span>New Hires (30d): {statistics.newHiresLast30Days || 0}</span>
            <span>Departments: {statistics.totalDepartments || 0}</span>
          </div>
        </div>
        <button
          onClick={fetchEmployees}
          className="bg-slate-600 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors duration-200"
        >
          Refresh
        </button>
      </div>

      {/* Filters and Search */}
      <div className="bg-white/20 dark:bg-gray-800/40 backdrop-blur-md rounded-2xl p-4 border border-white/30 dark:border-gray-700/30">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Simple Search Input - No Autocomplete */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-2 rounded-lg bg-white/20 dark:bg-gray-800/60 backdrop-blur-sm border border-white/30 dark:border-gray-700/40 text-gray-800 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Department Filter */}
          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="px-4 py-2 rounded-lg bg-white/20 dark:bg-gray-800/60 backdrop-blur-sm border border-white/30 dark:border-gray-700/40 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-slate-500"
          >
            <option value="">All Departments</option>
            {departments.map((dept) => (
              <option key={dept.name} value={dept.name}>
                {dept.name} ({dept.totalCount})
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 rounded-lg bg-white/20 dark:bg-gray-800/60 backdrop-blur-sm border border-white/30 dark:border-gray-700/40 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-slate-500"
          >
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="On Leave">On Leave</option>
            <option value="Terminated">Terminated</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 rounded-lg bg-white/20 dark:bg-gray-800/60 backdrop-blur-sm border border-white/30 dark:border-gray-700/40 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-slate-500"
          >
            <option value="hire_date">Hire Date</option>
            <option value="last_name">Last Name</option>
            <option value="first_name">First Name</option>
            <option value="position">Position</option>
            <option value="salary">Salary</option>
            <option value="age">Age</option>
          </select>

          {/* Sort Order */}
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="px-4 py-2 rounded-lg bg-white/20 dark:bg-gray-800/60 backdrop-blur-sm border border-white/30 dark:border-gray-700/40 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-slate-500"
          >
            <option value="DESC">Descending</option>
            <option value="ASC">Ascending</option>
          </select>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-100/80 dark:bg-red-900/30 backdrop-blur-sm border border-red-300 dark:border-red-700/50 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-300">Error: {error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Employee Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Employee List */}
        <div className="bg-white/20 dark:bg-gray-800/40 backdrop-blur-md rounded-2xl p-6 border border-white/30 dark:border-gray-700/30 shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              Employees ({employees.length} of {pagination.total})
            </h3>
            <div className="flex items-center gap-3">
              {searchLoading && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Updating...</span>
                </div>
              )}
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Page {pagination.currentPage} of{" "}
                {Math.ceil(pagination.total / pagination.limit)}
              </div>
            </div>
          </div>

          {/* Show overlay when loading search results */}
          <div className="relative">
            {searchLoading && (
              <div className="absolute inset-0 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm z-10 rounded-lg flex items-center justify-center">
                <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-lg">
                  <Loader2 className="w-5 h-5 animate-spin text-slate-600 dark:text-slate-400" />
                  <span className="text-gray-700 dark:text-gray-300">Loading...</span>
                </div>
              </div>
            )}

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {employees.map((employee) => (
                <div
                  key={employee.id}
                  onClick={() => setSelectedEmployee(employee)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${selectedEmployee?.id === employee.id
                    ? "bg-white/40 dark:bg-gray-700/60 border-slate-300 dark:border-slate-500"
                    : "bg-white/20 dark:bg-gray-700/30 border-white/20 dark:border-gray-600/30 hover:bg-white/30 dark:hover:bg-gray-700/50"
                    }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Profile Picture in List */}
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                      {getProfilePictureUrl(employee) ? (
                        <img
                          src={getProfilePictureUrl(employee)}
                          alt={`${employee.fullName} profile`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = "none";
                            e.target.nextElementSibling.style.display = "flex";
                          }}
                        />
                      ) : null}
                      <div
                        className={`w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500 ${getProfilePictureUrl(employee) ? "hidden" : "flex"
                          }`}
                      >
                        👤
                      </div>
                    </div>

                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-gray-800 dark:text-gray-100">
                            {employee.fullName}
                            {employee.isNewHire && (
                              <span className="ml-2 text-xs bg-green-500 text-white px-2 py-1 rounded">
                                NEW
                              </span>
                            )}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            {employee.position}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {employee.department}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            ID: {employee.idNumber}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${employee.status === "Active"
                            ? "bg-green-100/80 dark:bg-green-900/40 text-green-700 dark:text-green-300"
                            : employee.status === "On Leave"
                              ? "bg-yellow-100/80 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300"
                              : "bg-red-100/80 dark:bg-red-900/40 text-red-700 dark:text-red-300"
                            }`}
                        >
                          {employee.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* No results message */}
            {!searchLoading && employees.length === 0 && (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">🔍</div>
                <p className="text-gray-500 dark:text-gray-400">
                  No employees found
                </p>
                {searchTerm && (
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                    Try adjusting your search criteria
                  </p>
                )}
              </div>
            )}
          </div>
          {/* Pagination */}
          <div className="flex justify-center mt-4 gap-2">
            <button
              onClick={() => handlePageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage === 1 || searchLoading}
              className="px-3 py-1 rounded bg-slate-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-gray-700 dark:text-gray-300">
              {pagination.currentPage} /{" "}
              {Math.ceil(pagination.total / pagination.limit)}
            </span>
            <button
              onClick={() => handlePageChange(pagination.currentPage + 1)}
              disabled={
                pagination.currentPage >= Math.ceil(pagination.total / pagination.limit) ||
                searchLoading
              }
              className="px-3 py-1 rounded bg-slate-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              Next
            </button>
          </div>
        </div>

        {/* Employee Details */}
        <div className="bg-white/20 dark:bg-gray-800/40 backdrop-blur-md rounded-2xl p-6 border border-white/30 dark:border-gray-700/30 shadow-lg">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
            Employee Details
          </h3>
          {selectedEmployee ? (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              <div className="text-center pb-4 border-b border-white/30 dark:border-gray-600/30">
                {/* Profile Picture Display */}
                <div className="w-24 h-24 mx-auto mb-3 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                  {getProfilePictureUrl(selectedEmployee) ? (
                    <img
                      src={getProfilePictureUrl(selectedEmployee)}
                      alt={`${selectedEmployee.fullName} profile`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = "none";
                        e.target.nextElementSibling.style.display = "flex";
                      }}
                    />
                  ) : null}
                  <div
                    className={`w-full h-full flex items-center justify-center text-4xl text-gray-400 dark:text-gray-500 ${getProfilePictureUrl(selectedEmployee) ? "hidden" : "flex"
                      }`}
                  >
                    👤
                  </div>
                </div>

                <h4 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                  {selectedEmployee.fullName}
                </h4>
                <p className="text-gray-600 dark:text-gray-300">
                  {selectedEmployee.position}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedEmployee.department}
                </p>

                {/* Documents Display */}
                {loadingDocuments ? (
                  <div className="mt-3">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Loading documents...
                    </p>
                  </div>
                ) : employeeDocuments && employeeDocuments.length > 0 ? (
                  <div className="mt-3">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Documents ({employeeDocuments.length}):
                      </p>
                      <button
                        onClick={openDocumentViewer}
                        className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        View All
                      </button>
                    </div>
                    <div className="space-y-1 max-h-24 overflow-y-auto">
                      {employeeDocuments.map((doc, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-gray-100 dark:bg-gray-700 rounded p-2"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {getFileIcon(doc.filename)}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-gray-700 dark:text-gray-300 truncate">
                                {doc.originalName || doc.filename}
                              </p>
                              {doc.size && (
                                <p className="text-xs text-gray-500">
                                  {apiService.document.formatFileSize(doc.size)}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadDocument(doc);
                              }}
                              className="p-1 text-green-600 hover:bg-green-100 dark:hover:bg-green-900 rounded"
                              title="Download document"
                            >
                              <Download className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mt-3">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No documents uploaded
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3">
                {/* Personal Information */}
                <div className="border-b border-white/20 dark:border-gray-600/20 pb-3">
                  <h5 className="font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Personal Information
                  </h5>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-300 block">
                        Age
                      </label>
                      <p className="text-gray-800 dark:text-gray-100">
                        {selectedEmployee.age || "N/A"}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-300 block">
                        Birth Date
                      </label>
                      <p className="text-gray-800 dark:text-gray-100">
                        {formatDate(selectedEmployee.birthDate)}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-300 block">
                        Civil Status
                      </label>
                      <p className="text-gray-800 dark:text-gray-100">
                        {selectedEmployee.civilStatus || "N/A"}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-300 block">
                        Contact
                      </label>
                      <p className="text-gray-800 dark:text-gray-100">
                        {formatPhoneNumber(selectedEmployee.contactNumber)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-300 block">
                      Email
                    </label>
                    <p className="text-gray-800 dark:text-gray-100">
                      {selectedEmployee.email || "N/A"}
                    </p>
                  </div>
                  <div className="mt-2">
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-300 block">
                      Address
                    </label>
                    <p className="text-gray-800 dark:text-gray-100 text-sm">
                      {selectedEmployee.address || "N/A"}
                    </p>
                  </div>
                </div>

                {/* Employment Information */}
                <div className="border-b border-white/20 dark:border-gray-600/20 pb-3">
                  <h5 className="font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Employment Information
                  </h5>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-300 block">
                        Hire Date
                      </label>
                      <p className="text-gray-800 dark:text-gray-100">
                        {formatDate(selectedEmployee.hireDate)}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-300 block">
                        Employee ID
                      </label>
                      <p className="text-gray-800 dark:text-gray-100">
                        {selectedEmployee.idNumber || "N/A"}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-300 block">
                        Status
                      </label>
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-xs ${selectedEmployee.status === "Active"
                          ? "bg-green-100/80 dark:bg-green-900/40 text-green-700 dark:text-green-300"
                          : selectedEmployee.status === "On Leave"
                            ? "bg-yellow-100/80 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300"
                            : "bg-red-100/80 dark:bg-red-900/40 text-red-700 dark:text-red-300"
                          }`}
                      >
                        {selectedEmployee.status}
                      </span>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-300 block">
                        Salary
                      </label>
                      <p className="text-gray-800 dark:text-gray-100 font-medium">
                        {selectedEmployee.salary || "N/A"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-300 block">
                      ID Barcode
                    </label>
                    <p className="text-gray-800 dark:text-gray-100 font-mono text-xs">
                      {selectedEmployee.idBarcode || "N/A"}
                    </p>
                  </div>
                </div>

                {/* Government IDs */}
                <div className="pb-3">
                  <h5 className="font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Government IDs & Numbers
                  </h5>
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    <div className="flex justify-between">
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
                        TIN Number:
                      </label>
                      <p className="text-gray-800 dark:text-gray-100 font-mono">
                        {selectedEmployee.tinNumber || "N/A"}
                      </p>
                    </div>
                    <div className="flex justify-between">
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
                        SSS Number:
                      </label>
                      <p className="text-gray-800 dark:text-gray-100 font-mono">
                        {selectedEmployee.sssNumber || "N/A"}
                      </p>
                    </div>
                    <div className="flex justify-between">
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
                        Pag-IBIG Number:
                      </label>
                      <p className="text-gray-800 dark:text-gray-100 font-mono">
                        {selectedEmployee.pagibigNumber || "N/A"}
                      </p>
                    </div>
                    <div className="flex justify-between">
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
                        PhilHealth Number:
                      </label>
                      <p className="text-gray-800 dark:text-gray-100 font-mono">
                        {selectedEmployee.philhealthNumber || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/30 dark:border-gray-600/30">
                <button
                  onClick={() => handleEditEmployee(selectedEmployee)}
                  className="flex-1 bg-slate-600 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white py-2 rounded-lg transition-colors duration-200 text-sm"
                >
                  Edit Employee
                </button>
                <button
                  onClick={() => handleDeleteClick(selectedEmployee)}
                  className="flex-1 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white py-2 rounded-lg transition-colors duration-200 text-sm"
                >
                  Delete Employee
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">👤</div>
              <p className="text-gray-500 dark:text-gray-400">
                Select an employee to view detailed information
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Document Viewer Modal */}
      {isDocumentViewerOpen && selectedDocuments.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
          {renderDocumentViewer()}
        </div>
      )}

      {/* <div className="fixed inset-0 bg-gray-30 bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50 p-4"></div> make content blur */}

      {/* Edit Employee Modal */}
      {
        isEditModalOpen && editingEmployee && (
          <div className="fixed inset-0 bg-gray-30 bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[93vh] overflow-hidden shadow-2xl">
              <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                  Edit Employee
                </h2>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsChangePasswordOpen(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 shadow-sm"
                    title="Change employee password"
                  >
                    <Lock size={18} />
                    <span className="font-medium">Change Password</span>
                  </button>
                  <button
                    onClick={() => setIsEditModalOpen(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <X size={20} className="text-gray-500 dark:text-gray-400" />
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                <form className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2 space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2">
                      File Uploads
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Profile Picture Upload */}
                      <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Profile Picture
                        </label>
                        <div className="flex items-center space-x-4">
                          {profilePreview && (
                            <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                              <img
                                src={profilePreview}
                                alt="Profile preview"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div className="flex-1">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleProfilePictureChange}
                              disabled={isSaving || uploadingFiles}
                              className="w-full px-3 py-2 text-sm text-gray-600 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-slate-600 file:text-white hover:file:bg-slate-700 file:cursor-pointer"
                            />
                            {selectedProfileFile && (
                              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                📁 {selectedProfileFile.name} selected (will
                                upload when saved)
                              </p>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Select new profile picture (max 10MB,
                          jpg/png/gif/webp/bmp). File will be uploaded when you
                          save changes.
                        </p>
                      </div>

                      {/* Document Upload */}
                      <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Add New Documents
                        </label>
                        <div className="space-y-2">
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx,.txt,.csv,.rtf,.xls,.xlsx,.ppt,.pptx,image/*,.zip,.rar"
                            multiple
                            onChange={handleDocumentChange}
                            disabled={isSaving || uploadingFiles}
                            className="w-full px-3 py-2 text-sm text-gray-600 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-slate-600 file:text-white hover:file:bg-slate-700 file:cursor-pointer"
                          />

                          {/* Show selected files to upload */}
                          {selectedDocumentFiles.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                Files to upload ({selectedDocumentFiles.length}):
                              </p>
                              {selectedDocumentFiles.map((file, index) => (
                                <div
                                  key={index}
                                  className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 p-2 rounded"
                                >
                                  <div className="flex items-center gap-2">
                                    {getFileIcon(file.name)}
                                    <span className="text-xs text-green-700 dark:text-green-300">
                                      {file.name}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      (
                                      {apiService.document.formatFileSize(
                                        file.size
                                      )}
                                      )
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => removeSelectedDocument(index)}
                                    className="text-red-500 hover:text-red-700"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Show existing documents */}
                          {employeeDocuments && employeeDocuments.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                Current documents ({employeeDocuments.length}):
                              </p>
                              {employeeDocuments.map((doc, index) => (
                                <div
                                  key={index}
                                  className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 p-2 rounded"
                                >
                                  <div className="flex items-center gap-2">
                                    {getFileIcon(doc.filename)}
                                    <span className="text-xs text-gray-700 dark:text-gray-300">
                                      {doc.originalName || doc.filename}
                                    </span>
                                    {doc.size && (
                                      <span className="text-xs text-gray-500">
                                        (
                                        {apiService.document.formatFileSize(
                                          doc.size
                                        )}
                                        )
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        window.open(
                                          getDocumentUrl(
                                            editingEmployee.id,
                                            doc.filename
                                          ),
                                          "_blank"
                                        )
                                      }
                                      className="text-blue-500 hover:text-blue-700"
                                      title="View document"
                                    >
                                      <Eye size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => deleteDocument(doc)}
                                      className="text-red-500 hover:text-red-700"
                                      title="Remove document"
                                      disabled={loadingDocuments}
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Select multiple documents (max 50MB each). Files will be
                          uploaded when you save changes.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Personal Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2">
                      Personal Information
                    </h3>

                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          First Name
                        </label>
                        <input
                          type="text"
                          value={editingEmployee.firstName || ""}
                          onChange={(e) =>
                            handleInputChange("firstName", e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Middle Name
                        </label>
                        <input
                          type="text"
                          value={editingEmployee.middleName || ""}
                          onChange={(e) =>
                            handleInputChange("middleName", e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Last Name
                        </label>
                        <input
                          type="text"
                          value={editingEmployee.lastName || ""}
                          onChange={(e) =>
                            handleInputChange("lastName", e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Age
                          </label>
                          <input
                            type="number"
                            value={editingEmployee.age || ""}
                            onChange={(e) =>
                              handleInputChange("age", e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Birth Date
                          </label>
                          <input
                            type="date"
                            value={editingEmployee.birthDate || ""}
                            onChange={(e) =>
                              handleInputChange("birthDate", e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Civil Status
                        </label>
                        <select
                          value={editingEmployee.civilStatus || ""}
                          onChange={(e) =>
                            handleInputChange("civilStatus", e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        >
                          <option value="">Select Status</option>
                          <option value="Single">Single</option>
                          <option value="Married">Married</option>
                          <option value="Divorced">Divorced</option>
                          <option value="Widowed">Widowed</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Contact Number
                        </label>
                        <input
                          type="tel"
                          value={editingEmployee.contactNumber || ""}
                          onChange={(e) =>
                            handleInputChange("contactNumber", e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          placeholder="+639123456789"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Email
                        </label>
                        <input
                          type="email"
                          value={editingEmployee.email || ""}
                          onChange={(e) =>
                            handleInputChange("email", e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                      </div>

                      <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      value={editingEmployee.username || ""}
                      onChange={(e) =>
                        handleInputChange("username", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Access Level
                    </label>
                    <select
                      value={editingEmployee.accessLevel || ""}
                      onChange={(e) =>
                        handleInputChange("accessLevel", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="">Select Access Level</option>
                      <option value="Admin">Admin</option>
                      <option value="Manager">Manager</option>
                      <option value="Employee">Employee</option>
                      <option value="Viewer">Viewer</option>
                    </select>
                  </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Address
                        </label>
                        <textarea
                          value={editingEmployee.address || ""}
                          onChange={(e) =>
                            handleInputChange("address", e.target.value)
                          }
                          rows="3"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Employment Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2">
                      Employment Information
                    </h3>

                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Position
                        </label>
                        <input
                          type="text"
                          value={editingEmployee.position || ""}
                          onChange={(e) =>
                            handleInputChange("position", e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Department
                        </label>
                        <input
                          type="text"
                          value={editingEmployee.department || ""}
                          onChange={(e) =>
                            handleInputChange("department", e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Hire Date
                        </label>
                        <input
                          type="date"
                          value={editingEmployee.hireDate || ""}
                          onChange={(e) =>
                            handleInputChange("hireDate", e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Employee ID
                        </label>
                        <input
                          type="text"
                          value={editingEmployee.idNumber || ""}
                          onChange={(e) =>
                            handleInputChange("idNumber", e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Status
                        </label>
                        <select
                          value={editingEmployee.status || ""}
                          onChange={(e) =>
                            handleInputChange("status", e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        >
                          <option value="">Select Status</option>
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                          <option value="On Leave">On Leave</option>
                          <option value="Terminated">Terminated</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Salary
                        </label>
                        <input
                          type="text"
                          value={editingEmployee.salary || ""}
                          onChange={(e) =>
                            handleInputChange("salary", e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          placeholder="₱25,000"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          ID Barcode
                        </label>
                        <input
                          type="text"
                          value={editingEmployee.idBarcode || ""}
                          onChange={(e) =>
                            handleInputChange("idBarcode", e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-mono text-sm"
                        />
                      </div>
                    </div>

                    {/* Government IDs */}
                    <div className="mt-6">
                      <h4 className="text-md font-medium text-gray-800 dark:text-gray-100 mb-3 border-b border-gray-200 dark:border-gray-700 pb-1">
                        Government IDs & Numbers
                      </h4>
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            TIN Number
                          </label>
                          <input
                            type="text"
                            value={editingEmployee.tinNumber || ""}
                            onChange={(e) =>
                              handleInputChange("tinNumber", e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-mono text-sm"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            SSS Number
                          </label>
                          <input
                            type="text"
                            value={editingEmployee.sssNumber || ""}
                            onChange={(e) =>
                              handleInputChange("sssNumber", e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-mono text-sm"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Pag-IBIG Number
                          </label>
                          <input
                            type="text"
                            value={editingEmployee.pagibigNumber || ""}
                            onChange={(e) =>
                              handleInputChange("pagibigNumber", e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-mono text-sm"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            PhilHealth Number
                          </label>
                          <input
                            type="text"
                            value={editingEmployee.philhealthNumber || ""}
                            onChange={(e) =>
                              handleInputChange(
                                "philhealthNumber",
                                e.target.value
                              )
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-mono text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </form>
              </div>

              <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEmployee}
                  disabled={isSaving || uploadingFiles}
                  className="px-6 py-2 bg-slate-600 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving
                    ? uploadingFiles
                      ? "Uploading files..."
                      : "Saving..."
                    : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        )
      }

      {isChangePasswordOpen && editingEmployee && (
        <div className="fixed inset-0 bg-gray-90 bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full shadow-2xl">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <Lock size={20} className="text-blue-600" />
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                  Change Password
                </h2>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                For: {editingEmployee.fullName}
              </p>
            </div>

            <div className="p-6 space-y-4">
              {passwordError && (
                <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg p-3">
                  <p className="text-sm text-red-700 dark:text-red-300">{passwordError}</p>
                </div>
              )}

              {passwordSuccess && (
                <div className="bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-lg p-3">
                  <p className="text-sm text-green-700 dark:text-green-300">{passwordSuccess}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) =>
                    setPasswordForm({
                      ...passwordForm,
                      newPassword: e.target.value,
                    })
                  }
                  placeholder="Minimum 8 characters"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    setPasswordForm({
                      ...passwordForm,
                      confirmPassword: e.target.value,
                    })
                  }
                  placeholder="Re-enter password"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
              <button
                onClick={() => {
                  setIsChangePasswordOpen(false);
                  setPasswordForm({ newPassword: "", confirmPassword: "" });
                  setPasswordError("");
                  setPasswordSuccess("");
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                onClick={handleChangePassword}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? "Updating..." : "Update Password"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {
        isDeleteModalOpen && deleteEmployee && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full shadow-2xl">
              <div className="p-6">
                <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 dark:bg-red-900/40 rounded-full">
                  <svg
                    className="w-6 h-6 text-red-600 dark:text-red-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                </div>

                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 text-center mb-2">
                  Delete Employee Record
                </h2>

                <p className="text-gray-600 dark:text-gray-300 text-center mb-6">
                  Are you sure you want to delete{" "}
                  <strong>{deleteEmployee.fullName}</strong>? This action cannot
                  be undone and will permanently remove all employee data.
                </p>

                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
                  <div className="flex items-center">
                    <svg
                      className="w-5 h-5 text-red-500 dark:text-red-400 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div className="text-sm text-red-700 dark:text-red-300">
                      <p className="font-medium">
                        Warning: This action is irreversible
                      </p>
                      <p>Employee ID: {deleteEmployee.idNumber}</p>
                      <p>Department: {deleteEmployee.department}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                <button
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setDeleteEmployee(null);
                  }}
                  className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isSaving}
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? "Deleting..." : "Delete Employee"}
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div>
  );
}

export default EmployeeRecords;
