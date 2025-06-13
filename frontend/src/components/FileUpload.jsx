// FileUpload.jsx
import React, { useState, useRef } from "react";

const FileUpload = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef();
  const videoRef = useRef();

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
    ];
    if (!validTypes.includes(file.type)) {
      alert(
        "❌ Please upload a valid image (JPG, PNG) or video (MP4, AVI, MOV) file"
      );
      return;
    }

    // Check file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      alert("❌ File size must be less than 50MB");
      return;
    }

    setSelectedFile(file);

    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setResult(null);
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

  const processFile = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setResult(null);

    try {
      const formData = new FormData();

      if (selectedFile.type.startsWith("video/")) {
        formData.append("video", selectedFile);

        const response = await fetch("http://localhost:8000/detect-video", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setResult({
          type: "video",
          ...data,
        });
      } else {
        formData.append("frame", selectedFile);

        const response = await fetch("http://localhost:8000/detect", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setResult({
          type: "image",
          ...data,
        });
      }
    } catch (error) {
      console.error("Error processing file:", error);
      setResult({
        type: "error",
        message:
          "Failed to process file. Please check your connection and try again.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setPreviewUrl("");
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const isVideo = selectedFile?.type.startsWith("video/");

  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: "10px",
        padding: "30px",
        boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
      }}
    >
      <h2
        style={{
          textAlign: "center",
          marginBottom: "30px",
          color: "#333",
        }}
      >
        📁 Upload File for Detection
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
            Supports: JPG, PNG images and MP4, AVI, MOV videos (Max: 50MB)
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

      {/* Preview Area */}
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

          {/* Media Preview */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: "20px",
            }}
          >
            {isVideo ? (
              <video
                ref={videoRef}
                src={previewUrl}
                controls
                style={{
                  maxWidth: "100%",
                  maxHeight: "400px",
                  borderRadius: "8px",
                  backgroundColor: "#000",
                }}
              />
            ) : (
              <img
                src={previewUrl}
                alt="Preview"
                style={{
                  maxWidth: "100%",
                  maxHeight: "400px",
                  borderRadius: "8px",
                  objectFit: "contain",
                }}
              />
            )}
          </div>

          {/* Process Button */}
          <div style={{ textAlign: "center" }}>
            <button
              onClick={processFile}
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
              }}
            >
              {isProcessing
                ? "⏳ Processing..."
                : `🔍 Detect ${isVideo ? "in Video" : "in Image"}`}
            </button>
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
                ? "#f8d7da"
                : "#d4edda",
            border: `2px solid ${
              result.type === "error"
                ? "#dc3545"
                : result.accident_detected
                ? "#dc3545"
                : "#28a745"
            }`,
          }}
        >
          <h3
            style={{
              color:
                result.type === "error"
                  ? "#721c24"
                  : result.accident_detected
                  ? "#721c24"
                  : "#155724",
              marginBottom: "15px",
              textAlign: "center",
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
                  color: result.accident_detected ? "#721c24" : "#155724",
                  textAlign: "center",
                  fontSize: "16px",
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
                    color: "#666",
                  }}
                >
                  <strong>Confidence:</strong>{" "}
                  {(result.confidence * 100).toFixed(1)}%
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
