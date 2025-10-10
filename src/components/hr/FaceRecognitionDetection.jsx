import { useState, useEffect, useRef } from "react";
import * as faceapi from "face-api.js";
import apiService from "../../utils/api/api-service";

function FaceRecognitionModal({ onClose, onEmployeeIdentified }) {
    const [isModelLoaded, setIsModelLoaded] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentStream, setCurrentStream] = useState(null);
    const [capturedImages, setCapturedImages] = useState([]);
    const [detectionResult, setDetectionResult] = useState(null);
    const [matchedEmployee, setMatchedEmployee] = useState(null);
    const [error, setError] = useState(null);
    const [cameraActive, setCameraActive] = useState(false);
    const [employees, setEmployees] = useState([]);
    const [labeledDescriptors, setLabeledDescriptors] = useState([]);
    const [showSaveOptions, setShowSaveOptions] = useState(false);
    const [selectedEmployeeForSave, setSelectedEmployeeForSave] = useState("");
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [mode, setMode] = useState("identify");
    const [registrationStep, setRegistrationStep] = useState(0);
    const [facePositionStatus, setFacePositionStatus] = useState(null);
    const [captureCount, setCaptureCount] = useState(0);
    const [autoCapturing, setAutoCapturing] = useState(false);
    const [initializationProgress, setInitializationProgress] = useState({
        stage: "starting",
        progress: 0,
        message: "Initializing...",
    });

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const detectionIntervalRef = useRef(null);
    const captureCountRef = useRef(0);
    const lastCaptureTimeRef = useRef(0);
    const autoCapturingRef = useRef(false);
    const isInitializedRef = useRef(false);

    // Main initialization effect
    useEffect(() => {
        let isMounted = true;

        const initialize = async () => {
            if (isInitializedRef.current) return;

            try {
                console.log("🚀 Starting face recognition initialization...");

                // Stage 1: Load Models
                if (isMounted) {
                    setInitializationProgress({
                        stage: "models",
                        progress: 10,
                        message: "Loading face detection models...",
                    });
                }

                await loadModels();

                if (!isMounted) return;

                // Stage 2: Load Employee Data
                setInitializationProgress({
                    stage: "employees",
                    progress: 60,
                    message: "Loading employee data...",
                });

                await loadEmployeeDescriptors();

                if (!isMounted) return;

                // Stage 3: Complete
                setInitializationProgress({
                    stage: "complete",
                    progress: 100,
                    message: "Ready!",
                });

                isInitializedRef.current = true;
                console.log("✅ Face recognition system initialized successfully");
            } catch (err) {
                console.error("❌ Initialization failed:", err);
                if (isMounted) {
                    setInitializationProgress({
                        stage: "error",
                        progress: 0,
                        message: "Initialization failed",
                    });
                    setError(`Initialization failed: ${err.message}`);
                }
            }
        };

        initialize();

        return () => {
            isMounted = false;
            stopCamera();
            if (detectionIntervalRef.current) {
                clearInterval(detectionIntervalRef.current);
            }
        };
    }, []);

    // Sync ref with state
    useEffect(() => {
        captureCountRef.current = captureCount;
    }, [captureCount]);

    useEffect(() => {
        autoCapturingRef.current = autoCapturing;
        console.log("Auto-capturing state changed:", autoCapturing);
    }, [autoCapturing]);

    const loadModels = async () => {
        try {
            setError(null);
            console.log("Loading face-api.js models...");

            const MODEL_URL = "/models";

            const loadWithTimeout = (promise, timeout = 30000) => {
                return Promise.race([
                    promise,
                    new Promise((_, reject) =>
                        setTimeout(
                            () => reject(new Error("Model loading timeout")),
                            timeout
                        )
                    ),
                ]);
            };

            // Check if models are already loaded
            if (
                faceapi.nets.tinyFaceDetector.isLoaded &&
                faceapi.nets.faceLandmark68Net.isLoaded &&
                faceapi.nets.faceRecognitionNet.isLoaded &&
                faceapi.nets.ssdMobilenetv1.isLoaded
            ) {
                console.log("✅ Models already loaded, skipping...");
                setIsModelLoaded(true);
                return;
            }

            const models = [
                {
                    name: "TinyFaceDetector",
                    loader: () => faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    progress: 20,
                },
                {
                    name: "FaceLandmark68Net",
                    loader: () => faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    progress: 40,
                },
                {
                    name: "FaceRecognitionNet",
                    loader: () => faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
                    progress: 50,
                },
                {
                    name: "SsdMobilenetv1",
                    loader: () => faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
                    progress: 60,
                },
            ];

            for (const model of models) {
                console.log(`Loading ${model.name}...`);
                setInitializationProgress((prev) => ({
                    ...prev,
                    progress: model.progress,
                    message: `Loading ${model.name}...`,
                }));

                await loadWithTimeout(model.loader());
                console.log(`✓ ${model.name} loaded`);
            }

            console.log("✅ All models loaded successfully!");
            setIsModelLoaded(true);
        } catch (err) {
            console.error("❌ Error loading models:", err);
            const errorMessage = `Failed to load face recognition models: ${err.message}. Please check: 1) Models exist in /public/models/ folder, 2) Check browser console for 404 errors, 3) Ensure correct file permissions`;
            setError(errorMessage);
            throw new Error(errorMessage);
        }
    };

    const loadEmployeeDescriptors = async () => {
        try {
            const result = await apiService.employees.getEmployees({ limit: 1000 });

            if (result.success && result.employees) {
                setEmployees(result.employees);

                const descriptors = [];

                for (const employee of result.employees) {
                    try {
                        if (!apiService.profiles || !apiService.profiles.getEmployeeDescriptor) {
                            console.warn('Profile service not configured.');
                            break;
                        }

                        // Use 'id' from the API response
                        const employeeId = employee.id;

                        const descriptorResult = await apiService.profiles.getEmployeeDescriptor(employeeId);

                        let descriptorData = null;

                        if (descriptorResult && descriptorResult.success && descriptorResult.descriptor) {
                            descriptorData = descriptorResult.descriptor;
                        } else if (descriptorResult && descriptorResult.data && descriptorResult.data.descriptor) {
                            descriptorData = descriptorResult.data.descriptor;
                        } else if (Array.isArray(descriptorResult)) {
                            descriptorData = descriptorResult;
                        }

                        if (descriptorData && Array.isArray(descriptorData) && descriptorData.length === 128) {
                            const descriptor = new Float32Array(descriptorData);
                            descriptors.push(
                                new faceapi.LabeledFaceDescriptors(
                                    employeeId.toString(),
                                    [descriptor]
                                )
                            );
                        }
                    } catch (err) {
                        console.log(`- No descriptor for employee ${employee.id}`);
                    }
                }

                setLabeledDescriptors(descriptors);
                console.log(`Successfully loaded ${descriptors.length} employee descriptors`);
            }
        } catch (err) {
            console.error('Error loading employee data:', err);
        }
    };

    const startCamera = async () => {
        try {
            setError(null);

            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: "user",
                },
            });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;

                await new Promise((resolve) => {
                    videoRef.current.onloadedmetadata = () => {
                        videoRef.current.play();
                        resolve();
                    };
                });

                if (canvasRef.current && videoRef.current) {
                    canvasRef.current.width = videoRef.current.videoWidth;
                    canvasRef.current.height = videoRef.current.videoHeight;
                }
            }

            streamRef.current = stream;
            setCurrentStream(stream);
            setCameraActive(true);

            setTimeout(() => {
                if (mode === "register") {
                    startFacePositionDetection();
                } else {
                    startRealTimeDetection();
                }
            }, 500);
        } catch (err) {
            console.error("Error starting camera:", err);
            setError("Failed to access camera. Please grant camera permissions.");
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
            setCurrentStream(null);
        }

        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }

        if (detectionIntervalRef.current) {
            clearInterval(detectionIntervalRef.current);
            detectionIntervalRef.current = null;
        }

        setCameraActive(false);
        setAutoCapturing(false);
    };

    const startFacePositionDetection = () => {
        console.log("🚀 Starting face position detection");

        if (detectionIntervalRef.current) {
            clearInterval(detectionIntervalRef.current);
        }

        const checkFacePosition = async () => {
            if (!videoRef.current || !canvasRef.current || !isModelLoaded) {
                console.log("❌ Detection skipped - missing requirements:", {
                    hasVideo: !!videoRef.current,
                    hasCanvas: !!canvasRef.current,
                    isModelLoaded,
                });
                return;
            }
            if (!videoRef.current.videoWidth || !videoRef.current.videoHeight) {
                console.log("❌ Detection skipped - video not ready:", {
                    width: videoRef.current.videoWidth,
                    height: videoRef.current.videoHeight,
                });
                return;
            }

            try {
                const detections = await faceapi
                    .detectSingleFace(
                        videoRef.current,
                        new faceapi.TinyFaceDetectorOptions()
                    )
                    .withFaceLandmarks();

                console.log(
                    "🔍 Detection result:",
                    detections ? "Face found" : "No face"
                );

                const displaySize = {
                    width: videoRef.current.videoWidth,
                    height: videoRef.current.videoHeight,
                };

                if (
                    canvasRef.current.width !== displaySize.width ||
                    canvasRef.current.height !== displaySize.height
                ) {
                    canvasRef.current.width = displaySize.width;
                    canvasRef.current.height = displaySize.height;
                    console.log("📐 Canvas resized to:", displaySize);
                }

                faceapi.matchDimensions(canvasRef.current, displaySize);

                const context = canvasRef.current.getContext("2d");
                context.clearRect(
                    0,
                    0,
                    canvasRef.current.width,
                    canvasRef.current.height
                );

                const videoCenter = {
                    x: displaySize.width / 2,
                    y: displaySize.height / 2,
                };

                if (detections) {
                    const resizedDetection = faceapi.resizeResults(
                        detections,
                        displaySize
                    );
                    const box = resizedDetection.detection.box;

                    const centerX = box.x + box.width / 2;
                    const centerY = box.y + box.height / 2;

                    const horizontalOffset =
                        Math.abs(centerX - videoCenter.x) / displaySize.width;
                    const verticalOffset =
                        Math.abs(centerY - videoCenter.y) / displaySize.height;
                    const faceSize =
                        (box.width * box.height) / (displaySize.width * displaySize.height);

                    const isCentered = horizontalOffset < 0.2 && verticalOffset < 0.2;
                    const isCorrectSize = faceSize > 0.08 && faceSize < 0.5;
                    const isWellLit = resizedDetection.detection.score > 0.6;

                    let status = {
                        valid: isCentered && isCorrectSize && isWellLit,
                        messages: [],
                    };

                    if (!isCentered) {
                        if (horizontalOffset > 0.2) {
                            status.messages.push(
                                centerX < videoCenter.x ? "Move right" : "Move left"
                            );
                        }
                        if (verticalOffset > 0.2) {
                            status.messages.push(
                                centerY < videoCenter.y ? "Move down" : "Move up"
                            );
                        }
                    }

                    if (!isCorrectSize) {
                        status.messages.push(faceSize < 0.08 ? "Move closer" : "Move back");
                    }

                    if (!isWellLit) {
                        status.messages.push("Poor lighting");
                    }

                    if (status.valid) {
                        status.messages.push("Perfect! Hold steady");
                    }

                    setFacePositionStatus(status);

                    const guideColor = status.valid ? "#10b981" : "#f59e0b";

                    context.strokeStyle = guideColor;
                    context.lineWidth = 4;
                    context.beginPath();
                    context.ellipse(
                        videoCenter.x,
                        videoCenter.y,
                        displaySize.width * 0.25,
                        displaySize.height * 0.35,
                        0,
                        0,
                        2 * Math.PI
                    );
                    context.stroke();

                    context.strokeStyle = status.valid ? "#10b981" : "#ef4444";
                    context.lineWidth = 3;
                    context.strokeRect(box.x, box.y, box.width, box.height);

                    const isAutoCapturingActive = autoCapturingRef.current;
                    const currentCount = captureCountRef.current;

                    const now = Date.now();
                    const timeSinceLastCapture = now - lastCaptureTimeRef.current;

                    if (isAutoCapturingActive) {
                        console.log(
                            `⏱️ [${new Date().toLocaleTimeString()}] Auto-capture status:`,
                            {
                                statusValid: status.valid,
                                autoCapturing: isAutoCapturingActive,
                                captureCount: currentCount,
                                timeSinceLastCapture:
                                    (timeSinceLastCapture / 1000).toFixed(1) + "s",
                                canCapture:
                                    status.valid && isAutoCapturingActive && currentCount < 3,
                                messages: status.messages,
                            }
                        );
                    }

                    if (status.valid && isAutoCapturingActive && currentCount < 3) {
                        if (timeSinceLastCapture > 1500) {
                            console.log("🎯 CAPTURING NOW!");
                            lastCaptureTimeRef.current = now;
                            await captureForRegistration();
                        } else {
                            const remaining = ((1500 - timeSinceLastCapture) / 1000).toFixed(
                                1
                            );
                            console.log(`⏳ Waiting for cooldown... ${remaining}s remaining`);
                        }
                    }
                } else {
                    setFacePositionStatus({
                        valid: false,
                        messages: ["No face detected"],
                    });

                    context.strokeStyle = "#94a3b8";
                    context.lineWidth = 3;
                    context.setLineDash([10, 5]);
                    context.beginPath();
                    context.ellipse(
                        videoCenter.x,
                        videoCenter.y,
                        displaySize.width * 0.25,
                        displaySize.height * 0.35,
                        0,
                        0,
                        2 * Math.PI
                    );
                    context.stroke();
                    context.setLineDash([]);
                }
            } catch (err) {
                console.error("Error during position detection:", err);
            }
        };

        detectionIntervalRef.current = setInterval(checkFacePosition, 100);
    };

    const startRealTimeDetection = () => {
        const detectFaces = async () => {
            if (!videoRef.current || !cameraActive || !isModelLoaded) return;
            if (!videoRef.current.videoWidth || !videoRef.current.videoHeight) return;

            try {
                const detections = await faceapi
                    .detectAllFaces(
                        videoRef.current,
                        new faceapi.TinyFaceDetectorOptions()
                    )
                    .withFaceLandmarks()
                    .withFaceDescriptors();

                if (canvasRef.current && videoRef.current) {
                    const displaySize = {
                        width: videoRef.current.videoWidth,
                        height: videoRef.current.videoHeight,
                    };

                    if (
                        canvasRef.current.width !== displaySize.width ||
                        canvasRef.current.height !== displaySize.height
                    ) {
                        canvasRef.current.width = displaySize.width;
                        canvasRef.current.height = displaySize.height;
                    }

                    faceapi.matchDimensions(canvasRef.current, displaySize);

                    const resizedDetections = faceapi.resizeResults(
                        detections,
                        displaySize
                    );

                    const context = canvasRef.current.getContext("2d");
                    context.clearRect(
                        0,
                        0,
                        canvasRef.current.width,
                        canvasRef.current.height
                    );

                    faceapi.draw.drawDetections(canvasRef.current, resizedDetections);
                    faceapi.draw.drawFaceLandmarks(canvasRef.current, resizedDetections);

                    if (detections.length > 0 && labeledDescriptors.length > 0) {
                        const faceMatcher = new faceapi.FaceMatcher(
                            labeledDescriptors,
                            0.6
                        );

                        resizedDetections.forEach((detection) => {
                            const bestMatch = faceMatcher.findBestMatch(detection.descriptor);

                            const box = detection.detection.box;
                            const drawBox = new faceapi.draw.DrawBox(box, {
                                label: bestMatch.toString(),
                                boxColor: bestMatch.distance < 0.6 ? "#00ff00" : "#ff0000",
                            });
                            drawBox.draw(canvasRef.current);
                        });
                    }
                }
            } catch (err) {
                console.error("Error during real-time detection:", err);
            }

            if (cameraActive) {
                requestAnimationFrame(detectFaces);
            }
        };

        detectFaces();
    };

    const captureForRegistration = async () => {
        if (!videoRef.current || !isModelLoaded) return;
        if (captureCountRef.current >= 3) {
            console.log("❌ Already captured 3 images, stopping");
            setAutoCapturing(false);
            autoCapturingRef.current = false;
            return;
        }

        console.log(`📸 Capturing image ${captureCountRef.current + 1}/3...`);

        try {
            const canvas = document.createElement("canvas");
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(videoRef.current, 0, 0);

            const imageDataUrl = canvas.toDataURL("image/jpeg", 0.95);

            const detections = await faceapi
                .detectSingleFace(videoRef.current, new faceapi.SsdMobilenetv1Options())
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (detections) {
                console.log("✅ Face detected and captured successfully!");

                setCapturedImages((prev) => [
                    ...prev,
                    {
                        image: imageDataUrl,
                        descriptor: detections.descriptor,
                        timestamp: Date.now(),
                    },
                ]);

                const newCount = captureCountRef.current + 1;
                setCaptureCount(newCount);

                console.log(`✅ Capture ${newCount}/3 complete!`);

                if (canvasRef.current) {
                    const ctx = canvasRef.current.getContext("2d");
                    ctx.fillStyle = "rgba(16, 185, 129, 0.3)";
                    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                    setTimeout(() => {
                        if (canvasRef.current) {
                            ctx.clearRect(
                                0,
                                0,
                                canvasRef.current.width,
                                canvasRef.current.height
                            );
                        }
                    }, 200);
                }

                if (newCount >= 3) {
                    console.log("🎉 All 3 captures complete! Stopping auto-capture");
                    setAutoCapturing(false);
                    autoCapturingRef.current = false;
                    setShowSaveOptions(true);
                }
            } else {
                console.log("⚠️ No face detected in capture attempt");
            }
        } catch (err) {
            console.error("❌ Error capturing face:", err);
        }
    };

    const captureAndIdentify = async () => {
        if (!videoRef.current || !isModelLoaded) return;

        try {
            setIsProcessing(true);
            setError(null);
            setDetectionResult(null);
            setMatchedEmployee(null);

            const canvas = document.createElement("canvas");
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(videoRef.current, 0, 0);

            const imageDataUrl = canvas.toDataURL("image/jpeg", 0.95);

            const detections = await faceapi
                .detectSingleFace(videoRef.current, new faceapi.SsdMobilenetv1Options())
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (!detections) {
                setError(
                    "No face detected. Please ensure your face is clearly visible and well-lit."
                );
                setIsProcessing(false);
                return;
            }

            setCapturedImages([
                {
                    image: imageDataUrl,
                    descriptor: detections.descriptor,
                    timestamp: Date.now(),
                },
            ]);

            setDetectionResult({
                detection: detections.detection,
                landmarks: detections.landmarks,
                descriptor: detections.descriptor,
            });

            if (labeledDescriptors.length === 0) {
                setError("No employee face descriptors available for matching.");
                setShowSaveOptions(true);
                setIsProcessing(false);
                return;
            }

            const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6);
            const bestMatch = faceMatcher.findBestMatch(detections.descriptor);

            if (bestMatch.distance < 0.6) {
                const employeeId = bestMatch.label;
                const employee = employees.find(emp => emp.id.toString() === employeeId);

                if (employee) {
                    setMatchedEmployee({
                        ...employee,
                        confidence: (1 - bestMatch.distance) * 100,
                        distance: bestMatch.distance
                    });

                    if (onEmployeeIdentified) {
                        onEmployeeIdentified(employee, detections.descriptor);
                    }
                }
            }
        } catch (err) {
            console.error("Error during face identification:", err);
            setError("Failed to identify face. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    const saveMultipleDescriptors = async () => {
        if (capturedImages.length === 0 || !selectedEmployeeForSave) {
            setError("Please complete all captures and select an employee.");
            return;
        }

        try {
            setIsProcessing(true);
            setError(null);

            const avgDescriptor = new Float32Array(128);
            capturedImages.forEach((capture) => {
                for (let i = 0; i < 128; i++) {
                    avgDescriptor[i] += capture.descriptor[i];
                }
            });

            for (let i = 0; i < 128; i++) {
                avgDescriptor[i] /= capturedImages.length;
            }

            const descriptorArray = Array.from(avgDescriptor);

            // Use the selected employee ID directly
            const result = await apiService.profiles.saveEmployeeDescriptor(
                selectedEmployeeForSave,
                descriptorArray
            );

            if (
                result &&
                (result.success === true || result.status === "success" || result.ok)
            ) {
                setSaveSuccess(true);
                setShowSaveOptions(false);

                await loadEmployeeDescriptors();

                setTimeout(() => {
                    setSaveSuccess(false);
                    resetCapture();
                }, 3000);
            } else {
                throw new Error(
                    result?.error || result?.message || "Failed to save descriptor"
                );
            }
        } catch (err) {
            console.error("Error saving descriptor:", err);
            setError("Failed to save face descriptor: " + err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const resetCapture = () => {
        setCapturedImages([]);
        setDetectionResult(null);
        setMatchedEmployee(null);
        setError(null);
        setShowSaveOptions(false);
        setSaveSuccess(false);
        setSelectedEmployeeForSave("");
        setCaptureCount(0);
        captureCountRef.current = 0;
        setAutoCapturing(false);
        setFacePositionStatus(null);
        lastCaptureTimeRef.current = 0;
    };

    const switchMode = (newMode) => {
        stopCamera();
        resetCapture();
        setMode(newMode);
    };

    const startAutoCapture = () => {
        console.log("🚀 Starting auto-capture mode");
        setCaptureCount(0);
        captureCountRef.current = 0;
        setCapturedImages([]);
        setAutoCapturing(true);
        autoCapturingRef.current = true;
        lastCaptureTimeRef.current = 0;
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 overflow-y-auto">
            <div className="min-h-screen p-2 sm:p-4 flex items-center justify-center">
                <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-6xl max-h-[98vh] overflow-y-auto">
                    {/* Header */}
                    <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 p-4 sm:p-6 rounded-t-2xl sm:rounded-t-3xl z-10">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 sm:gap-4">
                                <div className="text-3xl sm:text-5xl">👤</div>
                                <div>
                                    <h2 className="text-xl sm:text-3xl font-bold text-white">
                                        Face Recognition
                                    </h2>
                                    <p className="text-xs sm:text-base text-indigo-100 mt-1 hidden sm:block">
                                        {mode === "identify"
                                            ? "Identify employees"
                                            : "Register new face"}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 sm:p-3 bg-white/20 hover:bg-white/30 rounded-xl sm:rounded-2xl text-white transition-colors"
                            >
                                <svg
                                    className="w-5 h-5 sm:w-6 sm:h-6"
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

                    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
                        {/* Mode Selector */}
                        <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl sm:rounded-2xl">
                            <button
                                onClick={() => switchMode("identify")}
                                className={`flex-1 px-3 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base transition-all ${mode === "identify"
                                        ? "bg-indigo-600 text-white shadow-lg"
                                        : "text-slate-600 dark:text-slate-400"
                                    }`}
                            >
                                🔍 Identify
                            </button>
                            <button
                                onClick={() => switchMode("register")}
                                className={`flex-1 px-3 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base transition-all ${mode === "register"
                                        ? "bg-purple-600 text-white shadow-lg"
                                        : "text-slate-600 dark:text-slate-400"
                                    }`}
                            >
                                📝 Register
                            </button>
                        </div>

                        {/* Initialization Progress */}
                        {!isModelLoaded && initializationProgress.stage !== "complete" && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                                <div className="flex items-center gap-3 sm:gap-4 mb-3">
                                    <div className="w-8 h-8 sm:w-12 sm:h-12 border-3 sm:border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                    <div className="flex-1">
                                        <h3 className="text-base sm:text-lg font-semibold text-blue-800 dark:text-blue-300">
                                            Initializing System
                                        </h3>
                                        <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-400">
                                            {initializationProgress.message}
                                        </p>
                                    </div>
                                </div>

                                <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2 sm:h-3 overflow-hidden">
                                    <div
                                        className="bg-blue-600 dark:bg-blue-400 h-full transition-all duration-500 ease-out rounded-full"
                                        style={{ width: `${initializationProgress.progress}%` }}
                                    />
                                </div>
                                <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 text-right">
                                    {initializationProgress.progress}%
                                </p>
                            </div>
                        )}

                        {/* Success Message */}
                        {saveSuccess && (
                            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl sm:text-3xl">✅</span>
                                    <div>
                                        <h3 className="text-base sm:text-lg font-semibold text-emerald-800 dark:text-emerald-300">
                                            Success!
                                        </h3>
                                        <p className="text-xs sm:text-sm text-emerald-600 dark:text-emerald-400">
                                            Face registered successfully!
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl sm:text-3xl">❌</span>
                                    <div>
                                        <h3 className="text-base sm:text-lg font-semibold text-red-800 dark:text-red-300">
                                            Error
                                        </h3>
                                        <p className="text-xs sm:text-sm text-red-600 dark:text-red-400">
                                            {error}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Stats Cards */}
                        <div className="grid grid-cols-3 gap-2 sm:gap-4">
                            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl sm:rounded-2xl p-3 sm:p-4">
                                <div className="text-center">
                                    <div className="text-xl sm:text-2xl mb-1">🤖</div>
                                    <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 font-medium">
                                        Status
                                    </p>
                                    <p className="text-sm sm:text-xl font-bold text-blue-800 dark:text-blue-200">
                                        {isModelLoaded ? "Ready" : "Loading"}
                                    </p>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-xl sm:rounded-2xl p-3 sm:p-4">
                                <div className="text-center">
                                    <div className="text-xl sm:text-2xl mb-1">👥</div>
                                    <p className="text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                                        Registered
                                    </p>
                                    <p className="text-sm sm:text-xl font-bold text-emerald-800 dark:text-emerald-200">
                                        {labeledDescriptors.length}
                                    </p>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl sm:rounded-2xl p-3 sm:p-4">
                                <div className="text-center">
                                    <div className="text-xl sm:text-2xl mb-1">📊</div>
                                    <p className="text-xs sm:text-sm text-purple-600 dark:text-purple-400 font-medium">
                                        Employees
                                    </p>
                                    <p className="text-sm sm:text-xl font-bold text-purple-800 dark:text-purple-200">
                                        {employees.length}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Camera Section */}
                        {isModelLoaded && (
                            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl sm:rounded-2xl p-3 sm:p-6 border border-slate-200 dark:border-slate-700">
                                <h3 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-200 mb-3 sm:mb-4 flex items-center gap-2">
                                    <span>📷</span> Camera Feed
                                </h3>

                                <div className="space-y-3 sm:space-y-4">
                                    <div className="relative bg-slate-900 rounded-lg sm:rounded-xl overflow-hidden aspect-video">
                                        <video
                                            ref={videoRef}
                                            autoPlay
                                            muted
                                            playsInline
                                            className="w-full h-full object-cover"
                                        />
                                        <canvas
                                            ref={canvasRef}
                                            className="absolute top-0 left-0 w-full h-full pointer-events-none"
                                            style={{ objectFit: "cover" }}
                                        />

                                        {mode === "register" &&
                                            cameraActive &&
                                            facePositionStatus && (
                                                <div className="absolute top-2 sm:top-4 left-2 sm:left-4 right-2 sm:right-4">
                                                    <div
                                                        className={`px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl backdrop-blur-md ${facePositionStatus.valid
                                                                ? "bg-emerald-500/90"
                                                                : "bg-amber-500/90"
                                                            }`}
                                                    >
                                                        <p className="text-white text-xs sm:text-sm font-semibold text-center">
                                                            {facePositionStatus.messages.join(" • ")}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                        {mode === "register" && autoCapturing && (
                                            <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 right-2 sm:right-4">
                                                <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl">
                                                    <p className="text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-semibold text-center mb-2">
                                                        Auto-capturing: {captureCount} / 3
                                                    </p>
                                                    <div className="flex gap-1 sm:gap-2 mb-2">
                                                        {[0, 1, 2].map((i) => (
                                                            <div
                                                                key={i}
                                                                className={`flex-1 h-1.5 sm:h-2 rounded-full transition-colors ${i < captureCount
                                                                        ? "bg-emerald-500"
                                                                        : "bg-slate-300 dark:bg-slate-600"
                                                                    }`}
                                                            />
                                                        ))}
                                                    </div>
                                                    <div className="text-xs text-slate-600 dark:text-slate-400 text-center">
                                                        {facePositionStatus?.valid ? (
                                                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                                                ✓ Ready to capture
                                                            </span>
                                                        ) : (
                                                            <span className="text-amber-600 dark:text-amber-400">
                                                                Waiting for position...
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {!cameraActive && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-slate-800/80 backdrop-blur-sm">
                                                <div className="text-center text-white px-4">
                                                    <div className="text-4xl sm:text-6xl mb-2 sm:mb-4">
                                                        📷
                                                    </div>
                                                    <p className="text-base sm:text-lg font-semibold">
                                                        Camera is off
                                                    </p>
                                                    <p className="text-xs sm:text-sm text-slate-400 mt-1 sm:mt-2">
                                                        Click "Start Camera" to begin
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Camera Controls */}
                                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                                        {!cameraActive ? (
                                            <button
                                                onClick={startCamera}
                                                disabled={!isModelLoaded}
                                                className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 disabled:from-slate-400 disabled:to-slate-500 text-white rounded-xl font-semibold transition-all text-sm sm:text-lg disabled:cursor-not-allowed"
                                            >
                                                Start Camera
                                            </button>
                                        ) : mode === "identify" ? (
                                            <>
                                                <button
                                                    onClick={stopCamera}
                                                    className="flex-1 px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl font-semibold transition-all text-sm sm:text-lg"
                                                >
                                                    Stop Camera
                                                </button>
                                                <button
                                                    onClick={captureAndIdentify}
                                                    disabled={isProcessing}
                                                    className="flex-1 px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-slate-400 disabled:to-slate-500 text-white rounded-xl font-semibold transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-lg"
                                                >
                                                    {isProcessing ? (
                                                        <>
                                                            <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                            Processing...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span>📸</span>
                                                            Capture & Identify
                                                        </>
                                                    )}
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={stopCamera}
                                                    className="flex-1 px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl font-semibold transition-all text-sm sm:text-lg"
                                                >
                                                    Stop
                                                </button>
                                                {!autoCapturing ? (
                                                    <button
                                                        onClick={startAutoCapture}
                                                        disabled={isProcessing}
                                                        className="flex-1 px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-slate-400 disabled:to-slate-500 text-white rounded-xl font-semibold transition-all disabled:cursor-not-allowed text-sm sm:text-lg"
                                                    >
                                                        <span className="flex items-center justify-center gap-2">
                                                            <span>🎯</span>
                                                            Start Registration (3 photos)
                                                        </span>
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => setAutoCapturing(false)}
                                                        className="flex-1 px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl font-semibold transition-all text-sm sm:text-lg"
                                                    >
                                                        Cancel Auto-Capture
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Registration Results */}
                        {mode === "register" && capturedImages.length > 0 && (
                            <div className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-slate-200 dark:border-slate-700">
                                <h3 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-200 mb-3 sm:mb-4">
                                    Captured Images ({capturedImages.length}/3)
                                </h3>
                                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                                    {capturedImages.map((capture, index) => (
                                        <div key={index} className="relative">
                                            <img
                                                src={capture.image}
                                                alt={`Capture ${index + 1}`}
                                                className="w-full rounded-lg sm:rounded-xl border-2 border-emerald-500"
                                            />
                                            <div className="absolute top-1 right-1 sm:top-2 sm:right-2 bg-emerald-500 text-white rounded-full w-5 h-5 sm:w-8 sm:h-8 flex items-center justify-center text-xs sm:text-sm font-bold">
                                                {index + 1}
                                            </div>
                                        </div>
                                    ))}
                                    {[...Array(3 - capturedImages.length)].map((_, index) => (
                                        <div key={`empty-${index}`} className="relative">
                                            <div className="w-full aspect-square bg-slate-100 dark:bg-slate-700 rounded-lg sm:rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center">
                                                <span className="text-2xl sm:text-4xl text-slate-400">
                                                    📷
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {capturedImages.length === 3 && showSaveOptions && (
                                    <div className="mt-4 sm:mt-6 space-y-3 sm:space-y-4">
                                        <div>
                                            <label className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                                Select Employee to Register
                                            </label>
                                            <select
                                                value={selectedEmployeeForSave}
                                                onChange={(e) => setSelectedEmployeeForSave(e.target.value)}
                                                className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg sm:rounded-xl text-slate-800 dark:text-slate-200 text-sm sm:text-base"
                                            >
                                                <option value="">Choose an employee...</option>
                                                {employees.map(emp => (
                                                    <option key={emp.id} value={emp.id}>
                                                        {emp.firstName} {emp.lastName} - {emp.idNumber}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <button
                                            onClick={saveMultipleDescriptors}
                                            disabled={!selectedEmployeeForSave || isProcessing}
                                            className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 disabled:from-slate-400 disabled:to-slate-500 text-white rounded-xl font-semibold transition-all disabled:cursor-not-allowed text-sm sm:text-lg"
                                        >
                                            {isProcessing ? (
                                                <span className="flex items-center justify-center gap-2">
                                                    <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                    Saving...
                                                </span>
                                            ) : (
                                                "💾 Save Face Registration"
                                            )}
                                        </button>

                                        <button
                                            onClick={resetCapture}
                                            className="w-full px-4 sm:px-6 py-2 sm:py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg sm:rounded-xl font-medium transition-all text-sm sm:text-base"
                                        >
                                            Retake Photos
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Identification Results */}
                        {mode === "identify" &&
                            (capturedImages.length > 0 || matchedEmployee) && (
                                <div className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-slate-200 dark:border-slate-700">
                                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                                        <h3 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-200">
                                            Identification Results
                                        </h3>
                                        <button
                                            onClick={resetCapture}
                                            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg font-medium transition-colors text-xs sm:text-sm"
                                        >
                                            Clear
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                        {capturedImages.length > 0 && (
                                            <div>
                                                <h4 className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                                    Captured Image
                                                </h4>
                                                <img
                                                    src={capturedImages[0].image}
                                                    alt="Captured face"
                                                    className="w-full rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-700"
                                                />
                                            </div>
                                        )}

                                        {matchedEmployee ? (
                                            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-xl p-4 sm:p-6">
                                                <div className="flex items-center gap-2 mb-3 sm:mb-4">
                                                    <span className="text-2xl sm:text-3xl">✅</span>
                                                    <h4 className="text-base sm:text-lg font-bold text-emerald-700 dark:text-emerald-300">
                                                        Employee Identified
                                                    </h4>
                                                </div>

                                                <div className="space-y-2 sm:space-y-3">
                                                    <div>
                                                        <p className="text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                                                            Name
                                                        </p>
                                                        <p className="text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-200">
                                                            {matchedEmployee.firstName} {matchedEmployee.middleName} {matchedEmployee.lastName}
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <p className="text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                                                            Employee ID
                                                        </p>
                                                        <p className="text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-200">
                                                            {matchedEmployee.idNumber || matchedEmployee.id}
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <p className="text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                                                            Confidence
                                                        </p>
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex-1 bg-emerald-200 dark:bg-emerald-800 rounded-full h-2 sm:h-3">
                                                                <div
                                                                    className="bg-emerald-600 dark:bg-emerald-400 h-2 sm:h-3 rounded-full transition-all duration-500"
                                                                    style={{
                                                                        width: `${matchedEmployee.confidence}%`,
                                                                    }}
                                                                ></div>
                                                            </div>
                                                            <span className="text-base sm:text-lg font-bold text-emerald-700 dark:text-emerald-300">
                                                                {matchedEmployee.confidence.toFixed(1)}%
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : showSaveOptions ? (
                                            <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 rounded-xl p-4 sm:p-6">
                                                <div className="flex items-center gap-2 mb-3 sm:mb-4">
                                                    <span className="text-2xl sm:text-3xl">💾</span>
                                                    <h4 className="text-base sm:text-lg font-bold text-amber-700 dark:text-amber-300">
                                                        Register This Face
                                                    </h4>
                                                </div>

                                                <p className="text-amber-600 dark:text-amber-400 mb-3 sm:mb-4 text-xs sm:text-sm">
                                                    No match found. Switch to Register mode for better
                                                    accuracy.
                                                </p>

                                                <button
                                                    onClick={() => switchMode("register")}
                                                    className="w-full px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg sm:rounded-xl font-semibold transition-all text-sm sm:text-base"
                                                >
                                                    Switch to Registration Mode
                                                </button>
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            )}

                        {/* Instructions */}
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                            <h3 className="text-base sm:text-lg font-bold text-blue-800 dark:text-blue-300 mb-2 sm:mb-3 flex items-center gap-2">
                                <span>📝</span>{" "}
                                {mode === "identify" ? "How to Identify" : "How to Register"}
                            </h3>
                            {mode === "identify" ? (
                                <ol className="space-y-1.5 sm:space-y-2 text-blue-700 dark:text-blue-400 text-xs sm:text-sm">
                                    <li className="flex items-start gap-2">
                                        <span className="font-bold shrink-0">1.</span>
                                        <span>
                                            Click "Start Camera" and allow camera permissions
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="font-bold shrink-0">2.</span>
                                        <span>
                                            Position your face clearly in front of the camera
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="font-bold shrink-0">3.</span>
                                        <span>Click "Capture & Identify" to match your face</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="font-bold shrink-0">4.</span>
                                        <span>
                                            The system will identify you if you're registered
                                        </span>
                                    </li>
                                </ol>
                            ) : (
                                <ol className="space-y-1.5 sm:space-y-2 text-blue-700 dark:text-blue-400 text-xs sm:text-sm">
                                    <li className="flex items-start gap-2">
                                        <span className="font-bold shrink-0">1.</span>
                                        <span>
                                            Click "Start Camera" and allow camera permissions
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="font-bold shrink-0">2.</span>
                                        <span>
                                            Position your face in the oval guide - keep it centered
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="font-bold shrink-0">3.</span>
                                        <span>
                                            Click "Start Registration" - the system will auto-capture
                                            3 photos
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="font-bold shrink-0">4.</span>
                                        <span>
                                            Follow on-screen instructions (move closer, left, right,
                                            etc.)
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="font-bold shrink-0">5.</span>
                                        <span>
                                            Hold steady when the guide turns green for best results
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="font-bold shrink-0">6.</span>
                                        <span>
                                            Select employee and save - 3 photos = higher accuracy!
                                        </span>
                                    </li>
                                </ol>
                            )}
                        </div>

                        {/* Tips */}
                        <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                            <h3 className="text-base sm:text-lg font-bold text-purple-800 dark:text-purple-300 mb-2 sm:mb-3 flex items-center gap-2">
                                <span>💡</span> Tips for Best Results
                            </h3>
                            <ul className="space-y-1.5 sm:space-y-2 text-purple-700 dark:text-purple-400 text-xs sm:text-sm">
                                <li className="flex items-start gap-2">
                                    <span className="shrink-0">✓</span>
                                    <span>
                                        <strong>Good lighting:</strong> Face the light source, avoid
                                        backlighting
                                    </span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="shrink-0">✓</span>
                                    <span>
                                        <strong>Remove accessories:</strong> Take off glasses, hats,
                                        or masks
                                    </span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="shrink-0">✓</span>
                                    <span>
                                        <strong>Keep steady:</strong> Hold your phone/device still
                                        during capture
                                    </span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="shrink-0">✓</span>
                                    <span>
                                        <strong>Neutral expression:</strong> Look straight at the
                                        camera, no smiling
                                    </span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="shrink-0">✓</span>
                                    <span>
                                        <strong>Multiple angles:</strong> Registration mode captures
                                        3 photos for accuracy
                                    </span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default FaceRecognitionModal;
