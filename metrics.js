// ===============================
// metrics.js
// Clean Stable Version
// ===============================

// -----------------------------
// Utility
// -----------------------------
function distance(p1, p2) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// -----------------------------
// Behavioral Score (movement)
// -----------------------------
let previousNose = null;

export function computeBehavioralScore(landmarks) {
  if (!landmarks || landmarks.length < 68) return 0;

  const nose = landmarks[30];

  if (!previousNose) {
    previousNose = nose;
    return 0;
  }

  const movement = distance(nose, previousNose);
  previousNose = nose;

  return Math.min(movement / 15, 1);
}

// -----------------------------
// Structural Score (symmetry + ratio)
// -----------------------------
export function computeStructuralScore(landmarks) {
  if (!landmarks || landmarks.length < 68) return 0;

  const leftEye = landmarks[36];
  const rightEye = landmarks[45];
  const nose = landmarks[30];
  const jawLeft = landmarks[0];
  const jawRight = landmarks[16];

  if (!leftEye || !rightEye || !nose || !jawLeft || !jawRight) return 0;

  // Symmetry check
  const leftDist = Math.abs(leftEye.x - nose.x);
  const rightDist = Math.abs(rightEye.x - nose.x);
  const symmetryDiff = Math.abs(leftDist - rightDist);
  const symmetryScore = 1 - Math.min(symmetryDiff / 20, 1);

  // Eye-to-face ratio
  const eyeDistance = Math.abs(rightEye.x - leftEye.x);
  const faceWidth = Math.abs(jawRight.x - jawLeft.x);
  if (!faceWidth) return 0;

  const ratio = eyeDistance / faceWidth;
  const idealRatio = 0.45;
  const ratioDiff = Math.abs(ratio - idealRatio);
  const ratioScore = 1 - Math.min(ratioDiff / 0.15, 1);

  return (symmetryScore + ratioScore) / 2;
}

// -----------------------------
// Texture Score (variance check)
// -----------------------------
export function computeTextureScore(element) {
  const width =
    element.videoWidth ||
    element.naturalWidth ||
    element.width;

  const height =
    element.videoHeight ||
    element.naturalHeight ||
    element.height;

  if (!width || !height) return 0;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = width;
  canvas.height = height;

  try {
    ctx.drawImage(element, 0, 0);
  } catch {
    return 0;
  }

  let data;
  try {
    data = ctx.getImageData(0, 0, width, height).data;
  } catch {
    return 0;
  }

  const totalPixels = data.length / 4;
  if (!totalPixels) return 0;

  let mean = 0;
  let variance = 0;

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

  return 1 - Math.min(variance / 2000, 1);
}

// -----------------------------
// Final Risk
// -----------------------------
export function computeFinalRisk({
  structural = 0,
  texture = 0,
  behavioral = 0,
  source
}) {
  let score;

  if (source === "image") {
    score = 0.6 * structural + 0.4 * texture;
  } else {
    score = 0.4 * structural + 0.4 * behavioral + 0.2 * texture;
  }

  return Math.min(Math.max(score, 0), 1);
}

// -----------------------------
// Label
// -----------------------------
export function getRiskLabel(score) {
  if (score < 0.3) return "Likely Human";
  if (score < 0.6) return "Possibly Synthetic";
  return "Likely AI Generated";
}
