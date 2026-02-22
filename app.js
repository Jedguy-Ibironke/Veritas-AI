import {
  computeBehavioralScore,
  computeStructuralScore,
  computeFaceTexture,
  computeFrameTexture,
  computeTextureScore
} from "./metrics.js";

import { computeISI, getRiskLabel } from "./scoring.js";

/* ------------------ DOM ELEMENTS ------------------ */

const tabs = document.querySelectorAll(".tab");
const uploadArea = document.getElementById("uploadArea");
const fileInput = document.getElementById("fileInput");
const video = document.getElementById("video");
const imagePreview = document.getElementById("imagePreview");
const riskBar = document.getElementById("riskBar");
const status = document.getElementById("status");

/* ------------------ STATE ------------------ */

let currentMode = "image";
let detectionInterval = null;

/* ------------------ LOAD MODELS ------------------ */

async function loadModels() {
  await faceapi.nets.tinyFaceDetector.loadFromUri("./models");
  await faceapi.nets.faceLandmark68Net.loadFromUri("./models");
  console.log("Models loaded");
}

loadModels();

/* ------------------ TAB SWITCHING ------------------ */

tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    tabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");

    currentMode = tab.dataset.mode;

    stopDetection();
    resetUI();

    if (currentMode === "live") {
      startWebcam();
    }
  });
});

/* ------------------ FILE UPLOAD ------------------ */

uploadArea.addEventListener("click", () => fileInput.click());

uploadArea.addEventListener("dragover", e => e.preventDefault());

uploadArea.addEventListener("drop", e => {
  e.preventDefault();
  handleFile(e.dataTransfer.files[0]);
});

fileInput.addEventListener("change", e => {
  handleFile(e.target.files[0]);
});

function handleFile(file) {
  if (!file) return;

  const url = URL.createObjectURL(file);

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

    video.onloadeddata = () => {
      video.play();
      startDetection(video);
    };
  }
}

/* ------------------ WEBCAM ------------------ */

async function startWebcam() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    video.style.display = "block";
    imagePreview.style.display = "none";

    video.onloadeddata = () => {
      video.play();
      startDetection(video);
    };
  } catch (err) {
    console.error("Webcam error:", err);
  }
}

/* ------------------ DETECTION LOOP ------------------ */

function startDetection(element) {
  stopDetection();

  detectionInterval = setInterval(async () => {
    const detection = await faceapi
      .detectSingleFace(
        element,
        new faceapi.TinyFaceDetectorOptions({
          inputSize: 608,        // higher detail
          scoreThreshold: 0.15   // more sensitive
        })
      )
      .withFaceLandmarks();

    if (!detection) {
      status.innerText = "No face detected...";
      updateRisk(0);
      return;
    }

    const landmarks = detection.landmarks.positions;

    const structural = computeStructuralScore(landmarks);
    const behavioral = computeBehavioralScore(landmarks);
    const faceTexture = computeFaceTexture(element, detection.detection.box);
    const frameTexture = computeFrameTexture(element);
    const texture = computeTextureScore(faceTexture, frameTexture);

    const isi = computeISI({
      structural,
      behavioral,
      texture
    });

    /* 🔥 INVERTED RISK LOGIC */
    const riskScore = 1 - isi;
    const percent = Math.min(100, Math.max(0, riskScore * 100));

    updateRisk(percent);

    status.innerText = `
Structural: ${structural.toFixed(2)}
Behavioral: ${behavioral.toFixed(2)}
Texture: ${texture.toFixed(2)}
ISI (Stability): ${isi.toFixed(2)}
Risk Level: ${getRiskLabel(isi)}
    `;
  }, 700);
}

/* ------------------ RISK BAR ------------------ */

function updateRisk(value) {
  riskBar.style.width = value + "%";

  if (value > 60) {
    riskBar.style.background = "#ff3b3b"; // High Risk
  } else if (value > 30) {
    riskBar.style.background = "#ffaa00"; // Medium
  } else {
    riskBar.style.background = "#00cc66"; // Stable
  }
}

/* ------------------ CLEANUP ------------------ */

function stopDetection() {
  if (detectionInterval) {
    clearInterval(detectionInterval);
    detectionInterval = null;
  }
}

function resetUI() {
  imagePreview.style.display = "none";
  video.style.display = "none";
  status.innerText = "";
  updateRisk(0);
}
