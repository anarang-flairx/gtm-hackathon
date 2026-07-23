"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Prospects" },
  { href: "/customers", label: "Customers" },
  { href: "/tools", label: "Tools by ICP" },
  { href: "/stats", label: "Tools" },
  { href: "/map", label: "Disaster map" },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-[var(--line)]/80 bg-[rgba(255,252,246,0.72)] backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--muted)]">
            Outbound GTM
          </p>
          <h1
            className="mt-1 font-[family-name:var(--font-newsreader)] text-3xl tracking-tight text-[var(--ink)]"
            style={{ fontFamily: "var(--font-newsreader), Georgia, serif" }}
          >
            Prospect Desk
          </h1>
          <p className="mt-1 max-w-xl text-sm text-[var(--muted)]">
            Apollo-enriched prospects · custom pipelines · bulk outbound + disaster focus
          </p>
        </div>
        <nav className="flex gap-1 rounded-xl border border-[var(--line)] bg-white/70 p-1 shadow-[var(--shadow)]">
          {TABS.map((tab) => {
            const active =
              tab.href === "/"
                ? pathname === "/"
                : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "chip-active"
                    : "text-[var(--muted)] hover:bg-black/5 hover:text-[var(--ink)]"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
