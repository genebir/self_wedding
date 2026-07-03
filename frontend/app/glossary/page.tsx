"use client";

import { useEffect, useState } from "react";
import { api, GlossaryEntry, TaxonomyNode } from "@/lib/api";

export default function GlossaryPage() {
  const [entries, setEntries] = useState<GlossaryEntry[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.glossary(), api.taxonomy()])
      .then(([g, t]) => {
        setEntries(g);
        const map: Record<string, string> = {};
        const walk = (ns: TaxonomyNode[]) =>
          ns.forEach((n) => {
            map[n.slug] = n.name;
            walk(n.children);
          });
        walk(t);
        setNames(map);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <header className="pt-4">
        <h1 className="text-2xl font-bold tracking-tight">숨은비용 사전</h1>
        <p className="mt-1 text-sm text-ink-soft">
          견적에 잘 안 보이는 항목들이에요. 계약 전에 확인하면 당황할 일이 줄어요.
        </p>
      </header>

      <ul className="space-y-2">
        {entries.map((g) => {
          const isOpen = open === g.slug;
          return (
            <li key={g.slug} className="overflow-hidden rounded-2xl bg-white">
              <button
                onClick={() => setOpen(isOpen ? null : g.slug)}
                className="w-full p-4 text-left"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{g.name}</span>
                  {g.category_slug && (
                    <span className="shrink-0 rounded-full bg-blush px-2.5 py-0.5 text-xs">
                      {names[g.category_slug] ?? g.category_slug}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-ink-soft">{g.summary}</p>
              </button>
              {isOpen && (
                <div className="space-y-3 border-t border-ivory px-4 py-4 text-sm">
                  <p>{g.detail}</p>
                  {g.typical_note && (
                    <p className="text-ink-soft">
                      참고: {g.typical_note}. 아직 표본 기반 통계가 아니라 일반적으로
                      언급되는 범위예요.
                    </p>
                  )}
                  {g.ask_vendor && (
                    <div className="rounded-xl bg-ivory p-3">
                      <p className="text-xs font-semibold text-flag">업체에 물어보세요</p>
                      <p className="mt-1">“{g.ask_vendor}”</p>
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
