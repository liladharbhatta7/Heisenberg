# backend/main.py

import os
import shutil
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
import uvicorn

# Assume we refactor your test.py inference into this helper:
# from .test import process_video

app = FastAPI()
BASE_DIR = os.path.dirname(__file__)
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
OUTPUT_DIR = os.path.join(BASE_DIR, "processed")

# Ensure directories exist
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

@app.post("/detect/")
async def detect_accidents(video: UploadFile = File(...)):
    # 1. Save upload
    upload_path = os.path.join(UPLOAD_DIR, video.filename)
    with open(upload_path, "wb") as f:
        shutil.copyfileobj(video.file, f)

    # 2. Process it
    output_filename = f"out_{video.filename}"
    output_path = os.path.join(OUTPUT_DIR, output_filename)
    try:
        # This function should encapsulate all your OpenCV + YOLO logic
        # and write the boxed video to output_path
        process_video(input_path=upload_path, output_path=output_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # 3. Return the processed video
    return FileResponse(output_path, media_type="video/mp4", filename=output_filename)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
