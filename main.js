import { detectLandmarks } from "./landmarks.js";
import {
  computeBehavioralScore,
  computeStructuralScore,
  computeFaceTexture,
  computeFrameTexture,
  computeTextureScore
} from "./metrics.js";

import { computeISI, getRiskLabel } from "./scoring.js";

// ---------------------------
// DOM Elements
// ---------------------------
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

// ---------------------------
// Load Models with Fallbacks
// ---------------------------
async function loadModels() {
  modelStatus.innerText = "Loading face-api models…";
  
  // Try multiple methods to load models
  const loadMethods = [
    tryLoadFromLocalFolders,
    tryLoadFromLocalDirect,
    tryLoadFromCDN
  ];
  
  for (const method of loadMethods) {
    try {
      await method();
      modelsLoaded = true;
      modelStatus.innerText = "Face-api models loaded ✅";
      return;
    } catch (error) {
      console.warn(`Model loading method failed:`, error);
      // Continue to next method
    }
  }
  
  // If all methods fail
  modelStatus.innerText = "❌ Failed to load models. Check console.";
}

async function tryLoadFromLocalFolders() {
  // Method 1: Try loading from expected folder structure
  await faceapi.nets.tinyFaceDetector.loadFromUri("./models/tiny_face_detector");
  await faceapi.nets.faceLandmark68Net.loadFromUri("./models/face_landmark_68");
}

async function tryLoadFromLocalDirect() {
  // Method 2: Try loading directly from models folder
  await faceapi.nets.tinyFaceDetector.loadFromUri("./models/");
  await faceapi.nets.faceLandmark68Net.loadFromUri("./models/");
}

async function tryLoadFromCDN() {
  // Method 3: Load from CDN as fallback
  modelStatus.innerText = "Loading from CDN...";
  
  await faceapi.nets.tinyFaceDetector.load(
    'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector_model-weights_manifest.json'
  );
  
  await faceapi.nets.faceLandmark68Net.load(
    'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-weights_manifest.json'
  );
}

// Start loading models
loadModels();

// ---------------------------
// Mode Switching
// ---------------------------
modeSelect.addEventListener("change", handleModeChange);
fileInput.addEventListener("change", handleFileUpload);

function handleModeChange() {
  currentMode = modeSelect.value;
  stopDetection();

  if (currentMode === "live") {
    fileInput.style.display = "none";
    imagePreview.style.display = "none";
    video.style.display = "block";
    startWebcam();
  } else {
    fileInput.style.display = "inline";
    video.style.display = "none";
    imagePreview.style.display = "none";
  }
}

// ---------------------------
// Webcam
// ---------------------------
async function startWebcam() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    video.play();
    
    // Wait for models to load before starting detection
    if (modelsLoaded) {
      startDetection(video);
    } else {
      // Check again after 1 second
      setTimeout(() => {
        if (modelsLoaded) {
          startDetection(video);
        } else {
          status.innerText = "Waiting for models to load...";
        }
      }, 1000);
    }
  } catch (err) {
    modelStatus.innerText = "❌ Could not access webcam";
    console.error(err);
  }
}

// ---------------------------
// File Upload
// ---------------------------
function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const url = URL.createObjectURL(file);
  stopDetection();

  if (currentMode === "image") {
    imagePreview.src = url;
    imagePreview.style.display = "block";
    imagePreview.onload = () => {
      if (modelsLoaded) {
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
        startDetection(video);
      } else {
        status.innerText = "Waiting for models to load...";
      }
    };
  }
}

// ---------------------------
// Detection Loop
// ---------------------------
function startDetection(element) {
  if (!modelsLoaded) {
    status.innerText = "Models not loaded yet";
    return;
  }
  
  stopDetection();

  detectionInterval = setInterval(async () => {
    try {
      // Direct face-api detection in case detectLandmarks has issues
      const detection = await faceapi
        .detectSingleFace(element, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks();

      if (!detection || !detection.landmarks) {
        status.innerText = "No face detected";
        riskBar.style.width = "0%";
        riskBar.style.backgroundColor = "green";
        return;
      }

      const landmarks = detection.landmarks.positions;

      const behavioral = computeBehavioralScore(landmarks);
      const structural = computeStructuralScore(landmarks);

      const faceTexture = computeFaceTexture(element, detection.detection.box);
      const frameTexture = computeFrameTexture(element);
      const texture = computeTextureScore(faceTexture, frameTexture);

      const isi = computeISI({ structural, behavioral, texture });
      const label = getRiskLabel(isi);

      // Update Risk UI
      const percentage = (isi * 100).toFixed(0);
      riskBar.style.width = `${percentage}%`;
      if (isi < 0.3) riskBar.style.backgroundColor = "green";
      else if (isi < 0.6) riskBar.style.backgroundColor = "orange";
      else riskBar.style.backgroundColor = "red";

      // Show metrics in text
      status.innerText = `
Structural Score: ${structural.toFixed(2)}
Behavioral Score: ${behavioral.toFixed(2)}
Texture Score: ${texture.toFixed(2)}
Final Risk (ISI): ${isi.toFixed(2)} (${percentage}%)
Label: ${label}
`;
    } catch (err) {
      console.error("Detection error:", err);
      status.innerText = "Error during detection";
    }
  }, 300);
}

function stopDetection() {
  if (detectionInterval) {
    clearInterval(detectionInterval);
    detectionInterval = null;
  }
}

// ---------------------------
// Initialize Default Mode
// ---------------------------
handleModeChange();

//  a retry mechanism for model loading
setInterval(() => {
  if (!modelsLoaded && !modelStatus.innerText.includes("Failed")) {
    loadModels();
  }
}, 5000); // Retry every 5 seconds if models aren't loaded