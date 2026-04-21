"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { billingApi } from "@/lib/api";
import { Check, TrendingUp, Zap } from "lucide-react";

const FREE_FEATURES = [
  "Up to 50 trades per month",
  "1 trading account",
  "Basic analytics (win rate, P&L, profit factor)",
  "Emotion & mistake logging",
];

const PRO_FEATURES = [
  "Unlimited trades",
  "Up to 5 trading accounts",
  "Full analytics suite",
  "All 6 behavioural detections",
  "Private discipline score + history",
  "Weekly email improvement reports",
  "Monthly in-app performance report",
  "Priority support (48hr response)",
];

export default function UpgradePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleUpgrade = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await billingApi.createCheckout();
      window.location.href = res.data.checkout_url;
    } catch (err: any) {
      setError(err.response?.data?.detail || "Could not start checkout. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#0D2137",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "40px 24px",
    }}>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "48px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "16px" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "#2E86C1", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <TrendingUp size={20} color="white" />
          </div>
          <span style={{ color: "white", fontSize: "18px", fontWeight: 700 }}>7 Figure Trading Journal</span>
        </div>
        <h1 style={{ color: "white", fontSize: "32px", fontWeight: 800, margin: "0 0 12px", letterSpacing: "-0.5px" }}>
          Upgrade to Pro
        </h1>
        <p style={{ color: "#7A9BB5", fontSize: "16px", margin: 0 }}>
          Unlock the full behavioural intelligence platform
        </p>
      </div>

      {/* Pricing cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", width: "100%", maxWidth: "720px", marginBottom: "32px" }}>

        {/* Free */}
        <div style={{ background: "#132236", border: "1px solid #1E3A5F", borderRadius: "16px", padding: "28px" }}>
          <p style={{ color: "#7A9BB5", fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>Free</p>
          <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginBottom: "24px" }}>
            <span style={{ color: "white", fontSize: "36px", fontWeight: 800 }}>$0</span>
            <span style={{ color: "#5A7A95", fontSize: "14px" }}>/month</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
            {FREE_FEATURES.map((f) => (
              <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                <Check size={14} color="#5A7A95" style={{ marginTop: "2px", flexShrink: 0 }} />
                <span style={{ color: "#7A9BB5", fontSize: "13px", lineHeight: 1.4 }}>{f}</span>
              </div>
            ))}
          </div>
          <Link href="/dashboard"
            style={{ display: "block", textAlign: "center", padding: "11px", borderRadius: "8px", background: "#1E3A5F", color: "#7A9BB5", fontWeight: 600, fontSize: "14px", textDecoration: "none" }}>
            Current Plan
          </Link>
        </div>

        {/* Pro */}
        <div style={{ background: "#0D2137", border: "2px solid #2E86C1", borderRadius: "16px", padding: "28px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: "16px", right: "16px", background: "#2E86C1", color: "white", fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "20px" }}>
            7 DAYS FREE
          </div>
          <p style={{ color: "#2E86C1", fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>Pro</p>
          <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginBottom: "4px" }}>
            <span style={{ color: "white", fontSize: "36px", fontWeight: 800 }}>$25</span>
            <span style={{ color: "#5A7A95", fontSize: "14px" }}>/month</span>
          </div>
          <p style={{ color: "#5A7A95", fontSize: "12px", margin: "0 0 24px" }}>or $200/year — save $100</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
            {PRO_FEATURES.map((f) => (
              <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                <Check size={14} color="#4ADE80" style={{ marginTop: "2px", flexShrink: 0 }} />
                <span style={{ color: "#CBD5E1", fontSize: "13px", lineHeight: 1.4 }}>{f}</span>
              </div>
            ))}
          </div>

          {error && (
            <p style={{ color: "#F87171", fontSize: "12px", marginBottom: "10px" }}>⚠ {error}</p>
          )}

          <button onClick={handleUpgrade} disabled={loading}
            style={{
              width: "100%", padding: "13px", borderRadius: "8px",
              background: loading ? "#1A5276" : "#2E86C1",
              color: "white", fontWeight: 700, fontSize: "15px",
              border: "none", cursor: loading ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              transition: "background 0.2s",
            }}>
            {loading ? (
              <>
                <svg style={{ animation: "spin 1s linear infinite", width: "16px", height: "16px" }} viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
                Redirecting to checkout...
              </>
            ) : (
              <><Zap size={16} /> Start 7-Day Free Trial</>
            )}
          </button>
          <p style={{ color: "#3A5A75", fontSize: "11px", textAlign: "center", marginTop: "10px" }}>
            No credit card required for trial · Cancel anytime
          </p>
        </div>
      </div>

      <Link href="/dashboard" style={{ color: "#5A7A95", fontSize: "13px", textDecoration: "none" }}>
        ← Back to Dashboard
      </Link>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
