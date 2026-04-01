"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Bot,
  Layers,
  Brain,
  Calendar,
  ImageIcon,
  Settings,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandSwitcher } from "@/components/layout/BrandSwitcher";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { label: "Autopilot", icon: Bot, href: "/autopilot" },
  { label: "My Brands", icon: Layers, href: "/brands" },
  { label: "Brand Brain", icon: Brain, href: "/brand" },
  { label: "Calendar", icon: Calendar, href: "/calendar" },
  { label: "Media Library", icon: ImageIcon, href: "/media" },
  { label: "Settings", icon: Settings, href: "/settings" },
];

function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile hamburger button - fixed top left */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-50 lg:hidden rounded-lg bg-[#111] border border-[#1f1f1f] p-2"
      >
        <Menu className="h-5 w-5 text-[#f0b429]" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed left-0 top-0 z-50 flex h-screen w-60 flex-col border-r border-[#1f1f1f] bg-[#0f0f0f] transition-transform duration-200",
        "lg:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Mobile close button */}
        <button onClick={() => setMobileOpen(false)} className="absolute right-3 top-3 lg:hidden text-[#888] hover:text-white">
          <X className="h-5 w-5" />
        </button>

        {/* Logo */}
        <div className="flex flex-col px-6 py-6">
          <span className="text-xl font-bold text-[#f0b429]">GramGenius</span>
          <span className="text-sm text-[#888888]">AI Growth Engine</span>
        </div>

        {/* Brand Switcher */}
        <div className="px-3 pb-3">
          <BrandSwitcher />
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-2">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "relative flex items-center gap-3 rounded-lg px-3 py-3 lg:py-2.5 text-sm transition-colors",
                  isActive
                    ? "text-[#f0b429]"
                    : "text-[#888888] hover:text-white"
                )}
              >
                {/* Active indicator */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[#f0b429]" />
                )}
                <Icon className="h-5 w-5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Engine Status */}
        <div className="mt-auto border-t border-[#1f1f1f] px-4 py-3">
          <p className="text-[10px] uppercase tracking-wider text-[#888]">Engine Status</p>
          <p className="text-sm font-medium text-[#22c55e]">● Running</p>
          <p className="text-xs text-[#888]">Click Autopilot for details</p>
        </div>
      </aside>
    </>
  );
}

export { Sidebar };
