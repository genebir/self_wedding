import type { Metadata } from "next";
import Link from "next/link";
import { serverApi, taxonomyNames } from "@/lib/server-api";

export const metadata: Metadata = {
  title: "숨은비용 사전 — 맑음",
  description:
    "헬퍼비, 원본비, 피팅비, 얼리스타트비… 웨딩 견적에 잘 안 보이는 항목들을 계약 전에 확인하세요.",
};

export default async function GlossaryPage() {
  const [entries, taxonomy] = await Promise.all([serverApi.glossary(), serverApi.taxonomy()]);
  const names = taxonomyNames(taxonomy);

  return (
    <div className="space-y-6">
      <header className="pt-4">
        <h1 className="text-2xl font-bold tracking-tight">숨은비용 사전</h1>
        <p className="mt-1 text-sm text-ink-soft">
          견적에 잘 안 보이는 항목들이에요. 계약 전에 확인하면 당황할 일이 줄어요.
        </p>
      </header>

      {!entries ? (
        <p className="text-sm text-ink-soft">
          사전을 불러올 수 없어요. 잠시 후 다시 열어주세요.
        </p>
      ) : (
        <ul className="space-y-2">
          {entries.map((g) => (
            <li key={g.slug}>
              <Link href={`/glossary/${g.slug}`} className="block rounded-2xl bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{g.name}</span>
                  {g.category_slug && (
                    <span className="shrink-0 rounded-full bg-blush px-2.5 py-0.5 text-xs">
                      {names[g.category_slug] ?? g.category_slug}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-ink-soft">{g.summary}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
