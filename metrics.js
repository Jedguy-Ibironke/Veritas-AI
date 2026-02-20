// metrics.js

// -----------------------------
// Utility: Euclidean distance
// -----------------------------
function distance(p1, p2) {
  const dx = p2._x - p1._x;
  const dy = p2._y - p1._y;
  return Math.sqrt(dx * dx + dy * dy);
}

// -----------------------------
// Smooth value helper
// -----------------------------
function createSmoother(alpha = 0.8) {
  let last = 0;

  return function smooth(value) {
    last = alpha * last + (1 - alpha) * value;
    return last;
  };
}

// Create internal smoothers
const smoothMouth = createSmoother(0.8);
const smoothInstability = createSmoother(0.8);

// -----------------------------
// Compute Mouth Open (Normalized)
// -----------------------------
export function computeMouthOpen(landmarks) {
  if (!landmarks) return 0;

  const topLip = landmarks[62];
  const bottomLip = landmarks[66];

  const rawDistance = distance(topLip, bottomLip);

  // Normalize by face width (jaw 0 → 16)
  const faceWidth = distance(landmarks[0], landmarks[16]);

  const normalized = rawDistance / faceWidth;

  return smoothMouth(normalized);
}

// -----------------------------
// Compute Face Instability
// Measures small frame-to-frame movement
// -----------------------------
let previousNose = null;

export function computeInstability(landmarks) {
  if (!landmarks) return 0;

  const nose = landmarks[30]; // center nose point

  if (!previousNose) {
    previousNose = nose;
    return 0;
  }

  const movement = distance(nose, previousNose);
  previousNose = nose;

  return smoothInstability(movement);
}

// -----------------------------
// Basic Risk Score Example
// -----------------------------
export function computeRisk(instability, mouthOpen) {
  // Adjust weights however you want
  const risk = (instability * 2) + (mouthOpen * 1.5);
  return Math.min(risk, 1);
}

export function getRiskLabel(risk) {
  if (risk < 0.2) return "Low";
  if (risk < 0.5) return "Medium";
  return "High";
}
