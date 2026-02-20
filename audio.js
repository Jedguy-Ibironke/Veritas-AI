export function computeMouthOpen(landmarks) {
  const upperLip = landmarks[62];
  const lowerLip = landmarks[66];

  const dy = lowerLip.y - upperLip.y;
  return Math.min(dy / 30, 1); // normalize
}

export function computeAudioLevel(analyser) {
  const data = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(data);

  const avg = data.reduce((a, b) => a + b, 0) / data.length;
  return avg / 255; // normalize 0–1
}

export function computeLipSyncMismatch(mouthOpen, audioLevel) {
  return Math.abs(mouthOpen - audioLevel);
}
