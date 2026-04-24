"use client";
import React from "react";

export default function SellerDashboard({
  pendingCount,
}: {
  pendingCount: number;
}) {
  return (
    <div>
      <h2>Seller Dashboard</h2>
      <p>Pending shipments: {pendingCount}</p>
    </div>
  );
}
