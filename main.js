// ===============================
// main.js
// Real-time Multi-Layer Identity Stability Detection
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
const fileInput = document.getElementById("fileInput");
const modeSelect = document.getElementById("modeSelect");
const riskBar = document.getElementById("riskBar");
const status = document.getElementById("status");

// -----------------------------
// State
// -----------------------------
let currentMode = "live";
let detectionInterval = null;

// ===============================
// Mode Switching
// ===============================
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
  } else if (currentMode === "image") {
    fileInput.style.display = "inline";
    video.style.display = "none";
    imagePreview.style.display = "none";
  } else if (currentMode === "video") {
    fileInput.style.display = "inline";
    video.style.display = "none";
    imagePreview.style.display = "none";
  }
}

// ===============================
// Webcam
// ===============================
async function startWebcam() {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;

  video.onloadedmetadata = () => {
    video.play();
    startDetection(video);
  };
}

// ===============================
// File Upload
// ===============================
function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const url = URL.createObjectURL(file);

  stopDetection();

  if (currentMode === "image") {
    imagePreview.src = url;
    imagePreview.style.display = "block";

    imagePreview.onload = () => {
      startDetection(imagePreview);
    };
  } else if (currentMode === "video") {
    video.src = url;
    video.style.display = "block";

    video.onloadedmetadata = () => {
      video.play();
      startDetection(video);
    };
  }
}

// ===============================
// Detection Loop
// ===============================
function startDetection(element) {
  stopDetection();

  detectionInterval = setInterval(async () => {
    try {
      const detection = await detectLandmarks(element);
      if (!detection) return;

      const landmarks = detection.landmarks.positions;
      const faceBox = detection.detection.box;

      // ----------------------------
      // STRUCTURAL
      // ----------------------------
      const structural = computeStructuralScore(landmarks);

      // ----------------------------
      // BEHAVIORAL (only for live/video)
      // ----------------------------
      const behavioral =
        currentMode === "live" || currentMode === "video"
          ? computeBehavioralScore(landmarks)
          : 0;

      // ----------------------------
      // TEXTURE (dual-region)
      // ----------------------------
      const faceTexture = computeFaceTexture(element, faceBox);
      const frameTexture = computeFrameTexture(element);
      const texture = computeTextureScore(faceTexture, frameTexture);

      // ----------------------------
      // FINAL IDENTITY STABILITY INDEX
      // ----------------------------
      const isi = computeISI({
        structural,
        behavioral,
        texture
      });

      // ----------------------------
      // UPDATE UI
      // ----------------------------
      updateRiskUI(isi, structural, texture, behavioral);

    } catch (err) {
      console.error("Detection error:", err);
    }
  }, 300); // every 300ms
}

// ===============================
// Stop Detection
// ===============================
function stopDetection() {
  if (detectionInterval) {
    clearInterval(detectionInterval);
    detectionInterval = null;
  }
}

// ===============================
// Risk UI
// ===============================
function updateRiskUI(isi, structural, texture, behavioral) {
  if (!riskBar || !status) return;

  // Risk = 1 - ISI
  const risk = 1 - isi;
  const percentage = (risk * 100).toFixed(0);

  // Bar color coding
  if (risk < 0.3) riskBar.style.backgroundColor = "green";
  else if (risk < 0.6) riskBar.style.backgroundColor = "orange";
  else riskBar.style.backgroundColor = "red";

  riskBar.style.width = `${percentage}%`;

  // Status text
  status.innerText = `
Structural: ${structural.toFixed(2)}
Texture: ${texture.toFixed(2)}
Behavioral: ${behavioral.toFixed(2)}
ISI: ${isi.toFixed(2)}
Risk: ${risk.toFixed(2)} (${percentage}%)
Label: ${getRiskLabel(isi)}
`;
}

// ===============================
// Initialize Default Mode
// ===============================
handleModeChange();