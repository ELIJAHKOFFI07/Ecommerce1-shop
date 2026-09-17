"use client";

import { useRouter } from "next/navigation";

export function MonthPicker({ value }: { value: string }) {
  const router = useRouter();
  return (
    <input
      type="month"
      value={value}
      max={new Date().toISOString().slice(0, 7)}
      aria-label="Mois"
      onChange={(e) => e.target.value && router.push(`/admin/comptabilite?mois=${e.target.value}`)}
      className="h-10 rounded-md border border-border-strong bg-card px-3 text-sm font-semibold"
    />
  );
}
