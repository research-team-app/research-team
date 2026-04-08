import { FieldError } from "react-hook-form";

export default function ErrorMessage({ error }: { error?: FieldError }) {
  if (!error) return null;

  return (
    <p className="mt-2 flex items-center gap-1 text-xs text-red-600">
      {error.message}
    </p>
  );
}
