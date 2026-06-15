import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import { toggleVariants } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";

export const ToggleGroup = ({ className, ...props }) => <ToggleGroupPrimitive.Root className={cn("flex items-center justify-center gap-1", className)} {...props} />;
export const ToggleGroupItem = ({ className, variant, size, ...props }) => <ToggleGroupPrimitive.Item className={toggleVariants({ variant, size, className })} {...props} />;
