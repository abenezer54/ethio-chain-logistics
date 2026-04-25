"use client";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, FileBadge, ChevronRight } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getStoredToken } from "@/lib/auth-storage";
import { useToast } from "@/components/ui/ToastProvider";

type Shipment = {
  id: string;
  origin_port?: string;
  destination_port?: string;
  status?: string;
};

export default function ApprovedShipments({
  items: propItems,
  onSelect,
}: {
  items?: Shipment[];
  onSelect?: (id: string) => void;
}) {
  const isControlled = Array.isArray(propItems);
  const [items, setItems] = useState<Shipment[]>(propItems ?? []);
  const [loading, setLoading] = useState(!isControlled);
  const { toast } = useToast();

  const load = useCallback(async () => {
    if (isControlled) return;
    setLoading(true);
    try {
      const token = getStoredToken();
      const j = await apiFetch<{ items: Shipment[] }>(
        "/api/v1/seller/approved",
        {
          token: token ?? undefined,
        },
      );
      const list = Array.isArray(j.items) ? j.items : [];
      // If controlled via SellerWorkspace, the filtering is already done there.
      // If standalone, we filter for VERIFIED status.
      const approved = list.filter(
        (s) => (s.status || "").toUpperCase() === "VERIFIED" || !s.status,
      );
      setItems(approved);
    } catch (err) {
      console.error("failed to load approved shipments", err);
      toast("Could not load approved shipments. Try refreshing.", "error");
    } finally {
      setLoading(false);
    }
  }, [isControlled, toast]);

  useEffect(() => {
    if (isControlled) {
      setItems(propItems || []);
      setLoading(false);
    } else {
      load();
    }
  }, [propItems, isControlled, load]);

  if (loading)
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-20 w-full animate-pulse rounded-xl bg-ec-surface-raised"
          />
        ))}
      </div>
    );

  if (items.length === 0)
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-ec-border bg-ec-surface-raised p-8 text-center">
        <FileBadge className="mb-2 text-ec-text-muted opacity-20" size={32} />
        <p className="text-sm font-medium text-ec-text-muted">
          No approved shipments awaiting documents.
        </p>
      </div>
    );

  return (
    <div className="grid grid-cols-1 gap-4">
      {items.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onSelect?.(s.id)}
          className="group relative flex flex-col overflow-hidden rounded-xl border border-ec-border bg-white p-5 shadow-sm transition-all hover:border-green-500/30 hover:shadow-md active:scale-[0.98]"
        >
          {/* Status strip */}
          <div className="absolute top-0 right-0 h-1 w-12 bg-green-500 opacity-60" />

          <div className="flex items-center justify-between mb-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-green-600 ring-1 ring-green-100">
              Approved
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
              <p className="mt-2 text-[11px] text-green-600 font-medium">
                Ready for Packing List
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50 text-green-600 transition-transform group-hover:translate-x-1">
              <ChevronRight size={20} />
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
