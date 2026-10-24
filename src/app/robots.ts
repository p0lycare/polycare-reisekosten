import type { MetadataRoute } from "next";

/** Internes Tool: Durchsuchen für alle Suchmaschinen verbieten */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
