// ===============================
// app.js
// ===============================

import { detectLandmarks } from "./landmarks.js";
import {
  computeBehavioralScore,
  computeStructuralScore,
  computeFaceTexture,
  computeFrameTexture,
  computeTextureScore
} from "./metrics.js";
import { computeISI, getRiskLabel } from "./scoring.js";

// -----------------------------
// DOM Elements
// -----------------------------
const video = document.getElementById("video");
const imagePreview = document.getElementById("imagePreview");
const modeSelect = document.getElementById("modeSelect");
const fileInput = document.getElementById("fileInput");
const riskBar = document.getElementById("riskBar");
const status = document.getElementById("status");
const modelStatus = document.getElementById("modelStatus");

let currentMode = "live";
let detectionInterval = null;

// -----------------------------
// Load Models
// -----------------------------
async function loadModels() {
  modelStatus.innerText = "Loading models...";

  try {
    await faceapi.nets.tinyFaceDetector.loadFromUri("./models");
    await faceapi.nets.faceLandmark68Net.loadFromUri("./models");

    modelStatus.innerText = "✅ Models loaded";

    if (currentMode === "live") {
      startWebcam();
    }

  } catch (error) {
    modelStatus.innerText = "❌ Failed to load models";
    console.error(error);
  }
}

loadModels();

// -----------------------------
// Mode Switching
// -----------------------------
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

// -----------------------------
// Webcam
// -----------------------------
async function startWebcam() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;

    video.onloadeddata = async () => {
      await video.play();
      startDetection(video);
    };

  } catch (err) {
    modelStatus.innerText = "❌ Webcam access denied";
    console.error(err);
  }
}

// -----------------------------
// File Upload (Image / Video)
// -----------------------------
function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const url = URL.createObjectURL(file);
  stopDetection();

  if (currentMode === "image") {
    imagePreview.src = url;
    imagePreview.style.display = "block";
    video.style.display = "none";

    imagePreview.onload = () => {
      startDetection(imagePreview);
    };
  }

  if (currentMode === "video") {
    video.src = url;
    video.style.display = "block";
    imagePreview.style.display = "none";

    video.onloadeddata = async () => {
      await video.play();

      // Give video time to render first frame
      setTimeout(() => {
        startDetection(video);
      }, 300);
    };
  }
}

// -----------------------------
// Detection Engine
// -----------------------------
function startDetection(element) {
  stopDetection();

  detectionInterval = setInterval(async () => {
    try {

      // Skip if video not ready
      if (element.tagName === "VIDEO") {
        if (element.videoWidth === 0 || element.videoHeight === 0) return;
      }

      const detection = await faceapi
        .detectSingleFace(
          element,
          new faceapi.TinyFaceDetectorOptions({
            inputSize: 512,
            scoreThreshold: 0.25
          })
        )
        .withFaceLandmarks();

      if (!detection) {
        status.innerText = "No face detected";
        updateRiskBar(0, "green");
        return;
      }

      const landmarks = detection.landmarks.positions;

      const behavioral = computeBehavioralScore(landmarks);
      const structural = computeStructuralScore(landmarks);
      const faceTexture = computeFaceTexture(element, detection.detection.box);
      const frameTexture = computeFrameTexture(element);
      const texture = computeTextureScore(faceTexture, frameTexture);

      const isi = computeISI({
        structural,
        behavioral,
        texture
      });

      const label = getRiskLabel(isi);
      const percentage = Math.min(100, Math.max(0, isi * 100)).toFixed(0);

      let color = "green";
      if (isi > 0.6) color = "red";
      else if (isi > 0.3) color = "orange";

      updateRiskBar(percentage, color);

      status.innerText = `
Structural: ${structural.toFixed(2)}
Behavioral: ${behavioral.toFixed(2)}
Texture: ${texture.toFixed(2)}
ISI: ${isi.toFixed(2)} (${percentage}%)
${label}
`;

    } catch (err) {
      console.error("Detection error:", err);
    }
  }, 400);
}

// -----------------------------
// Risk Bar Helper
// -----------------------------
function updateRiskBar(value, color) {
  riskBar.style.width = `${value}%`;
  riskBar.style.backgroundColor = color;
}

// -----------------------------
function stopDetection() {
  if (detectionInterval) {
    clearInterval(detectionInterval);
    detectionInterval = null;
  }
}

// Initialize
handleModeChange();
