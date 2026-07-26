import React, { useRef, useEffect, useCallback } from "react";

// 12 semitones ordered top->bottom (high to low, like a real piano roll/DAW)
const ROWS = [
  { label: "N", isBlack: false, cents: 1100, color: "#818cf8" },
  { label: "n", isBlack: true,  cents: 1000, color: "#a78bfa" },
  { label: "D", isBlack: false, cents: 900,  color: "#60a5fa" },
  { label: "d", isBlack: true,  cents: 800,  color: "#7dd3fc" },
  { label: "P", isBlack: false, cents: 700,  color: "#fb923c" },
  { label: "M", isBlack: true,  cents: 600,  color: "#f472b6" },
  { label: "m", isBlack: false, cents: 500,  color: "#4ade80" },
  { label: "G", isBlack: false, cents: 400,  color: "#60a5fa" },
  { label: "g", isBlack: true,  cents: 300,  color: "#c084fc" },
  { label: "R", isBlack: false, cents: 200,  color: "#60a5fa" },
  { label: "r", isBlack: true,  cents: 100,  color: "#c084fc" },
  { label: "S", isBlack: false, cents: 0,    color: "#ccff00" },
];

function snapRow(cents) {
  const c = ((cents % 1200) + 1200) % 1200;
  let best = 0, bestDist = Infinity;
  ROWS.forEach((r, i) => {
    const d = Math.min(Math.abs(c - r.cents), 1200 - Math.abs(c - r.cents));
    if (d < bestDist) { bestDist = d; best = i; }
  });
  return best;
}

