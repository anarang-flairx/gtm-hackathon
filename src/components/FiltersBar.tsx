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

  function update(next: { icp?: string; q?: string }) {
    const sp = new URLSearchParams(params.toString());
    const nextIcp = next.icp !== undefined ? next.icp : icp;
    const nextQ = next.q !== undefined ? next.q : q;
    if (nextIcp) sp.set("icp", nextIcp);
    else sp.delete("icp");
    if (nextQ) sp.set("q", nextQ);
    else sp.delete("q");
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
          className={`rounded-full border px-3 py-1.5 text-sm ${
            !icp
              ? "border-[var(--accent)] bg-[var(--accent)] text-white"
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
            className={`rounded-full border px-3 py-1.5 text-sm ${
              icp === item.slug
                ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                : "border-[var(--line)] bg-white/70 text-[var(--muted)]"
            }`}
          >
            {item.name}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <input
          defaultValue={q}
          placeholder="Search business, city, email, license…"
          className="w-full max-w-md rounded-xl border border-[var(--line)] bg-white/80 px-3 py-2 text-sm outline-none ring-[var(--accent)] focus:ring-2"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              update({ q: (e.target as HTMLInputElement).value });
            }
          }}
        />
        <p className="text-sm text-[var(--muted)]">
          {pending ? "Filtering…" : `Showing ${totalShown} customers`}
        </p>
      </div>
    </div>
  );
}
