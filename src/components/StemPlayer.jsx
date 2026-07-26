import React, { useState, useRef, useEffect, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import * as RadixSlider from '@radix-ui/react-slider';
import { Play, Pause, Mic, Drum, Music2, Guitar, SkipBack, ChevronDown, X, Download } from 'lucide-react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

function Slider({ value, max = 1, step = 0.01, onChange, color = '#ff007f', disabled = false }) {
  return (
    <RadixSlider.Root
      value={[value]}
      min={0}
      max={max}
      step={step}
      disabled={disabled}
      onValueChange={([v]) => onChange(v)}
      className="relative flex items-center select-none touch-none w-full cursor-pointer"
      style={{ height: 20 }}
    >
      <RadixSlider.Track
        className="relative grow rounded-full"
        style={{ height: 3, background: '#2a2a2a' }}
      >
        <RadixSlider.Range
          className="absolute h-full rounded-full"
          style={{ background: disabled ? '#555' : color }}
        />
      </RadixSlider.Track>
      <RadixSlider.Thumb
        className="block rounded-full focus:outline-none bg-white shadow-md"
        style={{ width: 12, height: 12, boxShadow: `0 0 6px ${color}88` }}
      />
    </RadixSlider.Root>
  );
}

const STEMS = [
  { key: 'vocals', icon: Mic,    label: 'Vocals',  color: '#ccff00' },
  { key: 'other',  icon: Music2, label: 'Other',   color: '#a78bfa' },
  { key: 'drums',  icon: Drum,   label: 'Drums',   color: '#38bdf8' },
  { key: 'bass',   icon: Guitar, label: 'Bass',    color: '#f472b6' },
];

function StemRow({ stemKey, icon: Icon, label, color, url, masterProgress, masterDuration, isPlaying, volume, isMuted, isSolo, isDimmed, onSeek, onVolumeChange, onSolo, onMute }) {
  const containerRef = useRef(null);
  const wsRef = useRef(null);
  const [ready, setReady] = useState(false);
  const lastSeekRef = useRef(-1);

  useEffect(() => {
    if (!url || !containerRef.current) return;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: 'rgba(255,255,255,0.55)',
      progressColor: color,
      cursorColor: 'transparent',
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 48,
      normalize: true,
      interact: false, // We handle seeking ourselves
      backend: 'WebAudio',
    });

    ws.load(url);
    ws.on('ready', () => setReady(true));
    ws.on('error', (e) => console.warn(`WaveSurfer error (${stemKey}):`, e));

    wsRef.current = ws;
    return () => { ws.destroy(); wsRef.current = null; setReady(false); };
  }, [url, color, stemKey]);

  // Sync progress to WaveSurfer (no audio playback via WS - audio handled by <audio> tags)
  useEffect(() => {
    if (!wsRef.current || !ready || masterDuration <= 0) return;
    const ratio = masterProgress / masterDuration;
    if (Math.abs(ratio - lastSeekRef.current) > 0.001) {
      wsRef.current.seekTo(Math.max(0, Math.min(1, ratio)));
      lastSeekRef.current = ratio;
    }
  }, [masterProgress, masterDuration, ready]);

  const handleClick = useCallback((e) => {
    if (!containerRef.current || masterDuration <= 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek(ratio * masterDuration);
  }, [masterDuration, onSeek]);

  return (
    <div
      className="flex items-center gap-4"
      style={{ opacity: isDimmed ? 0.3 : 1, transition: 'opacity 0.2s' }}
    >
      {/* Left border line */}
      {/* <div className="w-[2px] self-stretch rounded-full" style={{ background: color, opacity: 0.6 }} /> */}

      {/* WaveSurfer container — fills all available width */}
      <div
        ref={containerRef}
        className="flex-1 cursor-pointer overflow-hidden"
        onClick={handleClick}
        style={{ minWidth: 0 }}
      />

      {/* Icon + S/M + Volume */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Icon */}
        <div className="text-white/60 w-5">
          <Icon size={18} strokeWidth={1.5} />
        </div>

        {/* S / M vertical */}
        <div className="flex flex-col gap-[3px]">
          <button
            onClick={onSolo}
            className="w-5 h-5 rounded-[3px] text-[9px] font-black flex items-center justify-center transition-all"
            style={{ background: isSolo ? color : '#2a2a2a', color: isSolo ? '#000' : '#777' }}
          >
            S
          </button>
          <button
            onClick={onMute}
            className="w-5 h-5 rounded-[3px] text-[9px] font-black flex items-center justify-center transition-all"
            style={{ background: isMuted ? '#ef4444' : '#2a2a2a', color: isMuted ? '#fff' : '#777' }}
          >
            M
          </button>
        </div>

        {/* Volume icon */}
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
        </svg>

        {/* Volume slider — Radix UI */}
        <div className="w-20">
          <Slider
            value={volume}
            max={1}
            step={0.01}
            onChange={onVolumeChange}
            color={color}
            disabled={isMuted}
          />
        </div>
      </div>
    </div>
  );
}

