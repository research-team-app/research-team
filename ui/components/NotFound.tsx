"use client";

import Link from "next/link";

const NotFound = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 text-slate-800 dark:bg-slate-900 dark:text-slate-100">
      <h1 className="mb-4 text-6xl font-bold">404</h1>
      <h2 className="mb-2 text-2xl font-semibold">Page Not Found</h2>
      <p className="mb-6 max-w-md text-center text-slate-600 dark:text-slate-200">
        Oops! The page you&apos;re looking for doesn&apos;t exist. It might have
        been moved or deleted.
      </p>
      <Link
        href="/"
        className="rounded-md bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
      >
        Go to Homepage
      </Link>
    </div>
  );
};

export default NotFound;
