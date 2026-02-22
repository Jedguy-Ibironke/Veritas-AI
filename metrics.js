// ===============================
// metrics.js
// Face Analysis Metrics Engine
// ===============================

// ------------------------------
// Utility: Euclidean distance
// ------------------------------
export function distance(p1, p2) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// =====================================================
// BEHAVIORAL SCORE (Temporal Landmark Jitter)
// =====================================================

let previousLandmarks = null;

export function computeBehavioralScore(landmarks) {
  if (!landmarks) return 0;

  if (!previousLandmarks) {
    previousLandmarks = landmarks;
    return 0;
  }

  let totalMovement = 0;

  for (let i = 0; i < landmarks.length; i++) {
    const dx = landmarks[i].x - previousLandmarks[i].x;
    const dy = landmarks[i].y - previousLandmarks[i].y;
    totalMovement += Math.sqrt(dx * dx + dy * dy);
  }

  previousLandmarks = landmarks;

  const avgMovement = totalMovement / landmarks.length;

  // Normalize (10px typical jitter upper bound)
  return Math.min(avgMovement / 10, 1);
}

// =====================================================
// STRUCTURAL SCORE (Geometric Stability)
// =====================================================

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

  // Larger fluctuation = less stable
  const instability = Math.min(diff / 0.05, 1);

  return 1 - instability;
}

// =====================================================
// FACE TEXTURE EXTRACTION
// =====================================================

export function computeFaceTexture(videoOrImage, box) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = box.width;
  canvas.height = box.height;

  ctx.drawImage(
    videoOrImage,
    box.x,
    box.y,
    box.width,
    box.height,
    0,
    0,
    box.width,
    box.height
  );

  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

// =====================================================
// FULL FRAME TEXTURE EXTRACTION
// =====================================================

export function computeFrameTexture(videoOrImage) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = videoOrImage.videoWidth || videoOrImage.width;
  canvas.height = videoOrImage.videoHeight || videoOrImage.height;

  ctx.drawImage(videoOrImage, 0, 0, canvas.width, canvas.height);

  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

// =====================================================
// TEXTURE SCORE (Variance-Based Smoothness Detection)
// =====================================================

export function computeTextureScore(faceData, frameData) {
  function variance(imageData) {
    const data = imageData.data;
    const totalPixels = data.length / 4;

    let mean = 0;

    // Mean grayscale
    for (let i = 0; i < data.length; i += 4) {
      const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
      mean += gray;
    }

    mean /= totalPixels;

    let varSum = 0;

    // Variance
    for (let i = 0; i < data.length; i += 4) {
      const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
      varSum += (gray - mean) ** 2;
    }

    return varSum / totalPixels;
  }

  const faceVar = variance(faceData);
  const frameVar = variance(frameData);

  // Normalize (heuristic)
  const normalizedFace = 1 - Math.min(faceVar / 2000, 1);
  const normalizedFrame = 1 - Math.min(frameVar / 2000, 1);

  // 50% face + 50% frame weighting
  return (normalizedFace + normalizedFrame) / 2;
}
