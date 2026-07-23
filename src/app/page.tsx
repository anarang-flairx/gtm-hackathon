import { Suspense } from "react";
import { CustomerRow } from "@/components/CustomerRow";
import { FiltersBar } from "@/components/FiltersBar";
import { listCustomers, listIcps } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ icp?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const [icps, customers] = await Promise.all([
    listIcps(),
    listCustomers({ icpSlug: sp.icp, q: sp.q, limit: 120 }),
  ]);

  return (
    <div>
      <section className="mb-6">
        <h2
          className="text-2xl text-[var(--ink)]"
          style={{ fontFamily: "var(--font-newsreader), Georgia, serif" }}
        >
          Customers by ICP
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Expand any account to run email, phone, and text outreach tools.
        </p>
      </section>

      <Suspense fallback={<p className="text-sm text-[var(--muted)]">Loading filters…</p>}>
        <FiltersBar icps={icps} totalShown={customers.length} />
      </Suspense>

      <div className="space-y-3">
        {customers.map((customer) => (
          <CustomerRow key={customer.id} customer={customer} />
        ))}
        {customers.length === 0 && (
          <p className="rounded-xl border border-dashed border-[var(--line)] bg-white/50 px-4 py-10 text-center text-sm text-[var(--muted)]">
            No customers match this filter.
          </p>
        )}
      </div>
    </div>
  );
}
