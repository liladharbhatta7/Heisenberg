import os
from ultralytics import YOLO
import cv2
import numpy as np

# Configuration
MODEL_PATH     = "yolov8s.pt"

# Build absolute path to video file, relative to this script:
SCRIPT_DIR     = os.path.dirname(os.path.abspath(__file__))
VIDEO_SOURCE   = os.path.join(SCRIPT_DIR, "Video_for_test_lb.mp4")  # or change filename here

# Sanity‑check that the video file exists:
if not os.path.isfile(VIDEO_SOURCE):
    print(f"❌ Video file not found: {VIDEO_SOURCE}")
    exit()

CONF_THRESHOLD = 0.3
IOU_THRESHOLD  = 0.3  # overlap threshold to flag an “accident”

# Load model
model = YOLO(MODEL_PATH)

# Utility: compute IoU of two boxes [x1,y1,x2,y2]
def compute_iou(boxA, boxB):
    xA = max(boxA[0], boxB[0])
    yA = max(boxA[1], boxB[1])
    xB = min(boxA[2], boxB[2])
    yB = min(boxA[3], boxB[3])
    interW = max(0, xB - xA)
    interH = max(0, yB - yA)
    interArea = interW * interH
    boxAArea = (boxA[2] - boxA[0]) * (boxA[3] - boxA[1])
    boxBArea = (boxB[2] - boxB[0]) * (boxB[3] - boxB[1])
    return interArea / float(boxAArea + boxBArea - interArea + 1e-6)

# Open video
cap = cv2.VideoCapture(VIDEO_SOURCE)
if not cap.isOpened():
    print("Error opening video.")
    exit()

while True:
    ret, frame = cap.read()
    if not ret:
        break

    # Run inference
    results = model.predict(source=frame, conf=CONF_THRESHOLD, verbose=False)
    dets = results[0].boxes      # contains .xyxy, .conf, .cls
    names = results[0].names     # class id → name mapping

    boxes   = dets.xyxy.cpu().numpy()   # N×4 array of [x1,y1,x2,y2]
    scores  = dets.conf.cpu().numpy()   # N array of confidence scores
    cls_ids = dets.cls.cpu().numpy().astype(int)  # N array of class IDs

    used = set()
    # 1) Check for overlapping detections → label “Accident”
    for i in range(len(boxes)):
        if i in used:
            continue
        for j in range(i+1, len(boxes)):
            if j in used:
                continue

            if compute_iou(boxes[i], boxes[j]) > IOU_THRESHOLD:
                # Merge region
                x1 = min(boxes[i][0], boxes[j][0])
                y1 = min(boxes[i][1], boxes[j][1])
                x2 = max(boxes[i][2], boxes[j][2])
                y2 = max(boxes[i][3], boxes[j][3])

                # Draw red accident box
                cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), (0, 0, 255), 2)

                # Prepare “Accident” text
                text = "Accident"
                font = cv2.FONT_HERSHEY_SIMPLEX
                scale = 1
                thickness = 2
                (tw, th), _ = cv2.getTextSize(text, font, scale, thickness)

                # Default text y just above box
                tx = int(x1)
                ty = int(y1) - 10

                # If that would go off-screen, place inside
                if ty - th < 0:
                    ty = int(y1) + th + 10

                cv2.putText(frame, text, (tx, ty), font, scale, (0, 0, 255), thickness)

                used.add(i)
                used.add(j)
                break

    # 2) Draw remaining non-accident detections in green
    for idx in range(len(boxes)):
        if idx in used:
            continue
        x1, y1, x2, y2 = boxes[idx].astype(int)
        cls_name = names[cls_ids[idx]]
        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
        cv2.putText(frame, cls_name, (x1, y1 - 10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)

    # Display
    cv2.imshow("Accident Detection", frame)
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
