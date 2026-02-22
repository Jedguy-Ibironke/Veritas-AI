import {
  computeBehavioralScore,
  computeStructuralScore,
  computeFaceTexture,
  computeFrameTexture,
  computeTextureScore
} from "./metrics.js";

import { computeISI, getRiskLabel } from "./scoring.js";

/* ===============================
   DOM REFERENCES
================================= */
const tabs = document.querySelectorAll(".tab");
const uploadArea = document.getElementById("uploadArea");
const fileInput = document.getElementById("fileInput");
const video = document.getElementById("video");
const imagePreview = document.getElementById("imagePreview");
const riskBar = document.getElementById("riskBar");
const status = document.getElementById("status");

let currentMode = "image";
let stream = null;
let detectionInterval = null;
let modelsReady = false;

/* ===============================
   LOAD FACE-API MODELS
================================= */
async function loadModels() {
  try {
    console.log("Loading models...");
    await faceapi.nets.tinyFaceDetector.loadFromUri("./models");
    await faceapi.nets.faceLandmark68Net.loadFromUri("./models");
    modelsReady = true;
    console.log("✅ Models loaded successfully");
  } catch (err) {
    console.error("❌ Model loading failed:", err);
  }
}

await loadModels();

/* ===============================
   TAB SWITCHING
================================= */
tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    tabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    currentMode = tab.dataset.mode;
    resetView();
  });
});

/* ===============================
   FILE UPLOAD + DRAG DROP
================================= */
uploadArea.addEventListener("click", () => {
  if (currentMode !== "live") fileInput.click();
});

uploadArea.addEventListener("dragover", e => {
  e.preventDefault();
  uploadArea.classList.add("dragover");
});

uploadArea.addEventListener("dragleave", () => {
  uploadArea.classList.remove("dragover");
});

uploadArea.addEventListener("drop", e => {
  e.preventDefault();
  uploadArea.classList.remove("dragover");
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});

fileInput.addEventListener("change", e => {
  const file = e.target.files[0];
  if (file) handleFile(file);
});

function handleFile(file) {
  const url = URL.createObjectURL(file);

  if (currentMode === "image") {
    imagePreview.src = url;
    imagePreview.style.display = "block";
    video.style.display = "none";

    imagePreview.onload = () => {
      console.log("Image loaded → starting detection");
      startDetection(imagePreview);
    };
  }

  if (currentMode === "video") {
    video.src = url;
    video.style.display = "block";
    imagePreview.style.display = "none";

    video.onloadedmetadata = () => {
      video.play();
      console.log("Video loaded → starting detection");
      startDetection(video);
    };
  }
}

/* ===============================
   LIVE CAMERA
================================= */
async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    video.style.display = "block";
    imagePreview.style.display = "none";
    video.play();

    console.log("Camera started → detection running");
    startDetection(video);
  } catch (err) {
    console.error("Camera error:", err);
  }
}

tabs.forEach(tab => {
  if (tab.dataset.mode === "live") {
    tab.addEventListener("click", startCamera);
  }
});

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }
}

/* ===============================
   DETECTION LOOP
================================= */
function startDetection(element) {
  if (!modelsReady) {
    console.warn("Models not ready yet.");
    return;
  }

  stopDetection();

  detectionInterval = setInterval(async () => {
    const detection = await faceapi
      .detectSingleFace(element, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks();

    if (!detection) {
      status.textContent = "No face detected.";
      riskBar.style.width = "0%";
      return;
    }

    const landmarks = detection.landmarks.positions;

    const behavioral = computeBehavioralScore(landmarks);
    const structural = computeStructuralScore(landmarks);

    const faceTexture = computeFaceTexture(
      element,
      detection.detection.box
    );
    const frameTexture = computeFrameTexture(element);
    const texture = computeTextureScore(faceTexture, frameTexture);

    const isi = computeISI({ structural, behavioral, texture });
    const label = getRiskLabel(isi);

    updateUI(structural, behavioral, texture, isi, label);
  }, 400);
}

function stopDetection() {
  if (detectionInterval) clearInterval(detectionInterval);
}

/* ===============================
   UI UPDATE
================================= */
function updateUI(structural, behavioral, texture, isi, label) {
  const percent = Math.max(0, Math.min(isi * 100, 100));
  riskBar.style.width = percent + "%";

  if (isi > 0.75) riskBar.style.background = "green";
  else if (isi > 0.45) riskBar.style.background = "orange";
  else riskBar.style.background = "red";

  status.textContent =
`Structural: ${structural.toFixed(2)}
Behavioral: ${behavioral.toFixed(2)}
Texture: ${texture.toFixed(2)}
ISI: ${isi.toFixed(2)}
${label}`;
}

/* ===============================
   RESET VIEW
================================= */
function resetView() {
  stopCamera();
  stopDetection();
  imagePreview.style.display = "none";
  video.style.display = "none";
  riskBar.style.width = "0%";
  status.textContent = "";
}
