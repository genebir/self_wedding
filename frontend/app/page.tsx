"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, BudgetSummary, ChecklistItem, Profile } from "@/lib/api";
import { dday, won, wonShort } from "@/lib/format";

export default function Home() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, c, s] = await Promise.all([api.profile(), api.checklist(), api.summary()]);
      setProfile(p);
      setItems(c);
      setSummary(s);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!loaded) return null;
  if (error)
    return (
      <p className="mt-16 text-center text-ink-soft">
        서버에 연결할 수 없어요. 백엔드가 실행 중인지 확인해 주세요.
      </p>
    );
  if (!profile?.wedding_date) return <Onboarding onSaved={load} />;

  const nextActions = items.filter((i) => !i.done).slice(0, 3);

  return (
    <div className="space-y-8">
      <header className="pt-4">
        <p className="text-sm text-ink-soft">예식까지</p>
        <h1 className="num text-4xl font-bold tracking-tight">
          {profile.d_day !== null ? dday(profile.d_day) : "—"}
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          {profile.wedding_date} · {profile.region ?? "지역 미설정"}
        </p>
      </header>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-semibold">이번에 할 일</h2>
          <Link href="/checklist" className="text-sm text-blush-deep">
            전체 보기
          </Link>
        </div>
        {nextActions.length === 0 ? (
          <div className="rounded-2xl bg-white p-5 text-sm text-ink-soft">
            체크리스트가 비어 있어요.{" "}
            <Link href="/checklist" className="text-blush-deep underline">
              예식일 기준으로 만들기
            </Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {nextActions.map((i) => (
              <li key={i.id} className="flex items-center justify-between rounded-2xl bg-white p-4">
                <div>
                  <p className="font-medium">{i.title}</p>
                  {i.description && (
                    <p className="mt-0.5 text-xs text-ink-soft">{i.description}</p>
                  )}
                </div>
                {i.d_day !== null && (
                  <span
                    className={`num ml-3 shrink-0 text-sm ${
                      i.d_day < 0 ? "font-semibold text-flag" : "text-ink-soft"
                    }`}
                  >
                    {dday(i.d_day)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {summary && (
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-semibold">예산</h2>
            <Link href="/budget" className="text-sm text-blush-deep">
              트래커 열기
            </Link>
          </div>
          <div className="rounded-2xl bg-white p-5">
            <p className="num text-2xl font-bold">
              {won(summary.actual_total)}
              <span className="ml-2 text-sm font-normal text-ink-soft">
                {wonShort(summary.actual_total)} 지출
              </span>
            </p>
            {summary.budget_total ? (
              <>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-blush">
                  <div
                    className="h-full rounded-full bg-blush-deep transition-all"
                    style={{
                      width: `${Math.min(100, (summary.actual_total / summary.budget_total) * 100)}%`,
                    }}
                  />
                </div>
                <p className="num mt-2 text-xs text-ink-soft">
                  총예산 {won(summary.budget_total)} 중{" "}
                  {Math.round((summary.actual_total / summary.budget_total) * 100)}% 사용
                </p>
              </>
            ) : (
              <p className="mt-2 text-xs text-ink-soft">총예산을 설정하면 진행률이 보여요.</p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function Onboarding({ onSaved }: { onSaved: () => void }) {
  const [date, setDate] = useState("");
  const [region, setRegion] = useState("");
  const [budget, setBudget] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!date) return;
    setSaving(true);
    try {
      await api.putProfile({
        wedding_date: date,
        region: region || null,
        budget_total: budget ? Number(budget) * 10_000 : null,
      });
      await api.generateChecklist();
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="pt-12">
      <h1 className="text-2xl font-bold tracking-tight">
        결혼 준비,
        <br />
        맑게 시작해요
      </h1>
      <p className="mt-2 text-sm text-ink-soft">
        예식일만 알려주시면 오늘 기준으로 할 일을 정리해 드려요.
      </p>
      <div className="mt-8 space-y-4">
        <label className="block">
          <span className="text-sm font-medium">예식일</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full rounded-xl border border-blush bg-white p-3 outline-none focus:border-blush-deep"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">
            지역 <span className="font-normal text-ink-soft">(선택)</span>
          </span>
          <input
            type="text"
            value={region}
            placeholder="예: 수도권"
            onChange={(e) => setRegion(e.target.value)}
            className="mt-1 w-full rounded-xl border border-blush bg-white p-3 outline-none focus:border-blush-deep"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">
            총예산 <span className="font-normal text-ink-soft">(선택, 만원)</span>
          </span>
          <input
            type="number"
            inputMode="numeric"
            value={budget}
            placeholder="예: 3000"
            onChange={(e) => setBudget(e.target.value)}
            className="num mt-1 w-full rounded-xl border border-blush bg-white p-3 outline-none focus:border-blush-deep"
          />
        </label>
        <button
          onClick={save}
          disabled={!date || saving}
          className="w-full rounded-xl bg-blush-deep p-3.5 font-semibold text-white transition-opacity disabled:opacity-40"
        >
          {saving ? "준비 중…" : "시작하기"}
        </button>
      </div>
    </div>
  );
}
