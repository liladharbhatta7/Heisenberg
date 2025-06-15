import os
import shutil
import cv2
import numpy as np
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse
from .process_video import process_video
from ultralytics import YOLO
import threading
import time
import asyncio
from concurrent.futures import ThreadPoolExecutor

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(__file__)
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
PROCESSED_DIR = os.path.join(BASE_DIR, "processed")
LIVE_DIR = os.path.join(BASE_DIR, "live")

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(PROCESSED_DIR, exist_ok=True)
os.makedirs(LIVE_DIR, exist_ok=True)

app.mount("/processed", StaticFiles(directory=PROCESSED_DIR), name="processed")
app.mount("/live", StaticFiles(directory=LIVE_DIR), name="live")

# Load YOLO model once
try:
    model = YOLO("yolov8s.pt")
    print("YOLO model loaded successfully")
except Exception as e:
    print(f"Error loading YOLO model: {e}")
    model = None

CONF_THRESHOLD = 0.3

# Global variables for live video management
current_live_video = None
live_video_lock = threading.Lock()
active_streams = {}
stream_counter = 0

@app.post("/detect-video")
async def detect_video(video: UploadFile = File(...)):
    if not video.filename:
        raise HTTPException(status_code=400, detail="No filename provided")
    
    upload_path = os.path.join(UPLOAD_DIR, video.filename)
    output_path = os.path.join(PROCESSED_DIR, f"processed_{video.filename}")

    # Save uploaded file
    try:
        with open(upload_path, "wb") as f:
            shutil.copyfileobj(video.file, f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save video: {str(e)}")

    # Process video
    try:
        result = process_video(upload_path, output_path)
    except Exception as e:
        # Clean up uploaded file if processing fails
        if os.path.exists(upload_path):
            os.remove(upload_path)
        raise HTTPException(status_code=500, detail=f"Video processing failed: {str(e)}")

    result["processed_url"] = f"/processed/processed_{video.filename}"
    return result

@app.post("/upload-live-video")
async def upload_live_video(video: UploadFile = File(...)):
    """
    Upload a video for live detection preview
    """
    global current_live_video
    
    if not video.filename:
        raise HTTPException(status_code=400, detail="No filename provided")
    
    # Check file format
    allowed_extensions = ('.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv', '.webm')
    if not video.filename.lower().endswith(allowed_extensions):
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid video format. Supported formats: {', '.join(allowed_extensions)}"
        )
    
    # Clear previous live video
    with live_video_lock:
        if current_live_video and os.path.exists(current_live_video):
            try:
                os.remove(current_live_video)
            except:
                pass
    
    # Save the uploaded video to live directory
    timestamp = int(time.time())
    safe_filename = f"live_{timestamp}_{video.filename}"
    live_video_path = os.path.join(LIVE_DIR, safe_filename)
    
    try:
        with open(live_video_path, "wb") as f:
            shutil.copyfileobj(video.file, f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save video: {str(e)}")
    
    # Verify video can be opened
    cap = cv2.VideoCapture(live_video_path)
    if not cap.isOpened():
        os.remove(live_video_path)
        raise HTTPException(status_code=400, detail="Invalid video file - cannot be opened")
    cap.release()
    
    # Update the current live video path thread-safely
    with live_video_lock:
        current_live_video = live_video_path
    
    return {
        "message": "Video uploaded successfully for live preview",
        "filename": video.filename,
        "live_preview_url": "/live-preview",
        "video_path": live_video_path
    }

def generate_frames(video_path, stream_id):
    """
    Generate frames for live detection streaming with proper error handling
    """
    cap = None
    try:
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise Exception(f"Cannot open video file: {video_path}")
        
        # Get video properties
        fps = cap.get(cv2.CAP_PROP_FPS) or 30
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        frame_delay = 1.0 / fps
        
        print(f"Video opened: FPS={fps}, Total frames={total_frames}")
        
        frame_count = 0
        
        while stream_id in active_streams:
            ret, frame = cap.read()
            
            if not ret:
                # Loop video when it ends
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                frame_count = 0
                continue
            
            frame_count += 1
            
            # Resize frame if too large (for better performance)
            height, width = frame.shape[:2]
            if width > 1280:
                scale = 1280 / width
                new_width = int(width * scale)
                new_height = int(height * scale)
                frame = cv2.resize(frame, (new_width, new_height))
            
            # Perform YOLO detection
            if model is not None:
                try:
                    results = model.predict(source=frame, conf=CONF_THRESHOLD, verbose=False)
                    
                    if results and len(results) > 0:
                        result = results[0]
                        if hasattr(result, 'boxes') and result.boxes is not None:
                            boxes = result.boxes.xyxy.cpu().numpy()
                            scores = result.boxes.conf.cpu().numpy()
                            cls_ids = result.boxes.cls.cpu().numpy().astype(int)
                            names = result.names
                            
                            # Draw detections
                            for i in range(len(boxes)):
                                x1, y1, x2, y2 = boxes[i].astype(int)
                                cls_name = names[cls_ids[i]]
                                conf = scores[i]
                                
                                # Different colors for different classes
                                colors = [(0, 255, 0), (255, 0, 0), (0, 0, 255), (255, 255, 0), (255, 0, 255)]
                                color = colors[cls_ids[i] % len(colors)]
                                
                                # Draw bounding box
                                cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                                
                                # Draw label with background
                                label = f"{cls_name} {conf:.2f}"
                                label_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.7, 2)[0]
                                cv2.rectangle(frame, (x1, y1 - label_size[1] - 10), 
                                            (x1 + label_size[0], y1), color, -1)
                                cv2.putText(frame, label, (x1, y1 - 5),
                                          cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
                
                except Exception as e:
                    # If detection fails, show error on frame
                    cv2.putText(frame, f"Detection Error: {str(e)[:30]}", (10, 30),
                               cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
            else:
                # Show message if model is not loaded
                cv2.putText(frame, "YOLO model not loaded", (10, 30),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
            
            # Add frame counter
            cv2.putText(frame, f"Frame: {frame_count}/{total_frames}", (10, frame.shape[0] - 10),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
            
            # Encode frame
            ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
            if ret:
                frame_bytes = buffer.tobytes()
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
            
            # Control frame rate
            time.sleep(frame_delay)
    
    except Exception as e:
        print(f"Error in generate_frames: {e}")
        # Generate error frame
        error_frame = np.zeros((480, 640, 3), dtype=np.uint8)
        cv2.putText(error_frame, f"Stream Error: {str(e)[:40]}", (10, 240),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
        ret, buffer = cv2.imencode('.jpg', error_frame)
        if ret:
            frame_bytes = buffer.tobytes()
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
    
    finally:
        if cap:
            cap.release()
        # Clean up stream
        if stream_id in active_streams:
            del active_streams[stream_id]

@app.get("/live-preview")
def live_preview():
    """
    Streams live detection preview from uploaded video
    """
    global current_live_video, stream_counter
    
    with live_video_lock:
        video_path = current_live_video
    
    if not video_path or not os.path.exists(video_path):
        # Return error stream if no video is uploaded
        def error_stream():
            error_frame = np.zeros((480, 640, 3), dtype=np.uint8)
            cv2.putText(error_frame, "No video uploaded", (150, 200),
                       cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
            cv2.putText(error_frame, "Upload a video first", (140, 250),
                       cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
            ret, buffer = cv2.imencode('.jpg', error_frame)
            if ret:
                frame_bytes = buffer.tobytes()
                while True:
                    yield (b'--frame\r\n'
                           b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
                    time.sleep(1)
        
        return StreamingResponse(
            error_stream(),
            media_type='multipart/x-mixed-replace; boundary=frame'
        )
    
    # Create unique stream ID
    stream_counter += 1
    stream_id = f"stream_{stream_counter}"
    active_streams[stream_id] = True
    
    return StreamingResponse(
        generate_frames(video_path, stream_id),
        media_type='multipart/x-mixed-replace; boundary=frame'
    )

@app.get("/current-live-video")
def get_current_live_video():
    """
    Get information about the currently loaded live video
    """
    global current_live_video
    
    with live_video_lock:
        if current_live_video and os.path.exists(current_live_video):
            filename = os.path.basename(current_live_video)
            
            # Get video info
            cap = cv2.VideoCapture(current_live_video)
            video_info = {}
            if cap.isOpened():
                video_info = {
                    "width": int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
                    "height": int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)),
                    "fps": cap.get(cv2.CAP_PROP_FPS),
                    "frame_count": int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                }
                cap.release()
            
            return {
                "has_video": True,
                "filename": filename,
                "path": current_live_video,
                "video_info": video_info
            }
        else:
            return {
                "has_video": False,
                "message": "No video currently loaded for live preview"
            }

@app.delete("/clear-live-video")
def clear_live_video():
    """
    Clear the current live video and stop all streams
    """
    global current_live_video, active_streams
    
    # Stop all active streams
    active_streams.clear()
    
    with live_video_lock:
        if current_live_video and os.path.exists(current_live_video):
            try:
                os.remove(current_live_video)
            except Exception as e:
                print(f"Error removing video file: {e}")
        current_live_video = None
    
    return {"message": "Live video cleared successfully"}

@app.get("/model-status")
def get_model_status():
    """
    Check if YOLO model is loaded properly
    """
    return {
        "model_loaded": model is not None,
        "model_type": "YOLOv8s" if model else None,
        "confidence_threshold": CONF_THRESHOLD
    }

# Health check endpoint
@app.get("/health")
def health_check():
    return {
        "status": "healthy", 
        "message": "FastAPI server is running",
        "model_loaded": model is not None,
        "active_streams": len(active_streams)
    }

@app.on_event("shutdown")
def shutdown_event():
    """
    Clean up resources on shutdown
    """
    global active_streams
    active_streams.clear()
    print("Server shutting down, cleaned up resources")

if __name__ == "__main__":
    import uvicorn
    print("Starting FastAPI server...")
    print(f"YOLO model loaded: {model is not None}")
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)
