import { useRef } from "react";
import { PaperClipIcon } from "@heroicons/react/24/outline";

type AttachmentPickerButtonProps = {
  onSelect: (file: File) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
  maxSizeBytes?: number;
  accept?: string;
  title?: string;
  className?: string;
};

export default function AttachmentPickerButton({
  onSelect,
  onError,
  disabled = false,
  maxSizeBytes = 25 * 1024 * 1024,
  accept = "*/*",
  title = "Attach file",
  className = "",
}: AttachmentPickerButtonProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const maxSizeMb = Math.max(1, Math.round(maxSizeBytes / (1024 * 1024)));

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const selected = e.target.files?.[0] ?? null;
          if (!selected) return;
          if (selected.size > maxSizeBytes) {
            onError?.(`Attachment must be ${maxSizeMb}MB or smaller.`);
            e.currentTarget.value = "";
            return;
          }
          onSelect(selected);
          e.currentTarget.value = "";
        }}
        disabled={disabled}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        className={`inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100 ${className}`}
        title={title}
        aria-label={title}
      >
        <PaperClipIcon className="h-4 w-4" />
        <span>{title}</span>
      </button>
    </>
  );
}
