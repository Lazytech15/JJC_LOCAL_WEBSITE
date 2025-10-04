import { ArrowLeft, FileText, Download, Mail, Phone, MapPin, Calendar, Users, Briefcase } from "lucide-react"
import { Button } from "../../ui/UiComponents"
import { Card, CardContent } from "../../ui/UiComponents"
import { Avatar, AvatarFallback } from "../../ui/UiComponents"

export default function Profile({ employee, employeeData, handleLogout, profileData, profileImage, documentData, isDarkMode }) {
  // Use employeeData which has full information from the API
  const fullEmployee = employeeData || employee

  // Format date helper
  const formatDate = (dateString) => {
    if (!dateString || dateString === "0000-00-00") return "N/A"
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  // Format file size helper
  const formatFileSize = (bytes) => {
    if (!bytes) return "N/A"
    if (bytes < 1024) return bytes + " B"
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
    return (bytes / (1024 * 1024)).toFixed(1) + " MB"
  }

  // Handle document download
  const handleDownload = async (doc) => {
    try {
      // Construct the full URL if it's a relative path
      const downloadUrl = doc.url.startsWith('http') ? doc.url : `${window.location.origin}${doc.url}`

      const response = await fetch(downloadUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = doc.filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Download failed:', error)
      alert('Failed to download document')
    }
  }

  return (
    <div className="space-y-6">
      <h2 className={`text-3xl font-bold ${isDarkMode ? "text-white" : "text-zinc-900"}`}>My Profile</h2>

      {/* Profile Header Card */}
      {/* Profile Header Card */}
      <Card className={`border overflow-hidden ${isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"}`}>
        <CardContent className="p-8 relative">
          {/* Blurred Background */}
          {profileImage && (
            <div
              className="absolute inset-0 opacity-40"
              style={{
                backgroundImage: `url(${profileImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'blur(05px)',
                transform: 'scale(1.1)'
              }}
            />
          )}

          {/* Content */}
          <div className="relative z-10">
            <div className="flex flex-col items-center text-center mb-8">
              <Avatar className={`w-75 h-75 ring-2 mb-10 ${isDarkMode ? "ring-zinc-800" : "ring-zinc-200"}`}>
                {profileImage ? (
                  <img
                    src={profileImage || "/placeholder.svg"}
                    alt={employee?.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <AvatarFallback
                    className={`${isDarkMode ? "bg-zinc-800 text-white" : "bg-zinc-900 text-white"} text-sm font-semibold`}
                  >
                    {employee?.name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                )}
              </Avatar>
              <h3 className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                {fullEmployee?.fullName || fullEmployee?.name}
              </h3>
              <p className={`text-sm mt-1 ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
                {fullEmployee?.position}
              </p>
              <p className={`text-xs mt-1 ${isDarkMode ? "text-zinc-500" : "text-zinc-500"}`}>
                {fullEmployee?.department}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className={`p-4 rounded-xl ${isDarkMode ? "bg-zinc-800/50" : "bg-zinc-50"}`}>
                <label className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
                  Employee ID
                </label>
                <p className={`mt-2 text-lg font-semibold ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                  {fullEmployee?.idNumber}
                </p>
              </div>
              <div className={`p-4 rounded-xl ${isDarkMode ? "bg-zinc-800/50" : "bg-zinc-50"}`}>
                <label className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
                  Status
                </label>
                <p className={`mt-2 text-lg font-semibold ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                  {fullEmployee?.status}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Information Card */}
      <Card className={`border ${isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"}`}>
        <CardContent className="p-6">
          <h3 className={`text-xl font-bold mb-6 ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
            Personal Information
          </h3>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Mail className={`w-5 h-5 mt-0.5 ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`} />
              <div className="flex-1">
                <p className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
                  Email Address
                </p>
                <p className={`mt-1 ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                  {fullEmployee?.email || "N/A"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Phone className={`w-5 h-5 mt-0.5 ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`} />
              <div className="flex-1">
                <p className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
                  Contact Number
                </p>
                <p className={`mt-1 ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                  {fullEmployee?.contactNumber || "N/A"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className={`w-5 h-5 mt-0.5 ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`} />
              <div className="flex-1">
                <p className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
                  Address
                </p>
                <p className={`mt-1 ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                  {fullEmployee?.address || "N/A"}
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 pt-2">
              <div className="flex items-start gap-3">
                <Calendar className={`w-5 h-5 mt-0.5 ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`} />
                <div className="flex-1">
                  <p className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
                    Birth Date
                  </p>
                  <p className={`mt-1 ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                    {formatDate(fullEmployee?.birthDate)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Users className={`w-5 h-5 mt-0.5 ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`} />
                <div className="flex-1">
                  <p className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
                    Age
                  </p>
                  <p className={`mt-1 ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                    {fullEmployee?.age || "N/A"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Users className={`w-5 h-5 mt-0.5 ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`} />
                <div className="flex-1">
                  <p className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
                    Civil Status
                  </p>
                  <p className={`mt-1 ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                    {fullEmployee?.civilStatus || "N/A"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Briefcase className={`w-5 h-5 mt-0.5 ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`} />
                <div className="flex-1">
                  <p className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
                    Hire Date
                  </p>
                  <p className={`mt-1 ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                    {formatDate(fullEmployee?.hireDate)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Government IDs Card */}
      <Card className={`border ${isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"}`}>
        <CardContent className="p-6">
          <h3 className={`text-xl font-bold mb-6 ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
            Government Identification Numbers
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className={`p-4 rounded-xl ${isDarkMode ? "bg-zinc-800/50" : "bg-zinc-50"}`}>
              <label className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
                SSS Number
              </label>
              <p className={`mt-2 font-mono ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                {fullEmployee?.sssNumber || "N/A"}
              </p>
            </div>

            <div className={`p-4 rounded-xl ${isDarkMode ? "bg-zinc-800/50" : "bg-zinc-50"}`}>
              <label className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
                PhilHealth Number
              </label>
              <p className={`mt-2 font-mono ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                {fullEmployee?.philhealthNumber || "N/A"}
              </p>
            </div>

            <div className={`p-4 rounded-xl ${isDarkMode ? "bg-zinc-800/50" : "bg-zinc-50"}`}>
              <label className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
                Pag-IBIG Number
              </label>
              <p className={`mt-2 font-mono ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                {fullEmployee?.pagibigNumber || "N/A"}
              </p>
            </div>

            <div className={`p-4 rounded-xl ${isDarkMode ? "bg-zinc-800/50" : "bg-zinc-50"}`}>
              <label className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
                TIN Number
              </label>
              <p className={`mt-2 font-mono ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                {fullEmployee?.tinNumber || "N/A"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents Card */}
      <Card className={`border ${isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className={`text-xl font-bold ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
              My Documents
            </h3>
            <span className={`text-sm ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
              {documentData?.document_count || 0} {documentData?.document_count === 1 ? 'document' : 'documents'}
            </span>
          </div>

          {documentData?.documents && documentData.documents.length > 0 ? (
            <div className="space-y-3">
              {documentData.documents.map((doc, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${isDarkMode
                    ? "bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800"
                    : "bg-zinc-50 border-zinc-200 hover:bg-zinc-100"
                    }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`p-2 rounded-lg ${isDarkMode ? "bg-zinc-700" : "bg-white"}`}>
                      <FileText className={`w-5 h-5 ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium truncate ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                        {doc.filename}
                      </p>
                      <div className={`flex items-center gap-3 text-xs mt-1 ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
                        <span>{doc.type}</span>
                        <span>•</span>
                        <span>{formatFileSize(doc.size)}</span>
                        <span>•</span>
                        <span>{formatDate(doc.modified)}</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDownload(doc)}
                    className={`ml-2 ${isDarkMode ? "hover:bg-zinc-700 text-zinc-400 hover:text-white" : "hover:bg-zinc-200"}`}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className={`text-center py-12 ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No documents available</p>
            </div>
          )}

          {/* {documentData?.total_size && (
            <div className={`mt-4 pt-4 border-t text-sm ${isDarkMode ? "border-zinc-800 text-zinc-400" : "border-zinc-200 text-zinc-600"}`}>
              Total storage: {formatFileSize(documentData.total_size)}
            </div>
          )} */}
        </CardContent>
      </Card>

      {/* Logout Button */}
      {/* <div className="mt-6">
        <Button
          variant="outline"
          onClick={handleLogout}
          className={`w-full sm:w-auto lg:hidden ${isDarkMode ? "border-zinc-800 text-zinc-400 hover:text-white" : ""}`}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div> */}
    </div>
  )
}