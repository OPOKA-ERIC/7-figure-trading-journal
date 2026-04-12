"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import {
  LayoutDashboard, TrendingUp, Brain,
  BarChart3, AlertTriangle, Settings,
  LogOut, ChevronRight, Menu, X
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/trades", label: "Trades", icon: TrendingUp },
  { href: "/dashboard/psychology", label: "Psychology", icon: Brain },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/alerts", label: "Alerts", icon: AlertTriangle },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0D2137" }}>
        <div style={{ color: "#2E86C1", fontSize: "16px" }}>Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const Sidebar = () => (
    <div style={{
      width: "240px", minHeight: "100vh", background: "#0A1929",
      borderRight: "1px solid #1E3A5F", display: "flex", flexDirection: "column",
      position: "fixed", top: 0, left: 0, zIndex: 50
    }}>
      {/* Logo */}
      <div style={{ padding: "24px 20px", borderBottom: "1px solid #1E3A5F" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#2E86C1", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <TrendingUp size={18} color="white" />
          </div>
          <div>
            <div style={{ color: "white", fontWeight: 700, fontSize: "14px", lineHeight: 1.2 }}>7 Figure</div>
            <div style={{ color: "#2E86C1", fontSize: "11px", fontWeight: 500 }}>Trading Journal</div>
          </div>
        </div>
      </div>

      {/* User */}
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #1E3A5F" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#1A5276", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: "14px", flexShrink: 0 }}>
            {user.display_name[0].toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: "white", fontSize: "13px", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user.display_name}
            </div>
            <div style={{ display: "inline-block", background: user.plan === "pro" ? "#1E4D2B" : "#1A3A5C", color: user.plan === "pro" ? "#4ADE80" : "#60A5FA", fontSize: "10px", fontWeight: 600, padding: "1px 8px", borderRadius: "10px", marginTop: "2px" }}>
              {user.plan.toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 12px" }}>
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link key={href} href={href} onClick={() => setMobileOpen(false)}
              style={{
                display: "flex", alignItems: "center", gap: "10px",
                padding: "10px 12px", borderRadius: "8px", marginBottom: "2px",
                textDecoration: "none", transition: "all 0.15s",
                background: active ? "#2E86C1" : "transparent",
                color: active ? "white" : "#7A9BB5",
                fontWeight: active ? 600 : 400, fontSize: "14px",
              }}
              onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "#1E3A5F"; }}
              onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <Icon size={17} />
              <span style={{ flex: 1 }}>{label}</span>
              {active && <ChevronRight size={14} />}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div style={{ padding: "12px", borderTop: "1px solid #1E3A5F" }}>
        <button onClick={handleLogout}
          style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%", padding: "10px 12px", borderRadius: "8px", border: "none", background: "transparent", color: "#7A9BB5", fontSize: "14px", cursor: "pointer", transition: "all 0.15s" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#1E3A5F"; (e.currentTarget as HTMLElement).style.color = "white"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#7A9BB5"; }}
        >
          <LogOut size={17} />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0D2137" }}>
      {/* Desktop sidebar */}
      <div style={{ display: "block" }} className="hidden-mobile">
        <Sidebar />
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(0,0,0,0.6)" }}
          onClick={() => setMobileOpen(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main */}
      <div style={{ flex: 1, marginLeft: "240px", minWidth: 0 }}>
        {/* Mobile header */}
        <div style={{ display: "none", padding: "16px", borderBottom: "1px solid #1E3A5F", alignItems: "center", gap: "12px" }} className="mobile-header">
          <button onClick={() => setMobileOpen(true)} style={{ background: "none", border: "none", color: "white", cursor: "pointer" }}>
            <Menu size={22} />
          </button>
          <span style={{ color: "white", fontWeight: 600 }}>7 Figure Journal</span>
        </div>

        <div style={{ overflowY: "auto", minHeight: "100vh" }}>
          {children}
        </div>
      </div>
    </div>
  );
}