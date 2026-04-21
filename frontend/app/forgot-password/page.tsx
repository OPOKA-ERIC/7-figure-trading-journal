"use client";

import { useState } from "react";
import Link from "next/link";
import { authApi } from "@/lib/api";
import { TrendingUp, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Something went wrong. Please try again.");
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

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "24px",
      background: "radial-gradient(ellipse at 50% 0%, #1A3A5C 0%, #0D2137 65%)",
    }}>

      {/* Brand */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "32px" }}>
        <div style={{
          width: "48px", height: "48px", borderRadius: "12px",
          background: "#2E86C1", display: "flex", alignItems: "center",
          justifyContent: "center", marginBottom: "14px",
          boxShadow: "0 8px 24px rgba(46,134,193,0.35)",
        }}>
          <TrendingUp size={24} color="white" />
        </div>
        <h1 style={{ color: "white", fontSize: "22px", fontWeight: 700, margin: 0, letterSpacing: "-0.3px" }}>
          7 Figure Trading Journal
        </h1>
        <p style={{ color: "#5A7A95", fontSize: "13px", marginTop: "6px" }}>
          Smart Performance & Psychology Intelligence
        </p>
      </div>

      {/* Card */}
      <div style={{
        width: "100%", maxWidth: "400px",
        background: "#132236", border: "1px solid #1E3A5F",
        borderRadius: "16px", padding: "32px",
        boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
      }}>

        {submitted ? (
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: "56px", height: "56px", borderRadius: "50%",
              background: "#0D2A4A", border: "1px solid #1E5A8F",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px",
            }}>
              <Mail size={26} color="#2E86C1" />
            </div>
            <h2 style={{ color: "white", fontSize: "18px", fontWeight: 700, margin: "0 0 8px" }}>
              Check your email
            </h2>
            <p style={{ color: "#5A7A95", fontSize: "13px", lineHeight: 1.6, margin: "0 0 8px" }}>
              If an account exists for
            </p>
            <p style={{ color: "#E8F4FD", fontSize: "14px", fontWeight: 600, margin: "0 0 12px" }}>
              {email}
            </p>
            <p style={{ color: "#5A7A95", fontSize: "13px", lineHeight: 1.6, margin: "0 0 28px" }}>
              you'll receive a password reset link shortly. The link expires in 1 hour.
            </p>
            <Link href="/login" style={{
              display: "block", padding: "12px", borderRadius: "8px",
              background: "#2E86C1", color: "white", fontWeight: 600,
              fontSize: "14px", textDecoration: "none", textAlign: "center",
            }}>
              Back to Sign In
            </Link>
            <p style={{ color: "#5A7A95", fontSize: "12px", marginTop: "14px" }}>
              Didn't receive it? Check your spam folder.
            </p>
          </div>
        ) : (
          <>
            <h2 style={{ color: "white", fontSize: "18px", fontWeight: 700, margin: "0 0 4px" }}>
              Forgot your password?
            </h2>
            <p style={{ color: "#5A7A95", fontSize: "13px", marginTop: 0, marginBottom: "24px" }}>
              Enter your email and we'll send you a reset link
            </p>

            {error && (
              <div style={{
                marginBottom: "20px", padding: "12px 14px", borderRadius: "8px",
                background: "#2D0F0F", border: "1px solid #7B2020",
                color: "#FCA5A5", fontSize: "13px", display: "flex", alignItems: "center", gap: "8px",
              }}>
                <span>⚠</span> {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", color: "#7A9BB5", fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "7px" }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = "#2E86C1")}
                  onBlur={(e) => (e.target.style.borderColor = "#1E3A5F")}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%", padding: "12px", borderRadius: "8px",
                  background: loading ? "#1A5276" : "#2E86C1",
                  color: "white", fontWeight: 600, fontSize: "14px",
                  border: "none", cursor: loading ? "not-allowed" : "pointer",
                  transition: "background 0.2s", opacity: loading ? 0.8 : 1,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                }}
              >
                {loading ? (
                  <>
                    <svg style={{ animation: "spin 1s linear infinite", width: "16px", height: "16px" }} viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    Sending...
                  </>
                ) : "Send Reset Link"}
              </button>
            </form>

            <div style={{ borderTop: "1px solid #1E3A5F", marginTop: "24px", paddingTop: "20px", textAlign: "center" }}>
              <p style={{ color: "#5A7A95", fontSize: "13px", margin: 0 }}>
                Remember your password?{" "}
                <Link href="/login" style={{ color: "#2E86C1", fontWeight: 600, textDecoration: "none" }}>
                  Sign in
                </Link>
              </p>
            </div>
          </>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      <p style={{ color: "#2A4A6B", fontSize: "12px", marginTop: "32px" }}>
        © 2026 7 Figure Trading Journal
      </p>
    </div>
  );
}
