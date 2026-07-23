"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
} from "react-leaflet";
import type { DisasterEvent, DisasterEventType } from "@/lib/types";
import "leaflet/dist/leaflet.css";

const TYPE_COLOR: Record<DisasterEventType, string> = {
  earthquake: "#c45c26",
  flood: "#1d4ed8",
  fire: "#b91c1c",
  tsunami: "#0e7490",
  storm: "#6d28d9",
  other: "#4b5563",
};

function FitUs() {
  const map = useMap();
  useEffect(() => {
    map.setView([39.5, -98.35], 4);
  }, [map]);
  return null;
}

function EventMarker({
  event,
  hovered,
  onHover,
}: {
  event: DisasterEvent;
  hovered: boolean;
  onHover: (id: string | null) => void;
}) {
  const color = TYPE_COLOR[event.type];
  const base = 10 + event.severity * 5;

  return (
    <>
      {[1.9, 1.4, 1].map((scale, i) => (
        <CircleMarker
          key={`${event.id}-ring-${i}`}
          center={[event.lat, event.lng]}
          radius={base * scale}
          pathOptions={{
            color,
            fillColor: color,
            fillOpacity: hovered ? 0.16 - i * 0.04 : 0.09 - i * 0.025,
            opacity: hovered ? 0.6 - i * 0.12 : 0.32 - i * 0.08,
            weight: hovered ? 2 : 1,
          }}
          eventHandlers={{
            mouseover: () => onHover(event.id),
            mouseout: () => onHover(null),
          }}
        />
      ))}
      <CircleMarker
        center={[event.lat, event.lng]}
        radius={Math.max(5, event.severity * 1.5)}
        pathOptions={{
          color: "#fff",
          fillColor: color,
          fillOpacity: 0.95,
          weight: 2,
          opacity: 1,
        }}
        eventHandlers={{
          mouseover: (e) => {
            onHover(event.id);
            e.target.openPopup();
          },
          mouseout: () => onHover(null),
        }}
      >
        <Popup>
          <div style={{ minWidth: 180 }}>
            <strong style={{ textTransform: "uppercase", fontSize: 11 }}>
              {event.type}
            </strong>
            <div style={{ fontWeight: 600, marginTop: 4 }}>{event.location}</div>
            <div style={{ fontSize: 12, marginTop: 4, opacity: 0.85 }}>
              {event.title}
            </div>
            {event.magnitude != null && (
              <div style={{ fontSize: 12, marginTop: 4 }}>
                Magnitude {event.magnitude}
              </div>
            )}
            <div style={{ fontSize: 11, marginTop: 6, opacity: 0.7 }}>
              Severity {event.severity}/10 · {event.source}
            </div>
          </div>
        </Popup>
      </CircleMarker>
    </>
  );
}

export function DisasterMapClient() {
  const [events, setEvents] = useState<DisasterEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<DisasterEventType | "all">("all");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const res = await fetch("/api/disasters");
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error || "Failed to load");
        setEvents(data.events || []);
        setUpdatedAt(data.updated_at || null);
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load map data");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const id = setInterval(load, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const filtered = useMemo(
    () => (filter === "all" ? events : events.filter((e) => e.type === filter)),
    [events, filter],
  );

  const hovered = filtered.find((e) => e.id === hoveredId) || null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(
            ["all", "earthquake", "flood", "fire", "tsunami", "storm"] as const
          ).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setFilter(t)}
              className={`rounded-full border px-3 py-1.5 text-sm capitalize ${
                filter === t
                  ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                  : "border-[var(--line)] bg-white/70 text-[var(--muted)]"
              }`}
            >
              {t === "all" ? "All events" : t}
            </button>
          ))}
        </div>
        <p className="text-xs text-[var(--muted)]">
          {loading
            ? "Refreshing live feeds…"
            : `${filtered.length} events · USGS + NWS${
                updatedAt ? ` · ${new Date(updatedAt).toLocaleTimeString()}` : ""
              }`}
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}

      <div className="relative overflow-hidden rounded-2xl border border-[var(--line)] shadow-[var(--shadow)]">
        <div className="h-[560px] w-full bg-[#0b1c16]">
          <MapContainer
            center={[39.5, -98.35]}
            zoom={4}
            minZoom={3}
            maxZoom={10}
            scrollWheelZoom
            className="h-full w-full"
            style={{ background: "#0b1c16" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            <FitUs />
            {filtered.map((event) => (
              <EventMarker
                key={event.id}
                event={event}
                hovered={hoveredId === event.id}
                onHover={setHoveredId}
              />
            ))}
          </MapContainer>
        </div>

        <div className="pointer-events-none absolute left-4 top-4 max-w-sm rounded-xl border border-white/15 bg-black/70 p-3 text-white shadow-xl backdrop-blur-md">
          {hovered ? (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
                {hovered.type}
              </p>
              <p className="mt-1 text-base font-semibold">{hovered.location}</p>
              <p className="mt-1 text-sm text-white/80">{hovered.title}</p>
              <p className="mt-2 text-xs text-white/60">
                Severity {hovered.severity}/10
                {hovered.magnitude != null ? ` · M${hovered.magnitude}` : ""} ·{" "}
                {hovered.source}
              </p>
            </>
          ) : (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
                Live hazard radar
              </p>
              <p className="mt-1 text-sm text-white/80">
                Hover an epicenter for location and event type. Larger radar
                rings mean larger events — prioritize contractors near damaged
                homes.
              </p>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {(["earthquake", "flood", "fire", "tsunami"] as DisasterEventType[]).map(
          (t) => (
            <div
              key={t}
              className="rounded-xl border border-[var(--line)] bg-white/70 px-3 py-2 text-sm"
            >
              <span
                className="mr-2 inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: TYPE_COLOR[t] }}
              />
              <span className="capitalize">{t}</span>
              <span className="ml-2 text-[var(--muted)]">
                {events.filter((e) => e.type === t).length}
              </span>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
