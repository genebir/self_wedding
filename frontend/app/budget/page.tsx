"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, AuthError, BudgetSummary, Expense, TaxonomyNode } from "@/lib/api";
import { won, wonShort } from "@/lib/format";
import ExpenseForm from "./ExpenseForm";

export default function BudgetPage() {
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [taxonomy, setTaxonomy] = useState<TaxonomyNode[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);

  const load = useCallback(async () => {
    const [e, s, t] = await Promise.all([api.expenses(), api.summary(), api.taxonomy()]);
    setExpenses(e);
    setSummary(s);
    setTaxonomy(t);
  }, []);

  useEffect(() => {
    load().catch((e) => {
      if (e instanceof AuthError) router.push("/login");
    });
  }, [load, router]);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between pt-4">
        <h1 className="text-2xl font-bold tracking-tight">예산 트래커</h1>
        <button
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          className="rounded-xl bg-blush-deep px-4 py-2 text-sm font-semibold text-white"
        >
          + 기록
        </button>
      </header>

      {summary && summary.by_category.length > 0 && (
        <section className="rounded-2xl bg-white p-5">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-ink-soft">실지출 합계</span>
            <span className="num font-bold">
              {won(summary.actual_total)}
              <span className="ml-1.5 text-xs font-normal text-ink-soft">
                {wonShort(summary.actual_total)}
              </span>
            </span>
          </div>
          <ul className="mt-3 space-y-1.5 border-t border-ivory pt-3">
            {summary.by_category.map((c) => (
              <li key={c.taxonomy_slug} className="flex justify-between text-sm">
                <span>
                  {c.taxonomy_name}
                  <span className="num ml-1 text-xs text-ink-soft">{c.count}건</span>
                </span>
                <span className="num">{won(c.actual)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {expenses.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center text-sm text-ink-soft">
          아직 기록이 없어요.
          <br />
          견적을 받았거나 계약금을 냈다면 첫 기록을 남겨보세요.
        </div>
      ) : (
        <ul className="space-y-2">
          {expenses.map((e) => {
            const unknowns = e.scope.filter((s) => s.status === "unknown").length;
            return (
              <li key={e.id}>
                <button
                  onClick={() => {
                    setEditing(e);
                    setShowForm(true);
                  }}
                  className="w-full rounded-2xl bg-white p-4 text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {e.title || e.taxonomy_name}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-soft">
                        {e.taxonomy_name}
                        {e.vendor && ` · ${e.vendor.name}`}
                        {e.paid_at && ` · ${e.paid_at}`}
                      </p>
                      {unknowns > 0 && (
                        <p className="num mt-1 text-xs text-flag">
                          포함 여부 미확인 {unknowns}건 — 업체에 확인해 보세요
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      {e.actual_amount !== null ? (
                        <p className="num font-semibold">{won(e.actual_amount)}</p>
                      ) : e.planned_amount !== null ? (
                        <p className="num text-ink-soft">예상 {won(e.planned_amount)}</p>
                      ) : null}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {showForm && (
        <ExpenseForm
          taxonomy={taxonomy}
          editing={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            load();
          }}
        />
      )}
    </div>
  );
}
