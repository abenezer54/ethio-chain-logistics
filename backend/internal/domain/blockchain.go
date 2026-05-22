package domain

import "time"

type AnchorRecordType int

const (
	AnchorRecordTypeShipmentEvent    AnchorRecordType = 1
	AnchorRecordTypeImporterDocument AnchorRecordType = 2
	AnchorRecordTypeSellerDocument   AnchorRecordType = 3
)

type AnchorJobStatus string

const (
	AnchorJobStatusPending    AnchorJobStatus = "PENDING"
	AnchorJobStatusProcessing AnchorJobStatus = "PROCESSING"
	AnchorJobStatusAnchored   AnchorJobStatus = "ANCHORED"
	AnchorJobStatusFailed     AnchorJobStatus = "FAILED"
)

type AnchorJob struct {
	ID               string           `json:"id"`
	TargetTable      string           `json:"target_table"`
	TargetID         string           `json:"target_id"`
	ShipmentID       string           `json:"shipment_id"`
	RecordType       AnchorRecordType `json:"record_type"`
	RecordHash       string           `json:"record_hash"`
	PreviousHash     string           `json:"previous_hash,omitempty"`
	Status           AnchorJobStatus  `json:"status"`
	AttemptCount     int              `json:"attempt_count"`
	LastError        string           `json:"last_error,omitempty"`
	BlockchainTxHash string           `json:"blockchain_tx_hash,omitempty"`
	CreatedAt        time.Time        `json:"created_at"`
	UpdatedAt        time.Time        `json:"updated_at"`
	ProcessedAt      *time.Time       `json:"processed_at,omitempty"`
}

type BlockchainProof struct {
	Enabled         bool   `json:"enabled"`
	Network         string `json:"network,omitempty"`
	ChainID         string `json:"chain_id,omitempty"`
	ContractAddress string `json:"contract_address,omitempty"`
	ExplorerTxBase  string `json:"explorer_tx_base,omitempty"`
}
