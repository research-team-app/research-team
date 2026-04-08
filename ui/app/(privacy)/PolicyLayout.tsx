"use client";

import React from "react";

interface PolicyLayoutProps {
  title: string;
  children: React.ReactNode;
}

export const PolicyLayout: React.FC<PolicyLayoutProps> = ({
  title,
  children,
}) => {
  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        </header>

        <article className="space-y-6 text-sm leading-relaxed">
          {children}
        </article>
      </main>
    </div>
  );
};
