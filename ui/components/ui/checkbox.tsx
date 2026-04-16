"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const checkboxVariants = cva(
  "peer shrink-0 border shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:text-primary-foreground",
  {
    variants: {
      variant: {
        default: "border-primary data-[state=checked]:bg-primary",
        primary:
          "border-primary-600 data-[state=checked]:bg-primary-600 text-white",
        secondary:
          "border-secondary-500 data-[state=checked]:bg-secondary-500 text-white",
        danger:
          "border-danger-500 data-[state=checked]:bg-danger-500 text-white",
        destructive:
          "border-danger-500 data-[state=checked]:bg-danger-500 text-white",
      },
      size: {
        sm: "size-4 rounded-[3px]", // 16px
        md: "size-5 rounded-sm", // 20px (Default)
        lg: "size-6 rounded-md", // 24px
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

const iconSizeMap = {
  sm: "size-3",
  md: "size-3.5",
  lg: "size-4",
};

export interface CheckboxProps
  extends
    React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>,
    VariantProps<typeof checkboxVariants> {}

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  CheckboxProps
>(({ className, variant, size, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(checkboxVariants({ variant, size, className }))}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn("flex items-center justify-center text-current")}
    >
      <Check className={cn(iconSizeMap[size || "md"], "stroke-[3px]")} />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
