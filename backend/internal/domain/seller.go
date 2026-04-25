package domain

import "time"

type SellerDocument struct {
    ID               string    `json:"id"`
    ShipmentID       string    `json:"shipment_id"`
    SellerID         string    `json:"seller_id"`
    DocType          string    `json:"doc_type"`
    OriginalFileName string    `json:"original_file_name"`
    ContentType      string    `json:"content_type"`
    SizeBytes        int64     `json:"size_bytes"`
    StorageKey       string    `json:"storage_key"`
    SHA256Hash       string    `json:"sha256_hash"`
    UploadedAt       time.Time `json:"uploaded_at"`
}

type SellerVerification struct {
    ID         string                 `json:"id"`
    ShipmentID string                 `json:"shipment_id"`
    SellerID   string                 `json:"seller_id"`
    Action     string                 `json:"action"`
    Checks     map[string]bool        `json:"checks,omitempty"`
    Reason     string                 `json:"reason,omitempty"`
    TxID       string                 `json:"tx_id,omitempty"`
    CreatedAt  *time.Time             `json:"created_at,omitempty"`
}

type Notification struct {
    ID        string                 `json:"id"`
    UserID    string                 `json:"user_id"`
    Type      string                 `json:"type"`
    Payload   map[string]interface{} `json:"payload"`
    IsRead    bool                   `json:"is_read"`
    CreatedAt *time.Time             `json:"created_at,omitempty"`
}
