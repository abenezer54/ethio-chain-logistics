package usecase

import (
	"context"
	"fmt"
	"time"

	"github.com/abenezer54/ethio-chain-logistics/backend/internal/domain"
)

type SellerRepository interface {
	ListPendingShipments(ctx context.Context, sellerID string, limit int) ([]domain.Shipment, error)
	GetShipmentDocuments(ctx context.Context, shipmentID string) ([]domain.ShipmentDocument, error)
	AddSellerDocument(ctx context.Context, shipmentID, sellerID string, doc domain.SellerDocument) (domain.SellerDocument, error)
	CreateVerification(ctx context.Context, v domain.SellerVerification) (domain.SellerVerification, error)
	SetShipmentStatus(ctx context.Context, shipmentID, status string) error
	ListApprovedShipments(ctx context.Context, sellerID string, limit int) ([]domain.Shipment, error)
	CreateNotification(ctx context.Context, n domain.Notification) (domain.Notification, error)
	ListNotifications(ctx context.Context, userID string, limit int) ([]domain.Notification, error)
}

type SellerUsecase struct {
	repo SellerRepository
}

func NewSellerUsecase(repo SellerRepository) *SellerUsecase {
	return &SellerUsecase{repo: repo}
}

func (u *SellerUsecase) Dashboard(ctx context.Context, sellerID string) (map[string]any, error) {
	pending, err := u.repo.ListPendingShipments(ctx, sellerID, 1)
	if err != nil {
		return nil, err
	}
	count := 0
	if len(pending) > 0 {
		// count approximate by querying with a higher limit if needed; keep simple here
		// use 100 limit to determine pending count upper bound
		items, err := u.repo.ListPendingShipments(ctx, sellerID, 100)
		if err == nil {
			count = len(items)
		}
	}
	return map[string]any{"pending_count": count}, nil
}

func (u *SellerUsecase) ListPending(ctx context.Context, sellerID string, limit int) ([]domain.Shipment, error) {
	return u.repo.ListPendingShipments(ctx, sellerID, limit)
}

func (u *SellerUsecase) GetShipmentDocuments(ctx context.Context, shipmentID string) ([]domain.ShipmentDocument, error) {
	return u.repo.GetShipmentDocuments(ctx, shipmentID)
}

func (u *SellerUsecase) UploadSellerDocument(ctx context.Context, shipmentID, sellerID string, doc domain.SellerDocument) (domain.SellerDocument, error) {
	return u.repo.AddSellerDocument(ctx, shipmentID, sellerID, doc)
}

func (u *SellerUsecase) VerifyShipment(ctx context.Context, sellerID, shipmentID, action string, checks map[string]bool, reason string) (domain.SellerVerification, error) {
	// Build verification record
	v := domain.SellerVerification{
		ShipmentID: shipmentID,
		SellerID:   sellerID,
		Action:     action,
		Checks:     checks,
		Reason:     reason,
	}

	// Simulate blockchain recording
	txid, err := simulateBlockchainRecord(ctx, shipmentID, sellerID, action, checks, reason)
	if err != nil {
		return domain.SellerVerification{}, fmt.Errorf("blockchain record failed: %w", err)
	}
	v.TxID = txid

	// Persist verification
	v2, err := u.repo.CreateVerification(ctx, v)
	if err != nil {
		return domain.SellerVerification{}, err
	}

	// Update shipment status
	status := "SELLER_VERIFIED"
	if action == "REJECT" || action == "REQUEST_CHANGES" {
		if action == "REJECT" {
			status = "SELLER_REJECTED"
		} else {
			status = "SELLER_REQUESTED_CHANGES"
		}
	}
	if err := u.repo.SetShipmentStatus(ctx, shipmentID, status); err != nil {
		return domain.SellerVerification{}, err
	}

	// Notify importer and ESL agent (simple payloads)
	// For demonstration, create a notification placeholder (user_id can be set by caller integration)
	_, _ = u.repo.CreateNotification(ctx, domain.Notification{UserID: "", Type: "shipment_seller_action", Payload: map[string]interface{}{"shipment_id": shipmentID, "action": action}})

	return v2, nil
}

func (u *SellerUsecase) ListApprovedShipments(ctx context.Context, sellerID string, limit int) ([]domain.Shipment, error) {
	return u.repo.ListApprovedShipments(ctx, sellerID, limit)
}

func (u *SellerUsecase) ListNotifications(ctx context.Context, userID string, limit int) ([]domain.Notification, error) {
	return u.repo.ListNotifications(ctx, userID, limit)
}

// simulateBlockchainRecord simulates writing an event to a blockchain and returns a tx id
func simulateBlockchainRecord(ctx context.Context, shipmentID, sellerID, action string, checks map[string]bool, reason string) (string, error) {
	// Simulate latency
	select {
	case <-ctx.Done():
		return "", ctx.Err()
	case <-time.After(200 * time.Millisecond):
	}
	// Create a pseudo tx id
	return fmt.Sprintf("tx_%s_%d", shipmentID, time.Now().UnixNano()), nil
}
