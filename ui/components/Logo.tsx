import logoSrc from "../assets/ResearchTeam.svg";
import Image from "next/image";
import Link from "next/link";

const Logo = () => {
  return (
    <Link
      href="/"
      className="group flex items-center gap-1"
      aria-label="Go to Home"
    >
      <div className="shrink-0">
        <Image
          src={logoSrc}
          alt="Research Team Logo"
          className="h-16 w-auto"
          priority
        />
      </div>
      <div className="text-secondary-800 dark:text-secondary-400 hidden text-2xl font-bold transition-colors sm:block">
        Research
        <span className="text-primary-700 dark:text-primary-400">Team</span>
      </div>
    </Link>
  );
};

export default Logo;
