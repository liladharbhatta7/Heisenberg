// LiveDetection.jsx
import React, { useEffect, useRef, useState } from "react";

const LiveDetection = () => {
  const videoRef = useRef();
  const canvasRef = useRef();
  const [isStreaming, setIsStreaming] = useState(false);
  const [intervalId, setIntervalId] = useState(null);
  const [detectionStatus, setDetectionStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [cameraError, setCameraError] = useState("");

  useEffect(() => {
    // Initialize camera
    navigator.mediaDevices
      .getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "environment",
        },
      })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraError("");
      })
      .catch((error) => {
        console.error("Error accessing camera:", error);
        setCameraError("❌ Cannot access camera. Please check permissions.");
      });

    return () => {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      }
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, []);

  const sendFrameToBackend = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    try {
      setIsLoading(true);
      const canvas = canvasRef.current;
      const video = videoRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const context = canvas.getContext("2d");
      context.drawImage(video, 0, 0);

      const imageBlob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.8)
      );

      const formData = new FormData();
      formData.append("frame", imageBlob);

      const res = await fetch("http://localhost:8000/detect", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const result = await res.json();

      if (result.accident_detected) {
        setDetectionStatus("🚨 ACCIDENT DETECTED!");
      } else {
        setDetectionStatus("✅ No accident detected");
      }
    } catch (error) {
      console.error("Error sending frame:", error);
      setDetectionStatus("❌ Error processing frame");
    } finally {
      setIsLoading(false);
    }
  };

  const startStreaming = () => {
    if (!isStreaming && !cameraError) {
      const id = setInterval(sendFrameToBackend, 1000);
      setIntervalId(id);
      setIsStreaming(true);
      setDetectionStatus("🔄 Live detection started...");
    }
  };

  const stopStreaming = () => {
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
      setIsStreaming(false);
      setDetectionStatus("⏹️ Live detection stopped");
    }
  };

  if (cameraError) {
    return (
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "10px",
          padding: "40px",
          textAlign: "center",
          boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
        }}
      >
        <div style={{ fontSize: "4rem", marginBottom: "20px" }}>📷</div>
        <h3 style={{ color: "#dc3545", marginBottom: "10px" }}>
          Camera Access Required
        </h3>
        <p style={{ color: "#666" }}>{cameraError}</p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: "10px 20px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            marginTop: "20px",
          }}
        >
          🔄 Retry Camera Access
        </button>
      </div>
    );
  }

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
        📹 Live Camera Detection
      </h2>

      {/* Video Display */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginBottom: "30px",
        }}
      >
        <div
          style={{
            border: "3px solid #007bff",
            borderRadius: "10px",
            overflow: "hidden",
            backgroundColor: "#000",
          }}
        >
          <video
            ref={videoRef}
            autoPlay
            muted
            style={{
              width: "640px",
              height: "480px",
              maxWidth: "100%",
              display: "block",
            }}
          />
        </div>
      </div>

      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* Controls */}
      <div
        style={{
          display: "flex",
          gap: "15px",
          flexWrap: "wrap",
          justifyContent: "center",
          marginBottom: "20px",
        }}
      >
        <button
          onClick={startStreaming}
          disabled={isStreaming || isLoading}
          style={{
            padding: "15px 30px",
            fontSize: "16px",
            backgroundColor: isStreaming ? "#6c757d" : "#28a745",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: isStreaming ? "not-allowed" : "pointer",
            fontWeight: "bold",
            transition: "all 0.3s ease",
          }}
        >
          {isStreaming ? "🔄 Detecting..." : "▶️ Start Detection"}
        </button>

        <button
          onClick={stopStreaming}
          disabled={!isStreaming}
          style={{
            padding: "15px 30px",
            fontSize: "16px",
            backgroundColor: !isStreaming ? "#6c757d" : "#dc3545",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: !isStreaming ? "not-allowed" : "pointer",
            fontWeight: "bold",
            transition: "all 0.3s ease",
          }}
        >
          ⏹️ Stop Detection
        </button>

        <button
          onClick={sendFrameToBackend}
          disabled={isStreaming || isLoading}
          style={{
            padding: "15px 30px",
            fontSize: "16px",
            backgroundColor: isStreaming ? "#6c757d" : "#007bff",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: isStreaming ? "not-allowed" : "pointer",
            fontWeight: "bold",
            transition: "all 0.3s ease",
          }}
        >
          📸 Single Detection
        </button>
      </div>

      {/* Status Display */}
      {(detectionStatus || isLoading) && (
        <div
          style={{
            textAlign: "center",
            padding: "15px",
            borderRadius: "8px",
            backgroundColor: detectionStatus.includes("ACCIDENT")
              ? "#f8d7da"
              : detectionStatus.includes("Error")
              ? "#f8d7da"
              : "#d4edda",
            border: `2px solid ${
              detectionStatus.includes("ACCIDENT")
                ? "#dc3545"
                : detectionStatus.includes("Error")
                ? "#dc3545"
                : "#28a745"
            }`,
            color:
              detectionStatus.includes("ACCIDENT") ||
              detectionStatus.includes("Error")
                ? "#721c24"
                : "#155724",
            fontWeight: "bold",
            fontSize: "18px",
          }}
        >
          {isLoading ? "⏳ Processing..." : detectionStatus}
        </div>
      )}
    </div>
  );
};

export default LiveDetection;
