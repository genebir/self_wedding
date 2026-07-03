// 기본은 same-origin — next.config.ts의 rewrite가 /api를 백엔드로 프록시한다.
const API = process.env.NEXT_PUBLIC_API_URL ?? "";

export type ScopeStatus = "included" | "excluded" | "unknown";

export interface ScopeEntry {
  key: string;
  label: string;
  status: ScopeStatus;
}

export interface TaxonomyNode {
  id: number;
  slug: string;
  name: string;
  children: TaxonomyNode[];
}

export interface Expense {
  id: number;
  taxonomy_slug: string;
  taxonomy_name: string;
  title: string | null;
  planned_amount: number | null;
  actual_amount: number | null;
  scope: ScopeEntry[];
  attributes: Record<string, unknown>;
  vendor: { id: number; name: string; region: string | null } | null;
  paid_at: string | null;
  memo: string | null;
}

export interface ExpenseIn {
  taxonomy_slug: string;
  title?: string;
  planned_amount?: number | null;
  actual_amount?: number | null;
  scope?: ScopeEntry[];
  vendor_name?: string;
  vendor_region?: string;
  paid_at?: string | null;
  memo?: string;
}

export interface BudgetSummary {
  budget_total: number | null;
  planned_total: number;
  actual_total: number;
  by_category: {
    taxonomy_slug: string;
    taxonomy_name: string;
    planned: number;
    actual: number;
    count: number;
  }[];
}

export interface GlossaryEntry {
  id: number;
  slug: string;
  name: string;
  category_slug: string | null;
  summary: string;
  detail: string;
  typical_note: string | null;
  ask_vendor: string | null;
}

export interface ChecklistItem {
  id: number;
  title: string;
  description: string | null;
  category_slug: string | null;
  due_date: string | null;
  d_day: number | null;
  done: boolean;
}

export interface Profile {
  id: number;
  wedding_date: string | null;
  region: string | null;
  budget_total: number | null;
  d_day: number | null;
}

export interface Card {
  category_slug: string;
  category_name: string;
  title: string | null;
  amount: number;
  scope: ScopeEntry[];
  vendor_name: string | null;
  region: string | null;
  paid_month: string | null;
  trust_grade: string;
}

export interface CardIn {
  expense_id?: number;
  category_slug?: string;
  title?: string;
  amount?: number;
  scope?: ScopeEntry[];
  vendor_name?: string;
  region?: string;
  paid_month?: string;
}

export interface Post {
  id: number;
  nickname: string;
  body: string;
  card: Card | null;
  comment_count: number;
  created_at: string;
  mine: boolean;
}

export interface Comment {
  id: number;
  nickname: string;
  body: string;
  created_at: string;
}

export interface PostDetail extends Post {
  comments: Comment[];
}

export class AuthError extends Error {}

const TOKEN_KEY = "malgeum.token";
const NICK_KEY = "malgeum.nickname";

export const session = {
  token: () => (typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY)),
  nickname: () => (typeof window === "undefined" ? null : localStorage.getItem(NICK_KEY)),
  save(token: string, nickname: string) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(NICK_KEY, nickname);
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(NICK_KEY);
  },
};

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const token = session.token();
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (res.status === 401) throw new AuthError("로그인이 필요해요");
  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.json())?.detail ?? "";
    } catch {}
    throw new Error(detail || `요청에 실패했어요 (${res.status})`);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

export const api = {
  register: (nickname: string, password: string) =>
    req<{ token: string; nickname: string }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ nickname, password }),
    }),
  login: (nickname: string, password: string) =>
    req<{ token: string; nickname: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ nickname, password }),
    }),
  deleteAccount: () => req<void>("/api/auth/me", { method: "DELETE" }),

  posts: () => req<Post[]>("/api/posts"),
  post: (id: number) => req<PostDetail>(`/api/posts/${id}`),
  createPost: (body: string, card?: CardIn) =>
    req<Post>("/api/posts", { method: "POST", body: JSON.stringify({ body, card }) }),
  deletePost: (id: number) => req<void>(`/api/posts/${id}`, { method: "DELETE" }),
  createComment: (postId: number, body: string) =>
    req<Comment>(`/api/posts/${postId}/comments`, {
      method: "POST",
      body: JSON.stringify({ body }),
    }),
  deleteComment: (id: number) => req<void>(`/api/posts/comments/${id}`, { method: "DELETE" }),

  profile: () => req<Profile>("/api/profile"),
  putProfile: (body: Partial<Profile>) =>
    req<Profile>("/api/profile", { method: "PUT", body: JSON.stringify(body) }),
  taxonomy: () => req<TaxonomyNode[]>("/api/taxonomy"),
  expenses: () => req<Expense[]>("/api/expenses"),
  createExpense: (body: ExpenseIn) =>
    req<Expense>("/api/expenses", { method: "POST", body: JSON.stringify(body) }),
  patchExpense: (id: number, body: Partial<ExpenseIn>) =>
    req<Expense>(`/api/expenses/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteExpense: (id: number) => req<void>(`/api/expenses/${id}`, { method: "DELETE" }),
  summary: () => req<BudgetSummary>("/api/expenses/summary"),
  glossary: (category?: string) =>
    req<GlossaryEntry[]>(`/api/glossary${category ? `?category=${category}` : ""}`),
  checklist: () => req<ChecklistItem[]>("/api/checklist"),
  createChecklist: (body: { title: string; description?: string; due_date?: string }) =>
    req<ChecklistItem>("/api/checklist", { method: "POST", body: JSON.stringify(body) }),
  generateChecklist: () =>
    req<ChecklistItem[]>("/api/checklist/generate", { method: "POST" }),
  patchChecklist: (id: number, body: { done?: boolean }) =>
    req<ChecklistItem>(`/api/checklist/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
};
