"use client";
import { ArrowRight, Clock, MapPin, ChevronRight } from "lucide-react";

type Shipment = { id: string; origin_port?: string; destination_port?: string };

export default function PendingVerifications({
  items,
  onSelect,
}: {
  items: Shipment[];
  onSelect?: (id: string) => void;
}) {
  if (!items || items.length === 0) {
    return (
      <div className="w-full flex flex-col items-center justify-center rounded-xl border border-dashed border-ec-border bg-ec-surface-raised p-8 text-center">
        <Clock className="mb-2 text-ec-text-muted opacity-20" size={32} />
        <p className="text-sm font-medium text-ec-text-muted">
          All caught up! No pending verifications.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full grid grid-cols-1 gap-4">
      {items.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onSelect?.(s.id)}
          className="group relative flex flex-col overflow-hidden rounded-xl border border-ec-border bg-white p-5 shadow-sm transition-all hover:border-action/30 hover:shadow-md active:scale-[0.98]"
        >
          {/* Status strip */}
          <div className="absolute top-0 right-0 h-1 w-12 bg-action opacity-60" />

          <div className="flex items-center justify-between mb-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-ec-surface px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-ec-text-muted ring-1 ring-ec-border">
              <span className="h-1.5 w-1.5 rounded-full bg-action animate-pulse" />
              Action Required
            </span>
            <span className="text-[10px] font-mono font-medium text-ec-text-muted">
              #{s.id.slice(0, 8).toUpperCase()}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-ec-text">
                <span className="font-bold truncate">{s.origin_port}</span>
                <ArrowRight size={14} className="text-ec-text-muted shrink-0" />
                <span className="font-bold truncate">{s.destination_port}</span>
              </div>
              <div className="mt-2 flex items-center gap-1 text-[11px] text-ec-text-muted">
                <MapPin size={12} />
                <span>Standard Logistics Route</span>
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-action/5 text-action transition-transform group-hover:translate-x-1">
              <ChevronRight size={20} />
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
