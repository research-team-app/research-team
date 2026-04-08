import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/16/solid";

const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) => {
  const getPageNumbers = () => {
    const pages = [];
    const maxVisibleButtons = 5;

    if (totalPages <= maxVisibleButtons) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, "...", totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(
          1,
          "...",
          totalPages - 3,
          totalPages - 2,
          totalPages - 1,
          totalPages
        );
      } else {
        pages.push(
          1,
          "...",
          currentPage - 1,
          currentPage,
          currentPage + 1,
          "...",
          totalPages
        );
      }
    }
    return pages;
  };

  return (
    <div className="mt-12 flex flex-col items-center justify-center space-y-4 sm:flex-row sm:space-y-0 sm:space-x-2">
      <div className="flex items-center space-x-2">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="rounded-lg border border-slate-300 bg-white p-3 text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>

        <div className="flex items-center space-x-1">
          {getPageNumbers().map((page, idx) => (
            <button
              key={idx}
              onClick={() => typeof page === "number" && onPageChange(page)}
              disabled={page === "..."}
              className={`min-w-11 rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
                page === currentPage
                  ? "bg-primary-600 dark:bg-primary-500 text-white shadow-md"
                  : page === "..."
                    ? "cursor-default bg-transparent text-slate-500"
                    : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              {page}
            </button>
          ))}
        </div>

        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="rounded-lg border border-slate-300 bg-white p-3 text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          <ChevronRightIcon className="h-5 w-5" />
        </button>
      </div>
      <span className="text-sm text-slate-500 sm:hidden dark:text-slate-400">
        Page {currentPage} of {totalPages}
      </span>
    </div>
  );
};

export default Pagination;
