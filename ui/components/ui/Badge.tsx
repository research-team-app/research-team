"use client";

const Badge: React.FC<{
  children: React.ReactNode;
  color?: "primary" | "secondary" | "success" | "warning" | "danger" | "gray";
  icon?: React.ReactNode;
}> = ({ children, color = "gray", icon }) => {
  const colorClasses = {
    primary:
      "bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border-primary-200 dark:border-primary-800/70",
    secondary:
      "bg-secondary-100 dark:bg-secondary-900/30 text-secondary-700 dark:text-secondary-300 border-secondary-200 dark:border-secondary-800/70",
    success:
      "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/70",
    warning:
      "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/70",
    danger:
      "bg-danger-100 dark:bg-danger-900/40 text-danger-700 dark:text-danger-300 border-danger-200 dark:border-danger-800/70",
    gray: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
        colorClasses[color as keyof typeof colorClasses] || colorClasses.gray
      }`}
    >
      {icon}
      {children}
    </span>
  );
};

export default Badge;
