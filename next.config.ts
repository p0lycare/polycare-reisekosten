import type { NextConfig } from "next";

const SICHERHEIT = [
  // Internes Tool: Suchmaschinen sollen nichts davon aufnehmen
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
  // Nicht in fremde Seiten einbetten (Clickjacking), keine Plugins, keine fremde Basis-URL
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Kamera nur für die eigene Seite (Belegfoto), alles andere aus
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: SICHERHEIT }];
  },
};

export default nextConfig;
