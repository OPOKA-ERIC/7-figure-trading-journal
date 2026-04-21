"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { userApi, accountApi, rulesApi } from "@/lib/api";
import { User, Database, Shield, Sliders, Plus, Trash2, Check } from "lucide-react";
import { useSearchParams } from "next/navigation";

const card = { background: "#132236", border: "1px solid #1E3A5F", borderRadius: "14px", padding: "24px" };

const inputStyle = {
  width: "100%", padding: "10px 14px", borderRadius: "8px",
  background: "#0D2137", border: "1px solid #1E3A5F",
  color: "white", fontSize: "14px", outline: "none",
  boxSizing: "border-box" as const,
};

const TIMEZONES = [
  "Africa/Kampala", "Africa/Nairobi", "Africa/Lagos", "Africa/Cairo",
  "Africa/Johannesburg", "Europe/London", "Europe/Berlin", "America/New_York",
  "America/Chicago", "Asia/Dubai", "Asia/Singapore", "UTC",
];

const SESSIONS = [
  { value: "any", label: "Any time" },
  { value: "london", label: "London (07:00–16:00 UTC)" },
  { value: "newyork", label: "New York (12:00–21:00 UTC)" },
  { value: "asian", label: "Asian (00:00–09:00 UTC)" },
];

function SectionHeader({ icon: Icon, color, title, subtitle }: any) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
      <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: color + "20", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={16} color={color} />
      </div>
      <div>
        <h3 style={{ color: "white", fontSize: "15px", fontWeight: 600, margin: 0 }}>{title}</h3>
        <p style={{ color: "#5A7A95", fontSize: "12px", margin: 0 }}>{subtitle}</p>
      </div>
    </div>
  );
}

