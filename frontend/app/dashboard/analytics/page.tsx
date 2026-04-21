"use client";

import { useEffect, useState } from "react";
import { analyticsApi, accountApi } from "@/lib/api";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, RadarChart, Radar,
  PolarGrid, PolarAngleAxis
} from "recharts";

const card = { background: "#132236", border: "1px solid #1E3A5F", borderRadius: "14px", padding: "24px" };

function MetricRow({ label, value, color }: any) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #0F1E2E" }}>
      <span style={{ color: "#7A9BB5", fontSize: "13px" }}>{label}</span>
      <span style={{ color: color || "white", fontSize: "14px", fontWeight: 700 }}>{value}</span>
    </div>
  );
}

export default function AnalyticsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [activeAccount, setActiveAccount] = useState("");
  const [overview, setOverview] = useState<any>(null);
  const [byDay, setByDay] = useState<any[]>([]);
  const [bySymbol, setBySymbol] = useState<any[]>([]);
  const [byHour, setByHour] = useState<any[]>([]);
  const [discipline, setDiscipline] = useState<any>(null);
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
      analyticsApi.byDay(activeAccount),
      analyticsApi.bySymbol(activeAccount),
      analyticsApi.discipline(activeAccount),
    ]).then(([ov, bd, bs, disc]) => {
      setOverview(ov.data);
      setByDay(bd.data.days.filter((d: any) => d.total_trades > 0));
      setBySymbol(bs.data.symbols);
      setDiscipline(disc.data);
    }).finally(() => setLoading(false));
  }, [activeAccount]);

  const disciplineRadar = discipline ? [
    { subject: "Rule\nCompliance", value: discipline.rule_compliance_score, full: 40 },
    { subject: "Risk\nConsistency", value: discipline.risk_consistency_score, full: 30 },
    { subject: "Emotional\nQuality", value: discipline.emotional_quality_score, full: 20 },
    { subject: "Volume\nDiscipline", value: discipline.volume_discipline_score, full: 10 },
  ] : [];

  const getDisciplineColor = (score: number) => {
    if (score >= 80) return "#4ADE80";
    if (score >= 60) return "#FBBF24";
    if (score >= 40) return "#F97316";
    return "#F87171";
  };

  if (loading) {
    return (
      <div style={{ padding: "28px", color: "#5A7A95", fontSize: "14px" }}>
        Loading analytics...
      </div>
    );
  }

  return (
    <div style={{ padding: "28px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <h1 style={{ color: "white", fontSize: "22px", fontWeight: 700, margin: 0 }}>Analytics</h1>
          <p style={{ color: "#5A7A95", fontSize: "13px", marginTop: "4px" }}>Deep performance breakdown</p>
        </div>
        <select value={activeAccount} onChange={(e) => setActiveAccount(e.target.value)}
          style={{ background: "#132236", border: "1px solid #1E3A5F", color: "white", padding: "8px 12px", borderRadius: "8px", fontSize: "13px", outline: "none" }}>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.account_name}</option>)}
        </select>
      </div>

      {/* Overview metrics */}
      {overview && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
          <div style={card}>
            <h3 style={{ color: "white", fontSize: "14px", fontWeight: 600, margin: "0 0 4px" }}>Performance Summary</h3>
            <p style={{ color: "#5A7A95", fontSize: "12px", margin: "0 0 16px" }}>All-time statistics</p>
            <MetricRow label="Total Trades" value={overview.total_trades} />
            <MetricRow label="Win Rate" value={`${overview.win_rate}%`} color="#2E86C1" />
            <MetricRow label="Profit Factor" value={overview.profit_factor} color={overview.profit_factor >= 1.5 ? "#4ADE80" : "#F97316"} />
            <MetricRow label="Average Win" value={`$${overview.average_win.toFixed(2)}`} color="#4ADE80" />
            <MetricRow label="Average Loss" value={`$${overview.average_loss.toFixed(2)}`} color="#F87171" />
            <MetricRow label="Average R:R" value={overview.average_rr} color="#2E86C1" />
            <MetricRow label="Largest Win" value={`$${overview.largest_win.toFixed(2)}`} color="#4ADE80" />
            <MetricRow label="Largest Loss" value={`$${overview.largest_loss.toFixed(2)}`} color="#F87171" />
            <MetricRow label="Max Drawdown" value={`$${overview.max_drawdown.toFixed(2)} (${overview.max_drawdown_percent}%)`} color="#F97316" />
          </div>

          {/* Discipline score breakdown */}
          <div style={card}>
            <h3 style={{ color: "white", fontSize: "14px", fontWeight: 600, margin: "0 0 4px" }}>Discipline Score</h3>
            <p style={{ color: "#5A7A95", fontSize: "12px", margin: "0 0 20px" }}>
              {discipline?.total_tagged_trades || 0} of {discipline?.total_trades || 0} trades tagged
            </p>
            {discipline && (
              <>
                {/* Big score */}
                <div style={{ textAlign: "center", marginBottom: "24px" }}>
                  <div style={{ fontSize: "56px", fontWeight: 800, color: getDisciplineColor(discipline.score), lineHeight: 1 }}>
                    {discipline.score}
                  </div>
                  <div style={{ color: "#5A7A95", fontSize: "13px", marginTop: "4px" }}>out of 100</div>
                </div>

                {/* Component bars */}
                {[
                  { label: "Rule Compliance", rate: discipline.rule_compliance_rate, weight: "40%" },
                  { label: "Risk Consistency", rate: discipline.risk_consistency_rate, weight: "30%" },
                  { label: "Emotional Quality", rate: discipline.emotional_quality_rate, weight: "20%" },
                  { label: "Volume Discipline", rate: discipline.volume_discipline_rate, weight: "10%" },
                ].map(({ label, rate, weight }) => (
                  <div key={label} style={{ marginBottom: "14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                      <span style={{ color: "#CBD5E1", fontSize: "12px" }}>{label}</span>
                      <span style={{ color: "#7A9BB5", fontSize: "11px" }}>{rate.toFixed(0)}% · {weight} weight</span>
                    </div>
                    <div style={{ height: "6px", background: "#1E3A5F", borderRadius: "3px", overflow: "hidden" }}>
                      <div style={{
                        height: "100%", width: `${rate}%`,
                        background: rate >= 70 ? "#4ADE80" : rate >= 50 ? "#FBBF24" : "#F87171",
                        borderRadius: "3px", transition: "width 0.8s ease"
                      }} />
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* By day of week */}
      {byDay.length > 0 && (
        <div style={{ ...card, marginBottom: "16px" }}>
          <h3 style={{ color: "white", fontSize: "14px", fontWeight: 600, margin: "0 0 4px" }}>Performance by Day of Week</h3>
          <p style={{ color: "#5A7A95", fontSize: "12px", margin: "0 0 20px" }}>Which days you trade best</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byDay} margin={{ top: 5, right: 5, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E3A5F" />
              <XAxis dataKey="day" tick={{ fill: "#5A7A95", fontSize: 12 }} />
              <YAxis tick={{ fill: "#5A7A95", fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
              <Tooltip
                contentStyle={{ background: "#132236", border: "1px solid #1E3A5F", borderRadius: "8px", fontSize: "12px" }}
                formatter={(v: any) => [`$${Number(v).toFixed(2)}`, "Total P&L"]} />
              <Bar dataKey="total_pnl" radius={[6, 6, 0, 0]}>
                {byDay.map((d) => (
                  <Cell key={d.day} fill={d.total_pnl >= 0 ? "#2E86C1" : "#E53E3E"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* By symbol table */}
      {bySymbol.length > 0 && (
        <div style={card}>
          <h3 style={{ color: "white", fontSize: "14px", fontWeight: 600, margin: "0 0 4px" }}>Performance by Symbol</h3>
          <p style={{ color: "#5A7A95", fontSize: "12px", margin: "0 0 20px" }}>Breakdown per instrument</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 100px 100px 100px", gap: "8px", padding: "0 0 10px", borderBottom: "1px solid #1E3A5F", marginBottom: "8px" }}>
            {["Symbol", "Trades", "Win Rate", "P&L", "Avg P&L", "Prof. Factor"].map((h) => (
              <span key={h} style={{ color: "#5A7A95", fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</span>
            ))}
          </div>
          {bySymbol.map((s, i) => (
            <div key={s.symbol} style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 100px 100px 100px", gap: "8px", padding: "12px 0", borderBottom: i < bySymbol.length - 1 ? "1px solid #0F1E2E" : "none", alignItems: "center" }}>
              <span style={{ color: "white", fontWeight: 700, fontSize: "14px" }}>{s.symbol}</span>
              <span style={{ color: "#CBD5E1", fontSize: "13px" }}>{s.total_trades}</span>
              <span style={{ color: s.win_rate >= 50 ? "#4ADE80" : "#F87171", fontSize: "13px", fontWeight: 600 }}>{s.win_rate}%</span>
              <span style={{ color: s.total_pnl >= 0 ? "#4ADE80" : "#F87171", fontSize: "13px", fontWeight: 700 }}>${s.total_pnl.toFixed(2)}</span>
              <span style={{ color: "#CBD5E1", fontSize: "13px" }}>${s.average_pnl.toFixed(2)}</span>
              <span style={{ color: s.profit_factor >= 1.5 ? "#4ADE80" : "#F97316", fontSize: "13px", fontWeight: 600 }}>{s.profit_factor === 999 ? "∞" : s.profit_factor}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}