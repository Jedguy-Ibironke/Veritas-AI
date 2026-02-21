// ===============================
// scoring.js
// Identity Stability Index (ISI)
// ===============================

const windowSize = 10;
let isiHistory = [];

function smooth(value) {
  isiHistory.push(value);
  if (isiHistory.length > windowSize) {
    isiHistory.shift();
  }

  const sum = isiHistory.reduce((a, b) => a + b, 0);
  return sum / isiHistory.length;
}

export function computeISI({
  structural,
  behavioral,
  texture,
  lipMismatch
}) {
  // Convert instability → stability
  const temporalStability = 1 - behavioral;
  const audioVisualConsistency = 1 - lipMismatch;
  const textureRealism = 1 - texture;

  // Multiplicative fusion (stronger than weighted sum)
  const rawISI =
    structural *
    temporalStability *
    textureRealism *
    audioVisualConsistency;

  return smooth(rawISI);
}

export function getRiskLabel(isi) {
  if (isi > 0.75) return "🟢 Stable Identity (Likely Human)";
  if (isi > 0.45) return "🟡 Moderate Stability";
  return "🔴 Unstable Identity (Likely Synthetic)";
}
