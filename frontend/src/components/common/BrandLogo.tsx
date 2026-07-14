import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  /** Header compact | footer / auth larger */
  size?: "sm" | "md" | "lg";
  /** Wrap in Link to home (default true) */
  asLink?: boolean;
  className?: string;
  /** Hide wordmark (icon only) */
  iconOnly?: boolean;
  onClick?: () => void;
};

const SIZES = {
  sm: { img: "h-8 w-8", text: "text-lg", gap: "gap-2" },
  md: { img: "h-9 w-9", text: "text-xl", gap: "gap-2" },
  lg: { img: "h-10 w-10", text: "text-2xl", gap: "gap-2.5" },
} as const;

/**
 * Brand mark + wordmark TechNest.
 * Icon: /logo-mark.png (public). Wordmark = CSS text (dark/light safe).
 */
export function BrandLogo({
  size = "md",
  asLink = true,
  className,
  iconOnly = false,
  onClick,
}: BrandLogoProps) {
  const s = SIZES[size];
  const inner = (
    <>
      <img
        src="/logo-mark.png"
        alt=""
        width={40}
        height={40}
        className={cn(s.img, "object-contain shrink-0 select-none")}
        draggable={false}
      />
      {!iconOnly && (
        <span className={cn(s.text, "font-bold text-primary tracking-tight")}>
          TechNest
        </span>
      )}
    </>
  );

  const classes = cn(
    "inline-flex items-center shrink-0",
    s.gap,
    className
  );

  if (asLink) {
    return (
      <Link to="/" className={classes} onClick={onClick} aria-label="TechNest - Trang chủ">
        {inner}
      </Link>
    );
  }

  return (
    <div className={classes} onClick={onClick} role="img" aria-label="TechNest">
      {inner}
    </div>
  );
}
