package domain

import "time"

type AdminCount struct {
	Key   string `json:"key"`
	Count int64  `json:"count"`
}

type AdminRoleStatusCount struct {
	Role   UserRole   `json:"role"`
	Status UserStatus `json:"status"`
	Count  int64      `json:"count"`
}

type AdminUserAnalytics struct {
	Total           int64                  `json:"total"`
	Active          int64                  `json:"active"`
	Pending         int64                  `json:"pending"`
	Denied          int64                  `json:"denied"`
	InfoRequired    int64                  `json:"info_required"`
	EmailUnverified int64                  `json:"email_unverified"`
	ByRole          []AdminCount           `json:"by_role"`
	ByStatus        []AdminCount           `json:"by_status"`
	ByRoleStatus    []AdminRoleStatusCount `json:"by_role_status"`
}

type AdminShipmentOverview struct {
	Total                      int64 `json:"total"`
	Active                     int64 `json:"active"`
	AwaitingDocuments          int64 `json:"awaiting_documents"`
	AwaitingSellerVerification int64 `json:"awaiting_seller_verification"`
	AwaitingESLAllocation      int64 `json:"awaiting_esl_allocation"`
	AllocatedAwaitingDeparture int64 `json:"allocated_awaiting_departure"`
	InTransit                  int64 `json:"in_transit"`
	Arrived                    int64 `json:"arrived"`
	AtCustoms                  int64 `json:"at_customs"`
	HeldForInspection          int64 `json:"held_for_inspection"`
	Cleared                    int64 `json:"cleared"`
	Rejected                   int64 `json:"rejected"`
	ActionRequired             int64 `json:"action_required"`
	FailedBlockchainProofs     int64 `json:"failed_blockchain_proofs"`
}

type AdminShipmentSummary struct {
	ID               string         `json:"id"`
	ImporterID       string         `json:"importer_id"`
	ImporterName     string         `json:"importer_name,omitempty"`
	ImporterEmail    string         `json:"importer_email,omitempty"`
	SellerID         string         `json:"seller_id,omitempty"`
	SellerName       string         `json:"seller_name,omitempty"`
	SellerEmail      string         `json:"seller_email,omitempty"`
	OriginPort       string         `json:"origin_port"`
	DestinationPort  string         `json:"destination_port"`
	CargoType        string         `json:"cargo_type"`
	WeightKG         string         `json:"weight_kg"`
	VolumeCBM        string         `json:"volume_cbm,omitempty"`
	Status           ShipmentStatus `json:"status"`
	AnchorStatus     AnchorStatus   `json:"anchor_status"`
	TransportRefs    string         `json:"transport_refs,omitempty"`
	ActionReason     string         `json:"action_reason,omitempty"`
	LastEventAction  string         `json:"last_event_action,omitempty"`
	LastEventMessage string         `json:"last_event_message,omitempty"`
	LastEventAt      *time.Time     `json:"last_event_at,omitempty"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
}

type AdminShipmentEventSummary struct {
	ID             string         `json:"id"`
	ShipmentID     string         `json:"shipment_id"`
	ShipmentStatus ShipmentStatus `json:"shipment_status"`
	ActorRole      UserRole       `json:"actor_role"`
	Action         string         `json:"action"`
	Message        string         `json:"message,omitempty"`
	AnchorStatus   AnchorStatus   `json:"anchor_status"`
	CreatedAt      time.Time      `json:"created_at"`
}

type AdminDocumentHealth struct {
	ShipmentDocumentsTotal int64        `json:"shipment_documents_total"`
	SellerDocumentsTotal   int64        `json:"seller_documents_total"`
	PendingVerification    int64        `json:"pending_verification"`
	Matched                int64        `json:"matched"`
	Mismatched             int64        `json:"mismatched"`
	Rejected               int64        `json:"rejected"`
	ByVerificationStatus   []AdminCount `json:"by_verification_status"`
	ByAnchorStatus         []AdminCount `json:"by_anchor_status"`
}

type AdminTransportHealth struct {
	SlotsTotal          int64                       `json:"slots_total"`
	AvailableSlots      int64                       `json:"available_slots"`
	BookedSlots         int64                       `json:"booked_slots"`
	MaintenanceSlots    int64                       `json:"maintenance_slots"`
	AllocatedShipments  int64                       `json:"allocated_shipments"`
	RemainingCapacityKG string                      `json:"remaining_capacity_kg"`
	UpcomingDepartures  []AdminTransportSlotSummary `json:"upcoming_departures"`
}

type AdminTransportSlotSummary struct {
	ID                  string              `json:"id"`
	TransportType       TransportType       `json:"transport_type"`
	Name                string              `json:"name"`
	ReferenceCode       string              `json:"reference_code"`
	Origin              string              `json:"origin"`
	Destination         string              `json:"destination"`
	RemainingCapacityKG string              `json:"remaining_capacity_kg"`
	AvailableFrom       time.Time           `json:"available_from"`
	Status              TransportSlotStatus `json:"status"`
}

type AdminBlockchainHealth struct {
	JobsTotal  int64        `json:"jobs_total"`
	Pending    int64        `json:"pending"`
	Processing int64        `json:"processing"`
	Anchored   int64        `json:"anchored"`
	Failed     int64        `json:"failed"`
	ByStatus   []AdminCount `json:"by_status"`
}

type AdminAnalytics struct {
	GeneratedAt             time.Time                   `json:"generated_at"`
	Overview                AdminShipmentOverview       `json:"overview"`
	ShipmentsByStatus       []AdminCount                `json:"shipments_by_status"`
	OngoingShipments        []AdminShipmentSummary      `json:"ongoing_shipments"`
	ActionRequiredShipments []AdminShipmentSummary      `json:"action_required_shipments"`
	RecentEvents            []AdminShipmentEventSummary `json:"recent_events"`
	Users                   AdminUserAnalytics          `json:"users"`
	Documents               AdminDocumentHealth         `json:"documents"`
	Transport               AdminTransportHealth        `json:"transport"`
	Blockchain              AdminBlockchainHealth       `json:"blockchain"`
}
