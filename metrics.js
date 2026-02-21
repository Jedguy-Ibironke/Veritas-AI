// ===============================
// STRUCTURAL SCORE
// Based on facial landmark symmetry
// ===============================
export function computeStructuralScore(landmarks) {
  if (!landmarks || !landmarks.positions) return 0;

  const points = landmarks.positions;
  if (points.length < 68) return 0;

  // Simple left/right symmetry check
  let asymmetry = 0;
  let count = 0;

  for (let i = 0; i < 17; i++) {
    const left = points[i];
    const right = points[16 - i];

    asymmetry += Math.abs(left.x - right.x);
    count++;
  }

  if (count === 0) return 0;

  const avgAsymmetry = asymmetry / count;

  // Normalize (tweak divisor if needed)
  return Math.min(avgAsymmetry / 50, 1);
}

// ===============================
// TEXTURE SCORE
// Detects unnatural smoothness
// ===============================
export function computeTextureScore(mediaElement) {

  // Determine correct dimensions
  const width = mediaElement.videoWidth || mediaElement.naturalWidth || mediaElement.width;
  const height = mediaElement.videoHeight || mediaElement.naturalHeight || mediaElement.height;

  // 🔥 Safety guard (prevents DOMException)
  if (!width || !height || width <= 0 || height <= 0) {
    return 0;
  }

  // Downscale for performance (important for video)
  const SAMPLE_SIZE = 160;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = SAMPLE_SIZE;
  canvas.height = SAMPLE_SIZE;

  try {
    ctx.drawImage(mediaElement, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
  } catch (err) {
    return 0;
  }

  let imageData;
  try {
    imageData = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data;
  } catch (err) {
    return 0;
  }

  let mean = 0;
  let variance = 0;
  const totalPixels = imageData.length / 4;

  if (totalPixels === 0) return 0;

  // Compute grayscale mean
  for (let i = 0; i < imageData.length; i += 4) {
    const gray = (imageData[i] + imageData[i + 1] + imageData[i + 2]) / 3;
    mean += gray;
  }

  mean /= totalPixels;

  // Compute variance
  for (let i = 0; i < imageData.length; i += 4) {
    const gray = (imageData[i] + imageData[i + 1] + imageData[i + 2]) / 3;
    variance += Math.pow(gray - mean, 2);
  }

  variance /= totalPixels;

  // Lower variance = smoother (more AI-like)
  const normalized = 1 - Math.min(variance / 2000, 1);

  return normalized;
}

// ===============================
// BEHAVIORAL SCORE
// Detects unnatural landmark motion
// ===============================
let previousLandmarks = null;

export function computeBehavioralScore(landmarks) {
  if (!landmarks || !landmarks.positions) return 0;

  if (!previousLandmarks) {
    previousLandmarks = landmarks.positions;
    return 0;
  }

  const current = landmarks.positions;
  const prev = previousLandmarks;

  if (current.length !== prev.length) {
    previousLandmarks = current;
    return 0;
  }

  let movement = 0;

  for (let i = 0; i < current.length; i++) {
    movement += Math.abs(current[i].x - prev[i].x);
    movement += Math.abs(current[i].y - prev[i].y);
  }

  previousLandmarks = current;

  const avgMovement = movement / current.length;

  return Math.min(avgMovement / 20, 1);
}

// ===============================
// FINAL RISK SCORE
// Weighted combination
// ===============================
export function computeFinalRisk({
  structural = 0,
  texture = 0,
  behavioral = 0,
  source = "live"
}) {

  let risk = 0;

  if (source === "image") {
    risk = 0.6 * structural + 0.4 * texture;
  } else if (source === "video") {
    risk = 0.4 * structural + 0.3 * texture + 0.3 * behavioral;
  } else {
    // live
    risk = 0.5 * structural + 0.5 * behavioral;
  }

  return Math.min(Math.max(risk, 0), 1);
}

// ===============================
// RISK LABEL
// ===============================
export function getRiskLabel(risk) {
  if (risk < 0.3) return "Likely Real";
  if (risk < 0.6) return "Uncertain";
  return "Likely AI-Generated";
}
