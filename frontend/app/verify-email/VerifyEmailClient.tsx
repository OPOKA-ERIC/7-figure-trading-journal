"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { authApi } from "@/lib/api";
import { TrendingUp, CheckCircle, XCircle, Loader } from "lucide-react";

export default function VerifyEmailClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No verification token found. Please check your email link.");
      return;
    }
    authApi.verifyEmail(token)
      .then(() => setStatus("success"))
      .catch((err) => {
        setStatus("error");
        setMessage(err.response?.data?.detail || "This verification link is invalid or has already been used.");
      });
  }, [token]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", background: "radial-gradient(ellipse at 50% 0%, #1A3A5C 0%, #0D2137 65%)" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "32px" }}>
        <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "#2E86C1", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "14px", boxShadow: "0 8px 24px rgba(46,134,193,0.35)" }}>
          <TrendingUp size={24} color="white" />
        </div>
        <h1 style={{ color: "white", fontSize: "22px", fontWeight: 700, margin: 0 }}>7 Figure Trading Journal</h1>
      </div>

      <div style={{ width: "100%", maxWidth: "400px", background: "#132236", border: "1px solid #1E3A5F", borderRadius: "16px", padding: "40px 32px", boxShadow: "0 24px 64px rgba(0,0,0,0.5)", textAlign: "center" }}>
        {status === "loading" && (
          <>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
              <Loader size={40} color="#2E86C1" style={{ animation: "spin 1s linear infinite" }} />
            </div>
            <h2 style={{ color: "white", fontSize: "18px", fontWeight: 700, margin: "0 0 8px" }}>Verifying your email...</h2>
            <p style={{ color: "#5A7A95", fontSize: "13px", margin: 0 }}>Just a moment</p>
          </>
        )}

        {status === "success" && (
          <>
            <div style={{ width: "60px", height: "60px", borderRadius: "50%", background: "#0D3320", border: "1px solid #1E6B3A", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <CheckCircle size={30} color="#4ADE80" />
            </div>
            <h2 style={{ color: "white", fontSize: "18px", fontWeight: 700, margin: "0 0 8px" }}>Email verified!</h2>
            <p style={{ color: "#5A7A95", fontSize: "13px", lineHeight: 1.6, margin: "0 0 28px" }}>Your account is now active. Sign in to start your trading improvement journey.</p>
            <Link href="/login" style={{ display: "block", padding: "12px", borderRadius: "8px", background: "#2E86C1", color: "white", fontWeight: 600, fontSize: "14px", textDecoration: "none" }}>
              Sign In to Your Account
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <div style={{ width: "60px", height: "60px", borderRadius: "50%", background: "#2D0F0F", border: "1px solid #7B2020", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <XCircle size={30} color="#F87171" />
            </div>
            <h2 style={{ color: "white", fontSize: "18px", fontWeight: 700, margin: "0 0 8px" }}>Verification failed</h2>
            <p style={{ color: "#5A7A95", fontSize: "13px", lineHeight: 1.6, margin: "0 0 28px" }}>{message}</p>
            <Link href="/register" style={{ display: "block", padding: "12px", borderRadius: "8px", background: "#2E86C1", color: "white", fontWeight: 600, fontSize: "14px", textDecoration: "none", marginBottom: "12px" }}>
              Create a New Account
            </Link>
            <Link href="/login" style={{ color: "#5A7A95", fontSize: "13px", textDecoration: "none" }}>Back to Sign In</Link>
          </>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <p style={{ color: "#2A4A6B", fontSize: "12px", marginTop: "32px" }}>© 2026 7 Figure Trading Journal</p>
    </div>
  );
}
