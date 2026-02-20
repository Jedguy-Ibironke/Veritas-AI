import { detectLandmarks } from "./landmarks.js";
import {
  computeStructuralScore,
  computeTextureScore,
  computeBehavioralScore,
  computeFinalRisk,
  getRiskLabel
} from "./metrics.js";

const video = document.getElementById("video");
const imagePreview = document.getElementById("imagePreview");
const fileInput = document.getElementById("fileInput");
const modeSelect = document.getElementById("modeSelect");
const riskBar = document.getElementById("riskBar");
const status = document.getElementById("status");

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
  } else {
    fileInput.style.display = "inline";
    imagePreview.style.display = "none";
    video.style.display = "none";
  }
}

// ===============================
// Webcam
// ===============================
async function startWebcam() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: true
  });

  video.srcObject = stream;

  video.onloadedmetadata = () => {
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

  if (currentMode === "image") {
    imagePreview.src = url;
    imagePreview.style.display = "block";

    imagePreview.onload = () => {
      startDetection(imagePreview);
    };
  }

  if (currentMode === "video") {
    video.src = url;
    video.style.display = "block";

    video.onloadedmetadata = () => {
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
    const landmarks = await detectLandmarks(element);
    if (!landmarks) return;

    const structural = computeStructuralScore(landmarks);
    const texture = computeTextureScore(element);
    const behavioral =
      currentMode === "live" || currentMode === "video"
        ? computeBehavioralScore(landmarks)
        : 0;

    const risk = computeFinalRisk({
      structural,
      texture,
      behavioral,
      source: currentMode
    });

    updateRiskUI(risk, structural, texture, behavioral);
  }, 300);
}

function stopDetection() {
  if (detectionInterval) {
    clearInterval(detectionInterval);
    detectionInterval = null;
  }
}

// ===============================
// Risk UI
// =================
