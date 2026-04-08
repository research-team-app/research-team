"use client";

import Button from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { FaHome } from "react-icons/fa";
import { IoArrowBackCircleOutline } from "react-icons/io5";

export default function NotFound() {
  const router = useRouter();
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12 dark:border-slate-700 dark:bg-slate-900">
        {/* 404 Number */}
        <h1 className="text-primary-700 dark:text-primary-400 mb-2 text-8xl leading-none font-bold select-none">
          404
        </h1>

        {/* Content */}
        <div className="mb-8 space-y-3">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Page not found
          </h2>
          <p className="text-base leading-relaxed text-slate-500 dark:text-slate-400">
            The page you&apos;re looking for doesn&apos;t exist or has been
            moved.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Button
            startIcon={<FaHome className="size-4" />}
            intent="primary"
            size="lg"
            onClick={() => router.push("/")}
          >
            Go to Homepage
          </Button>
          <Button
            startIcon={<IoArrowBackCircleOutline className="size-4" />}
            variant="outline"
            onClick={() => router.back()}
          >
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
}
