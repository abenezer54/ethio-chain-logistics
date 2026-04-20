package usecase

import (
	"context"
	"encoding/hex"
	"fmt"
	"strconv"
	"strings"

	"github.com/abenezer54/ethio-chain-logistics/backend/internal/domain"
	"github.com/google/uuid"
)

type ShipmentRepository interface {
	CreateShipment(ctx context.Context, shipment domain.Shipment) (domain.Shipment, error)
	ListImporterShipments(ctx context.Context, importerID string, limit int) ([]domain.Shipment, error)
	GetImporterShipmentDetail(ctx context.Context, importerID, shipmentID string) (domain.ShipmentDetail, error)
	AddShipmentDocuments(ctx context.Context, importerID, shipmentID string, docs []domain.ShipmentDocument) (domain.ShipmentDetail, error)
	GetImporterShipmentDocument(ctx context.Context, importerID, shipmentID, docID string) (domain.ShipmentDocument, error)
}

type ShipmentUsecase struct {
	shipments ShipmentRepository
}

func NewShipmentUsecase(shipments ShipmentRepository) *ShipmentUsecase {
	return &ShipmentUsecase{shipments: shipments}
}

type CreateShipmentRequest struct {
	ImporterID      string
	ActorRole       domain.UserRole
	SellerID        string
	OriginPort      string
	DestinationPort string
	CargoType       string
	WeightKG        string
	VolumeCBM       string
}

func (u *ShipmentUsecase) CreateShipment(ctx context.Context, req CreateShipmentRequest) (domain.Shipment, error) {
	if err := req.Validate(); err != nil {
		return domain.Shipment{}, fmt.Errorf("%w: %v", domain.ErrValidation, err)
	}
	return u.shipments.CreateShipment(ctx, domain.Shipment{
		ImporterID:      strings.TrimSpace(req.ImporterID),
		SellerID:        strings.TrimSpace(req.SellerID),
		OriginPort:      strings.TrimSpace(req.OriginPort),
		DestinationPort: strings.TrimSpace(req.DestinationPort),
		CargoType:       strings.TrimSpace(req.CargoType),
		WeightKG:        strings.TrimSpace(req.WeightKG),
		VolumeCBM:       strings.TrimSpace(req.VolumeCBM),
		Status:          domain.ShipmentStatusInitiated,
		AnchorStatus:    domain.AnchorStatusPending,
	})
}

func (r CreateShipmentRequest) Validate() error {
	if r.ActorRole != domain.RoleImporter {
		return fmt.Errorf("only importers can create shipments")
	}
	if strings.TrimSpace(r.ImporterID) == "" {
		return fmt.Errorf("importer id is required")
	}
	if strings.TrimSpace(r.OriginPort) == "" {
		return fmt.Errorf("origin port is required")
	}
	if strings.TrimSpace(r.DestinationPort) == "" {
		return fmt.Errorf("destination port is required")
	}
	if strings.TrimSpace(r.CargoType) == "" {
		return fmt.Errorf("cargo type is required")
	}
	if strings.TrimSpace(r.SellerID) != "" {
		if _, err := uuid.Parse(strings.TrimSpace(r.SellerID)); err != nil {
			return fmt.Errorf("seller_id must be a valid UUID")
		}
	}
	if err := validatePositiveDecimal(r.WeightKG, "weight_kg"); err != nil {
		return err
	}
	if strings.TrimSpace(r.VolumeCBM) != "" {
		if err := validatePositiveDecimal(r.VolumeCBM, "volume_cbm"); err != nil {
			return err
		}
	}
	return nil
}

type UploadShipmentDocumentsRequest struct {
	ImporterID string
	ActorRole  domain.UserRole
	ShipmentID string
	Documents  []UploadShipmentDocumentInput
}

type UploadShipmentDocumentInput struct {
	DocType          domain.ShipmentDocumentType
	OriginalFileName string
	ContentType      string
	SizeBytes        int64
	StorageKey       string
	SHA256Hash       string
}

func (u *ShipmentUsecase) UploadShipmentDocuments(ctx context.Context, req UploadShipmentDocumentsRequest) (domain.ShipmentDetail, error) {
	if err := req.Validate(); err != nil {
		return domain.ShipmentDetail{}, fmt.Errorf("%w: %v", domain.ErrValidation, err)
	}
	docs := make([]domain.ShipmentDocument, 0, len(req.Documents))
	for _, d := range req.Documents {
		docs = append(docs, domain.ShipmentDocument{
			DocType:          d.DocType,
			OriginalFileName: strings.TrimSpace(d.OriginalFileName),
			ContentType:      strings.TrimSpace(d.ContentType),
			SizeBytes:        d.SizeBytes,
			StorageKey:       strings.TrimSpace(d.StorageKey),
			SHA256Hash:       strings.TrimSpace(strings.ToLower(d.SHA256Hash)),
		})
	}
	return u.shipments.AddShipmentDocuments(ctx, strings.TrimSpace(req.ImporterID), strings.TrimSpace(req.ShipmentID), docs)
}

