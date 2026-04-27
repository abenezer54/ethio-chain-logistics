package domain

type TransportMilestone string

const (
	TransportMilestoneDepartedOrigin  TransportMilestone = "DEPARTED_ORIGIN_PORT"
	TransportMilestoneArrivedDjibouti TransportMilestone = "ARRIVED_DJIBOUTI_PORT"
	TransportMilestoneInTransitLand   TransportMilestone = "IN_TRANSIT_BY_LAND"
	TransportMilestoneArrivedDryPort  TransportMilestone = "ARRIVED_DRY_PORT"
)

type TransporterShipment struct {
	Shipment      Shipment           `json:"shipment"`
	TransportSlot TransportSlot      `json:"transport_slot"`
	Allocation    ShipmentAllocation `json:"allocation"`
	Events        []ShipmentEvent    `json:"events,omitempty"`
}
