import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export const Accordion = AccordionPrimitive.Root;
export const AccordionItem = ({ className, ...props }) => <AccordionPrimitive.Item className={cn("border-b", className)} {...props} />;
export const AccordionTrigger = ({ className, children, ...props }) => <AccordionPrimitive.Header className="flex"><AccordionPrimitive.Trigger className={cn("flex flex-1 items-center justify-between py-4 text-sm font-medium transition-all hover:underline", className)} {...props}>{children}<ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" /></AccordionPrimitive.Trigger></AccordionPrimitive.Header>;
export const AccordionContent = ({ className, ...props }) => <AccordionPrimitive.Content className={cn("overflow-hidden text-sm", className)} {...props} />;
