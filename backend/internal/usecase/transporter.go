package usecase

import (
	"context"
	"fmt"
	"strconv"
	"strings"

	"github.com/abenezer54/ethio-chain-logistics/backend/internal/domain"
	"github.com/google/uuid"
)

type TransporterRepository interface {
	ListAssignedShipments(ctx context.Context, transporterID string, limit int) ([]domain.TransporterShipment, error)
	GetAssignedShipment(ctx context.Context, transporterID, shipmentID, allocationID string) (domain.TransporterShipment, error)
	AddMilestone(ctx context.Context, req AddTransportMilestoneRequest) (domain.TransporterShipment, error)
}

type TransporterUsecase struct {
	repo TransporterRepository
}

func NewTransporterUsecase(repo TransporterRepository) *TransporterUsecase {
	return &TransporterUsecase{repo: repo}
}

func (u *TransporterUsecase) ListAssignedShipments(ctx context.Context, actorID string, actorRole domain.UserRole, limit int) ([]domain.TransporterShipment, error) {
	if actorRole != domain.RoleTransporter {
		return nil, domain.ErrForbidden
	}
	if strings.TrimSpace(actorID) == "" {
		return nil, fmt.Errorf("%w: transporter id is required", domain.ErrValidation)
	}
	return u.repo.ListAssignedShipments(ctx, strings.TrimSpace(actorID), limit)
}

func (u *TransporterUsecase) GetAssignedShipment(ctx context.Context, actorID string, actorRole domain.UserRole, shipmentID, allocationID string) (domain.TransporterShipment, error) {
	if actorRole != domain.RoleTransporter {
		return domain.TransporterShipment{}, domain.ErrForbidden
	}
	if strings.TrimSpace(actorID) == "" || strings.TrimSpace(shipmentID) == "" {
		return domain.TransporterShipment{}, fmt.Errorf("%w: transporter id and shipment id are required", domain.ErrValidation)
	}
	return u.repo.GetAssignedShipment(ctx, strings.TrimSpace(actorID), strings.TrimSpace(shipmentID), strings.TrimSpace(allocationID))
}

type AddTransportMilestoneRequest struct {
	TransporterID string
	ActorRole     domain.UserRole
	ShipmentID    string
	AllocationID  string
	Milestone     domain.TransportMilestone
	Latitude      string
	Longitude     string
	LocationNote  string
}

func (u *TransporterUsecase) AddMilestone(ctx context.Context, req AddTransportMilestoneRequest) (domain.TransporterShipment, error) {
	if err := req.Validate(); err != nil {
		return domain.TransporterShipment{}, fmt.Errorf("%w: %v", domain.ErrValidation, err)
	}
	req.TransporterID = strings.TrimSpace(req.TransporterID)
	req.ShipmentID = strings.TrimSpace(req.ShipmentID)
	req.AllocationID = strings.TrimSpace(req.AllocationID)
	req.Latitude = strings.TrimSpace(req.Latitude)
	req.Longitude = strings.TrimSpace(req.Longitude)
	req.LocationNote = strings.TrimSpace(req.LocationNote)
	return u.repo.AddMilestone(ctx, req)
}

func (r AddTransportMilestoneRequest) Validate() error {
	if r.ActorRole != domain.RoleTransporter {
		return fmt.Errorf("only transporters can update transport milestones")
	}
	if strings.TrimSpace(r.TransporterID) == "" {
		return fmt.Errorf("transporter id is required")
	}
	if _, err := uuid.Parse(strings.TrimSpace(r.TransporterID)); err != nil {
		return fmt.Errorf("transporter id must be a valid UUID")
	}
	if strings.TrimSpace(r.ShipmentID) == "" {
		return fmt.Errorf("shipment id is required")
	}
	if _, err := uuid.Parse(strings.TrimSpace(r.ShipmentID)); err != nil {
		return fmt.Errorf("shipment id must be a valid UUID")
	}
	if strings.TrimSpace(r.AllocationID) == "" {
		return fmt.Errorf("allocation id is required")
	}
	if _, err := uuid.Parse(strings.TrimSpace(r.AllocationID)); err != nil {
		return fmt.Errorf("allocation id must be a valid UUID")
	}
	switch r.Milestone {
	case domain.TransportMilestoneDepartedOrigin,
		domain.TransportMilestoneArrivedDjibouti,
		domain.TransportMilestoneInTransitLand,
		domain.TransportMilestoneArrivedDryPort:
	default:
		return fmt.Errorf("invalid milestone")
	}
	if err := validateCoordinate(r.Latitude, -90, 90, "latitude"); err != nil {
		return err
	}
	if err := validateCoordinate(r.Longitude, -180, 180, "longitude"); err != nil {
		return err
	}
	return nil
}

func validateCoordinate(value string, min, max float64, field string) error {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil
	}
	n, err := strconv.ParseFloat(value, 64)
	if err != nil || n < min || n > max {
		return fmt.Errorf("%s must be between %.0f and %.0f", field, min, max)
	}
	return nil
}
