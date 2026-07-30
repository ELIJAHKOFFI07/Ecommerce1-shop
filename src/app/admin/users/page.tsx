import { createClient } from "@/lib/backend/server";
import type { Profile } from "@/lib/types";
import { UsersManager } from "./UsersManager";

export default async function AdminUsers() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  return <UsersManager users={(data as Profile[]) ?? []} />;
}
