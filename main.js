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

// Load models from CDN
async function loadModels() {
  modelStatus.innerText = "Loading face-api models from CDN…";
  
  try {
    // Load from CDN
    await faceapi.nets.tinyFaceDetector.load(
      'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector_model-weights_manifest.json'
    );
    
    await faceapi.nets.faceLandmark68Net.load(
      'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-weights_manifest.json'
    );
    
    modelsLoaded = true;
    modelStatus.innerText = "✅ Models loaded from CDN";
    console.log("Models loaded successfully");
    
    // Start webcam if in live mode
    if (currentMode === "live") {
      startWebcam();
    }
  } catch (error) {
    modelStatus.innerText = "❌ Failed to load models: " + error.message;
    console.error("Model loading error:", error);
  }
}

// Start loading models immediately
loadModels();

// Mode Switching
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
      status.innerText = "Waiting for models to load...";
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

function startDetection(element) {
  if (!modelsLoaded) {
    status.innerText = "Models not loaded yet";
    return;
  }
  
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

handleModeChange();