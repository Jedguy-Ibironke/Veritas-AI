/*
import { startWebcam } from "./camera.js";
import { detectLandmarks } from "./landmarks.js";

const video = document.getElementById("video");

startWebcam(video)
	.then(() => {
		console.log("Camera started");

		setInterval(async () => {
			const landmarks = await detectLandmarks(video);
			console.log(landmarks);
		}, 500);
	})
	.catch((err) => console.error("Camera error:", err));
*/
import { startWebcam } from "./camera.js";
import { detectLandmarks } from "./landmarks.js";

const video = document.getElementById("video");

startWebcam(video).then(() => {
	console.log("Camera started");

	setInterval(async () => {
		const landmarks = await detectLandmarks(video);
		console.log("Landmarks:", landmarks);
	}, 1000);
});
