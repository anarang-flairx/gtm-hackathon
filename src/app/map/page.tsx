import { DisasterMap } from "@/components/DisasterMap";

export const dynamic = "force-dynamic";

export default function MapPage() {
  return (
    <div>
      <section className="mb-6">
        <h2
          className="text-2xl text-[var(--ink)]"
          style={{ fontFamily: "var(--font-newsreader), Georgia, serif" }}
        >
          Disaster focus map
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-[var(--muted)]">
          Live US hazards from USGS earthquakes and NWS alerts (floods, fires,
          tsunamis, storms). Use epicenter size to find where homes are most
          likely damaged — then outbound to nearby micro contractors.
        </p>
      </section>
      <DisasterMap />
    </div>
  );
}
