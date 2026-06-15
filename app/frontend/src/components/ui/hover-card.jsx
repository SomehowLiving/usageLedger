import * as HoverCardPrimitive from "@radix-ui/react-hover-card";
import { cn } from "@/lib/utils";

export const HoverCard = HoverCardPrimitive.Root;
export const HoverCardTrigger = HoverCardPrimitive.Trigger;
export const HoverCardContent = ({ className, align = "center", sideOffset = 4, ...props }) => <HoverCardPrimitive.Portal><HoverCardPrimitive.Content align={align} sideOffset={sideOffset} className={cn("z-50 w-64 rounded-sm border bg-popover p-4 text-popover-foreground shadow-md outline-none", className)} {...props} /></HoverCardPrimitive.Portal>;
