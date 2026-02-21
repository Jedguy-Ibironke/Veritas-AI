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

const videoLoader = document.getElementById("videoLoader");
const loaderBar = document.getElementById("loaderBar");
const loaderText = document.getElementById("loaderText");

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
    videoLoader.style.display = "none";
    startWebcam();
  } else {
    fileInput.style.display = "inline";
    video.style.display = "none";
    imagePreview.style.display = "none";
    videoLoader.style.display = "none";
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

    video.onloadedmetadata = async () => {
      await processUploadedVideo(video);
    };
  }
}

// ===============================
// Live / Image Detection Loop
// ===============================
function startDetection(element) {
  stopDetection();

  detectionInterval = setInterval(async () => {
    try {
      const landmarks = await detectLandmarks(element);
      if (!landmarks) return;

      const structural = computeStructuralScore(landmarks);
      const texture = computeTextureScore(element);
      const behavioral =
        currentMode === "live" ? computeBehavioralScore(landmarks) : 0;

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
// VIDEO PROCESSING LOADER
// ===============================
async function processUploadedVideo(videoElement) {
  videoLoader.style.display = "block";
  loaderBar.style.width = "0%";
  loaderText.innerText = "Processing video...";

  const duration = videoElement.duration;
  let accumulatedRisk = 0;
  let frameCount = 0;

  videoElement.pause();
  videoElement.currentTime = 0;

  return new Promise((resolve) => {

    videoElement.addEventListener("seeked", async function processFrame() {

      if (videoElement.currentTime >= duration) {

        const finalRisk = frameCount > 0
          ? accumulatedRisk / frameCount
          : 0;

        loaderBar.style.width = "100%";
        loaderText.innerText = "Processing complete ✔";

        updateRiskUI(finalRisk, 0, 0, 0);

        setTimeout(() => {
          videoLoader.style.display = "none";
        }, 1200);

        resolve();
        return;
      }

      const landmarks = await detectLandmarks(videoElement);

      if (landmarks) {
        const structural = computeStructuralScore(landmarks);
        const texture = computeTextureScore(videoElement);
        const behavioral = computeBehavioralScore(landmarks);

        const risk = computeFinalRisk({
          structural,
          texture,
          behavioral,
          source: "video"
        });

        accumulatedRisk += risk;
        frameCount++;
      }

      const progress = videoElement.currentTime / duration;
      loaderBar.style.width = `${(progress * 100).toFixed(0)}%`;
      loaderText.innerText = `Processing video... ${(progress * 100).toFixed(0)}%`;

      videoElement.currentTime += 0.3; // adjust speed here
    });

    videoElement.currentTime = 0.01;
  });
}

// ===============================
// Risk UI
// ===============================
function updateRiskUI(risk, structural, texture, behavioral) {
  if (!riskBar || !status) return;

  const percentage = (risk * 100).toFixed(0);

  riskBar.style.width = `${percentage}%`;

  if (risk < 0.3) {
    riskBar.style.backgroundColor = "green";
  } else if (risk < 0.6) {
    riskBar.style.backgroundColor = "orange";
  } else {
    riskBar.style.backgroundColor = "red";
  }

  status.innerText = `
Structural: ${structural.toFixed(2)}
Texture: ${texture.toFixed(2)}
Behavioral: ${behavioral.toFixed(2)}
Final Risk: ${risk.toFixed(2)} (${percentage}%)
Label: ${getRiskLabel(risk)}
`;
}

// Initialize
handleModeChange();
