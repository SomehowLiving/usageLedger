import { Controller, FormProvider, useFormContext } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const Form = FormProvider;
export const FormField = Controller;
export const FormItem = ({ className, ...props }) => <div className={cn("space-y-2", className)} {...props} />;
export const FormLabel = ({ className, ...props }) => <Label className={cn("text-sm font-medium", className)} {...props} />;
export const FormControl = ({ ...props }) => <div {...props} />;
export const FormDescription = ({ className, ...props }) => <p className={cn("text-sm text-muted-foreground", className)} {...props} />;
export const FormMessage = ({ className, name, children, ...props }) => {
  const context = useFormContext();
  const error = name ? context?.formState?.errors?.[name]?.message : null;
  const body = error ? String(error) : children;
  if (!body) return null;
  return <p className={cn("text-sm font-medium text-destructive", className)} {...props}>{body}</p>;
};
