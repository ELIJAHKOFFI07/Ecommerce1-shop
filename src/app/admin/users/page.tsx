import { createClient } from "@/lib/backend/server";
import type { Profile } from "@/lib/types";
import { ROLE_LABELS, roleOf } from "@/lib/roles";
import { AdminUserRow } from "./AdminUserRow";

export default async function AdminUsers() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  const users = (data as Profile[]) ?? [];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Utilisateurs ({users.length})</h1>
      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-muted">
            <tr>
              <th className="p-3">Utilisateur</th>
              <th className="p-3">Ville</th>
              <th className="p-3">Points</th>
              <th className="p-3">Rôle</th>
              <th className="p-3">Changer le rôle</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="p-3">
                  {u.full_name ?? u.username}
                  <span className="block text-xs text-muted">
                    @{u.username}
                  </span>
                </td>
                <td className="p-3 text-muted">{u.city ?? "—"}</td>
                <td className="p-3">{u.loyalty_points}</td>
                <td className="p-3">
                  <span
                    className={`whitespace-nowrap rounded px-1.5 py-0.5 text-xs ${
                      u.is_admin
                        ? "bg-gold/15 text-gold"
                        : u.is_seller
                          ? "bg-surface-2 text-foreground"
                          : "bg-surface-2 text-muted"
                    }`}
                  >
                    {ROLE_LABELS[roleOf(u) ?? "user"]}
                  </span>
                </td>
                <td className="p-3">
                  <AdminUserRow id={u.id} role={roleOf(u) ?? "user"} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
