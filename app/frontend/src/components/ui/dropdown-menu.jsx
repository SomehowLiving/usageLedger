import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { Check, ChevronRight, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
export const DropdownMenuGroup = DropdownMenuPrimitive.Group;
export const DropdownMenuPortal = DropdownMenuPrimitive.Portal;
export const DropdownMenuSub = DropdownMenuPrimitive.Sub;
export const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;
export const DropdownMenuSubTrigger = ({ className, inset, children, ...props }) => <DropdownMenuPrimitive.SubTrigger className={cn("flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent", inset && "pl-8", className)} {...props}>{children}<ChevronRight className="ml-auto h-4 w-4" /></DropdownMenuPrimitive.SubTrigger>;
export const DropdownMenuSubContent = ({ className, ...props }) => <DropdownMenuPrimitive.SubContent className={cn("z-50 min-w-32 overflow-hidden rounded-sm border bg-popover p-1 text-popover-foreground shadow-lg", className)} {...props} />;
export const DropdownMenuContent = ({ className, sideOffset = 4, ...props }) => <DropdownMenuPrimitive.Portal><DropdownMenuPrimitive.Content sideOffset={sideOffset} className={cn("z-50 min-w-32 overflow-hidden rounded-sm border bg-popover p-1 text-popover-foreground shadow-md", className)} {...props} /></DropdownMenuPrimitive.Portal>;
export const DropdownMenuItem = ({ className, inset, ...props }) => <DropdownMenuPrimitive.Item className={cn("relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent", inset && "pl-8", className)} {...props} />;
export const DropdownMenuCheckboxItem = ({ className, children, checked, ...props }) => <DropdownMenuPrimitive.CheckboxItem className={cn("relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent", className)} checked={checked} {...props}><span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center"><DropdownMenuPrimitive.ItemIndicator><Check className="h-4 w-4" /></DropdownMenuPrimitive.ItemIndicator></span>{children}</DropdownMenuPrimitive.CheckboxItem>;
export const DropdownMenuRadioItem = ({ className, children, ...props }) => <DropdownMenuPrimitive.RadioItem className={cn("relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent", className)} {...props}><span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center"><DropdownMenuPrimitive.ItemIndicator><Circle className="h-2 w-2 fill-current" /></DropdownMenuPrimitive.ItemIndicator></span>{children}</DropdownMenuPrimitive.RadioItem>;
export const DropdownMenuLabel = ({ className, inset, ...props }) => <DropdownMenuPrimitive.Label className={cn("px-2 py-1.5 text-sm font-semibold", inset && "pl-8", className)} {...props} />;
export const DropdownMenuSeparator = ({ className, ...props }) => <DropdownMenuPrimitive.Separator className={cn("-mx-1 my-1 h-px bg-muted", className)} {...props} />;
export const DropdownMenuShortcut = ({ className, ...props }) => <span className={cn("ml-auto text-xs tracking-widest opacity-60", className)} {...props} />;
