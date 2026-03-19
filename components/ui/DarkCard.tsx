import * as React from "react";
import { cn } from "@/lib/utils";

interface DarkCardProps extends React.HTMLAttributes<HTMLDivElement> {
  glow?: boolean;
}

const DarkCard = React.forwardRef<HTMLDivElement, DarkCardProps>(
  ({ className, glow = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-xl border border-[#1f1f1f] bg-[#111111] p-6",
          glow && "shadow-[0_0_20px_rgba(240,180,41,0.15)]",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

DarkCard.displayName = "DarkCard";

export { DarkCard };
export type { DarkCardProps };
