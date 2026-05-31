package usecase

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/abenezer54/ethio-chain-logistics/backend/internal/domain"
	"github.com/google/uuid"
)

type ESLRepository interface {
	ListVerifiedShipments(ctx context.Context, limit int) ([]domain.Shipment, error)
	ListAvailableTransportSlots(ctx context.Context, limit int) ([]domain.TransportSlot, error)
	AllocateShipment(ctx context.Context, eslAgentID, shipmentID, shipSlotID, truckSlotID string, expectedDepartureAt time.Time, notes string) (domain.ShipmentAllocationDetail, error)
}

type ESLUsecase struct {
	repo ESLRepository
}

func NewESLUsecase(repo ESLRepository) *ESLUsecase {
	return &ESLUsecase{repo: repo}
}

func (u *ESLUsecase) ListVerifiedShipments(ctx context.Context, actorRole domain.UserRole, limit int) ([]domain.Shipment, error) {
	if actorRole != domain.RoleESLAgent {
		return nil, domain.ErrForbidden
	}
	return u.repo.ListVerifiedShipments(ctx, limit)
}

func (u *ESLUsecase) ListAvailableTransportSlots(ctx context.Context, actorRole domain.UserRole, limit int) ([]domain.TransportSlot, error) {
	if actorRole != domain.RoleESLAgent {
		return nil, domain.ErrForbidden
	}
	return u.repo.ListAvailableTransportSlots(ctx, limit)
}

type AllocateShipmentRequest struct {
	ESLAgentID          string
	ActorRole           domain.UserRole
	ShipmentID          string
	ShipSlotID          string
	TruckSlotID         string
	ExpectedDepartureAt time.Time
	Notes               string
}

func (u *ESLUsecase) AllocateShipment(ctx context.Context, req AllocateShipmentRequest) (domain.ShipmentAllocationDetail, error) {
	if err := req.Validate(); err != nil {
		return domain.ShipmentAllocationDetail{}, fmt.Errorf("%w: %v", domain.ErrValidation, err)
	}
	req.ESLAgentID = strings.TrimSpace(req.ESLAgentID)
	req.ShipmentID = strings.TrimSpace(req.ShipmentID)
	req.ShipSlotID = strings.TrimSpace(req.ShipSlotID)
	req.TruckSlotID = strings.TrimSpace(req.TruckSlotID)
	req.Notes = strings.TrimSpace(req.Notes)
	return u.repo.AllocateShipment(ctx, req.ESLAgentID, req.ShipmentID, req.ShipSlotID, req.TruckSlotID, req.ExpectedDepartureAt, req.Notes)
}

func (r AllocateShipmentRequest) Validate() error {
	if r.ActorRole != domain.RoleESLAgent {
		return fmt.Errorf("only ESL agents can allocate shipments")
	}
	if strings.TrimSpace(r.ESLAgentID) == "" {
		return fmt.Errorf("esl agent id is required")
	}
	if _, err := uuid.Parse(strings.TrimSpace(r.ESLAgentID)); err != nil {
		return fmt.Errorf("esl agent id must be a valid UUID")
	}
	if strings.TrimSpace(r.ShipmentID) == "" {
		return fmt.Errorf("shipment id is required")
	}
	if _, err := uuid.Parse(strings.TrimSpace(r.ShipmentID)); err != nil {
		return fmt.Errorf("shipment id must be a valid UUID")
	}
	if strings.TrimSpace(r.ShipSlotID) == "" {
		return fmt.Errorf("ship slot id is required")
	}
	if _, err := uuid.Parse(strings.TrimSpace(r.ShipSlotID)); err != nil {
		return fmt.Errorf("ship slot id must be a valid UUID")
	}
	if strings.TrimSpace(r.TruckSlotID) == "" {
		return fmt.Errorf("truck slot id is required")
	}
	if _, err := uuid.Parse(strings.TrimSpace(r.TruckSlotID)); err != nil {
		return fmt.Errorf("truck slot id must be a valid UUID")
	}
	if strings.TrimSpace(r.ShipSlotID) == strings.TrimSpace(r.TruckSlotID) {
		return fmt.Errorf("ship and truck slots must be different")
	}
	if r.ExpectedDepartureAt.IsZero() {
		return fmt.Errorf("expected departure date is required")
	}
	return nil
}
