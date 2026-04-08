export type AttachmentKind =
  | "pdf"
  | "image"
  | "document"
  | "spreadsheet"
  | "presentation"
  | "archive"
  | "code"
  | "file";

const IMAGE_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "bmp",
  "svg",
  "heic",
  "heif",
]);

const DOCUMENT_EXTENSIONS = new Set(["txt", "md", "rtf", "doc", "docx", "odt"]);

const SPREADSHEET_EXTENSIONS = new Set(["csv", "tsv", "xls", "xlsx", "ods"]);

const PRESENTATION_EXTENSIONS = new Set(["ppt", "pptx", "odp", "key"]);

const ARCHIVE_EXTENSIONS = new Set([
  "zip",
  "rar",
  "7z",
  "tar",
  "gz",
  "tgz",
  "bz2",
  "xz",
]);

const CODE_EXTENSIONS = new Set([
  "py",
  "ts",
  "tsx",
  "js",
  "jsx",
  "json",
  "java",
  "go",
  "rs",
  "c",
  "cpp",
  "h",
  "hpp",
  "sh",
  "yaml",
  "yml",
  "toml",
  "sql",
]);

function extensionOf(fileName: string): string {
  const parts = fileName.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

export function inferAttachmentKind(
  fileName: string,
  contentType?: string
): AttachmentKind {
  const ext = extensionOf(fileName);
  const mime = (contentType || "").toLowerCase();

  if (mime === "application/pdf" || ext === "pdf") return "pdf";
  if (mime.startsWith("image/") || IMAGE_EXTENSIONS.has(ext)) return "image";
  if (
    mime.includes("spreadsheet") ||
    mime.includes("excel") ||
    SPREADSHEET_EXTENSIONS.has(ext)
  ) {
    return "spreadsheet";
  }
  if (mime.includes("presentation") || PRESENTATION_EXTENSIONS.has(ext)) {
    return "presentation";
  }
  if (
    mime.includes("word") ||
    mime.includes("officedocument.wordprocessingml") ||
    DOCUMENT_EXTENSIONS.has(ext)
  ) {
    return "document";
  }
  if (
    mime.includes("zip") ||
    mime.includes("compressed") ||
    mime.includes("archive") ||
    ARCHIVE_EXTENSIONS.has(ext)
  ) {
    return "archive";
  }
  if (
    mime.startsWith("text/") ||
    mime.includes("json") ||
    mime.includes("xml") ||
    CODE_EXTENSIONS.has(ext)
  ) {
    return "code";
  }
  return "file";
}

export function formatAttachmentSize(sizeBytes: number): string {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) return "0 B";
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}
