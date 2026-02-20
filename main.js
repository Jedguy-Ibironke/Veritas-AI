import { startWebcam } from "./camera.js";
import { detectLandmarks } from "./landmarks.js";
import {
	computeMouthOpen,
	computeInstability,
	computeRisk,
	getRiskLabel,
} from "./metrics.js";

const video = document.getElementById("video");
const status = document.getElementById("status");

startWebcam(video)
	.then(() => {
		console.log("Camera started");
		startDetection();
	})
	.catch((err) => console.error("Camera error:", err));

function startDetection() {
	async function detect() {
		const landmarks = await detectLandmarks(video);

		if (landmarks) {
			const mouthOpen = computeMouthOpen(landmarks);
			const instability = computeInstability(landmarks);
			const risk = computeRisk(instability, mouthOpen);
			const label = getRiskLabel(risk);

			status.innerText = `
Mouth: ${mouthOpen.toFixed(3)}
Instability: ${instability.toFixed(3)}
Risk: ${risk.toFixed(3)} (${label})
      `;
		}

		requestAnimationFrame(detect);
	}

	detect();
}
