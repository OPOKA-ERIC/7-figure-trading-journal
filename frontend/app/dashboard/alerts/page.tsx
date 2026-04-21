"use client";

import { useEffect, useState } from "react";
import { analyticsApi, accountApi } from "@/lib/api";
import { AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";

const card = { background: "#132236", border: "1px solid #1E3A5F", borderRadius: "14px", padding: "24px" };

const detectionMeta: Record<string, { label: string; color: string; bg: string; border: string }> = {
  revenge_trade:     { label: "Revenge Trade",     color: "#F97316", bg: "#2D1B0A", border: "#7A3B0A" },
  overtrading:       { label: "Overtrading",        color: "#FBBF24", bg: "#2D2600", border: "#7A6500" },
  risk_spike:        { label: "Risk Spike",         color: "#F87171", bg: "#2D0F0F", border: "#7B2020" },
  emotional_spiral:  { label: "Emotional Spiral",   color: "#C084FC", bg: "#1E1030", border: "#6B3FA0" },
  plan_abandonment:  { label: "Plan Abandonment",   color: "#60A5FA", bg: "#0F1E35", border: "#2E5A9A" },
  loss_rate_decay:   { label: "Loss Rate Decay",    color: "#F97316", bg: "#2D1B0A", border: "#7A3B0A" },
};

export default function AlertsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [activeAccount, setActiveAccount] = useState("");
  const [detections, setDetections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    accountApi.list().then((res) => {
      setAccounts(res.data);
      if (res.data.length > 0) setActiveAccount(res.data[0].id);
    });
  }, []);

  const load = async (accountId: string) => {
    setLoading(true);
    try {
      const res = await analyticsApi.detections(accountId);
      setDetections(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeAccount) load(activeAccount);
  }, [activeAccount]);

  const runDetections = async () => {
    setRunning(true);
    try {
      await analyticsApi.runDetections(activeAccount);
      await load(activeAccount);
    } finally {
      setRunning(false);
    }
  };

  const acknowledge = async (id: string) => {
    await analyticsApi.acknowledgeDetection(id);
    setDetections((prev) => prev.map((d) => d.id === id ? { ...d, acknowledged: true } : d));
  };

  const active = detections.filter((d) => !d.acknowledged);
  const dismissed = detections.filter((d) => d.acknowledged);

  return (
    <div style={{ padding: "28px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ color: "white", fontSize: "22px", fontWeight: 700, margin: 0 }}>Behavioural Alerts</h1>
          <p style={{ color: "#5A7A95", fontSize: "13px", marginTop: "4px" }}>
            Patterns detected in your trading behaviour
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <select value={activeAccount} onChange={(e) => setActiveAccount(e.target.value)}
            style={{ background: "#132236", border: "1px solid #1E3A5F", color: "white", padding: "8px 12px", borderRadius: "8px", fontSize: "13px", outline: "none" }}>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.account_name}</option>)}
          </select>
          <button onClick={runDetections} disabled={running}
            style={{ display: "flex", alignItems: "center", gap: "7px", background: "#1E3A5F", border: "1px solid #2E5A8F", color: "white", padding: "8px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
            <RefreshCw size={14} style={{ animation: running ? "spin 1s linear infinite" : "none" }} />
            {running ? "Scanning..." : "Re-scan"}
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "24px" }}>
        {[
          { label: "Active Alerts", value: active.length, color: "#F87171" },
          { label: "Total Detected", value: detections.length, color: "#FBBF24" },
          { label: "Acknowledged", value: dismissed.length, color: "#4ADE80" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ ...card, padding: "20px" }}>
            <div style={{ color: "#7A9BB5", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>{label}</div>
            <div style={{ color, fontSize: "32px", fontWeight: 800 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Active alerts */}
      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ color: "white", fontSize: "15px", fontWeight: 600, marginBottom: "14px" }}>
          Active Alerts {active.length > 0 && <span style={{ color: "#F87171", fontSize: "13px" }}>({active.length})</span>}
        </h2>
        {loading ? (
          <div style={{ color: "#5A7A95", fontSize: "14px" }}>Loading...</div>
        ) : active.length === 0 ? (
          <div style={{ ...card, textAlign: "center", padding: "48px" }}>
            <CheckCircle size={40} color="#4ADE80" style={{ margin: "0 auto 12px" }} />
            <p style={{ color: "#4ADE80", fontWeight: 600, marginBottom: "4px" }}>No active alerts</p>
            <p style={{ color: "#5A7A95", fontSize: "13px" }}>Your trading behaviour looks clean. Keep it up.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {active.map((d) => {
              const meta = detectionMeta[d.detection_type] || { label: d.detection_type, color: "#F97316", bg: "#2D1B0A", border: "#7A3B0A" };
              return (
                <div key={d.id} style={{ display: "flex", gap: "16px", padding: "18px 20px", borderRadius: "12px", background: meta.bg, border: `1px solid ${meta.border}` }}>
                  <AlertTriangle size={20} color={meta.color} style={{ flexShrink: 0, marginTop: "2px" }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                      <span style={{ color: meta.color, fontSize: "13px", fontWeight: 700 }}>{meta.label}</span>
                      <span style={{ color: "#5A7A95", fontSize: "11px" }}>
                        {new Date(d.detected_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                    </div>
                    <p style={{ color: "#CBD5E1", fontSize: "13px", margin: 0, lineHeight: 1.5 }}>
                      {d.detail?.message}
                    </p>
                    {d.detail && Object.keys(d.detail).filter(k => k !== "message").length > 0 && (
                      <div style={{ display: "flex", gap: "12px", marginTop: "10px", flexWrap: "wrap" }}>
                        {Object.entries(d.detail).filter(([k]) => k !== "message").map(([k, v]) => (
                          <span key={k} style={{ color: "#7A9BB5", fontSize: "11px", background: "#0D1F30", padding: "3px 8px", borderRadius: "6px" }}>
                            {k.replace(/_/g, " ")}: <strong style={{ color: "#CBD5E1" }}>{String(v)}</strong>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button onClick={() => acknowledge(d.id)}
                    style={{ flexShrink: 0, background: "none", border: `1px solid ${meta.border}`, color: meta.color, padding: "6px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", alignSelf: "flex-start" }}>
                    Dismiss
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Dismissed */}
      {dismissed.length > 0 && (
        <div>
          <h2 style={{ color: "#5A7A95", fontSize: "14px", fontWeight: 600, marginBottom: "12px" }}>
            Dismissed ({dismissed.length})
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {dismissed.map((d) => {
              const meta = detectionMeta[d.detection_type] || { label: d.detection_type, color: "#5A7A95", bg: "#132236", border: "#1E3A5F" };
              return (
                <div key={d.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", borderRadius: "10px", background: "#0D1F30", border: "1px solid #1E3A5F", opacity: 0.6 }}>
                  <CheckCircle size={14} color="#4ADE80" />
                  <span style={{ color: "#7A9BB5", fontSize: "12px", fontWeight: 600 }}>{meta.label}</span>
                  <span style={{ color: "#5A7A95", fontSize: "12px", flex: 1 }}>{d.detail?.message}</span>
                  <span style={{ color: "#3A5A75", fontSize: "11px" }}>
                    {new Date(d.detected_at).toLocaleDateString()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}