export default function StemPlayer({ vocalsUrl, drumsUrl, bassUrl, otherUrl, midiUrl, bpm, trackKey, title, artist }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volumes, setVolumes] = useState({ vocals: 0.8, other: 0.8, drums: 0.8, bass: 0.8 });
  const [muted, setMuted] = useState({ vocals: false, other: false, drums: false, bass: false });
  const [solos, setSolos] = useState({ vocals: false, other: false, drums: false, bass: false });

  const baseUrl = import.meta.env.VITE_API_BASE || 'http://localhost:8000';
  const fullUrl = (p) => (p ? `${baseUrl}${p}` : null);

  const urlMap = {
    vocals: fullUrl(vocalsUrl),
    other: fullUrl(otherUrl),
    drums: fullUrl(drumsUrl),
    bass: fullUrl(bassUrl),
  };

  // Audio elements
  const audioRefs = {
    vocals: useRef(null),
    other: useRef(null),
    drums: useRef(null),
    bass: useRef(null),
  };

  const anySolo = Object.values(solos).some(Boolean);

  const effectiveVol = (key) => {
    if (muted[key]) return 0;
    if (anySolo && !solos[key]) return 0;
    return volumes[key];
  };

  useEffect(() => {
    Object.entries(audioRefs).forEach(([k, r]) => {
      if (r.current) {
        const v = effectiveVol(k);
        if (isFinite(v)) r.current.volume = v;
      }
    });
  }, [volumes, muted, solos]);

  useEffect(() => {
    Object.entries(audioRefs).forEach(([, r]) => {
      if (r.current) {
        if (isPlaying) r.current.play().catch(() => {});
        else r.current.pause();
      }
    });
  }, [isPlaying]);

  const seekAll = useCallback((time) => {
    Object.values(audioRefs).forEach((r) => { if (r.current) r.current.currentTime = time; });
    setProgress(time);
  }, []);

  const restart = () => { seekAll(0); setIsPlaying(true); };

  const formatTime = (t) => {
    if (!t || isNaN(t)) return '0:00';
    return `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  };

  if (!vocalsUrl) return null;

  const progressRatio = duration > 0 ? progress / duration : 0;

  return (
    <Card className="bg-[#121212] rounded-none overflow-hidden p-6 shadow-2xl border border-white/20">

      {/* Hidden audio elements */}
      {STEMS.map(({ key }) =>
        urlMap[key] ? (
          <audio
            key={key}
            ref={audioRefs[key]}
            src={urlMap[key]}
            onTimeUpdate={key === 'vocals' ? () => {
              const el = audioRefs.vocals.current;
              if (el) { setProgress(el.currentTime); setDuration(el.duration || 0); }
            } : undefined}
            onEnded={key === 'vocals' ? () => setIsPlaying(false) : undefined}
            crossOrigin="anonymous"
          />
        ) : null
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={restart} className="text-white/40 hover:text-white/80 transition-colors">
            <SkipBack size={18} />
          </button>
          <button
            onClick={() => setIsPlaying((p) => !p)}
            className="w-11 h-11 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
            style={{ background: '#ccff00a8' }}
          >
            {isPlaying
              ? <Pause size={18} fill="white" stroke="white" />
              : <Play size={18} fill="white" stroke="white" className="ml-[2px]" />}
          </button>
          <div>
            <div className="text-white font-bold text-base leading-tight">
              {title || 'Track.wav'}
            </div>
            {artist && <div className="text-white/50 text-xs mt-0.5">{artist}</div>}
            <div className="flex gap-2 mt-0.5">
              {bpm && <span className="text-[#ccff00] text-sm font-semibold">{Math.round(bpm)}bpm</span>}
              {trackKey && <span className="text-[#ccff00] text-sm font-semibold">{trackKey}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 text-white/30">
          <ChevronDown size={18} className="cursor-pointer hover:text-white/70 transition-colors" />
          <X size={18} className="cursor-pointer hover:text-white/70 transition-colors" />
        </div>
      </div>

      {/* Global seek bar — Radix UI */}
     

      {/* Stem Rows */}
      <div className="flex flex-col gap-5 mt-8">
        {STEMS.map(({ key, icon, label, color }) => (
          <StemRow
            key={key}
            stemKey={key}
            icon={icon}
            label={label}
            color={color}
            url={urlMap[key]}
            masterProgress={progress}
            masterDuration={duration}
            isPlaying={isPlaying}
            volume={volumes[key]}
            isMuted={muted[key]}
            isSolo={solos[key]}
            isDimmed={anySolo && !solos[key]}
            onSeek={seekAll}
            onVolumeChange={(v) => setVolumes((prev) => ({ ...prev, [key]: v }))}
            onSolo={() => setSolos((s) => ({ ...s, [key]: !s[key] }))}
            onMute={() => setMuted((m) => ({ ...m, [key]: !m[key] }))}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="mt-8 flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="sm" className="h-9 border border-white/20 hover:text-black px-4 font-semibold gap-2">
              <Download size={14} />
              Download Stems
              <ChevronDown size={13} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-[#121212] border-white/10 text-white">
            {STEMS.map(s => urlMap[s.key] && (
              <DropdownMenuItem key={s.key} className="focus:bg-white/10 focus:text-white cursor-pointer" onClick={() => window.open(urlMap[s.key])}>
                Download {s.label}
              </DropdownMenuItem>
            ))}
            {midiUrl && (
              <DropdownMenuItem className="focus:bg-white/10 focus:text-white cursor-pointer border-t border-white/10 mt-1 pt-1" onClick={() => window.open(baseUrl + midiUrl)}>
                Download Melody MIDI
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}
