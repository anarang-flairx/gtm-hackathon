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
          Tools
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Aggregate outreach stats across calls, emails, opens, and clicks.
        </p>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Customers" value={stats.totals.customers} />
        <StatCard label="# Emails" value={stats.totals.emails} hint="sent / logged" />
        <StatCard label="# Calls" value={stats.totals.calls} hint="logged outcomes" />
        <StatCard label="# Texts" value={stats.totals.texts} />
        <StatCard label="Mail opens" value={stats.totals.opens} />
        <StatCard label="Mail clicks" value={stats.totals.clicks} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--shadow)]">
          <h3 className="text-sm font-semibold">Last 7 days</h3>
          <div className="mt-4 flex h-40 items-end gap-2">
            {stats.last7.map((day) => (
              <div key={day.date} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-t-md bg-[var(--accent)]/80"
                  style={{ height: `${(day.count / maxDay) * 100}%`, minHeight: day.count ? 8 : 2 }}
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
          <h3 className="text-sm font-semibold">By ICP</h3>
          <div className="mt-3 space-y-3">
            {icps.map((icp) => {
              const row = stats.byIcp[icp.slug] || { email: 0, phone: 0, sms: 0 };
              return (
                <div key={icp.id} className="rounded-xl border border-[var(--line)] bg-white/70 px-3 py-2">
                  <p className="text-sm font-medium">{icp.name}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Email {row.email} · Calls {row.phone} · Texts {row.sms}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--shadow)]">
          <h3 className="text-sm font-semibold">Status breakdown</h3>
          <ul className="mt-3 space-y-2">
            {Object.entries(stats.statusBreakdown).length === 0 && (
              <li className="text-sm text-[var(--muted)]">
                No outreach yet — send from Customers or Tools by ICP.
              </li>
            )}
            {Object.entries(stats.statusBreakdown).map(([status, count]) => (
              <li
                key={status}
                className="flex items-center justify-between rounded-lg border border-[var(--line)] bg-white/70 px-3 py-2 text-sm"
              >
                <span>{status}</span>
                <span className="font-medium">{count}</span>
              </li>
            ))}
          </ul>
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
                  <span className="font-medium uppercase tracking-wide text-[11px] text-[var(--accent)]">
                    {e.channel}
                  </span>
                  <span className="text-xs text-[var(--muted)]">
                    {new Date(e.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="mt-1 text-[var(--muted)]">
                  {e.status}
                  {e.to_address ? ` · ${e.to_address}` : ""}
                  {e.subject ? ` · ${e.subject}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
