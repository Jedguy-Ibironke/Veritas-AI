// ===============================
// INTERNAL STATE
// ===============================
let previousLandmarks = null;

// ===============================
// RESET FUNCTION
// ===============================
export function resetBehavioralState() {
  previousLandmarks = null;
}

// ===============================
// STRUCTURAL SCORE (CENTERED SYMMETRY VERSION)
// ===============================
export function computeStructuralScore(landmarks) {
  if (!landmarks || !landmarks.positions) return 0;

  const points = landmarks.positions;
  if (points.length < 68) return 0;

  // Face width from jaw endpoints
  const leftJaw = points[0];
  const rightJaw = points[16];
  const faceWidth = Math.abs(rightJaw.x - leftJaw.x);
  if (!faceWidth) return 0;

  // Compute vertical centerline of face
  const centerX = (leftJaw.x + rightJaw.x) / 2;

  let asymmetry = 0;
  let count = 0;

  // Compare mirrored jaw points (skip extreme edges)
  for (let i = 1; i < 8; i++) {
    const left = points[i];
    const right = points[16 - i];

    // Mirror right side across centerline
    const mirroredRightX = 2 * centerX - right.x;

    asymmetry += Math.abs(left.x - mirroredRightX);
    asymmetry += Math.abs(left.y - right.y);

    count++;
  }

  if (count === 0) return 0;

  const avgAsymmetry = asymmetry / count;

  // Normalize relative to face width
  const normalized = avgAsymmetry / faceWidth;

  // Slight sensitivity boost (tuneable)
  return Math.min(Math.max(normalized * 2, 0), 1);
}

// ===============================
// TEXTURE SCORE
// ===============================
export function computeTextureScore(mediaElement) {
  const width =
    mediaElement.videoWidth ||
    mediaElement.naturalWidth ||
    mediaElement.width;

  const height =
    mediaElement.videoHeight ||
    mediaElement.naturalHeight ||
    mediaElement.height;

  if (!width || !height || width <= 0 || height <= 0) {
    return 0;
  }

  const SAMPLE_SIZE = 160;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = SAMPLE_SIZE;
  canvas.height = SAMPLE_SIZE;

  try {
    ctx.drawImage(mediaElement, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
  } catch {
    return 0;
  }

  let imageData;
  try {
    imageData = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data;
  } catch {
    return 0;
  }

  const totalPixels = imageData.length / 4;
  if (!totalPixels) return 0;

  let mean = 0;
  let variance = 0;

  for (let i = 0; i < imageData.length; i += 4) {
    const gray = (imageData[i] + imageData[i + 1] + imageData[i + 2]) / 3;
    mean += gray;
  }

  mean /= totalPixels;

  for (let i = 0; i < imageData.length; i += 4) {
    const gray = (imageData[i] + imageData[i + 1] + imageData[i + 2]) / 3;
    variance += Math.pow(gray - mean, 2);
  }

  variance /= totalPixels;

  const normalized = 1 - Math.min(variance / 2000, 1);

  return normalized;
}

// ===============================
// BEHAVIORAL SCORE
// ===============================
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
// FINAL RISK
// ===============================
export function computeFinalRisk({
  structural = 0,
  texture = 0,
  behavioral = 0,
  source = "live"
}) {
  let risk;

  if (source === "image") {
    risk = 0.6 * structural + 0.4 * texture;
  } else if (source === "video") {
    risk = 0.4 * structural + 0.3 * texture + 0.3 * behavioral;
  } else {
    risk = 0.5 * structural + 0.5 * behavioral;
  }

  return Math.min(Math.max(risk, 0), 1);
}

// ===============================
// LABEL
// ===============================
export function getRiskLabel(risk) {
  if (risk < 0.3) return "Likely Real";
  if (risk < 0.6) return "Uncertain";
  return "Likely AI-Generated";
}
