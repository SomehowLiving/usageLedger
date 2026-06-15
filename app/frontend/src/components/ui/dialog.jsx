import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogPortal = DialogPrimitive.Portal;
export const DialogClose = DialogPrimitive.Close;
export const DialogOverlay = ({ className, ...props }) => <DialogPrimitive.Overlay className={cn("fixed inset-0 z-50 bg-black/80", className)} {...props} />;
export const DialogContent = ({ className, children, ...props }) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content className={cn("fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 border bg-background p-6 shadow-lg", className)} {...props}>
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 opacity-70 hover:opacity-100"><X className="h-4 w-4" /></DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
);
export const DialogHeader = ({ className, ...props }) => <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />;
export const DialogFooter = ({ className, ...props }) => <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />;
export const DialogTitle = ({ className, ...props }) => <DialogPrimitive.Title className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />;
export const DialogDescription = ({ className, ...props }) => <DialogPrimitive.Description className={cn("text-sm text-muted-foreground", className)} {...props} />;
