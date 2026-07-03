import { Card } from "@/lib/api";
import { won, wonShort } from "@/lib/format";

/** DESIGN.md 4.4 지출 카드 — 조용하게, 숫자가 주인공. */
export default function ShareCard({ card }: { card: Card }) {
  const included = card.scope.filter((s) => s.status === "included").length;
  const excluded = card.scope.filter((s) => s.status === "excluded").length;
  const unknown = card.scope.filter((s) => s.status === "unknown").length;
  return (
    <div className="rounded-xl border border-blush bg-ivory p-4">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium">
          {card.category_name}
          {card.title && <span className="text-ink-soft"> · {card.title}</span>}
        </span>
      </div>
      <p className="num mt-1 text-xl font-bold">
        {won(card.amount)}
        <span className="ml-1.5 text-sm font-normal text-ink-soft">
          {wonShort(card.amount)}
        </span>
      </p>
      {card.scope.length > 0 && (
        <p className="num mt-1.5 text-xs text-ink-soft">
          {included > 0 && <span className="text-trust">포함 {included}</span>}
          {excluded > 0 && <span>{included > 0 && " · "}불포함 {excluded}</span>}
          {unknown > 0 && (
            <span className="text-flag">
              {included + excluded > 0 && " · "}미확인 {unknown}
            </span>
          )}
        </p>
      )}
      <p className="mt-1.5 text-xs text-ink-soft">
        {[card.vendor_name, card.region, card.paid_month].filter(Boolean).join(" · ")}
      </p>
    </div>
  );
}
