import * as SheetPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Sheet = SheetPrimitive.Root;
export const SheetTrigger = SheetPrimitive.Trigger;
export const SheetClose = SheetPrimitive.Close;
export const SheetPortal = SheetPrimitive.Portal;
export const SheetOverlay = ({ className, ...props }) => <SheetPrimitive.Overlay className={cn("fixed inset-0 z-50 bg-black/80", className)} {...props} />;
export const SheetContent = ({ side = "right", className, children, ...props }) => {
  const sides = { right: "inset-y-0 right-0 h-full w-3/4 border-l", left: "inset-y-0 left-0 h-full w-3/4 border-r", top: "inset-x-0 top-0 border-b", bottom: "inset-x-0 bottom-0 border-t" };
  return <SheetPortal><SheetOverlay /><SheetPrimitive.Content className={cn("fixed z-50 gap-4 bg-background p-6 shadow-lg", sides[side], className)} {...props}>{children}<SheetPrimitive.Close className="absolute right-4 top-4"><X className="h-4 w-4" /></SheetPrimitive.Close></SheetPrimitive.Content></SheetPortal>;
};
export const SheetHeader = ({ className, ...props }) => <div className={cn("flex flex-col space-y-2 text-center sm:text-left", className)} {...props} />;
export const SheetFooter = ({ className, ...props }) => <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />;
export const SheetTitle = ({ className, ...props }) => <SheetPrimitive.Title className={cn("text-lg font-semibold text-foreground", className)} {...props} />;
export const SheetDescription = ({ className, ...props }) => <SheetPrimitive.Description className={cn("text-sm text-muted-foreground", className)} {...props} />;
