import React, { useState, useRef, useEffect } from "react";

// Combined FileUpload and LivePreview component
const CombinedDetection = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [streamKey, setStreamKey] = useState(0);
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);
  const [processingStatus, setProcessingStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [totalFrames, setTotalFrames] = useState(0);
  const [processedFrames, setProcessedFrames] = useState(0);
  const fileInputRef = useRef();

  // Check current video status on component mount
  useEffect(() => {
    checkCurrentVideo();
  }, []);

  // Update progress when frames change
  useEffect(() => {
    if (totalFrames > 0) {
      const progressPercentage = (processedFrames / totalFrames) * 100;
      setProgress(progressPercentage);
    }
  }, [processedFrames, totalFrames]);

  // Blinking effect when accident is detected
  useEffect(() => {
    if (result?.accident_detected) {
      setIsBlinking(true);
      const blinkInterval = setInterval(() => {
        setIsBlinking((prev) => !prev);
      }, 500);

      // Stop blinking after 10 seconds
      const stopBlinking = setTimeout(() => {
        clearInterval(blinkInterval);
        setIsBlinking(false);
      }, 10000);

      return () => {
        clearInterval(blinkInterval);
        clearTimeout(stopBlinking);
      };
    }
  }, [result?.accident_detected]);

  const checkCurrentVideo = async () => {
    try {
      const response = await fetch("http://localhost:8000/current-live-video");
      if (response.ok) {
        const data = await response.json();
        setCurrentVideo(data);
      }
    } catch (error) {
      console.error("Error checking current video:", error);
    }
  };

  const handleFiles = (files) => {
    const file = files[0];
    if (!file) return;

    // Check file type
    const validTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "video/mp4",
      "video/avi",
      "video/mov",
      "video/mkv",
      "video/wmv",
      "video/flv",
      "video/webm",
    ];
    if (!validTypes.includes(file.type)) {
      alert(
        "❌ Please upload a valid image (JPG, PNG) or video (MP4, AVI, MOV, MKV, WMV, FLV, WEBM) file"
      );
      return;
    }

    // Check file size (max 200MB)
    if (file.size > 200 * 1024 * 1024) {
      alert("❌ File size must be less than 200MB");
      return;
    }

    setSelectedFile(file);
    setResult(null);
    setIsBlinking(false);
    setProcessingStatus("");
    setProgress(0);
    setTotalFrames(0);
    setProcessedFrames(0);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  // Simulate frame processing progress for videos
  const simulateFrameProgress = (totalFrameCount) => {
    setTotalFrames(totalFrameCount);
    setProcessedFrames(0);

    const progressInterval = setInterval(() => {
      setProcessedFrames((prev) => {
        const newCount = prev + Math.floor(Math.random() * 5) + 1;
        if (newCount >= totalFrameCount) {
          clearInterval(progressInterval);
          return totalFrameCount;
        }
        return newCount;
      });
    }, 100);

    return progressInterval;
  };

  // Combined function for detection and live preview
  const processFileAndStartLive = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setResult(null);
    setIsBlinking(false);
    setProgress(0);

    try {
      const formData = new FormData();
      const isVideo = selectedFile.type.startsWith("video/");

      if (isVideo) {
        // Step 1: Upload for live preview first
        setProcessingStatus("⏳ Uploading video for live preview...");
        formData.append("video", selectedFile);

        const liveResponse = await fetch(
          "http://localhost:8000/upload-live-video",
          {
            method: "POST",
            body: formData,
          }
        );

        if (!liveResponse.ok) {
          throw new Error("Failed to upload video for live preview");
        }

        // Step 2: Start live preview immediately
        setProcessingStatus("🎥 Starting live detection stream...");
        setIsLiveActive(true);
        setStreamKey((prev) => prev + 1);
        await checkCurrentVideo();

        // Step 3: Process for detection analysis with progress tracking
        setProcessingStatus("⏳ Processing video frames...");

        // Estimate frame count (rough calculation)
        const estimatedFrames = Math.floor(
          (selectedFile.size / 1024 / 1024) * 30
        ); // Rough estimate
        const progressInterval = simulateFrameProgress(estimatedFrames);

        const detectFormData = new FormData();
        detectFormData.append("video", selectedFile);

        const detectResponse = await fetch(
          "http://localhost:8000/detect-video",
          {
            method: "POST",
            body: formData,
          }
        );

        clearInterval(progressInterval);

        if (!detectResponse.ok) {
          const errorData = await detectResponse.json().catch(() => null);
          throw new Error(
            errorData?.detail || `HTTP error! status: ${detectResponse.status}`
          );
        }

        const detectData = await detectResponse.json();
        setResult({
          type: "video",
          ...detectData,
        });
        setProcessingStatus("✅ Analysis complete!");
        setProgress(100);
      } else {
        // For images, show simple progress
        setProcessingStatus("⏳ Processing image analysis...");
        setProgress(25);

        formData.append("frame", selectedFile);

        const response = await fetch("http://localhost:8000/detect", {
          method: "POST",
          body: formData,
        });

        setProgress(75);

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(
            errorData?.detail || `HTTP error! status: ${response.status}`
          );
        }

        const data = await response.json();
        setResult({
          type: "image",
          ...data,
        });
        setProcessingStatus("✅ Analysis complete!");
        setProgress(100);
      }
    } catch (error) {
      console.error("Error processing file:", error);
      setResult({
        type: "error",
        message:
          error.message ||
          "Failed to process file. Please check your connection and try again.",
      });
      setProcessingStatus("❌ Processing failed");
      setProgress(0);
    } finally {
      setIsProcessing(false);
      // Clear processing status after 3 seconds
      setTimeout(() => {
        setProcessingStatus("");
        setProgress(0);
        setTotalFrames(0);
        setProcessedFrames(0);
      }, 3000);
    }
  };

  const resetUpload = async () => {
    setSelectedFile(null);
    setResult(null);
    setIsLiveActive(false);
    setIsBlinking(false);
    setProcessingStatus("");
    setProgress(0);
    setTotalFrames(0);
    setProcessedFrames(0);

    // Clear live video
    try {
      await fetch("http://localhost:8000/clear-live-video", {
        method: "DELETE",
      });
      setCurrentVideo(null);
      setStreamKey((prev) => prev + 1);
    } catch (error) {
      console.error("Error clearing live video:", error);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const isVideo = selectedFile?.type.startsWith("video/");

  return (
    <div
      style={{
        backgroundColor:
          isBlinking && result?.accident_detected ? "#ffebee" : "white",
        borderRadius: "10px",
        padding: "30px",
        boxShadow:
          isBlinking && result?.accident_detected
            ? "0 4px 25px rgba(244, 67, 54, 0.4)"
            : "0 4px 15px rgba(0,0,0,0.1)",
        marginBottom: "40px",
        border:
          isBlinking && result?.accident_detected
            ? "3px solid #f44336"
            : "1px solid transparent",
        transition: "all 0.3s ease",
      }}
    >
      <h2
        style={{
          textAlign: "center",
          marginBottom: "30px",
          color: isBlinking && result?.accident_detected ? "#d32f2f" : "#333",
          fontSize: isBlinking && result?.accident_detected ? "28px" : "24px",
          transition: "all 0.3s ease",
        }}
      >
        {isBlinking && result?.accident_detected
          ? "🚨 ACCIDENT ALERT! 🚨"
          : "🚗 AI Detection & Live Preview"}
      </h2>

      {/* Upload Area */}
      {!selectedFile && (
        <div
          style={{
            border: `3px dashed ${dragActive ? "#007bff" : "#ddd"}`,
            borderRadius: "10px",
            padding: "60px 20px",
            textAlign: "center",
            backgroundColor: dragActive ? "#f8f9fa" : "#fafafa",
            cursor: "pointer",
            transition: "all 0.3s ease",
            marginBottom: "20px",
          }}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div style={{ fontSize: "4rem", marginBottom: "20px" }}>
            {dragActive ? "⬇️" : "📁"}
          </div>
          <h3 style={{ color: "#333", marginBottom: "10px" }}>
            {dragActive ? "Drop your file here" : "Choose or drag a file"}
          </h3>
          <p style={{ color: "#666", fontSize: "16px" }}>
            Supports: JPG, PNG images and MP4, AVI, MOV, MKV, WMV, FLV, WEBM
            videos (Max: 200MB)
          </p>
          <button
            style={{
              padding: "12px 24px",
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "16px",
              fontWeight: "bold",
              cursor: "pointer",
              marginTop: "15px",
            }}
          >
            📂 Browse Files
          </button>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleChange}
        style={{ display: "none" }}
      />

      {/* File Info */}
      {selectedFile && (
        <div style={{ marginBottom: "30px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
              padding: "15px",
              backgroundColor: "#f8f9fa",
              borderRadius: "8px",
            }}
          >
            <div>
              <strong style={{ color: "#333" }}>📄 {selectedFile.name}</strong>
              <br />
              <small style={{ color: "#666" }}>
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB •{" "}
                {selectedFile.type}
              </small>
            </div>
            <button
              onClick={resetUpload}
              style={{
                padding: "8px 16px",
                backgroundColor: "#dc3545",
                color: "white",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
              }}
            >
              ❌ Remove
            </button>
          </div>

          {/* Processing Status */}
          {processingStatus && (
            <div
              style={{
                padding: "15px",
                marginBottom: "20px",
                backgroundColor: processingStatus.includes("❌")
                  ? "#f8d7da"
                  : processingStatus.includes("✅")
                  ? "#d4edda"
                  : "#e3f2fd",
                border: `2px solid ${
                  processingStatus.includes("❌")
                    ? "#dc3545"
                    : processingStatus.includes("✅")
                    ? "#28a745"
                    : "#2196f3"
                }`,
                borderRadius: "8px",
                textAlign: "center",
                color: processingStatus.includes("❌")
                  ? "#721c24"
                  : processingStatus.includes("✅")
                  ? "#155724"
                  : "#1565c0",
                fontWeight: "bold",
                fontSize: "16px",
              }}
            >
              {processingStatus}
            </div>
          )}

          {/* Progress Bar */}
          {isProcessing && (
            <div style={{ marginBottom: "20px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "8px",
                }}
              >
                <span style={{ fontSize: "14px", color: "#666" }}>
                  {isVideo ? "Frame Processing Progress" : "Analysis Progress"}
                </span>
                <span
                  style={{
                    fontSize: "14px",
                    color: "#666",
                    fontWeight: "bold",
                  }}
                >
                  {progress.toFixed(1)}%
                </span>
              </div>

              {/* Progress Bar Container */}
              <div
                style={{
                  width: "100%",
                  height: "20px",
                  backgroundColor: "#e0e0e0",
                  borderRadius: "10px",
                  overflow: "hidden",
                  border: "2px solid #ddd",
                }}
              >
                <div
                  style={{
                    width: `${progress}%`,
                    height: "100%",
                    backgroundColor: progress === 100 ? "#28a745" : "#2196f3",
                    borderRadius: "8px",
                    transition: "width 0.3s ease",
                    background:
                      progress === 100
                        ? "#28a745"
                        : "linear-gradient(90deg, #2196f3 0%, #21cbf3 50%, #2196f3 100%)",
                    backgroundSize: "200% 100%",
                    animation:
                      progress < 100
                        ? "progressAnimation 2s linear infinite"
                        : "none",
                  }}
                />
              </div>

              {/* Frame Counter for Videos */}
              {isVideo && totalFrames > 0 && (
                <div style={{ textAlign: "center", marginTop: "8px" }}>
                  <small style={{ color: "#666" }}>
                    Frames: {processedFrames} / {totalFrames}
                  </small>
                </div>
              )}
            </div>
          )}

          {/* Single Combined Button */}
          <div style={{ textAlign: "center" }}>
            <button
              onClick={processFileAndStartLive}
              disabled={isProcessing}
              style={{
                padding: "15px 40px",
                fontSize: "18px",
                backgroundColor: isProcessing ? "#6c757d" : "#28a745",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: isProcessing ? "not-allowed" : "pointer",
                fontWeight: "bold",
                transform:
                  isBlinking && result?.accident_detected
                    ? "scale(1.05)"
                    : "scale(1)",
                transition: "all 0.3s ease",
              }}
            >
              {isProcessing
                ? "⏳ Processing..."
                : `🔍 Start Analysis ${isVideo ? "& Live Detection" : ""}`}
            </button>
          </div>
        </div>
      )}

      {/* Live Stream Display */}
      {isVideo && (isLiveActive || isProcessing) && (
        <div style={{ marginBottom: "30px" }}>
          <h3
            style={{
              textAlign: "center",
              color:
                isBlinking && result?.accident_detected ? "#d32f2f" : "#333",
              marginBottom: "20px",
              fontSize:
                isBlinking && result?.accident_detected ? "22px" : "18px",
              transition: "all 0.3s ease",
            }}
          >
            🎥 Live Detection Stream
          </h3>
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                border:
                  isBlinking && result?.accident_detected
                    ? "4px solid #f44336"
                    : "3px solid #007bff",
                borderRadius: "10px",
                padding: "10px",
                backgroundColor: "#000",
                display: "inline-block",
                boxShadow:
                  isBlinking && result?.accident_detected
                    ? "0 0 20px rgba(244, 67, 54, 0.6)"
                    : "none",
                transition: "all 0.3s ease",
              }}
            >
              <img
                key={streamKey}
                src={`http://localhost:8000/live-preview?t=${Date.now()}`}
                alt="Live Detection Stream"
                style={{
                  maxWidth: "100%",
                  maxHeight: "480px",
                  borderRadius: "8px",
                  display: "block",
                  filter:
                    isBlinking && result?.accident_detected
                      ? "brightness(1.2)"
                      : "brightness(1)",
                  transition: "all 0.3s ease",
                }}
                onError={(e) => {
                  console.error("Stream error:", e);
                }}
              />
            </div>
            <p
              style={{
                color:
                  isBlinking && result?.accident_detected ? "#d32f2f" : "#666",
                marginTop: "15px",
                fontSize: "14px",
                fontWeight:
                  isBlinking && result?.accident_detected ? "bold" : "normal",
                transition: "all 0.3s ease",
              }}
            >
              {isBlinking && result?.accident_detected
                ? "🚨 ACCIDENT DETECTED IN LIVE STREAM!"
                : isProcessing
                ? "🟡 Setting up live detection stream..."
                : "🟢 Live detection is running on your uploaded video"}
            </p>
          </div>
        </div>
      )}

      {/* Results Display */}
      {result && (
        <div
          style={{
            padding: "20px",
            borderRadius: "8px",
            backgroundColor:
              result.type === "error"
                ? "#f8d7da"
                : result.accident_detected
                ? isBlinking
                  ? "#ffcdd2"
                  : "#f8d7da"
                : "#d4edda",
            border: `3px solid ${
              result.type === "error"
                ? "#dc3545"
                : result.accident_detected
                ? "#f44336"
                : "#28a745"
            }`,
            boxShadow:
              result.accident_detected && isBlinking
                ? "0 0 15px rgba(244, 67, 54, 0.5)"
                : "none",
            transition: "all 0.3s ease",
          }}
        >
          <h3
            style={{
              color:
                result.type === "error"
                  ? "#721c24"
                  : result.accident_detected
                  ? "#d32f2f"
                  : "#155724",
              marginBottom: "15px",
              textAlign: "center",
              fontSize:
                result.accident_detected && isBlinking ? "24px" : "20px",
              fontWeight: result.accident_detected ? "bold" : "normal",
              transition: "all 0.3s ease",
            }}
          >
            {result.type === "error"
              ? "❌ Error"
              : result.accident_detected
              ? "🚨 ACCIDENT DETECTED!"
              : "✅ No Accident Detected"}
          </h3>

          {result.type === "error" ? (
            <p style={{ color: "#721c24", textAlign: "center" }}>
              {result.message}
            </p>
          ) : (
            <div>
              <p
                style={{
                  color: result.accident_detected ? "#d32f2f" : "#155724",
                  textAlign: "center",
                  fontSize: "16px",
                  fontWeight: result.accident_detected ? "bold" : "normal",
                }}
              >
                {result.type === "video"
                  ? `Analysis complete. ${
                      result.total_frames || 0
                    } frames processed.`
                  : "Image analysis complete."}
              </p>

              {result.confidence && (
                <p
                  style={{
                    textAlign: "center",
                    marginTop: "10px",
                    color: result.accident_detected ? "#d32f2f" : "#666",
                    fontSize: result.accident_detected ? "18px" : "14px",
                    fontWeight: result.accident_detected ? "bold" : "normal",
                  }}
                >
                  <strong>Confidence:</strong>{" "}
                  {(result.confidence * 100).toFixed(1)}%
                </p>
              )}

              {result.accident_detected && (
                <div
                  style={{
                    marginTop: "15px",
                    padding: "10px",
                    backgroundColor: isBlinking ? "#ffebee" : "#fff3e0",
                    borderRadius: "5px",
                    textAlign: "center",
                    border: "2px solid #f44336",
                  }}
                >
                  <p
                    style={{ color: "#d32f2f", fontWeight: "bold", margin: 0 }}
                  >
                    ⚠️ IMMEDIATE ATTENTION REQUIRED ⚠️
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Main App component
const App = () => {
  const [serverStatus, setServerStatus] = useState(null);

  // Check server health on component mount
  useEffect(() => {
    checkServerHealth();
  }, []);

  const checkServerHealth = async () => {
    try {
      const response = await fetch("http://localhost:8000/health");
      if (response.ok) {
        const data = await response.json();
        setServerStatus(data);
      }
    } catch (error) {
      console.error("Server health check failed:", error);
      setServerStatus({
        status: "error",
        message: "Cannot connect to server",
      });
    }
  };

  return (
    <div style={{ maxWidth: 1000, margin: "40px auto", padding: 20 }}>
      {/* Add CSS for progress bar animation */}
      <style>
        {`
          @keyframes progressAnimation {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}
      </style>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <h1 style={{ color: "#333", marginBottom: "10px" }}>
          🚗 AI-Powered Accident Detection System
        </h1>
        <p style={{ color: "#666", fontSize: "18px" }}>
          Real-time analysis with frame-by-frame progress tracking
        </p>

        {/* Server Status */}
        {serverStatus && (
          <div
            style={{
              display: "inline-block",
              padding: "8px 16px",
              borderRadius: "20px",
              backgroundColor:
                serverStatus.status === "healthy" ? "#d4edda" : "#f8d7da",
              color: serverStatus.status === "healthy" ? "#155724" : "#721c24",
              fontSize: "14px",
              marginTop: "10px",
            }}
          >
            {serverStatus.status === "healthy" ? "🟢" : "🔴"} Server:{" "}
            {serverStatus.status}
            {serverStatus.model_loaded !== undefined && (
              <span>
                {" "}
                | Model:{" "}
                {serverStatus.model_loaded ? "✅ Loaded" : "❌ Not Loaded"}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Combined Component */}
      <CombinedDetection />

      {/* Footer */}
      <div style={{ textAlign: "center", marginTop: "40px", color: "#666" }}>
        <p>Built with React + FastAPI + YOLOv8</p>
        <p style={{ fontSize: "12px", marginTop: "10px" }}>
          🎯 Frame-by-frame processing with real-time progress tracking
        </p>
      </div>
    </div>
  );
};

export default App;
