import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createImporterShipment,
  getImporterShipment,
  listImporterShipments,
  uploadShipmentDocuments,
} from "./shipments";

describe("shipment API client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("lists importer shipments through the protected endpoint", async () => {
    const fetchMock = mockJSON({ items: [{ id: "shipment-1" }] });

    const items = await listImporterShipments("token");

    expect(items).toHaveLength(1);
    expect(fetchMock.mock.calls[0][0]).toContain("/api/v1/importer/shipments");
    expect((fetchMock.mock.calls[0][1]?.headers as Headers).get("Authorization")).toBe(
      "Bearer token"
    );
  });

  it("creates importer shipment with JSON payload", async () => {
    const fetchMock = mockJSON({ id: "shipment-1" });

    await createImporterShipment("token", {
      origin_port: "Djibouti",
      destination_port: "Modjo",
      cargo_type: "Coffee",
      weight_kg: "1200",
    });

    const init = fetchMock.mock.calls[0][1];
    expect(init?.method).toBe("POST");
    expect(init?.body).toBeTypeOf("string");
  });

  it("normalizes missing detail arrays", async () => {
    mockJSON({ shipment: { id: "shipment-1" } });

    const detail = await getImporterShipment("token", "shipment-1");

    expect(detail.documents).toEqual([]);
    expect(detail.seller_documents).toEqual([]);
    expect(detail.events).toEqual([]);
  });

  it("uploads shipment documents as form data", async () => {
    const fetchMock = mockJSON({ shipment: { id: "shipment-1" }, documents: [] });
    const formData = new FormData();

    await uploadShipmentDocuments("token", "shipment-1", formData);

    const init = fetchMock.mock.calls[0][1];
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(formData);
  });
});

function mockJSON(body: unknown) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  );
}
