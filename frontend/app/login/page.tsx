"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, session } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!nickname || !password) return;
    setBusy(true);
    setError("");
    try {
      const res =
        mode === "login"
          ? await api.login(nickname, password)
          : await api.register(nickname, password);
      session.save(res.token, res.nickname);
      router.push("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "다시 시도해 주세요");
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    "mt-1 w-full rounded-xl border border-blush bg-white p-3 outline-none focus:border-blush-deep";

  return (
    <div className="pt-12">
      <h1 className="text-2xl font-bold tracking-tight">
        {mode === "login" ? "다시 만나서 반가워요" : "닉네임 하나면 충분해요"}
      </h1>
      <p className="mt-2 text-sm text-ink-soft">
        실명도, 연락처도 받지 않아요. 읽는 건 가입 없이도 언제나 열려 있어요.{" "}
        <a href="/about" className="underline">
          원칙 보기
        </a>
      </p>
      <div className="mt-8 space-y-4">
        <label className="block">
          <span className="text-sm font-medium">닉네임</span>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">비밀번호</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            className={inputCls}
          />
          {mode === "register" && (
            <span className="mt-1 block text-xs text-ink-soft">8자 이상</span>
          )}
        </label>
        {error && <p className="text-sm text-flag">{error}</p>}
        <button
          onClick={submit}
          disabled={!nickname || !password || busy}
          className="w-full rounded-xl bg-blush-deep p-3.5 font-semibold text-white transition-opacity disabled:opacity-40"
        >
          {busy ? "확인 중…" : mode === "login" ? "로그인" : "가입하기"}
        </button>
        <button
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError("");
          }}
          className="w-full p-2 text-sm text-ink-soft underline"
        >
          {mode === "login" ? "처음이에요 — 가입하기" : "이미 계정이 있어요 — 로그인"}
        </button>
      </div>
    </div>
  );
}
