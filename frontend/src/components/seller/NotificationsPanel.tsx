"use client";
import React from "react";

type Notification = { id: string; type: string; payload?: unknown };

export default function NotificationsPanel({
  items,
}: {
  items: Notification[];
}) {
  return (
    <div>
      <h4>Notifications</h4>
      <ul>
        {items.map((n) => (
          <li key={n.id}>
            {n.type} - {JSON.stringify(n.payload)}
          </li>
        ))}
      </ul>
    </div>
  );
}
