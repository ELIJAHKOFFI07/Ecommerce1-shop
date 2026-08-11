"use client";

import { motion } from "framer-motion";

export function Testimonial({
  quote,
  author,
  role,
  progress,
}: {
  quote: string;
  author: string;
  role: string;
  progress: number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-8">
      <p className="mb-6 text-lg text-foreground">&ldquo;{quote}&rdquo;</p>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="font-semibold text-accent">{author}</p>
          <p className="text-sm text-muted">{role}</p>
        </div>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-surface-2">
        <motion.div
          className="h-full bg-accent"
          initial={{ width: 0 }}
          whileInView={{ width: `${progress}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
