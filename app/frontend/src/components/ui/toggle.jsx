import * as TogglePrimitive from "@radix-ui/react-toggle";
import { cn } from "@/lib/utils";

export const toggleVariants = ({ variant = "default", size = "default", className } = {}) => cn("inline-flex items-center justify-center rounded-sm text-sm font-medium transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground", variant === "outline" && "border border-input bg-transparent", size === "sm" ? "h-8 px-2" : size === "lg" ? "h-10 px-3" : "h-9 px-3", className);
export const Toggle = ({ className, variant, size, ...props }) => <TogglePrimitive.Root className={toggleVariants({ variant, size, className })} {...props} />;
