import React, { useState, useEffect } from "react";
import { getDataset, getAvailableRagas } from "../api";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, Search, Play, ChevronLeft, ChevronRight } from "lucide-react";

export default function DatasetView({ onSelectProject }) {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [availableRagas, setAvailableRagas] = useState([]);
  
  // Filters
  const [rootFilter, setRootFilter] = useState("all");
  const [actualFilter, setActualFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all', 'correct', 'incorrect'

  const ROOT_NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  
  // Pagination
  const [page, setPage] = useState(1);
  const limit = 10;
  
  useEffect(() => {
    getAvailableRagas().then(res => setAvailableRagas(res.ragas)).catch(console.error);
  }, []);

  const fetchDataset = () => {
    setLoading(true);
    const params = {
      limit,
      offset: (page - 1) * limit
    };
    
    if (rootFilter !== "all") params.tonic = rootFilter;
    if (actualFilter !== "all") params.actual_raga = actualFilter;
    if (statusFilter !== "all") {
      params.is_correct = statusFilter === "correct";
    }

    getDataset(params).then(res => {
      setData(res.data);
      setTotal(res.total);
    }).catch(err => {
      console.error(err);
    }).finally(() => {
      setLoading(false);
    });
  };

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [rootFilter, actualFilter, statusFilter]);

  useEffect(() => {
    fetchDataset();
  }, [page, rootFilter, actualFilter, statusFilter]);

  const totalPages = Math.ceil(total / limit) || 1;

  const formatDuration = (sec) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleProjectClick = async (sessionId) => {
    try {
      const baseUrl = import.meta.env.VITE_API_BASE || 'http://localhost:8000';
      const res = await fetch(`${baseUrl}/projects/${sessionId}`);
      if (res.ok) {
        const fullProjectData = await res.json();
        onSelectProject(fullProjectData);
      }
    } catch (err) {
      console.error("Failed to load project details", err);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      
      {/* Filters */}
      <Card className="bg-[#1a1a1a] border-white/10 p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="flex items-center gap-2 text-white/70">
            <Search className="w-4 h-4" />
            <span className="text-sm font-semibold uppercase tracking-wider">Filters:</span>
          </div>
          
          <Select value={rootFilter} onValueChange={setRootFilter}>
            <SelectTrigger className="w-[180px] bg-[#121212] border-white/10 text-white">
              <SelectValue placeholder="Root Note" />
            </SelectTrigger>
            <SelectContent className="bg-[#121212] border-white/10 text-white max-h-[300px]">
              <SelectItem value="all">Any Root Note</SelectItem>
              {ROOT_NOTES.map(note => (
                <SelectItem key={`r-${note}`} value={note}>{note}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={actualFilter} onValueChange={setActualFilter}>
            <SelectTrigger className="w-[180px] bg-[#121212] border-white/10 text-white">
              <SelectValue placeholder="Actual Raga" />
            </SelectTrigger>
            <SelectContent className="bg-[#121212] border-white/10 text-white max-h-[300px]">
              <SelectItem value="all">Any Actual</SelectItem>
              {availableRagas.map(raga => (
                <SelectItem key={`a-${raga}`} value={raga}>{raga}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] bg-[#121212] border-white/10 text-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-[#121212] border-white/10 text-white">
              <SelectItem value="all">All Results</SelectItem>
              <SelectItem value="correct">Match (Correct)</SelectItem>
              <SelectItem value="incorrect">Mismatch (Incorrect)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Table */}
      <Card className="bg-[#1a1a1a] border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-white/80">
            <thead className="text-xs text-white/50 uppercase bg-[#121212]/50 border-b border-white/10">
              <tr>
                <th className="px-6 py-4">Track</th>
                <th className="px-6 py-4 text-center">Predicted</th>
                <th className="px-6 py-4 text-center">Actual (Verified)</th>
                <th className="px-6 py-4 text-center">Root (Tonic)</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 text-[#ccff00] animate-spin mx-auto" />
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-white/50">
                    No tracks found matching your filters.
                  </td>
                </tr>
              ) : (
                data.map(track => {
                  const isCorrect = track.predicted_raga === (track.actual_raga || track.predicted_raga);
                  return (
                    <tr key={track.session_id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 font-medium text-white max-w-[200px] truncate">
                        {track.title || "Unknown Track"}
                        <div className="text-xs text-white/40">{track.artist || "Unknown Artist"} • {formatDuration(track.duration_sec)}</div>
                      </td>
                      <td className="px-6 py-4 text-center text-[#ccff00]">
                        {track.predicted_raga}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {track.actual_raga || track.predicted_raga}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {track.tonic}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center items-center">
                          {isCorrect ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-500" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="hover:bg-[#ccff00]/10 hover:text-[#ccff00]"
                          onClick={() => handleProjectClick(track.session_id)}
                        >
                          <Play className="w-4 h-4 mr-2" />
                          View
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        <div className="p-4 border-t border-white/10 flex items-center justify-between text-white/70 text-sm bg-[#121212]/30">
          <div>
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of <span className="text-white font-semibold">{total}</span> tracks
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              className="border-white/10 hover:bg-white/10 hover:text-white"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Prev
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="border-white/10 hover:bg-white/10 hover:text-white"
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
