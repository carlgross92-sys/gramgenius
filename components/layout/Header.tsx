import * as React from "react";
import { cn } from "@/lib/utils";

interface HeaderProps {
  title: string;
  brandActive?: boolean;
  className?: string;
}

function Header({ title, brandActive = false, className }: HeaderProps) {
  return (
    <header
      className={cn(
        "flex h-16 items-center justify-between border-b border-[#1f1f1f] bg-[#0a0a0a]/80 px-6 backdrop-blur",
        className
      )}
    >
      <h1 className="text-lg font-semibold text-white">{title}</h1>

      {brandActive && (
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#f0b429] shadow-[0_0_8px_rgba(240,180,41,0.4)]" />
          <span className="text-sm text-[#888888]">Brand Brain Active</span>
        </div>
      )}
    </header>
  );
}

export { Header };
export type { HeaderProps };
