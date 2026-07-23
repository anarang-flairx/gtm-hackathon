"use client";

import { useMemo, useState, useTransition } from "react";
import { bulkOutreachAction } from "@/actions/outreach";
import { CustomerRow } from "@/components/CustomerRow";
import type { RankedCustomer } from "@/lib/data";

type BulkChannel = "email" | "phone" | "sms";

export function ProspectList({
  prospects,
  sortByScore,
}: {
  prospects: RankedCustomer[];
  sortByScore?: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkChannel, setBulkChannel] = useState<BulkChannel | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const allIds = useMemo(() => prospects.map((p) => p.id), [prospects]);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => {
      if (allIds.every((id) => prev.has(id))) return new Set();
      return new Set(allIds);
    });
  }

  function runBulk(form: HTMLFormElement) {
    const fd = new FormData(form);
    fd.set("customerIds", Array.from(selected).join(","));
    if (bulkChannel) fd.set("channel", bulkChannel);
    startTransition(async () => {
      const res = await bulkOutreachAction(fd);
      if (!res.ok) {
        setStatus(res.error || "Bulk action failed");
        return;
      }
      setStatus(
        `Bulk ${bulkChannel}: ${res.sent} sent/logged · ${res.skipped} skipped`,
      );
      setBulkChannel(null);
      setSelected(new Set());
      form.reset();
    });
  }

  return (
    <div className="space-y-3">
      <div className="sticky top-0 z-10 rounded-2xl border border-[var(--line)] bg-[rgba(255,252,246,0.95)] p-3 shadow-[var(--shadow)] backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-[var(--ink)]">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            Select all ({selected.size} selected)
          </label>
          <div className="ml-auto flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!selected.size || pending}
              onClick={() => setBulkChannel("email")}
              className="rounded-lg border border-[var(--line)] bg-white px-3 py-1.5 text-sm font-medium disabled:opacity-40"
            >
              Bulk email
            </button>
            <button
              type="button"
              disabled={!selected.size || pending}
              onClick={() => setBulkChannel("phone")}
              className="rounded-lg border border-[var(--line)] bg-white px-3 py-1.5 text-sm font-medium disabled:opacity-40"
            >
              Bulk call
            </button>
            <button
              type="button"
              disabled={!selected.size || pending}
              onClick={() => setBulkChannel("sms")}
              className="rounded-lg border border-[var(--line)] bg-white px-3 py-1.5 text-sm font-medium disabled:opacity-40"
            >
              Bulk SMS
            </button>
          </div>
        </div>

        {status && (
          <p className="mt-2 text-sm text-[var(--accent)]">{status}</p>
        )}

        {bulkChannel && (
          <form
            className="mt-3 space-y-2 rounded-xl border border-[var(--line)] bg-white/90 p-3"
            onSubmit={(e) => {
              e.preventDefault();
              runBulk(e.currentTarget);
            }}
          >
            <p className="text-sm font-semibold capitalize">
              Bulk {bulkChannel === "phone" ? "call" : bulkChannel} ·{" "}
              {selected.size} prospects
            </p>
            {bulkChannel === "email" && (
              <>
                <input
                  name="subject"
                  required
                  placeholder="Subject"
                  defaultValue="Quick intro from Prospect Desk"
                  className="w-full rounded-lg border border-[var(--line)] px-2.5 py-2 text-sm"
                />
                <textarea
                  name="body"
                  required
                  rows={3}
                  defaultValue="Hi — wanted to introduce our GTM team. Open to a short call this week?"
                  className="w-full rounded-lg border border-[var(--line)] px-2.5 py-2 text-sm"
                />
              </>
            )}
            {bulkChannel === "sms" && (
              <textarea
                name="body"
                required
                rows={3}
                defaultValue="Hi — this is the GTM team. Open to a quick chat about your pipeline?"
                className="w-full rounded-lg border border-[var(--line)] px-2.5 py-2 text-sm"
              />
            )}
            {bulkChannel === "phone" && (
              <>
                <select
                  name="outcome"
                  defaultValue="connected"
                  className="w-full rounded-lg border border-[var(--line)] px-2.5 py-2 text-sm"
                >
                  <option value="connected">Connected</option>
                  <option value="no_answer">No answer</option>
                  <option value="voicemail">Voicemail</option>
                  <option value="wrong_number">Wrong number</option>
                </select>
                <textarea
                  name="body"
                  rows={2}
                  placeholder="Optional call notes"
                  className="w-full rounded-lg border border-[var(--line)] px-2.5 py-2 text-sm"
                />
              </>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={pending}
                className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {pending ? "Running…" : "Run bulk action"}
              </button>
              <button
                type="button"
                onClick={() => setBulkChannel(null)}
                className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {prospects.map((prospect, idx) => (
        <CustomerRow
          key={prospect.id}
          customer={prospect}
          score={prospect.score}
          rank={sortByScore ? idx + 1 : undefined}
          selected={selected.has(prospect.id)}
          onToggleSelect={toggle}
        />
      ))}

      {prospects.length === 0 && (
        <p className="rounded-xl border border-dashed border-[var(--line)] bg-white/50 px-4 py-10 text-center text-sm text-[var(--muted)]">
          No prospects match this filter.
        </p>
      )}
    </div>
  );
}
