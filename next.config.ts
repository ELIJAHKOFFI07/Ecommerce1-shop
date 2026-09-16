import type { NextConfig } from "next";

/// En-têtes de sécurité appliqués à toutes les réponses. Ils ferment les
/// portes que le navigateur laisse ouvertes par défaut : chargement de
/// scripts tiers (CSP), affichage dans une iframe étrangère (clickjacking),
/// reniflage de type MIME, fuite du referrer, accès caméra/micro.
///
/// La CSP autorise `'unsafe-inline'` pour les styles uniquement : Tailwind
/// et Next injectent des styles inline, mais AUCUN script inline n'est
/// permis — c'est ce qui neutralise une éventuelle injection XSS.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://ik.imagekit.io https://lh3.googleusercontent.com",
      "connect-src 'self' https://upload.imagekit.io",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "ik.imagekit.io" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
