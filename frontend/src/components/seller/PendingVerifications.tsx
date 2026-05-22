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
          className="group relative flex flex-col overflow-hidden rounded-xl bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg active:scale-[0.98]"
        >
          {/* Animated Gradient Spotlight Border */}
          <div className="absolute inset-0 z-0 rounded-xl bg-gradient-to-r from-orange-400 via-red-500 to-orange-400 p-[2px] opacity-70 bg-[length:200%_auto] animate-[gradient_3s_linear_infinite]">
            <div className="h-full w-full rounded-[10px] bg-white" />
          </div>

          <div className="relative z-10">
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
          </div>
        </button>
      ))}
    </div>
  );
}
