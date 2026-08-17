"use client";

import { useCallback, useEffect, useRef } from "react";
import { WheelPicker, WheelPickerWrapper } from "@/components/wheel-picker";
import type { Category } from "@/lib/types";

/// Sélecteur de catégorie en « wheel pick » (style roue iOS). Le filtre ne
/// s'applique QUE lorsqu'on clique sur un item, pas au scroll. Le highlight
/// wrapper est transparent et ignore les clics (`pointer-events: none`) pour
/// laisser passer les événements vers les items en dessous.

const ALL = "__all__";

type Option = { value: string; label: string };

export function CategoryWheelPicker({
  categories,
  value,
  onChange,
}: {
  categories: Category[];
  /// `null` = aucune catégorie sélectionnée (« Tout »).
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const options: Option[] = [
    { value: ALL, label: "Tout" },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ];

  const wrapperRef = useRef<HTMLDivElement>(null);

  /// Clic délégué sur le wrapper : on identifie l'item cliqué via
  /// `data-index` et on applique le filtre.
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const target = (e.target as HTMLElement).closest("[data-index]");
      if (!target) return;
      const idx = Number(target.getAttribute("data-index"));
      if (Number.isNaN(idx) || idx < 0 || idx >= options.length) return;
      const opt = options[idx];
      onChange(opt.value === ALL ? null : (opt.value as string));
    },
    [options, onChange],
  );

  // Centre l'item actif au montage.
  useEffect(() => {
    const el = wrapperRef.current?.querySelector("[data-rwp]");
    if (!el) return;
    const active = value ?? ALL;
    const idx = options.findIndex((o) => o.value === active);
    if (idx === -1) return;
    const itemH = 36;
    el.scrollTo({ top: idx * itemH, behavior: "instant" });
  }, [value, options]);

  return (
    <WheelPickerWrapper
      ref={wrapperRef}
      className="w-full rwp-fade-mask"
      onClick={handleClick}
    >
      <WheelPicker
        options={options}
        defaultValue={value ?? ALL}
        infinite
        visibleCount={20}
        optionItemHeight={36}
        scrollSensitivity={8}
        classNames={{
          highlightWrapper:
            "bg-transparent shadow-none pointer-events-none",
          highlightItem: "pointer-events-none",
        }}
      />
    </WheelPickerWrapper>
  );
}
