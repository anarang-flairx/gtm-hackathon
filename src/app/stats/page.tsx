import { FUNNEL_STAGES } from "@/lib/types";
import { getStats, listIcps } from "@/lib/data";

export const dynamic = "force-dynamic";

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--shadow)]">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
        {label}
      </p>
      <p
        className="mt-2 text-3xl text-[var(--ink)]"
        style={{ fontFamily: "var(--font-newsreader), Georgia, serif" }}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p>}
    </div>
  );
}

function FunnelBars({
  title,
  funnel,
  customers,
}: {
  title: string;
  funnel: Record<string, number>;
  customers: number;
}) {
  const max = Math.max(1, ...FUNNEL_STAGES.map((s) => funnel[s.id] || 0));
  return (
    <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--shadow)]">
      <div className="mb-3 flex items-end justify-between gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-xs text-[var(--muted)]">{customers} accounts</p>
      </div>
      <div className="space-y-2.5">
        {FUNNEL_STAGES.map((stage, idx) => {
          const value = funnel[stage.id] || 0;
          const prev =
            idx === 0 ? customers : funnel[FUNNEL_STAGES[idx - 1].id] || 0;
          const conv = prev > 0 ? Math.round((value / prev) * 100) : 0;
          return (
            <div key={stage.id}>
              <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                <span className="text-[var(--ink)]">
                  {idx + 1}. {stage.label}
                </span>
                <span className="text-[var(--muted)]">
                  {value}
                  {idx > 0 ? ` · ${conv}%` : ""}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-black/5">
                <div
                  className="h-full rounded-full bg-[var(--accent)]"
                  style={{ width: `${(value / max) * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default async function StatsPage() {
  const [stats, icps] = await Promise.all([getStats(), listIcps()]);
  const maxDay = Math.max(1, ...stats.last7.map((d) => d.count));

  return (
    <div>
      <section className="mb-6">
        <h2
          className="text-2xl text-[var(--ink)]"
          style={{ fontFamily: "var(--font-newsreader), Georgia, serif" }}
        >
          Tools & market funnel
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Outreach volume plus the full market funnel — overall and by ICP.
        </p>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Customers" value={stats.totals.customers} hint="micro sole owners" />
        <StatCard
          label="Messages sent"
          value={stats.totals.messagesSent}
          hint="email + text events"
        />
        <StatCard
          label="People messaged"
          value={stats.totals.messengers}
          hint="unique accounts touched"
        />
        <StatCard label="# Calls" value={stats.totals.calls} />
        <StatCard label="Mail opens" value={stats.totals.opens} />
        <StatCard label="Mail clicks" value={stats.totals.clicks} />
      </div>

      <section className="mt-8">
        <h3
          className="mb-3 text-lg text-[var(--ink)]"
          style={{ fontFamily: "var(--font-newsreader), Georgia, serif" }}
        >
          Market funnel
        </h3>
        <p className="mb-4 text-sm text-[var(--muted)]">
          First message → opened → clicked → responded → meeting → relationship →
          project requested → quoted → closed. Counts are cumulative (reached at
          least this stage).
        </p>
        <div className="grid gap-4 lg:grid-cols-2">
          <FunnelBars
            title="All ICPs"
            funnel={stats.funnel}
            customers={stats.totals.customers}
          />
          <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--shadow)]">
            <h3 className="text-sm font-semibold">Stage snapshot (exact)</h3>
            <ul className="mt-3 space-y-2">
              {FUNNEL_STAGES.map((stage) => (
                <li
                  key={stage.id}
                  className="flex items-center justify-between rounded-lg border border-[var(--line)] bg-white/70 px-3 py-2 text-sm"
                >
                  <span>{stage.short}</span>
                  <span className="font-medium">
                    {stats.funnelExact[stage.id] || 0}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </section>

      <section className="mt-8">
        <h3
          className="mb-3 text-lg text-[var(--ink)]"
          style={{ fontFamily: "var(--font-newsreader), Georgia, serif" }}
        >
          Metrics by ICP
        </h3>
        <div className="grid gap-4 lg:grid-cols-3">
          {icps.map((icp) => {
            const row = stats.byIcp[icp.slug];
            if (!row) return null;
            return (
              <div key={icp.id} className="space-y-3">
                <div className="rounded-2xl border border-[var(--line)] bg-white/70 px-4 py-3">
                  <p className="font-medium text-[var(--ink)]">{icp.name}</p>
                  {icp.description && (
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {icp.description}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    Messages {row.messagesSent} · People {row.messengers} · Email{" "}
                    {row.email} · Calls {row.phone} · Texts {row.sms}
                  </p>
                </div>
                <FunnelBars
                  title={`${icp.name} funnel`}
                  funnel={row.funnel}
                  customers={row.customers}
                />
              </div>
            );
          })}
        </div>
      </section>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--shadow)]">
          <h3 className="text-sm font-semibold">Last 7 days</h3>
          <div className="mt-4 flex h-40 items-end gap-2">
            {stats.last7.map((day) => (
              <div key={day.date} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-t-md bg-[var(--accent)]/80"
                  style={{
                    height: `${(day.count / maxDay) * 100}%`,
                    minHeight: day.count ? 8 : 2,
                  }}
                  title={`${day.count} events`}
                />
                <span className="text-[10px] text-[var(--muted)]">
                  {day.date.slice(5)}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--shadow)]">
          <h3 className="text-sm font-semibold">Recent activity</h3>
          <ul className="mt-3 space-y-2">
            {stats.recent.length === 0 && (
              <li className="text-sm text-[var(--muted)]">No events logged yet.</li>
            )}
            {stats.recent.map((e) => (
              <li
                key={e.id}
                className="rounded-lg border border-[var(--line)] bg-white/70 px-3 py-2 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--accent)]">
                    {e.channel}
                  </span>
                  <span className="text-xs text-[var(--muted)]">
                    {new Date(e.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="mt-1 text-[var(--muted)]">
                  {e.status}
                  {e.to_address ? ` · ${e.to_address}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
