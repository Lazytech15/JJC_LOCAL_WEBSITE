import { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight, Check, User, Briefcase, CreditCard, FileText, Settings, Lock, Upload, Trash2 } from "lucide-react";
import apiService from "../../utils/api/api-service";

const WIZARD_STEPS = [
  { id: 1, title: "Personal", icon: User, description: "Basic information" },
  { id: 2, title: "Employment", icon: Briefcase, description: "Job details" },
  { id: 3, title: "Government IDs", icon: CreditCard, description: "ID numbers" },
  { id: 4, title: "Files", icon: FileText, description: "Documents" },
  { id: 5, title: "Account", icon: Settings, description: "Login settings" },
];

function EditEmployeeWizard({
  isOpen,
  onClose,
  employee,
  isDarkMode,
  onSave,
  onChangePassword,
  getProfilePictureUrl,
  existingDocuments = [],
  onDeleteDocument,
  getFileIcon,
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [selectedProfileFile, setSelectedProfileFile] = useState(null);
  const [selectedDocumentFiles, setSelectedDocumentFiles] = useState([]);
  const [profilePreview, setProfilePreview] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [error, setError] = useState(null);

  // Initialize form when employee changes
  useEffect(() => {
    if (employee && isOpen) {
      setEditingEmployee({
        ...employee,
        birthDate: employee.birthDate ? employee.birthDate.split("T")[0] : "",
        hireDate: employee.hireDate ? employee.hireDate.split("T")[0] : "",
      });
      setCurrentStep(1);
      setSelectedProfileFile(null);
      setSelectedDocumentFiles([]);
      setError(null);

      const profileUrl = getProfilePictureUrl?.(employee);
      if (profileUrl) {
        setProfilePreview(profileUrl);
      } else {
        setProfilePreview(null);
      }
    }
  }, [employee, isOpen, getProfilePictureUrl]);

  const handleInputChange = (field, value) => {
    setEditingEmployee((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      apiService.profiles.validateFile(file);
      setSelectedProfileFile(file);

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
    }
  };

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
      setError(errors.join(", "));
    }

    if (validFiles.length > 0) {
      setSelectedDocumentFiles((prev) => [...prev, ...validFiles]);
    }

    e.target.value = "";
  };

  const removeSelectedDocument = (index) => {
    setSelectedDocumentFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    const uploadResults = {};

    if (!editingEmployee) return uploadResults;

    setUploadingFiles(true);
    try {
      if (selectedProfileFile) {
        const profileResult = await apiService.profiles.uploadProfilePicture(
          editingEmployee.uid || editingEmployee.id,
          selectedProfileFile
        );

        if (profileResult.success && profileResult.url) {
          uploadResults.profilePicture = profileResult.url;
          apiService.profiles.clearProfileFromCache(editingEmployee.id);
          const cacheResult = await apiService.profiles.cacheProfilePicture(editingEmployee.id);
          if (cacheResult.success) {
            uploadResults.profilePicture = cacheResult.url;
          }
        }
      }

      if (selectedDocumentFiles.length > 0) {
        const documentResults = await apiService.document.uploadMultipleDocuments(
          editingEmployee.id,
          selectedDocumentFiles,
          { category: "general", uploadedBy: "HR Admin" }
        );
        uploadResults.newDocuments = documentResults.filter((r) => r.success);
      }

      return uploadResults;
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleSave = async () => {
    if (!editingEmployee) return;

    try {
      setIsSaving(true);
      const uploadResults = await uploadFiles();

      const updatedEmployeeData = {
        ...editingEmployee,
        ...uploadResults,
      };

      await onSave(updatedEmployeeData, uploadResults);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const nextStep = () => {
    if (currentStep < WIZARD_STEPS.length) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const goToStep = (step) => {
    setCurrentStep(step);
  };

  if (!isOpen || !editingEmployee) return null;

  const inputClass = `w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent ${
    isDarkMode
      ? "border-gray-600 bg-gray-700 text-gray-100"
      : "border-gray-300 bg-white text-gray-900"
  }`;

  const labelClass = `block text-sm font-medium mb-1 ${
    isDarkMode ? "text-gray-300" : "text-gray-700"
  }`;

  const renderStepIndicator = () => (
    <div className="flex items-center justify-between px-6 py-4">
      {WIZARD_STEPS.map((step, index) => {
        const Icon = step.icon;
        const isActive = currentStep === step.id;
        const isCompleted = currentStep > step.id;

        return (
          <div key={step.id} className="flex items-center">
            <button
              onClick={() => goToStep(step.id)}
              className={`flex flex-col items-center group transition-all duration-200 ${
                isActive || isCompleted ? "cursor-pointer" : "cursor-pointer"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
                  isActive
                    ? isDarkMode
                      ? "bg-slate-600 text-white ring-2 ring-slate-400"
                      : "bg-slate-600 text-white ring-2 ring-slate-300"
                    : isCompleted
                    ? isDarkMode
                      ? "bg-green-600 text-white"
                      : "bg-green-500 text-white"
                    : isDarkMode
                    ? "bg-gray-700 text-gray-400 group-hover:bg-gray-600"
                    : "bg-gray-200 text-gray-500 group-hover:bg-gray-300"
                }`}
              >
                {isCompleted ? <Check size={18} /> : <Icon size={18} />}
              </div>
              <span
                className={`mt-1 text-xs font-medium hidden sm:block ${
                  isActive
                    ? isDarkMode
                      ? "text-slate-300"
                      : "text-slate-600"
                    : isDarkMode
                    ? "text-gray-400"
                    : "text-gray-500"
                }`}
              >
                {step.title}
              </span>
            </button>

            {index < WIZARD_STEPS.length - 1 && (
              <div
                className={`w-8 sm:w-16 h-0.5 mx-1 sm:mx-2 transition-colors duration-200 ${
                  currentStep > step.id
                    ? isDarkMode
                      ? "bg-green-600"
                      : "bg-green-500"
                    : isDarkMode
                    ? "bg-gray-700"
                    : "bg-gray-300"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );

  const renderPersonalInfo = () => (
    <div className="space-y-4">
      <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? "text-gray-100" : "text-gray-800"}`}>
        Personal Information
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>First Name</label>
          <input
            type="text"
            value={editingEmployee.firstName || ""}
            onChange={(e) => handleInputChange("firstName", e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Middle Name</label>
          <input
            type="text"
            value={editingEmployee.middleName || ""}
            onChange={(e) => handleInputChange("middleName", e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Last Name</label>
          <input
            type="text"
            value={editingEmployee.lastName || ""}
            onChange={(e) => handleInputChange("lastName", e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>Birth Date</label>
          <input
            type="date"
            value={editingEmployee.birthDate || ""}
            onChange={(e) => handleInputChange("birthDate", e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Age</label>
          <input
            type="number"
            value={editingEmployee.age || ""}
            onChange={(e) => handleInputChange("age", e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Civil Status</label>
          <select
            value={editingEmployee.civilStatus || ""}
            onChange={(e) => handleInputChange("civilStatus", e.target.value)}
            className={inputClass}
          >
            <option value="">Select Status</option>
            <option value="Single">Single</option>
            <option value="Married">Married</option>
            <option value="Divorced">Divorced</option>
            <option value="Widowed">Widowed</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Contact Number</label>
          <input
            type="tel"
            value={editingEmployee.contactNumber || ""}
            onChange={(e) => handleInputChange("contactNumber", e.target.value)}
            className={inputClass}
            placeholder="+639123456789"
          />
        </div>

        <div>
          <label className={labelClass}>Email</label>
          <input
            type="email"
            value={editingEmployee.email || ""}
            onChange={(e) => handleInputChange("email", e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Address</label>
        <textarea
          value={editingEmployee.address || ""}
          onChange={(e) => handleInputChange("address", e.target.value)}
          rows="2"
          className={inputClass}
        />
      </div>
    </div>
  );

  const renderEmploymentInfo = () => (
    <div className="space-y-4">
      <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? "text-gray-100" : "text-gray-800"}`}>
        Employment Details
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Employee ID</label>
          <input
            type="text"
            value={editingEmployee.idNumber || ""}
            onChange={(e) => handleInputChange("idNumber", e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>ID Barcode</label>
          <input
            type="text"
            value={editingEmployee.idBarcode || ""}
            onChange={(e) => handleInputChange("idBarcode", e.target.value)}
            className={`${inputClass} font-mono text-sm`}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Position</label>
          <input
            type="text"
            value={editingEmployee.position || ""}
            onChange={(e) => handleInputChange("position", e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Department</label>
          <input
            type="text"
            value={editingEmployee.department || ""}
            onChange={(e) => handleInputChange("department", e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>Hire Date</label>
          <input
            type="date"
            value={editingEmployee.hireDate || ""}
            onChange={(e) => handleInputChange("hireDate", e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Status</label>
          <select
            value={editingEmployee.status || ""}
            onChange={(e) => handleInputChange("status", e.target.value)}
            className={inputClass}
          >
            <option value="">Select Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="On Leave">On Leave</option>
            <option value="Terminated">Terminated</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>Salary</label>
          <input
            type="text"
            value={editingEmployee.salary || ""}
            onChange={(e) => handleInputChange("salary", e.target.value)}
            className={inputClass}
            placeholder="₱25,000"
          />
        </div>
      </div>
    </div>
  );

  const renderGovernmentIds = () => (
    <div className="space-y-4">
      <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? "text-gray-100" : "text-gray-800"}`}>
        Government IDs & Numbers
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>TIN Number</label>
          <input
            type="text"
            value={editingEmployee.tinNumber || ""}
            onChange={(e) => handleInputChange("tinNumber", e.target.value)}
            className={`${inputClass} font-mono text-sm`}
            placeholder="000-000-000-000"
          />
        </div>

        <div>
          <label className={labelClass}>SSS Number</label>
          <input
            type="text"
            value={editingEmployee.sssNumber || ""}
            onChange={(e) => handleInputChange("sssNumber", e.target.value)}
            className={`${inputClass} font-mono text-sm`}
            placeholder="00-0000000-0"
          />
        </div>

        <div>
          <label className={labelClass}>Pag-IBIG Number</label>
          <input
            type="text"
            value={editingEmployee.pagibigNumber || ""}
            onChange={(e) => handleInputChange("pagibigNumber", e.target.value)}
            className={`${inputClass} font-mono text-sm`}
            placeholder="0000-0000-0000"
          />
        </div>

        <div>
          <label className={labelClass}>PhilHealth Number</label>
          <input
            type="text"
            value={editingEmployee.philhealthNumber || ""}
            onChange={(e) => handleInputChange("philhealthNumber", e.target.value)}
            className={`${inputClass} font-mono text-sm`}
            placeholder="00-000000000-0"
          />
        </div>
      </div>
    </div>
  );

  const renderFiles = () => (
    <div className="space-y-6">
      <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? "text-gray-100" : "text-gray-800"}`}>
        Files & Documents
      </h3>

      {/* Profile Picture */}
      <div className="space-y-3">
        <label className={labelClass}>Profile Picture</label>
        <div className="flex items-center space-x-4">
          {profilePreview && (
            <div
              className={`w-20 h-20 rounded-full overflow-hidden flex-shrink-0 ${
                isDarkMode ? "bg-gray-700" : "bg-gray-200"
              }`}
            >
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
              className={`w-full px-3 py-2 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:text-white file:cursor-pointer ${
                isDarkMode
                  ? "text-gray-400 file:bg-slate-700 hover:file:bg-slate-600"
                  : "text-gray-600 file:bg-slate-600 hover:file:bg-slate-700"
              }`}
            />
            {selectedProfileFile && (
              <p className={`text-xs mt-1 ${isDarkMode ? "text-green-400" : "text-green-600"}`}>
                📁 {selectedProfileFile.name} selected
              </p>
            )}
          </div>
        </div>
        <p className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
          Max 10MB. Supported: jpg, png, gif, webp, bmp
        </p>
      </div>

      {/* Document Upload */}
      <div className="space-y-3">
        <label className={labelClass}>Add New Documents</label>
        <input
          type="file"
          accept=".pdf,.doc,.docx,.txt,.csv,.rtf,.xls,.xlsx,.ppt,.pptx,image/*,.zip,.rar"
          multiple
          onChange={handleDocumentChange}
          disabled={isSaving || uploadingFiles}
          className={`w-full px-3 py-2 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:text-white file:cursor-pointer ${
            isDarkMode
              ? "text-gray-400 file:bg-slate-700 hover:file:bg-slate-600"
              : "text-gray-600 file:bg-slate-600 hover:file:bg-slate-700"
          }`}
        />

        {/* Selected files to upload */}
        {selectedDocumentFiles.length > 0 && (
          <div className="space-y-2 mt-3">
            <p className={`text-sm font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
              Files to upload ({selectedDocumentFiles.length}):
            </p>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {selectedDocumentFiles.map((file, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-2 rounded ${
                    isDarkMode ? "bg-green-900/20" : "bg-green-50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {getFileIcon?.(file.name) || <FileText size={14} />}
                    <span className={`text-xs ${isDarkMode ? "text-green-300" : "text-green-700"}`}>
                      {file.name}
                    </span>
                    <span className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                      ({apiService.document.formatFileSize(file.size)})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSelectedDocument(index)}
                    className={isDarkMode ? "text-red-400 hover:text-red-300" : "text-red-500 hover:text-red-700"}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Existing documents */}
        {existingDocuments.length > 0 && (
          <div className="space-y-2 mt-4">
            <p className={`text-sm font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
              Existing Documents ({existingDocuments.length}):
            </p>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {existingDocuments.map((doc, index) => (
                <div
                  key={doc.id || index}
                  className={`flex items-center justify-between p-2 rounded ${
                    isDarkMode ? "bg-gray-700" : "bg-gray-100"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {getFileIcon?.(doc.originalFilename || doc.filename) || <FileText size={14} />}
                    <span className={`text-xs ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                      {doc.originalFilename || doc.filename}
                    </span>
                  </div>
                  {onDeleteDocument && (
                    <button
                      type="button"
                      onClick={() => onDeleteDocument(doc.id)}
                      className={isDarkMode ? "text-red-400 hover:text-red-300" : "text-red-500 hover:text-red-700"}
                      title="Delete document"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderAccount = () => (
    <div className="space-y-4">
      <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? "text-gray-100" : "text-gray-800"}`}>
        Account Settings
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Username</label>
          <input
            type="text"
            value={editingEmployee.username || ""}
            onChange={(e) => handleInputChange("username", e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Access Level</label>
          <select
            value={editingEmployee.accessLevel || ""}
            onChange={(e) => handleInputChange("accessLevel", e.target.value)}
            className={inputClass}
          >
            <option value="">Select Access Level</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="user">User</option>
          </select>
        </div>
      </div>

      {/* Password Change Button */}
      <div className={`mt-6 p-4 rounded-lg border ${isDarkMode ? "bg-gray-700/50 border-gray-600" : "bg-gray-50 border-gray-200"}`}>
        <div className="flex items-center justify-between">
          <div>
            <h4 className={`font-medium ${isDarkMode ? "text-gray-200" : "text-gray-800"}`}>
              Password Management
            </h4>
            <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
              Change the employee's login password
            </p>
          </div>
          <button
            type="button"
            onClick={onChangePassword}
            className={`px-4 py-2 text-white rounded-lg transition-colors flex items-center gap-2 ${
              isDarkMode
                ? "bg-blue-700 hover:bg-blue-600"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            <Lock size={16} />
            Change Password
          </button>
        </div>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderPersonalInfo();
      case 2:
        return renderEmploymentInfo();
      case 3:
        return renderGovernmentIds();
      case 4:
        return renderFiles();
      case 5:
        return renderAccount();
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className={`rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col ${
          isDarkMode ? "bg-gray-800" : "bg-white"
        }`}
      >
        {/* Header */}
        <div
          className={`flex justify-between items-center px-6 py-4 border-b ${
            isDarkMode ? "border-gray-700" : "border-gray-200"
          }`}
        >
          <div>
            <h2 className={`text-xl font-bold ${isDarkMode ? "text-gray-100" : "text-gray-800"}`}>
              Edit Employee
            </h2>
            <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
              {editingEmployee.fullName || `${editingEmployee.firstName} ${editingEmployee.lastName}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
            }`}
          >
            <X size={20} className={isDarkMode ? "text-gray-400" : "text-gray-500"} />
          </button>
        </div>

        {/* Step Indicator */}
        <div className={`border-b ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}>
          {renderStepIndicator()}
        </div>

        {/* Error Message */}
        {error && (
          <div
            className={`mx-6 mt-4 p-3 rounded-lg border ${
              isDarkMode ? "bg-red-900/30 border-red-700 text-red-300" : "bg-red-100 border-red-300 text-red-700"
            }`}
          >
            {error}
          </div>
        )}

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto p-6">{renderCurrentStep()}</div>

        {/* Footer Navigation */}
        <div
          className={`flex justify-between items-center px-6 py-4 border-t ${
            isDarkMode ? "border-gray-700 bg-gray-700/50" : "border-gray-200 bg-gray-50"
          }`}
        >
          <button
            onClick={prevStep}
            disabled={currentStep === 1}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              isDarkMode
                ? "text-gray-300 hover:bg-gray-600 disabled:hover:bg-transparent"
                : "text-gray-700 hover:bg-gray-200 disabled:hover:bg-transparent"
            }`}
          >
            <ChevronLeft size={18} />
            Previous
          </button>

          <div className="flex items-center gap-2">
            <span className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
              Step {currentStep} of {WIZARD_STEPS.length}
            </span>
          </div>

          {currentStep < WIZARD_STEPS.length ? (
            <button
              onClick={nextStep}
              className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors ${
                isDarkMode ? "bg-slate-700 hover:bg-slate-600" : "bg-slate-600 hover:bg-slate-700"
              }`}
            >
              Next
              <ChevronRight size={18} />
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={isSaving || uploadingFiles}
              className={`flex items-center gap-2 px-6 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                isDarkMode ? "bg-green-700 hover:bg-green-600" : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {isSaving ? (
                uploadingFiles ? "Uploading..." : "Saving..."
              ) : (
                <>
                  <Check size={18} />
                  Save Changes
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default EditEmployeeWizard;
