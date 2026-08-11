import type { ReactNode } from "react";
import { Reveal } from "./Reveal";

export function GhostCard({
  number,
  title,
  children,
  delay = 0,
}: {
  number: string;
  title: string;
  children: ReactNode;
  delay?: number;
}) {
  return (
    <Reveal type="fade" delay={delay}>
      <div className="group relative overflow-hidden rounded-2xl border border-border bg-surface p-8 transition-colors hover:border-accent/50">
        <span className="pointer-events-none absolute -right-4 -top-10 select-none text-[9rem] font-bold leading-none text-surface-2 transition-colors group-hover:text-accent/10">
          {number}
        </span>
        <div className="relative">
          <h3 className="mb-3 text-xl font-semibold text-foreground">{title}</h3>
          <p className="text-muted">{children}</p>
        </div>
      </div>
    </Reveal>
  );
}
