import React, { useState, useMemo, useCallback, useEffect } from "react";
import { ResponsiveRadar } from "@nivo/radar";
import { Youtube, Play, Loader2, Music2, Info, ChevronDown, RadioTower, Upload, Mic, Shield, Zap, AudioWaveform, Activity, CheckCircle2, XCircle, X } from "lucide-react";

import { SWARA } from "./components/SwaraWheel.jsx";
import SwaraLane from "./components/SwaraLane.jsx";
import { StatCard, RagaCard } from "./components/Cards.jsx";
import StemPlayer from "./components/StemPlayer.jsx";
import ProjectsView from "./components/ProjectsView.jsx";
import DatasetView from "./components/DatasetView.jsx";
import AnalyticsDashboard from "./components/AnalyticsDashboard.jsx";
import { analyzeSource, analyzeUpload, analyzeSourceWithProgress, analyzeUploadWithProgress, getAvailableRagas, updateActualRaga, recalculateTonic } from "./api.js";
import { mockAnalysis, SAMPLE_TRACKS } from "./mock.js";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Toggle } from "@/components/ui/toggle";
import { Progress } from "@/components/ui/progress";
import { AlertCircle } from "lucide-react";

const SWARA_FULL = {
  S: "Shadja", r: "Komal Rishabh", R: "Shuddha Rishabh", g: "Komal Gandhar",
  G: "Shuddha Gandhar", m: "Shuddha Madhyam", M: "Teevra Madhyam", P: "Pancham",
  d: "Komal Dhaivat", D: "Shuddha Dhaivat", n: "Komal Nishad", N: "Shuddha Nishad",
};

const PROGRESS_LABELS = {
  starting: "Initializing",
  loading_audio: "Downloading audio",
  separating_stems: "Isolating vocals",
  extracting_pitch: "Extracting pitch contour",
  detecting_tonic: "Finding the root note",
  matching_ragas: "Matching Ragas",
  analyzing_tempo: "Analyzing tempo",
  complete: "Analysis complete",
};

