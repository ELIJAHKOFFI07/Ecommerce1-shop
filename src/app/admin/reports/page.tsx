import { createClient } from "@/lib/backend/server";

type Report = {
  id: string;
  target_type: string;
  target_id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
};

export default async function AdminReports() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  const reports = (data as Report[]) ?? [];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-medium tracking-tight">Signalements ({reports.length})</h1>
      {reports.length === 0 ? (
        <p className="text-muted">Aucun signalement.</p>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div
              key={r.id}
              className="rounded-xl border border-border bg-surface p-4"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {r.target_type} · {r.reason}
                </span>
                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">
                  {r.status}
                </span>
              </div>
              {r.details && (
                <p className="mt-1 text-sm text-muted">{r.details}</p>
              )}
              <p className="mt-1 text-xs text-muted">
                Cible : {r.target_id} ·{" "}
                {new Date(r.created_at).toLocaleDateString("fr-FR")}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
