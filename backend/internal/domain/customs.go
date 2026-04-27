package domain

import "time"

type CustomsDocumentCheck struct {
	ID                 string                     `json:"id"`
	ShipmentID         string                     `json:"shipment_id"`
	Source             string                     `json:"source"`
	DocType            string                     `json:"doc_type"`
	OriginalFileName   string                     `json:"original_file_name"`
	ContentType        string                     `json:"content_type"`
	SizeBytes          int64                      `json:"size_bytes"`
	SHA256Hash         string                     `json:"sha256_hash"`
	VerificationStatus DocumentVerificationStatus `json:"verification_status,omitempty"`
	HashMatches        bool                       `json:"hash_matches"`
	HashStatus         string                     `json:"hash_status"`
	UploadedAt         time.Time                  `json:"uploaded_at"`
}

type CustomsShipmentDetail struct {
	Shipment     Shipment               `json:"shipment"`
	Documents    []CustomsDocumentCheck `json:"documents"`
	Events       []ShipmentEvent        `json:"events"`
	ReleaseReady bool                   `json:"release_ready"`
}
