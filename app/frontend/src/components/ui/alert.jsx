import React from "react";
import { cn } from "@/lib/utils";

export const Alert = React.forwardRef(({ className, variant = "default", ...props }, ref) => (
  <div ref={ref} role="alert" className={cn("relative w-full rounded-sm border p-4", variant === "destructive" && "border-destructive/50 text-destructive", className)} {...props} />
));
export const AlertTitle = React.forwardRef(({ className, ...props }, ref) => <h5 ref={ref} className={cn("mb-1 font-medium leading-none tracking-tight", className)} {...props} />);
export const AlertDescription = React.forwardRef(({ className, ...props }, ref) => <div ref={ref} className={cn("text-sm [&_p]:leading-relaxed", className)} {...props} />);
