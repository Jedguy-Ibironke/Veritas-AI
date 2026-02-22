import {
  computeBehavioralScore,
  computeStructuralScore,
  computeFaceTexture,
  computeFrameTexture,
  computeTextureScore
} from "./metrics.js";

import { computeISI, getRiskLabel } from "./scoring.js";

const tabs = document.querySelectorAll(".tab");
const uploadArea = document.getElementById("uploadArea");
const fileInput = document.getElementById("fileInput");
const video = document.getElementById("video");
const imagePreview = document.getElementById("imagePreview");
const riskBar = document.getElementById("riskBar");
const status = document.getElementById("status");

let currentMode = "image";
let stream = null;
let modelsReady = false;
let detectionInterval = null;

/* ===========================
   LOAD MODELS
=========================== */
async function loadModels() {
  await faceapi.nets.tinyFaceDetector.loadFromUri("./models/");
  await faceapi.nets.faceLandmark68Net.loadFromUri("./models/");
  modelsReady = true;
}
loadModels();

/* ===========================
   TAB SWITCHING
=========================== */
tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    tabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    currentMode = tab.dataset.mode;
    resetView();
    if (currentMode === "live") startCamera();
  });
});

/* ===========================
   FILE HANDLING
=========================== */
uploadArea.addEventListener("click", () => {
  if (currentMode !== "live") fileInput.click();
});

fileInput.addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  handleFile(file);
});

function handleFile(file) {
  const url = URL.createObjectURL(file);

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

/* ===========================
   CAMERA
=========================== */
async function startCamera() {
  stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;
  video.style.display = "block";
  video.play();
  startDetection(video);
}

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }
}

/* ===========================
   DETECTION LOOP
=========================== */
function startDetection(element) {
  if (!modelsReady) return;
  stopDetection();

  detectionInterval = setInterval(async () => {
    const detection = await faceapi
      .detectSingleFace(element, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks();

    if (!detection) return;

    const landmarks = detection.landmarks.positions;

    const behavioral = computeBehavioralScore(landmarks);
    const structural = computeStructuralScore(landmarks);

    const faceTexture = computeFaceTexture(element, detection.detection.box);
    const frameTexture = computeFrameTexture(element);
    const texture = computeTextureScore(faceTexture, frameTexture);

    const isi = computeISI({ structural, behavioral, texture });
    const label = getRiskLabel(isi);

    const percent = (isi * 100).toFixed(0);
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
  }, 400);
}

function stopDetection() {
  if (detectionInterval) clearInterval(detectionInterval);
}

/* ===========================
   RESET
=========================== */
function resetView() {
  imagePreview.style.display = "none";
  video.style.display = "none";
  stopCamera();
  stopDetection();
}
