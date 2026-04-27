package usecase

import (
	"context"
	"fmt"
	"strings"

	"github.com/abenezer54/ethio-chain-logistics/backend/internal/domain"
	"github.com/google/uuid"
)

type CustomsRepository interface {
	ListAwaitingClearance(ctx context.Context, limit int) ([]domain.Shipment, error)
	GetShipmentDetail(ctx context.Context, shipmentID string) (domain.ShipmentDetail, error)
	GrantDigitalRelease(ctx context.Context, officerID, shipmentID string) (domain.ShipmentDetail, error)
}

type CustomsUsecase struct {
	repo CustomsRepository
}

func NewCustomsUsecase(repo CustomsRepository) *CustomsUsecase {
	return &CustomsUsecase{repo: repo}
}

func (u *CustomsUsecase) ListAwaitingClearance(ctx context.Context, actorRole domain.UserRole, limit int) ([]domain.Shipment, error) {
	if actorRole != domain.RoleCustoms {
		return nil, domain.ErrForbidden
	}
	return u.repo.ListAwaitingClearance(ctx, limit)
}

func (u *CustomsUsecase) GetShipmentDetail(ctx context.Context, actorRole domain.UserRole, shipmentID string) (domain.ShipmentDetail, error) {
	if actorRole != domain.RoleCustoms {
		return domain.ShipmentDetail{}, domain.ErrForbidden
	}
	if strings.TrimSpace(shipmentID) == "" {
		return domain.ShipmentDetail{}, fmt.Errorf("%w: shipment id is required", domain.ErrValidation)
	}
	if _, err := uuid.Parse(strings.TrimSpace(shipmentID)); err != nil {
		return domain.ShipmentDetail{}, fmt.Errorf("%w: shipment id must be a valid UUID", domain.ErrValidation)
	}
	return u.repo.GetShipmentDetail(ctx, strings.TrimSpace(shipmentID))
}

type GrantDigitalReleaseRequest struct {
	OfficerID  string
	ActorRole  domain.UserRole
	ShipmentID string
}

func (u *CustomsUsecase) GrantDigitalRelease(ctx context.Context, req GrantDigitalReleaseRequest) (domain.ShipmentDetail, error) {
	if err := req.Validate(); err != nil {
		return domain.ShipmentDetail{}, fmt.Errorf("%w: %v", domain.ErrValidation, err)
	}
	return u.repo.GrantDigitalRelease(ctx, strings.TrimSpace(req.OfficerID), strings.TrimSpace(req.ShipmentID))
}

func (r GrantDigitalReleaseRequest) Validate() error {
	if r.ActorRole != domain.RoleCustoms {
		return fmt.Errorf("only customs officers can grant digital release")
	}
	if strings.TrimSpace(r.OfficerID) == "" {
		return fmt.Errorf("officer id is required")
	}
	if _, err := uuid.Parse(strings.TrimSpace(r.OfficerID)); err != nil {
		return fmt.Errorf("officer id must be a valid UUID")
	}
	if strings.TrimSpace(r.ShipmentID) == "" {
		return fmt.Errorf("shipment id is required")
	}
	if _, err := uuid.Parse(strings.TrimSpace(r.ShipmentID)); err != nil {
		return fmt.Errorf("shipment id must be a valid UUID")
	}
	return nil
}
