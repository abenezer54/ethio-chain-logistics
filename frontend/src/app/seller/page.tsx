"use client";
import React, { useEffect, useState } from "react";
import SellerDashboard from "../../components/seller/SellerDashboard";
import PendingVerifications from "../../components/seller/PendingVerifications";
import ApprovedShipments from "../../components/seller/ApprovedShipments";
import NotificationsPanel from "../../components/seller/NotificationsPanel";

type Shipment = { id: string; origin_port?: string; destination_port?: string };
type Notification = { id: string; type: string; payload?: unknown };

export default function Page() {
  const [pending, setPending] = useState<Shipment[]>([]);
  const [approved, setApproved] = useState<Shipment[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ac = new AbortController();
    const fetchAll = async () => {
      try {
        const [dRes, pRes, aRes, nRes] = await Promise.all([
          fetch("/api/v1/seller/dashboard", { signal: ac.signal }),
          fetch("/api/v1/seller/pending", { signal: ac.signal }),
          fetch("/api/v1/seller/approved", { signal: ac.signal }),
          fetch("/api/v1/seller/notifications", { signal: ac.signal }),
        ]);

        if (dRes.ok) {
          const dJson = await dRes.json();
          setPendingCount(Number(dJson.pending_count) || 0);
        }

        if (pRes.ok) {
          const pJson = await pRes.json();
          setPending(
            Array.isArray(pJson.items) ? (pJson.items as Shipment[]) : [],
          );
        }

        if (aRes.ok) {
          const aJson = await aRes.json();
          setApproved(
            Array.isArray(aJson.items) ? (aJson.items as Shipment[]) : [],
          );
        }

        if (nRes.ok) {
          const nJson = await nRes.json();
          setNotifications(
            Array.isArray(nJson.items) ? (nJson.items as Notification[]) : [],
          );
        }
      } catch (e) {
        if ((e as DOMException)?.name === "AbortError") return;
        console.error("seller page fetch error", e);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
    return () => ac.abort();
  }, []);

  return (
    <div>
      <h1>Seller Portal</h1>
      <SellerDashboard pendingCount={pendingCount} />
      <PendingVerifications items={pending} />
      <ApprovedShipments items={approved} />
      <NotificationsPanel items={notifications|| []} />
      {loading && <p>Loading...</p>}
    </div>
  );
}
