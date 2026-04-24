"use client";
import React from "react";

type Doc = { id: string; shipment_id: string; original_file_name: string };

export default function DocumentViewer({ docs }: { docs: Doc[] }) {
  return (
    <div>
      <h4>Documents</h4>
      <ul>
        {docs.map((d) => (
          <li key={d.id}>
            <a
              href={`/api/v1/importer/shipments/${d.shipment_id}/documents/${d.id}/download`}
            >
              {d.original_file_name}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