function SaveButton({ onClick, loading, saved }: { onClick: () => void; loading: boolean; saved: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
      <button onClick={onClick} disabled={loading}
        style={{ padding: "10px 24px", borderRadius: "8px", background: loading ? "#1A5276" : "#2E86C1", color: "white", fontWeight: 600, fontSize: "14px", border: "none", cursor: loading ? "not-allowed" : "pointer" }}>
        {loading ? "Saving..." : "Save Changes"}
      </button>
      {saved && (
        <span style={{ display: "flex", alignItems: "center", gap: "5px", color: "#4ADE80", fontSize: "13px" }}>
          <Check size={14} /> Saved
        </span>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const { user, refresh } = useAuth();
  const searchParams = useSearchParams();
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);

  useEffect(() => {
    if (searchParams.get("upgraded") === "1") {
      setUpgradeSuccess(true);
      refresh();
      setTimeout(() => setUpgradeSuccess(false), 6000);
    }
  }, []);

  // Profile
  const [profile, setProfile] = useState({ display_name: "", timezone: "Africa/Kampala" });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  // Rules
  const [rules, setRules] = useState({
    max_daily_trades: 5,
    max_risk_percent: 2.0,
    trading_session: "any",
    session_start_utc: "",
    session_end_utc: "",
    custom_mistakes: [] as string[],
  });
  const [rulesSaving, setRulesSaving] = useState(false);
  const [rulesSaved, setRulesSaved] = useState(false);
  const [newMistake, setNewMistake] = useState("");

  // Accounts
  const [accounts, setAccounts] = useState<any[]>([]);
  const [newAccName, setNewAccName] = useState("");
  const [newAccBroker, setNewAccBroker] = useState("");
  const [creatingAcc, setCreatingAcc] = useState(false);
  const [showNewAcc, setShowNewAcc] = useState(false);

  useEffect(() => {
    if (user) setProfile({ display_name: user.display_name, timezone: user.timezone });
  }, [user]);

  useEffect(() => {
    accountApi.list().then((r) => setAccounts(r.data));
    rulesApi.get().then((r) => {
      const d = r.data;
      setRules({
        max_daily_trades: d.max_daily_trades,
        max_risk_percent: d.max_risk_percent,
        trading_session: d.trading_session,
        session_start_utc: d.session_start_utc || "",
        session_end_utc: d.session_end_utc || "",
        custom_mistakes: d.custom_mistakes || [],
      });
    });
  }, []);

  const saveProfile = async () => {
    setProfileSaving(true);
    try {
      await userApi.updateProfile(profile);
      await refresh();
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } finally {
      setProfileSaving(false);
    }
  };

  const saveRules = async () => {
    setRulesSaving(true);
    try {
      await rulesApi.save({
        ...rules,
        session_start_utc: rules.session_start_utc || null,
        session_end_utc: rules.session_end_utc || null,
      });
      setRulesSaved(true);
      setTimeout(() => setRulesSaved(false), 3000);
    } finally {
      setRulesSaving(false);
    }
  };

  const addMistake = () => {
    const val = newMistake.trim();
    if (!val || rules.custom_mistakes.includes(val)) return;
    setRules({ ...rules, custom_mistakes: [...rules.custom_mistakes, val] });
    setNewMistake("");
  };

  const removeMistake = (m: string) => {
    setRules({ ...rules, custom_mistakes: rules.custom_mistakes.filter((x) => x !== m) });
  };

  const createAccount = async () => {
    if (!newAccName) return;
    setCreatingAcc(true);
    try {
      const res = await accountApi.create({ account_name: newAccName, broker: newAccBroker, currency: "USD" });
      setAccounts((prev) => [...prev, res.data]);
      setNewAccName("");
      setNewAccBroker("");
      setShowNewAcc(false);
    } finally {
      setCreatingAcc(false);
    }
  };

  const deleteAccount = async (id: string) => {
    if (!confirm("Delete this account and all its trades? This cannot be undone.")) return;
    await accountApi.delete(id);
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  };

  const maxAccounts = user?.plan === "pro" ? 5 : 1;
  const canAddAccount = accounts.length < maxAccounts;

  return (
    <div style={{ padding: "28px", maxWidth: "760px" }}>
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ color: "white", fontSize: "22px", fontWeight: 700, margin: 0 }}>Settings</h1>
        <p style={{ color: "#5A7A95", fontSize: "13px", marginTop: "4px" }}>Manage your account, rules, and preferences</p>
      </div>

      {upgradeSuccess && (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "14px 18px", borderRadius: "10px", background: "#0D3320", border: "1px solid #1E6B3A", marginBottom: "20px" }}>
          <Check size={16} color="#4ADE80" />
          <span style={{ color: "#86EFAC", fontSize: "13px", fontWeight: 600 }}>Welcome to Pro! All features are now unlocked.</span>
        </div>
      )}

      {/* ── Profile ─────────────────────────────────────────────────── */}
      <div style={{ ...card, marginBottom: "16px" }}>
        <SectionHeader icon={User} color="#2E86C1" title="Profile" subtitle="Your personal information" />
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ color: "#7A9BB5", fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: "7px" }}>Display Name</label>
            <input value={profile.display_name} onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "#2E86C1")}
              onBlur={(e) => (e.target.style.borderColor = "#1E3A5F")} />
          </div>
          <div>
            <label style={{ color: "#7A9BB5", fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: "7px" }}>Email</label>
            <input value={user?.email || ""} disabled style={{ ...inputStyle, opacity: 0.5, cursor: "not-allowed" }} />
          </div>
          <div>
            <label style={{ color: "#7A9BB5", fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: "7px" }}>Timezone</label>
            <select value={profile.timezone} onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
              style={{ ...inputStyle, cursor: "pointer" }}
              onFocus={(e) => (e.target.style.borderColor = "#2E86C1")}
              onBlur={(e) => (e.target.style.borderColor = "#1E3A5F")}>
              {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>
          <SaveButton onClick={saveProfile} loading={profileSaving} saved={profileSaved} />
        </div>
      </div>

      {/* ── Trading Rules ────────────────────────────────────────────── */}
      <div style={{ ...card, marginBottom: "16px" }}>
        <SectionHeader icon={Sliders} color="#F97316" title="Trading Rules" subtitle="Used by the behavioural detection engine" />
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <div>
              <label style={{ color: "#7A9BB5", fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: "7px" }}>
                Max Daily Trades
              </label>
              <input type="number" min={1} max={50} value={rules.max_daily_trades}
                onChange={(e) => setRules({ ...rules, max_daily_trades: parseInt(e.target.value) || 1 })}
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "#2E86C1")}
                onBlur={(e) => (e.target.style.borderColor = "#1E3A5F")} />
              <p style={{ color: "#3A5A75", fontSize: "11px", marginTop: "4px" }}>Overtrading alert triggers above this</p>
            </div>
            <div>
              <label style={{ color: "#7A9BB5", fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: "7px" }}>
                Max Risk % Per Trade
              </label>
              <input type="number" min={0.1} max={100} step={0.1} value={rules.max_risk_percent}
                onChange={(e) => setRules({ ...rules, max_risk_percent: parseFloat(e.target.value) || 1 })}
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "#2E86C1")}
                onBlur={(e) => (e.target.style.borderColor = "#1E3A5F")} />
              <p style={{ color: "#3A5A75", fontSize: "11px", marginTop: "4px" }}>For reference — used in future risk calc</p>
            </div>
          </div>

          <div>
            <label style={{ color: "#7A9BB5", fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: "7px" }}>
              Allowed Trading Session
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {SESSIONS.map((s) => (
                <button key={s.value} onClick={() => setRules({ ...rules, trading_session: s.value })}
                  style={{
                    padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 600,
                    border: "none", cursor: "pointer", transition: "all 0.15s",
                    background: rules.trading_session === s.value ? "#2E86C120" : "#1E3A5F",
                    color: rules.trading_session === s.value ? "#2E86C1" : "#7A9BB5",
                    outline: rules.trading_session === s.value ? "1px solid #2E86C1" : "none",
                  }}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {rules.trading_session === "any" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <div>
                <label style={{ color: "#7A9BB5", fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: "7px" }}>
                  Custom Session Start (UTC)
                </label>
                <input type="time" value={rules.session_start_utc}
                  onChange={(e) => setRules({ ...rules, session_start_utc: e.target.value })}
                  style={{ ...inputStyle, colorScheme: "dark" }}
                  onFocus={(e) => (e.target.style.borderColor = "#2E86C1")}
                  onBlur={(e) => (e.target.style.borderColor = "#1E3A5F")} />
              </div>
              <div>
                <label style={{ color: "#7A9BB5", fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: "7px" }}>
                  Custom Session End (UTC)
                </label>
                <input type="time" value={rules.session_end_utc}
                  onChange={(e) => setRules({ ...rules, session_end_utc: e.target.value })}
                  style={{ ...inputStyle, colorScheme: "dark" }}
                  onFocus={(e) => (e.target.style.borderColor = "#2E86C1")}
                  onBlur={(e) => (e.target.style.borderColor = "#1E3A5F")} />
              </div>
            </div>
          )}

          {/* Custom mistakes */}
          <div>
            <label style={{ color: "#7A9BB5", fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: "7px" }}>
              Custom Mistake Labels
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "10px" }}>
              {rules.custom_mistakes.map((m) => (
                <span key={m} style={{ display: "flex", alignItems: "center", gap: "6px", background: "#1E3A5F", color: "#CBD5E1", fontSize: "12px", padding: "4px 10px", borderRadius: "20px" }}>
                  {m}
                  <button onClick={() => removeMistake(m)} style={{ background: "none", border: "none", color: "#5A7A95", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}>
                    <Trash2 size={11} />
                  </button>
                </span>
              ))}
              {rules.custom_mistakes.length === 0 && (
                <span style={{ color: "#3A5A75", fontSize: "12px" }}>No custom mistakes added yet</span>
              )}
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <input value={newMistake} onChange={(e) => setNewMistake(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addMistake()}
                placeholder="e.g. Traded news event"
                style={{ ...inputStyle, flex: 1 }}
                onFocus={(e) => (e.target.style.borderColor = "#2E86C1")}
                onBlur={(e) => (e.target.style.borderColor = "#1E3A5F")} />
              <button onClick={addMistake}
                style={{ padding: "10px 16px", borderRadius: "8px", background: "#1E3A5F", border: "1px solid #2E5A8F", color: "white", fontSize: "13px", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                Add
              </button>
            </div>
          </div>

          <SaveButton onClick={saveRules} loading={rulesSaving} saved={rulesSaved} />
        </div>
      </div>

      {/* ── Subscription ─────────────────────────────────────────────── */}
      <div style={{ ...card, marginBottom: "16px" }}>
        <SectionHeader icon={Shield} color="#4ADE80" title="Subscription" subtitle="Your current plan and billing" />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px", borderRadius: "10px", background: "#0D1F30", border: "1px solid #1E3A5F" }}>
          <div>
            <p style={{ color: "white", fontWeight: 700, fontSize: "16px", margin: "0 0 4px" }}>
              {user?.plan === "pro" ? "Pro Plan" : "Free Plan"}
            </p>
            <p style={{ color: "#5A7A95", fontSize: "13px", margin: 0 }}>
              {user?.plan === "pro"
                ? "Unlimited trades · 5 accounts · All detections · Weekly reports"
                : "50 trades/month · 1 account · Basic analytics only"}
            </p>
          </div>
          {user?.plan !== "pro" && (
            <a href="/upgrade"
              style={{ padding: "10px 20px", borderRadius: "8px", background: "#2E86C1", color: "white", fontWeight: 600, fontSize: "13px", textDecoration: "none", whiteSpace: "nowrap", cursor: "pointer" }}>
              Upgrade to Pro →
            </a>
          )}
          {user?.plan === "pro" && (
            <button onClick={async () => {
              try {
                const { billingApi } = await import("@/lib/api");
                const res = await billingApi.createPortal();
                window.location.href = res.data.portal_url;
              } catch { alert("Could not open billing portal."); }
            }}
              style={{ padding: "10px 20px", borderRadius: "8px", background: "#1E3A5F", color: "#7A9BB5", fontWeight: 600, fontSize: "13px", border: "1px solid #2E5A8F", cursor: "pointer" }}>
              Manage Billing
            </button>
          )}
        </div>
        {user?.plan !== "pro" && (
          <div style={{ marginTop: "14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            {[
              "All 6 behavioural detections",
              "Private discipline score + history",
              "Weekly email improvement reports",
              "Up to 5 trading accounts",
              "Monthly in-app performance report",
              "Priority support",
            ].map((f) => (
              <div key={f} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Check size={13} color="#4ADE80" />
                <span style={{ color: "#7A9BB5", fontSize: "12px" }}>{f}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Trading Accounts ─────────────────────────────────────────── */}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#2E86C120", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Database size={16} color="#2E86C1" />
            </div>
            <div>
              <h3 style={{ color: "white", fontSize: "15px", fontWeight: 600, margin: 0 }}>Trading Accounts</h3>
              <p style={{ color: "#5A7A95", fontSize: "12px", margin: 0 }}>{accounts.length} of {maxAccounts} accounts used</p>
            </div>
          </div>
          {canAddAccount && (
            <button onClick={() => setShowNewAcc(!showNewAcc)}
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", borderRadius: "8px", background: "#1E3A5F", border: "1px solid #2E5A8F", color: "white", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
              <Plus size={14} /> Add Account
            </button>
          )}
        </div>

        {showNewAcc && (
          <div style={{ background: "#0D1F30", border: "1px solid #1E3A5F", borderRadius: "10px", padding: "16px", marginBottom: "14px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
              <div>
                <label style={{ color: "#7A9BB5", fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: "6px" }}>Account Name</label>
                <input value={newAccName} onChange={(e) => setNewAccName(e.target.value)} placeholder="e.g. Exness Live"
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = "#2E86C1")}
                  onBlur={(e) => (e.target.style.borderColor = "#1E3A5F")} />
              </div>
              <div>
                <label style={{ color: "#7A9BB5", fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: "6px" }}>Broker (optional)</label>
                <input value={newAccBroker} onChange={(e) => setNewAccBroker(e.target.value)} placeholder="e.g. Exness"
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = "#2E86C1")}
                  onBlur={(e) => (e.target.style.borderColor = "#1E3A5F")} />
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={createAccount} disabled={!newAccName || creatingAcc}
                style={{ padding: "9px 20px", borderRadius: "8px", background: newAccName ? "#2E86C1" : "#1A3A5C", color: "white", fontWeight: 600, fontSize: "13px", border: "none", cursor: newAccName ? "pointer" : "not-allowed" }}>
                {creatingAcc ? "Creating..." : "Create Account"}
              </button>
              <button onClick={() => setShowNewAcc(false)}
                style={{ padding: "9px 16px", borderRadius: "8px", background: "transparent", border: "1px solid #1E3A5F", color: "#7A9BB5", fontSize: "13px", cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {accounts.map((acc) => (
            <div key={acc.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderRadius: "8px", background: "#0D1F30", border: "1px solid #1E3A5F" }}>
              <div>
                <p style={{ color: "white", fontWeight: 600, fontSize: "14px", margin: "0 0 2px" }}>{acc.account_name}</p>
                <p style={{ color: "#5A7A95", fontSize: "12px", margin: 0 }}>{acc.broker || "No broker"} · {acc.currency}</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {acc.is_default && (
                  <span style={{ color: "#60A5FA", fontSize: "11px", background: "#1E3A5F", padding: "3px 10px", borderRadius: "10px", fontWeight: 600 }}>Default</span>
                )}
                {!acc.is_default && (
                  <button onClick={() => deleteAccount(acc.id)}
                    style={{ background: "none", border: "none", color: "#5A7A95", cursor: "pointer", padding: "4px", display: "flex", alignItems: "center" }}
                    title="Delete account">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}
          {accounts.length === 0 && (
            <p style={{ color: "#3A5A75", fontSize: "13px", textAlign: "center", padding: "20px 0" }}>No trading accounts yet.</p>
          )}
        </div>

        {!canAddAccount && user?.plan !== "pro" && (
          <p style={{ color: "#FBBF24", fontSize: "12px", marginTop: "12px" }}>
            ⚡ Upgrade to Pro to add up to 5 trading accounts.
          </p>
        )}
      </div>
    </div>
  );
}
