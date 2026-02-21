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

// Load models from the correct path (as confirmed by the test)
async function loadModels() {
  modelStatus.innerText = "Loading models...";
  
  try {
    // Use the direct path that worked in the test
    await faceapi.nets.tinyFaceDetector.loadFromUri("./models/");
    await faceapi.nets.faceLandmark68Net.loadFromUri("./models/");
    
    modelsLoaded = true;
    modelStatus.innerText = "✅ Models loaded!";
    status.innerText = "Ready - Select an option";
    
    // Start webcam if in live mode
    if (currentMode === "live") {
      startWebcam();
    }
    
  } catch (error) {
    modelStatus.innerText = "❌ Failed to load models";
    console.error("Model loading error:", error);
    status.innerText = "Error loading models. Check console.";
  }
}

// Start loading immediately
loadModels();

// Mode switching
modeSelect.addEventListener("change", handleModeChange);
fileInput.addEventListener("change", handleFileUpload);

function handleModeChange() {
  currentMode = modeSelect.value;
  stopDetection();

  if (currentMode === "live") {
    fileInput.style.display = "none";
    imagePreview.style.display = "none";
    video.style.display = "block";
    if (modelsLoaded) {
      startWebcam();
    } else {
      status.innerText = "Loading models...";
    }
  } else {
    fileInput.style.display = "inline";
    video.style.display = "none";
    imagePreview.style.display = "none";
  }
}

async function startWebcam() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    video.play();
    startDetection(video);
  } catch (err) {
    modelStatus.innerText = "❌ Could not access webcam";
    console.error(err);
  }
}

function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const url = URL.createObjectURL(file);
  stopDetection();

  if (currentMode === "image") {
    imagePreview.src = url;
    imagePreview.style.display = "block";
    imagePreview.onload = () => {
      if (modelsLoaded) startDetection(imagePreview);
    };
  }

  if (currentMode === "video") {
    video.src = url;
    video.style.display = "block";
    video.onloadedmetadata = () => {
      video.play();
      if (modelsLoaded) startDetection(video);
    };
  }
}

function startDetection(element) {
  if (!modelsLoaded) return;
  
  stopDetection();

  detectionInterval = setInterval(async () => {
    try {
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
    }
  }, 300);
}

function stopDetection() {
  if (detectionInterval) {
    clearInterval(detectionInterval);
    detectionInterval = null;
  }
}

// Initialize
handleModeChange();