// AccidentDetection.jsx
import React, { useState } from "react";
import LiveDetection from "./LiveDetection";
import FileUpload from "./FileUpload";

const AccidentDetection = () => {
  const [activeMode, setActiveMode] = useState("live"); // "live" or "upload"

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f5f5f5",
        padding: "20px",
      }}
    >
      {/* Header */}
      <div
        style={{
          textAlign: "center",
          marginBottom: "30px",
        }}
      >
        <h1
          style={{
            color: "#333",
            fontSize: "2.5rem",
            marginBottom: "10px",
            fontWeight: "bold",
          }}
        >
          🚨 Accident Detection System
        </h1>
        <p
          style={{
            color: "#666",
            fontSize: "1.1rem",
          }}
        >
          Real-time detection of accidents using computer vision.
        </p>
      </div>

      {/* Mode Selector */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginBottom: "30px",
        }}
      >
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "10px",
            padding: "5px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
            display: "flex",
          }}
        >
          <button
            onClick={() => setActiveMode("live")}
            style={{
              padding: "12px 24px",
              fontSize: "16px",
              backgroundColor:
                activeMode === "live" ? "#007bff" : "transparent",
              color: activeMode === "live" ? "white" : "#007bff",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "bold",
              transition: "all 0.3s ease",
            }}
          >
            📹 Live Camera
          </button>
          <button
            onClick={() => setActiveMode("upload")}
            style={{
              padding: "12px 24px",
              fontSize: "16px",
              backgroundColor:
                activeMode === "upload" ? "#28a745" : "transparent",
              color: activeMode === "upload" ? "white" : "#28a745",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "bold",
              transition: "all 0.3s ease",
            }}
          >
            📁 Upload File
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        {activeMode === "live" ? <LiveDetection /> : <FileUpload />}
      </div>
    </div>
  );
};

export default AccidentDetection;
