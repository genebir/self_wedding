"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, Post, Profile, session } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import ShareCard from "./components/ShareCard";
import Composer from "./components/Composer";

export default function FeedPage() {
  const PAGE = 20;
  const [posts, setPosts] = useState<Post[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [composing, setComposing] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const loggedIn = typeof window !== "undefined" && !!session.token();

  const load = useCallback(async () => {
    try {
      const page = await api.posts();
      setPosts(page);
      setHasMore(page.length === PAGE);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoaded(true);
    }
    if (session.token()) {
      api.profile().then(setProfile).catch(() => {});
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (posts.length === 0) return;
    const page = await api.posts(posts[posts.length - 1].id);
    setPosts((prev) => [...prev, ...page]);
    setHasMore(page.length === PAGE);
  }, [posts]);

  useEffect(() => {
    load();
  }, [load]);

  if (!loaded) return null;

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between pt-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">맑음</h1>
          <p className="mt-0.5 text-sm text-ink-soft">
            서로의 준비가 서로의 기준선이 돼요 ·{" "}
            <Link href="/about" className="underline">
              원칙
            </Link>
          </p>
        </div>
        {loggedIn ? (
          <button
            onClick={() => setComposing(true)}
            className="rounded-xl bg-blush-deep px-4 py-2 text-sm font-semibold text-white"
          >
            + 기록
          </button>
        ) : (
          <Link href="/login" className="text-sm text-blush-deep">
            로그인
          </Link>
        )}
      </header>

      {error && (
        <p className="mt-12 text-center text-sm text-ink-soft">
          서버에 연결할 수 없어요. 백엔드가 실행 중인지 확인해 주세요.
        </p>
      )}

      {loggedIn && profile && !profile.wedding_date && (
        <Link
          href="/me"
          className="block rounded-2xl border border-blush bg-white p-4"
        >
          <p className="font-medium">먼저 예식일을 알려주세요</p>
          <p className="mt-0.5 text-sm text-ink-soft">
            오늘 기준으로 뭘 해야 하는지부터 정리해 드려요 →
          </p>
        </Link>
      )}

      {!error && posts.length === 0 && (
        <div className="rounded-2xl bg-white p-8 text-center text-sm text-ink-soft">
          아직 첫 기록이 없어요.
          <br />
          {loggedIn
            ? "준비 과정을 첫 번째로 남겨보세요."
            : "가입하면 준비 기록을 나눌 수 있어요."}
        </div>
      )}

      <ul className="space-y-3">
        {posts.map((p) => (
          <li key={p.id} className="rounded-2xl bg-white p-4">
            <Link href={`/post/${p.id}`} className="block">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-semibold">{p.nickname}</span>
                <span className="text-xs text-ink-soft">{timeAgo(p.created_at)}</span>
              </div>
              <p className="mt-1.5 whitespace-pre-wrap text-[15px]">{p.body}</p>
            </Link>
            {p.card && (
              <div className="mt-3">
                <ShareCard card={p.card} />
              </div>
            )}
            <Link
              href={`/post/${p.id}`}
              className="num mt-3 block text-xs text-ink-soft"
            >
              댓글 {p.comment_count}
            </Link>
          </li>
        ))}
      </ul>

      {hasMore && (
        <button
          onClick={loadMore}
          className="w-full rounded-2xl bg-white p-3 text-sm text-ink-soft"
        >
          이전 기록 더 보기
        </button>
      )}

      {composing && (
        <Composer
          onClose={() => setComposing(false)}
          onPosted={() => {
            setComposing(false);
            load();
          }}
        />
      )}
    </div>
  );
}
