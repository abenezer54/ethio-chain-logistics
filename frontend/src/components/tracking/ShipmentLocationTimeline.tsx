"use client";

import { ExternalLink, MapPin, Navigation, Radio } from "lucide-react";
import type { ShipmentEvent } from "@/lib/shipments";

type LocationPoint = {
  event: ShipmentEvent;
  latitude: string;
  longitude: string;
  note: string;
  milestone: string;
  legType: string;
};

function metadataValue(
  metadata: ShipmentEvent["metadata"] | undefined,
  key: string,
): string {
  const value = metadata?.[key];
  if (value === undefined || value === null) return "";
  return typeof value === "string" ? value : String(value);
}

function formatDateTime(iso?: string): string {
  if (!iso) return "Not recorded";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Not recorded";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function cleanLabel(value: string): string {
  return value ? value.replaceAll("_", " ").toLowerCase() : "location update";
}

function mapsUrl(latitude: string, longitude: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${latitude},${longitude}`,
  )}`;
}

export function getShipmentLocationPoints(
  events?: ShipmentEvent[] | null,
): LocationPoint[] {
  if (!Array.isArray(events)) return [];
  return events
    .map((event) => {
      const latitude = metadataValue(event.metadata, "latitude");
      const longitude = metadataValue(event.metadata, "longitude");
      if (!latitude || !longitude) return null;
      return {
        event,
        latitude,
        longitude,
        note: metadataValue(event.metadata, "location_note"),
        milestone: metadataValue(event.metadata, "milestone") || event.action,
        legType: metadataValue(event.metadata, "leg_type"),
      };
    })
    .filter((point): point is LocationPoint => point !== null)
    .sort(
      (a, b) =>
        new Date(b.event.created_at).getTime() -
        new Date(a.event.created_at).getTime(),
    );
}

export function LatestLocationBadge({
  events,
  emptyLabel = "No GPS yet",
}: {
  events?: ShipmentEvent[] | null;
  emptyLabel?: string;
}) {
  const latest = getShipmentLocationPoints(events)[0];
  if (!latest) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-ec-border bg-ec-surface-raised px-2.5 py-1 text-xs font-semibold text-ec-text-muted">
        <Radio size={13} aria-hidden />
        {emptyLabel}
      </span>
    );
  }

  return (
    <a
      href={mapsUrl(latest.latitude, latest.longitude)}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800 transition-colors hover:bg-blue-100"
    >
      <MapPin size={13} aria-hidden />
      GPS shared
      <ExternalLink size={12} aria-hidden />
    </a>
  );
}

export function ShipmentLocationTimeline({
  events,
  title = "Location updates",
  emptyText = "No shared GPS location yet.",
  embedded = false,
}: {
  events?: ShipmentEvent[] | null;
  title?: string;
  emptyText?: string;
  embedded?: boolean;
}) {
  const points = getShipmentLocationPoints(events);

  return (
    <section
      className={
        embedded
          ? "rounded-lg border border-ec-border bg-ec-surface-raised p-4"
          : "ec-card rounded-lg"
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-ec-accent">
            Tracking
          </p>
          <h3 className="mt-1 font-bold text-ec-text">{title}</h3>
        </div>
        <LatestLocationBadge events={events} />
      </div>

      {points.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-ec-border bg-ec-card p-5 text-center">
          <MapPin size={28} className="mx-auto text-ec-text-muted" aria-hidden />
          <p className="mt-2 text-sm text-ec-text-secondary">{emptyText}</p>
        </div>
      ) : (
        <ol className="mt-4 space-y-3">
          {points.map((point) => (
            <li
              key={point.event.id}
              className="rounded-lg border border-ec-border bg-ec-card p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 font-bold capitalize text-ec-text">
                    <Navigation size={16} className="text-ec-accent" aria-hidden />
                    {cleanLabel(point.milestone)}
                  </p>
                  <p className="mt-1 text-sm text-ec-text-secondary">
                    {point.latitude}, {point.longitude}
                  </p>
                </div>
                <span className="text-xs font-medium text-ec-text-muted">
                  {formatDateTime(point.event.created_at)}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                {point.legType ? (
                  <span className="rounded-full border border-ec-border bg-ec-card px-2.5 py-1 font-semibold uppercase text-ec-text-muted">
                    {point.legType}
                  </span>
                ) : null}
                {point.note ? (
                  <span className="rounded-full border border-ec-border bg-ec-card px-2.5 py-1 text-ec-text-secondary">
                    {point.note}
                  </span>
                ) : null}
                <a
                  href={mapsUrl(point.latitude, point.longitude)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-white px-2.5 py-1 font-semibold text-blue-700 hover:bg-blue-50"
                >
                  Open in Google Maps
                  <ExternalLink size={12} aria-hidden />
                </a>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
