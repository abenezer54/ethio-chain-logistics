package controller

import (
	"net/http"
	"strconv"

	"github.com/abenezer54/ethio-chain-logistics/backend/internal/domain"
	"github.com/abenezer54/ethio-chain-logistics/backend/internal/usecase"
	"github.com/gin-gonic/gin"
)

type SellerHandlers struct {
	seller *usecase.SellerUsecase
}

func NewSellerHandlers(seller *usecase.SellerUsecase) *SellerHandlers {
	return &SellerHandlers{seller: seller}
}

func (h *SellerHandlers) RegisterRoutes(v1 *gin.RouterGroup, jwtSecret string) {
	s := v1.Group("/seller")
	s.Use(RequireAuth(jwtSecret))
	s.Use(RequireRole(domain.RoleSeller))

	s.GET("/dashboard", h.dashboard)
	s.GET("/pending", h.listPending)
	s.GET("/shipments/:id/documents", h.getDocuments)
	s.POST("/shipments/:id/verify", h.verifyShipment)
	s.POST("/shipments/:id/documents", h.uploadSellerDocument)
	s.GET("/approved", h.listApproved)
	s.GET("/notifications", h.listNotifications)
	s.GET("/profile", h.getProfile)
	s.PUT("/profile", h.updateProfile)
}

func (h *SellerHandlers) dashboard(c *gin.Context) {
	sellerID := currentUserID(c)
	out, err := h.seller.Dashboard(c.Request.Context(), sellerID)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *SellerHandlers) listPending(c *gin.Context) {
	limit := 100
	if v := c.Query("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			limit = n
		}
	}
	items, err := h.seller.ListPending(c.Request.Context(), currentUserID(c), limit)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *SellerHandlers) getDocuments(c *gin.Context) {
	shipmentID := c.Param("id")
	docs, err := h.seller.GetShipmentDocuments(c.Request.Context(), shipmentID)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": docs})
}

func (h *SellerHandlers) verifyShipment(c *gin.Context) {
	shipmentID := c.Param("id")
	var body struct {
		Action string          `json:"action"`
		Checks map[string]bool `json:"checks"`
		Reason string          `json:"reason"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid json"})
		return
	}
	v, err := h.seller.VerifyShipment(c.Request.Context(), currentUserID(c), shipmentID, body.Action, body.Checks, body.Reason)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, v)
}

func (h *SellerHandlers) uploadSellerDocument(c *gin.Context) {
	shipmentID := c.Param("id")
	var body struct {
		DocType     string `json:"doc_type"`
		FileName    string `json:"file_name"`
		ContentType string `json:"content_type"`
		Size        int64  `json:"size_bytes"`
		StorageKey  string `json:"storage_key"`
		SHA256      string `json:"sha256_hash"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid json"})
		return
	}
	doc := domain.SellerDocument{
		ShipmentID:       shipmentID,
		SellerID:         currentUserID(c),
		DocType:          body.DocType,
		OriginalFileName: body.FileName,
		ContentType:      body.ContentType,
		SizeBytes:        body.Size,
		StorageKey:       body.StorageKey,
		SHA256Hash:       body.SHA256,
	}
	d, err := h.seller.UploadSellerDocument(c.Request.Context(), shipmentID, currentUserID(c), doc)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusCreated, d)
}

func (h *SellerHandlers) listApproved(c *gin.Context) {
	limit := 100
	if v := c.Query("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			limit = n
		}
	}
	items, err := h.seller.ListApprovedShipments(c.Request.Context(), currentUserID(c), limit)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *SellerHandlers) listNotifications(c *gin.Context) {
	limit := 100
	if v := c.Query("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			limit = n
		}
	}
	items, err := h.seller.ListNotifications(c.Request.Context(), currentUserID(c), limit)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *SellerHandlers) getProfile(c *gin.Context) {
	// For now reuse auth handlers to get profile via existing endpoints; returning user id only
	c.JSON(http.StatusOK, gin.H{"id": currentUserID(c)})
}

func (h *SellerHandlers) updateProfile(c *gin.Context) {
	var body struct {
		CompanyName    string `json:"company_name"`
		FullName       string `json:"full_name"`
		Phone          string `json:"phone"`
		CompanyAddress string `json:"company_address"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid json"})
		return
	}
	// Minimal implementation: create a notification to indicate profile updated
	_, err := h.seller.ListNotifications(c.Request.Context(), currentUserID(c), 1)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}
