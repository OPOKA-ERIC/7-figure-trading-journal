import Link from "next/link";
import { TrendingUp, Brain, Shield, AlertTriangle, BarChart3, Upload, Check, ArrowRight } from "lucide-react";

const FEATURES = [
  {
    icon: Upload,
    color: "#2E86C1",
    title: "MT5 Import in Seconds",
    desc: "Export your Account History from MetaTrader 5 and upload it. Trades are parsed, deduplicated, and stored instantly.",
  },
  {
    icon: Brain,
    color: "#C084FC",
    title: "Psychology Logging",
    desc: "Tag every trade with your emotion, whether you followed your plan, and what mistake you made. Build the data that reveals your patterns.",
  },
  {
    icon: AlertTriangle,
    color: "#F97316",
    title: "Behavioural Detection",
    desc: "The system automatically detects revenge trading, overtrading, risk spikes, and emotional spirals — from your actual trade data.",
  },
  {
    icon: Shield,
    color: "#4ADE80",
    title: "Private Discipline Score",
    desc: "A personal 0–100 score measuring your process quality — not your P&L. A mirror, not a trophy. Recalculated every week.",
  },
  {
    icon: BarChart3,
    color: "#FBBF24",
    title: "Deep Analytics",
    desc: "Win rate, profit factor, equity curve, performance by symbol, session, day of week, and hour. Every angle covered.",
  },
  {
    icon: TrendingUp,
    color: "#60A5FA",
    title: "Weekly Improvement Reports",
    desc: "Every Sunday, get a personalised email with your week's P&L, discipline score, top behavioural flag, and one actionable tip.",
  },
];

const DETECTIONS = [
  { type: "Revenge Trade", desc: "Trade opened within 15 min of a loss with 1.5× larger lot size", color: "#F97316" },
  { type: "Overtrading", desc: "Daily trade count exceeds your configured limit", color: "#FBBF24" },
  { type: "Risk Spike", desc: "Lot size is 1.75× your rolling 10-trade average", color: "#F87171" },
  { type: "Emotional Spiral", desc: "3+ consecutive trades in negative emotional states", color: "#C084FC" },
  { type: "Plan Abandonment", desc: "Broke your rules in 3+ of your last 5 tagged trades", color: "#60A5FA" },
  { type: "Loss Rate Decay", desc: "Win rate drops below 35% in the 5 trades after a loss streak", color: "#F97316" },
];

const STEPS = [
  { n: "01", title: "Export from MT5", desc: "Go to Account History in MetaTrader 5, right-click, Save as HTML. Takes 10 seconds." },
  { n: "02", title: "Upload & Import", desc: "Drop the file into the platform. Trades are parsed and stored. Duplicates are skipped automatically." },
  { n: "03", title: "Tag Your Trades", desc: "Click each trade and log your emotion, whether you followed your plan, and any mistakes." },
  { n: "04", title: "Read Your Insights", desc: "The system surfaces your patterns, scores your discipline, and tells you exactly what to fix." },
];

