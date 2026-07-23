import { NextResponse } from "next/server";
import { fetchLiveDisasterEvents } from "@/lib/disasters";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const events = await fetchLiveDisasterEvents();
    return NextResponse.json({
      updated_at: new Date().toISOString(),
      count: events.length,
      events,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to load events",
        events: [],
      },
      { status: 500 },
    );
  }
}
