package domain

import "time"

type ShipmentStatus string

const (
	ShipmentStatusInitiated           ShipmentStatus = "INITIATED"
	ShipmentStatusDocsUploaded        ShipmentStatus = "DOCS_UPLOADED"
	ShipmentStatusPendingVerification ShipmentStatus = "PENDING_VERIFICATION"
	ShipmentStatusVerified            ShipmentStatus = "VERIFIED"
	ShipmentStatusApproved            ShipmentStatus = "APPROVED"
	ShipmentStatusAllocated           ShipmentStatus = "ALLOCATED"
	ShipmentStatusInTransit           ShipmentStatus = "IN_TRANSIT"
	ShipmentStatusArrived             ShipmentStatus = "ARRIVED"
	ShipmentStatusAtCustoms           ShipmentStatus = "AT_CUSTOMS"
	ShipmentStatusHeldForInspection   ShipmentStatus = "HELD_FOR_INSPECTION"
	ShipmentStatusCleared             ShipmentStatus = "CLEARED"
)

type AnchorStatus string

const (
	AnchorStatusPending  AnchorStatus = "PENDING"
	AnchorStatusAnchored AnchorStatus = "ANCHORED"
	AnchorStatusFailed   AnchorStatus = "FAILED"
)

type ShipmentDocumentType string

const (
	DocumentBillOfLading      ShipmentDocumentType = "BILL_OF_LADING"
	DocumentCommercialInvoice ShipmentDocumentType = "COMMERCIAL_INVOICE"
	DocumentLetterOfCredit    ShipmentDocumentType = "LETTER_OF_CREDIT"
	DocumentSupplemental      ShipmentDocumentType = "SUPPLEMENTAL"
)

type DocumentVerificationStatus string

const (
	DocumentVerificationPending    DocumentVerificationStatus = "PENDING"
	DocumentVerificationMatched    DocumentVerificationStatus = "MATCHED"
	DocumentVerificationMismatched DocumentVerificationStatus = "MISMATCHED"
	DocumentVerificationRejected   DocumentVerificationStatus = "REJECTED"
)

type Shipment struct {
	ID               string         `json:"id"`
	ImporterID       string         `json:"importer_id"`
	SellerID         string         `json:"seller_id,omitempty"`
	OriginPort       string         `json:"origin_port"`
	DestinationPort  string         `json:"destination_port"`
	CargoType        string         `json:"cargo_type"`
	WeightKG         string         `json:"weight_kg"`
	VolumeCBM        string         `json:"volume_cbm,omitempty"`
	Status           ShipmentStatus `json:"status"`
	AnchorStatus     AnchorStatus   `json:"anchor_status"`
	BlockchainTxHash string         `json:"blockchain_tx_hash,omitempty"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
}

type ShipmentDocument struct {
	ID                 string                     `json:"id"`
	ShipmentID         string                     `json:"shipment_id"`
	DocType            ShipmentDocumentType       `json:"doc_type"`
	OriginalFileName   string                     `json:"original_file_name"`
	ContentType        string                     `json:"content_type"`
	SizeBytes          int64                      `json:"size_bytes"`
	StorageKey         string                     `json:"storage_key"`
	SHA256Hash         string                     `json:"sha256_hash"`
	VerificationStatus DocumentVerificationStatus `json:"verification_status"`
	UploadedBy         string                     `json:"uploaded_by"`
	IPFSCID            string                     `json:"ipfs_cid,omitempty"`
	AnchorStatus       AnchorStatus               `json:"anchor_status"`
	BlockchainTxHash   string                     `json:"blockchain_tx_hash,omitempty"`
	UploadedAt         time.Time                  `json:"uploaded_at"`
}

type ShipmentEvent struct {
	ID                string         `json:"id"`
	ShipmentID        string         `json:"shipment_id"`
	ActorID           string         `json:"actor_id,omitempty"`
	ActorRole         UserRole       `json:"actor_role"`
	Action            string         `json:"action"`
	FromStatus        ShipmentStatus `json:"from_status,omitempty"`
	ToStatus          ShipmentStatus `json:"to_status,omitempty"`
	Message           string         `json:"message,omitempty"`
	Metadata          map[string]any `json:"metadata,omitempty"`
	EventHash         string         `json:"event_hash"`
	PreviousEventHash string         `json:"previous_event_hash,omitempty"`
	AnchorStatus      AnchorStatus   `json:"anchor_status"`
	BlockchainTxHash  string         `json:"blockchain_tx_hash,omitempty"`
	CreatedAt         time.Time      `json:"created_at"`
}

type ShipmentDetail struct {
	Shipment  Shipment           `json:"shipment"`
	Documents []ShipmentDocument `json:"documents"`
	Events    []ShipmentEvent    `json:"events"`
}
