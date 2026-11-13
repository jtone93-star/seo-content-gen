import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-lg border border-line bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted/70 focus:border-gold/60",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
