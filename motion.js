let previousLandmarks = null;

export function computeInstability(currentLandmarks) {
  if (!previousLandmarks) {
    previousLandmarks = currentLandmarks;
    return 0;
  }

  let totalDelta = 0;

  for (let i = 0; i < currentLandmarks.length; i++) {
    const dx = currentLandmarks[i].x - previousLandmarks[i].x;
    const dy = currentLandmarks[i].y - previousLandmarks[i].y;
    totalDelta += Math.sqrt(dx * dx + dy * dy);
  }

  previousLandmarks = currentLandmarks;

  return Math.min(totalDelta / 1000, 1); // normalize 0–1
}
