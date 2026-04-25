"use client";
import React from "react";
import {
  Package,
  MapPin,
  CheckCircle2,
  Clock,
  AlertCircle,
  Truck,
  Anchor,
  ShieldCheck,
  FileBadge,
  FileCheck2,
} from "lucide-react";
import { ShipmentStatus } from "@/lib/shipments";

type Shipment = {
  id: string;
  origin_port?: string;
  destination_port?: string;
  status?: string;
  created_at?: string;
};

interface ShipmentTimelineProps {
  shipment: Shipment | null;
}

const STEPS: {
  status: ShipmentStatus;
  label: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  description: string;
}[] = [
  {
    status: "INITIATED",
    label: "Initiated",
    icon: Package,
    description: "Shipment created by importer",
  },
  {
    status: "DOCS_UPLOADED",
    label: "Importer Docs",
    icon: Clock,
    description: "Initial documents uploaded",
  },
  {
    status: "PENDING_VERIFICATION",
    label: "Pending Seller",
    icon: AlertCircle,
    description: "Awaiting seller review",
  },
  {
    status: "VERIFIED",
    label: "Seller Verified",
    icon: ShieldCheck,
    description: "Documents verified by seller",
  },
  {
    status: "EXPORT_DOCS_UPLOADED",
    label: "Export Docs",
    icon: FileBadge,
    description: "Origin docs uploaded",
  },
  {
    status: "APPROVED",
    label: "ESL Approved",
    icon: CheckCircle2,
    description: "Approved for shipping",
  },
  {
    status: "ALLOCATED",
    label: "Slot Allocated",
    icon: Anchor,
    description: "Vessel/Truck slot assigned",
  },
  {
    status: "IN_TRANSIT",
    label: "In Transit",
    icon: Truck,
    description: "Cargo is moving",
  },
  {
    status: "ARRIVED",
    label: "Arrived",
    icon: MapPin,
    description: "Arrived at destination",
  },
  {
    status: "CLEARED",
    label: "Delivered",
    icon: FileCheck2,
    description: "Customs cleared & delivered",
  },
];

export default function ShipmentTimeline({ shipment }: ShipmentTimelineProps) {
  const actionOrange = "#F37021";

  if (!shipment) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-ec-text-muted p-8 text-center border border-dashed border-ec-border rounded-2xl bg-ec-surface-raised">
        <Package className="w-12 h-12 mb-4 opacity-20" />
        <p className="text-sm font-medium">
          Select a shipment to view its progress tracking
        </p>
      </div>
    );
  }

  const currentStatusIndex = STEPS.findIndex(
    (step) => step.status === (shipment.status || "INITIATED").toUpperCase(),
  );

  return (
    <div className="ec-card p-6 bg-white overflow-hidden h-full">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-ec-border">
        <div>
          <h3 className="text-lg font-bold text-ec-text">Shipment Progress</h3>
          <p className="text-xs font-mono text-ec-text-muted uppercase tracking-tight mt-1">
            ID: {shipment.id}
          </p>
        </div>
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{ backgroundColor: `${actionOrange}1A` }}
        >
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: actionOrange }}
          />
          <span
            className="text-[10px] font-bold uppercase"
            style={{ color: actionOrange }}
          >
            {shipment.status?.replace(/_/g, " ")}
          </span>
        </div>
      </div>

      <div className="relative space-y-6">
        {/* Connection Line */}
        <div className="absolute left-4.75 top-2 bottom-2 w-0.5 bg-ec-border" />

        {STEPS.map((step, index) => {
          const isCompleted = index < currentStatusIndex;
          const isCurrent = index === currentStatusIndex;
          const isFuture = index > currentStatusIndex;
          const Icon = step.icon;

          return (
            <div
              key={step.status}
              className="relative flex items-start gap-4 group"
            >
              {/* Point */}
              <div
                className="relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300"
                style={{
                  backgroundColor: isCompleted ? actionOrange : "white",
                  borderColor:
                    isCompleted || isCurrent ? actionOrange : "#E5E7EB",
                  color: isCompleted
                    ? "white"
                    : isCurrent
                      ? actionOrange
                      : "#9CA3AF",
                  boxShadow: isCurrent
                    ? `0 0 15px -3px ${actionOrange}66`
                    : "none",
                }}
              >
                <Icon size={18} className={isCurrent ? "animate-pulse" : ""} />
                {isCompleted && (
                  <div className="absolute -right-1 -top-1 bg-white rounded-full">
                    <CheckCircle2 size={14} style={{ color: actionOrange }} />
                  </div>
                )}
              </div>

              {/* Text */}
              <div className="flex-1 pt-0.5">
                <h4
                  className={`text-sm font-bold transition-colors
                  ${isFuture ? "text-ec-text-muted" : "text-ec-text"}
                `}
                >
                  {step.label}
                </h4>
                <p
                  className={`text-[11px] leading-relaxed transition-colors
                  ${isFuture ? "text-ec-text-muted/60" : "text-ec-text-secondary"}
                `}
                >
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
