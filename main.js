import { detectLandmarks } from "./landmarks.js";
import {
  computeBehavioralScore,
  computeStructuralScore,
  computeFaceTexture,
  computeFrameTexture,
  computeTextureScore
} from "./metrics.js";

import { computeISI, getRiskLabel } from "./scoring.js";

const landmarks = detection.landmarks.positions;
const faceBox = detection.detection.box;

const behavioral = computeBehavioralScore(landmarks);
const structural = computeStructuralScore(landmarks);

const faceTexture = computeFaceTexture(video, faceBox);
const frameTexture = computeFrameTexture(video);

const texture = computeTextureScore(faceTexture, frameTexture);

const isi = computeISI({
  structural,
  behavioral,
  texture
});

const label = getRiskLabel(isi);

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
      const landmarks = await detectLandmarks(element);
      if (!landmarks) return;

      const structural = computeStructuralScore(landmarks);

      const texture =
        currentMode === "image"
          ? computeTextureScore(element)
          : computeTextureScore(element);

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

// ===============================
// Risk UI
// ===============================
function updateRiskUI(risk, structural, texture, behavioral) {
  if (!riskBar || !status) return;

  const percentage = (risk * 100).toFixed(0);

  // Update width
  riskBar.style.width = `${percentage}%`;

  // Color coding
  if (risk < 0.3) {
    riskBar.style.backgroundColor = "green";
  } else if (risk < 0.6) {
    riskBar.style.backgroundColor = "orange";
  } else {
    riskBar.style.backgroundColor = "red";
  }

  // Status text
  status.innerText = `
Structural: ${structural.toFixed(2)}
Texture: ${texture.toFixed(2)}
Behavioral: ${behavioral.toFixed(2)}
Final Risk: ${risk.toFixed(2)} (${percentage}%)
Label: ${getRiskLabel(risk)}
`;
}

// ===============================
// Initialize Default Mode
// ===============================
handleModeChange();
