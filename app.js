const tabs = document.querySelectorAll(".tab");
const uploadArea = document.getElementById("uploadArea");
const fileInput = document.getElementById("fileInput");
const video = document.getElementById("video");
const imagePreview = document.getElementById("imagePreview");
const riskBar = document.getElementById("riskBar");
const status = document.getElementById("status");

let currentMode = "image";
let detectionInterval = null;
let model = null;

/* ---------------- LOAD MODEL ---------------- */

async function loadModel() {
  model = await mobilenet.load();
  console.log("MobileNet loaded successfully");
}

loadModel();

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
  const file = e.target.files[0];
  if (!file) return;

  const url = URL.createObjectURL(file);

  if (currentMode === "image") {
    imagePreview.src = url;
    imagePreview.style.display = "block";
    video.style.display = "none";

    imagePreview.onload = () => analyze(imagePreview);
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
    status.innerText = "Webcam access denied.";
  }
}

/* ---------------- ANALYSIS ---------------- */

async function analyze(element) {
  if (!model) return;

  try {
    // Get top 5 predictions instead of just 1
    const predictions = await model.classify(element, 5);

    // Calculate entropy (uncertainty)
    let entropy = 0;
    predictions.forEach(p => {
      if (p.probability > 0) {
        entropy += -p.probability * Math.log2(p.probability);
      }
    });

    // Normalize entropy to a 0–100 scale (approximate)
    const maxEntropy = Math.log2(5); // max entropy for 5 classes
    const normalizedRisk = (entropy / maxEntropy) * 100;

    updateRisk(normalizedRisk);

    status.innerText = `
Top Prediction: ${predictions[0].className}
Confidence: ${(predictions[0].probability * 100).toFixed(2)}%
Uncertainty (Entropy): ${entropy.toFixed(3)}
Anomaly Risk: ${normalizedRisk.toFixed(1)}%
    `;
  } catch (err) {
    console.error("Analysis error:", err);
  }
}

function startDetection(element) {
  stopDetection();

  detectionInterval = setInterval(() => {
    analyze(element);
  }, 1500);
}

/* ---------------- RISK BAR ---------------- */

function updateRisk(value) {
  const safeValue = Math.max(0, Math.min(100, value));
  riskBar.style.width = safeValue + "%";

  if (safeValue > 60) {
    riskBar.style.background = "#ff3b3b";
  } else if (safeValue > 30) {
    riskBar.style.background = "#ffaa00";
  } else {
    riskBar.style.background = "#00cc66";
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
