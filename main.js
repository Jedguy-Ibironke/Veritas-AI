const instability = computeInstability(landmarks);
const mouthOpen = computeMouthOpen(landmarks);
const audioLevel = computeAudioLevel(analyser);
const lipMismatch = computeLipSyncMismatch(mouthOpen, audioLevel);

const risk = computeRisk(instability, lipMismatch);
const label = getRiskLabel(risk);

console.log("Risk:", risk, label);
