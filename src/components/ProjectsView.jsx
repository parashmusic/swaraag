import React, { useEffect, useState } from 'react';
import { Play, Music2, Clock, Calendar, Trash2 } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";

import { deleteProject } from '../api.js';

export default function ProjectsView({ onSelectProject }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_BASE || 'http://localhost:8000';
        const res = await fetch(`${baseUrl}/projects`);
        if (res.ok) {
          const data = await res.json();
          setProjects(data);
        }
      } catch (err) {
        console.error("Failed to fetch projects", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

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

  const handleDeleteProject = async (e, sessionId) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this project?")) return;
    
    try {
      await deleteProject(sessionId);
      setProjects(prev => prev.filter(p => p.session_id !== sessionId));
    } catch (err) {
      console.error("Failed to delete project", err);
      alert("Failed to delete project: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-white/50">
        Loading projects...
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-white/50 text-center">
        <Music2 className="w-12 h-12 mb-4 opacity-20" />
        <h3 className="text-lg font-medium text-white mb-2">No Projects Yet</h3>
        <p>Analyze a track to start building your collection.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 mt-8">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold tracking-tight text-white">Recent Projects</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
        {projects.map((proj) => (
          <Card 
            key={proj.session_id} 
            className="group bg-[#1a1a1a] border-white/5 hover:border-[#ccff00]/30 transition-all duration-300 cursor-pointer overflow-hidden rounded-xl shadow-lg"
            onClick={() => handleProjectClick(proj.session_id)}
          >
            <div className="relative aspect-video w-full overflow-hidden bg-black">
              {proj.thumbnail ? (
                <img 
                  src={proj.thumbnail} 
                  alt={proj.title}
                  className="w-full h-full object-cover opacity-80 group-hover:scale-105 group-hover:opacity-100 transition-all duration-500"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
                  <Music2 className="w-12 h-12 text-white/10 group-hover:text-[#ccff00]/40 transition-colors" />
                </div>
              )}
              
              {/* Overlay Play Button */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/40">
                <div className="w-12 h-12 rounded-full bg-[#ccff00] text-black flex items-center justify-center shadow-[0_0_20px_rgba(204,255,0,0.4)]">
                  <Play className="w-5 h-5 ml-1 fill-current" />
                </div>
              </div>

              {/* Duration Badge */}
              <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 backdrop-blur-md rounded text-xs text-white/90 font-mono flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {Math.floor(proj.duration_sec / 60)}:{(Math.floor(proj.duration_sec % 60)).toString().padStart(2, '0')}
              </div>
            </div>

            <CardContent className="p-5">
              <h3 className="font-semibold text-lg text-white mb-1 line-clamp-1 group-hover:text-[#ccff00] transition-colors">
                {proj.title}
              </h3>
              <p className="text-sm text-white/50 mb-4 line-clamp-1">
                {proj.artist}
              </p>
              
              <div className="flex flex-nowrap items-center justify-between gap-2 text-sm mt-auto w-full">
                <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                  <span className="px-2 py-1 rounded bg-white/5 text-white/70 font-medium truncate shrink min-w-0">
                    {proj.top_raga}
                  </span>
                  <span className="px-2 py-1 rounded bg-[#ccff00]/10 text-[#ccff00] font-mono shrink-0">
                    {proj.tonic}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-auto">
                  <div className="text-white/30 text-xs flex items-center gap-1 whitespace-nowrap">
                    <Calendar className="w-3 h-3" />
                    {new Date(proj.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </div>
                  <button 
                    onClick={(e) => handleDeleteProject(e, proj.session_id)}
                    className="text-white/20 hover:text-red-500 transition-colors p-1.5 rounded-md hover:bg-red-500/10 shrink-0"
                    title="Delete Project"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
