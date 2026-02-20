let modelsLoaded = false;

async function loadModels() {
	if (modelsLoaded) return;

	await faceapi.nets.tinyFaceDetector.loadFromUri("./models");
	await faceapi.nets.faceLandmark68Net.loadFromUri("./models");

	modelsLoaded = true;
	console.log("Models loaded");
}

export async function detectLandmarks(videoElement) {
	await loadModels();

	const result = await faceapi
		.detectSingleFace(videoElement, new faceapi.TinyFaceDetectorOptions())
		.withFaceLandmarks();

	if (!result) return null;

	return result.landmarks.positions; // 68 landmark points
}
