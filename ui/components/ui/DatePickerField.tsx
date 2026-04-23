"use client";

import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { CalendarIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";

export interface DatePickerFieldProps {
  label: string;
  required?: boolean;
  selected: Date | null;
  onChange: (date: Date | null) => void;
  error?: string;
  id?: string;
  className?: string;
  placeholderText?: string;
  dateFormat?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  startDate?: Date;
  endDate?: Date;
  selectsStart?: boolean;
  selectsEnd?: boolean;
  showMonthYearPicker?: boolean;
  showYearDropdown?: boolean;
  scrollableYearDropdown?: boolean;
  yearDropdownItemNumber?: number;
}

export default function DatePickerField({
  label,
  required,
  selected,
  onChange,
  error,
  id,
  placeholderText = "Select date",
  dateFormat = "yyyy-MM-dd",
  className,
  ...pickerProps
}: DatePickerFieldProps) {
  return (
    <div className={clsx("space-y-1", className)}>
      <label
        htmlFor={id}
        className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300"
      >
        <CalendarIcon
          className="mr-2 size-4 text-slate-500 dark:text-slate-400"
          aria-hidden="true"
        />
        {label}
        {required && <span className="text-danger-500 ml-1">*</span>}
      </label>
      <DatePicker
        id={id}
        selected={selected}
        onChange={(value: unknown) => {
          const d = Array.isArray(value)
            ? ((value[0] ?? null) as Date | null)
            : ((value ?? null) as Date | null);
          onChange(d);
        }}
        dateFormat={dateFormat}
        wrapperClassName="w-full"
        className="focus:border-primary-500 dark:focus:border-primary-400 w-full rounded-md border-[1.5px] border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-[border-color,box-shadow] duration-150 placeholder:text-slate-400 focus:ring-0 focus:outline-none dark:border-slate-500 dark:bg-slate-900/80 dark:text-white"
        placeholderText={placeholderText}
        isClearable
        {...pickerProps}
      />
      {error && (
        <p className="text-danger-600 dark:text-danger-400 text-xs">{error}</p>
      )}
    </div>
  );
}

/** Date picker that persists as a year-only value. */
export interface YearDatePickerProps extends Omit<
  DatePickerFieldProps,
  "selected" | "onChange"
> {
  year: number | null | undefined;
  onYearChange: (year: number | null) => void;
  minYear?: number;
  maxYear?: number;
}

export function YearDatePicker({
  year,
  onYearChange,
  minYear = 1900,
  maxYear,
  ...rest
}: YearDatePickerProps) {
  const selected =
    typeof year === "number" && Number.isFinite(year)
      ? new Date(year, 0, 1)
      : null;
  return (
    <DatePickerField
      {...rest}
      selected={selected}
      onChange={(d) => onYearChange(d ? d.getFullYear() : null)}
      minDate={new Date(minYear, 0, 1)}
      maxDate={maxYear ? new Date(maxYear, 11, 31) : undefined}
      showYearDropdown
      scrollableYearDropdown
      yearDropdownItemNumber={80}
    />
  );
}
