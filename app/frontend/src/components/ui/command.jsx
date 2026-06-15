import { Command as CommandPrimitive } from "cmdk";
import { Search } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const Command = ({ className, ...props }) => <CommandPrimitive className={cn("flex h-full w-full flex-col overflow-hidden rounded-sm bg-popover text-popover-foreground", className)} {...props} />;
export const CommandDialog = ({ children, ...props }) => <Dialog {...props}><DialogContent className="overflow-hidden p-0"><Command>{children}</Command></DialogContent></Dialog>;
export const CommandInput = ({ className, ...props }) => <div className="flex items-center border-b px-3"><Search className="mr-2 h-4 w-4 shrink-0 opacity-50" /><CommandPrimitive.Input className={cn("flex h-10 w-full rounded-sm bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50", className)} {...props} /></div>;
export const CommandList = ({ className, ...props }) => <CommandPrimitive.List className={cn("max-h-80 overflow-y-auto overflow-x-hidden", className)} {...props} />;
export const CommandEmpty = (props) => <CommandPrimitive.Empty className="py-6 text-center text-sm" {...props} />;
export const CommandGroup = ({ className, ...props }) => <CommandPrimitive.Group className={cn("overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground", className)} {...props} />;
export const CommandSeparator = ({ className, ...props }) => <CommandPrimitive.Separator className={cn("-mx-1 h-px bg-border", className)} {...props} />;
export const CommandItem = ({ className, ...props }) => <CommandPrimitive.Item className={cn("relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none data-[selected=true]:bg-accent", className)} {...props} />;
export const CommandShortcut = ({ className, ...props }) => <span className={cn("ml-auto text-xs tracking-widest text-muted-foreground", className)} {...props} />;
