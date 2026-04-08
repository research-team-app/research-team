"use client";

import React from "react";
import { PolicyLayout } from "../PolicyLayout";

export const TermsAndConditions: React.FC = () => {
  return (
    <PolicyLayout title="Terms & Conditions">
      <section className="space-y-3">
        <p>
          By using this website, you agree to these terms. If you do not agree,
          please do not use the site.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Use of the site</h2>
        <ul className="list-disc space-y-1 pl-5 text-xs text-slate-700 dark:text-slate-300">
          <li>Use the site only for lawful purposes.</li>
          <li>Do not attempt to break, disrupt, or abuse the service.</li>
          <li>You are responsible for any activity under your account.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Content and ownership</h2>
        <p className="text-xs text-slate-700 dark:text-slate-300">
          The content on this site is owned by us or our partners. You may not
          copy, modify, or redistribute it without permission.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">No guarantee</h2>
        <p className="text-xs text-slate-700 dark:text-slate-300">
          This site is provided “as is”, without any guarantees. We may change
          or remove the site at any time.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Contact</h2>
        <p className="text-xs text-slate-700 dark:text-slate-300">
          Questions about these terms? Contact us at{" "}
          <a
            href="mailto:support@example.com"
            className="font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            research.team.app@gmail.com
          </a>
          .
        </p>
      </section>
    </PolicyLayout>
  );
};

export default TermsAndConditions;
