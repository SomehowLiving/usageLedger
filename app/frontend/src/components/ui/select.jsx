import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

export const Select = SelectPrimitive.Root;
export const SelectGroup = SelectPrimitive.Group;
export const SelectValue = SelectPrimitive.Value;
export const SelectTrigger = ({ className, children, ...props }) => <SelectPrimitive.Trigger className={cn("flex h-9 w-full items-center justify-between rounded-sm border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring", className)} {...props}>{children}<SelectPrimitive.Icon asChild><ChevronDown className="h-4 w-4 opacity-50" /></SelectPrimitive.Icon></SelectPrimitive.Trigger>;
export const SelectScrollUpButton = ({ className, ...props }) => <SelectPrimitive.ScrollUpButton className={cn("flex cursor-default items-center justify-center py-1", className)} {...props}><ChevronUp className="h-4 w-4" /></SelectPrimitive.ScrollUpButton>;
export const SelectScrollDownButton = ({ className, ...props }) => <SelectPrimitive.ScrollDownButton className={cn("flex cursor-default items-center justify-center py-1", className)} {...props}><ChevronDown className="h-4 w-4" /></SelectPrimitive.ScrollDownButton>;
export const SelectContent = ({ className, children, position = "popper", ...props }) => <SelectPrimitive.Portal><SelectPrimitive.Content className={cn("relative z-50 max-h-96 min-w-32 overflow-hidden rounded-sm border bg-popover text-popover-foreground shadow-md", className)} position={position} {...props}><SelectScrollUpButton /><SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport><SelectScrollDownButton /></SelectPrimitive.Content></SelectPrimitive.Portal>;
export const SelectLabel = ({ className, ...props }) => <SelectPrimitive.Label className={cn("px-2 py-1.5 text-sm font-semibold", className)} {...props} />;
export const SelectItem = ({ className, children, ...props }) => <SelectPrimitive.Item className={cn("relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground", className)} {...props}><span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center"><SelectPrimitive.ItemIndicator><Check className="h-4 w-4" /></SelectPrimitive.ItemIndicator></span><SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText></SelectPrimitive.Item>;
export const SelectSeparator = ({ className, ...props }) => <SelectPrimitive.Separator className={cn("-mx-1 my-1 h-px bg-muted", className)} {...props} />;
