import { createElement, type ElementType, type ReactNode } from "react";

/// Mot (ou groupe de mots) surligné façon marqueur : une barre inclinée passe
/// derrière le texte. Variantes : `default` (jaune soleil), `orange`, `vert`.
export function Marker({
  children,
  variant = "default",
  as: Tag = "span",
  className = "",
}: {
  children: ReactNode;
  variant?: "default" | "orange" | "vert";
  as?: ElementType;
  className?: string;
}) {
  const variantClass =
    variant === "orange" ? " orange" : variant === "vert" ? " vert" : "";
  return createElement(
    Tag,
    { className: `marker${variantClass} ${className}` },
    <span>{children}</span>,
  );
}