"use client";

interface LoadingProps {
  title?: string;
  description?: string;
  variant?: "spinner" | "dots" | "pulse" | "bars" | "orbit";
  mode?: "fullscreen" | "half" | "inline";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const Loading = ({
  title = "Loading...",
  variant = "dots",
  mode = "half",
  size = "md",
  className = "",
  description,
}: LoadingProps) => {
  const spinnerSizes = {
    sm: "h-5 w-5 border-2",
    md: "h-10 w-10 border-4",
    lg: "h-16 w-16 border-[5px]",
    xl: "h-24 w-24 border-[6px]",
  };

  const dotsSizes = {
    sm: "h-1.5 w-1.5",
    md: "h-3 w-3",
    lg: "h-4 w-4",
    xl: "h-6 w-6",
  };

  const pulseSizes = {
    sm: "h-10 w-10",
    md: "h-20 w-20",
    lg: "h-32 w-32",
    xl: "h-48 w-48",
  };

  const containerStyles = {
    fullscreen: "min-h-[90vh] w-full flex-col",
    // Takes up 50% of viewport height
    half: "h-[50vh] w-full flex-col",
    // Just fits the content, useful for buttons or small cards
    inline: "w-auto flex-col py-4",
  };

  const renderAnimation = () => {
    switch (variant) {
      case "dots":
        return (
          <div className="flex items-center justify-center gap-2">
            {[0, 150, 300].map((delay, i) => (
              <div
                key={i}
                className={`${dotsSizes[size]} animate-bounce rounded-full bg-slate-900 shadow-sm dark:bg-slate-100`}
                style={{
                  animationDelay: `${delay}ms`,
                  animationDuration: "0.8s",
                  animationTimingFunction: "cubic-bezier(0.4, 0, 0.6, 1)",
                }}
              />
            ))}
          </div>
        );

      case "pulse":
        return (
          <div
            className={`relative flex items-center justify-center ${pulseSizes[size]}`}
          >
            {/* Outer pulse */}
            <div
              className="absolute inset-0 animate-ping rounded-full bg-slate-900/10 dark:bg-slate-100/10"
              style={{
                animationDuration: "2s",
                animationTimingFunction: "cubic-bezier(0, 0, 0.2, 1)",
              }}
            />
            {/* Middle pulse */}
            <div
              className="absolute inset-[20%] animate-pulse rounded-full bg-slate-900/20 dark:bg-slate-100/20"
              style={{
                animationDuration: "1.5s",
              }}
            />
            {/* Core */}
            <div className="relative h-1/3 w-1/3 rounded-full bg-slate-900 shadow-md dark:bg-slate-100" />
          </div>
        );

      case "spinner":
      default:
        return (
          <div className="relative inline-flex items-center justify-center">
            {/* Main spinner */}
            <div
              className={`${spinnerSizes[size]} animate-spin rounded-full border-[3px] border-slate-200 border-t-slate-900 dark:border-slate-700 dark:border-t-slate-100`}
              style={{
                animationDuration: "0.8s",
                animationTimingFunction: "linear",
              }}
            />
          </div>
        );

      case "orbit":
        return (
          <div
            className={`relative flex items-center justify-center ${pulseSizes[size]}`}
          >
            {/* Center dot */}
            <div className="absolute h-2 w-2 rounded-full bg-slate-900 dark:bg-slate-100" />
            {/* Orbiting dots */}
            {[0, 120, 240].map((rotation, i) => (
              <div
                key={i}
                className="absolute inset-0 animate-spin"
                style={{
                  animationDuration: "1.2s",
                  animationDelay: `${rotation * -3.33}ms`,
                  animationTimingFunction: "linear",
                }}
              >
                <div className="h-1.5 w-1.5 rounded-full bg-slate-900 shadow-sm dark:bg-slate-100" />
              </div>
            ))}
          </div>
        );

      case "bars":
        return (
          <div className="flex items-end justify-center gap-1.5">
            {[0, 100, 200].map((delay, i) => (
              <div
                key={i}
                className="w-1 rounded-full bg-slate-900 dark:bg-slate-100"
                style={{
                  animation: "scaleY 0.8s ease-in-out infinite",
                  animationDelay: `${delay}ms`,
                  height: "1rem",
                  transformOrigin: "bottom",
                }}
              />
            ))}
          </div>
        );
    }
  };

  return (
    <div
      className={`flex items-center justify-center ${containerStyles[mode]} ${className}`}
    >
      {renderAnimation()}

      {title && (
        <p
          className={`mt-4 font-semibold text-slate-600 dark:text-slate-300 ${
            size === "sm" ? "text-xs" : "text-sm"
          }`}
        >
          {title}
        </p>
      )}
      {description && (
        <p className="text-base text-slate-600 dark:text-slate-400">
          {description}
        </p>
      )}
    </div>
  );
};

export default Loading;
