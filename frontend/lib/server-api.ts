import { GlossaryEntry, TaxonomyNode } from "./api";

/** 서버 컴포넌트용 — 사전은 SEO 유입구라 서버에서 렌더한다(CLAUDE.md 3장). */
// 서버에서는 rewrite를 못 타므로 백엔드 절대 주소가 필요하다.
const API = process.env.BACKEND_URL ?? "http://localhost:8000";

async function get<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API}${path}`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export const serverApi = {
  glossary: () => get<GlossaryEntry[]>("/api/glossary"),
  glossaryEntry: (slug: string) => get<GlossaryEntry>(`/api/glossary/${slug}`),
  taxonomy: () => get<TaxonomyNode[]>("/api/taxonomy"),
};

export function taxonomyNames(nodes: TaxonomyNode[] | null): Record<string, string> {
  const map: Record<string, string> = {};
  const walk = (ns: TaxonomyNode[]) =>
    ns.forEach((n) => {
      map[n.slug] = n.name;
      walk(n.children);
    });
  if (nodes) walk(nodes);
  return map;
}
