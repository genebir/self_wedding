import type { MetadataRoute } from "next";
import { serverApi } from "@/lib/server-api";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const statics: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, changeFrequency: "hourly", priority: 0.8 },
    { url: `${SITE}/glossary`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/about`, changeFrequency: "monthly", priority: 0.5 },
  ];
  const entries = (await serverApi.glossary()) ?? [];
  return [
    ...statics,
    ...entries.map((g) => ({
      url: `${SITE}/glossary/${g.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    })),
  ];
}
