import { useState, useEffect } from 'react';
import { Upload, Trash2, Image, RefreshCw, AlertCircle, CheckCircle, X } from 'lucide-react';
import apiService from '../../utils/api/api-service';

export default function LandingGalleryManager({ isDarkMode = false }) {
  const [activeTab, setActiveTab] = useState('landing');
  const [landingImages, setLandingImages] = useState([]);
  const [galleryImages, setGalleryImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);

  useEffect(() => {
    fetchImages();
  }, [activeTab]);

  const fetchImages = async () => {
    setLoading(true);
    try {
      let result;
      if (activeTab === 'landing') {
        result = await apiService.profiles.getLandingImages();
      } else {
        result = await apiService.profiles.getGalleryImages();
      }
      
      if (result.success) {
        const images = result.data.images.map(img => ({
          ...img,
          url: activeTab === 'landing' 
            ? apiService.profiles.getLandingImageUrl(img.filename)
            : apiService.profiles.getGalleryImageUrl(img.filename)
        }));
        
        if (activeTab === 'landing') {
          setLandingImages(images);
        } else {
          setGalleryImages(images);
        }
      } else {
        showMessage('error', result.error || `Failed to fetch ${activeTab} images`);
      }
    } catch (error) {
      showMessage('error', `Failed to fetch ${activeTab} images`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      showMessage('error', 'Please select at least one image');
      return;
    }

    setUploading(true);

    try {
      let result;
      if (activeTab === 'landing') {
        result = await apiService.profiles.uploadLandingImage(selectedFiles[0]);
      } else {
        result = await apiService.profiles.uploadGalleryImages(selectedFiles);
      }
      
      if (result.success) {
        showMessage('success', result.message || 'Upload successful');
        setSelectedFiles([]);
        fetchImages();
        const fileInput = document.getElementById('fileInput');
        if (fileInput) fileInput.value = '';
      } else {
        showMessage('error', result.error || 'Upload failed');
      }
    } catch (error) {
      showMessage('error', 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (filename) => {
    if (!confirm(`Are you sure you want to delete ${filename}?`)) return;

    try {
      let result;
      if (activeTab === 'landing') {
        result = await apiService.profiles.deleteLandingImage(filename);
      } else {
        result = await apiService.profiles.deleteGalleryImage(filename);
      }
      
      if (result.success) {
        showMessage('success', result.message || 'Image deleted successfully');
        fetchImages();
      } else {
        showMessage('error', result.error || 'Delete failed');
      }
    } catch (error) {
      showMessage('error', 'Delete failed');
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const currentImages = activeTab === 'landing' ? landingImages : galleryImages;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`backdrop-blur-md rounded-xl border p-6 ${
        isDarkMode
          ? "bg-white/5 border-white/10"
          : "bg-white/60 border-white/40"
      }`}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className={`text-2xl font-bold flex items-center gap-2 ${
              isDarkMode ? "text-gray-100" : "text-gray-800"
            }`}>
              <span className="text-2xl">🖼️</span>
              Media Manager
            </h2>
            <p className={`mt-1 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
              Manage landing page carousel and gallery images
            </p>
          </div>
          <button
            onClick={fetchImages}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Tabs */}
        <div className={`flex gap-2 rounded-lg p-1 ${
          isDarkMode ? "bg-white/5" : "bg-white/40"
        }`}>
          <button
            onClick={() => setActiveTab('landing')}
            className={`flex-1 px-6 py-3 font-medium rounded-lg transition-all duration-200 ${
              activeTab === 'landing'
                ? 'bg-red-600 text-white shadow-lg'
                : isDarkMode
                  ? 'text-gray-300 hover:bg-white/10'
                  : 'text-gray-600 hover:bg-white/50'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              Landing Page Carousel
              <span className={`px-2 py-0.5 text-xs rounded-full ${
                activeTab === 'landing' 
                  ? 'bg-white/20 text-white' 
                  : isDarkMode
                    ? 'bg-red-500/20 text-red-400'
                    : 'bg-red-500/20 text-red-700'
              }`}>
                {landingImages.length}
              </span>
            </span>
          </button>
          <button
            onClick={() => setActiveTab('gallery')}
            className={`flex-1 px-6 py-3 font-medium rounded-lg transition-all duration-200 ${
              activeTab === 'gallery'
                ? 'bg-red-600 text-white shadow-lg'
                : isDarkMode
                  ? 'text-gray-300 hover:bg-white/10'
                  : 'text-gray-600 hover:bg-white/50'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              Gallery
              <span className={`px-2 py-0.5 text-xs rounded-full ${
                activeTab === 'gallery' 
                  ? 'bg-white/20 text-white' 
                  : isDarkMode
                    ? 'bg-red-500/20 text-red-400'
                    : 'bg-red-500/20 text-red-700'
              }`}>
                {galleryImages.length}
              </span>
            </span>
          </button>
        </div>
      </div>

      {/* Message Alert */}
      {message && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between backdrop-blur-md ${
            message.type === 'success' 
              ? isDarkMode
                ? 'bg-green-500/20 border-green-500/30 text-green-300'
                : 'bg-green-500/10 border-green-500/20 text-green-700'
              : isDarkMode
                ? 'bg-red-500/20 border-red-500/30 text-red-300'
                : 'bg-red-500/10 border-red-500/20 text-red-700'
          }`}
        >
          <div className="flex items-center gap-3">
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span className="font-medium">{message.text}</span>
          </div>
          <button 
            onClick={() => setMessage(null)} 
            className="text-current hover:opacity-70 transition-opacity"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Upload Section */}
      <div className={`backdrop-blur-md rounded-xl border p-6 ${
        isDarkMode
          ? "bg-white/5 border-white/10"
          : "bg-white/60 border-white/40"
      }`}>
        <h3 className={`text-xl font-bold mb-4 flex items-center gap-2 ${
          isDarkMode ? "text-gray-100" : "text-gray-800"
        }`}>
          <Upload className="w-5 h-5" />
          Upload {activeTab === 'landing' ? 'Landing Image' : 'Gallery Images'}
        </h3>
        
        <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          isDarkMode
            ? "border-gray-600 hover:border-red-500 bg-white/5"
            : "border-gray-300 hover:border-red-500 bg-white/50"
        }`}>
          <input
            id="fileInput"
            type="file"
            accept="image/*"
            multiple={activeTab === 'gallery'}
            onChange={handleFileSelect}
            className="hidden"
          />
          <label htmlFor="fileInput" className="cursor-pointer">
            <Image className={`w-12 h-12 mx-auto mb-4 ${
              isDarkMode ? "text-gray-500" : "text-gray-400"
            }`} />
            <p className={`font-medium mb-2 ${
              isDarkMode ? "text-gray-300" : "text-gray-700"
            }`}>
              Click to select {activeTab === 'gallery' ? 'images' : 'an image'}
            </p>
            <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
              {activeTab === 'landing' 
                ? 'JPG, PNG, GIF, WebP (Max 10MB)'
                : 'Multiple JPG, PNG, GIF, WebP files (Max 10MB each)'}
            </p>
          </label>
        </div>

        {selectedFiles.length > 0 && (
          <div className="mt-4">
            <p className={`text-sm font-medium mb-2 ${
              isDarkMode ? "text-gray-300" : "text-gray-700"
            }`}>
              Selected files:
            </p>
            <div className="space-y-2">
              {selectedFiles.map((file, index) => (
                <div 
                  key={index} 
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    isDarkMode
                      ? "bg-white/5 border-white/10"
                      : "bg-white/40 border-white/30"
                  }`}
                >
                  <span className={`text-sm ${
                    isDarkMode ? "text-gray-300" : "text-gray-700"
                  }`}>
                    {file.name}
                  </span>
                  <span className={`text-xs ${
                    isDarkMode ? "text-gray-400" : "text-gray-500"
                  }`}>
                    {formatFileSize(file.size)}
                  </span>
                </div>
              ))}
            </div>
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="mt-4 w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : `Upload ${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''}`}
            </button>
          </div>
        )}
      </div>

      {/* Images Grid */}
      <div className={`backdrop-blur-md rounded-xl border p-6 ${
        isDarkMode
          ? "bg-white/5 border-white/10"
          : "bg-white/60 border-white/40"
      }`}>
        <h3 className={`text-xl font-bold mb-4 flex items-center gap-2 ${
          isDarkMode ? "text-gray-100" : "text-gray-800"
        }`}>
          <span className="text-lg">{activeTab === 'landing' ? '🎠' : '🖼️'}</span>
          Current {activeTab === 'landing' ? 'Landing' : 'Gallery'} Images ({currentImages.length})
        </h3>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 text-red-600 animate-spin" />
          </div>
        ) : currentImages.length === 0 ? (
          <div className="text-center py-12">
            <Image className={`w-16 h-16 mx-auto mb-4 ${
              isDarkMode ? "text-gray-600" : "text-gray-400"
            }`} />
            <p className={isDarkMode ? "text-gray-400" : "text-gray-500"}>
              No images uploaded yet
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {currentImages.map((image) => (
              <div
                key={image.filename}
                className={`group backdrop-blur-md rounded-xl overflow-hidden border transition-all duration-300 ${
                  isDarkMode
                    ? "bg-white/5 border-white/10 hover:bg-white/10"
                    : "bg-white/60 border-white/40 hover:bg-white/80"
                }`}
              >
                <div className={`aspect-video overflow-hidden ${
                  isDarkMode ? "bg-gray-800" : "bg-gray-200"
                }`}>
                  <img
                    src={image.url}
                    alt={image.filename}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                
                <div className="p-4">
                  <p className={`text-sm font-medium truncate ${
                    isDarkMode ? "text-gray-100" : "text-gray-800"
                  }`} title={image.filename}>
                    {image.filename}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className={`text-xs ${
                      isDarkMode ? "text-gray-400" : "text-gray-500"
                    }`}>
                      {formatFileSize(image.size)}
                    </span>
                    <button
                      onClick={() => handleDelete(image.filename)}
                      className={`p-2 rounded-lg transition-colors ${
                        isDarkMode
                          ? "text-red-400 hover:bg-red-500/10"
                          : "text-red-600 hover:bg-red-500/10"
                      }`}
                      title="Delete image"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className={`text-xs mt-1 ${
                    isDarkMode ? "text-gray-500" : "text-gray-400"
                  }`}>
                    {new Date(image.modified).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}