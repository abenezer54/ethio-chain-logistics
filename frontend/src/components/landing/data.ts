import type { LucideIcon } from "lucide-react";
import {
  FileCheck,
  Lock,
  ListChecks,
  Map,
  ShieldCheck,
  Truck,
} from "lucide-react";

export type FeatureItem = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export const features: FeatureItem[] = [
  {
    icon: Lock,
    title: "Uploads you can stand behind",
    description:
      "When you upload licenses or customs papers, we store a fingerprint. If a file changes later, reviewers can spot it.",
  },
  {
    icon: Map,
    title: "Track goods, not phone chains",
    description:
      "Importers and sellers see where a shipment sits from Addis to Djibouti without calling three desks for the same PDF.",
  },
  {
    icon: ListChecks,
    title: "Clear roles, clear handoffs",
    description:
      "Carriers, customs, and ESL staff step in when it is their turn. Buyers and sellers stay at the center of the flow.",
  },
];

export type StepItem = {
  step: string;
  title: string;
  body: string;
  icon: LucideIcon;
};

export const steps: StepItem[] = [
  {
    step: "01",
    title: "Register and upload proof",
    body: "Importers and sellers pick their role, add business details, and upload the files we need. An admin turns your login on when it looks right.",
    icon: FileCheck,
  },
  {
    step: "02",
    title: "Run shipments in one place",
    body: "Everyone works off the same timeline so you are not comparing WhatsApp screenshots to a spreadsheet row.",
    icon: Truck,
  },
  {
    step: "03",
    title: "Show what happened later",
    body: "When someone asks who released a load or cleared a doc, you can point to the history instead of digging through inboxes.",
    icon: ShieldCheck,
  },
];

export type StatItem = {
  value: string;
  label: string;
  sub: string;
};

export const stats: StatItem[] = [
  {
    value: "2",
    label: "Core roles",
    sub: "Importers and sellers first",
  },
  { value: "24/7", label: "Portal access", sub: "Check status when you need it" },
  {
    value: "100%",
    label: "File trail",
    sub: "Fingerprint stored per upload",
  },
  {
    value: "1",
    label: "Corridor",
    sub: "Ethiopia to Djibouti",
  },
];

export const navLinks = [
  { href: "#who-its-for", label: "Who it is for" },
  { href: "#features", label: "Platform" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#network", label: "Service" },
  { href: "#cta", label: "Register" },
] as const;
