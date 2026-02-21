// main.js
import * as faceapi from "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js";
import {
  computeFaceTexture,
  computeFrameTexture,
  computeTextureScore
} from "./metrics.js";

// ------------------------------
// DOM Elements
// ------------------------------
const video = document.getElementById("video");
const imagePreview = document.getElementById("imagePreview");
const modeSelect = document.getElementById("modeSelect");
const fileInput = document.getElementById("fileInput");

const riskBar = document.getElementById("riskBar");
const status = document.getElementById("status");

// ------------------------------
// Global Variables
// ------------------------------
let previousNose = null;
let detectionInterval = null;
let currentMode = "live";

// ------------------------------
// Load Models
// ------------------------------
async function loadModels() {
  try {
    await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
    await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
    console.log("Face-api models loaded ✅");
  } catch (err) {
    console.error("Failed to load models:", err);
  }
}

await loadModels();

// ------------------------------
// Event Listeners
// ------------------------------
modeSelect.addEventListener("change", handleModeChange);
fileInput.addEventListener("change", handleFileUpload);

// ------------------------------
// Mode Switch
// ------------------------------
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

// ------------------------------
// Webcam
// ------------------------------
async function startWebcam() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    await video.play();
    console.log("Webcam running ✅");
    startDetection(video);
  } catch (err) {
    console.error("Webcam error:", err);
    alert("Cannot access webcam. Check permissions.");
  }
}

// ------------------------------
// File Upload
// ------------------------------
function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const url = URL.createObjectURL(file);
  stopDetection();

  if (currentMode === "image") {
    imagePreview.src = url;
    imagePreview.style.display = "block";
    imagePreview.onload = () => startDetection(imagePreview);
  }

  if (currentMode === "video") {
    video.src = url;
    video.style.display = "block";
    video.onloadedmetadata = () => {
      video.play();
      startDetection(video);
    };
  }
}

// ------------------------------
// Detection Loop
// ------------------------------
function startDetection(element) {
  stopDetection();

  detectionInterval = setInterval(async () => {
    try {
      // --------------------------
      // Detect face with landmarks
      // --------------------------
      const detection = await faceapi
        .detectSingleFace(element, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks();

      if (!detection) {
        // No face detected: show webcam only
        updateRiskUI(0, 0, 0, 0, true);
        return;
      }

      const landmarks = detection.landmarks.positions;
      const structural = computeStructuralScore(landmarks);
      const behavioral = computeBehavioralScore(landmarks);

      // --------------------------
      // Real Texture Scoring
      // --------------------------
      const faceBox = detection.detection.box;
      const faceTexture = computeFaceTexture(element, faceBox);
      const frameTexture = computeFrameTexture(element);
      const texture = computeTextureScore(faceTexture, frameTexture);

      // --------------------------
      // Final Risk
      // --------------------------
      const risk = computeFinalRisk({ structural, behavioral, texture });

      // --------------------------
      // Update UI
      // --------------------------
      updateRiskUI(risk, structural, texture, behavioral);
      console.log({ structural, behavioral, texture, risk });

    } catch (err) {
      console.error("Detection error:", err);
      updateRiskUI(0, 0, 0, 0, true); // fallback
    }
  }, 300);
}

function stopDetection() {
  if (detectionInterval) {
    clearInterval(detectionInterval);
    detectionInterval = null;
  }
}

// ------------------------------
// Behavioral / Structural Metrics
// ------------------------------
function distance(p1, p2) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function computeBehavioralScore(landmarks) {
  if (!landmarks) return 0;
  const nose = landmarks[30];
  if (!previousNose) {
    previousNose = nose;
    return 0;
  }
  const movement = distance(nose, previousNose);
  previousNose = nose;
  return Math.min(movement / 15, 1);
}

function computeStructuralScore(landmarks) {
  if (!landmarks) return 0;
  const leftEye = landmarks[36];
  const rightEye = landmarks[45];
  const nose = landmarks[30];
  const jawLeft = landmarks[0];
  const jawRight = landmarks[16];

  const leftDist = Math.abs(leftEye.x - nose.x);
  const rightDist = Math.abs(rightEye.x - nose.x);
  const symmetryDiff = Math.abs(leftDist - rightDist);
  const symmetryScore = 1 - Math.min(symmetryDiff / 20, 1);

  const eyeDistance = Math.abs(rightEye.x - leftEye.x);
  const faceWidth = Math.abs(jawRight.x - jawLeft.x);
  const ratio = eyeDistance / faceWidth;
  const idealRatio = 0.45;
  const ratioDiff = Math.abs(ratio - idealRatio);
  const ratioScore = 1 - Math.min(ratioDiff / 0.15, 1);

  return (symmetryScore + ratioScore) / 2;
}

// ------------------------------
// Compute Final Risk
// ------------------------------
function computeFinalRisk({ structural, behavioral, texture }) {
  return Math.min(0.4 * structural + 0.4 * behavioral + 0.2 * texture, 1);
}

// ------------------------------
// Update UI
// ------------------------------
function updateRiskUI(risk, structural, texture, behavioral, noFace = false) {
  const percentage = (risk * 100).toFixed(0);
  riskBar.style.width = `${percentage}%`;

  if (risk < 0.3) riskBar.style.backgroundColor = "green";
  else if (risk < 0.6) riskBar.style.backgroundColor = "orange";
  else riskBar.style.backgroundColor = "red";

  if (noFace) {
    status.innerText = "No face detected";
    return;
  }

  status.innerText = `
Structural: ${structural.toFixed(2)}
Behavioral: ${behavioral.toFixed(2)}
Texture: ${texture.toFixed(2)}
Final Risk: ${risk.toFixed(2)} (${percentage}%)
Label: ${risk < 0.3 ? "Likely Human" : risk < 0.6 ? "Possibly Synthetic" : "Likely AI Generated"}
`;
}

// ------------------------------
// Initialize
// ------------------------------
handleModeChange();