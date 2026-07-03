const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

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

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.status === 204 ? (undefined as T) : res.json();
}

export const api = {
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
