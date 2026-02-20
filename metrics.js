// metrics.js

let previousLandmarks = null;

// -----------------------------
// Utility: Euclidean distance
// -----------------------------
function distance(p1, p2) {
	const dx = p2._x - p1._x;
	const dy = p2._y - p1._y;
	return Math.sqrt(dx * dx + dy * dy);
}

// -----------------------------
// Smooth value helper
// -----------------------------
function createSmoother(alpha = 0.8) {
	let last = 0;

	return function smooth(value) {
		last = alpha * last + (1 - alpha) * value;
		return last;
	};
}

// Create internal smoothers
const smoothMouth = createSmoother(0.8);
const smoothInstability = createSmoother(0.8);

// -----------------------------
// Compute Mouth Open (Normalized)
// -----------------------------
export function computeMouthOpen(landmarks) {
	if (!landmarks) return 0;

	const topLip = landmarks[62];
	const bottomLip = landmarks[66];

	const rawDistance = distance(topLip, bottomLip);

	// Normalize by face width (jaw 0 → 16)
	const faceWidth = distance(landmarks[0], landmarks[16]);

	const normalized = rawDistance / faceWidth;

	return smoothMouth(normalized);
}

// -----------------------------
// Compute Face Instability
// Measures small frame-to-frame movement
// -----------------------------
let previousNose = null;

export function computeInstability(landmarks) {
	if (!landmarks || landmarks.length === 0) return 0;

	// First frame — nothing to compare yet
	if (!previousLandmarks) {
		previousLandmarks = landmarks.map((p) => ({ x: p.x, y: p.y }));
		return 0;
	}

	let totalMovement = 0;

	for (let i = 0; i < landmarks.length; i++) {
		const dx = landmarks[i].x - previousLandmarks[i].x;
		const dy = landmarks[i].y - previousLandmarks[i].y;

		totalMovement += Math.sqrt(dx * dx + dy * dy);
	}

	// Average movement per landmark
	const rawInstability = totalMovement / landmarks.length;

	// Smooth the instability signal
	const smoothed = smoothInstability(rawInstability);

	// Store current landmarks for next frame
	previousLandmarks = landmarks.map((p) => ({ x: p.x, y: p.y }));

	return smoothed;
}

// -----------------------------
// Basic Risk Score Example
// -----------------------------
export function computeRisk(instability, mouthOpen) {
	// Normalize instability (assume typical max around 15px)
	const normInstability = Math.min(instability / 15, 1);

	// Normalize mouth (assume typical max around 0.5)
	const normMouth = Math.min(mouthOpen / 0.5, 1);

	const risk = normInstability * 0.6 + normMouth * 0.4;

	return risk;
}

export function getRiskLabel(risk) {
	if (risk < 0.2) return "Low";
	if (risk < 0.5) return "Medium";
	return "High";
}
