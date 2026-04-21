"use client";

import { useEffect, useState } from "react";
import { analyticsApi, accountApi } from "@/lib/api";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

const card = { background: "#132236", border: "1px solid #1E3A5F", borderRadius: "14px", padding: "24px" };

const emotionColors: Record<string, string> = {
  calm: "#60A5FA", confident: "#4ADE80", anxious: "#FCD34D",
  frustrated: "#F97316", fearful: "#F87171", greedy: "#C084FC", neutral: "#94A3B8"
};

export default function PsychologyPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [activeAccount, setActiveAccount] = useState("");
  const [overview, setOverview] = useState<any>(null);
  const [discipline, setDiscipline] = useState<any>(null);
  const [byDay, setByDay] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    accountApi.list().then((res) => {
      setAccounts(res.data);
      if (res.data.length > 0) setActiveAccount(res.data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!activeAccount) return;
    setLoading(true);
    Promise.all([
      analyticsApi.overview(activeAccount),
      analyticsApi.discipline(activeAccount),
      analyticsApi.byDay(activeAccount),
    ]).then(([ov, disc, bd]) => {
      setOverview(ov.data);
      setDiscipline(disc.data);
      setByDay(bd.data.days.filter((d: any) => d.total_trades > 0));
    }).finally(() => setLoading(false));
  }, [activeAccount]);

  const getDisciplineColor = (score: number) => {
    if (score >= 80) return "#4ADE80";
    if (score >= 60) return "#FBBF24";
    if (score >= 40) return "#F97316";
    return "#F87171";
  };

  const getDisciplineLabel = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Fair";
    return "Needs Work";
  };

  if (loading) return <div style={{ padding: "28px", color: "#5A7A95" }}>Loading...</div>;

  return (
    <div style={{ padding: "28px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <h1 style={{ color: "white", fontSize: "22px", fontWeight: 700, margin: 0 }}>Psychology</h1>
          <p style={{ color: "#5A7A95", fontSize: "13px", marginTop: "4px" }}>Your trading mindset and behaviour patterns</p>
        </div>
        <select value={activeAccount} onChange={(e) => setActiveAccount(e.target.value)}
          style={{ background: "#132236", border: "1px solid #1E3A5F", color: "white", padding: "8px 12px", borderRadius: "8px", fontSize: "13px", outline: "none" }}>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.account_name}</option>)}
        </select>
      </div>

      {/* Discipline score hero */}
      {discipline && (
        <div style={{ ...card, marginBottom: "16px", textAlign: "center", padding: "40px" }}>
          <p style={{ color: "#5A7A95", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "12px" }}>
            Your Discipline Score
          </p>
          <div style={{ fontSize: "80px", fontWeight: 800, color: getDisciplineColor(discipline.score), lineHeight: 1, marginBottom: "8px" }}>
            {discipline.score}
          </div>
          <div style={{ fontSize: "20px", fontWeight: 600, color: getDisciplineColor(discipline.score), marginBottom: "12px" }}>
            {getDisciplineLabel(discipline.score)}
          </div>
          <p style={{ color: "#5A7A95", fontSize: "13px" }}>
            Based on {discipline.total_tagged_trades} tagged trades out of {discipline.total_trades} total
          </p>
          {discipline.total_tagged_trades < discipline.total_trades && (
            <p style={{ color: "#FBBF24", fontSize: "12px", marginTop: "8px" }}>
              ⚡ Tag {discipline.total_trades - discipline.total_tagged_trades} more trades to improve your score accuracy
            </p>
          )}
        </div>
      )}

      {/* Score breakdown + quick stats */}
      {discipline && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
          <div style={card}>
            <h3 style={{ color: "white", fontSize: "14px", fontWeight: 600, marginBottom: "20px" }}>Score Breakdown</h3>
            {[
              { label: "Rule Compliance", rate: discipline.rule_compliance_rate, score: discipline.rule_compliance_score, max: 40 },
              { label: "Risk Consistency", rate: discipline.risk_consistency_rate, score: discipline.risk_consistency_score, max: 30 },
              { label: "Emotional Quality", rate: discipline.emotional_quality_rate, score: discipline.emotional_quality_score, max: 20 },
              { label: "Volume Discipline", rate: discipline.volume_discipline_rate, score: discipline.volume_discipline_score, max: 10 },
            ].map(({ label, rate, score, max }) => (
              <div key={label} style={{ marginBottom: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ color: "#CBD5E1", fontSize: "13px" }}>{label}</span>
                  <span style={{ color: "white", fontSize: "13px", fontWeight: 700 }}>{score}/{max}</span>
                </div>
                <div style={{ height: "8px", background: "#1E3A5F", borderRadius: "4px", overflow: "hidden" }}>
                  <div style={{
                    height: "100%", width: `${rate}%`,
                    background: rate >= 70 ? "#4ADE80" : rate >= 50 ? "#FBBF24" : "#F87171",
                    borderRadius: "4px", transition: "width 1s ease"
                  }} />
                </div>
                <span style={{ color: "#5A7A95", fontSize: "11px" }}>{rate.toFixed(1)}%</span>
              </div>
            ))}
          </div>

          <div style={card}>
            <h3 style={{ color: "white", fontSize: "14px", fontWeight: 600, marginBottom: "20px" }}>Key Stats</h3>
            {overview && [
              { label: "Win Rate", value: `${overview.win_rate}%` },
              { label: "Profit Factor", value: overview.profit_factor },
              { label: "Avg R:R Ratio", value: overview.average_rr },
              { label: "Current Streak", value: `${overview.current_streak} ${overview.current_streak_type}` },
              { label: "Best Day P&L", value: `$${overview.best_day_pnl}` },
              { label: "Worst Day P&L", value: `$${overview.worst_day_pnl}` },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #0F1E2E" }}>
                <span style={{ color: "#7A9BB5", fontSize: "13px" }}>{label}</span>
                <span style={{ color: "white", fontSize: "13px", fontWeight: 600 }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Win rate by day */}
      {byDay.length > 0 && (
        <div style={card}>
          <h3 style={{ color: "white", fontSize: "14px", fontWeight: 600, margin: "0 0 4px" }}>Win Rate by Day</h3>
          <p style={{ color: "#5A7A95", fontSize: "12px", margin: "0 0 20px" }}>Your best and worst trading days</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E3A5F" />
              <XAxis dataKey="day" tick={{ fill: "#5A7A95", fontSize: 12 }} />
              <YAxis tick={{ fill: "#5A7A95", fontSize: 11 }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <Tooltip
                contentStyle={{ background: "#132236", border: "1px solid #1E3A5F", borderRadius: "8px", fontSize: "12px" }}
                formatter={(v: any) => [`${Number(v).toFixed(1)}%`, "Win Rate"]} />
              <Bar dataKey="win_rate" radius={[6, 6, 0, 0]}>
                {byDay.map((d) => (
                  <Cell key={d.day} fill={d.win_rate >= 50 ? "#2E86C1" : "#E53E3E"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}