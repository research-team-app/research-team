"use client";

import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import clsx from "clsx";

interface AccordionItem {
  question: string;
  answer: string;
}

interface AccordionProps {
  items: AccordionItem[];
  defaultOpenIndex?: number;
  className?: string;
}

export default function Accordion({
  items,
  defaultOpenIndex,
  className = "",
}: AccordionProps) {
  return (
    <div className={`w-full px-4 py-6 ${className}`}>
      {/* type="single": Only one item open at a time (standard accordion behavior).
           collapsible: Allows the user to close the currently open item.
           defaultValue: Sets the initial open item.
        */}
      <AccordionPrimitive.Root
        type="single"
        collapsible
        defaultValue={
          defaultOpenIndex !== undefined
            ? `item-${defaultOpenIndex}`
            : undefined
        }
        className="mx-auto w-full max-w-2xl space-y-4 lg:max-w-4xl"
      >
        {items.map((item, index) => (
          <AccordionPrimitive.Item
            key={index}
            value={`item-${index}`}
            className="group data-[state=open]:ring-primary-400 dark:data-[state=open]:ring-primary-500 overflow-hidden rounded-xl bg-white shadow-md ring-1 ring-slate-200 transition-all duration-150 hover:shadow-lg hover:ring-slate-300 data-[state=open]:shadow-lg dark:bg-slate-800 dark:ring-slate-700 dark:hover:ring-slate-600"
          >
            <AccordionPrimitive.Header className="flex">
              <AccordionPrimitive.Trigger
                className={clsx(
                  "flex flex-1 items-center justify-between px-4 py-5 text-left sm:px-7 sm:py-4",
                  "focus-visible:ring-primary-400 dark:focus-visible:ring-primary-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900",
                  "group-data-[state=open]:text-primary-600 dark:group-data-[state=open]:text-primary-400"
                )}
              >
                <span className="group-data-[state=open]:text-primary-600 dark:group-data-[state=open]:text-primary-400 sm:text-md pr-8 text-base font-medium text-slate-900 transition-colors duration-150 dark:text-slate-100">
                  {item.question}
                </span>

                <div
                  className={clsx(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all duration-150",
                    "group-data-[state=open]:bg-primary-500 dark:group-data-[state=open]:bg-primary-600 bg-slate-100 group-data-[state=open]:rotate-180 dark:bg-slate-700"
                  )}
                >
                  <ChevronDownIcon
                    className={clsx(
                      "size-5 transition-colors duration-150",
                      "text-slate-500 group-data-[state=open]:text-white dark:text-slate-400"
                    )}
                  />
                </div>
              </AccordionPrimitive.Trigger>
            </AccordionPrimitive.Header>

            <AccordionPrimitive.Content className="data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden">
              <div className="px-6 pt-0 pb-6 sm:px-7 sm:pb-7">
                <div className="bg-primary-400 dark:bg-primary-500 mb-4 h-px" />
                <p className="text-sm leading-relaxed text-slate-600 sm:text-base dark:text-slate-300">
                  {item.answer}
                </p>
              </div>
            </AccordionPrimitive.Content>
          </AccordionPrimitive.Item>
        ))}
      </AccordionPrimitive.Root>
    </div>
  );
}
