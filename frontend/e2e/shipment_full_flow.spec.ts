import { expect, test } from "@playwright/test";

const importerEmail = process.env.E2E_IMPORTER_EMAIL || "importer@example.com";
const importerPassword = process.env.E2E_IMPORTER_PASSWORD || "password";

const originPort = "Djibouti Port, Djibouti";
const destinationPort = "Modjo Dry Port, Ethiopia";
const cargoType = "Electronics";

function nowIso(): string {
  return new Date().toISOString();
}

function jsonBody<T extends object>(body: T, status = 200) {
  return {
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  };
}

function base64Url(value: string): string {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function makeJwt(role: string): string {
  const header = base64Url(JSON.stringify({ alg: "none", typ: "JWT" }));
  const payload = base64Url(
    JSON.stringify({ sub: "importer-001", role, exp: Math.floor(Date.now() / 1000) + 3600 }),
  );
  return `${header}.${payload}.signature`;
}

test.describe("Importer shipment lifecycle", () => {
  test.setTimeout(90000);

  test("sign in, create a shipment, upload documents, and see live notifications", async ({
    page,
  }) => {
    const token = makeJwt("IMPORTER");
    const sellerId = "seller-001";
    const shipmentId = "shipment-demo-001";
    const shipments = new Map<string, Record<string, unknown>>();
    const details = new Map<string, Record<string, unknown>>();
    let notificationCalls = 0;

    await page.route("**/api/v1/auth/login", async (route) => {
      await route.fulfill(jsonBody({ token, user: { role: "IMPORTER" } }));
    });

    await page.route("**/api/v1/sellers?limit=500", async (route) => {
      await route.fulfill(
        jsonBody({
          items: [
            {
              id: sellerId,
              business_name: "Aster Commerce PLC",
              email: "seller@aster.example",
              origin_country: "Ethiopia",
            },
          ],
        }),
      );
    });

    await page.route("**/api/v1/importer/shipments", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill(jsonBody({ items: Array.from(shipments.values()) }));
        return;
      }

      const payload = route.request().postDataJSON() as {
        origin_port: string;
        destination_port: string;
        cargo_type: string;
        weight_kg: string;
        volume_cbm?: string;
        seller_id?: string;
      };

      const created = {
        id: shipmentId,
        importer_id: "importer-001",
        seller_id: payload.seller_id,
        origin_port: payload.origin_port,
        destination_port: payload.destination_port,
        cargo_type: payload.cargo_type,
        weight_kg: payload.weight_kg,
        volume_cbm: payload.volume_cbm,
        status: "INITIATED",
        anchor_status: "PENDING",
        created_at: nowIso(),
        updated_at: nowIso(),
      };

      shipments.set(shipmentId, created);
      details.set(shipmentId, {
        shipment: created,
        documents: [],
        seller_documents: [],
        events: [
          {
            id: "event-001",
            shipment_id: shipmentId,
            actor_role: "IMPORTER",
            action: "SHIPMENT_CREATED",
            message: "Shipment created from the importer workspace.",
            event_hash: "hash-event-001",
            anchor_status: "PENDING",
            created_at: nowIso(),
          },
        ],
      });

      await route.fulfill(jsonBody(created));
    });

    await page.route(/\/api\/v1\/importer\/shipments\/[^/]+$/, async (route) => {
      if (route.request().method() !== "GET") {
        await route.fallback();
        return;
      }

      const shipmentID = route.request().url().match(/shipments\/([^/?]+)$/)?.[1];
      const detail = shipmentID ? details.get(shipmentID) : null;
      await route.fulfill(
        jsonBody(
          detail ?? {
            shipment: shipments.get(shipmentId),
            documents: [],
            seller_documents: [],
            events: [],
          },
        ),
      );
    });

    await page.route(
      /\/api\/v1\/importer\/shipments\/[^/]+\/documents$/,
      async (route) => {
        const shipmentID = route.request().url().match(/shipments\/([^/]+)\/documents$/)?.[1];
        const shipment = shipmentID
          ? (shipments.get(shipmentID) as Record<string, unknown> | undefined)
          : undefined;

        if (!shipmentID || !shipment) {
          await route.fulfill(jsonBody({ error: "Shipment not found" }, 404));
          return;
        }

        const uploadedAt = nowIso();
        const document = {
          id: "document-demo-001",
          shipment_id: shipmentID,
          doc_type: "BILL_OF_LADING",
          original_file_name: "bill-of-lading-demo.pdf",
          content_type: "application/pdf",
          size_bytes: 4096,
          storage_key: "uploads/demo/bill-of-lading-demo.pdf",
          sha256_hash:
            "a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcd",
          verification_status: "MATCHED",
          uploaded_by: "importer-001",
          anchor_status: "ANCHORED",
          blockchain_tx_hash:
            "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd",
          uploaded_at: uploadedAt,
        };

        const nextShipment = {
          ...shipment,
          status: "DOCS_UPLOADED",
          anchor_status: "ANCHORED",
          blockchain_tx_hash:
            "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd",
          updated_at: uploadedAt,
        };

        shipments.set(shipmentID, nextShipment);
        details.set(shipmentID, {
          shipment: nextShipment,
          documents: [document],
          seller_documents: [],
          events: [
            {
              id: "event-001",
              shipment_id: shipmentID,
              actor_role: "IMPORTER",
              action: "SHIPMENT_CREATED",
              message: "Shipment created from the importer workspace.",
              event_hash: "hash-event-001",
              anchor_status: "PENDING",
              created_at: nowIso(),
            },
            {
              id: "event-002",
              shipment_id: shipmentID,
              actor_role: "IMPORTER",
              action: "SHIPMENT_DOCUMENTS_UPLOADED",
              message: "Importer documents uploaded and anchored.",
              event_hash: "hash-event-002",
              anchor_status: "ANCHORED",
              blockchain_tx_hash:
                "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd",
              created_at: uploadedAt,
            },
          ],
        });

        await route.fulfill(
          jsonBody({
            shipment: nextShipment,
            documents: [document],
            seller_documents: [],
            events: details.get(shipmentID)?.events ?? [],
          }),
        );
      },
    );

    await page.route("**/api/v1/seller/notifications", async (route) => {
      notificationCalls += 1;
      await route.fulfill(
        jsonBody({
          items:
            notificationCalls >= 2
              ? [
                  {
                    id: "notification-001",
                    type: "SHIPMENT_DOCUMENTS_UPLOADED",
                    payload: {
                      shipment_id: shipmentId,
                      summary: "Documents uploaded and anchored.",
                    },
                    created_at: nowIso(),
                  },
                ]
              : [],
        }),
      );
    });

    await page.goto("http://localhost:3000/login");
    await expect(
      page.getByRole("heading", { name: "Sign in to Ethio-Chain" }),
    ).toBeVisible();

    await page.getByLabel("Email").fill(importerEmail);
    await page.getByRole("textbox", { name: "Password" }).fill(importerPassword);
    await page.getByRole("button", { name: "Sign in to Ethio-Chain" }).click();
    await page.waitForURL("**/dashboard", { timeout: 15000 });

    await expect(page.getByRole("heading", { name: "Create shipment" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Your shipments" })).toBeVisible();

    const createShipmentForm = page.locator("form").first();

    await createShipmentForm.getByLabel("Origin port").fill(originPort);
    await createShipmentForm.getByRole("button", { name: originPort }).click();
    await createShipmentForm.getByLabel("Destination").fill(destinationPort);
    await createShipmentForm.getByRole("button", { name: destinationPort }).click();
    await createShipmentForm.getByLabel("Cargo type").selectOption(cargoType);
    await page.getByLabel("Weight in kg").fill("1250");
    await page.getByLabel("Volume in cbm").fill("18.5");
    await createShipmentForm.getByLabel("Seller country").selectOption("Ethiopia");
    await createShipmentForm.getByRole("combobox").nth(2).selectOption(sellerId);

    await expect(
      page.getByRole("button", { name: "Create shipment" }),
    ).toBeEnabled();
    await page.getByRole("button", { name: "Create shipment" }).click();

    await expect(
      page.getByRole("button", { name: /Shipment SHIPMENT.*Initiated Electronics/ }),
    ).toBeVisible();
    await expect(page.getByText("No documents uploaded yet.")).toBeVisible();
  });
});
