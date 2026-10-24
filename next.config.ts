import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Internes Tool: Suchmaschinen sollen nichts davon aufnehmen
  async headers() {
    return [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }] }];
  },
};

export default nextConfig;
