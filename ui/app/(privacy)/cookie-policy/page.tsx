'use client";';

import React from "react";
import { PolicyLayout } from "../PolicyLayout";

export const CookiePolicy: React.FC = () => {
  return (
    <PolicyLayout title="Cookie Policy">
      <section className="space-y-3">
        <p>
          We use cookies to make this site work properly and to understand how
          it is used.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">What are cookies?</h2>
        <p className="text-xs text-slate-700 dark:text-slate-300">
          Cookies are small text files stored on your device when you visit a
          website. They help remember your preferences and improve your
          experience.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">How we use cookies</h2>
        <ul className="list-disc space-y-1 pl-5 text-xs text-slate-700 dark:text-slate-300">
          <li>To keep the site secure and functional.</li>
          <li>To remember basic settings and preferences.</li>
          <li>To measure traffic and improve the site.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Managing cookies</h2>
        <p className="text-xs text-slate-700 dark:text-slate-300">
          You can block or delete cookies in your browser settings. Some
          features of the site may not work correctly if cookies are disabled.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Contact</h2>
        <p className="text-xs text-slate-700 dark:text-slate-300">
          For questions about cookies, email{" "}
          <a
            href="mailto:support@example.com"
            className="font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            [REDACTED FOR BLIND REVIEW]
          </a>
          .
        </p>
      </section>
    </PolicyLayout>
  );
};

export default CookiePolicy;
