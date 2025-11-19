import { useState, useEffect } from 'react';
import { Upload, Trash2, Image, RefreshCw, AlertCircle, CheckCircle, X } from 'lucide-react';
import apiService from '../../utils/api/api-service';

export default function LandingGalleryManager({ isDarkMode = false }) {
  const [activeTab, setActiveTab] = useState('landing');
  const [landingImages, setLandingImages] = useState([]);
  const [galleryImages, setGalleryImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [message, setMessage] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0, filename: '' });
  const [uploadMode, setUploadMode] = useState('single'); // 'single' or 'multiple'
  const [convertingFileName, setConvertingFileName] = useState('');

  useEffect(() => {
    fetchImages();
  }, [activeTab]);

  useEffect(() => {
    // Clear selected files when switching tabs or modes
    setSelectedFiles([]);
    const fileInput = document.getElementById('fileInput');
    if (fileInput) fileInput.value = '';
  }, [activeTab, uploadMode]);

  const fetchImages = async () => {
  setLoading(true);
  try {
    let result;
    if (activeTab === 'landing') {
      result = await apiService.profiles.getLandingImages(); // ✅ Use regular endpoint
    } else {
      result = await apiService.profiles.getGalleryImages(); // ✅ Use regular endpoint
    }
    
    if (result.success) {
      // Map to URLs just like EmployeeLanding does
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

  // Convert image to WebP format
  const convertToWebP = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = new window.Image();
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const webpFileName = file.name.replace(/\.(jpg|jpeg|png|gif)$/i, '.webp');
                const webpFile = new File([blob], webpFileName, { type: 'image/webp' });
                resolve(webpFile);
              } else {
                reject(new Error('Failed to convert image to WebP'));
              }
            },
            'image/webp',
            0.80 // Quality 80%
          );
        };
        
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target.result;
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const processFiles = async (files) => {
    if (files.length === 0) return;
    
    // Filter only image files
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      showMessage('error', 'Please select valid image files');
      return;
    }
    
    // If single mode, only take the first image
    const filesToProcess = uploadMode === 'single' ? [imageFiles[0]] : imageFiles;
    
    if (uploadMode === 'single' && imageFiles.length > 1) {
      showMessage('error', 'Single upload mode: Using the first image only.');
    }
    
    setConverting(true);
    
    try {
      // Convert files one by one
      const convertedFiles = [];
      for (let i = 0; i < filesToProcess.length; i++) {
        const file = filesToProcess[i];
        setConvertingFileName(file.name);
        
        try {
          const convertedFile = await convertToWebP(file);
          convertedFiles.push(convertedFile);
          showMessage('success', `Converted: ${file.name} → ${convertedFile.name}`);
        } catch (error) {
          showMessage('error', `Failed to convert: ${file.name}`);
          console.error('Conversion error:', error);
        }
      }
      
      // In single mode, replace files; in multiple mode, append
      if (uploadMode === 'single') {
        setSelectedFiles(convertedFiles);
      } else {
        setSelectedFiles(prev => [...prev, ...convertedFiles]);
      }
      
      if (convertedFiles.length > 0) {
        showMessage('success', `Successfully converted ${convertedFiles.length} image(s) to WebP`);
      }
    } finally {
      setConverting(false);
      setConvertingFileName('');
    }
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    await processFiles(files);
    // Clear the input so the same file can be selected again
    e.target.value = '';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    // Get files from dataTransfer
    const droppedFiles = [];
    
    if (e.dataTransfer.items) {
      // Use DataTransferItemList interface
      for (let i = 0; i < e.dataTransfer.items.length; i++) {
        if (e.dataTransfer.items[i].kind === 'file') {
          const file = e.dataTransfer.items[i].getAsFile();
          if (file) droppedFiles.push(file);
        }
      }
    } else {
      // Use DataTransfer interface
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        droppedFiles.push(e.dataTransfer.files[i]);
      }
    }
    
    await processFiles(droppedFiles);
  };

  const handleRemoveFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
  if (selectedFiles.length === 0) {
    showMessage('error', 'Please select at least one image');
    return;
  }

  setUploading(true);
  setUploadProgress({ current: 0, total: selectedFiles.length, filename: '' });

  try {
    let successCount = 0;
    let failCount = 0;

    // Upload files one by one
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      setUploadProgress({ 
        current: i + 1, 
        total: selectedFiles.length, 
        filename: file.name 
      });

      try {
        let result;
        if (activeTab === 'landing') {
          result = await apiService.profiles.uploadLandingImage(file);
        } else {
          result = await apiService.profiles.uploadGalleryImages([file]);
        }
        
        if (result.success) {
          successCount++;
          console.log(`Successfully uploaded: ${file.name}`);
        } else {
          failCount++;
          console.error(`Failed to upload ${file.name}:`, result.error);
        }
      } catch (error) {
        failCount++;
        console.error(`Error uploading ${file.name}:`, error);
      }

      // Small delay between uploads
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Show summary message
    if (successCount > 0 && failCount === 0) {
      showMessage('success', `Successfully uploaded ${successCount} image(s)`);
    } else if (successCount > 0 && failCount > 0) {
      showMessage('error', `Uploaded ${successCount} image(s), ${failCount} failed`);
    } else {
      showMessage('error', 'All uploads failed');
    }

    // Clear selected files and refresh (direct fetch, no cache)
    setSelectedFiles([]);
    await fetchImages(); // This now uses direct endpoint
    
    const fileInput = document.getElementById('fileInput');
    if (fileInput) fileInput.value = '';
  } catch (error) {
    showMessage('error', 'Upload failed');
    console.error('Upload error:', error);
  } finally {
    setUploading(false);
    setUploadProgress({ current: 0, total: 0, filename: '' });
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
            onClick={() => {
              // Clear both caches before fetching
              if (activeTab === 'landing') {
                apiService.profiles.clearLandingImageCache();
              } else {
                apiService.profiles.clearGalleryImageCache();
              }
              setTimeout(() => fetchImages(), 500);
            }}
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

      {/* Converting Progress */}
      {converting && convertingFileName && (
        <div className={`backdrop-blur-md rounded-xl border p-4 ${
          isDarkMode
            ? "bg-white/5 border-white/10"
            : "bg-white/60 border-white/40"
        }`}>
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
            <div className="flex-1">
              <span className={`font-medium ${
                isDarkMode ? "text-gray-100" : "text-gray-800"
              }`}>
                Converting to WebP...
              </span>
              <p className={`text-sm truncate ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              }`}>
                {convertingFileName}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {uploading && uploadProgress.total > 0 && (
        <div className={`backdrop-blur-md rounded-xl border p-4 ${
          isDarkMode
            ? "bg-white/5 border-white/10"
            : "bg-white/60 border-white/40"
        }`}>
          <div className="flex items-center gap-3 mb-2">
            <RefreshCw className="w-5 h-5 text-red-600 animate-spin" />
            <span className={`font-medium ${
              isDarkMode ? "text-gray-100" : "text-gray-800"
            }`}>
              Uploading {uploadProgress.current} of {uploadProgress.total}
            </span>
          </div>
          <p className={`text-sm truncate ${
            isDarkMode ? "text-gray-400" : "text-gray-600"
          }`}>
            Current: {uploadProgress.filename}
          </p>
          <div className={`mt-3 h-2 rounded-full overflow-hidden ${
            isDarkMode ? "bg-white/10" : "bg-gray-200"
          }`}>
            <div 
              className="h-full bg-red-600 transition-all duration-300"
              style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Upload Section */}
      <div className={`backdrop-blur-md rounded-xl border p-6 ${
        isDarkMode
          ? "bg-white/5 border-white/10"
          : "bg-white/60 border-white/40"
      }`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-xl font-bold flex items-center gap-2 ${
            isDarkMode ? "text-gray-100" : "text-gray-800"
          }`}>
            <Upload className="w-5 h-5" />
            Upload {activeTab === 'landing' ? 'Landing Image' : 'Gallery Images'}
          </h3>
          
          {/* Upload Mode Switch */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
            isDarkMode ? "bg-white/5" : "bg-white/40"
          }`}>
            <span className={`text-sm font-medium ${
              isDarkMode ? "text-gray-300" : "text-gray-600"
            }`}>
              Mode:
            </span>
            <button
              onClick={() => setUploadMode('single')}
              disabled={converting || uploading}
              className={`px-3 py-1 text-sm font-medium rounded transition-all duration-200 disabled:opacity-50 ${
                uploadMode === 'single'
                  ? 'bg-red-600 text-white'
                  : isDarkMode
                    ? 'text-gray-400 hover:text-gray-200'
                    : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Single
            </button>
            <button
              onClick={() => setUploadMode('multiple')}
              disabled={converting || uploading}
              className={`px-3 py-1 text-sm font-medium rounded transition-all duration-200 disabled:opacity-50 ${
                uploadMode === 'multiple'
                  ? 'bg-red-600 text-white'
                  : isDarkMode
                    ? 'text-gray-400 hover:text-gray-200'
                    : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Multiple
            </button>
          </div>
        </div>
        
        <div 
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
            isDragging
              ? isDarkMode
                ? "border-red-500 bg-red-500/10 scale-105"
                : "border-red-500 bg-red-500/5 scale-105"
              : isDarkMode
                ? "border-gray-600 hover:border-red-500 bg-white/5"
                : "border-gray-300 hover:border-red-500 bg-white/50"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            id="fileInput"
            type="file"
            accept="image/*"
            multiple={uploadMode === 'multiple'}
            onChange={handleFileSelect}
            disabled={converting || uploading}
            className="hidden"
          />
          <label htmlFor="fileInput" className={(converting || uploading) ? 'cursor-not-allowed' : 'cursor-pointer'}>
            <Image className={`w-12 h-12 mx-auto mb-4 transition-colors ${
              isDragging
                ? "text-red-500"
                : isDarkMode 
                  ? "text-gray-500" 
                  : "text-gray-400"
            }`} />
            <p className={`font-medium mb-2 ${
              isDarkMode ? "text-gray-300" : "text-gray-700"
            }`}>
              {converting 
                ? 'Converting to WebP...' 
                : uploading
                  ? 'Uploading...'
                  : isDragging
                    ? `Drop ${uploadMode === 'multiple' ? 'images' : 'image'} here`
                    : `Click or drag ${uploadMode === 'multiple' ? 'images' : 'an image'} to convert`
              }
            </p>
            <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
              {uploadMode === 'single'
                ? 'Single image upload - JPG, PNG, GIF'
                : 'Multiple images upload - JPG, PNG, GIF'}
            </p>
            <p className={`text-xs mt-2 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
              Each selected image will be converted to WebP immediately
            </p>
          </label>
        </div>

        {selectedFiles.length > 0 && (
          <div className="mt-4">
            <p className={`text-sm font-medium mb-2 ${
              isDarkMode ? "text-gray-300" : "text-gray-700"
            }`}>
              Ready to upload ({selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''}):
            </p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {selectedFiles.map((file, index) => (
                <div 
                  key={index} 
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    isDarkMode
                      ? "bg-white/5 border-white/10"
                      : "bg-white/40 border-white/30"
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span className={`text-sm truncate ${
                      isDarkMode ? "text-gray-300" : "text-gray-700"
                    }`}>
                      {file.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs whitespace-nowrap ${
                      isDarkMode ? "text-gray-400" : "text-gray-500"
                    }`}>
                      {formatFileSize(file.size)}
                    </span>
                    <button
                      onClick={() => handleRemoveFile(index)}
                      disabled={uploading}
                      className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                        isDarkMode
                          ? "text-red-400 hover:bg-red-500/10"
                          : "text-red-600 hover:bg-red-500/10"
                      }`}
                      title="Remove file"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={handleUpload}
              disabled={uploading || selectedFiles.length === 0}
              className="mt-4 w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''}
                </>
              )}
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