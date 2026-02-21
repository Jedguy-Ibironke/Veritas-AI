// ===============================
// metrics.js
// Multi-layer Synthetic Detection
// ===============================

// -----------------------------
// Utility: Euclidean distance
// -----------------------------
function distance(p1, p2) {
  const dx = p2._x - p1._x;
  const dy = p2._y - p1._y;
  return Math.sqrt(dx * dx + dy * dy);
}

// -----------------------------
// Behavioral Instability
// -----------------------------
let previousNose = null;

export function computeBehavioralScore(landmarks) {
  if (!landmarks) return 0;

  const nose = landmarks[30];

  if (!previousNose) {
    previousNose = nose;
    return 0;
  }

  const movement = distance(nose, previousNose);
  previousNose = nose;

  // Normalize (15px typical movement max)
  return Math.min(movement / 15, 1);
}

// -----------------------------
// Structural Score
// -----------------------------
export function computeStructuralScore(landmarks) {
  if (!landmarks) return 0;

  const leftEye = landmarks[36];
  const rightEye = landmarks[45];
  const nose = landmarks[30];
  const jawLeft = landmarks[0];
  const jawRight = landmarks[16];

  // Symmetry
  const leftDist = Math.abs(leftEye._x - nose._x);
  const rightDist = Math.abs(rightEye._x - nose._x);
  const symmetryDiff = Math.abs(leftDist - rightDist);

  const symmetryScore = 1 - Math.min(symmetryDiff / 20, 1);

  // Eye ratio
  const eyeDistance = Math.abs(rightEye._x - leftEye._x);
  const faceWidth = Math.abs(jawRight._x - jawLeft._x);
  const ratio = eyeDistance / faceWidth;

  const idealRatio = 0.45;
  const ratioDiff = Math.abs(ratio - idealRatio);
  const ratioScore = 1 - Math.min(ratioDiff / 0.15, 1);

  return (symmetryScore + ratioScore) / 2;
}

// -----------------------------
// Texture Score (Over-smoothing)
// -----------------------------
export function computeTextureScore(imageElement) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = imageElement.width;
  canvas.height = imageElement.height;

  ctx.drawImage(imageElement, 0, 0);

  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

  let mean = 0;
  let variance = 0;
  const totalPixels = data.length / 4;

  // Compute mean grayscale
  for (let i = 0; i < data.length; i += 4) {
    const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
    mean += gray;
  }

  mean /= totalPixels;

  // Compute variance
  for (let i = 0; i < data.length; i += 4) {
    const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
    variance += Math.pow(gray - mean, 2);
  }

  variance /= totalPixels;

  // AI images often overly smooth → low variance
  const normalized = 1 - Math.min(variance / 2000, 1);

  return normalized;
}

// -----------------------------
// Final Risk Combiner
// -----------------------------
export function computeFinalRisk({
  structural,
  texture,
  behavioral,
  source
}) {
  let score;

  if (source === "image") {
    score = 0.6 * structural + 0.4 * texture;
  } else {
    // live or video
    score = 0.4 * structural + 0.4 * behavioral + 0.2 * texture;
  }

  return Math.min(Math.max(score, 0), 1);
}

// -----------------------------
// Risk Label
// -----------------------------
export function getRiskLabel(score) {
  if (score < 0.3) return "Likely Human";
  if (score < 0.6) return "Possibly Synthetic";
  return "Likely AI Generated";
}
