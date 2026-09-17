"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Alert, Button, Card, Field, Input, Select, DAYS } from "@/components/ui";

export function FormationForm({ offices, fixedOfficeId }: { offices: { id: string; name: string }[]; fixedOfficeId?: string }) {
  const router = useRouter();
  const [f, setF] = useState({ officeId: fixedOfficeId ?? offices[0]?.id ?? "", type: "TRAINING", title: "", dayOfWeek: "1", date: "", timeSlot: "", location: "", notes: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await api("/api/admin/formations", {
        method: "POST",
        json: {
          officeId: f.officeId, type: f.type, title: f.title, timeSlot: f.timeSlot || null, location: f.location || null, notes: f.notes || undefined,
          dayOfWeek: f.type === "TRAINING" ? Number(f.dayOfWeek) : null, date: f.type === "CONFERENCE" ? f.date : null,
        },
      });
      setMsg({ tone: "success", text: "Enregistré." });
      setF({ ...f, title: "", timeSlot: "", location: "", notes: "", date: "" });
      router.refresh();
    } catch (err) {
      setMsg({ tone: "error", text: err instanceof Error ? err.message : "Erreur." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-5">
      <h3 className="mb-4 font-semibold">Ajouter</h3>
      <form onSubmit={submit} className="space-y-4">
        {!fixedOfficeId && (
          <Field label="Bureau" htmlFor="o">
            <Select id="o" value={f.officeId} onChange={set("officeId")} required>
              {offices.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type" htmlFor="t">
            <Select id="t" value={f.type} onChange={set("type")}>
              <option value="TRAINING">Formation (chaque semaine)</option>
              <option value="CONFERENCE">Conférence (date fixe)</option>
            </Select>
          </Field>
          {f.type === "TRAINING" ? (
            <Field label="Jour" htmlFor="d">
              <Select id="d" value={f.dayOfWeek} onChange={set("dayOfWeek")}>
                {DAYS.slice(1).map((d, i) => (
                  <option key={d} value={i + 1}>
                    {d}
                  </option>
                ))}
              </Select>
            </Field>
          ) : (
            <Field label="Date" htmlFor="dt">
              <Input id="dt" type="date" value={f.date} onChange={set("date")} required />
            </Field>
          )}
        </div>
        <Field label="Titre" htmlFor="ti">
          <Input id="ti" value={f.title} onChange={set("title")} required maxLength={120} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Horaire" htmlFor="h">
            <Input id="h" value={f.timeSlot} onChange={set("timeSlot")} placeholder="18h – 20h" maxLength={40} />
          </Field>
          <Field label="Lieu" htmlFor="l">
            <Input id="l" value={f.location} onChange={set("location")} maxLength={120} />
          </Field>
        </div>
        <Field label="Notes (facultatif)" htmlFor="n">
          <Input id="n" value={f.notes} onChange={set("notes")} maxLength={2000} />
        </Field>
        {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
        <Button type="submit" full disabled={busy || !f.officeId}>
          Ajouter
        </Button>
      </form>
    </Card>
  );
}
