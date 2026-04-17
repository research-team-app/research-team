import NextLink from "next/link";
import type { ReactNode, MouseEventHandler, AnchorHTMLAttributes } from "react";

type LinkProps = {
  href: string;
  title?: string;
  className?: string;
  children?: ReactNode;
  endIcon?: ReactNode;
  startIcon?: ReactNode;
  hoverUnderline?: boolean;
  /** If false, Next.js won't scroll to top on navigate (default true). */
  scroll?: boolean;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  target?: AnchorHTMLAttributes<HTMLAnchorElement>["target"];
  rel?: AnchorHTMLAttributes<HTMLAnchorElement>["rel"];
};

const Link = ({
  href,
  title,
  className = "",
  children,
  endIcon,
  startIcon,
  hoverUnderline = true,
  scroll = true,
  onClick,
  target,
  rel,
}: LinkProps) => {
  return (
    <NextLink
      href={href}
      scroll={scroll}
      onClick={onClick}
      target={target}
      rel={rel}
      className={`group hover:text-primary-700 dark:hover:text-primary-300 focus-visible:ring-primary-500 text-primary-600 dark:text-primary-400 relative flex w-fit items-center gap-2 rounded-sm text-sm font-medium transition-colors duration-200 outline-none focus-visible:ring-2 ${className} `}
    >
      {startIcon && <span className="size-4">{startIcon}</span>}

      {/* Container for text and underline */}
      <span className="relative">
        {children || title}
        {hoverUnderline && (
          <span className="bg-primary-600 dark:bg-primary-400 absolute -bottom-1 left-0 h-0.5 w-0 transition-all duration-300 group-hover:w-full group-focus-visible:w-full" />
        )}
      </span>

      {endIcon && (
        <span className="size-4 transition-transform duration-200 group-hover:translate-x-1">
          {endIcon}
        </span>
      )}
    </NextLink>
  );
};

export default Link;
