"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const switchVariants = cva(
  "peer inline-flex shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all outline-none focus-visible:ring-[3px] focus-visible:border-ring focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[state=unchecked]:bg-input dark:data-[state=unchecked]:bg-input/80",
  {
    variants: {
      variant: {
        default: "data-[state=checked]:bg-primary",
        secondary: "data-[state=checked]:bg-secondary-500",
        primary: "data-[state=checked]:bg-primary-600",
      },
      size: {
        sm: "h-5 w-9",
        md: "h-6 w-11",
        lg: "h-7 w-14",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

const thumbVariants = cva(
  "bg-background dark:data-[state=unchecked]:bg-foreground pointer-events-none block rounded-full ring-0 shadow-sm transition-transform data-[state=unchecked]:translate-x-0",
  {
    variants: {
      size: {
        sm: "size-4 data-[state=checked]:translate-x-4",
        md: "size-5 data-[state=checked]:translate-x-5",
        lg: "size-6 data-[state=checked]:translate-x-7",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
);

function Switch({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> &
  VariantProps<typeof switchVariants>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(switchVariants({ variant, size, className }))}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(thumbVariants({ size }))}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
