"use client";

import { useEffect, useMemo, useState } from "react";
import { api, Expense, ScopeEntry, ScopeStatus, TaxonomyNode } from "@/lib/api";

/** DESIGN.md 4.2 스코프 체크: 포함 ✓ / 불포함 ✗ / 미확인 ? — 미확인이 기본값 */
const NEXT_STATUS: Record<ScopeStatus, ScopeStatus> = {
  unknown: "included",
  included: "excluded",
  excluded: "unknown",
};

const STATUS_UI: Record<ScopeStatus, { mark: string; cls: string; label: string }> = {
  included: { mark: "✓", cls: "border-trust text-trust", label: "포함" },
  excluded: { mark: "✗", cls: "border-ink-soft text-ink-soft", label: "불포함" },
  unknown: { mark: "?", cls: "border-flag text-flag", label: "미확인" },
};

function flatten(nodes: TaxonomyNode[]): { slug: string; name: string; depth: number }[] {
  const out: { slug: string; name: string; depth: number }[] = [];
  const walk = (ns: TaxonomyNode[], depth: number) => {
    for (const n of ns) {
      out.push({ slug: n.slug, name: n.name, depth });
      walk(n.children, depth + 1);
    }
  };
  walk(nodes, 0);
  return out;
}

export default function ExpenseForm({
  taxonomy,
  editing,
  onClose,
  onSaved,
}: {
  taxonomy: TaxonomyNode[];
  editing: Expense | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const flat = useMemo(() => flatten(taxonomy), [taxonomy]);
  const [slug, setSlug] = useState(editing?.taxonomy_slug ?? "");
  const [title, setTitle] = useState(editing?.title ?? "");
  const [planned, setPlanned] = useState(
    editing?.planned_amount != null ? String(editing.planned_amount) : ""
  );
  const [actual, setActual] = useState(
    editing?.actual_amount != null ? String(editing.actual_amount) : ""
  );
  const [vendorName, setVendorName] = useState(editing?.vendor?.name ?? "");
  const [paidAt, setPaidAt] = useState(editing?.paid_at ?? "");
  const [memo, setMemo] = useState(editing?.memo ?? "");
  const [scope, setScope] = useState<ScopeEntry[]>(editing?.scope ?? []);
  const [askHints, setAskHints] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // 카테고리 선택 → 숨은비용 사전에서 scope 체크리스트 로드 (5.6)
  useEffect(() => {
    if (!slug) return;
    api
      .glossary(slug)
      .then((entries) => {
        const hints: Record<string, string> = {};
        for (const g of entries) if (g.ask_vendor) hints[g.slug] = g.ask_vendor;
        setAskHints(hints);
        setScope((prev) => {
          const have = new Set(prev.map((s) => s.key));
          const added = entries
            .filter((g) => !have.has(g.slug))
            .map((g) => ({ key: g.slug, label: g.name, status: "unknown" as ScopeStatus }));
          // 카테고리를 바꾼 경우: 기존 입력값(편집 중 상태)은 유지하고 새 항목만 추가
          return [...prev, ...added];
        });
      })
      .catch(() => {});
  }, [slug]);

  async function save() {
    if (!slug) return;
    setSaving(true);
    try {
      const body = {
        taxonomy_slug: slug,
        title: title || undefined,
        planned_amount: planned ? Number(planned) : null,
        actual_amount: actual ? Number(actual) : null,
        scope,
        vendor_name: vendorName || undefined,
        paid_at: paidAt || null,
        memo: memo || undefined,
      };
      if (editing) await api.patchExpense(editing.id, body);
      else await api.createExpense(body);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!editing) return;
    await api.deleteExpense(editing.id);
    onSaved();
  }

  const inputCls =
    "mt-1 w-full rounded-xl border border-blush bg-white p-3 outline-none focus:border-blush-deep";

  return (
    <div className="fixed inset-0 z-10 flex items-end justify-center bg-ink/30" onClick={onClose}>
      <div
        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-ivory p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{editing ? "기록 수정" : "지출 기록"}</h2>
          <button onClick={onClose} className="p-1 text-ink-soft">
            닫기
          </button>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium">카테고리</span>
            <select value={slug} onChange={(e) => setSlug(e.target.value)} className={inputCls}>
              <option value="">선택해 주세요</option>
              {flat.map((t) => (
                <option key={t.slug} value={t.slug}>
                  {"  ".repeat(t.depth) + t.name}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-medium">
                예상 <span className="font-normal text-ink-soft">(원)</span>
              </span>
              <input
                type="number"
                inputMode="numeric"
                value={planned}
                onChange={(e) => setPlanned(e.target.value)}
                className={`num ${inputCls}`}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">
                실지출 <span className="font-normal text-ink-soft">(원)</span>
              </span>
              <input
                type="number"
                inputMode="numeric"
                value={actual}
                onChange={(e) => setActual(e.target.value)}
                className={`num ${inputCls}`}
              />
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-medium">
              항목 이름 <span className="font-normal text-ink-soft">(선택)</span>
            </span>
            <input
              type="text"
              value={title}
              placeholder="예: 리허설 헬퍼비"
              onChange={(e) => setTitle(e.target.value)}
              className={inputCls}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-medium">
                업체 <span className="font-normal text-ink-soft">(선택)</span>
              </span>
              <input
                type="text"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">
                지불일 <span className="font-normal text-ink-soft">(선택)</span>
              </span>
              <input
                type="date"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
                className={inputCls}
              />
            </label>
          </div>

          {scope.length > 0 && (
            <section>
              <span className="text-sm font-medium">포함 범위</span>
              <p className="mt-0.5 text-xs text-ink-soft">
                탭해서 포함 ✓ → 불포함 ✗ → 미확인 ? 순서로 바꿀 수 있어요.
              </p>
              <ul className="mt-2 space-y-1.5">
                {scope.map((s, i) => {
                  const ui = STATUS_UI[s.status];
                  return (
                    <li key={s.key}>
                      <button
                        type="button"
                        onClick={() =>
                          setScope((prev) =>
                            prev.map((p, j) =>
                              j === i ? { ...p, status: NEXT_STATUS[p.status] } : p
                            )
                          )
                        }
                        className="flex w-full items-center gap-3 rounded-xl bg-white p-3 text-left"
                      >
                        <span
                          className={`num flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-sm font-semibold ${ui.cls}`}
                        >
                          {ui.mark}
                        </span>
                        <span className="flex-1 text-sm">{s.label}</span>
                        <span className="text-xs text-ink-soft">{ui.label}</span>
                      </button>
                      {s.status === "unknown" && askHints[s.key] && (
                        <p className="mt-1 pl-9 text-xs text-flag">
                          물어보세요: “{askHints[s.key]}”
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <label className="block">
            <span className="text-sm font-medium">
              메모 <span className="font-normal text-ink-soft">(선택)</span>
            </span>
            <textarea
              value={memo}
              rows={2}
              onChange={(e) => setMemo(e.target.value)}
              className={inputCls}
            />
          </label>

          <button
            onClick={save}
            disabled={!slug || saving}
            className="w-full rounded-xl bg-blush-deep p-3.5 font-semibold text-white transition-opacity disabled:opacity-40"
          >
            {saving ? "저장 중…" : "저장"}
          </button>
          {editing && (
            <button onClick={remove} className="w-full p-2 text-sm text-ink-soft underline">
              이 기록 삭제
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
