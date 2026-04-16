import clsx from "clsx";
import {
  ArchiveBoxIcon,
  ArrowDownTrayIcon,
  CodeBracketIcon,
  DocumentIcon,
  DocumentTextIcon,
  PhotoIcon,
  TableCellsIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  formatAttachmentSize,
  inferAttachmentKind,
} from "@/lib/attachmentUtils";

type Tone = "default" | "inverse";

type AttachmentChipProps = {
  fileName: string;
  sizeBytes: number;
  contentType?: string;
  href?: string;
  onRemove?: () => void;
  tone?: Tone;
  className?: string;
  maxNameClassName?: string;
};

export default function AttachmentChip({
  fileName,
  sizeBytes,
  contentType,
  href,
  onRemove,
  tone = "default",
  className,
  maxNameClassName = "max-w-52",
}: AttachmentChipProps) {
  const kind = inferAttachmentKind(fileName, contentType);

  const Icon =
    kind === "pdf" || kind === "document" || kind === "presentation"
      ? DocumentTextIcon
      : kind === "image"
        ? PhotoIcon
        : kind === "spreadsheet"
          ? TableCellsIcon
          : kind === "archive"
            ? ArchiveBoxIcon
            : kind === "code"
              ? CodeBracketIcon
              : DocumentIcon;

  const baseTone =
    tone === "inverse"
      ? "border-white/30 bg-white/15 text-white"
      : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-200";

  const content = (
    <>
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className={clsx("truncate", maxNameClassName)}>{fileName}</span>
      <span
        className={clsx(
          "shrink-0 text-[11px]",
          tone === "inverse"
            ? "text-white/85"
            : "text-slate-500 dark:text-slate-400"
        )}
      >
        {formatAttachmentSize(sizeBytes)}
      </span>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className={clsx(
          "inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition",
          baseTone,
          tone === "inverse"
            ? "hover:bg-white/20"
            : "hover:bg-slate-100 dark:hover:bg-slate-700",
          className
        )}
        title={fileName}
      >
        {content}
        <ArrowDownTrayIcon className="h-3.5 w-3.5 shrink-0" />
      </a>
    );
  }

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium",
        baseTone,
        className
      )}
      title={fileName}
    >
      {content}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className={clsx(
            "rounded p-0.5",
            tone === "inverse"
              ? "hover:bg-white/20"
              : "hover:bg-slate-200 dark:hover:bg-slate-600"
          )}
          aria-label="Remove attachment"
        >
          <XMarkIcon className="h-3.5 w-3.5" />
        </button>
      )}
    </span>
  );
}
