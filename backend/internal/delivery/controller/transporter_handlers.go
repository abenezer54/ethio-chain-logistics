package controller

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/abenezer54/ethio-chain-logistics/backend/internal/domain"
	"github.com/abenezer54/ethio-chain-logistics/backend/internal/usecase"
	"github.com/gin-gonic/gin"
)

type TransporterHandlers struct {
	transporter *usecase.TransporterUsecase
}

func NewTransporterHandlers(transporter *usecase.TransporterUsecase) *TransporterHandlers {
	return &TransporterHandlers{transporter: transporter}
}

func (h *TransporterHandlers) RegisterRoutes(v1 *gin.RouterGroup, jwtSecret string) {
	t := v1.Group("/transporter")
	t.Use(RequireAuth(jwtSecret))
	t.Use(RequireRole(domain.RoleTransporter))

	t.GET("/shipments", h.listShipments)
	t.GET("/shipments/:id", h.getShipment)
	t.POST("/shipments/:id/milestones", h.addMilestone)
}

func (h *TransporterHandlers) listShipments(c *gin.Context) {
	limit := 100
	if v := c.Query("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			limit = n
		}
	}
	items, err := h.transporter.ListAssignedShipments(c.Request.Context(), currentUserID(c), currentUserRole(c), limit)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *TransporterHandlers) getShipment(c *gin.Context) {
	item, err := h.transporter.GetAssignedShipment(
		c.Request.Context(),
		currentUserID(c),
		currentUserRole(c),
		strings.TrimSpace(c.Param("id")),
		strings.TrimSpace(c.Query("allocation_id")),
	)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, item)
}

func (h *TransporterHandlers) addMilestone(c *gin.Context) {
	var body struct {
		Milestone    string `json:"milestone"`
		AllocationID string `json:"allocation_id"`
		Latitude     string `json:"latitude"`
		Longitude    string `json:"longitude"`
		LocationNote string `json:"location_note"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid json"})
		return
	}

	item, err := h.transporter.AddMilestone(c.Request.Context(), usecase.AddTransportMilestoneRequest{
		TransporterID: currentUserID(c),
		ActorRole:     currentUserRole(c),
		ShipmentID:    strings.TrimSpace(c.Param("id")),
		AllocationID:  strings.TrimSpace(body.AllocationID),
		Milestone:     domain.TransportMilestone(strings.ToUpper(strings.TrimSpace(body.Milestone))),
		Latitude:      body.Latitude,
		Longitude:     body.Longitude,
		LocationNote:  body.LocationNote,
	})
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusCreated, item)
}
