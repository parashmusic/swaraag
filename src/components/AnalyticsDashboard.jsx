import React, { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Loader2, Activity, PieChart as PieChartIcon, BarChart2, CheckCircle, Crosshair } from "lucide-react";
import { Card } from "@/components/ui/card";
import { getAnalytics } from "../api";

const COLORS = ["#ccff00", "#aacc00", "#88aa00", "#668800", "#446600", "#224400"];

export default function AnalyticsDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getAnalytics()
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 text-[#ccff00] animate-spin" />
      </div>
    );
  }

  if (error) {
    return <div className="text-red-400 p-4 bg-red-500/10 rounded-lg">Error loading analytics: {error}</div>;
  }

  if (!data) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* KPI Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-[#1a1a1a] border-white/10 p-6 flex flex-col justify-between">
          <div className="flex items-center gap-3 text-white/50 mb-2">
            <Activity className="w-5 h-5 text-[#ccff00]" />
            <span className="font-semibold tracking-wider text-xs uppercase">Total Tracks Analyzed</span>
          </div>
          <div className="text-4xl font-bold text-white">{data.total_tracks}</div>
        </Card>

        <Card className="bg-[#1a1a1a] border-white/10 p-6 flex flex-col justify-between">
          <div className="flex items-center gap-3 text-white/50 mb-2">
            <CheckCircle className="w-5 h-5 text-[#ccff00]" />
            <span className="font-semibold tracking-wider text-xs uppercase">Overall Accuracy</span>
          </div>
          <div className="text-4xl font-bold text-white">
            {data.overall_accuracy.toFixed(1)}%
          </div>
        </Card>

        <Card className="bg-[#1a1a1a] border-white/10 p-6 flex flex-col justify-between">
          <div className="flex items-center gap-3 text-white/50 mb-2">
            <Crosshair className="w-5 h-5 text-[#ccff00]" />
            <span className="font-semibold tracking-wider text-xs uppercase">Most Common Raga</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {data.raga_distribution.length > 0 ? data.raga_distribution[0].name : "N/A"}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Raga Distribution */}
        <Card className="bg-[#1a1a1a] border-white/10 p-6">
          <div className="flex items-center gap-3 text-white/80 mb-6">
            <PieChartIcon className="w-5 h-5 text-[#ccff00]" />
            <h3 className="font-semibold tracking-wide">Raga Distribution</h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.raga_distribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {data.raga_distribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#121212', borderColor: '#333', color: '#fff', borderRadius: '8px' }}
                  itemStyle={{ color: '#ccff00' }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Tonic Frequencies */}
        <Card className="bg-[#1a1a1a] border-white/10 p-6">
          <div className="flex items-center gap-3 text-white/80 mb-6">
            <BarChart2 className="w-5 h-5 text-[#ccff00]" />
            <h3 className="font-semibold tracking-wide">Detected Tonics (Root Notes)</h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.tonic_distribution}>
                <XAxis dataKey="name" stroke="#666" tick={{fill: '#888'}} />
                <YAxis stroke="#666" tick={{fill: '#888'}} allowDecimals={false} />
                <RechartsTooltip 
                  cursor={{fill: '#ffffff10'}}
                  contentStyle={{ backgroundColor: '#121212', borderColor: '#333', color: '#fff', borderRadius: '8px' }}
                />
                <Bar dataKey="value" fill="#ccff00" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Accuracy by Raga */}
        <Card className="bg-[#1a1a1a] border-white/10 p-6 lg:col-span-2">
          <div className="flex items-center gap-3 text-white/80 mb-6">
            <Activity className="w-5 h-5 text-[#ccff00]" />
            <h3 className="font-semibold tracking-wide">Accuracy by Raga</h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.raga_accuracy}>
                <XAxis dataKey="name" stroke="#666" tick={{fill: '#888'}} />
                <YAxis stroke="#666" tick={{fill: '#888'}} allowDecimals={false} />
                <RechartsTooltip 
                  cursor={{fill: '#ffffff10'}}
                  contentStyle={{ backgroundColor: '#121212', borderColor: '#333', color: '#fff', borderRadius: '8px' }}
                />
                <Legend />
                <Bar dataKey="correct" name="Correct" stackId="a" fill="#ccff00" radius={[0, 0, 4, 4]} />
                <Bar dataKey="incorrect" name="Incorrect" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