export default function SwaraLane({ pitchContour, tonicHz }) {
  const canvasRef = useRef(null);
  const audioCtxRef = useRef(null);
  const activeNodesRef = useRef(null);

  const stopNote = useCallback(() => {
    if (activeNodesRef.current) {
      const { osc, gain } = activeNodesRef.current;
      if (audioCtxRef.current) {
        gain.gain.setTargetAtTime(0, audioCtxRef.current.currentTime, 0.05);
        setTimeout(() => {
          try { osc.stop(); osc.disconnect(); gain.disconnect(); } catch(e){}
        }, 100);
      }
      activeNodesRef.current = null;
    }
  }, []);

  const playNote = useCallback((cents) => {
    if (!tonicHz) return;
    stopNote();

    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const hz = tonicHz * Math.pow(2, cents / 1200);
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = hz;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.setTargetAtTime(0.3, ctx.currentTime, 0.02);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();

    activeNodesRef.current = { osc, gain };
  }, [tonicHz, stopNote]);

  const handlePointerDown = (e) => {
    const canvas = canvasRef.current;
    if (!canvas || !tonicHz) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ROW_H = Math.floor((rect.height - 20) / ROWS.length);
    const PIANO_W = 68;

    if (x <= PIANO_W) {
      const rowIndex = Math.floor(y / ROW_H);
      if (rowIndex >= 0 && rowIndex < ROWS.length) {
        playNote(ROWS[rowIndex].cents);
      }
    }
  };

  useEffect(() => {
    if (!pitchContour?.length) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr   = window.devicePixelRatio || 1;
    const rect  = canvas.getBoundingClientRect();
    canvas.width  = rect.width  * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);

    const W          = rect.width;
    const H          = rect.height;
    const ROW_H      = Math.floor((H - 20) / ROWS.length); // fit to container
    const PIANO_W    = 68;
    const BLACK_W    = 45;  // black key width
    const PAD_BOT    = 20;
    const chartW     = W - PIANO_W;
    const chartH     = ROWS.length * ROW_H;

    // Full background
    ctx.fillStyle = "#0d0d0f";
    ctx.fillRect(0, 0, W, H);

    // Piano keys + grid rows
    ROWS.forEach((row, i) => {
      const y = i * ROW_H;

      // --- Piano Key ---
      if (row.isBlack) {
        // White key area behind black key (shows as gaps between black keys)
        ctx.fillStyle = "#2e2e2e";
        ctx.fillRect(0, y, PIANO_W, ROW_H);
        // Black key
        ctx.fillStyle = "#161616";
        ctx.fillRect(0, y, BLACK_W, ROW_H);
        // Right edge highlight
        ctx.fillStyle = "rgba(255,255,255,0.06)";
        ctx.fillRect(BLACK_W - 2, y + 2, 2, ROW_H - 4);
        // Label
        ctx.fillStyle = "rgba(255,255,255,0.45)";
        ctx.font = "bold 9px 'IBM Plex Mono', monospace";
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillText(row.label, BLACK_W - 5, y + ROW_H / 2);
      } else {
        // White key
        ctx.fillStyle = "#d4d4d4";
        ctx.fillRect(0, y, PIANO_W, ROW_H);
        // Sa: neon tint, Pa: orange tint
        if (row.label === "S") {
          ctx.fillStyle = "rgba(204,255,0,0.18)";
          ctx.fillRect(0, y, PIANO_W, ROW_H);
        } else if (row.label === "P") {
          ctx.fillStyle = "rgba(251,146,60,0.15)";
          ctx.fillRect(0, y, PIANO_W, ROW_H);
        }
        // Bottom border for white keys
        ctx.strokeStyle = "rgba(0,0,0,0.2)";
        ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(0, y + ROW_H - 0.5); ctx.lineTo(PIANO_W, y + ROW_H - 0.5); ctx.stroke();
        // Label
        ctx.fillStyle = row.label === "S" ? "#4a5e00" : row.label === "P" ? "#7a3800" : "#2a2a2a";
        ctx.font = "bold 9px 'IBM Plex Mono', monospace";
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillText(row.label, PIANO_W - 5, y + ROW_H / 2);
      }

      // --- Grid row background ---
      if (row.label === "S") {
        ctx.fillStyle = "rgba(204,255,0,0.05)";
      } else if (row.label === "P") {
        ctx.fillStyle = "rgba(251,146,60,0.04)";
      } else if (row.isBlack) {
        ctx.fillStyle = "rgba(0,0,0,0.3)";
      } else {
        ctx.fillStyle = "rgba(255,255,255,0.018)";
      }
      ctx.fillRect(PIANO_W, y, chartW, ROW_H);

      // Grid horizontal line
      ctx.strokeStyle = row.isBlack ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.05)";
      ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(PIANO_W, y); ctx.lineTo(W, y); ctx.stroke();
    });

    // Piano/grid divider
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PIANO_W, 0); ctx.lineTo(PIANO_W, chartH); ctx.stroke();

    // Bottom border
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PIANO_W, chartH); ctx.lineTo(W, chartH); ctx.stroke();

    // --- Data setup ---
    const minT   = pitchContour[0].t;
    const maxT   = pitchContour[pitchContour.length - 1].t;
    const tRange = Math.max(maxT - minT, 1);
    const toX    = t => PIANO_W + ((t - minT) / tRange) * chartW;

    // Downsample (max 1000 pts)
    const step = Math.max(1, Math.floor(pitchContour.length / 1000));
    const pts  = pitchContour
      .filter((_, i) => i % step === 0)
      .map(p => ({ t: p.t, x: toX(p.t), idx: snapRow(p.cents) }));

    // Vertical time grid lines
    const numV = Math.floor(chartW / 80);
    for (let i = 0; i <= numV; i++) {
      const x = PIANO_W + (i / numV) * chartW;
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, chartH); ctx.stroke();
    }

    // Group consecutive same-swara points into note blocks
    const blocks = [];
    if (pts.length) {
      let bIdx = pts[0].idx, bX1 = pts[0].x;
      for (let i = 1; i < pts.length; i++) {
        if (pts[i].idx !== bIdx) {
          blocks.push({ x1: bX1, x2: pts[i].x, idx: bIdx });
          bIdx = pts[i].idx; bX1 = pts[i].x;
        }
      }
      blocks.push({ x1: bX1, x2: pts[pts.length - 1].x + 2, idx: bIdx });
    }

    // Draw note blocks (DAW style)
    blocks.forEach(b => {
      const row = ROWS[b.idx];
      const y   = b.idx * ROW_H;
      const bW  = Math.max(1.5, b.x2 - b.x1);
      const pad = 1;

      // Body fill
      ctx.fillStyle = row.color + "35";
      ctx.fillRect(b.x1, y + pad, bW, ROW_H - pad * 2);

      // Top bright border (the "note" top line in DAWs)
      ctx.fillStyle = row.color + "e0";
      ctx.fillRect(b.x1, y + pad, bW, 2);

      // Left cap
      ctx.fillStyle = row.color + "aa";
      ctx.fillRect(b.x1, y + pad, 2, ROW_H - pad * 2);
    });

    // Time axis labels
    const ticks = Math.min(10, Math.floor(chartW / 65));
    ctx.fillStyle    = "rgba(255,255,255,0.3)";
    ctx.font         = "10px 'DM Sans', sans-serif";
    ctx.textAlign    = "center";
    ctx.textBaseline = "top";
    for (let i = 0; i <= ticks; i++) {
      const t = minT + (i / ticks) * tRange;
      const x = toX(t);
      ctx.fillText(Math.floor(t) + "s", x, chartH + 5);
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.lineWidth   = 1;
      ctx.beginPath(); ctx.moveTo(x, chartH); ctx.lineTo(x, chartH + 3); ctx.stroke();
    }
  }, [pitchContour]);

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={handlePointerDown}
      onPointerUp={stopNote}
      onPointerLeave={stopNote}
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}
