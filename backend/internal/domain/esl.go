package domain

import "time"

type TransportType string

const (
	TransportTypeShip  TransportType = "SHIP"
	TransportTypeTruck TransportType = "TRUCK"
)

type TransportSlotStatus string

const (
	TransportSlotAvailable   TransportSlotStatus = "AVAILABLE"
	TransportSlotBooked      TransportSlotStatus = "BOOKED"
	TransportSlotMaintenance TransportSlotStatus = "MAINTENANCE"
)

type TransportSlot struct {
	ID                   string              `json:"id"`
	TransportType        TransportType       `json:"transport_type"`
	Name                 string              `json:"name"`
	ReferenceCode        string              `json:"reference_code"`
	Origin               string              `json:"origin"`
	Destination          string              `json:"destination"`
	CapacityKG           string              `json:"capacity_kg"`
	RemainingCapacityKG  string              `json:"remaining_capacity_kg"`
	CapacityCBM          string              `json:"capacity_cbm,omitempty"`
	RemainingCapacityCBM string              `json:"remaining_capacity_cbm,omitempty"`
	AvailableFrom        time.Time           `json:"available_from"`
	Status               TransportSlotStatus `json:"status"`
	CreatedAt            time.Time           `json:"created_at"`
	UpdatedAt            time.Time           `json:"updated_at"`
}

type ShipmentAllocation struct {
	ID                  string    `json:"id"`
	ShipmentID          string    `json:"shipment_id"`
	TransportSlotID     string    `json:"transport_slot_id"`
	LegType             string    `json:"leg_type"`
	ESLAgentID          string    `json:"esl_agent_id"`
	ExpectedDepartureAt time.Time `json:"expected_departure_at"`
	Notes               string    `json:"notes,omitempty"`
	ConfirmedAt         time.Time `json:"confirmed_at"`
	CreatedAt           time.Time `json:"created_at"`
}

type ShipmentAllocationDetail struct {
	Allocations []ShipmentAllocation `json:"allocations"`
	Shipment    Shipment             `json:"shipment"`
	Slots       []TransportSlot      `json:"slots"`
}
