import type { MetadataRoute } from "next";

/** Installierbar als App (Startbildschirm), Start direkt in "Meine Reisen" */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Polycare Reisekosten",
    short_name: "Reisekosten",
    description: "Dienstreisen erfassen, Belege fotografieren, Reisekosten einreichen",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#153c28",
    lang: "de",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
