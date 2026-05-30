import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BlockchainProofBadge } from "./BlockchainProofBadge";

describe("BlockchainProofBadge", () => {
  it("shows a pending proof by default", () => {
    render(<BlockchainProofBadge />);

    expect(screen.getByText("Proof pending")).toBeInTheDocument();
  });

  it("shows anchored proof with shortened transaction hash", () => {
    render(
      <BlockchainProofBadge
        status="ANCHORED"
        txHash="0x1234567890abcdef1234567890abcdef12345678"
      />
    );

    expect(screen.getByText("Anchored")).toBeInTheDocument();
    expect(screen.getByText("0x123456...345678")).toBeInTheDocument();
  });

  it("shows failed proof state", () => {
    render(<BlockchainProofBadge status="FAILED" />);

    expect(screen.getByText("Proof failed")).toBeInTheDocument();
  });
});
