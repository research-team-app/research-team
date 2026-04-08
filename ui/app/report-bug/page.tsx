"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { FiAlertTriangle } from "react-icons/fi";
import { API_URL } from "@/data/global";
import Button from "@/components/ui/Button";
import InputField from "@/components/ui/InputField";
import TextArea from "@/components/ui/TextArea";
import Toast from "@/components/ui/Toast";
import ErrorMessage from "@/components/Errormessage";

interface BugReportFormData {
  email: string;
  subject: string;
  description: string;
}

export default function ReportBugPage() {
  const [toast, setToast] = useState<{
    isOpen: boolean;
    message: string;
    variant: "success" | "error" | "info";
  }>({ isOpen: false, message: "", variant: "info" });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<BugReportFormData>({
    defaultValues: { email: "", subject: "", description: "" },
    mode: "onBlur",
  });

  const onSubmit = async (data: BugReportFormData) => {
    setToast((t) => ({ ...t, isOpen: false }));
    try {
      const res = await fetch(`${API_URL}/report-bug`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const text = await res.text();
        let detail = `Request failed (${res.status})`;
        try {
          const j = JSON.parse(text) as { detail?: unknown };
          if (j?.detail != null)
            detail =
              typeof j.detail === "string"
                ? j.detail
                : JSON.stringify(j.detail);
          else if (text) detail = text.slice(0, 300);
        } catch {
          if (text) detail = text.slice(0, 300);
        }
        throw new Error(detail);
      }

      reset();
      setToast({
        isOpen: true,
        message: "Bug report submitted. Thank you!",
        variant: "success",
      });
    } catch (err: unknown) {
      setToast({
        isOpen: true,
        message: err instanceof Error ? err.message : "Something went wrong.",
        variant: "error",
      });
    }
  };

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/40">
              <FiAlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Report a bug
              </h1>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                Help us improve by describing the issue you ran into.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-6"
            noValidate
          >
            <InputField
              label="Your email"
              type="email"
              required
              placeholder="you@example.com"
              {...register("email", {
                required: "Email is required.",
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: "Please enter a valid email.",
                },
              })}
            />
            <ErrorMessage error={errors.email} />

            <InputField
              label="Brief summary"
              placeholder="e.g. Grants page doesn’t load on Safari"
              required
              {...register("subject", {
                required: "Summary is required.",
                maxLength: { value: 500, message: "Max 500 characters." },
              })}
            />
            <ErrorMessage error={errors.subject} />

            <TextArea
              label="What happened?"
              rows={6}
              placeholder="Describe what you did, what you expected, and what actually happened..."
              required
              {...register("description", {
                required: "Description is required.",
              })}
            />
            <ErrorMessage error={errors.description} />

            <div className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-center">
              <Button type="submit" intent="primary" disabled={isSubmitting}>
                {isSubmitting ? "Sending…" : "Submit report"}
              </Button>
            </div>

            {toast.isOpen && (
              <Toast
                isOpen={toast.isOpen}
                onClose={() => setToast((t) => ({ ...t, isOpen: false }))}
                variant={toast.variant}
                duration={10000}
                position="bottom-right"
              >
                {toast.message}
              </Toast>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