export default function LandingPage() {
  return (
    <div style={{ background: "#0D2137", minHeight: "100vh", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>

      {/* Nav */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 40px", borderBottom: "1px solid #1E3A5F", position: "sticky", top: 0, background: "#0D2137", zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "34px", height: "34px", borderRadius: "8px", background: "#2E86C1", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <TrendingUp size={18} color="white" />
          </div>
          <span style={{ color: "white", fontWeight: 700, fontSize: "16px" }}>7 Figure Trading Journal</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Link href="/login" style={{ color: "#7A9BB5", fontSize: "14px", textDecoration: "none", fontWeight: 500 }}>Sign in</Link>
          <Link href="/register" style={{ padding: "9px 20px", borderRadius: "8px", background: "#2E86C1", color: "white", fontSize: "14px", fontWeight: 600, textDecoration: "none" }}>
            Get Started Free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ textAlign: "center", padding: "100px 24px 80px", maxWidth: "800px", margin: "0 auto" }}>
        <div style={{ display: "inline-block", background: "#1E3A5F", border: "1px solid #2E5A8F", color: "#60A5FA", fontSize: "12px", fontWeight: 600, padding: "5px 14px", borderRadius: "20px", marginBottom: "24px", letterSpacing: "0.05em" }}>
          BUILT FOR MT5 TRADERS IN AFRICA & GLOBALLY
        </div>
        <h1 style={{ color: "white", fontSize: "52px", fontWeight: 800, lineHeight: 1.1, margin: "0 0 20px", letterSpacing: "-1px" }}>
          Most journals show you{" "}
          <span style={{ color: "#2E86C1" }}>what happened.</span>
          <br />We show you{" "}
          <span style={{ color: "#4ADE80" }}>why.</span>
        </h1>
        <p style={{ color: "#7A9BB5", fontSize: "18px", lineHeight: 1.7, margin: "0 0 40px", maxWidth: "600px", marginLeft: "auto", marginRight: "auto" }}>
          The 7 Figure Trading Journal connects your trade history to your emotional state and automatically detects the behavioural patterns that are costing you money.
        </p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "14px", flexWrap: "wrap" }}>
          <Link href="/register" style={{ display: "flex", alignItems: "center", gap: "8px", padding: "14px 28px", borderRadius: "10px", background: "#2E86C1", color: "white", fontSize: "16px", fontWeight: 700, textDecoration: "none" }}>
            Start Free — No Card Required <ArrowRight size={18} />
          </Link>
          <Link href="/login" style={{ padding: "14px 28px", borderRadius: "10px", border: "1px solid #1E3A5F", color: "#CBD5E1", fontSize: "15px", fontWeight: 600, textDecoration: "none" }}>
            Sign In
          </Link>
        </div>
        <p style={{ color: "#3A5A75", fontSize: "13px", marginTop: "16px" }}>Free forever · No credit card · Pro trial available</p>
      </section>

      {/* How it works */}
      <section style={{ padding: "80px 40px", maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "56px" }}>
          <h2 style={{ color: "white", fontSize: "32px", fontWeight: 800, margin: "0 0 12px" }}>How it works</h2>
          <p style={{ color: "#7A9BB5", fontSize: "16px", margin: 0 }}>Four steps from MT5 export to actionable insight</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px" }}>
          {STEPS.map((s) => (
            <div key={s.n} style={{ background: "#132236", border: "1px solid #1E3A5F", borderRadius: "14px", padding: "24px" }}>
              <div style={{ color: "#2E86C1", fontSize: "28px", fontWeight: 800, marginBottom: "12px", lineHeight: 1 }}>{s.n}</div>
              <h3 style={{ color: "white", fontSize: "15px", fontWeight: 700, margin: "0 0 8px" }}>{s.title}</h3>
              <p style={{ color: "#7A9BB5", fontSize: "13px", lineHeight: 1.6, margin: 0 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: "80px 40px", maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "56px" }}>
          <h2 style={{ color: "white", fontSize: "32px", fontWeight: 800, margin: "0 0 12px" }}>Everything you need to improve</h2>
          <p style={{ color: "#7A9BB5", fontSize: "16px", margin: 0 }}>Three products in one platform</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
          {FEATURES.map((f) => (
            <div key={f.title} style={{ background: "#132236", border: "1px solid #1E3A5F", borderRadius: "14px", padding: "24px" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: f.color + "20", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
                <f.icon size={20} color={f.color} />
              </div>
              <h3 style={{ color: "white", fontSize: "15px", fontWeight: 700, margin: "0 0 8px" }}>{f.title}</h3>
              <p style={{ color: "#7A9BB5", fontSize: "13px", lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Detections */}
      <section style={{ padding: "80px 40px", maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "56px" }}>
          <h2 style={{ color: "white", fontSize: "32px", fontWeight: 800, margin: "0 0 12px" }}>Behavioural Detection Engine</h2>
          <p style={{ color: "#7A9BB5", fontSize: "16px", margin: 0, maxWidth: "560px", marginLeft: "auto", marginRight: "auto" }}>
            You can't trick yourself out of bad habits if you can't see them. We detect them automatically from your trade data.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px" }}>
          {DETECTIONS.map((d) => (
            <div key={d.type} style={{ background: "#132236", border: `1px solid ${d.color}30`, borderRadius: "12px", padding: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <AlertTriangle size={14} color={d.color} />
                <span style={{ color: d.color, fontSize: "13px", fontWeight: 700 }}>{d.type}</span>
              </div>
              <p style={{ color: "#7A9BB5", fontSize: "12px", lineHeight: 1.5, margin: 0 }}>{d.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section style={{ padding: "80px 40px", maxWidth: "760px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "56px" }}>
          <h2 style={{ color: "white", fontSize: "32px", fontWeight: 800, margin: "0 0 12px" }}>Simple pricing</h2>
          <p style={{ color: "#7A9BB5", fontSize: "16px", margin: 0 }}>Start free. Upgrade when you're ready.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {/* Free */}
          <div style={{ background: "#132236", border: "1px solid #1E3A5F", borderRadius: "16px", padding: "32px" }}>
            <p style={{ color: "#7A9BB5", fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>Free</p>
            <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginBottom: "24px" }}>
              <span style={{ color: "white", fontSize: "40px", fontWeight: 800 }}>$0</span>
              <span style={{ color: "#5A7A95", fontSize: "14px" }}>/month</span>
            </div>
            {["50 trades/month", "1 trading account", "Basic analytics", "Emotion & mistake logging"].map((f) => (
              <div key={f} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                <Check size={14} color="#5A7A95" />
                <span style={{ color: "#7A9BB5", fontSize: "13px" }}>{f}</span>
              </div>
            ))}
            <Link href="/register" style={{ display: "block", textAlign: "center", marginTop: "24px", padding: "12px", borderRadius: "8px", background: "#1E3A5F", color: "#CBD5E1", fontWeight: 600, fontSize: "14px", textDecoration: "none" }}>
              Get Started Free
            </Link>
          </div>

          {/* Pro */}
          <div style={{ background: "#0D2137", border: "2px solid #2E86C1", borderRadius: "16px", padding: "32px", position: "relative" }}>
            <div style={{ position: "absolute", top: "-12px", left: "50%", transform: "translateX(-50%)", background: "#2E86C1", color: "white", fontSize: "11px", fontWeight: 700, padding: "4px 14px", borderRadius: "20px", whiteSpace: "nowrap" }}>
              MOST POPULAR
            </div>
            <p style={{ color: "#2E86C1", fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>Pro</p>
            <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginBottom: "4px" }}>
              <span style={{ color: "white", fontSize: "40px", fontWeight: 800 }}>$25</span>
              <span style={{ color: "#5A7A95", fontSize: "14px" }}>/month</span>
            </div>
            <p style={{ color: "#5A7A95", fontSize: "12px", margin: "0 0 20px" }}>or $200/year — save $100</p>
            {["Unlimited trades", "5 trading accounts", "All 6 behavioural detections", "Discipline score + history", "Weekly email reports", "Priority support"].map((f) => (
              <div key={f} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                <Check size={14} color="#4ADE80" />
                <span style={{ color: "#CBD5E1", fontSize: "13px" }}>{f}</span>
              </div>
            ))}
            <Link href="/upgrade" style={{ display: "block", textAlign: "center", marginTop: "24px", padding: "12px", borderRadius: "8px", background: "#2E86C1", color: "white", fontWeight: 700, fontSize: "14px", textDecoration: "none" }}>
              Start 7-Day Free Trial
            </Link>
            <p style={{ color: "#3A5A75", fontSize: "11px", textAlign: "center", marginTop: "8px" }}>No credit card required</p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ padding: "80px 40px", textAlign: "center", borderTop: "1px solid #1E3A5F" }}>
        <h2 style={{ color: "white", fontSize: "32px", fontWeight: 800, margin: "0 0 16px" }}>
          Ready to stop guessing why you lose?
        </h2>
        <p style={{ color: "#7A9BB5", fontSize: "16px", margin: "0 0 32px" }}>
          Join traders who are using data to fix their behaviour — not just track their P&L.
        </p>
        <Link href="/register" style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "14px 32px", borderRadius: "10px", background: "#2E86C1", color: "white", fontSize: "16px", fontWeight: 700, textDecoration: "none" }}>
          Create Free Account <ArrowRight size={18} />
        </Link>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid #1E3A5F", padding: "24px 40px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ color: "#2A4A6B", fontSize: "13px" }}>© 2026 7 Figure Trading Journal</span>
        <div style={{ display: "flex", gap: "20px" }}>
          <Link href="/login" style={{ color: "#3A5A75", fontSize: "13px", textDecoration: "none" }}>Sign In</Link>
          <Link href="/register" style={{ color: "#3A5A75", fontSize: "13px", textDecoration: "none" }}>Register</Link>
          <Link href="/upgrade" style={{ color: "#3A5A75", fontSize: "13px", textDecoration: "none" }}>Pricing</Link>
        </div>
      </footer>
    </div>
  );
}
