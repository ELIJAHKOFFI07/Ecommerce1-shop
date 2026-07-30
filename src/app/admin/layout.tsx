import { SetupNotice } from "@/components/play/SetupNotice";
import { isBackendConfigured } from "@/lib/backend/client";
import { AdminNav } from "./AdminNav";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <AdminNav />
      {/* min-w-0 : sans lui, ce flex item garde `min-width: auto` et s'élargit
          au contenu (tableaux), ce qui fait déborder toute la page au lieu de
          laisser défiler les conteneurs `overflow-x-auto` internes. */}
      <main className="min-w-0 flex-1 p-4 md:p-6 lg:p-8 xl:p-10">
        {isBackendConfigured() ? children : <SetupNotice />}
      </main>
    </div>
  );
}
