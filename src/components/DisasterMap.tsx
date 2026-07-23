"use client";

import dynamic from "next/dynamic";

const DisasterMapClient = dynamic(
  () =>
    import("@/components/DisasterMapClient").then((m) => m.DisasterMapClient),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[560px] items-center justify-center rounded-2xl border border-[var(--line)] bg-[#0b1c16] text-sm text-white/70">
        Loading US hazard radar…
      </div>
    ),
  },
);

export function DisasterMap() {
  return <DisasterMapClient />;
}
