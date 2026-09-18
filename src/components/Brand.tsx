import Link from "next/link";
import { cx } from "./ui";

/// Logotype DreamShop. Un mot en Cormorant, « Shop » en or.
export function Brand({ href = "/", className, tag }: { href?: string; className?: string; tag?: string }) {
  return (
    <Link href={href} className={cx("inline-flex items-center gap-2 font-display text-2xl font-bold tracking-tight", className)} aria-label="DreamShop — accueil">
      <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-primary text-lg leading-none text-[#e5b35d]">D</span>
      <span>
        Dream<span className="text-accent">Shop</span>
      </span>
      {tag && <span className="ml-1 rounded bg-primary px-1.5 py-0.5 font-sans text-[10px] font-bold uppercase tracking-wider text-primary-foreground">{tag}</span>}
    </Link>
  );
}
