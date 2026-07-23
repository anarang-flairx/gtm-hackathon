import type { DisasterEvent, DisasterEventType } from "@/lib/types";

const US_BOUNDS = {
  minLat: 24.5,
  maxLat: 49.5,
  minLng: -125,
  maxLng: -66.5,
};

function inContiguousUs(lat: number, lng: number) {
  // Include Alaska / Hawaii loosely via separate checks
  if (lat >= US_BOUNDS.minLat && lat <= US_BOUNDS.maxLat && lng >= US_BOUNDS.minLng && lng <= US_BOUNDS.maxLng) {
    return true;
  }
  // Alaska
  if (lat >= 51 && lat <= 72 && lng >= -170 && lng <= -129) return true;
  // Hawaii
  if (lat >= 18 && lat <= 23 && lng >= -161 && lng <= -154) return true;
  return false;
}

function clampSeverity(n: number) {
  return Math.max(1, Math.min(10, n));
}

async function fetchUsgsEarthquakes(): Promise<DisasterEvent[]> {
  const url =
    "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson";
  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) return [];
  const geo = (await res.json()) as {
    features: Array<{
      id: string;
      properties: {
        mag: number | null;
        place: string | null;
        time: number;
        title: string;
        url: string;
        type: string;
      };
      geometry: { coordinates: [number, number, number] };
    }>;
  };

  return geo.features
    .map((f) => {
      const [lng, lat] = f.geometry.coordinates;
      if (!inContiguousUs(lat, lng)) return null;
      const mag = f.properties.mag ?? 2.5;
      return {
        id: `eq-${f.id}`,
        type: "earthquake" as const,
        title: f.properties.title || `M${mag} earthquake`,
        location: f.properties.place || "United States",
        lat,
        lng,
        severity: clampSeverity(mag),
        magnitude: mag,
        source: "USGS",
        url: f.properties.url,
        occurred_at: new Date(f.properties.time).toISOString(),
        summary: `Magnitude ${mag} · ${f.properties.place || "US"}`,
      };
    })
    .filter(Boolean) as DisasterEvent[];
}

function classifyNws(eventName: string, description: string): DisasterEventType {
  const hay = `${eventName} ${description}`.toLowerCase();
  if (hay.includes("tsunami")) return "tsunami";
  if (hay.includes("fire") || hay.includes("red flag") || hay.includes("smoke"))
    return "fire";
  if (hay.includes("flood") || hay.includes("flash flood")) return "flood";
  if (
    hay.includes("hurricane") ||
    hay.includes("tornado") ||
    hay.includes("tropical") ||
    hay.includes("storm") ||
    hay.includes("severe weather")
  )
    return "storm";
  return "other";
}

function nwsSeverityScore(
  severity: string | null,
  urgency: string | null,
  type: DisasterEventType,
) {
  let score = 3;
  const s = (severity || "").toLowerCase();
  const u = (urgency || "").toLowerCase();
  if (s === "extreme") score = 9;
  else if (s === "severe") score = 7;
  else if (s === "moderate") score = 5;
  else if (s === "minor") score = 3;
  if (u === "immediate") score += 1;
  if (type === "tsunami") score = Math.max(score, 8);
  if (type === "fire") score = Math.max(score, 5);
  if (type === "flood") score = Math.max(score, 4);
  return clampSeverity(score);
}

async function fetchNwsAlerts(): Promise<DisasterEvent[]> {
  const url =
    "https://api.weather.gov/alerts/active?status=actual&message_type=alert";
  const res = await fetch(url, {
    headers: {
      Accept: "application/geo+json",
      "User-Agent": "GTM-Hackathon-ProspectDesk (hackathon demo)",
    },
    next: { revalidate: 300 },
  });
  if (!res.ok) return [];

  const geo = (await res.json()) as {
    features: Array<{
      id: string;
      properties: {
        event: string;
        headline: string | null;
        areaDesc: string | null;
        severity: string | null;
        urgency: string | null;
        sent: string;
        description: string | null;
        web: string | null;
      };
      geometry: {
        type: string;
        coordinates?: unknown;
      } | null;
    }>;
  };

  const events: DisasterEvent[] = [];
  for (const f of geo.features) {
    const type = classifyNws(
      f.properties.event || "",
      f.properties.description || "",
    );
    if (!["flood", "fire", "tsunami", "storm"].includes(type)) continue;

    // Approximate centroid from polygon when available
    let lat: number | null = null;
    let lng: number | null = null;
    const g = f.geometry;
    if (g && Array.isArray(g.coordinates)) {
      const flat: number[][] = [];
      const walk = (node: unknown) => {
        if (!Array.isArray(node)) return;
        if (
          node.length >= 2 &&
          typeof node[0] === "number" &&
          typeof node[1] === "number"
        ) {
          flat.push([node[0] as number, node[1] as number]);
          return;
        }
        for (const child of node) walk(child);
      };
      walk(g.coordinates);
      if (flat.length) {
        lng = flat.reduce((s, c) => s + c[0], 0) / flat.length;
        lat = flat.reduce((s, c) => s + c[1], 0) / flat.length;
      }
    }

    if (lat === null || lng === null || !inContiguousUs(lat, lng)) continue;

    events.push({
      id: `nws-${f.id}`,
      type,
      title: f.properties.headline || f.properties.event || "Weather alert",
      location: f.properties.areaDesc || "United States",
      lat,
      lng,
      severity: nwsSeverityScore(
        f.properties.severity,
        f.properties.urgency,
        type,
      ),
      source: "NWS",
      url: f.properties.web || undefined,
      occurred_at: f.properties.sent,
      summary: (f.properties.description || "").slice(0, 220),
    });
  }

  return events;
}

export async function fetchLiveDisasterEvents(): Promise<DisasterEvent[]> {
  const [quakes, alerts] = await Promise.all([
    fetchUsgsEarthquakes().catch(() => [] as DisasterEvent[]),
    fetchNwsAlerts().catch(() => [] as DisasterEvent[]),
  ]);

  const merged = [...quakes, ...alerts];
  // Prefer larger events first for rendering
  merged.sort((a, b) => b.severity - a.severity);
  return merged.slice(0, 180);
}
