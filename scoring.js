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

// -----------------------------
// Compute ISI (multi-modal fusion)
// -----------------------------
export function computeISI({ structural, behavioral, texture }) {
  const temporalStability = 1 - behavioral;
  const textureRealism = 1 - texture;

  const rawISI = structural * temporalStability * textureRealism;

  return smooth(rawISI);
}

// -----------------------------
// Explainable Labels
// -----------------------------
export function getRiskLabel(isi) {
  if (isi > 0.75) return "🟢 Stable Identity (Likely Human)";
  if (isi > 0.45) return "🟡 Moderate Stability";
  return "🔴 Unstable Identity (Likely Synthetic)";
}