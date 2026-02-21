import { detectLandmarks } from "./landmarks.js";
import {
  computeBehavioralScore,
  computeStructuralScore,
  computeFaceTexture,
  computeFrameTexture,
  computeTextureScore
} from "./metrics.js";
import { computeISI, getRiskLabel } from "./scoring.js";

// DOM Elements
const video = document.getElementById("video");
const imagePreview = document.getElementById("imagePreview");
const modeSelect = document.getElementById("modeSelect");
const fileInput = document.getElementById("fileInput");
const riskBar = document.getElementById("riskBar");
const status = document.getElementById("status");
const modelStatus = document.getElementById("modelStatus");

let currentMode = "live";
let detectionInterval = null;
let modelsLoaded = false;

// DEBUG: Log that main.js is loaded
console.log("✅ main.js loaded");
modelStatus.innerText = "main.js loaded, starting model load...";

// Load models with detailed logging
async function loadModels() {
  console.log("📚 Starting model loading process...");
  modelStatus.innerText = "Loading face-api models…";
  
  // Check if faceapi is available
  if (typeof faceapi === 'undefined') {
    console.error("❌ face-api.js is not loaded! Check if the script tag is working.");
    modelStatus.innerText = "❌ face-api.js not loaded!";
    return;
  }
  
  console.log("✅ face-api.js is available, version:", faceapi.version || "unknown");
  modelStatus.innerText = "face-api.js loaded, loading models...";
  
  // Try CDN first (most reliable)
  try {
    console.log("🔄 Attempting to load from CDN...");
    modelStatus.innerText = "Loading from CDN...";
    
    await faceapi.nets.tinyFaceDetector.load(
      'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector_model-weights_manifest.json'
    );
    console.log("✅ TinyFaceDetector loaded from CDN");
    
    await faceapi.nets.faceLandmark68Net.load(
      'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-weights_manifest.json'
    );
    console.log("✅ FaceLandmark68Net loaded from CDN");
    
    modelsLoaded = true;
    modelStatus.innerText = "✅ Models loaded from CDN";
    status.innerText = "Models ready! Select an option to start.";
    
    // Start webcam if in live mode
    if (currentMode === "live") {
      startWebcam();
    }
    
    return;
  } catch (cdnError) {
    console.error("❌ CDN loading failed:", cdnError);
    modelStatus.innerText = "CDN failed, trying local...";
  }
  
  // Try local as fallback
  try {
    console.log("🔄 Attempting to load from local folder...");
    modelStatus.innerText = "Loading from local...";
    
    await faceapi.nets.tinyFaceDetector.loadFromUri("./models/");
    console.log("✅ TinyFaceDetector loaded from local");
    
    await faceapi.nets.faceLandmark68Net.loadFromUri("./models/");
    console.log("✅ FaceLandmark68Net loaded from local");
    
    modelsLoaded = true;
    modelStatus.innerText = "✅ Models loaded from local folder";
    status.innerText = "Models ready! Select an option to start.";
    
    if (currentMode === "live") {
      startWebcam();
    }
  } catch (localError) {
    console.error("❌ Local loading failed:", localError);
    modelStatus.innerText = "❌ All loading methods failed. Check console (F12).";
    status.innerText = "Failed to load models. Press F12 and check Console tab.";
  }
}

// Start loading models
loadModels();

// Mode Switching
modeSelect.addEventListener("change", handleModeChange);
fileInput.addEventListener("change", handleFileUpload);

function handleModeChange() {
  console.log("Mode changed to:", modeSelect.value);
  currentMode = modeSelect.value;
  stopDetection();

  if (currentMode === "live") {
    fileInput.style.display = "none";
    imagePreview.style.display = "none";
    video.style.display = "block";
    if (modelsLoaded) {
      startWebcam();
    } else {
      status.innerText = "Waiting for models to load...";
    }
  } else {
    fileInput.style.display = "inline";
    video.style.display = "none";
    imagePreview.style.display = "none";
  }
}

async function startWebcam() {
  console.log("📷 Attempting to start webcam...");
  status.innerText = "Requesting webcam access...";
  
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: true,
      audio: false 
    });
    
    video.srcObject = stream;
    video.play();
    console.log("✅ Webcam started successfully");
    status.innerText = "Webcam started. Detecting face...";
    startDetection(video);
  } catch (err) {
    console.error("❌ Webcam error:", err);
    modelStatus.innerText = "❌ Could not access webcam";
    status.innerText = "Webcam error: " + err.message;
  }
}

function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  console.log("File selected:", file.name);
  const url = URL.createObjectURL(file);
  stopDetection();

  if (currentMode === "image") {
    imagePreview.src = url;
    imagePreview.style.display = "block";
    imagePreview.onload = () => {
      if (modelsLoaded) {
        console.log("Image loaded, starting detection");
        startDetection(imagePreview);
      } else {
        status.innerText = "Waiting for models to load...";
      }
    };
  }

  if (currentMode === "video") {
    video.src = url;
    video.style.display = "block";
    video.onloadedmetadata = () => {
      video.play();
      if (modelsLoaded) {
        console.log("Video loaded, starting detection");
        startDetection(video);
      } else {
        status.innerText = "Waiting for models to load...";
      }
    };
  }
}

function startDetection(element) {
  if (!modelsLoaded) {
    console.warn("Detection attempted but models not loaded");
    status.innerText = "Models not loaded yet";
    return;
  }
  
  console.log("Starting detection on element");
  stopDetection();

  detectionInterval = setInterval(async () => {
    try {
      const detection = await faceapi
        .detectSingleFace(element, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks();

      if (!detection) {
        status.innerText = "No face detected";
        riskBar.style.width = "0%";
        return;
      }

      if (!detection.landmarks) {
        status.innerText = "Face detected but no landmarks";
        return;
      }

      const landmarks = detection.landmarks.positions;
      console.log("Face detected with", landmarks.length, "landmarks");

      const behavioral = computeBehavioralScore(landmarks);
      const structural = computeStructuralScore(landmarks);

      const faceTexture = computeFaceTexture(element, detection.detection.box);
      const frameTexture = computeFrameTexture(element);
      const texture = computeTextureScore(faceTexture, frameTexture);

      const isi = computeISI({ structural, behavioral, texture });
      const label = getRiskLabel(isi);

      const percentage = (isi * 100).toFixed(0);
      riskBar.style.width = `${percentage}%`;
      
      if (isi < 0.3) riskBar.style.backgroundColor = "green";
      else if (isi < 0.6) riskBar.style.backgroundColor = "orange";
      else riskBar.style.backgroundColor = "red";

      status.innerText = `
Structural Score: ${structural.toFixed(2)}
Behavioral Score: ${behavioral.toFixed(2)}
Texture Score: ${texture.toFixed(2)}
Final Risk (ISI): ${isi.toFixed(2)} (${percentage}%)
Label: ${label}
`;
    } catch (err) {
      console.error("Detection error:", err);
      status.innerText = "Error: " + err.message;
    }
  }, 300);
}

function stopDetection() {
  if (detectionInterval) {
    clearInterval(detectionInterval);
    detectionInterval = null;
  }
}

handleModeChange();