"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ChecklistItem, Profile } from "@/lib/api";
import { dday } from "@/lib/format";

export default function ChecklistPage() {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const load = useCallback(async () => {
    const [c, p] = await Promise.all([api.checklist(), api.profile()]);
    setItems(c);
    setProfile(p);
    setLoaded(true);
  }, []);

  useEffect(() => {
    load().catch(() => setLoaded(true));
  }, [load]);

  async function toggle(item: ChecklistItem) {
    // 낙관적 갱신 — P3: 지하철에서도 즉각 반응해야 한다
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i))
    );
    try {
      await api.patchChecklist(item.id, { done: !item.done });
    } catch {
      load();
    }
  }

  async function addCustom() {
    if (!newTitle.trim()) return;
    await api.createChecklist({ title: newTitle.trim() });
    setNewTitle("");
    load();
  }

  if (!loaded) return null;

  const todo = items.filter((i) => !i.done);
  const done = items.filter((i) => i.done);

  return (
    <div className="space-y-6">
      <header className="pt-4">
        <h1 className="text-2xl font-bold tracking-tight">체크리스트</h1>
        {profile?.wedding_date && (
          <p className="mt-1 text-sm text-ink-soft">
            예식일 {profile.wedding_date} 기준으로 역산했어요.
          </p>
        )}
      </header>

      {items.length === 0 && (
        <div className="rounded-2xl bg-white p-6 text-center">
          <p className="text-sm text-ink-soft">
            {profile?.wedding_date
              ? "예식일 기준으로 표준 체크리스트를 만들 수 있어요."
              : "홈에서 예식일을 먼저 입력해 주세요."}
          </p>
          {profile?.wedding_date && (
            <button
              onClick={() => api.generateChecklist().then(load)}
              className="mt-3 rounded-xl bg-blush-deep px-5 py-2.5 text-sm font-semibold text-white"
            >
              체크리스트 만들기
            </button>
          )}
        </div>
      )}

      {todo.length > 0 && (
        <ul className="space-y-2">
          {todo.map((i) => (
            <Item key={i.id} item={i} onToggle={toggle} />
          ))}
        </ul>
      )}

      {items.length > 0 && (
        <div className="flex gap-2">
          <input
            type="text"
            value={newTitle}
            placeholder="직접 추가하기"
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCustom()}
            className="flex-1 rounded-xl border border-blush bg-white p-3 text-sm outline-none focus:border-blush-deep"
          />
          <button
            onClick={addCustom}
            disabled={!newTitle.trim()}
            className="rounded-xl bg-blush-deep px-4 text-sm font-semibold text-white disabled:opacity-40"
          >
            추가
          </button>
        </div>
      )}

      {done.length > 0 && (
        <details>
          <summary className="cursor-pointer text-sm text-ink-soft">
            완료 {done.length}개
          </summary>
          <ul className="mt-2 space-y-2">
            {done.map((i) => (
              <Item key={i.id} item={i} onToggle={toggle} />
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function Item({
  item,
  onToggle,
}: {
  item: ChecklistItem;
  onToggle: (i: ChecklistItem) => void;
}) {
  const overdue = !item.done && item.d_day !== null && item.d_day < 0;
  return (
    <li>
      <button
        onClick={() => onToggle(item)}
        className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-left"
      >
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors ${
            item.done
              ? "border-blush-deep bg-blush-deep text-white"
              : "border-blush bg-white"
          }`}
        >
          {item.done && "✓"}
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block font-medium ${item.done ? "text-ink-soft line-through" : ""}`}>
            {item.title}
          </span>
          {item.description && !item.done && (
            <span className="mt-0.5 block text-xs text-ink-soft">{item.description}</span>
          )}
        </span>
        {item.d_day !== null && (
          <span
            className={`num shrink-0 text-sm ${
              overdue ? "font-semibold text-flag" : "text-ink-soft"
            }`}
          >
            {dday(item.d_day)}
          </span>
        )}
      </button>
    </li>
  );
}
