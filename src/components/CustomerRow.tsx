"use client";

import { useState, useTransition } from "react";
import {
  logCallAction,
  sendEmailAction,
  sendSmsAction,
} from "@/actions/outreach";
import { scoreTone, type ProspectScore } from "@/lib/scoring";
import { FUNNEL_STAGES, type Customer } from "@/lib/types";

function phoneHref(phone: string | null | undefined) {
  if (!phone) return null;
  const digits = phone.replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : null;
}

export function CustomerRow({
  customer,
  score,
  rank,
}: {
  customer: Customer;
  score: ProspectScore;
  rank?: number;
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const callTo = customer.phone_mobile || customer.phone_cslb;
  const smsTo = customer.phone_mobile || customer.phone_cslb;
  const tel = phoneHref(callTo);
  const tone = scoreTone(score.grade);

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
            {rank != null && (
              <span className="text-xs font-medium text-[var(--muted)]">#{rank}</span>
            )}
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
              style={{ background: tone.bg, color: tone.fg }}
              title={score.reasons.join(" · ")}
            >
              {score.total}
              <span className="opacity-80">· {score.grade}</span>
            </span>
            <h3
              className="truncate text-lg text-[var(--ink)]"
              style={{ fontFamily: "var(--font-newsreader), Georgia, serif" }}
            >
              {customer.business_name}
            </h3>
            <span className="rounded-full border border-[var(--line)] bg-white/80 px-2 py-0.5 text-[11px] text-[var(--muted)]">
              {score.label}
            </span>
            {customer.enrichment_source === "apollo" && (
              <span className="rounded-full bg-[var(--accent)]/10 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-[var(--accent)]">
                Apollo
              </span>
            )}
            {customer.employee_count != null && (
              <span className="rounded-full border border-[var(--line)] bg-white/80 px-2 py-0.5 text-[11px] text-[var(--muted)]">
                {customer.employee_count} employees
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

          <div className="mb-4 rounded-xl border border-[var(--line)] bg-white/80 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-semibold">
                Prospect score · {score.total}/100 ({score.grade} · {score.label})
              </h4>
              <p className="text-xs text-[var(--muted)]">
                {score.reasons.join(" · ") || "Limited signals"}
              </p>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-5">
              {(
                [
                  ["Contact", score.breakdown.contactability, 30],
                  ["Complete", score.breakdown.completeness, 20],
                  ["License", score.breakdown.licenseQuality, 15],
                  ["ICP fit", score.breakdown.icpFit, 20],
                  ["Funnel", score.breakdown.funnelMomentum, 15],
                ] as const
              ).map(([label, value, max]) => (
                <div key={label}>
                  <div className="mb-1 flex justify-between text-[11px] text-[var(--muted)]">
                    <span>{label}</span>
                    <span>
                      {value}/{max}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-black/5">
                    <div
                      className="h-full rounded-full bg-[var(--accent)]"
                      style={{ width: `${(value / max) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

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
