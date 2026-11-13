import { cn } from "@/lib/utils";
import { TextareaHTMLAttributes, forwardRef } from "react";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "w-full rounded-lg border border-line bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted/70 focus:border-gold/60",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
