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
  // Load face detection model from local /models folder
  await faceapi.nets.tinyFaceDetector.loadFromUri("./models");

  // Load MobileNet
  mobilenetModel = await mobilenet.load();

  console.log("Models loaded successfully");
}

loadModels();

/* ---------------- TAB SWITCHING ---------------- */

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

/* ---------------- ANALYSIS ---------------- */

async function analyzeFace(element, box) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  const size = 224;
  canvas.width = size;
  canvas.height = size;

  // Crop face region into square
  ctx.drawImage(
    element,
    box.x,
    box.y,
    box.width,
    box.height,
    0,
    0,
    size,
    size
  );

  const predictions = await mobilenetModel.classify(canvas);

  const topConfidence = predictions[0].probability;

  // Higher confidence = more likely real
  const riskScore = 1 - topConfidence;

  return {
    label: predictions[0].className,
    confidence: topConfidence,
    risk: riskScore
  };
}

/* ---------------- DETECTION LOOP ---------------- */

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

    const result = await analyzeFace(element, detection.box);

    const riskPercent = Math.min(100, Math.max(0, result.risk * 100));

    updateRisk(riskPercent);

    status.innerText = `
Top Classification: ${result.label}
Model Confidence: ${(result.confidence * 100).toFixed(2)}%
Synthetic Risk: ${riskPercent.toFixed(1)}%
    `;
  }, 1000);
}

/* ---------------- RISK BAR ---------------- */

function updateRisk(value) {
  riskBar.style.width = value + "%";

  if (value > 60) {
    riskBar.style.background = "#ff3b3b";   // High risk
  } else if (value > 30) {
    riskBar.style.background = "#ffaa00";   // Medium
  } else {
    riskBar.style.background = "#00cc66";   // Low risk (likely human)
  }
}

/* ---------------- CLEANUP ---------------- */

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
