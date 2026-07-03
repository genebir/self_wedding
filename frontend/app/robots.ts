import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // 개인 화면은 색인 대상이 아니다
        disallow: ["/me", "/budget", "/checklist", "/login"],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
