"use client";

import { useEffect, useState } from "react";
import { tradeApi, accountApi, psychologyApi } from "@/lib/api";
import { TrendingUp, TrendingDown, Search, Filter, X, ChevronLeft, ChevronRight } from "lucide-react";

const card = { background: "#132236", border: "1px solid #1E3A5F", borderRadius: "14px" };

const EMOTIONS = ["calm", "confident", "anxious", "frustrated", "fearful", "greedy", "neutral"];
const PLANS = ["yes", "no", "partially"];
const MISTAKES = [
  "early_entry", "late_entry", "moved_stop_loss", "removed_take_profit",
  "over_risked", "fomo_entry", "revenge_trade", "overtraded",
  "ignored_session_rules", "no_reason"
];

const emotionColor: Record<string, string> = {
  calm: "#60A5FA", confident: "#4ADE80", anxious: "#FCD34D",
  frustrated: "#F97316", fearful: "#F87171", greedy: "#C084FC", neutral: "#94A3B8"
};

function EmotionBadge({ emotion }: { emotion: string }) {
  if (!emotion) return null;
  return (
    <span style={{
      padding: "2px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: 600,
      background: (emotionColor[emotion] || "#94A3B8") + "25",
      color: emotionColor[emotion] || "#94A3B8",
      textTransform: "capitalize"
    }}>{emotion}</span>
  );
}

