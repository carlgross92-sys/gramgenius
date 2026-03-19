"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Brain,
  TrendingUp,
  PenSquare,
  Zap,
  Film,
  Calendar,
  BarChart3,
  Hash,
  Users,
  MessageCircle,
  Handshake,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { label: "Brand Brain", icon: Brain, href: "/brand" },
  { label: "Trend Research", icon: TrendingUp, href: "/ideas" },
  { label: "Create Post", icon: PenSquare, href: "/create" },
  { label: "Swarm Studio", icon: Zap, href: "/swarm", badge: "NEW" },
  { label: "Reel Studio", icon: Film, href: "/reels" },
  { label: "Calendar", icon: Calendar, href: "/calendar" },
  { label: "Analytics", icon: BarChart3, href: "/analytics" },
  { label: "Hashtags", icon: Hash, href: "/hashtags" },
  { label: "Competitors", icon: Users, href: "/competitors" },
  { label: "Engagement", icon: MessageCircle, href: "/engage" },
  { label: "Collabs", icon: Handshake, href: "/collabs" },
  { label: "Settings", icon: Settings, href: "/settings" },
];

function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-60 flex-col border-r border-[#1f1f1f] bg-[#0f0f0f]">
      {/* Logo */}
      <div className="flex flex-col px-6 py-6">
        <span className="text-xl font-bold text-[#f0b429]">GramGenius</span>
        <span className="text-sm text-[#888888]">AI Growth Engine</span>
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
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
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
              {"badge" in item && item.badge && (
                <span className="ml-auto rounded-full bg-[#f0b429] px-1.5 py-0.5 text-[10px] font-bold leading-none text-black">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export { Sidebar };
