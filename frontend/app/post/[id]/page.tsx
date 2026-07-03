"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api, PostDetail, session } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import ShareCard from "../../components/ShareCard";

export default function PostPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [post, setPost] = useState<PostDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const loggedIn = typeof window !== "undefined" && !!session.token();
  const me = typeof window !== "undefined" ? session.nickname() : null;

  const load = useCallback(async () => {
    try {
      setPost(await api.post(Number(id)));
    } catch {
      setNotFound(true);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function submitComment() {
    if (!comment.trim() || !post) return;
    setBusy(true);
    try {
      await api.createComment(post.id, comment.trim());
      setComment("");
      load();
    } finally {
      setBusy(false);
    }
  }

  async function removePost() {
    if (!post) return;
    await api.deletePost(post.id);
    router.push("/");
  }

  if (notFound)
    return (
      <p className="mt-16 text-center text-sm text-ink-soft">
        글이 없어요. <Link href="/" className="text-blush-deep underline">피드로 돌아가기</Link>
      </p>
    );
  if (!post) return null;

  return (
    <div className="space-y-5">
      <header className="pt-4">
        <Link href="/" className="text-sm text-ink-soft">
          ← 피드
        </Link>
      </header>

      <article className="rounded-2xl bg-white p-5">
        <div className="flex items-baseline justify-between">
          <span className="font-semibold">{post.nickname}</span>
          <span className="text-xs text-ink-soft">{timeAgo(post.created_at)}</span>
        </div>
        <p className="mt-2 whitespace-pre-wrap text-[15px]">{post.body}</p>
        {post.card && (
          <div className="mt-4">
            <ShareCard card={post.card} />
          </div>
        )}
        {me === post.nickname && (
          <button onClick={removePost} className="mt-4 text-xs text-ink-soft underline">
            이 글 삭제 (카드도 집계에서 빠져요)
          </button>
        )}
      </article>

      <section>
        <h2 className="num mb-2 text-sm font-semibold">댓글 {post.comments.length}</h2>
        <ul className="space-y-2">
          {post.comments.map((c) => (
            <li key={c.id} className="rounded-2xl bg-white p-4">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-semibold">{c.nickname}</span>
                <span className="text-xs text-ink-soft">{timeAgo(c.created_at)}</span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm">{c.body}</p>
              {me === c.nickname && (
                <button
                  onClick={async () => {
                    await api.deleteComment(c.id);
                    load();
                  }}
                  className="mt-2 text-xs text-ink-soft underline"
                >
                  삭제
                </button>
              )}
            </li>
          ))}
        </ul>

        {loggedIn ? (
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={comment}
              placeholder="궁금한 걸 물어보세요"
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitComment()}
              className="flex-1 rounded-xl border border-blush bg-white p-3 text-sm outline-none focus:border-blush-deep"
            />
            <button
              onClick={submitComment}
              disabled={!comment.trim() || busy}
              className="rounded-xl bg-blush-deep px-4 text-sm font-semibold text-white disabled:opacity-40"
            >
              등록
            </button>
          </div>
        ) : (
          <p className="mt-3 text-sm text-ink-soft">
            <Link href="/login" className="text-blush-deep underline">
              로그인
            </Link>
            하면 댓글을 남길 수 있어요.
          </p>
        )}
      </section>
    </div>
  );
}
