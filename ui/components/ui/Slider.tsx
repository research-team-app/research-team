"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

interface SliderProps
  extends React.ComponentProps<typeof SliderPrimitive.Root> {
  showValue?: boolean;
  valueSuffix?: string;
}

function Slider({
  className,
  showValue = false,
  valueSuffix = "",
  value,
  defaultValue,
  ...props
}: SliderProps) {
  const displayValue = value?.[0] ?? defaultValue?.[0] ?? 0;

  return (
    <div className="flex w-full items-center gap-3">
      <SliderPrimitive.Root
        data-slot="slider"
        value={value}
        defaultValue={defaultValue}
        className={cn(
          "relative flex w-full touch-none items-center select-none",
          "data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed",
          className
        )}
        {...props}
      >
        {/* Track */}
        <SliderPrimitive.Track className="bg-slate-200 dark:bg-slate-700 relative h-1.5 w-full grow overflow-hidden rounded-full">
          {/* Filled range */}
          <SliderPrimitive.Range className="bg-primary-600 dark:bg-primary-500 absolute h-full rounded-full" />
        </SliderPrimitive.Track>

        {/* Thumb */}
        <SliderPrimitive.Thumb className="border-primary-600 dark:border-primary-500 bg-white dark:bg-slate-900 block h-4 w-4 rounded-full border-2 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900 disabled:pointer-events-none" />
      </SliderPrimitive.Root>

      {showValue && (
        <span className="text-primary-700 dark:text-primary-400 w-10 shrink-0 text-right text-sm font-semibold tabular-nums">
          {displayValue}
          {valueSuffix}
        </span>
      )}
    </div>
  );
}

export { Slider };
