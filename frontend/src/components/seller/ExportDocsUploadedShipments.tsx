"use client";
import React from "react";
import { Package, MapPin, Clock, ChevronRight, FileCheck } from "lucide-react";

type Shipment = {
  id: string;
  origin_port?: string;
  destination_port?: string;
  status?: string;
  created_at?: string;
};

interface ExportDocsUploadedShipmentsProps {
  items: Shipment[];
  onSelect: (id: string) => void;
}

export default function ExportDocsUploadedShipments({
  items,
  onSelect,
}: ExportDocsUploadedShipmentsProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-ec-border bg-ec-surface-raised p-8 text-center">
        <div className="mb-3 rounded-full bg-ec-navy/5 p-3 text-ec-navy/30">
          <FileCheck size={32} />
        </div>
        <p className="text-sm font-medium text-ec-text-muted">
          No shipments with uploaded export documents.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {items.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onSelect(s.id)}
          className="group relative flex flex-col overflow-hidden rounded-xl border border-ec-border bg-white p-5 shadow-sm transition-all hover:border-ec-navy/30 hover:shadow-md active:scale-[0.98]"
        >
          {/* Status strip */}
          <div className="absolute top-0 right-0 h-1 w-12 bg-ec-navy opacity-60" />

          <div className="flex items-center justify-between mb-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-ec-navy/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-ec-navy ring-1 ring-ec-navy/10">
              Export Docs Uploaded
            </span>
            <span className="text-[10px] font-mono font-medium text-ec-text-muted">
              #{s.id.slice(0, 8).toUpperCase()}
            </span>
          </div>

          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <MapPin size={12} className="text-ec-text-muted" />
                <span className="text-xs font-bold text-ec-text">
                  {s.origin_port || "Origin"}
                </span>
                <div className="flex-1 border-t border-dashed border-ec-border mx-1" />
                <span className="text-xs font-bold text-ec-text text-right">
                  {s.destination_port || "Destination"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mt-auto pt-3 border-t border-ec-border/50">
            <div className="flex items-center gap-1 text-[10px] text-ec-text-muted">
              <Clock size={10} />
              <span>Awaiting regulatory verification</span>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-ec-navy opacity-0 group-hover:opacity-100 transition-opacity">
              View Details <ChevronRight size={14} />
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
