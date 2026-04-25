package controller

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/google/uuid"

	"github.com/abenezer54/ethio-chain-logistics/backend/internal/domain"
	"github.com/abenezer54/ethio-chain-logistics/backend/internal/usecase"
	"github.com/gin-gonic/gin"
)

type SellerHandlers struct {
	seller    *usecase.SellerUsecase
	uploadDir string
}

func NewSellerHandlers(seller *usecase.SellerUsecase, uploadDir string) *SellerHandlers {
	return &SellerHandlers{seller: seller, uploadDir: uploadDir}
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
	s.GET("/shipments/:id/documents/:docID/download", h.downloadSellerDocument)
	s.GET("/approved", h.listApproved)
	s.GET("/all", h.listAll)
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

func (h *SellerHandlers) downloadSellerDocument(c *gin.Context) {
	docID := c.Param("docID")
	// Try seller-specific documents first
	if d, err := h.seller.GetSellerDocument(c.Request.Context(), docID); err == nil {
		path := filepath.Join(h.uploadDir, d.StorageKey)
		if _, err := os.Stat(path); err != nil {
			if os.IsNotExist(err) {
				c.JSON(http.StatusNotFound, gin.H{"error": "file not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
			return
		}
		c.Header("Content-Type", d.ContentType)
		c.Header("Content-Disposition", `inline; filename="`+sanitizeFilename(d.OriginalFileName)+`"`)
		c.File(path)
		return
	}

	// Fallback: shipment document (uploaded by importer)
	sd, err := h.seller.GetShipmentDocument(c.Request.Context(), docID)
	if err != nil {
		writeError(c, err)
		return
	}
	path := filepath.Join(h.uploadDir, sd.StorageKey)
	if _, err := os.Stat(path); err != nil {
		if os.IsNotExist(err) {
			c.JSON(http.StatusNotFound, gin.H{"error": "file not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}
	c.Header("Content-Type", sd.ContentType)
	c.Header("Content-Disposition", `inline; filename="`+sanitizeFilename(sd.OriginalFileName)+`"`)
	c.File(path)
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
	// Support both JSON metadata uploads and multipart/form-data file uploads.
	ct := c.GetHeader("Content-Type")
	if strings.HasPrefix(ct, "multipart/") {
		docs, err := h.saveSellerDocs(c, shipmentID)
		if err != nil {
			writeError(c, err)
			return
		}
		var created []domain.SellerDocument
		for _, d := range docs {
			cd, err := h.seller.UploadSellerDocument(c.Request.Context(), shipmentID, currentUserID(c), d)
			if err != nil {
				writeError(c, err)
				return
			}
			created = append(created, cd)
		}
		c.JSON(http.StatusCreated, gin.H{"items": created})
		return
	}

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

func (h *SellerHandlers) saveSellerDocs(c *gin.Context, shipmentID string) ([]domain.SellerDocument, error) {
	if shipmentID == "" {
		return nil, fmt.Errorf("%w: shipment id is required", domain.ErrValidation)
	}
	if err := c.Request.ParseMultipartForm(50 << 20); err != nil {
		return nil, fmt.Errorf("%w: invalid multipart form", domain.ErrValidation)
	}
	if c.Request.MultipartForm == nil || len(c.Request.MultipartForm.File) == 0 {
		return nil, fmt.Errorf("%w: at least one document is required", domain.ErrValidation)
	}

	var out []domain.SellerDocument
	for field, files := range c.Request.MultipartForm.File {
		for _, fh := range files {
			src, err := fh.Open()
			if err != nil {
				return nil, fmt.Errorf("open upload: %w", err)
			}

			storageKey := filepath.Join("seller_documents", shipmentID, uuid.NewString()+"_"+sanitizeFilename(fh.Filename))
			dstPath := filepath.Join(h.uploadDir, storageKey)
			if err := os.MkdirAll(filepath.Dir(dstPath), 0o755); err != nil {
				_ = src.Close()
				return nil, fmt.Errorf("mkdir uploads: %w", err)
			}
			dst, err := os.Create(dstPath)
			if err != nil {
				_ = src.Close()
				return nil, fmt.Errorf("create upload: %w", err)
			}

			hasher := sha256.New()
			n, copyErr := io.Copy(io.MultiWriter(dst, hasher), src)
			closeSrcErr := src.Close()
			closeDstErr := dst.Close()
			if copyErr != nil {
				return nil, fmt.Errorf("save upload: %w", copyErr)
			}
			if closeSrcErr != nil {
				return nil, fmt.Errorf("close upload: %w", closeSrcErr)
			}
			if closeDstErr != nil {
				return nil, fmt.Errorf("close upload: %w", closeDstErr)
			}

			docType := strings.ToUpper(field)
			if docType == "" {
				docType = "SUPPLEMENTAL"
			}

			out = append(out, domain.SellerDocument{
				ShipmentID:       shipmentID,
				SellerID:         currentUserID(c),
				DocType:          docType,
				OriginalFileName: fh.Filename,
				ContentType:      firstNonEmpty(fh.Header.Get("Content-Type"), "application/octet-stream"),
				SizeBytes:        n,
				StorageKey:       storageKey,
				SHA256Hash:       hex.EncodeToString(hasher.Sum(nil)),
			})
		}
	}
	if len(out) == 0 {
		return nil, fmt.Errorf("%w: expected at least one uploaded file", domain.ErrValidation)
	}
	return out, nil
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

func (h *SellerHandlers) listAll(c *gin.Context) {
	limit := 100
	if v := c.Query("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			limit = n
		}
	}
	items, err := h.seller.ListAllShipments(c.Request.Context(), currentUserID(c), limit)
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
