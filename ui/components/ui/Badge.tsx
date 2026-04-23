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
      "bg-success-100 dark:bg-success-900/40 text-success-700 dark:text-success-300 border-success-200 dark:border-success-800/70",
    warning:
      "bg-warning-100 dark:bg-warning-900/40 text-warning-700 dark:text-warning-300 border-warning-200 dark:border-warning-800/70",
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
