// Install dependencies first:
// npm install @react-google-maps/api @heroicons/react react-icons

import React, { useState, useEffect } from "react";
import {
  GoogleMap,
  Marker,
  InfoWindow,
  useJsApiLoader,
} from "@react-google-maps/api";
import {
  FaMapMarkedAlt,
  FaAmbulance,
  FaPhone,
  FaEnvelope,
  FaTimes,
  FaCheckCircle,
  FaBullseye,
} from "react-icons/fa";

const CENTER = { lat: 27.671550357778724, lng: 85.33921712723657 };

const LOCATIONS = [
  {
    id: 1,
    name: "Pashupatinath Temple",
    type: "Religious Site",
    lat: 27.7107,
    lng: 85.3483,
    distance: 4.5,
    icon: <FaMapMarkedAlt />,
    ambulance: "01-4478569",
    phone: "01-4478560",
    email: "pashupatinath@emergency.np",
    featured: true,
  },
  // ... (other locations as in your file)
  {
    id: 10,
    name: "Budhanilkantha Temple",
    type: "Hindu Temple",
    lat: 27.7801,
    lng: 85.3621,
    distance: 12.1,
    icon: <FaMapMarkedAlt />,
    ambulance: "01-4490123",
    phone: "01-4490120",
    email: "budhanilkantha@emergency.np",
  },
];

// Calculate epic center (midpoint)
function getEpicCenter(locations) {
  const sum = locations.reduce(
    (acc, loc) => {
      acc.lat += loc.lat;
      acc.lng += loc.lng;
      return acc;
    },
    { lat: 0, lng: 0 }
  );
  return {
    lat: sum.lat / locations.length,
    lng: sum.lng / locations.length,
  };
}

const epicCenter = getEpicCenter(LOCATIONS);

