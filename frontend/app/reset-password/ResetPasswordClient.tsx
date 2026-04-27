"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { authApi } from "@/lib/api";
import { TrendingUp, Eye, EyeOff, CheckCircle } from "lucide-react";

export default function ResetPasswordClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const passwordsMatch = password && confirm && password === confirm;
  const passwordLongEnough = password.length >= 8;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) { setError("No reset token found. Please request a new reset link."); return; }
    if (!passwordsMatch) { setError("Passwords do not match."); return; }
    if (!passwordLongEnough) { setError("Password must be at least 8 characters."); return; }
    setError("");
    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => router.push("/login"), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Reset failed. The link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%", padding: "11px 14px", borderRadius: "8px",
    background: "#0D2137", border: "1px solid #1E3A5F",
    color: "white", fontSize: "14px", outline: "none",
    boxSizing: "border-box" as const, transition: "border-color 0.15s",
  };

  if (!token) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", background: "radial-gradient(ellipse at 50% 0%, #1A3A5C 0%, #0D2137 65%)" }}>
        <div style={{ width: "100%", maxWidth: "400px", background: "#132236", border: "1px solid #1E3A5F", borderRadius: "16px", padding: "32px", textAlign: "center" }}>
          <h2 style={{ color: "white", fontSize: "18px", fontWeight: 700, margin: "0 0 12px" }}>Invalid reset link</h2>
          <p style={{ color: "#5A7A95", fontSize: "13px", margin: "0 0 24px" }}>This link is missing a reset token. Please request a new one.</p>
          <Link href="/forgot-password" style={{ display: "block", padding: "12px", borderRadius: "8px", background: "#2E86C1", color: "white", fontWeight: 600, fontSize: "14px", textDecoration: "none" }}>
            Request New Reset Link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", background: "radial-gradient(ellipse at 50% 0%, #1A3A5C 0%, #0D2137 65%)" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "32px" }}>
        <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "#2E86C1", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "14px", boxShadow: "0 8px 24px rgba(46,134,193,0.35)" }}>
          <TrendingUp size={24} color="white" />
        </div>
        <h1 style={{ color: "white", fontSize: "22px", fontWeight: 700, margin: 0 }}>7 Figure Trading Journal</h1>
        <p style={{ color: "#5A7A95", fontSize: "13px", marginTop: "6px" }}>Smart Performance & Psychology Intelligence</p>
      </div>

      <div style={{ width: "100%", maxWidth: "400px", background: "#132236", border: "1px solid #1E3A5F", borderRadius: "16px", padding: "32px", boxShadow: "0 24px 64px rgba(0,0,0,0.5)" }}>
        {success ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ width: "60px", height: "60px", borderRadius: "50%", background: "#0D3320", border: "1px solid #1E6B3A", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <CheckCircle size={30} color="#4ADE80" />
            </div>
            <h2 style={{ color: "white", fontSize: "18px", fontWeight: 700, margin: "0 0 8px" }}>Password reset!</h2>
            <p style={{ color: "#5A7A95", fontSize: "13px", lineHeight: 1.6, margin: "0 0 24px" }}>Your password has been updated. Redirecting you to sign in...</p>
            <Link href="/login" style={{ display: "block", padding: "12px", borderRadius: "8px", background: "#2E86C1", color: "white", fontWeight: 600, fontSize: "14px", textDecoration: "none" }}>
              Sign In Now
            </Link>
          </div>
        ) : (
          <>
            <h2 style={{ color: "white", fontSize: "18px", fontWeight: 700, margin: "0 0 4px" }}>Set new password</h2>
            <p style={{ color: "#5A7A95", fontSize: "13px", marginTop: 0, marginBottom: "24px" }}>Choose a strong password for your account</p>

            {error && (
              <div style={{ marginBottom: "20px", padding: "12px 14px", borderRadius: "8px", background: "#2D0F0F", border: "1px solid #7B2020", color: "#FCA5A5", fontSize: "13px", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>⚠</span> {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", color: "#7A9BB5", fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "7px" }}>New Password</label>
                <div style={{ position: "relative" }}>
                  <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} placeholder="Min 8 characters"
                    style={{ ...inputStyle, paddingRight: "42px" }}
                    onFocus={(e) => (e.target.style.borderColor = "#2E86C1")} onBlur={(e) => (e.target.style.borderColor = "#1E3A5F")} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#5A7A95", cursor: "pointer", display: "flex", alignItems: "center", padding: "4px" }}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {password && <p style={{ color: passwordLongEnough ? "#4ADE80" : "#F87171", fontSize: "11px", marginTop: "4px" }}>{passwordLongEnough ? "✓ Good length" : "✗ At least 8 characters required"}</p>}
              </div>

              <div style={{ marginBottom: "24px" }}>
                <label style={{ display: "block", color: "#7A9BB5", fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "7px" }}>Confirm Password</label>
                <div style={{ position: "relative" }}>
                  <input type={showConfirm ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} required placeholder="Repeat your password"
                    style={{ ...inputStyle, paddingRight: "42px" }}
                    onFocus={(e) => (e.target.style.borderColor = "#2E86C1")} onBlur={(e) => (e.target.style.borderColor = "#1E3A5F")} />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#5A7A95", cursor: "pointer", display: "flex", alignItems: "center", padding: "4px" }}>
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {confirm && <p style={{ color: passwordsMatch ? "#4ADE80" : "#F87171", fontSize: "11px", marginTop: "4px" }}>{passwordsMatch ? "✓ Passwords match" : "✗ Passwords do not match"}</p>}
              </div>

              <button type="submit" disabled={loading || !passwordsMatch || !passwordLongEnough}
                style={{ width: "100%", padding: "12px", borderRadius: "8px", background: loading ? "#1A5276" : (passwordsMatch && passwordLongEnough) ? "#2E86C1" : "#1A3A5C", color: "white", fontWeight: 600, fontSize: "14px", border: "none", cursor: (loading || !passwordsMatch || !passwordLongEnough) ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                {loading ? (<><svg style={{ animation: "spin 1s linear infinite", width: "16px", height: "16px" }} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" /><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>Resetting...</>) : "Reset Password"}
              </button>
            </form>

            <div style={{ borderTop: "1px solid #1E3A5F", marginTop: "24px", paddingTop: "20px", textAlign: "center" }}>
              <p style={{ color: "#5A7A95", fontSize: "13px", margin: 0 }}>
                Link expired?{" "}
                <Link href="/forgot-password" style={{ color: "#2E86C1", fontWeight: 600, textDecoration: "none" }}>Request a new one</Link>
              </p>
            </div>
          </>
        )}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <p style={{ color: "#2A4A6B", fontSize: "12px", marginTop: "32px" }}>© 2026 7 Figure Trading Journal</p>
    </div>
  );
}
