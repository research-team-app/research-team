"use client";

import React from "react";
import { PolicyLayout } from "../PolicyLayout";

export const PrivacyPolicy: React.FC = () => {
  return (
    <PolicyLayout title="Privacy Policy">
      <section className="space-y-3">
        <p>
          We respect your privacy. This policy explains what data we collect
          when you use our website and how we use it.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Information we collect</h2>
        <ul className="list-disc space-y-1 pl-5 text-xs text-slate-700 dark:text-slate-300">
          <li>Contact details you provide (e.g. name, email).</li>
          <li>
            Usage data such as pages visited and basic device information.
          </li>
          <li>Cookies and similar technologies (see Cookie Policy).</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">How we use your information</h2>
        <ul className="list-disc space-y-1 pl-5 text-xs text-slate-700 dark:text-slate-300">
          <li>To operate and improve our website and services.</li>
          <li>To communicate with you when you contact us.</li>
          <li>
            To keep our services secure and comply with legal obligations.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Your choices</h2>
        <p className="text-xs text-slate-700 dark:text-slate-300">
          You can request access, correction, or deletion of your personal data
          by contacting us. You can also control cookies in your browser
          settings.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Contact</h2>
        <p className="text-xs text-slate-700 dark:text-slate-300">
          If you have any questions about this policy, email us at{" "}
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

export default PrivacyPolicy;
