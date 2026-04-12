"use client";

import { useEffect, useState } from "react";
import { analyticsApi, accountApi, tradeApi } from "@/lib/api";
import {
  AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from "recharts";
import {
  TrendingUp, TrendingDown, Target, Shield,
  AlertTriangle, Upload, Plus, X, RefreshCw
} from "lucide-react";

interface Account { id: string; account_name: string; broker: string; currency: string; }

const card = {
  background: "#132236",
  border: "1px solid #1E3A5F",
  borderRadius: "14px",
  padding: "22px",
};

function StatCard({ label, value, sub, color, icon: Icon, loading }: any) {
  return (
    <div style={{ ...card }}>
      {loading ? (
        <div style={{ height: "80px", background: "#1E3A5F", borderRadius: "8px", animation: "pulse 1.5s infinite" }} />
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
            <span style={{ color: "#7A9BB5", fontSize: "12px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
            <div style={{ width: "34px", height: "34px", borderRadius: "8px", background: color + "22", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon size={17} color={color} />
            </div>
          </div>
          <div style={{ color: "white", fontSize: "28px", fontWeight: 700, lineHeight: 1, marginBottom: "6px" }}>{value}</div>
          {sub && <div style={{ color: "#5A7A95", fontSize: "12px" }}>{sub}</div>}
        </>
      )}
    </div>
  );
}

function Alert({ detection, onDismiss }: any) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "14px 18px", borderRadius: "10px", background: "#2D1B0A", border: "1px solid #7A3B0A", marginBottom: "8px" }}>
      <AlertTriangle size={16} color="#F97316" style={{ flexShrink: 0, marginTop: "2px" }} />
      <div style={{ flex: 1 }}>
        <span style={{ color: "#FED7AA", fontSize: "13px" }}>{detection.detail?.message}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{ color: "#7A9BB5", fontSize: "11px", background: "#1E3A5F", padding: "2px 8px", borderRadius: "6px" }}>
          {detection.detection_type.replace(/_/g, " ")}
        </span>
        <button onClick={() => onDismiss(detection.id)} style={{ background: "none", border: "none", color: "#5A7A95", cursor: "pointer", padding: "2px" }}>
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeAccount, setActiveAccount] = useState("");
  const [overview, setOverview] = useState<any>(null);
  const [equityCurve, setEquityCurve] = useState<any[]>([]);
  const [discipline, setDiscipline] = useState<any>(null);
  const [detections, setDetections] = useState<any[]>([]);
  const [symbolData, setSymbolData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [showCreateAccount, setShowCreateAccount] = useState(false);

  useEffect(() => {
    accountApi.list().then((res) => {
      setAccounts(res.data);
      if (res.data.length > 0) setActiveAccount(res.data[0].id);
      else { setLoading(false); setShowCreateAccount(true); }
    });
  }, []);

  const loadData = async (accountId: string) => {
    setLoading(true);
    try {
      const [ov, ec, disc, det, sym] = await Promise.all([
        analyticsApi.overview(accountId),
        analyticsApi.equityCurve(accountId),
        analyticsApi.discipline(accountId),
        analyticsApi.detections(accountId),
        analyticsApi.bySymbol(accountId),
      ]);
      setOverview(ov.data);
      setEquityCurve(ec.data.points || []);
      setDiscipline(disc.data);
      setDetections(det.data.filter((d: any) => !d.acknowledged));
      setSymbolData(sym.data.symbols || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeAccount) loadData(activeAccount);
  }, [activeAccount]);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeAccount) return;
    setImporting(true);
    setImportResult(null);
    try {
      const res = await tradeApi.import(activeAccount, file);
      setImportResult(res.data);
      // Run detections then reload
      await analyticsApi.runDetections(activeAccount);
      await loadData(activeAccount);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Import failed");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  const dismissAlert = async (id: string) => {
    await analyticsApi.acknowledgeDetection(id);
    setDetections((prev) => prev.filter((d) => d.id !== id));
  };

  const getDisciplineColor = (score: number) => {
    if (score >= 80) return "#4ADE80";
    if (score >= 60) return "#FBBF24";
    if (score >= 40) return "#F97316";
    return "#F87171";
  };

  // ── Create Account Modal ──────────────────────────────────────────────────
  if (showCreateAccount) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <div style={{ ...card, width: "100%", maxWidth: "400px" }}>
          <h2 style={{ color: "white", fontSize: "18px", fontWeight: 700, marginBottom: "6px" }}>
            Create your first trading account
          </h2>
          <p style={{ color: "#7A9BB5", fontSize: "13px", marginBottom: "24px" }}>
            Add a trading account to start importing your MT5 reports.
          </p>
          <CreateAccountForm onCreated={(acc) => {
            setAccounts([acc]);
            setActiveAccount(acc.id);
            setShowCreateAccount(false);
          }} />
        </div>
      </div>
    );
  }

  const isPositive = overview && overview.total_pnl >= 0;

  return (
    <div style={{ padding: "28px", maxWidth: "1400px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ color: "white", fontSize: "22px", fontWeight: 700, marginBottom: "4px" }}>Dashboard</h1>
          <p style={{ color: "#5A7A95", fontSize: "13px" }}>Your trading performance at a glance</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <select value={activeAccount} onChange={(e) => setActiveAccount(e.target.value)}
            style={{ background: "#132236", border: "1px solid #1E3A5F", color: "white", padding: "8px 12px", borderRadius: "8px", fontSize: "13px", outline: "none", cursor: "pointer" }}>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>{acc.account_name}</option>
            ))}
          </select>

          <button onClick={() => activeAccount && loadData(activeAccount)}
            style={{ background: "#132236", border: "1px solid #1E3A5F", color: "#7A9BB5", padding: "8px 10px", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center" }}>
            <RefreshCw size={15} />
          </button>

          <label style={{ display: "flex", alignItems: "center", gap: "7px", background: "#2E86C1", color: "white", padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: importing ? "not-allowed" : "pointer", opacity: importing ? 0.7 : 1, transition: "opacity 0.2s" }}>
            <Upload size={15} />
            {importing ? "Importing..." : "Import MT5"}
            <input type="file" accept=".html,.htm,.csv" style={{ display: "none" }} onChange={handleImport} disabled={importing} />
          </label>
        </div>
      </div>

      {/* Import result toast */}
      {importResult && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px", borderRadius: "10px", background: "#0D3320", border: "1px solid #1E6B3A", marginBottom: "20px" }}>
          <span style={{ color: "#86EFAC", fontSize: "13px" }}>
            ✓ Imported <strong>{importResult.imported}</strong> trades · {importResult.skipped_duplicates} duplicates skipped · {importResult.errors} errors
          </span>
          <button onClick={() => setImportResult(null)} style={{ background: "none", border: "none", color: "#5A7A95", cursor: "pointer" }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Detection alerts */}
      {detections.length > 0 && (
        <div style={{ marginBottom: "20px" }}>
          {detections.map((d) => <Alert key={d.id} detection={d} onDismiss={dismissAlert} />)}
        </div>
      )}

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
        <StatCard label="Win Rate" loading={loading}
          value={overview ? `${overview.win_rate}%` : "—"}
          sub={overview ? `${overview.winning_trades} of ${overview.total_trades} trades` : ""}
          color="#2E86C1" icon={Target} />
        <StatCard label="Total P&L" loading={loading}
          value={overview ? `$${overview.total_pnl.toFixed(2)}` : "—"}
          sub={overview ? `Profit factor: ${overview.profit_factor}` : ""}
          color={isPositive ? "#4ADE80" : "#F87171"}
          icon={isPositive ? TrendingUp : TrendingDown} />
        <StatCard label="Max Drawdown" loading={loading}
          value={overview ? `$${overview.max_drawdown.toFixed(2)}` : "—"}
          sub={overview ? `${overview.max_drawdown_percent}% of peak` : ""}
          color="#F97316" icon={TrendingDown} />
        <StatCard label="Discipline Score" loading={loading}
          value={discipline ? `${discipline.score}/100` : "—"}
          sub={discipline?.total_tagged_trades ? `${discipline.total_tagged_trades} of ${discipline.total_trades} trades tagged` : "Tag trades to get score"}
          color={discipline ? getDisciplineColor(discipline.score) : "#5A7A95"}
          icon={Shield} />
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "16px", marginBottom: "24px" }}>

        {/* Equity curve */}
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h2 style={{ color: "white", fontSize: "15px", fontWeight: 600 }}>Equity Curve</h2>
            {overview && (
              <span style={{ color: isPositive ? "#4ADE80" : "#F87171", fontSize: "13px", fontWeight: 600 }}>
                {isPositive ? "+" : ""}${overview.total_pnl.toFixed(2)}
              </span>
            )}
          </div>
          {equityCurve.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={equityCurve} margin={{ top: 5, right: 5, bottom: 0, left: 10 }}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2E86C1" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#2E86C1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E3A5F" />
                <XAxis dataKey="date" tick={{ fill: "#5A7A95", fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fill: "#5A7A95", fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  contentStyle={{ background: "#132236", border: "1px solid #1E3A5F", borderRadius: "8px", fontSize: "12px" }}
                  labelStyle={{ color: "#E8F4FD", marginBottom: "4px" }}
                  formatter={(v: any) => [`$${Number(v).toFixed(2)}`, "Cumulative P&L"]} />
                <Area type="monotone" dataKey="cumulative_pnl" stroke="#2E86C1" strokeWidth={2.5} fill="url(#grad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: "220px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ textAlign: "center" }}>
                <Upload size={32} color="#2A4A6B" style={{ margin: "0 auto 12px" }} />
                <p style={{ color: "#5A7A95", fontSize: "13px" }}>Import MT5 trades to see your equity curve</p>
              </div>
            </div>
          )}
        </div>

        {/* By symbol */}
        <div style={card}>
          <h2 style={{ color: "white", fontSize: "15px", fontWeight: 600, marginBottom: "20px" }}>By Symbol</h2>
          {symbolData.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {symbolData.slice(0, 5).map((s) => (
                <div key={s.symbol}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                    <span style={{ color: "white", fontSize: "13px", fontWeight: 600 }}>{s.symbol}</span>
                    <span style={{ color: s.total_pnl >= 0 ? "#4ADE80" : "#F87171", fontSize: "13px", fontWeight: 600 }}>
                      ${s.total_pnl.toFixed(0)}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ color: "#5A7A95", fontSize: "11px" }}>{s.win_rate}% WR · {s.total_trades} trades</span>
                  </div>
                  <div style={{ height: "4px", background: "#1E3A5F", borderRadius: "2px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${s.win_rate}%`, background: s.win_rate >= 50 ? "#2E86C1" : "#CA6F1E", borderRadius: "2px", transition: "width 0.6s ease" }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ height: "200px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <p style={{ color: "#5A7A95", fontSize: "13px" }}>No symbol data yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick stats row */}
      {overview && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
          {[
            { label: "Avg Win", value: `$${overview.average_win.toFixed(2)}`, color: "#4ADE80" },
            { label: "Avg Loss", value: `$${overview.average_loss.toFixed(2)}`, color: "#F87171" },
            { label: "Avg R:R", value: `${overview.average_rr}`, color: "#2E86C1" },
            { label: "Current Streak", value: `${overview.current_streak} ${overview.current_streak_type}`, color: overview.current_streak_type === "win" ? "#4ADE80" : "#F87171" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ ...card, padding: "16px 20px" }}>
              <div style={{ color: "#7A9BB5", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>{label}</div>
              <div style={{ color, fontSize: "20px", fontWeight: 700 }}>{value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateAccountForm({ onCreated }: { onCreated: (acc: any) => void }) {
  const [name, setName] = useState("");
  const [broker, setBroker] = useState("");
  const [loading, setLoading] = useState(false);

  const create = async () => {
    if (!name) return;
    setLoading(true);
    try {
      const res = await accountApi.create({ account_name: name, broker, currency: "USD" });
      onCreated(res.data);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%", padding: "10px 14px", borderRadius: "8px",
    background: "#0D2137", border: "1px solid #1E3A5F",
    color: "white", fontSize: "14px", outline: "none",
    boxSizing: "border-box" as const,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div>
        <label style={{ color: "#7A9BB5", fontSize: "12px", display: "block", marginBottom: "6px" }}>Account Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Exness Live" style={inputStyle} />
      </div>
      <div>
        <label style={{ color: "#7A9BB5", fontSize: "12px", display: "block", marginBottom: "6px" }}>Broker (optional)</label>
        <input value={broker} onChange={(e) => setBroker(e.target.value)} placeholder="e.g. Exness" style={inputStyle} />
      </div>
      <button onClick={create} disabled={!name || loading}
        style={{ padding: "11px", borderRadius: "8px", background: name ? "#2E86C1" : "#1A3A5C", color: "white", fontWeight: 600, fontSize: "14px", border: "none", cursor: name ? "pointer" : "not-allowed", transition: "background 0.2s" }}>
        {loading ? "Creating..." : "Create Account & Continue"}
      </button>
    </div>
  );
}