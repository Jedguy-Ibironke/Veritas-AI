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
    video.style.display = "none";
    imagePreview.style.display = "none";
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
  }

  if (currentMode === "video") {
    video.src = url;
    video.style.display = "block";

    video.onloadedmetadata = () => {
      video.play();
