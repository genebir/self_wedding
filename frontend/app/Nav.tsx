"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "홈" },
  { href: "/budget", label: "예산" },
  { href: "/checklist", label: "체크리스트" },
  { href: "/glossary", label: "숨은비용" },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 border-t border-blush bg-ivory/95 backdrop-blur">
      <div className="mx-auto flex max-w-lg">
        {TABS.map((t) => {
          const active = t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex-1 py-3.5 text-center text-sm transition-colors ${
                active ? "font-semibold text-blush-deep" : "text-ink-soft"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
