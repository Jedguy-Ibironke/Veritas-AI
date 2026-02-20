let modelsLoaded = false;

export async function loadModels() {
	if (modelsLoaded) return;

	const MODEL_URL = "/models";

	await Promise.all([
		faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
		faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
	]);

	modelsLoaded = true;
	console.log("Models loaded");
}

export async function detectLandmarks(videoElement) {
	if (!modelsLoaded) {
		await loadModels();
	}

	const result = await faceapi
		.detectSingleFace(videoElement, new faceapi.TinyFaceDetectorOptions())
		.withFaceLandmarks();

	if (!result) return null;

	return result.landmarks.positions;
}
