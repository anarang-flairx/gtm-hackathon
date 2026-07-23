import { Suspense } from "react";
import { FiltersBar } from "@/components/FiltersBar";
import { ProspectList } from "@/components/ProspectList";
import { listCustomers, listIcps } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ icp?: string; q?: string; sort?: string }>;
}) {
  const sp = await searchParams;
  const sort = sp.sort === "name" ? "name" : "score";
  const [icps, customers] = await Promise.all([
    listIcps(),
    listCustomers({
      icpSlug: sp.icp,
      q: sp.q,
      limit: 200,
      sort,
      pipeline: "closed",
    }),
  ]);

  return (
    <div>
      <section className="mb-6">
        <h2
          className="text-2xl text-[var(--ink)]"
          style={{ fontFamily: "var(--font-newsreader), Georgia, serif" }}
        >
          Customers
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Closed deals only — prospects leave the Prospects tab when their
          pipeline is set to Project closed.
        </p>
      </section>

      <Suspense fallback={<p className="text-sm text-[var(--muted)]">Loading filters…</p>}>
        <FiltersBar icps={icps} totalShown={customers.length} basePath="/customers" />
      </Suspense>

      <ProspectList prospects={customers} sortByScore={sort === "score"} />
    </div>
  );
}
