"use client";
import React from "react";

export default function RejectionModal({
  onSubmit,
}: {
  onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = React.useState("");
  return (
    <div>
      <h4>Reject Shipment</h4>
      <textarea value={reason} onChange={(e) => setReason(e.target.value)} />
      <button onClick={() => onSubmit(reason)}>Submit</button>
    </div>
  );
}
