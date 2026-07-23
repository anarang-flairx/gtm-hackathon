"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import type { Icp } from "@/lib/types";

export function FiltersBar({
  icps,
  totalShown,
}: {
  icps: Icp[];
  totalShown: number;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const icp = params.get("icp") || "";
  const q = params.get("q") || "";
  const sort = params.get("sort") || "score";

  function update(next: { icp?: string; q?: string; sort?: string }) {
    const sp = new URLSearchParams(params.toString());
    const nextIcp = next.icp !== undefined ? next.icp : icp;
    const nextQ = next.q !== undefined ? next.q : q;
    const nextSort = next.sort !== undefined ? next.sort : sort;
    if (nextIcp) sp.set("icp", nextIcp);
    else sp.delete("icp");
    if (nextQ) sp.set("q", nextQ);
    else sp.delete("q");
    if (nextSort && nextSort !== "score") sp.set("sort", nextSort);
    else sp.delete("sort");
    startTransition(() => {
      router.push(`/?${sp.toString()}`);
    });
  }

  return (
    <div className="mb-5 space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => update({ icp: "" })}
          className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
            !icp
              ? "chip-active"
              : "border-[var(--line)] bg-white/70 text-[var(--muted)]"
          }`}
        >
          All ICPs
        </button>
        {icps.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => update({ icp: item.slug })}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
              icp === item.slug
                ? "chip-active"
                : "border-[var(--line)] bg-white/70 text-[var(--muted)]"
            }`}
          >
            {item.name}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full max-w-xl flex-col gap-2 sm:flex-row sm:items-center">
          <input
            defaultValue={q}
            placeholder="Search business, city, email, license…"
            className="w-full rounded-xl border border-[var(--line)] bg-white/80 px-3 py-2 text-sm outline-none ring-[var(--accent)] focus:ring-2"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                update({ q: (e.target as HTMLInputElement).value });
              }
            }}
          />
          <select
            value={sort}
            onChange={(e) => update({ sort: e.target.value })}
            className="rounded-xl border border-[var(--line)] bg-white/80 px-3 py-2 text-sm text-[var(--ink)]"
          >
            <option value="score">Sort by score</option>
            <option value="name">Sort by name</option>
          </select>
        </div>
        <p className="text-sm text-[var(--muted)]">
          {pending ? "Filtering…" : `Showing ${totalShown} ranked prospects`}
        </p>
      </div>
    </div>
  );
}
