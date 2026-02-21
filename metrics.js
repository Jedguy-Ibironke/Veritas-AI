// ===============================
// metrics.js
// Multi-layer Synthetic Detection
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
// 1️⃣ BEHAVIORAL (Temporal Jitter)
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
// 2️⃣ STRUCTURAL (Temporal Consistency)
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

  // Fluctuation = suspicious
  const instability = Math.min(diff / 0.05, 1);

  return 1 - instability;
}

// ==============================
// 3️⃣ TEXTURE (Dual Region)
// ==============================

// Helper: compute variance from pixel data
function computeVarianceFromImageData(data) {
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

  return variance / totalPixels;
}

// Face-only texture
export function computeFaceTexture(video, faceBox) {
  if (!faceBox) return 0;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  const { x, y, width, height } = faceBox;

  canvas.width = width;
  canvas.height = height;

  ctx.drawImage(video, x, y, width, height, 0, 0, width, height);
  const data = ctx.getImageData(0, 0, width, height).data;
  const variance = computeVarianceFromImageData(data);

  // Over-smoothed = low variance
  return 1 - Math.min(variance / 2500, 1);
}

// Whole-frame texture
export function computeFrameTexture(video) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = video.videoWidth || video.width;
  canvas.height = video.videoHeight || video.height;

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

  const variance = computeVarianceFromImageData(data);
  return 1 - Math.min(variance / 3000, 1);
}

// Combined texture score
export function computeTextureScore(faceTexture, frameTexture) {
  return 0.7 * faceTexture + 0.3 * frameTexture;
}