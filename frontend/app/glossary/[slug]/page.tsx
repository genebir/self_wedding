import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { serverApi, taxonomyNames } from "@/lib/server-api";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const entry = await serverApi.glossaryEntry(slug);
  if (!entry) return { title: "숨은비용 사전 — 맑음" };
  return {
    title: `${entry.name} 뜻과 체크포인트 — 맑음 숨은비용 사전`,
    description: entry.summary,
  };
}

export default async function GlossaryEntryPage({ params }: Props) {
  const { slug } = await params;
  const [entry, taxonomy] = await Promise.all([
    serverApi.glossaryEntry(slug),
    serverApi.taxonomy(),
  ]);
  if (!entry) notFound();
  const names = taxonomyNames(taxonomy);

  return (
    <article className="space-y-5">
      <header className="pt-4">
        <Link href="/glossary" className="text-sm text-ink-soft">
          ← 숨은비용 사전
        </Link>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">{entry.name}</h1>
        {entry.category_slug && (
          <p className="mt-1 text-sm text-ink-soft">
            {names[entry.category_slug] ?? entry.category_slug} 카테고리
          </p>
        )}
      </header>

      <p className="font-medium leading-relaxed">{entry.summary}</p>
      <p className="text-[15px] leading-relaxed">{entry.detail}</p>

      {entry.typical_note && (
        <p className="text-sm text-ink-soft">
          참고: {entry.typical_note}. 아직 표본 기반 통계가 아니라 일반적으로 언급되는
          범위예요. 실제 공유된 기록이 쌓이면 표본과 함께 보여드릴게요.
        </p>
      )}

      {entry.ask_vendor && (
        <div className="rounded-xl bg-white p-4">
          <p className="text-xs font-semibold text-flag">업체에 물어보세요</p>
          <p className="mt-1">“{entry.ask_vendor}”</p>
        </div>
      )}

      <div className="border-t border-blush pt-4 text-sm text-ink-soft">
        <p>
          다른 커플들은 실제로 얼마를 냈을까요?{" "}
          <Link href="/" className="text-blush-deep underline">
            준비 기록 피드
          </Link>
          에서 지출 카드를 확인해 보세요. 예산을 관리 중이라면{" "}
          <Link href="/budget" className="text-blush-deep underline">
            트래커
          </Link>
          의 포함 범위 체크에 이 항목이 자동으로 들어가 있어요.
        </p>
      </div>
    </article>
  );
}
