package controller

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/abenezer54/ethio-chain-logistics/backend/internal/domain"
	"github.com/abenezer54/ethio-chain-logistics/backend/internal/usecase"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type ImporterHandlers struct {
	shipments *usecase.ShipmentUsecase
	uploadDir string
}

func NewImporterHandlers(shipments *usecase.ShipmentUsecase, uploadDir string) *ImporterHandlers {
	return &ImporterHandlers{shipments: shipments, uploadDir: uploadDir}
}

func (h *ImporterHandlers) RegisterRoutes(v1 *gin.RouterGroup, jwtSecret string) {
	importer := v1.Group("/importer")
	importer.Use(RequireAuth(jwtSecret))
	importer.Use(RequireRole(domain.RoleImporter))

	importer.GET("/shipments", h.listShipments)
	importer.POST("/shipments", h.createShipment)
	importer.GET("/shipments/:id", h.getShipment)
	importer.POST("/shipments/:id/documents", h.uploadDocuments)
	importer.GET("/shipments/:id/documents/:docID/download", h.downloadDocument)
	importer.GET("/shipments/:id/seller-documents/:docID/download", h.downloadSellerDocument)
}

func (h *ImporterHandlers) listShipments(c *gin.Context) {
	limit := 100
	if v := c.Query("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			limit = n
		}
	}
	items, err := h.shipments.ListImporterShipments(c.Request.Context(), currentUserID(c), currentUserRole(c), limit)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *ImporterHandlers) createShipment(c *gin.Context) {
	var body struct {
		SellerID        string        `json:"seller_id"`
		OriginPort      string        `json:"origin_port"`
		DestinationPort string        `json:"destination_port"`
		CargoType       string        `json:"cargo_type"`
		WeightKG        decimalString `json:"weight_kg"`
		VolumeCBM       decimalString `json:"volume_cbm"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid json"})
		return
	}

	shipment, err := h.shipments.CreateShipment(c.Request.Context(), usecase.CreateShipmentRequest{
		ImporterID:      currentUserID(c),
		ActorRole:       currentUserRole(c),
		SellerID:        body.SellerID,
		OriginPort:      body.OriginPort,
		DestinationPort: body.DestinationPort,
		CargoType:       body.CargoType,
		WeightKG:        string(body.WeightKG),
		VolumeCBM:       string(body.VolumeCBM),
	})
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusCreated, shipment)
}

type decimalString string

func (d *decimalString) UnmarshalJSON(b []byte) error {
	if string(b) == "null" {
		*d = ""
		return nil
	}
	var s string
	if err := json.Unmarshal(b, &s); err == nil {
		*d = decimalString(s)
		return nil
	}
	dec := json.NewDecoder(bytes.NewReader(b))
	dec.UseNumber()
	var n json.Number
	if err := dec.Decode(&n); err == nil {
		*d = decimalString(n.String())
		return nil
	}
	return fmt.Errorf("expected string or number")
}

func (h *ImporterHandlers) getShipment(c *gin.Context) {
	detail, err := h.shipments.GetImporterShipment(c.Request.Context(), currentUserID(c), currentUserRole(c), c.Param("id"))
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, detail)
}

func (h *ImporterHandlers) uploadDocuments(c *gin.Context) {
	shipmentID := strings.TrimSpace(c.Param("id"))
	docs, err := h.saveShipmentDocs(c, shipmentID)
	if err != nil {
		writeError(c, err)
		return
	}

	detail, err := h.shipments.UploadShipmentDocuments(c.Request.Context(), usecase.UploadShipmentDocumentsRequest{
		ImporterID: currentUserID(c),
		ActorRole:  currentUserRole(c),
		ShipmentID: shipmentID,
		Documents:  docs,
	})
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusCreated, detail)
}

func (h *ImporterHandlers) downloadDocument(c *gin.Context) {
	doc, err := h.shipments.GetImporterShipmentDocument(c.Request.Context(), currentUserID(c), currentUserRole(c), c.Param("id"), c.Param("docID"))
	if err != nil {
		writeError(c, err)
		return
	}
	path := filepath.Join(h.uploadDir, doc.StorageKey)
	if _, err := os.Stat(path); err != nil {
		if os.IsNotExist(err) {
			c.JSON(http.StatusNotFound, gin.H{"error": "file not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}
	c.Header("Content-Type", doc.ContentType)
	c.Header("Content-Disposition", `inline; filename="`+sanitizeFilename(doc.OriginalFileName)+`"`)
	c.File(path)
}

func (h *ImporterHandlers) downloadSellerDocument(c *gin.Context) {
	doc, err := h.shipments.GetImporterSellerDocument(c.Request.Context(), currentUserID(c), currentUserRole(c), c.Param("id"), c.Param("docID"))
	if err != nil {
		writeError(c, err)
		return
	}
	path := filepath.Join(h.uploadDir, doc.StorageKey)
	if _, err := os.Stat(path); err != nil {
		if os.IsNotExist(err) {
			c.JSON(http.StatusNotFound, gin.H{"error": "file not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}
	c.Header("Content-Type", doc.ContentType)
	c.Header("Content-Disposition", `inline; filename="`+sanitizeFilename(doc.OriginalFileName)+`"`)
	c.File(path)
}

func (h *ImporterHandlers) saveShipmentDocs(c *gin.Context, shipmentID string) ([]usecase.UploadShipmentDocumentInput, error) {
	if shipmentID == "" {
		return nil, fmt.Errorf("%w: shipment id is required", domain.ErrValidation)
	}
	if err := c.Request.ParseMultipartForm(50 << 20); err != nil {
		return nil, fmt.Errorf("%w: invalid multipart form", domain.ErrValidation)
	}
	if c.Request.MultipartForm == nil || len(c.Request.MultipartForm.File) == 0 {
		return nil, fmt.Errorf("%w: at least one document is required", domain.ErrValidation)
	}

	fieldTypes := map[string]domain.ShipmentDocumentType{
		"bill_of_lading":     domain.DocumentBillOfLading,
		"commercial_invoice": domain.DocumentCommercialInvoice,
		"letter_of_credit":   domain.DocumentLetterOfCredit,
		"supplemental":       domain.DocumentSupplemental,
	}

	var out []usecase.UploadShipmentDocumentInput
	for field, docType := range fieldTypes {
		files := c.Request.MultipartForm.File[field]
		for _, fh := range files {
			src, err := fh.Open()
			if err != nil {
				return nil, fmt.Errorf("open upload: %w", err)
			}

			storageKey := filepath.Join("shipments", shipmentID, uuid.NewString()+"_"+sanitizeFilename(fh.Filename))
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

			out = append(out, usecase.UploadShipmentDocumentInput{
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
		return nil, fmt.Errorf("%w: expected one of bill_of_lading, commercial_invoice, letter_of_credit, supplemental", domain.ErrValidation)
	}
	return out, nil
}
