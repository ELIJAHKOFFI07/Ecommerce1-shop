"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Field, Input } from "./ui";

type Member = { id: string; name: string; memberNumber: string; email: string };

/// Sélecteur de membre pour le back-office : on tape un nom, un numéro
/// ou un e-mail, on choisit dans la liste, le nom choisi reste affiché.
export function MemberPicker({ onPick, label = "Membre" }: { onPick: (id: string | null) => void; label?: string }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Member[]>([]);
  const [picked, setPicked] = useState<Member | null>(null);

  useEffect(() => {
    if (picked || q.trim().length < 2) return;
    const t = setTimeout(async () => {
      try {
        const r = await api<{ items: Member[] }>(`/api/admin/users?q=${encodeURIComponent(q.trim())}&limit=8`);
        setResults(r.items);
      } catch {
        setResults([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q, picked]);

  if (picked) {
    return (
      <div className="space-y-1.5">
        <span className="block text-sm font-semibold">{label}</span>
        <div className="flex items-center justify-between rounded-md border border-border-strong bg-muted px-4 py-3">
          <span>
            <span className="font-semibold">{picked.name}</span> <span className="text-sm text-muted-foreground">{picked.memberNumber}</span>
          </span>
          <button
            type="button"
            onClick={() => {
              setPicked(null);
              onPick(null);
              setQ("");
            }}
            className="cursor-pointer text-sm font-semibold underline underline-offset-4"
          >
            Changer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <Field label={label} htmlFor="member-q">
        <Input
          id="member-q"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            if (e.target.value.trim().length < 2) setResults([]);
          }}
          placeholder="Nom, numéro ou e-mail"
          autoComplete="off"
        />
      </Field>
      {results.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-md border border-border-strong bg-card shadow-lg" role="listbox">
          {results.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => {
                  setPicked(m);
                  setResults([]);
                  onPick(m.id);
                }}
                className="flex w-full cursor-pointer flex-col items-start px-4 py-2.5 text-left hover:bg-muted"
              >
                <span className="font-medium">{m.name}</span>
                <span className="text-xs text-muted-foreground">
                  {m.memberNumber} · {m.email}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