export default function EmergencyTracker() {
  const [userLoc, setUserLoc] = useState(null);
  const [status, setStatus] = useState("Detecting your location...");
  const [showMap, setShowMap] = useState(false);
  const [mapCenter, setMapCenter] = useState(CENTER);
  const [selectedLoc, setSelectedLoc] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalLoc, setModalLoc] = useState(null);
  const [message, setMessage] = useState("");
  const [notif, setNotif] = useState(null);
  const [sending, setSending] = useState(false);

  // Google Maps API loader
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: "AIzaSyBuePR9-OAGUCvlt4w0y9XERmv6_JWbe3U",
  });

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLoc({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
          setStatus("Location detected successfully");
        },
        () => {
          setStatus("Location access denied. Showing nearby locations only.");
        }
      );
    } else {
      setStatus("Geolocation not supported. Showing nearby locations only.");
    }
  }, []);

  // Notification auto-hide
  useEffect(() => {
    if (notif) {
      const t = setTimeout(() => setNotif(null), 4000);
      return () => clearTimeout(t);
    }
  }, [notif]);

  // Map container style
  const mapContainerStyle = {
    width: "100vw",
    height: "100vh",
    position: "fixed",
    top: 0,
    left: 0,
    zIndex: 50,
  };

  // Helper: Distance calculation
  function calcDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // Modal send message (real email)
  const handleSendMessage = async () => {
    if (!message.trim()) {
      setNotif({
        title: "Message Required",
        msg: "Please enter a message before sending.",
      });
      return;
    }
    setSending(true);
    try {
      const res = await fetch("http://localhost:4000/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: modalLoc.email,
          subject: `Emergency Contact: ${modalLoc.name}`,
          text: message,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNotif({
          title: "Email Sent",
          msg: `Your message to ${modalLoc.name} was sent successfully!`,
        });
        setMessage("");
        setShowModal(false);
      } else {
        setNotif({
          title: "Send Failed",
          msg: data.message || "Could not send email.",
        });
      }
    } catch (err) {
      setNotif({
        title: "Send Failed",
        msg: "Could not connect to email server.",
      });
    }
    setSending(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-2 py-8">
      {/* Notification */}
      {notif && (
        <div className="fixed top-4 right-4 z-50 bg-white shadow-lg rounded-xl flex items-center px-4 py-3 border-l-4 border-green-500 animate-fade-in">
          <FaCheckCircle className="text-green-500 mr-2" />
          <div>
            <div className="font-bold">{notif.title}</div>
            <div className="text-sm">{notif.msg}</div>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && modalLoc && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-60 z-40"
            onClick={() => setShowModal(false)}
          />
          <div className="fixed top-1/2 left-1/2 z-50 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700"
              onClick={() => setShowModal(false)}
            >
              <FaTimes size={22} />
            </button>
            <h4 className="flex items-center text-lg font-bold mb-4 text-blue-900">
              <FaEnvelope className="mr-2 text-blue-700" /> Emergency Contact
              Information
            </h4>
            <div className="space-y-3 mb-4">
              <div className="flex items-center">
                <span className="bg-green-500 text-white rounded-full w-9 h-9 flex items-center justify-center mr-3">
                  <FaAmbulance />
                </span>
                <div>
                  <div className="text-xs text-gray-500">Ambulance Number</div>
                  <div className="font-semibold">{modalLoc.ambulance}</div>
                </div>
              </div>
              <div className="flex items-center">
                <span className="bg-blue-500 text-white rounded-full w-9 h-9 flex items-center justify-center mr-3">
                  <FaPhone />
                </span>
                <div>
                  <div className="text-xs text-gray-500">Phone Number</div>
                  <div className="font-semibold">{modalLoc.phone}</div>
                </div>
              </div>
              <div className="flex items-center">
                <span className="bg-orange-500 text-white rounded-full w-9 h-9 flex items-center justify-center mr-3">
                  <FaEnvelope />
                </span>
                <div>
                  <div className="text-xs text-gray-500">Email Address</div>
                  <div className="font-semibold">{modalLoc.email}</div>
                </div>
              </div>
            </div>
            <label className="block text-sm font-medium mb-1">
              Your Message
            </label>
            <textarea
              className="w-full border rounded-lg p-2 mb-4 focus:ring-2 focus:ring-blue-500"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here..."
            />
            <button
              className="w-full bg-gradient-to-r from-blue-700 to-blue-900 text-white py-2 rounded-lg font-semibold hover:from-blue-800 hover:to-blue-950 transition"
              onClick={handleSendMessage}
              disabled={sending}
            >
              <FaEnvelope className="inline mr-2" />{" "}
              {sending ? "Sending..." : "Send Message"}
            </button>
          </div>
        </>
      )}

      {/* Map Overlay */}
      {showMap && isLoaded && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-70 z-40" />
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={mapCenter}
            zoom={13}
            options={{
              styles: [
                {
                  featureType: "administrative",
                  elementType: "geometry",
                  stylers: [{ visibility: "off" }],
                },
                { featureType: "poi", stylers: [{ visibility: "simplified" }] },
                {
                  featureType: "road",
                  elementType: "labels",
                  stylers: [{ visibility: "off" }],
                },
                { featureType: "transit", stylers: [{ visibility: "off" }] },
                {
                  featureType: "water",
                  elementType: "labels",
                  stylers: [{ visibility: "off" }],
                },
                { featureType: "landscape", stylers: [{ color: "#f5f5f5" }] },
              ],
              disableDefaultUI: true,
            }}
            onClick={() => setSelectedLoc(null)}
          >
            {/* Epic Center */}
            <Marker
              position={epicCenter}
              icon={{
                path: window.google.maps.SymbolPath.CIRCLE,
                fillColor: "#7B1FA2",
                fillOpacity: 0.8,
                strokeColor: "#4A148C",
                strokeWeight: 3,
                scale: 20,
              }}
              zIndex={1000}
              onClick={() =>
                setSelectedLoc({
                  ...epicCenter,
                  name: "Epic Center",
                  type: "Midpoint of all locations",
                })
              }
            />
            {/* User Location */}
            {userLoc && (
              <Marker
                position={userLoc}
                icon={{
                  path: window.google.maps.SymbolPath.CIRCLE,
                  fillColor: "#1E88E5",
                  fillOpacity: 1,
                  strokeColor: "#0D47A1",
                  strokeWeight: 2,
                  scale: 12,
                }}
                zIndex={100}
                onClick={() =>
                  setSelectedLoc({ ...userLoc, name: "Your Location" })
                }
              />
            )}
            {/* Emergency Locations */}
            {LOCATIONS.map((loc) => (
              <Marker
                key={loc.id}
                position={{ lat: loc.lat, lng: loc.lng }}
                icon={{
                  path: window.google.maps.SymbolPath.CIRCLE,
                  fillColor: loc.featured ? "#FF9800" : "#FF5252",
                  fillOpacity: 1,
                  strokeColor: loc.featured ? "#F57C00" : "#B71C1C",
                  strokeWeight: 2,
                  scale: 8,
                }}
                onClick={() => setSelectedLoc(loc)}
              />
            ))}
            {/* InfoWindow */}
            {selectedLoc && (
              <InfoWindow
                position={{ lat: selectedLoc.lat, lng: selectedLoc.lng }}
                onCloseClick={() => setSelectedLoc(null)}
              >
                <div className="font-semibold text-blue-900">
                  {selectedLoc.name}
                  <div className="text-xs text-gray-700">
                    {selectedLoc.type}
                  </div>
                  {selectedLoc.ambulance && (
                    <div className="mt-1 text-xs">
                      Ambulance: {selectedLoc.ambulance}
                      <br />
                      Phone: {selectedLoc.phone}
                      <br />
                      Email: {selectedLoc.email}
                    </div>
                  )}
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
          <button
            className="fixed top-8 right-8 z-50 bg-white px-5 py-2 rounded-full shadow-lg border-2 border-blue-700 text-blue-900 font-bold flex items-center hover:bg-blue-50 transition"
            onClick={() => setShowMap(false)}
          >
            <FaTimes className="mr-2" /> Close Map
          </button>
        </>
      )}

      {/* Main Card */}
      <div className="w-full max-w-3xl bg-white bg-opacity-95 rounded-2xl shadow-2xl p-8 relative z-10">
        {/* Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="bg-gradient-to-br from-blue-700 to-blue-900 text-white w-20 h-20 rounded-full flex items-center justify-center mb-4 shadow-lg text-4xl">
            <FaMapMarkedAlt />
          </div>
          <h1 className="text-2xl font-extrabold text-blue-900 text-center">
            Kathmandu Emergency Tracker
          </h1>
          <h2 className="text-lg font-semibold text-blue-700 mt-1 text-center">
            With Email Integration
          </h2>
        </div>

        {/* Center Point */}
        <div className="flex justify-center mb-4">
          <div className="bg-blue-700 text-white px-5 py-2 rounded-full font-bold shadow">
            <FaBullseye className="inline mr-2" /> Center Point: 27.6716° N,
            85.3392° E
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border-l-4 border-blue-700 rounded-lg px-4 py-3 mb-4 text-blue-900 text-sm">
          <FaMapMarkedAlt className="inline mr-2 text-blue-700" />
          This app shows nearby locations with emergency contact information.
          Click any location for details.
        </div>

        {/* Epic Center Info */}
        <div className="bg-purple-50 border-l-4 border-purple-700 rounded-lg px-4 py-3 mb-4 text-purple-900 text-sm">
          <FaBullseye className="inline mr-2 text-purple-700" />
          Epic Center: {epicCenter.lat.toFixed(6)}° N,{" "}
          {epicCenter.lng.toFixed(6)}° E
        </div>

        {/* Status */}
        <div
          className={`rounded-lg px-4 py-3 mb-5 text-center font-semibold text-lg ${
            status.includes("success")
              ? "bg-green-100 text-green-700"
              : status.includes("denied")
              ? "bg-red-100 text-red-700"
              : "bg-gray-100 text-gray-700"
          }`}
        >
          <FaCheckCircle className="inline mr-2" />
          {status}
        </div>

        {/* Last Location */}
        <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-xl p-5 mb-6 border-l-4 border-blue-400 shadow hover:shadow-lg transition">
          <div className="flex items-center mb-3">
            <FaMapMarkedAlt className="text-blue-700 text-2xl mr-3" />
            <strong className="text-lg">
              {userLoc
                ? "Your Current Location"
                : "Your location will appear here"}
            </strong>
          </div>
          {userLoc && (
            <>
              <div>
                <span className="font-semibold">Latitude:</span>{" "}
                {userLoc.lat.toFixed(6)}
              </div>
              <div>
                <span className="font-semibold">Longitude:</span>{" "}
                {userLoc.lng.toFixed(6)}
              </div>
              <div className="mt-2">
                <span className="font-semibold">
                  Distance from Kathmandu center:
                </span>{" "}
                {calcDistance(
                  CENTER.lat,
                  CENTER.lng,
                  userLoc.lat,
                  userLoc.lng
                ).toFixed(2)}{" "}
                km
              </div>
            </>
          )}
          <div className="text-center mt-4">
            <button
              className="bg-gradient-to-r from-blue-700 to-blue-900 text-white px-6 py-2 rounded-lg font-bold text-lg shadow hover:from-blue-800 hover:to-blue-950 transition"
              onClick={() => {
                setShowMap(true);
                setMapCenter(userLoc || CENTER);
              }}
              disabled={!userLoc}
            >
              <FaMapMarkedAlt className="inline mr-2" /> Show My Location on Map
            </button>
          </div>
        </div>

        {/* Locations List */}
        <h5 className="text-xl font-bold text-blue-900 mb-3 flex items-center">
          <FaMapMarkedAlt className="mr-2 text-blue-700" /> Nearby Emergency
          Points
        </h5>
        <div className="max-h-96 overflow-y-auto rounded-xl bg-blue-50 bg-opacity-60 border border-blue-100 p-2">
          {LOCATIONS.map((loc) => (
            <div
              key={loc.id}
              className={`mb-3 p-4 rounded-xl shadow hover:shadow-lg transition cursor-pointer flex flex-col md:flex-row items-start md:items-center border-l-4 ${
                loc.featured
                  ? "border-orange-500 bg-orange-50"
                  : "border-blue-400 bg-white"
              }`}
              onClick={() => {
                setShowMap(true);
                setMapCenter({ lat: loc.lat, lng: loc.lng });
                setSelectedLoc(loc);
              }}
            >
              <div
                className={`rounded-full w-14 h-14 flex items-center justify-center text-white text-2xl mr-4 mb-2 md:mb-0 ${
                  loc.featured
                    ? "bg-gradient-to-br from-orange-400 to-orange-700"
                    : "bg-gradient-to-br from-blue-700 to-blue-900"
                }`}
              >
                {loc.icon}
              </div>
              <div className="flex-1">
                <div className="font-bold text-blue-900 text-lg">
                  {loc.name}
                </div>
                <div className="text-blue-700 text-sm">{loc.type}</div>
                <div className="inline-block mt-1 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold shadow">
                  {loc.distance.toFixed(1)} km away
                </div>
                <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2">
                  <button
                    className="flex items-center bg-green-100 text-green-700 px-3 py-1 rounded-full font-semibold hover:bg-green-200 transition text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      setModalLoc(loc);
                      setShowModal(true);
                    }}
                  >
                    <FaAmbulance className="mr-2" /> Ambulance
                  </button>
                  <button
                    className="flex items-center bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-semibold hover:bg-blue-200 transition text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      setModalLoc(loc);
                      setShowModal(true);
                    }}
                  >
                    <FaPhone className="mr-2" /> Phone
                  </button>
                  <button
                    className="flex items-center bg-orange-100 text-orange-700 px-3 py-1 rounded-full font-semibold hover:bg-orange-200 transition text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      setModalLoc(loc);
                      setShowModal(true);
                    }}
                  >
                    <FaEnvelope className="mr-2" /> Email
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
