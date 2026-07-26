import React from "react";

export const SWARA = ["S", "r", "R", "g", "G", "m", "M", "P", "d", "D", "n", "N"];

export default function SwaraWheel({ histogram, size = 240 }) {
  const cx = size / 2, cy = size / 2;
  const rInner = size * 0.16, rOuter = size * 0.42;
  const max = Math.max(...histogram, 0.0001);

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" height="100%">
      <circle cx={cx} cy={cy} r={rOuter + 22} fill="none" stroke="#3A322A" strokeWidth="1" />
      {SWARA.map((label, i) => {
        const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
        const val = histogram[i] || 0;
        const len = rInner + (val / max) * (rOuter - rInner);
        const x1 = cx + Math.cos(angle) * rInner;
        const y1 = cy + Math.sin(angle) * rInner;
        const x2 = cx + Math.cos(angle) * len;
        const y2 = cy + Math.sin(angle) * len;
        const lx = cx + Math.cos(angle) * (rOuter + 18);
        const ly = cy + Math.sin(angle) * (rOuter + 18);
        const active = val > 0.02;
        return (
          <g key={label}>
            <line
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={active ? (label === "S" ? "#C89B3C" : "#8FA0D0") : "#3A322A"}
              strokeWidth={active ? 6 : 2}
              strokeLinecap="round"
            />
            <text
              x={lx} y={ly}
              fill={active ? "#F2E9D8" : "#5A5148"}
              fontSize={active ? 15 : 12}
              fontWeight={active ? 700 : 400}
              textAnchor="middle"
              dominantBaseline="middle"
              fontFamily="'IBM Plex Mono', monospace"
            >
              {label}
            </text>
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={rInner - 6} fill="#1E1A16" stroke="#C89B3C" strokeWidth="1.5" />
      <text x={cx} y={cy - 3} textAnchor="middle" fill="#C89B3C" fontSize="11" fontFamily="'IBM Plex Mono', monospace" letterSpacing="1">
        SA
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="#8A7E6E" fontSize="9" fontFamily="'IBM Plex Mono', monospace">
        tonic
      </text>
    </svg>
  );
}
