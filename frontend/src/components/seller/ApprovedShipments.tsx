"use client";
import React from "react";

type Shipment = { id: string; origin_port?: string; destination_port?: string };

export default function ApprovedShipments({ items }: { items: Shipment[] }) {
  return (
    <div>
      <h3>Approved Shipments</h3>
      <ul>
        {items.map((s) => (
          <li key={s.id}>
            {s.id} - {s.origin_port} → {s.destination_port}
          </li>
        ))}
      </ul>
    </div>
  );
}
