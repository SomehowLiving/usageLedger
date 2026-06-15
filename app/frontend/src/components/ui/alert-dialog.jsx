import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const AlertDialog = AlertDialogPrimitive.Root;
export const AlertDialogTrigger = AlertDialogPrimitive.Trigger;
export const AlertDialogPortal = AlertDialogPrimitive.Portal;
export const AlertDialogOverlay = ({ className, ...props }) => <AlertDialogPrimitive.Overlay className={cn("fixed inset-0 z-50 bg-black/80", className)} {...props} />;
export const AlertDialogContent = ({ className, ...props }) => <AlertDialogPortal><AlertDialogOverlay /><AlertDialogPrimitive.Content className={cn("fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 border bg-background p-6 shadow-lg", className)} {...props} /></AlertDialogPortal>;
export const AlertDialogHeader = ({ className, ...props }) => <div className={cn("flex flex-col space-y-2 text-center sm:text-left", className)} {...props} />;
export const AlertDialogFooter = ({ className, ...props }) => <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />;
export const AlertDialogTitle = ({ className, ...props }) => <AlertDialogPrimitive.Title className={cn("text-lg font-semibold", className)} {...props} />;
export const AlertDialogDescription = ({ className, ...props }) => <AlertDialogPrimitive.Description className={cn("text-sm text-muted-foreground", className)} {...props} />;
export const AlertDialogAction = ({ className, ...props }) => <AlertDialogPrimitive.Action className={cn(buttonVariants(), className)} {...props} />;
export const AlertDialogCancel = ({ className, ...props }) => <AlertDialogPrimitive.Cancel className={cn(buttonVariants({ variant: "outline" }), "mt-2 sm:mt-0", className)} {...props} />;
