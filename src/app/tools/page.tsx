import Link from "next/link";
import { CustomerRow } from "@/components/CustomerRow";
import { listCustomers, listIcps } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ToolsByIcpPage({
  searchParams,
}: {
  searchParams: Promise<{ icp?: string; channel?: string }>;
}) {
  const sp = await searchParams;
  const icps = await listIcps();
  const active = sp.icp || icps[0]?.slug || "b2-residential";
  const channel = sp.channel || "all";
  const customers = await listCustomers({ icpSlug: active, limit: 80 });

  const filtered =
    channel === "email"
      ? customers.filter((c) => c.email)
      : channel === "phone" || channel === "sms"
        ? customers.filter((c) => c.phone_mobile || c.phone_cslb)
        : customers;

  const activeIcp = icps.find((i) => i.slug === active);

  return (
    <div>
      <section className="mb-6">
        <h2
          className="text-2xl text-[var(--ink)]"
          style={{ fontFamily: "var(--font-newsreader), Georgia, serif" }}
        >
          Tools by ICP
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Filter the outbound stack by segment, then apply email, phone, or text
          tools across the list.
        </p>
      </section>

      <div className="mb-4 flex flex-wrap gap-2">
        {icps.map((icp) => (
          <Link
            key={icp.id}
            href={`/tools?icp=${icp.slug}&channel=${channel}`}
            className={`rounded-full border px-3 py-1.5 text-sm ${
              active === icp.slug
                ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                : "border-[var(--line)] bg-white/70 text-[var(--muted)]"
            }`}
          >
            {icp.name}
          </Link>
        ))}
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {[
          { id: "all", label: "All tools" },
          { id: "email", label: "Email-ready" },
          { id: "phone", label: "Call-ready" },
          { id: "sms", label: "Text-ready" },
        ].map((ch) => (
          <Link
            key={ch.id}
            href={`/tools?icp=${active}&channel=${ch.id}`}
            className={`rounded-lg border px-3 py-1.5 text-sm ${
              channel === ch.id
                ? "border-[var(--ink)] bg-[var(--ink)] text-white"
                : "border-[var(--line)] bg-white/70 text-[var(--muted)]"
            }`}
          >
            {ch.label}
          </Link>
        ))}
      </div>

      <div className="mb-4 rounded-2xl border border-[var(--line)] bg-white/70 px-4 py-3 text-sm text-[var(--muted)]">
        <strong className="text-[var(--ink)]">{activeIcp?.name}</strong>
        {" · "}
        {filtered.length} accounts ready for{" "}
        {channel === "all" ? "any channel" : channel}
      </div>

      <div className="space-y-3">
        {filtered.map((customer) => (
          <CustomerRow key={customer.id} customer={customer} />
        ))}
      </div>
    </div>
  );
}
