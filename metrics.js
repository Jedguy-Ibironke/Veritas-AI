// ===============================
// metrics.js
// Identity Stability Index (ISI)
// ===============================

// -----------------------------
// Utility: Euclidean distance
// -----------------------------
function distance(p1, p2) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// ==============================
// BEHAVIORAL (Temporal Jitter)
// ==============================

let previousLandmarks = null;

export function computeBehavioralScore(landmarks) {
  if (!landmarks) return 0;

  if (!previousLandmarks) {
    previousLandmarks = landmarks;
    return 0;
  }

  let totalMovement = 0;

  for (let i = 0; i < landmarks.length; i++) {
    totalMovement += distance(landmarks[i], previousLandmarks[i]);
  }

  previousLandmarks = landmarks;

  const avgMovement = totalMovement / landmarks.length;

  // Normalize (10px typical upper jitter bound)
  return Math.min(avgMovement / 10, 1);
}

// ==============================
// STRUCTURAL (Temporal Consistency)
// ==============================

let previousRatio = null;

export function computeStructuralScore(landmarks) {
  if (!landmarks) return 1;

  const leftEye = landmarks[36];
  const rightEye = landmarks[45];
  const jawLeft = landmarks[0];
  const jawRight = landmarks[16];

  const eyeDistance = Math.abs(rightEye.x - leftEye.x);
  const faceWidth = Math.abs(jawRight.x - jawLeft.x);

  const ratio = eyeDistance / faceWidth;

  if (!previousRatio) {
    previousRatio = ratio;
    return 1;
  }

  const diff = Math.abs(ratio - previousRatio);
  previousRatio = ratio;

  // If structure fluctuates → suspicious
  const instability = Math.min(diff / 0.05, 1);

  return 1 - instability;
}

// ==============================
// TEXTURE (Face-Only Variance)
// ==============================

export function computeTextureScore(videoElement, faceBox) {
  if (!faceBox) return 0;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  const { x, y, width, height } = faceBox;

  canvas.width = width;
  canvas.height = height;

  ctx.drawImage(
    videoElement,
    x, y, width, height,
    0, 0, width, height
  );

  const data = ctx.getImageData(0, 0, width, height).data;

  let mean = 0;
  let variance = 0;
  const totalPixels = data.length / 4;

  for (let i = 0; i < data.length; i += 4) {
    const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
    mean += gray;
  }

  mean /= totalPixels;

  for (let i = 0; i < data.length; i += 4) {
    const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
    variance += Math.pow(gray - mean, 2);
  }

  variance /= totalPixels;

  // AI faces often overly smooth → low variance
  const smoothness = 1 - Math.min(variance / 2500, 1);

  return smoothness;
}

// ==============================
// SLIDING WINDOW SMOOTHING
// ==============================

const windowSize = 10;
let isiWindow = [];

function smoothISI(currentISI) {
  isiWindow.push(currentISI);
  if (isiWindow.length > windowSize) {
    isiWindow.shift();
  }

  const sum = isiWindow.reduce((a, b) => a + b, 0);
  return sum / isiWindow.length;
}

// ==============================
// FINAL IDENTITY STABILITY INDEX
// ==============================

export function computeISI({
  structural,
  behavioral,
  texture
}) {
  // Convert instability → stability
  const temporalStability = 1 - behavioral;
  const textureRealism = 1 - texture;

  const rawISI =
    structural *
    temporalStability *
    textureRealism;

  return smoothISI(rawISI);
}

// ==============================
//  LABEL
// ==============================

export function getRiskLabel(isi) {
  if (isi > 0.75) return "🟢 Stable Identity (Likely Human)";
  if (isi > 0.45) return "🟡 Moderate Stability";
  return "🔴 Unstable Identity (Likely Synthetic)";
}