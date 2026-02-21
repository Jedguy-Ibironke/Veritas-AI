let modelsLoaded = false;

async function loadModels() {
  if (modelsLoaded) return;

  await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
  await faceapi.nets.faceLandmark68Net.loadFromUri("/models");

  modelsLoaded = true;
  console.log("Models loaded successfully");
}

export async function detectLandmarks(inputElement) {
  await loadModels();

  const result = await faceapi
    .detectSingleFace(
      inputElement,
      new faceapi.TinyFaceDetectorOptions()
    )
    .withFaceLandmarks();

  if (!result) return null;

  // 🔥 FIX: return full landmarks object
  return result.landmarks;
}
