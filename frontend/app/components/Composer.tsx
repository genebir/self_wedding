"use client";

import { useEffect, useMemo, useState } from "react";
import { api, Card, CardIn, Expense, TaxonomyNode } from "@/lib/api";
import { won } from "@/lib/format";
import ShareCard from "./ShareCard";

type CardMode = "none" | "expense" | "manual";

export default function Composer({
  onClose,
  onPosted,
}: {
  onClose: () => void;
  onPosted: () => void;
}) {
  const [body, setBody] = useState("");
  const [mode, setMode] = useState<CardMode>("none");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [taxonomy, setTaxonomy] = useState<TaxonomyNode[]>([]);
  const [expenseId, setExpenseId] = useState<number | null>(null);
  const [region, setRegion] = useState("");
  const [manual, setManual] = useState({ category_slug: "", amount: "", vendor_name: "", paid_month: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.expenses().then(setExpenses).catch(() => {});
    api.taxonomy().then(setTaxonomy).catch(() => {});
    api.profile().then((p) => setRegion(p.region ?? "")).catch(() => {});
  }, []);

  const shareable = expenses.filter((e) => e.actual_amount !== null);
  const flat = useMemo(() => {
    const out: { slug: string; name: string }[] = [];
    const walk = (ns: TaxonomyNode[]) =>
      ns.forEach((n) => {
        out.push({ slug: n.slug, name: n.name });
        walk(n.children);
      });
    walk(taxonomy);
    return out;
  }, [taxonomy]);

  // 공유 전 미리보기 = 카드 그 자체(DESIGN 4.4). 담기는 것 전부가 여기 보인다.
  const preview: Card | null = useMemo(() => {
    if (mode === "expense" && expenseId !== null) {
      const e = expenses.find((x) => x.id === expenseId);
      if (!e || e.actual_amount === null) return null;
      return {
        category_slug: e.taxonomy_slug,
        category_name: e.taxonomy_name,
        title: e.title,
        amount: e.actual_amount,
        scope: e.scope,
        vendor_name: e.vendor?.name ?? null,
        region: region || null,
        paid_month: e.paid_at ? e.paid_at.slice(0, 7) : null,
        trust_grade: "B",
      };
    }
    if (mode === "manual" && manual.category_slug && manual.amount) {
      const tx = flat.find((t) => t.slug === manual.category_slug);
      return {
        category_slug: manual.category_slug,
        category_name: tx?.name ?? manual.category_slug,
        title: null,
        amount: Number(manual.amount),
        scope: [],
        vendor_name: manual.vendor_name || null,
        region: region || null,
        paid_month: manual.paid_month || null,
        trust_grade: "B",
      };
    }
    return null;
  }, [mode, expenseId, expenses, manual, flat, region]);

  async function submit() {
    if (!body.trim()) return;
    setBusy(true);
    setError("");
    try {
      let card: CardIn | undefined;
      if (mode === "expense" && expenseId !== null) card = { expense_id: expenseId };
      else if (mode === "manual" && manual.category_slug && manual.amount)
        card = {
          category_slug: manual.category_slug,
          amount: Number(manual.amount),
          vendor_name: manual.vendor_name || undefined,
          region: region || undefined,
          paid_month: manual.paid_month || undefined,
        };
      await api.createPost(body.trim(), card);
      onPosted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "다시 시도해 주세요");
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    "mt-1 w-full rounded-xl border border-blush bg-white p-3 outline-none focus:border-blush-deep";
  const tabCls = (active: boolean) =>
    `rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
      active ? "bg-blush text-ink" : "bg-white text-ink-soft"
    }`;

  return (
    <div className="fixed inset-0 z-10 flex items-end justify-center bg-ink/30" onClick={onClose}>
      <div
        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-ivory p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">준비 기록 남기기</h2>
          <button onClick={onClose} className="p-1 text-ink-soft">
            닫기
          </button>
        </div>

        <textarea
          value={body}
          rows={4}
          placeholder="어떻게 준비하고 있나요? 계약 후기, 고민, 질문 모두 좋아요."
          onChange={(e) => setBody(e.target.value)}
          className={inputCls}
          autoFocus
        />

        <div className="mt-4">
          <span className="text-sm font-medium">지출 카드 붙이기</span>
          <span className="ml-1.5 text-xs text-ink-soft">(선택)</span>
          <div className="mt-2 flex gap-2">
            <button className={tabCls(mode === "none")} onClick={() => setMode("none")}>
              안 붙일래요
            </button>
            <button
              className={tabCls(mode === "expense")}
              onClick={() => setMode("expense")}
            >
              내 트래커에서
            </button>
            <button className={tabCls(mode === "manual")} onClick={() => setMode("manual")}>
              직접 입력
            </button>
          </div>

          {mode === "expense" &&
            (shareable.length === 0 ? (
              <p className="mt-3 text-sm text-ink-soft">
                실지출이 기록된 트래커 항목이 아직 없어요. 예산 탭에서 먼저 기록해 보세요.
              </p>
            ) : (
              <ul className="mt-3 space-y-1.5">
                {shareable.map((e) => (
                  <li key={e.id}>
                    <button
                      onClick={() => setExpenseId(expenseId === e.id ? null : e.id)}
                      className={`flex w-full items-center justify-between rounded-xl border p-3 text-left text-sm transition-colors ${
                        expenseId === e.id
                          ? "border-blush-deep bg-blush/40"
                          : "border-blush bg-white"
                      }`}
                    >
                      <span>
                        {e.title || e.taxonomy_name}
                        <span className="ml-1 text-xs text-ink-soft">{e.taxonomy_name}</span>
                      </span>
                      <span className="num">{won(e.actual_amount!)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ))}

          {mode === "manual" && (
            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-medium">카테고리</span>
                  <select
                    value={manual.category_slug}
                    onChange={(e) => setManual({ ...manual, category_slug: e.target.value })}
                    className={inputCls}
                  >
                    <option value="">선택</option>
                    {flat.map((t) => (
                      <option key={t.slug} value={t.slug}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-medium">금액 (원)</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={manual.amount}
                    onChange={(e) => setManual({ ...manual, amount: e.target.value })}
                    className={`num ${inputCls}`}
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-medium">업체 (선택)</span>
                  <input
                    type="text"
                    value={manual.vendor_name}
                    onChange={(e) => setManual({ ...manual, vendor_name: e.target.value })}
                    className={inputCls}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium">시기 (선택)</span>
                  <input
                    type="month"
                    value={manual.paid_month}
                    onChange={(e) => setManual({ ...manual, paid_month: e.target.value })}
                    className={inputCls}
                  />
                </label>
              </div>
            </div>
          )}

          {preview && (
            <div className="mt-3">
              <p className="mb-1.5 text-xs text-ink-soft">
                이 모습 그대로 공개돼요 — 시기는 월, 지역은 광역 단위까지만 담겨요.
              </p>
              <ShareCard card={preview} />
            </div>
          )}
        </div>

        {error && <p className="mt-3 text-sm text-flag">{error}</p>}
        <button
          onClick={submit}
          disabled={!body.trim() || busy}
          className="mt-5 w-full rounded-xl bg-blush-deep p-3.5 font-semibold text-white transition-opacity disabled:opacity-40"
        >
          {busy ? "올리는 중…" : "올리기"}
        </button>
      </div>
    </div>
  );
}
