import React from "react";
import { SWARA } from "./SwaraWheel.jsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export function StatCard({ title, value, subtitle, icon, confidence }) {
  return (
    <Card className="bg-[#121212] border border-white/20 shadow-2xl">
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">{title}</div>
          <div className="text-2xl font-bold text-white mb-1">{value}</div>
          {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
        </div>
        <div className="flex flex-col items-end gap-2">
          {icon}
          {confidence !== null && (
            <Badge variant="outline" className="border-neon/30 text-neon bg-neon/10 text-[10px]">
              {confidence}%
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function RagaCard({ raga, rank }) {
  const notesInRaga = new Set(raga.notes || []);
  const isBorgeet = raga.borgeet;
  const isRegional = raga.regional;
  const isTopMatch = rank === 1;

  return (
    <Card className={`bg-[#121212] border shadow-2xl ${isTopMatch ? 'border-[#ccff00]/50 bg-[#ccff00]/5' : 'border-white/20'}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-muted-foreground" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>#{rank}</span>
            <span className="text-lg font-bold text-white">{raga.raga}</span>
          </div>
          <span className={`text-sm font-semibold ${isTopMatch ? "text-[#ccff00]" : "text-muted-foreground"}`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            {raga.confidence_pct}%
          </span>
        </div>
        <div className="text-xs text-muted-foreground mb-3">Thaat: <span className="text-white/80">{raga.thaat}</span></div>

        {/* Borgeet metadata badges */}
        {isBorgeet && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            <Badge variant="outline" className="border-neon/30 text-neon bg-neon/10 font-normal text-[10px]">
              {raga.borgeet_category === "mela" ? "Mela (free rhythm)" : "Bandha (fixed tala)"}
            </Badge>
            {raga.composers && raga.composers.length > 0 && (
              <Badge variant="outline" className="border-green-500/30 text-green-400 bg-green-500/10 font-normal text-[10px]">
                {raga.composers.join(" · ")}
              </Badge>
            )}
            {isRegional && (
              <Badge variant="outline" className="border-purple-500/30 text-purple-400 bg-purple-500/10 font-normal text-[10px]">
                Regional (Sattriya)
              </Badge>
            )}
          </div>
        )}

        <Progress value={Math.min(100, raga.confidence_pct * 1.6)} className={`h-1.5 mb-4 bg-white/10 ${isTopMatch ? 'text-[#ccff00]' : 'text-white/40'}`} />

        <div className="flex flex-wrap gap-1.5 mb-3">
          {SWARA.map((s, i) => (
            <span
              key={s}
              className={`text-xs px-1.5 py-0.5 rounded border ${
                notesInRaga.has(i) 
                  ? "border-neon/40 text-neon bg-neon/10" 
                  : "border-white/5 text-white/20 bg-transparent"
              }`}
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              {s}
            </span>
          ))}
        </div>

        {/* Borgeet description */}
        {isBorgeet && raga.description && (
          <div className="text-[11px] leading-relaxed text-muted-foreground border-t border-white/10 pt-3 mt-3">
            {raga.description}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
