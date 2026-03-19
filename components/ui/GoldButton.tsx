"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type GoldButtonVariant = "primary" | "secondary" | "danger";

interface GoldButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: GoldButtonVariant;
}

const GoldButton = React.forwardRef<HTMLButtonElement, GoldButtonProps>(
  ({ className, variant = "primary", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all duration-200 outline-none select-none disabled:pointer-events-none disabled:opacity-50",
          variant === "primary" &&
            "bg-[#f0b429] text-black hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgba(240,180,41,0.15)]",
          variant === "secondary" &&
            "border border-[#f0b429] bg-transparent text-[#f0b429] hover:scale-[1.02] hover:bg-[#f0b429]/10 active:scale-[0.98]",
          variant === "danger" &&
            "bg-[#ef4444] text-white hover:scale-[1.02] hover:bg-[#ef4444]/90 active:scale-[0.98]",
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

GoldButton.displayName = "GoldButton";

export { GoldButton };
export type { GoldButtonProps, GoldButtonVariant };
