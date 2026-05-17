"use client";
import { useUser } from "@clerk/nextjs";
import { Bell, Search } from "lucide-react";

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  const { user } = useUser();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = user?.firstName || "there";

  return (
    <header className="flex items-center justify-between px-8 py-4 sticky top-0 z-20"
      style={{ background: "#FFFFFF", borderBottom: "1px solid #E8E6E0" }}>
      <div>
        {subtitle ? (
          <>
            <p className="text-[10px] font-medium tracking-[0.1em] uppercase mb-0.5" style={{ color: "#9B9793" }}>{subtitle}</p>
            <h1 className="text-[16px] font-semibold" style={{ color: "#1A1A18" }}>{title}</h1>
          </>
        ) : (
          <h1 className="text-[16px] font-semibold" style={{ color: "#1A1A18" }}>
            {greeting}{firstName ? `, ${firstName}` : ""}
          </h1>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer"
          style={{ background: "#EDECEA", border: "1px solid #E0DDD5" }}>
          <Search size={12} style={{ color: "#9B9793" }} />
          <span className="text-[12px]" style={{ color: "#9B9793" }}>Search…</span>
          <kbd className="ml-6 text-[10px] px-1.5 py-0.5 rounded" style={{ background: "#E0DDD5", color: "#9B9793" }}>⌘K</kbd>
        </div>
        <button className="relative p-2 rounded-lg" style={{ border: "1px solid #E0DDD5" }}>
          <Bell size={13} style={{ color: "#9B9793" }} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full" style={{ background: "#2563EB" }} />
        </button>
      </div>
    </header>
  );
}
