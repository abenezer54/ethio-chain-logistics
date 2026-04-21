# Frontend

The frontend is a Next.js app for the Ethio-Chain Logistics web portal.

## Run Locally

From `frontend/`:

```bash
npm install
npm run dev
```

By default the app expects the backend at `http://localhost:8080`. Override it with:

```bash
NEXT_PUBLIC_API_BASE=http://localhost:8080 npm run dev
```

Open `http://localhost:3000`.

## Backend dependency

The frontend expects the backend API at `http://localhost:8080` by default. Start the backend stack
from the repository root with:

```bash
make up
```

## Implemented Screens

- Landing page
- Role selection
- Signup with role-specific KYC uploads
- Login
- Admin approval console
- Role dashboard
- Importer shipment workspace

## Importer Workspace

Active importer users are routed to `/dashboard`, where they can:

- Create a shipment
- List their own shipments
- Select a shipment and view detail
- Upload shipment documents
- View document verification status
- View SHA-256 document hashes
- View the audit timeline
- Refresh manually
- Poll selected shipment details every 15 seconds

Create shipment fields:

- Origin port
- Destination port
- Cargo type
- Weight in kg
- Volume in cbm
- Optional seller ID

Document upload fields:

- Bill of Lading
- Commercial Invoice
- Letter of Credit

The current importer workflow uses the backend API under `/api/v1/importer/shipments`.
Blockchain wallet, IPFS, smart contract status, and live push updates are planned later.

## Useful Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

Build the production bundle locally with:

```bash
npm run build
```
