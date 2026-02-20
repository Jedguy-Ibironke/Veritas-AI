export async function detectLandmarks(videoElement) {
  const result = await faceapi
    .detectSingleFace(videoElement)
    .withFaceLandmarks();

  if (!result) return null;

  return result.landmarks.positions; // array of 68 points
}
