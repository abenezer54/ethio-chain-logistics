package controller

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/abenezer54/ethio-chain-logistics/backend/internal/domain"
	"github.com/abenezer54/ethio-chain-logistics/backend/internal/usecase"
	"github.com/gin-gonic/gin"
)

type ESLHandlers struct {
	esl *usecase.ESLUsecase
}

func NewESLHandlers(esl *usecase.ESLUsecase) *ESLHandlers {
	return &ESLHandlers{esl: esl}
}

func (h *ESLHandlers) RegisterRoutes(v1 *gin.RouterGroup, jwtSecret string) {
	esl := v1.Group("/esl")
	esl.Use(RequireAuth(jwtSecret))
	esl.Use(RequireRole(domain.RoleESLAgent))

	esl.GET("/shipments/verified", h.listVerifiedShipments)
	esl.GET("/transport-slots", h.listTransportSlots)
	esl.POST("/shipments/:id/allocate", h.allocateShipment)
}

func (h *ESLHandlers) listVerifiedShipments(c *gin.Context) {
	limit := readLimit(c, 100)
	items, err := h.esl.ListVerifiedShipments(c.Request.Context(), currentUserRole(c), limit)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *ESLHandlers) listTransportSlots(c *gin.Context) {
	limit := readLimit(c, 100)
	items, err := h.esl.ListAvailableTransportSlots(c.Request.Context(), currentUserRole(c), limit)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *ESLHandlers) allocateShipment(c *gin.Context) {
	var body struct {
		ShipSlotID            string `json:"ship_slot_id"`
		TruckSlotID           string `json:"truck_slot_id"`
		ExpectedDepartureDate string `json:"expected_departure_date"`
		ExpectedDepartureAt   string `json:"expected_departure_at"`
		Notes                 string `json:"notes"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid json"})
		return
	}

	rawDate := firstNonEmpty(body.ExpectedDepartureDate, body.ExpectedDepartureAt)
	expectedDeparture, err := parseExpectedDeparture(rawDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result, err := h.esl.AllocateShipment(c.Request.Context(), usecase.AllocateShipmentRequest{
		ESLAgentID:          currentUserID(c),
		ActorRole:           currentUserRole(c),
		ShipmentID:          strings.TrimSpace(c.Param("id")),
		ShipSlotID:          body.ShipSlotID,
		TruckSlotID:         body.TruckSlotID,
		ExpectedDepartureAt: expectedDeparture,
		Notes:               body.Notes,
	})
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

func readLimit(c *gin.Context, fallback int) int {
	limit := fallback
	if v := c.Query("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			limit = n
		}
	}
	return limit
}

func parseExpectedDeparture(raw string) (time.Time, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return time.Time{}, fmt.Errorf("expected departure date is required")
	}
	if t, err := time.Parse(time.RFC3339, raw); err == nil {
		return t.UTC(), nil
	}
	if t, err := time.Parse("2006-01-02", raw); err == nil {
		return t.UTC(), nil
	}
	return time.Time{}, fmt.Errorf("expected departure date must be YYYY-MM-DD or RFC3339")
}
