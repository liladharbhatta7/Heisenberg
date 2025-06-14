from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
import math

app = Flask(__name__)
CORS(app)

last_location = {}

def haversine(lat1, lon1, lat2, lon2):
    R = 6371000  # Earth radius in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    a = math.sin(dphi/2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

@app.route('/location', methods=['POST'])
def location():
    data = request.get_json()
    device_id = data.get("device_id")
    lat = data.get("latitude")
    lon = data.get("longitude")
    timestamp = data.get("timestamp")

    if device_id in last_location:
        last_lat, last_lon = last_location[device_id]
        distance = haversine(lat, lon, last_lat, last_lon)
        if distance < 10:
            print(f"[{timestamp}] Skipped location — moved only {distance:.2f} meters.")
            return jsonify({"status": "ignored", "message": "Location unchanged"}), 200

    # Save new location
    last_location[device_id] = (lat, lon)
    with open("locations.txt", "a") as f:
        f.write(str(data) + "\n")
    
    print(f"[{timestamp}] Saved location: ({lat}, {lon}) for {device_id}")
    return jsonify({"status": "success", "message": "Location saved"}), 200

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000, debug=True)
