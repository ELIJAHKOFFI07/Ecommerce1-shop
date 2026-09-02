"use client";

import { useEffect, useMemo, useRef } from "react";
import { ImagePlus, X } from "lucide-react";
import { MAX_IMAGE_BYTES } from "@/lib/uploadImage";

/// Zone d'ajout de photos avec aperçu.
///
/// Remplace le `<input type="file">` brut, qui passait inaperçu : le contrôle
/// natif n'hérite pas des couleurs du thème et se confondait avec le fond.
export function ImagePicker({
  files,
  onChange,
  label = "Ajouter des photos",
  hint = "JPG ou PNG, 5 Mo maximum par image.",
}: {
  files: File[];
  onChange: (files: File[]) => void;
  label?: string;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Valeur dérivée plutôt que state : évite un rendu en cascade. L'effet ne
  // sert qu'à révoquer les URL d'objet, sinon les fichiers restent en mémoire
  // tant que l'onglet est ouvert.
  const previews = useMemo(
    () => files.map((f) => URL.createObjectURL(f)),
    [files],
  );
  useEffect(() => {
    return () => previews.forEach((u) => URL.revokeObjectURL(u));
  }, [previews]);

  function addFiles(incoming: FileList | null) {
    if (!incoming) return;
    onChange([...files, ...Array.from(incoming)]);
    // Permet de re-sélectionner le même fichier après une suppression.
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex w-full flex-col items-center justify-center gap-2 rounded-sm border border-dashed border-border bg-background px-4 py-6 text-center transition-colors hover:border-accent"
      >
        <ImagePlus className="h-6 w-6 text-accent" />
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted">{hint}</span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => addFiles(e.target.files)}
        className="hidden"
      />

      {files.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {files.map((file, i) => {
            const tooBig = file.size > MAX_IMAGE_BYTES;
            return (
              <div key={`${file.name}-${i}`} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previews[i]}
                  alt={file.name}
                  className={`aspect-square w-full rounded-lg object-cover ${
                    tooBig ? "opacity-40 ring-2 ring-red-500" : ""
                  }`}
                />
                <button
                  type="button"
                  onClick={() => onChange(files.filter((_, j) => j !== i))}
                  className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white"
                  aria-label={`Retirer ${file.name}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                {tooBig && (
                  <span className="mt-1 block text-[10px] text-red-400">
                    Trop lourde
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
