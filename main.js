import { startWebcam } from "./camera.js";
import { detectLandmarks } from "./landmarks.js";
import {
  computeMouthOpen,
  computeInstability,
  computeRisk,
  getRiskLabel,
} from "./metrics.js";

const video = document.getElementById("video");
const imagePreview = document.getElementById("imagePreview");
const status = document.getElementById("status");
const modeSelect = document.getElementById("modeSelect");
const fileInput = document.getElementById("fileInput");
const riskBar = document.getElementById("riskBar");

let detectionRunning = false;

/* =========================
   MODE SWITCHING
========================= */

modeSelect.addEventListener("change", handleModeChange);
fileInput.addEventListener("change", handleFileUpload);

function handleModeChange() {
  const mode = modeSelect.value;

  stopDetection();

  if (mode === "live") {
    fileInput.style.display = "none";
    imagePreview.style.display = "none";
    video.style.display = "block";
    startWebcam(video).then(startDetection);
  } else {
    fileInput.style.display = "inline";
    video.style.display = "none";
    imagePreview.style.display = "none";
  }
}

/* =========================
   FILE UPLOAD
========================= */

function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const url = URL.createObjectURL(file);

  if (file.type.startsWith("image")) {
    imagePreview.src = url;
    imagePreview.style.display = "block";
    analyzeImage();
  }

  if (file.type.startsWith("video")) {
    video.src = url;
    video.style.display = "block";
    video.play();
    startDetection();
  }
}

/* =========================
   LIVE / VIDEO DETECTION
========================= */

function startDetection() {
  detectionRunning = true;

  async function detect() {
    if (!detectionRunning) return;

    const landmarks = await detectLandmarks(video);

    if (landmarks) {
      processMetrics(landmarks);
    }

    requestAnimationFrame(detect);
  }

  detect();
}

function stopDetection() {
  detectionRunning = false;
}

/* =========================
   IMAGE ANALYSIS
========================= */

async function analyzeImage() {
  const landmarks = await detectLandmarks(imagePreview);

  if (!landmarks) return;

  processMetrics(landmarks, true);
}

/* =========================
   METRIC PROCESSING
========================= */

function processMetrics(landmarks, isImage = false) {
  const mouthOpen = computeMouthOpen(landmarks);
  const instability = isImage ? 0 : computeInstability(landmarks);

  const risk = computeRisk(instability, mouthOpen);
  const label = getRiskLabel(risk);

  updateRiskBar(risk);

  status.innerText = `
Mouth: ${mouthOpen.toFixed(3)}
Instability: ${instability.toFixed(3)}
Risk: ${risk.toFixed(3)} (${label})
  `;
}

/* =========================
   🔥 HACKATHON BOOST
   RISK BAR VISUALIZER
========================= */

function updateRiskBar(risk) {
  const percent = Math.min(risk * 100, 100);
  riskBar.style.width = percent + "%";

  if (risk < 0.2) {
    riskBar.style.background = "green";
  } else if (risk < 0.5) {
    riskBar.style.background = "orange";
  } else {
    riskBar.style.background = "red";
  }
}

/* =========================
   START DEFAULT MODE
========================= */

handleModeChange();
