// Deterministic mock analysis, used only when the backend is unreachable
// (e.g. previewing the UI without running the Python API). Shaped identically
// to the real /analyze response from the FastAPI backend.

const RAGA_TEMPLATES = {
  Yaman: { notes: [0, 2, 4, 6, 7, 9, 11], vadi: "G", samvadi: "N", thaat: "Kalyan" },
  Bhairav: { notes: [0, 1, 4, 5, 7, 8, 11], vadi: "d", samvadi: "r", thaat: "Bhairav" },
  Bhupali: { notes: [0, 2, 4, 7, 9], vadi: "G", samvadi: "D", thaat: "Kalyan" },
  Kafi: { notes: [0, 2, 3, 5, 7, 9, 10], vadi: "P", samvadi: "S", thaat: "Kafi" },
  Bhairavi: { notes: [0, 1, 3, 5, 7, 8, 10], vadi: "m", samvadi: "S", thaat: "Bhairavi" },
  Desh: { notes: [0, 2, 4, 5, 7, 9, 10, 11], vadi: "R", samvadi: "n", thaat: "Khamaj" },
  Malkauns: { notes: [0, 3, 5, 8, 10], vadi: "m", samvadi: "S", thaat: "Bhairavi-derived" },
  // Borgeet ragas (demo subset)
  Kalyan: { notes: [0, 2, 4, 6, 7, 9, 11], vadi: "G", samvadi: "N", thaat: "Kalyan", borgeet: true, borgeet_category: "bandha", composers: ["Sankardev", "Madhavdev"] },
  Sri: { notes: [0, 2, 3, 5, 7, 9, 10], vadi: "R", samvadi: "P", thaat: "Kafi (Janya of Dhanashri)", borgeet: true, borgeet_category: "mela", composers: ["Sankardev", "Madhavdev"] },
  Dhanashri: { notes: [0, 2, 3, 5, 7, 9, 10], vadi: "P", samvadi: "R", thaat: "Kafi", borgeet: true, borgeet_category: "bandha", composers: ["Sankardev", "Madhavdev"] },
  Gauri: { notes: [0, 1, 4, 5, 7, 8, 11], vadi: "r", samvadi: "d", thaat: "Bhairav", borgeet: true, borgeet_category: "bandha", composers: ["Sankardev", "Madhavdev"] },
  Asowari: { notes: [0, 2, 3, 5, 7, 8, 10], vadi: "d", samvadi: "g", thaat: "Asavari", borgeet: true, borgeet_category: "bandha", composers: ["Sankardev", "Madhavdev"] },
};
const SWARA = ["S", "r", "R", "g", "G", "m", "M", "P", "d", "D", "n", "N"];

function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h ^= h << 13; h ^= h >>> 17; h ^= h << 5;
    return ((h >>> 0) / 4294967295);
  };
}

export function mockAnalysis(source, borgeetMode = false) {
  const rnd = hashSeed(source || "default");

  // In borgeet mode, prefer Borgeet ragas for the mock
  const ragaKeys = borgeetMode
    ? Object.keys(RAGA_TEMPLATES).filter((k) => RAGA_TEMPLATES[k].borgeet)
    : Object.keys(RAGA_TEMPLATES);
  const raga = ragaKeys[Math.floor(rnd() * ragaKeys.length)];
  const tpl = RAGA_TEMPLATES[raga];

  const hist = new Array(12).fill(0);
  tpl.notes.forEach((idx) => {
    let w = 0.5 + rnd() * 1.5;
    if (SWARA[idx] === tpl.vadi) w *= 2.2;
    if (SWARA[idx] === tpl.samvadi) w *= 1.6;
    hist[idx] = w;
  });
  const sum = hist.reduce((a, b) => a + b, 0);
  const swaraHist = hist.map((v) => v / sum);

  const dominant = swaraHist
    .map((v, i) => ({ note: SWARA[i], value: v }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const candidates = Object.entries(RAGA_TEMPLATES)
    .map(([name, t]) => {
      const overlap = t.notes.filter((n) => tpl.notes.includes(n)).length;
      const sim = name === raga ? 0.86 + rnd() * 0.1 : (overlap / 12) * (0.4 + rnd() * 0.3);
      const entry = { raga: name, thaat: t.thaat, similarity: sim, notes: t.notes };
      if (t.borgeet) {
        entry.borgeet = true;
        entry.borgeet_category = t.borgeet_category;
        entry.composers = t.composers;
        entry.regional = false;
      }
      return entry;
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5);
  const total = candidates.reduce((a, c) => a + c.similarity, 0);
  candidates.forEach((c) => (c.confidence_pct = Math.round((c.similarity / total) * 1000) / 10));

  const tonicHz = 130 + rnd() * 90;
  const durationSec = 90 + Math.floor(rnd() * 180);

  const contour = [];
  let cur = 0;
  const nSteps = 60;
  for (let i = 0; i < nSteps; i++) {
    const targetIdx = tpl.notes[Math.floor(rnd() * tpl.notes.length)];
    const target = targetIdx * 100;
    cur = cur + (target - cur) * 0.35 + (rnd() - 0.5) * 40;
    contour.push({ t: +((i / nSteps) * durationSec).toFixed(1), cents: Math.round(cur) });
  }

  return {
    tonic_hz: Math.round(tonicHz * 100) / 100,
    tonic_nearest_note: "Sa (demo)",
    tonic_confidence: 0.72 + rnd() * 0.2,
    tonic_method: "harmonic_validated",
    dominant_notes: dominant,
    implied_scale: tpl.notes.map((i) => SWARA[i]),
    raga_candidates: candidates,
    swara_histogram: swaraHist,
    duration_sec: durationSec,
    n_voiced_frames: Math.floor(1200 + rnd() * 4000),
    tempo_bpm: Math.round(60 + rnd() * 60),
    pitch_contour: contour,
    separation_used: false,
    borgeet_mode: borgeetMode,
  };
}

export const SAMPLE_TRACKS = [
  { label: "Yaman — Hindustani khayal (sample)", url: "https://youtube.com/watch?v=sample_yaman" },
  { label: "Bihu geet — Assamese folk (sample)", url: "https://youtube.com/watch?v=sample_bihu" },
  { label: "Borgeet (Dhanashri) — Sankardev composition", url: "https://youtube.com/watch?v=sample_borgeet", borgeet: true },
  { label: "Borgeet (Kalyan) — Concluding prayer / Kharman", url: "https://youtube.com/watch?v=sample_borgeet_kalyan", borgeet: true },
];
