import cv2
import numpy as np
from ultralytics import YOLO

model = YOLO("yolov8s.pt")
CONF_THRESHOLD = 0.3
IOU_THRESHOLD = 0.4  # Slightly higher to reduce false positives
SUSTAINED_FRAMES = 3  # Number of consecutive frames overlap must persist

# List of vehicle class names as per your model (adjust as needed)
VEHICLE_CLASSES = {"car", "truck", "bus", "motorcycle", "bicycle", "van"}

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

def process_video(input_path, output_path):
    cap = cv2.VideoCapture(input_path)
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = None

    accident_detected = False
    accident_confidences = []
    total_frames = 0

    # For sustained overlap
    overlap_counts = dict()  # key: (i, j), value: count

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        total_frames += 1

        results = model.predict(source=frame, conf=CONF_THRESHOLD, verbose=False)
        dets = results[0].boxes
        names = results[0].names
        boxes = dets.xyxy.cpu().numpy()
        scores = dets.conf.cpu().numpy()
        cls_ids = dets.cls.cpu().numpy().astype(int)

        # Only keep vehicle detections
        vehicle_indices = [i for i, cid in enumerate(cls_ids) if names[cid] in VEHICLE_CLASSES]
        vehicle_boxes = boxes[vehicle_indices]
        vehicle_scores = scores[vehicle_indices]
        vehicle_cls_ids = [cls_ids[i] for i in vehicle_indices]

        # Draw boxes
        used = set()
        new_overlaps = dict()
        for i in range(len(vehicle_boxes)):
            for j in range(i+1, len(vehicle_boxes)):
                # Only check between different vehicles
                if i == j:
                    continue
                iou = compute_iou(vehicle_boxes[i], vehicle_boxes[j])
                if iou > IOU_THRESHOLD:
                    key = (i, j)
                    count = overlap_counts.get(key, 0) + 1
                    new_overlaps[key] = count
                    if count >= SUSTAINED_FRAMES:
                        x1 = min(vehicle_boxes[i][0], vehicle_boxes[j][0])
                        y1 = min(vehicle_boxes[i][1], vehicle_boxes[j][1])
                        x2 = max(vehicle_boxes[i][2], vehicle_boxes[j][2])
                        y2 = max(vehicle_boxes[i][3], vehicle_boxes[j][3])
                        cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), (0,0,255), 2)
                        cv2.putText(frame, "Accident", (int(x1), int(y1)-10), cv2.FONT_HERSHEY_SIMPLEX, 1, (0,0,255), 2)
                        used.add(i)
                        used.add(j)
                        accident_detected = True
                        accident_confidences.append(max(vehicle_scores[i], vehicle_scores[j]))
            # Draw non-accident vehicle boxes
            if i not in used:
                x1, y1, x2, y2 = vehicle_boxes[i].astype(int)
                cls_name = names[vehicle_cls_ids[i]]
                cv2.rectangle(frame, (x1, y1), (x2, y2), (0,255,0), 2)
                cv2.putText(frame, cls_name, (x1, y1-10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0,255,0), 2)

        # Update overlap counts for next frame
        overlap_counts = new_overlaps

        if out is None:
            height, width = frame.shape[:2]
            out = cv2.VideoWriter(output_path, fourcc, 20.0, (width, height))

        out.write(frame)

    cap.release()
    if out: out.release()

    confidence = float(np.mean(accident_confidences)) if accident_confidences else 0.0

    return {
        "accident_detected": accident_detected,
        "confidence": confidence,
        "total_frames": total_frames
    }
