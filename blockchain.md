# Ethereum Blockchain Integration

This project should use Ethereum/EVM as a proof layer for shipment integrity. The backend and PostgreSQL remain the source of truth for users, shipments, documents, status changes, and permissions. Ethereum stores only small cryptographic proofs that a document hash or audit event hash existed at a specific time.

The first implementation is local-first and free:

- Local blockchain: Hardhat Network.
- Optional public testnet later: Sepolia.
- Smart contract language: Solidity.
- Backend integration: Go service using `go-ethereum`.
- On-chain data: hashes only.

## Why Ethereum Fits This Project

Ethio Chain Logistics already computes SHA-256 hashes for uploaded shipment documents and stores hash-linked audit events with `event_hash` and `previous_event_hash`. Ethereum is a good match because the app only needs tamper evidence, not a full blockchain replacement for the backend.

The architecture should be:

```text
Frontend
  -> Go API
  -> PostgreSQL
  -> blockchain_anchor_jobs table
  -> backend anchor worker
  -> Ethereum smart contract
```

PostgreSQL stores the real application data. Ethereum stores notarized fingerprints.

## What Goes On-Chain

The contract stores:

- `shipmentKey`: a `bytes32` key derived from the shipment ID.
- `recordHash`: the document SHA-256 hash or shipment event hash.
- `previousHash`: the previous event hash for audit events, or zero for documents.
- `recordType`: event, importer document, or seller document.
- `anchoredBy`: backend signer address.
- `anchoredAt`: blockchain timestamp.

Do not store these on-chain:

- Uploaded files.
- Bills of lading, invoices, certificates, or images.
- Names, emails, phone numbers, company details, or cargo details.
- Plain shipment IDs.
- Private keys.

## Smart Contract

The `blockchain/` folder contains a Hardhat project with `ShipmentAnchor.sol`.

The contract has one main write function:

```solidity
function anchorRecord(
    bytes32 shipmentKey,
    bytes32 recordHash,
    bytes32 previousHash,
    uint8 recordType
) external onlyOwner
```

Record types:

- `1`: shipment audit event.
- `2`: importer shipment document.
- `3`: seller/export document.

The contract emits `RecordAnchored` for every proof. The emitted transaction hash becomes the receipt that the backend stores in `blockchain_tx_hash`.

## Backend Configuration

The backend uses these environment variables:

```env
BLOCKCHAIN_ENABLED=false
BLOCKCHAIN_NETWORK=hardhat-local
BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545
BLOCKCHAIN_CHAIN_ID=31337
BLOCKCHAIN_PRIVATE_KEY=
ANCHOR_CONTRACT_ADDRESS=
BLOCK_EXPLORER_TX_BASE=
ANCHOR_WORKER_INTERVAL_SECONDS=5
ANCHOR_CONFIRM_TIMEOUT_SECONDS=60
```

When `BLOCKCHAIN_ENABLED=false`, normal shipment workflows continue without sending Ethereum transactions. Anchor jobs can remain pending until the worker is enabled.

## Database

The backend adds `blockchain_anchor_jobs` as an outbox table. This keeps user-facing API requests fast and reliable.

Each job records:

- target table and row ID.
- shipment ID.
- record type.
- record hash.
- previous hash.
- status.
- attempt count.
- last error.
- transaction hash.
- timestamps.

The worker processes pending jobs asynchronously and updates the original shipment event or document row after confirmation.

## Workflow

When an importer uploads a document:

1. Backend saves the file.
2. Backend computes SHA-256.
3. Backend stores the document row in PostgreSQL.
4. Backend enqueues an anchor job.
5. Worker sends the hash to Ethereum.
6. Ethereum returns a transaction hash.
7. Backend marks the document `ANCHORED`.
8. UI shows the blockchain proof badge.

When an audit event is created:

1. Backend computes `event_hash`.
2. Event includes `previous_event_hash`.
3. Backend stores the event in PostgreSQL.
4. Backend enqueues an anchor job.
5. Worker anchors the event hash on Ethereum.

The app must not fail a shipment action just because Ethereum is down. Blockchain anchoring is proof, not the operational source of truth.

## Local Development

Start local blockchain:

```bash
cd blockchain
npm install
npm run node
```

Deploy contract in another terminal:

```bash
cd blockchain
npm run deploy:local
```

Copy the deployed contract address and one Hardhat private key into `.env`:

```env
BLOCKCHAIN_ENABLED=true
BLOCKCHAIN_NETWORK=hardhat-local
BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545
BLOCKCHAIN_CHAIN_ID=31337
BLOCKCHAIN_PRIVATE_KEY=<hardhat-private-key>
ANCHOR_CONTRACT_ADDRESS=<deployed-contract-address>
```

Then start the backend. Shipment events and document hashes will be anchored to the local chain.

## Optional Sepolia Demo

Sepolia is optional and should only be used for public demos. It requires:

- free Sepolia test ETH,
- a Sepolia RPC URL,
- deployed `ShipmentAnchor` contract address,
- backend private key funded with test ETH.

Sepolia settings:

```env
BLOCKCHAIN_ENABLED=true
BLOCKCHAIN_NETWORK=sepolia
BLOCKCHAIN_RPC_URL=<sepolia-rpc-url>
BLOCKCHAIN_CHAIN_ID=11155111
BLOCKCHAIN_PRIVATE_KEY=<testnet-private-key>
ANCHOR_CONTRACT_ADDRESS=<sepolia-contract-address>
BLOCK_EXPLORER_TX_BASE=https://sepolia.etherscan.io/tx/
```

## Acceptance Criteria

The integration is complete when:

- the contract can be tested and deployed locally,
- document hashes are anchored,
- shipment event hashes are anchored,
- anchor status and transaction hash are visible in API responses,
- the UI shows proof badges,
- the app still works when blockchain is disabled,
- fake seller blockchain transaction IDs are removed.

