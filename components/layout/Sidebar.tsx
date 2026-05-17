"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClerk, useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { LayoutDashboard, Megaphone, Settings, LogOut, Building2, Plug } from "lucide-react";
import Image from "next/image";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/campaigns", label: "Campaigns",  icon: Megaphone },
  { href: "/settings",  label: "Settings",   icon: Settings },
];

export default function Sidebar() {
  const pathname    = usePathname();
  const { signOut } = useClerk();
  const { user }    = useUser();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    fetch("/api/workspace").then(r => r.json()).then(({ workspace: ws }) => {
      if (ws?.subdomain) setConnected(true);
    }).catch(() => {});
  }, []);

  const companyName =
    user?.organizationMemberships?.[0]?.organization?.name ??
    user?.fullName ??
    user?.emailAddresses?.[0]?.emailAddress?.split("@")[1]?.split(".")[0] ??
    "My Company";

  const initials = (user?.firstName?.[0] ?? user?.emailAddresses[0]?.emailAddress?.[0] ?? "U").toUpperCase();

  return (
    <aside className="flex flex-col w-56 min-h-screen shrink-0"
      style={{ background: "#FFFFFF", borderRight: "1px solid #E8E6E0" }}>

      {/* Logo */}
      <div className="px-5 py-4" style={{ borderBottom: "1px solid #E8E6E0" }}>
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image src="/logo-icon.svg" alt="CampaignWise" width={28} height={28} />
          <span className="text-[14px] font-semibold" style={{ color: "#1A1A18" }}>
            Campaign<span style={{ color: "#2563EB" }}>Wise</span>
          </span>
        </Link>
      </div>

      {/* Workspace */}
      <div className="px-3 py-3 space-y-1.5" style={{ borderBottom: "1px solid #E8E6E0" }}>
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: "#F7F6F3" }}>
          <Building2 size={12} style={{ color: "#9B9B9B" }} />
          <span className="text-[12px] font-medium truncate" style={{ color: "#6B6B6B" }}>{companyName}</span>
        </div>
        {connected ? (
          <div className="flex items-center gap-2 px-2 py-1">
            <span className="w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0" style={{ background: "#16A34A" }} />
            <span className="text-[11px] font-medium" style={{ color: "#16A34A" }}>SFMC connected</span>
          </div>
        ) : (
          <Link href="/settings" className="flex items-center gap-2 px-2 py-1 rounded transition-colors"
            style={{ color: "#2563EB" }}>
            <Plug size={11} />
            <span className="text-[11px] font-medium">Connect a platform</span>
          </Link>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));
          return (
            <Link key={href} href={href}
              className="flex items-center gap-2.5 px-3 rounded-lg text-[13px] font-medium transition-all duration-100"
              style={{
                height: "40px",
                background: active ? "#EFF6FF" : "transparent",
                color: active ? "#2563EB" : "#6B6B6B",
                borderLeft: active ? "3px solid #2563EB" : "3px solid transparent",
              }}>
              <Icon size={15} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-3 pb-4 pt-3 space-y-1" style={{ borderTop: "1px solid #E8E6E0" }}>
        <button onClick={() => signOut({ redirectUrl: "/sign-in" })}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium transition-colors duration-100"
          style={{ color: "#9B9793" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#B91C1C"; (e.currentTarget as HTMLElement).style.background = "#FEF2F2"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#9B9793"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
          <LogOut size={12} /> Sign out
        </button>
        {user && (
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg" style={{ background: "#F7F6F3" }}>
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
              style={{ background: "#2563EB" }}>{initials}</div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium truncate" style={{ color: "#1A1A18" }}>
                {user.fullName ?? user.emailAddresses[0]?.emailAddress?.split("@")[0]}
              </p>
              <p className="text-[10px] truncate" style={{ color: "#9B9793" }}>
                {user.emailAddresses[0]?.emailAddress}
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
