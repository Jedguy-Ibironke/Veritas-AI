export async function startWebcam(videoElement) {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  videoElement.srcObject = stream;
  await videoElement.play();
  return stream;
}

export function getFrame(videoElement, canvasElement) {
  const ctx = canvasElement.getContext("2d");
  ctx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
  return ctx.getImageData(0, 0, canvasElement.width, canvasElement.height);
}
