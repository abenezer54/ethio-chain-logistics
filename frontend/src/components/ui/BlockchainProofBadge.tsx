import { CheckCircle2, Clock3, ExternalLink, TriangleAlert } from "lucide-react";
import type { AnchorStatus } from "@/lib/shipments";

const EXPLORER_TX_BASE = process.env.NEXT_PUBLIC_BLOCK_EXPLORER_TX_BASE ?? "";

type BlockchainProofBadgeProps = {
  status?: AnchorStatus;
  txHash?: string;
};

const STATUS_COPY: Record<AnchorStatus, string> = {
  PENDING: "Proof pending",
  ANCHORED: "Anchored",
  FAILED: "Proof failed",
};

const STATUS_TONE: Record<AnchorStatus, string> = {
  PENDING: "border-amber-200 bg-amber-50 text-amber-800",
  ANCHORED: "border-emerald-200 bg-emerald-50 text-emerald-800",
  FAILED: "border-red-200 bg-red-50 text-red-700",
};

function shortTx(value?: string): string {
  if (!value) return "";
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

export function BlockchainProofBadge({
  status = "PENDING",
  txHash,
}: BlockchainProofBadgeProps) {
  const effectiveStatus = txHash && status === "PENDING" ? "ANCHORED" : status;
  const label = STATUS_COPY[effectiveStatus] ?? STATUS_COPY.PENDING;
  const tone = STATUS_TONE[effectiveStatus] ?? STATUS_TONE.PENDING;
  const href = txHash && EXPLORER_TX_BASE ? `${EXPLORER_TX_BASE}${txHash}` : "";
  const Icon =
    effectiveStatus === "ANCHORED" ? CheckCircle2 : effectiveStatus === "FAILED" ? TriangleAlert : Clock3;

  const content = (
    <>
      <Icon size={13} aria-hidden />
      <span>{label}</span>
      {txHash ? <span className="font-mono">{shortTx(txHash)}</span> : null}
      {href ? <ExternalLink size={12} aria-hidden /> : null}
    </>
  );

  const className = `inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${tone}`;

  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className}>
        {content}
      </a>
    );
  }

  return <span className={className}>{content}</span>;
}
