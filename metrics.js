// metrics.js
// ===============================
// Face & Frame Texture Scoring
// ===============================

// ------------------------------
// Utility: Euclidean distance (for landmarks if needed)
// ------------------------------
export function distance(p1, p2) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// ------------------------------
// Face Texture: extract face region and compute variance
// ------------------------------
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

// ------------------------------
// Full Frame Texture
// ------------------------------
export function computeFrameTexture(videoOrImage) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = videoOrImage.videoWidth || videoOrImage.width;
  canvas.height = videoOrImage.videoHeight || videoOrImage.height;

  ctx.drawImage(videoOrImage, 0, 0, canvas.width, canvas.height);

  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

// ------------------------------
// Texture Score: lower variance = more AI-smooth
// ------------------------------
export function computeTextureScore(faceData, frameData) {
  function variance(imageData) {
    const data = imageData.data;
    const totalPixels = data.length / 4;

    // Compute mean grayscale
    let mean = 0;
    for (let i = 0; i < data.length; i += 4) {
      const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
      mean += gray;
    }
    mean /= totalPixels;

    // Compute variance
    let varSum = 0;
    for (let i = 0; i < data.length; i += 4) {
      const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
      varSum += (gray - mean) ** 2;
    }
    return varSum / totalPixels;
  }

  const faceVar = variance(faceData);
  const frameVar = variance(frameData);

  // Normalize (rough heuristic: high variance = more natural)
  const normalizedFace = 1 - Math.min(faceVar / 2000, 1);
  const normalizedFrame = 1 - Math.min(frameVar / 2000, 1);

  // Combine scores: 50% face + 50% full frame
  return (normalizedFace + normalizedFrame) / 2;
}