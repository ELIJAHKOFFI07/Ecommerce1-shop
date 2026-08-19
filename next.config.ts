import type { NextConfig } from "next";

const supabaseHost = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
      : undefined;
  } catch {
    return undefined;
  }
})();

const nextConfig: NextConfig = {
  // Le dev server bloque par défaut les requêtes cross-origin vers ses
  // ressources de dev (HMR, chunks) : sans cette entrée, un téléphone
  // accédant au PC via son IP LAN ne termine jamais l'hydratation et les
  // pages restent figées sur les skeletons. Ne lister que l'IP WiFi
  // locale — jamais d'IP publique.
  allowedDevOrigins: ["192.168.1.129"],
  images: {
    remotePatterns: [
      // Storage public Supabase (avatars, images produits/boutiques).
      ...(supabaseHost
        ? [{ protocol: "https" as const, hostname: supabaseHost }]
        : []),
    ],
  },
};

export default nextConfig;
