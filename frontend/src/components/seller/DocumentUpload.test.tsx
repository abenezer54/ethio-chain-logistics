import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import DocumentUpload from "./DocumentUpload";

describe("DocumentUpload", () => {
  it("does not submit without a selected file", async () => {
    const onUpload = vi.fn();
    render(<DocumentUpload onUpload={onUpload} />);

    await userEvent.click(screen.getByRole("button", { name: /upload documents/i }));

    expect(onUpload).not.toHaveBeenCalled();
  });

  it("submits selected certificate of origin file", async () => {
    const user = userEvent.setup();
    const onUpload = vi.fn().mockResolvedValue(undefined);
    render(<DocumentUpload onUpload={onUpload} />);

    const file = new File(["document"], "certificate.pdf", { type: "application/pdf" });
    await user.upload(screen.getByLabelText(/packing list/i), file);
    await user.click(screen.getByRole("button", { name: /upload documents/i }));

    expect(onUpload).toHaveBeenCalledTimes(1);
    const formData = onUpload.mock.calls[0][0] as FormData;
    expect(formData.get("CERTIFICATE_OF_ORIGIN")).toBe(file);
  });
});
