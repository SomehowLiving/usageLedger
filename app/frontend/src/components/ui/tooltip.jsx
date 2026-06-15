import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;
export const TooltipContent = ({ className, sideOffset = 4, ...props }) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content sideOffset={sideOffset} className={cn("z-50 overflow-hidden rounded-sm bg-primary px-3 py-1.5 text-xs text-primary-foreground shadow-md", className)} {...props} />
  </TooltipPrimitive.Portal>
);
