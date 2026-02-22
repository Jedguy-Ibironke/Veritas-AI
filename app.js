const tabs = document.querySelectorAll(".tab");
const uploadArea = document.getElementById("uploadArea");
const fileInput = document.getElementById("fileInput");
const video = document.getElementById("video");
const imagePreview = document.getElementById("imagePreview");

let currentMode = "image";
let stream = null;

// =========================
// TAB SWITCHING
// =========================
tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    tabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");

    currentMode = tab.dataset.mode;
    resetView();

    if (currentMode === "live") {
      startCamera();
    }
  });
});

// =========================
// DRAG & DROP
// =========================
uploadArea.addEventListener("click", () => {
  if (currentMode !== "live") {
    fileInput.click();
  }
});

uploadArea.addEventListener("dragover", (e) => {
  e.preventDefault();
  uploadArea.classList.add("dragover");
});

uploadArea.addEventListener("dragleave", () => {
  uploadArea.classList.remove("dragover");
});

uploadArea.addEventListener("drop", (e) => {
  e.preventDefault();
  uploadArea.classList.remove("dragover");

  if (currentMode === "live") return;

  const file = e.dataTransfer.files[0];
  handleFile(file);
});

fileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  handleFile(file);
});

// =========================
// HANDLE FILE
// =========================
function handleFile(file) {
  if (!file) return;

  const url = URL.createObjectURL(file);

  if (currentMode === "image") {
    imagePreview.src = url;
    imagePreview.style.display = "block";
  }

  if (currentMode === "video") {
    video.src = url;
    video.style.display = "block";
    video.play();
  }
}

// =========================
// CAMERA
// =========================
async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    video.style.display = "block";
    video.play();
  } catch (err) {
    alert("Camera access denied.");
  }
}

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }
}

// =========================
// RESET VIEW
// =========================
function resetView() {
  imagePreview.style.display = "none";
  video.style.display = "none";
  stopCamera();
}
