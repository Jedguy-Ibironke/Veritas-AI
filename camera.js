export async function startWebcam(video) {
	const stream = await navigator.mediaDevices.getUserMedia({
		video: true,
		audio: false,
	});

	video.srcObject = stream;

	return new Promise((resolve) => {
		video.onloadedmetadata = () => {
			video.play();
			resolve();
		};
	});
}
