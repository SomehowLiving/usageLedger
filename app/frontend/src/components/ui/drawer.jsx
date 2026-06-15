import { Drawer as DrawerPrimitive } from "vaul";

export const Drawer = DrawerPrimitive.Root;
export const DrawerTrigger = DrawerPrimitive.Trigger;
export const DrawerPortal = DrawerPrimitive.Portal;
export const DrawerClose = DrawerPrimitive.Close;
export const DrawerOverlay = DrawerPrimitive.Overlay;
export const DrawerContent = DrawerPrimitive.Content;
export const DrawerHeader = (props) => <div className="grid gap-1.5 p-4 text-center sm:text-left" {...props} />;
export const DrawerFooter = (props) => <div className="mt-auto flex flex-col gap-2 p-4" {...props} />;
export const DrawerTitle = DrawerPrimitive.Title;
export const DrawerDescription = DrawerPrimitive.Description;
