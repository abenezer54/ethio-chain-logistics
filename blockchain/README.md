# Ethio Chain Logistics Blockchain

This folder contains the Ethereum proof layer for Ethio Chain Logistics.

The smart contract stores only hashes:

- shipment event hashes,
- importer document SHA-256 hashes,
- seller/export document SHA-256 hashes.

It does not store shipment documents, user data, cargo details, or workflow state.

## Setup

```bash
npm install
npm run compile
```

## Local Development

Terminal 1:

```bash
npm run node
```

Terminal 2:

```bash
npm run deploy:local
```

Use the deployment address in the backend `.env` as `ANCHOR_CONTRACT_ADDRESS`.

## Tests

```bash
npm test
```