func (r UploadShipmentDocumentsRequest) Validate() error {
	if r.ActorRole != domain.RoleImporter {
		return fmt.Errorf("only importers can upload importer shipment documents")
	}
	if strings.TrimSpace(r.ImporterID) == "" {
		return fmt.Errorf("importer id is required")
	}
	if strings.TrimSpace(r.ShipmentID) == "" {
		return fmt.Errorf("shipment id is required")
	}
	if len(r.Documents) == 0 {
		return fmt.Errorf("at least one document is required")
	}
	for _, d := range r.Documents {
		if err := d.Validate(); err != nil {
			return err
		}
	}
	return nil
}

func (d UploadShipmentDocumentInput) Validate() error {
	switch d.DocType {
	case domain.DocumentBillOfLading, domain.DocumentCommercialInvoice, domain.DocumentLetterOfCredit, domain.DocumentSupplemental:
	default:
		return fmt.Errorf("invalid document type")
	}
	if strings.TrimSpace(d.OriginalFileName) == "" {
		return fmt.Errorf("document file name is required")
	}
	if !isAllowedShipmentDocumentContentType(d.ContentType) {
		return fmt.Errorf("document must be a PDF or image")
	}
	if d.SizeBytes <= 0 {
		return fmt.Errorf("document must not be empty")
	}
	if strings.TrimSpace(d.StorageKey) == "" {
		return fmt.Errorf("document storage key is required")
	}
	hash := strings.TrimSpace(strings.ToLower(d.SHA256Hash))
	if len(hash) != 64 {
		return fmt.Errorf("document sha256 hash is invalid")
	}
	if _, err := hex.DecodeString(hash); err != nil {
		return fmt.Errorf("document sha256 hash is invalid")
	}
	return nil
}

func (u *ShipmentUsecase) ListImporterShipments(ctx context.Context, importerID string, actorRole domain.UserRole, limit int) ([]domain.Shipment, error) {
	if actorRole != domain.RoleImporter {
		return nil, domain.ErrForbidden
	}
	if strings.TrimSpace(importerID) == "" {
		return nil, fmt.Errorf("%w: importer id is required", domain.ErrValidation)
	}
	return u.shipments.ListImporterShipments(ctx, strings.TrimSpace(importerID), limit)
}

func (u *ShipmentUsecase) GetImporterShipment(ctx context.Context, importerID string, actorRole domain.UserRole, shipmentID string) (domain.ShipmentDetail, error) {
	if actorRole != domain.RoleImporter {
		return domain.ShipmentDetail{}, domain.ErrForbidden
	}
	if strings.TrimSpace(importerID) == "" || strings.TrimSpace(shipmentID) == "" {
		return domain.ShipmentDetail{}, fmt.Errorf("%w: importer id and shipment id are required", domain.ErrValidation)
	}
	return u.shipments.GetImporterShipmentDetail(ctx, strings.TrimSpace(importerID), strings.TrimSpace(shipmentID))
}

func (u *ShipmentUsecase) GetImporterShipmentDocument(ctx context.Context, importerID string, actorRole domain.UserRole, shipmentID, docID string) (domain.ShipmentDocument, error) {
	if actorRole != domain.RoleImporter {
		return domain.ShipmentDocument{}, domain.ErrForbidden
	}
	if strings.TrimSpace(importerID) == "" || strings.TrimSpace(shipmentID) == "" || strings.TrimSpace(docID) == "" {
		return domain.ShipmentDocument{}, fmt.Errorf("%w: importer id, shipment id, and document id are required", domain.ErrValidation)
	}
	return u.shipments.GetImporterShipmentDocument(ctx, strings.TrimSpace(importerID), strings.TrimSpace(shipmentID), strings.TrimSpace(docID))
}

func validatePositiveDecimal(value, field string) error {
	n, err := strconv.ParseFloat(strings.TrimSpace(value), 64)
	if err != nil || n <= 0 {
		return fmt.Errorf("%s must be greater than zero", field)
	}
	return nil
}

func isAllowedShipmentDocumentContentType(contentType string) bool {
	ct := strings.ToLower(strings.TrimSpace(contentType))
	return ct == "application/pdf" || strings.HasPrefix(ct, "image/")
}
