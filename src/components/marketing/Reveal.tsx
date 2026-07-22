"use client";

import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

const variants: Record<string, Variants> = {
  line: {
    hidden: { y: "110%" },
    visible: { y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } },
  },
  rotation: {
    hidden: { rotateX: 90, opacity: 0, transformPerspective: 800 },
    visible: {
      rotateX: 0,
      opacity: 1,
      transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] },
    },
  },
  fade: {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  },
};

export function Reveal({
  children,
  type = "fade",
  delay = 0,
  className,
}: {
  children: ReactNode;
  type?: "line" | "rotation" | "fade";
  delay?: number;
  className?: string;
}) {
  if (type === "line") {
    return (
      <span className={`inline-block overflow-hidden ${className ?? ""}`}>
        <motion.span
          className="inline-block"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-10%" }}
          variants={variants.line}
          transition={{ delay }}
        >
          {children}
        </motion.span>
      </span>
    );
  }
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-10%" }}
      variants={variants[type]}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}