export default function App() {
  const [view, setView] = useState("projects"); // "projects" or "dashboard"
  const [url, setUrl] = useState(() => localStorage.getItem("SWARAAG_url") || "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(() => {
    const saved = localStorage.getItem("SWARAAG_result");
    return saved ? JSON.parse(saved) : null;
  });
  const [error, setError] = useState("");
  const [usedDemo, setUsedDemo] = useState(() => localStorage.getItem("SWARAAG_usedDemo") === "true");
  const [showSamples, setShowSamples] = useState(false);
  const [borgeetMode, setBorgeetMode] = useState(() => localStorage.getItem("SWARAAG_borgeet") === "true");
  const [tonicHint, setTonicHint] = useState(() => localStorage.getItem("SWARAAG_tonicHint") || "none");
  const [progressStage, setProgressStage] = useState("");
  const [progressPct, setProgressPct] = useState(0);
  const [logs, setLogs] = useState([]);

  const [availableRagas, setAvailableRagas] = useState([]);
  const [feedbackState, setFeedbackState] = useState(null);
  const [selectedActualRaga, setSelectedActualRaga] = useState("");

  useEffect(() => {
    getAvailableRagas().then(data => setAvailableRagas(data.ragas)).catch(console.error);
  }, []);

  useEffect(() => {
    if (result && result.session_id) {
      if (result.feedback_given) {
        setFeedbackState('dismissed');
      } else {
        setFeedbackState(null);
        setSelectedActualRaga("");
      }
    }
  }, [result?.session_id, result?.feedback_given]);

  useEffect(() => {
    localStorage.setItem("SWARAAG_url", url);
    if (result) {
      localStorage.setItem("SWARAAG_result", JSON.stringify(result));
    } else {
      localStorage.removeItem("SWARAAG_result");
    }
    localStorage.setItem("SWARAAG_usedDemo", usedDemo);
    localStorage.setItem("SWARAAG_borgeet", borgeetMode);
    localStorage.setItem("SWARAAG_tonicHint", tonicHint);
  }, [url, result, usedDemo, borgeetMode, tonicHint]);
  
  const runAnalysis = useCallback(async (source) => {
    const target = source || url;
    if (!target) {
      setError("Please enter a YouTube URL or upload a file.");
      return;
    }
    setError("");
    setLoading(true);
    setResult(null);
    setUsedDemo(false);
    setProgressStage("");
    setProgressPct(0);
    setLogs([]);
    setFeedbackState(null);
    setSelectedActualRaga("");
    try {
      const data = await analyzeSourceWithProgress(target, {
        borgeetMode,
        useSeparation: true,
        tonicHint: tonicHint === "none" ? null : tonicHint,
      }, (update) => {
        if (update.pct !== undefined) {
          setProgressPct(update.pct);
        }
        if (update.stage) {
          setProgressStage(update.stage);
          const timeStr = new Date().toLocaleTimeString([], { hour12: false });
          const label = PROGRESS_LABELS[update.stage] || update.stage;
          setLogs(prev => {
            // Avoid duplicate consecutive logs
            if (prev.length > 0 && prev[prev.length - 1].stage === update.stage) return prev;
            return [...prev, { time: timeStr, text: label, stage: update.stage }];
          });
        }
      });
      setResult(data);
    } catch (e) {
      // Backend unreachable or failed — fall back to demo data so the UI is
      // still explorable. Remove this fallback once your backend is deployed
      // and you want hard failures surfaced instead.
      console.warn("Backend call failed, falling back to demo data:", e.message);
      setResult(mockAnalysis(target, borgeetMode));
      setUsedDemo(true);
    } finally {
      setLoading(false);
      setProgressStage("");
      setProgressPct(0);
    }
  }, [url, borgeetMode, tonicHint]);

  // Hook to instantly recalculate when tonicHint changes AFTER a song is analyzed
  useEffect(() => {
    if (result && result.session_id && tonicHint) {
      const currentTonicBase = result.tonic_nearest_note.replace(/\d+$/, '');
      const selectedTonic = tonicHint === "none" ? "" : tonicHint;
      
      // Only recalculate if it's actually different from what we currently have
      if (currentTonicBase !== selectedTonic && !(selectedTonic === "" && result.tonic_method === "raga_guided_override")) {
        const doRecalc = async () => {
          setLoading(true);
          setProgressStage("Recalculating tonic and ragas...");
          try {
            const updatedResult = await recalculateTonic(result.session_id, tonicHint === "none" ? null : tonicHint, borgeetMode);
            setResult(updatedResult);
          } catch (e) {
            setError(e.message || "Failed to recalculate tonic.");
            console.error(e);
          } finally {
            setLoading(false);
            setProgressStage("");
          }
        };
        doRecalc();
      }
    }
  }, [tonicHint, result?.session_id]); // depend on tonicHint and current session

  const handleFileUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setLoading(true);
    setResult(null);
    setUsedDemo(false);
    setProgressStage("");
    setProgressPct(0);
    setLogs([]);
    setFeedbackState(null);
    setSelectedActualRaga("");
    try {
      const data = await analyzeUploadWithProgress(file, {
        borgeetMode,
        useSeparation: true,
        tonicHint: tonicHint === "none" ? null : tonicHint,
      }, (update) => {
        if (update.pct !== undefined) {
          setProgressPct(update.pct);
        }
        if (update.stage) {
          setProgressStage(update.stage);
          const timeStr = new Date().toLocaleTimeString([], { hour12: false });
          const label = PROGRESS_LABELS[update.stage] || update.stage;
          setLogs(prev => {
            if (prev.length > 0 && prev[prev.length - 1].stage === update.stage) return prev;
            return [...prev, { time: timeStr, text: label, stage: update.stage }];
          });
        }
      });
      setResult(data);
    } catch (err) {
      console.warn("Upload analysis failed, falling back to demo data:", err.message);
      setResult(mockAnalysis(file.name, borgeetMode));
      setUsedDemo(true);
    } finally {
      setLoading(false);
      setProgressStage("");
    }
  }, [borgeetMode, tonicHint]);

  const contourDomain = useMemo(() => {
    if (!result) return [0, 1200];
    const vals = result.pitch_contour.map((p) => p.cents);
    return [Math.min(...vals) - 40, Math.max(...vals) + 40];
  }, [result]);

  const tonicConfidencePct = result?.tonic_confidence
    ? Math.round(result.tonic_confidence * 100)
    : null;

  // Format swara histogram for @nivo/radar — normalize relative to max so dominant swaras fill the chart
  const radarData = useMemo(() => {
    if (!result?.swara_histogram) return [];
    const max = Math.max(...result.swara_histogram, 0.0001);
    return SWARA.map((label, i) => ({
      swara: label,
      value: Math.round(((result.swara_histogram[i] || 0) / max) * 100),
    }));
  }, [result]);

  return (
    <div className="w-full min-h-screen relative overflow-hidden" style={{ color: "#F2E9D8" }}>
      {/* Decorative blurred blobs behind the UI */}
      {/* <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-neon/20 rounded-full blur-[120px] -z-10 mix-blend-screen opacity-30 pointer-events-none" /> */}
      {/* <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-purple-500/20 rounded-full blur-[150px] -z-10 mix-blend-screen opacity-30 pointer-events-none" /> */}
      
      <div className="max-w-5xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <AudioWaveform size={28} className="text-[#ccff00]" />
              <span className="text-2xl font-bold tracking-wide text-white">SWARAAG</span>
            </div>
            <span className="text-xs text-white/50 tracking-widest uppercase font-semibold">
              Folk & Raga Analysis
            </span>
          </div>

          <div className="flex items-center gap-2 bg-[#1a1a1a] p-1 rounded-lg border border-white/10">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView("projects")}
              className={`rounded-md transition-all ${view === "projects" ? "bg-white/10 text-white" : "text-white/50 hover:text-white"}`}
            >
              Projects
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView("dataset")}
              className={`rounded-md transition-all ${view === "dataset" ? "bg-white/10 text-white" : "text-white/50 hover:text-white"}`}
            >
              Dataset
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView("analytics")}
              className={`rounded-md transition-all ${view === "analytics" ? "bg-white/10 text-white" : "text-white/50 hover:text-white"}`}
            >
              Analytics
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setResult(null);
                setView("dashboard"); // "dashboard" historically means Analyze New
              }}
              className={`rounded-md transition-all ${view === "dashboard" ? "bg-[#ccff00]/10 text-[#ccff00]" : "text-white/50 hover:text-[#ccff00]"}`}
            >
              Analyze New
            </Button>
          </div>
        </div>

        {view === "projects" ? (
          <ProjectsView 
            onSelectProject={(projData) => {
              setResult(projData);
              setView("dashboard");
            }} 
          />
        ) : view === "dataset" ? (
          <DatasetView 
            onSelectProject={(projData) => {
              setResult(projData);
              setView("dashboard");
            }} 
          />
        ) : view === "analytics" ? (
          <AnalyticsDashboard />
        ) : (
          <>
            <p className="mb-8 text-sm text-white/70">
              Paste a link. Hear what the raga hears.
            </p>
            {/* Input */}
        <Card className="bg-[#121212] border-white/10 text-white shadow-2xl p-4 mb-3">
          <div className="flex gap-3 items-center">
            <Youtube size={20} className="text-white/40" />
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runAnalysis()}
              placeholder="Enter Youtube URL or Upload a Track"
              className="flex-1 bg-transparent border-none text-sm h-10 px-0 focus-visible:ring-0 text-white placeholder:text-muted-foreground"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            />
            
            <label
              className="flex items-center gap-1.5 px-3 h-10 rounded-md text-sm cursor-pointer hover:bg-white/5 text-muted-foreground hover:text-white transition-colors"
              title="Upload an audio file instead"
            >
              <Upload size={16} />
              <input type="file" accept="audio/*" className="hidden" onChange={handleFileUpload} />
            </label>

            <Select value={tonicHint} onValueChange={setTonicHint}>
              <SelectTrigger className="w-[130px] h-10 bg-black/40 border-white/10 text-white">
                <SelectValue placeholder="Auto Tonic" />
              </SelectTrigger>
              <SelectContent className="bg-[#121212] border-white/10 text-white">
                <SelectItem value="none">Auto Tonic</SelectItem>
                {["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"].map(note => (
                  <SelectItem key={note} value={note}>{note}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              onClick={() => runAnalysis()}
              disabled={loading}
              className="h-10 px-6 font-semibold bg-[#ccff00] text-black hover:bg-[#aacc00] transition-colors"
            >
              {loading ? <Loader2 size={16} className="animate-spin mr-2" /> : <Play size={16} className="mr-2 fill-current" />}
              {loading ? "Analyzing" : "Analyze"}
            </Button>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-4">
            <Toggle
              pressed={borgeetMode}
              onPressedChange={setBorgeetMode}
              variant="outline"
              size="sm"
              className={`gap-2 h-8 text-xs ${borgeetMode ? "bg-[#ccff00]/10 border-[#ccff00]/50 text-[#ccff00] hover:bg-[#ccff00]/20 hover:text-[#ccff00]" : "border-white/10 text-muted-foreground hover:text-white hover:bg-white/5"}`}
            >
              <Music2 size={13} />
              Borgeet Mode
            </Toggle>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-white hover:bg-white/5 gap-2">
                  Sample Tracks <ChevronDown size={14} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 bg-[#121212] border-white/10 text-white">
                {SAMPLE_TRACKS.map((s) => (
                  <DropdownMenuItem
                    key={s.url}
                    onClick={() => {
                      setUrl(s.url);
                      if (s.borgeet) setBorgeetMode(true);
                      setTonicHint("none"); // Reset to auto-tonic for samples
                      runAnalysis(s.url);
                    }}
                    className="text-xs focus:bg-white/10 focus:text-white cursor-pointer py-2"
                  >
                    {s.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </Card>

        {error && (
          <Alert variant="destructive" className="bg-red-500/10 border-red-500/20 text-red-400 mb-8">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading && (
          <Card className="mb-6 bg-[#121212] border-white/10 flex flex-col items-center justify-center min-h-[200px]">
            <Loader2 size={32} className="animate-spin text-[#ccff00] mb-6" />
            <div className="w-[60%] h-1.5 mb-4 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#ccff00] transition-all duration-300 ease-out" 
                style={{ width: `${progressPct}%` }} 
              />
            </div>
            <p className="text-muted-foreground text-sm animate-pulse">
              {progressStage ? PROGRESS_LABELS[progressStage] || progressStage : "Analyzing audio..."}
            </p>
          </Card>
        )}

        {result && (
          <div className="flex flex-col gap-6">
            {usedDemo && (
              <Alert className="mb-6 bg-[#ccff00]/10 border-[#ccff00]/20 text-[#ccff00]">
                <Info className="h-4 w-4" color="#ccff00" />
                <AlertDescription className="ml-2">Showing offline sample analysis since the backend was unreachable.</AlertDescription>
              </Alert>
            )}
            
            {/* Raga Feedback Widget */}
            {!usedDemo && result.session_id && (feedbackState === null || feedbackState === 'incorrect') && (
              <Card className="bg-[#1a1a1a] border-white/10 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in">
                <div className="flex items-center gap-3">
                  <Activity className="w-5 h-5 text-[#ccff00]" />
                  <div>
                    <h4 className="text-white font-medium text-sm">Help improve our model!</h4>
                    <p className="text-white/50 text-xs">Was the predicted raga ({result.raga_candidates?.[0]?.raga}) correct?</p>
                  </div>
                </div>
                
                {feedbackState === null ? (
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="border-green-500/50 text-green-400 hover:bg-green-500/10 hover:text-green-300"
                      onClick={async () => {
                        try {
                          await updateActualRaga(result.session_id, result.raga_candidates[0].raga);
                          setFeedbackState('submitted');
                        } catch(e) { console.error(e) }
                      }}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1.5" />
                      Correct
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                      onClick={() => setFeedbackState('incorrect')}
                    >
                      <XCircle className="w-4 h-4 mr-1.5" />
                      Incorrect
                    </Button>
                  </div>
                ) : feedbackState === 'incorrect' ? (
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Select value={selectedActualRaga} onValueChange={setSelectedActualRaga}>
                      <SelectTrigger className="w-[180px] bg-black/50 border-white/10 text-white">
                        <SelectValue placeholder="Select correct raga" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#121212] border-white/10 text-white max-h-[300px]">
                        {availableRagas.map(raga => (
                          <SelectItem key={raga} value={raga}>{raga}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      size="sm"
                      className="bg-[#ccff00] text-black hover:bg-[#aacc00]"
                      disabled={!selectedActualRaga}
                      onClick={async () => {
                        try {
                          await updateActualRaga(result.session_id, selectedActualRaga);
                          setFeedbackState('submitted');
                        } catch(e) { console.error(e) }
                      }}
                    >
                      Submit
                    </Button>
                  </div>
                ) : null}
              </Card>
            )}
            {feedbackState === 'submitted' && (
               <Card className="bg-green-500/10 border-green-500/20 p-3 flex flex-row items-center justify-between text-green-400 text-sm animate-in fade-in">
                 <span className="flex-1 text-center">Thanks for your feedback! This helps us improve the prediction model.</span>
                 <button onClick={() => setFeedbackState('dismissed')} className="p-1 hover:bg-green-500/20 rounded-md transition-colors opacity-70 hover:opacity-100">
                   <X className="w-4 h-4" />
                 </button>
               </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <StatCard
                title="Detected Tonic (Sa)"
                value={result.tonic_nearest_note}
                subtitle={`${Math.round(result.tonic_hz)} Hz`}
                icon={<Mic size={18} className="text-neon" />}
                confidence={tonicConfidencePct}
              />
              <StatCard
                title="Dominant Swara"
                value={SWARA_FULL[result.dominant_notes[0]?.note] || result.dominant_notes[0]?.note}
                subtitle={`Followed by ${result.dominant_notes.slice(1, 3).map(n => n.note).join(", ")}`}
                icon={<Shield size={18} className="text-neon" />}
              />
            </div>

            {(result.vocals_url || result.other_url) && (
              <div className="mb-6">
                <StemPlayer 
                  vocalsUrl={result.vocals_url}
                  drumsUrl={result.drums_url}
                  bassUrl={result.bass_url}
                  otherUrl={result.other_url}
                  midiUrl={result.midi_url}
                  bpm={result.tempo_bpm}
                  trackKey={`${result.tonic_nearest_note} maj`}
                  title={result.meta?.title || url.split('/').pop() || "Track Analysis.wav"}
                  artist={result.meta?.uploader}
                />
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
              <Card className="lg:col-span-2 bg-[#121212] border border-white/20 shadow-2xl">
                <CardContent className="p-6">
                  <h3 className="text-xs font-semibold uppercase tracking-widest mb-3 text-muted-foreground">Pitch Contour — Swara Piano Roll</h3>
                  <div style={{ height: 280, width: '100%' }}>
                    <SwaraLane pitchContour={result.pitch_contour} tonicHz={result.tonic_hz} />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#121212] border border-white/20 shadow-2xl flex flex-col p-6">
                <h3 className="text-xs font-semibold uppercase tracking-widest mb-4 text-muted-foreground">Swara Distribution</h3>
                <div className="flex-1" style={{ minHeight: 220 }}>
                  <ResponsiveRadar
                    data={radarData}
                    keys={["value"]}
                    indexBy="swara"
                    maxValue={100}
                    margin={{ top: 20, right: 30, bottom: 20, left: 30 }}
                    curve="linearClosed"
                    borderWidth={1}
                    borderColor="#ccff00"
                    gridLevels={4}
                    gridShape="circular"
                    gridLabelOffset={12}
                    enableDots={true}
                    dotSize={4}
                    dotColor="#ccff00"
                    dotBorderWidth={0}
                    colors={["#ccff00"]}
                    fillOpacity={0.12}
                    blendMode="normal"
                    animate={true}
                    motionConfig="wobbly"
                    theme={{
                      background: "transparent",
                      textColor: "rgba(255,255,255,0.5)",
                      fontSize: 11,
                      fontFamily: "'IBM Plex Mono', monospace",
                      grid: { line: { stroke: "rgba(255,255,255,0.08)", strokeWidth: 1 } },
                      dots: { text: { fill: "rgba(255,255,255,0.5)", fontSize: 11 } },
                    }}
                    tooltipFormat={v => `${v}%`}
                  />
                </div>
              </Card>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4 text-white">Raga Matches</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {result.raga_candidates.map((r, i) => (
                  <RagaCard key={r.raga} raga={r} rank={i + 1} />
                ))}
              </div>
            </div>
          </div>
        )}

        {!result && !loading && (
          <div className="text-center py-16 text-sm" style={{ color: "#5A5148" }}>
            No track analyzed yet — paste a link above, or upload an audio file.
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
}
