import { detectLandmarks } from "./landmarks.js";
import {
  computeBehavioralScore,
  computeStructuralScore,
  computeFaceTexture,
  computeFrameTexture,
  computeTextureScore
} from "./metrics.js";
import { computeISI, getRiskLabel } from "./scoring.js";

const video = document.getElementById("video");
const imagePreview = document.getElementById("imagePreview");
const modeSelect = document.getElementById("modeSelect");
const fileInput = document.getElementById("fileInput");
const riskBar = document.getElementById("riskBar");
const status = document.getElementById("status");
const modelStatus = document.getElementById("modelStatus");

let currentMode = "live";
let detectionInterval = null;
let modelsReady = false;

// ===============================
// LOAD MODELS
// ===============================

async function loadModels() {
  modelStatus.innerText = "Loading models...";

  try {
    await faceapi.nets.tinyFaceDetector.loadFromUri("./models/");
    await faceapi.nets.faceLandmark68Net.loadFromUri("./models/");

    modelsReady = true;
    modelStatus.innerText = "✅ Models loaded!";

    if (currentMode === "live") {
      startWebcam();
    }

  } catch (error) {
    modelStatus.innerText = "❌ Failed to load models";
    console.error("Model loading error:", error);
  }
}

loadModels();

// ===============================
// MODE SWITCHING
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
// WEBCAM
// ===============================

async function startWebcam() {
  if (!modelsReady) return;

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

// ===============================
// FILE UPLOAD
// ===============================

function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const url = URL.createObjectURL(file);
  stopDetection();

  if (currentMode === "image") {
    imagePreview.src = url;
    imagePreview.style.display = "block";

    imagePreview.onload = async () => {
      await new Promise(r => setTimeout(r, 200));
      startDetection(imagePreview);
    };
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

// ===============================
// DETECTION LOOP
// ===============================

function startDetection(element) {
  stopDetection();

  detectionInterval = setInterval(async () => {
    if (!modelsReady) return;

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

      // ✅ FIXED COLOR LOGIC
      if (isi > 0.75) riskBar.style.backgroundColor = "green";
      else if (isi > 0.45) riskBar.style.backgroundColor = "orange";
      else riskBar.style.backgroundColor = "red";

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
  }, 300);
}

function stopDetection() {
  if (detectionInterval) {
    clearInterval(detectionInterval);
    detectionInterval = null;
  }
}

handleModeChange();
