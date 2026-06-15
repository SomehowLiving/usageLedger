import * as NavigationMenuPrimitive from "@radix-ui/react-navigation-menu";
import { cn } from "@/lib/utils";

export const NavigationMenu = ({ className, ...props }) => <NavigationMenuPrimitive.Root className={cn("relative z-10 flex max-w-max flex-1 items-center justify-center", className)} {...props} />;
export const NavigationMenuList = ({ className, ...props }) => <NavigationMenuPrimitive.List className={cn("group flex flex-1 list-none items-center justify-center space-x-1", className)} {...props} />;
export const NavigationMenuItem = NavigationMenuPrimitive.Item;
export const NavigationMenuTrigger = ({ className, ...props }) => <NavigationMenuPrimitive.Trigger className={cn("inline-flex h-9 items-center justify-center rounded-sm bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground", className)} {...props} />;
export const NavigationMenuContent = ({ className, ...props }) => <NavigationMenuPrimitive.Content className={cn("left-0 top-0 w-full md:absolute md:w-auto", className)} {...props} />;
export const NavigationMenuLink = NavigationMenuPrimitive.Link;
export const NavigationMenuViewport = ({ className, ...props }) => <div className="absolute left-0 top-full flex justify-center"><NavigationMenuPrimitive.Viewport className={cn("origin-top-center relative mt-1.5 h-[var(--radix-navigation-menu-viewport-height)] w-full overflow-hidden rounded-sm border bg-popover text-popover-foreground shadow md:w-[var(--radix-navigation-menu-viewport-width)]", className)} {...props} /></div>;
export const NavigationMenuIndicator = ({ className, ...props }) => <NavigationMenuPrimitive.Indicator className={cn("top-full z-10 flex h-1.5 items-end justify-center overflow-hidden", className)} {...props} />;
export const navigationMenuTriggerStyle = () => "inline-flex h-9 items-center justify-center rounded-sm bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground";
