"use client";

import { useState, useTransition } from "react";
import {
  logCallAction,
  sendEmailAction,
  sendSmsAction,
} from "@/actions/outreach";
import { FUNNEL_STAGES, type Customer } from "@/lib/types";

function phoneHref(phone: string | null | undefined) {
  if (!phone) return null;
  const digits = phone.replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : null;
}

export function CustomerRow({ customer }: { customer: Customer }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const callTo = customer.phone_mobile || customer.phone_cslb;
  const smsTo = customer.phone_mobile || customer.phone_cslb;
  const tel = phoneHref(callTo);

  function run(
    action: (fd: FormData) => Promise<{ ok: boolean; error?: string; provider?: string }>,
    form: HTMLFormElement,
    successLabel: string,
  ) {
    const fd = new FormData(form);
    startTransition(async () => {
      const res = await action(fd);
      if (!res.ok) {
        setMessage(res.error || "Action failed");
        return;
      }
      setMessage(
        `${successLabel}${res.provider === "demo" ? " (demo mode — logged)" : " · sent"}`,
      );
      form.reset();
    });
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel)] shadow-[var(--shadow)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-4 px-4 py-4 text-left hover:bg-black/[0.02] sm:px-5"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3
              className="truncate text-lg text-[var(--ink)]"
              style={{ fontFamily: "var(--font-newsreader), Georgia, serif" }}
            >
              {customer.business_name}
            </h3>
            {customer.enrichment_source === "apollo" && (
              <span className="rounded-full bg-[var(--accent)]/10 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-[var(--accent)]">
                Apollo
              </span>
            )}
            {customer.business_type && (
              <span className="rounded-full border border-[var(--line)] bg-white/80 px-2 py-0.5 text-[11px] text-[var(--muted)]">
                {customer.business_type}
              </span>
            )}
            {customer.funnel_stage && (
              <span className="rounded-full bg-[var(--accent-2)]/10 px-2 py-0.5 text-[11px] font-medium text-[var(--accent-2)]">
                {FUNNEL_STAGES.find((s) => s.id === customer.funnel_stage)?.short ||
                  customer.funnel_stage}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {[customer.city, customer.county, customer.state]
              .filter(Boolean)
              .join(" · ")}
            {customer.classification ? ` · ${customer.classification}` : ""}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {customer.icp_slugs.map((slug) => (
              <span
                key={slug}
                className="rounded-md border border-[var(--line)] bg-white/80 px-2 py-0.5 text-[11px] text-[var(--muted)]"
              >
                {slug}
              </span>
            ))}
          </div>
        </div>
        <div className="shrink-0 text-right text-sm text-[var(--muted)]">
          <p>{customer.email || "No email"}</p>
          <p className="mt-1">{callTo || "No phone"}</p>
          <p className="mt-2 text-[var(--accent)]">{open ? "Hide tools" : "Open tools"}</p>
        </div>
      </button>

      {open && (
        <div className="border-t border-[var(--line)] bg-white/50 px-4 py-4 sm:px-5">
          {message && (
            <p className="mb-3 rounded-lg border border-[var(--accent)]/20 bg-[var(--accent)]/5 px-3 py-2 text-sm text-[var(--accent)]">
              {message}
            </p>
          )}
          <div className="grid gap-4 lg:grid-cols-3">
            <form
              className="space-y-2 rounded-xl border border-[var(--line)] bg-white/80 p-3"
              onSubmit={(e) => {
                e.preventDefault();
                run(sendEmailAction, e.currentTarget, "Email logged");
              }}
            >
              <h4 className="text-sm font-semibold">Email</h4>
              <input type="hidden" name="customerId" value={customer.id} />
              <input
                name="to"
                required
                defaultValue={customer.email || ""}
                placeholder="to@"
                className="w-full rounded-lg border border-[var(--line)] px-2.5 py-2 text-sm"
              />
              <input
                name="subject"
                required
                defaultValue={`Quick intro — ${customer.business_name}`}
                className="w-full rounded-lg border border-[var(--line)] px-2.5 py-2 text-sm"
              />
              <textarea
                name="body"
                required
                rows={4}
                defaultValue={`Hi ${customer.title || "there"},\n\nWe help contractors like ${customer.business_name} streamline outbound GTM. Open to a short call this week?\n\nBest`}
                className="w-full rounded-lg border border-[var(--line)] px-2.5 py-2 text-sm"
              />
              <button
                disabled={pending || !customer.email}
                className="w-full rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Send email
              </button>
            </form>

            <form
              className="space-y-2 rounded-xl border border-[var(--line)] bg-white/80 p-3"
              onSubmit={(e) => {
                e.preventDefault();
                run(logCallAction, e.currentTarget, "Call logged");
              }}
            >
              <h4 className="text-sm font-semibold">Phone</h4>
              <input type="hidden" name="customerId" value={customer.id} />
              <input type="hidden" name="to" value={callTo || ""} />
              {tel ? (
                <a
                  href={tel}
                  className="block rounded-lg border border-[var(--accent-2)] px-3 py-2 text-center text-sm font-medium text-[var(--accent-2)]"
                >
                  Call {callTo}
                </a>
              ) : (
                <p className="text-sm text-[var(--muted)]">No phone on file</p>
              )}
              <select
                name="outcome"
                className="w-full rounded-lg border border-[var(--line)] px-2.5 py-2 text-sm"
                defaultValue="connected"
              >
                <option value="connected">Connected</option>
                <option value="no_answer">No answer</option>
                <option value="voicemail">Voicemail</option>
                <option value="wrong_number">Wrong number</option>
              </select>
              <textarea
                name="notes"
                rows={3}
                placeholder="Call notes"
                className="w-full rounded-lg border border-[var(--line)] px-2.5 py-2 text-sm"
              />
              <button
                disabled={pending || !callTo}
                className="w-full rounded-lg bg-[var(--accent-2)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Log call
              </button>
            </form>

            <form
              className="space-y-2 rounded-xl border border-[var(--line)] bg-white/80 p-3"
              onSubmit={(e) => {
                e.preventDefault();
                run(sendSmsAction, e.currentTarget, "Text logged");
              }}
            >
              <h4 className="text-sm font-semibold">Text</h4>
              <input type="hidden" name="customerId" value={customer.id} />
              <input
                name="to"
                required
                defaultValue={smsTo || ""}
                placeholder="+1…"
                className="w-full rounded-lg border border-[var(--line)] px-2.5 py-2 text-sm"
              />
              <textarea
                name="body"
                required
                rows={4}
                defaultValue={`Hi — this is the GTM team. Saw ${customer.business_name} is active in ${customer.county || "CA"}. Open to a quick chat?`}
                className="w-full rounded-lg border border-[var(--line)] px-2.5 py-2 text-sm"
              />
              <button
                disabled={pending || !smsTo}
                className="w-full rounded-lg bg-[var(--ink)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Send text
              </button>
            </form>
          </div>
          <div className="mt-3 grid gap-2 text-xs text-[var(--muted)] sm:grid-cols-3">
            <p>Title: {customer.title || "—"}</p>
            <p>Domain: {customer.company_domain || "—"}</p>
            <p>
              LinkedIn:{" "}
              {customer.linkedin_url ? (
                <a
                  className="underline"
                  href={customer.linkedin_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  profile
                </a>
              ) : (
                "—"
              )}
            </p>
          </div>
        </div>
      )}
    </article>
  );
}
