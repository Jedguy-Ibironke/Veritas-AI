const tabs = document.querySelectorAll(".tab");
const uploadArea = document.getElementById("uploadArea");
const fileInput = document.getElementById("fileInput");
const video = document.getElementById("video");
const imagePreview = document.getElementById("imagePreview");
const riskBar = document.getElementById("riskBar");
const status = document.getElementById("status");

let currentMode = "image";
let detectionInterval = null;
let mobilenetModel = null;

/* ---------------- LOAD MODELS ---------------- */

async function loadModels() {
  await faceapi.nets.tinyFaceDetector.loadFromUri("./models");
  mobilenetModel = await mobilenet.load();
  console.log("Models loaded successfully");
}

loadModels();

/* ---------------- TAB SWITCH ---------------- */

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

/* ---------------- FILE HANDLING ---------------- */

uploadArea.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;

  const url = URL.createObjectURL(file);

  if (currentMode === "image") {
    imagePreview.src = url;
    imagePreview.style.display = "block";
    video.style.display = "none";
    imagePreview.onload = () => startDetection(imagePreview);
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
});

/* ---------------- WEBCAM ---------------- */

async function startWebcam() {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;
  video.style.display = "block";
  imagePreview.style.display = "none";

  video.onloadeddata = () => {
    video.play();
    startDetection(video);
  };
}

/* ---------------- DETECTION ---------------- */

function startDetection(element) {
  stopDetection();

  detectionInterval = setInterval(async () => {
    if (!mobilenetModel) return;

    const detection = await faceapi.detectSingleFace(
      element,
      new faceapi.TinyFaceDetectorOptions({ inputSize: 416 })
    );

    if (!detection) {
      status.innerText = "No face detected...";
      updateRisk(0);
      return;
    }

    const box = detection.box;

    const canvas = document.createElement("canvas");
    canvas.width = 224;
    canvas.height = 224;
    const ctx = canvas.getContext("2d");

    ctx.drawImage(
      element,
      box.x,
      box.y,
      box.width,
      box.height,
      0,
      0,
      224,
      224
    );

    const predictions = await mobilenetModel.classify(canvas);

    const confidence = predictions[0].probability;
    const risk = (1 - confidence) * 100;

    updateRisk(risk);

    status.innerText = `
Top Classification: ${predictions[0].className}
Model Confidence: ${(confidence * 100).toFixed(2)}%
Synthetic Risk: ${risk.toFixed(1)}%
    `;
  }, 1000);
}

/* ---------------- RISK BAR ---------------- */

function updateRisk(value) {
  riskBar.style.width = value + "%";

  if (value > 60) {
    riskBar.style.background = "#ff3b3b";
  } else if (value > 30) {
    riskBar.style.background = "#ffaa00";
  } else {
    riskBar.style.background = "#00cc66";
  }
}

/* ---------------- CLEANUP ---------------- */

function stopDetection() {
  if (detectionInterval) {
    clearInterval(detectionInterval);
    detectionInterval = null
