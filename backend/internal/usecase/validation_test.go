package usecase

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/abenezer54/ethio-chain-logistics/backend/internal/domain"
)

const validUUID = "11111111-1111-1111-1111-111111111111"
const otherUUID = "22222222-2222-2222-2222-222222222222"

func TestSignupRequestValidateRoleSpecificFields(t *testing.T) {
	tests := []struct {
		name    string
		req     SignupRequest
		wantErr bool
	}{
		{
			name:    "importer requires business fields",
			req:     SignupRequest{Email: "i@example.com", Password: "secret", Role: domain.RoleImporter},
			wantErr: true,
		},
		{
			name: "seller accepts company fields",
			req:  SignupRequest{Email: "s@example.com", Password: "secret", Role: domain.RoleSeller, CompanyAddress: "Addis Ababa", OriginCountry: "Ethiopia"},
		},
		{
			name:    "invalid role rejected",
			req:     SignupRequest{Email: "x@example.com", Password: "secret", Role: domain.UserRole("UNKNOWN")},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.req.Validate()
			if (err != nil) != tt.wantErr {
				t.Fatalf("Validate() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestCreateShipmentRequestValidate(t *testing.T) {
	valid := CreateShipmentRequest{
		ImporterID:      "importer-1",
		ActorRole:       domain.RoleImporter,
		OriginPort:      "Djibouti Port",
		DestinationPort: "Modjo Dry Port",
		CargoType:       "Coffee",
		WeightKG:        "1200",
		VolumeCBM:       "18.5",
	}

	tests := []struct {
		name    string
		mutate  func(*CreateShipmentRequest)
		wantErr string
	}{
		{name: "valid"},
		{name: "wrong role", mutate: func(r *CreateShipmentRequest) { r.ActorRole = domain.RoleSeller }, wantErr: "only importers"},
		{name: "missing origin", mutate: func(r *CreateShipmentRequest) { r.OriginPort = " " }, wantErr: "origin port"},
		{name: "invalid seller id", mutate: func(r *CreateShipmentRequest) { r.SellerID = "seller-1" }, wantErr: "valid UUID"},
		{name: "negative weight", mutate: func(r *CreateShipmentRequest) { r.WeightKG = "-1" }, wantErr: "greater than zero"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := valid
			if tt.mutate != nil {
				tt.mutate(&req)
			}
			err := req.Validate()
			if tt.wantErr == "" && err != nil {
				t.Fatalf("expected nil error, got %v", err)
			}
			if tt.wantErr != "" && (err == nil || !strings.Contains(err.Error(), tt.wantErr)) {
				t.Fatalf("expected error containing %q, got %v", tt.wantErr, err)
			}
		})
	}
}

func TestUploadShipmentDocumentInputValidate(t *testing.T) {
	valid := UploadShipmentDocumentInput{
		DocType:          domain.DocumentBillOfLading,
		OriginalFileName: "bill.pdf",
		ContentType:      "application/pdf",
		SizeBytes:        12,
		StorageKey:       "shipments/1/bill.pdf",
		SHA256Hash:       strings.Repeat("a", 64),
	}

	tests := []struct {
		name    string
		mutate  func(*UploadShipmentDocumentInput)
		wantErr bool
	}{
		{name: "valid"},
		{name: "invalid type", mutate: func(d *UploadShipmentDocumentInput) { d.DocType = "UNKNOWN" }, wantErr: true},
		{name: "unsupported content type", mutate: func(d *UploadShipmentDocumentInput) { d.ContentType = "text/plain" }, wantErr: true},
		{name: "empty file", mutate: func(d *UploadShipmentDocumentInput) { d.SizeBytes = 0 }, wantErr: true},
		{name: "bad hash", mutate: func(d *UploadShipmentDocumentInput) { d.SHA256Hash = "not-a-hash" }, wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			doc := valid
			if tt.mutate != nil {
				tt.mutate(&doc)
			}
			err := doc.Validate()
			if (err != nil) != tt.wantErr {
				t.Fatalf("Validate() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestRoleRestrictedUsecasesRejectWrongActors(t *testing.T) {
	ctx := context.Background()

	if _, err := NewShipmentUsecase(nil).ListImporterShipments(ctx, "user-1", domain.RoleAdmin, 10); !errors.Is(err, domain.ErrForbidden) {
		t.Fatalf("shipment list expected forbidden, got %v", err)
	}
	if _, err := NewESLUsecase(nil).ListVerifiedShipments(ctx, domain.RoleImporter, 10); !errors.Is(err, domain.ErrForbidden) {
		t.Fatalf("esl list expected forbidden, got %v", err)
	}
	if _, err := NewTransporterUsecase(nil).ListAssignedShipments(ctx, "user-1", domain.RoleImporter, 10); !errors.Is(err, domain.ErrForbidden) {
		t.Fatalf("transporter list expected forbidden, got %v", err)
	}
	if _, err := NewCustomsUsecase(nil).ListAwaitingClearance(ctx, domain.RoleImporter, 10); !errors.Is(err, domain.ErrForbidden) {
		t.Fatalf("customs list expected forbidden, got %v", err)
	}
}

func TestAllocationTransportAndCustomsValidation(t *testing.T) {
	if err := (AllocateShipmentRequest{
		ESLAgentID:          validUUID,
		ActorRole:           domain.RoleESLAgent,
		ShipmentID:          otherUUID,
		ShipSlotID:          validUUID,
		TruckSlotID:         validUUID,
		ExpectedDepartureAt: time.Now(),
	}).Validate(); err == nil {
		t.Fatal("expected duplicate slot ids to be rejected")
	}

	if err := (AddTransportMilestoneRequest{
		TransporterID: validUUID,
		ActorRole:     domain.RoleTransporter,
		ShipmentID:    otherUUID,
		AllocationID:  "33333333-3333-3333-3333-333333333333",
		Milestone:     domain.TransportMilestoneInTransitLand,
		Latitude:      "91",
		Longitude:     "38.7",
	}).Validate(); err == nil {
		t.Fatal("expected out-of-range latitude to be rejected")
	}

	if err := (GrantDigitalReleaseRequest{
		OfficerID:  validUUID,
		ActorRole:  domain.RoleCustoms,
		ShipmentID: otherUUID,
	}).Validate(); err != nil {
		t.Fatalf("expected customs release request to validate, got %v", err)
	}
}