function PsychologyModal({ trade, onClose, onSaved }: any) {
  const [form, setForm] = useState({
    emotion: trade.emotion || "",
    followed_plan: trade.followed_plan || "",
    mistake_type: trade.mistake_type || "",
    notes: trade.notes || "",
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await psychologyApi.log(trade.id, form);
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const selectStyle = {
    width: "100%", padding: "9px 12px", borderRadius: "8px",
    background: "#0D2137", border: "1px solid #1E3A5F",
    color: "white", fontSize: "13px", outline: "none",
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 100, padding: "20px"
    }}>
      <div style={{ ...card, width: "100%", maxWidth: "480px", padding: "28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div>
            <h3 style={{ color: "white", fontSize: "16px", fontWeight: 700, margin: 0 }}>
              Log Psychology
            </h3>
            <p style={{ color: "#5A7A95", fontSize: "12px", marginTop: "3px" }}>
              {trade.symbol} · {trade.direction.toUpperCase()} · ${parseFloat(trade.profit_loss).toFixed(2)}
            </p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#5A7A95", cursor: "pointer" }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ color: "#7A9BB5", fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: "6px" }}>
              Emotion
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {EMOTIONS.map((e) => (
                <button key={e} onClick={() => setForm({ ...form, emotion: e })}
                  style={{
                    padding: "6px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: 600,
                    border: "none", cursor: "pointer", transition: "all 0.15s",
                    background: form.emotion === e ? (emotionColor[e] + "40") : "#1E3A5F",
                    color: form.emotion === e ? emotionColor[e] : "#7A9BB5",
                    outline: form.emotion === e ? `1px solid ${emotionColor[e]}` : "none",
                  }}>
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ color: "#7A9BB5", fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: "6px" }}>
              Followed Plan?
            </label>
            <div style={{ display: "flex", gap: "8px" }}>
              {PLANS.map((p) => (
                <button key={p} onClick={() => setForm({ ...form, followed_plan: p })}
                  style={{
                    flex: 1, padding: "8px", borderRadius: "8px", fontSize: "13px", fontWeight: 600,
                    border: "none", cursor: "pointer", transition: "all 0.15s",
                    background: form.followed_plan === p
                      ? (p === "yes" ? "#1E4D2B" : p === "no" ? "#2D0F0F" : "#2D2000")
                      : "#1E3A5F",
                    color: form.followed_plan === p
                      ? (p === "yes" ? "#4ADE80" : p === "no" ? "#F87171" : "#FCD34D")
                      : "#7A9BB5",
                    textTransform: "capitalize",
                  }}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ color: "#7A9BB5", fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: "6px" }}>
              Mistake Type
            </label>
            <select value={form.mistake_type} onChange={(e) => setForm({ ...form, mistake_type: e.target.value })}
              style={selectStyle}>
              <option value="">No mistake</option>
              {MISTAKES.map((m) => (
                <option key={m} value={m}>{m.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ color: "#7A9BB5", fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: "6px" }}>
              Notes
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              maxLength={500}
              placeholder="What happened on this trade?"
              style={{ ...selectStyle, resize: "none", fontFamily: "inherit" }}
            />
            <p style={{ color: "#3A5A75", fontSize: "11px", textAlign: "right", marginTop: "3px" }}>
              {form.notes.length}/500
            </p>
          </div>
        </div>

        <button onClick={save} disabled={saving}
          style={{
            width: "100%", padding: "12px", borderRadius: "8px", marginTop: "8px",
            background: saving ? "#1A5276" : "#2E86C1", color: "white",
            fontWeight: 600, fontSize: "14px", border: "none", cursor: "pointer",
          }}>
          {saving ? "Saving..." : "Save Psychology Log"}
        </button>
      </div>
    </div>
  );
}

export default function TradesPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [activeAccount, setActiveAccount] = useState("");
  const [trades, setTrades] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedTrade, setSelectedTrade] = useState<any>(null);

  useEffect(() => {
    accountApi.list().then((res) => {
      setAccounts(res.data);
      if (res.data.length > 0) setActiveAccount(res.data[0].id);
    });
  }, []);

  const loadTrades = async (accountId: string, pg = 1) => {
    setLoading(true);
    try {
      const res = await tradeApi.list(accountId, { page: pg, limit: 20 });
      setTrades(res.data.trades);
      setTotal(res.data.total);
      setPages(res.data.pages);
      setPage(pg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeAccount) loadTrades(activeAccount, 1);
  }, [activeAccount]);

  const filtered = trades.filter((t) =>
    !search || t.symbol.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (dt: string) => {
    return new Date(dt).toLocaleDateString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  };

  return (
    <div style={{ padding: "28px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ color: "white", fontSize: "22px", fontWeight: 700, margin: 0 }}>Trades</h1>
          <p style={{ color: "#5A7A95", fontSize: "13px", marginTop: "4px" }}>
            {total} total trades · Click any trade to log psychology
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <select value={activeAccount} onChange={(e) => setActiveAccount(e.target.value)}
            style={{ background: "#132236", border: "1px solid #1E3A5F", color: "white", padding: "8px 12px", borderRadius: "8px", fontSize: "13px", outline: "none" }}>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.account_name}</option>)}
          </select>
        </div>
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: "20px", maxWidth: "320px" }}>
        <Search size={15} color="#5A7A95" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by symbol..."
          style={{
            width: "100%", padding: "9px 12px 9px 36px", borderRadius: "8px",
            background: "#132236", border: "1px solid #1E3A5F",
            color: "white", fontSize: "13px", outline: "none", boxSizing: "border-box"
          }}
        />
      </div>

      {/* Table */}
      <div style={{ ...card, overflow: "hidden" }}>
        {/* Table header */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "140px 80px 70px 90px 90px 90px 100px 110px 80px",
          padding: "12px 20px",
          borderBottom: "1px solid #1E3A5F",
          gap: "8px"
        }}>
          {["Open Time", "Symbol", "Dir", "Lot", "Open", "Close", "P&L", "Emotion", "Plan"].map((h) => (
            <span key={h} style={{ color: "#5A7A95", fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {h}
            </span>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: "48px", textAlign: "center", color: "#5A7A95" }}>Loading trades...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "48px", textAlign: "center", color: "#5A7A95" }}>
            No trades found. Import an MT5 report from the Dashboard.
          </div>
        ) : (
          filtered.map((trade, i) => {
            const pnl = parseFloat(trade.profit_loss);
            const isWin = pnl > 0;
            return (
              <div
                key={trade.id}
                onClick={() => setSelectedTrade(trade)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "140px 80px 70px 90px 90px 90px 100px 110px 80px",
                  padding: "14px 20px",
                  borderBottom: i < filtered.length - 1 ? "1px solid #0F1E2E" : "none",
                  gap: "8px",
                  cursor: "pointer",
                  transition: "background 0.15s",
                  alignItems: "center",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#1E3A5F30")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <span style={{ color: "#7A9BB5", fontSize: "12px" }}>{formatDate(trade.open_time)}</span>
                <span style={{ color: "white", fontSize: "13px", fontWeight: 600 }}>{trade.symbol}</span>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: "4px",
                  color: trade.direction === "buy" ? "#4ADE80" : "#F87171",
                  fontSize: "12px", fontWeight: 600, textTransform: "uppercase"
                }}>
                  {trade.direction === "buy" ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {trade.direction}
                </span>
                <span style={{ color: "#CBD5E1", fontSize: "12px" }}>{parseFloat(trade.lot_size).toFixed(2)}</span>
                <span style={{ color: "#CBD5E1", fontSize: "12px" }}>{parseFloat(trade.open_price).toFixed(5)}</span>
                <span style={{ color: "#CBD5E1", fontSize: "12px" }}>{parseFloat(trade.close_price).toFixed(5)}</span>
                <span style={{ color: isWin ? "#4ADE80" : "#F87171", fontSize: "13px", fontWeight: 700 }}>
                  {isWin ? "+" : ""}${pnl.toFixed(2)}
                </span>
                <span><EmotionBadge emotion={trade.emotion} /></span>
                <span style={{
                  fontSize: "11px", fontWeight: 600,
                  color: trade.followed_plan === "yes" ? "#4ADE80" : trade.followed_plan === "no" ? "#F87171" : trade.followed_plan === "partially" ? "#FCD34D" : "#3A5A75",
                  textTransform: "capitalize"
                }}>
                  {trade.followed_plan || "—"}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", marginTop: "20px" }}>
          <button
            onClick={() => loadTrades(activeAccount, page - 1)}
            disabled={page === 1}
            style={{ background: "#132236", border: "1px solid #1E3A5F", color: page === 1 ? "#3A5A75" : "white", padding: "8px 12px", borderRadius: "8px", cursor: page === 1 ? "not-allowed" : "pointer", display: "flex", alignItems: "center" }}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ color: "#7A9BB5", fontSize: "13px" }}>Page {page} of {pages}</span>
          <button
            onClick={() => loadTrades(activeAccount, page + 1)}
            disabled={page === pages}
            style={{ background: "#132236", border: "1px solid #1E3A5F", color: page === pages ? "#3A5A75" : "white", padding: "8px 12px", borderRadius: "8px", cursor: page === pages ? "not-allowed" : "pointer", display: "flex", alignItems: "center" }}>
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Psychology modal */}
      {selectedTrade && (
        <PsychologyModal
          trade={selectedTrade}
          onClose={() => setSelectedTrade(null)}
          onSaved={() => loadTrades(activeAccount, page)}
        />
      )}
    </div>
  );
}