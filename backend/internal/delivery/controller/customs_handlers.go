package controller

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/abenezer54/ethio-chain-logistics/backend/internal/domain"
	"github.com/abenezer54/ethio-chain-logistics/backend/internal/usecase"
	"github.com/gin-gonic/gin"
)

type CustomsHandlers struct {
	customs   *usecase.CustomsUsecase
	uploadDir string
}

func NewCustomsHandlers(customs *usecase.CustomsUsecase, uploadDir string) *CustomsHandlers {
	return &CustomsHandlers{customs: customs, uploadDir: uploadDir}
}

func (h *CustomsHandlers) RegisterRoutes(v1 *gin.RouterGroup, jwtSecret string) {
	customs := v1.Group("/customs")
	customs.Use(RequireAuth(jwtSecret))
	customs.Use(RequireRole(domain.RoleCustoms))

	customs.GET("/shipments/arrived", h.listAwaitingClearance)
	customs.GET("/shipments/:id", h.getShipment)
	customs.POST("/shipments/:id/release", h.grantRelease)
	customs.GET("/shipments/:id/certificate", h.certificate)
}

func (h *CustomsHandlers) listAwaitingClearance(c *gin.Context) {
	limit := 100
	if v := c.Query("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			limit = n
		}
	}
	items, err := h.customs.ListAwaitingClearance(c.Request.Context(), currentUserRole(c), limit)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *CustomsHandlers) getShipment(c *gin.Context) {
	detail, err := h.customs.GetShipmentDetail(c.Request.Context(), currentUserRole(c), strings.TrimSpace(c.Param("id")))
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, h.customsDetail(detail))
}

func (h *CustomsHandlers) grantRelease(c *gin.Context) {
	shipmentID := strings.TrimSpace(c.Param("id"))
	detail, err := h.customs.GetShipmentDetail(c.Request.Context(), currentUserRole(c), shipmentID)
	if err != nil {
		writeError(c, err)
		return
	}
	if reviewed := h.customsDetail(detail); !reviewed.ReleaseReady {
		c.JSON(http.StatusBadRequest, gin.H{"error": "document hashes must match before digital release"})
		return
	}

	released, err := h.customs.GrantDigitalRelease(c.Request.Context(), usecase.GrantDigitalReleaseRequest{
		OfficerID:  currentUserID(c),
		ActorRole:  currentUserRole(c),
		ShipmentID: shipmentID,
	})
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, h.customsDetail(released))
}

func (h *CustomsHandlers) certificate(c *gin.Context) {
	detail, err := h.customs.GetShipmentDetail(c.Request.Context(), currentUserRole(c), strings.TrimSpace(c.Param("id")))
	if err != nil {
		writeError(c, err)
		return
	}
	reviewed := h.customsDetail(detail)
	if reviewed.Shipment.Status != domain.ShipmentStatusCleared {
		c.JSON(http.StatusBadRequest, gin.H{"error": "certificate is available after digital release"})
		return
	}
	pdf := buildClearancePDF(reviewed)
	c.Header("Content-Type", "application/pdf")
	c.Header("Content-Disposition", `attachment; filename="clearance-`+shortForFilename(reviewed.Shipment.ID)+`.pdf"`)
	c.Data(http.StatusOK, "application/pdf", pdf)
}

func (h *CustomsHandlers) customsDetail(detail domain.ShipmentDetail) domain.CustomsShipmentDetail {
	checks := h.documentChecks(detail)
	return domain.CustomsShipmentDetail{
		Shipment:     detail.Shipment,
		Documents:    checks,
		Events:       detail.Events,
		ReleaseReady: releaseReady(checks),
	}
}

func (h *CustomsHandlers) documentChecks(detail domain.ShipmentDetail) []domain.CustomsDocumentCheck {
	out := make([]domain.CustomsDocumentCheck, 0, len(detail.Documents)+len(detail.SellerDocuments))
	for _, doc := range detail.Documents {
		matched, status := h.checkFileHash(doc.StorageKey, doc.SHA256Hash)
		out = append(out, domain.CustomsDocumentCheck{
			ID:                 doc.ID,
			ShipmentID:         doc.ShipmentID,
			Source:             "IMPORTER",
			DocType:            string(doc.DocType),
			OriginalFileName:   doc.OriginalFileName,
			ContentType:        doc.ContentType,
			SizeBytes:          doc.SizeBytes,
			SHA256Hash:         doc.SHA256Hash,
			VerificationStatus: doc.VerificationStatus,
			HashMatches:        matched,
			HashStatus:         status,
			UploadedAt:         doc.UploadedAt,
		})
	}
	for _, doc := range detail.SellerDocuments {
		matched, status := h.checkFileHash(doc.StorageKey, doc.SHA256Hash)
		out = append(out, domain.CustomsDocumentCheck{
			ID:               doc.ID,
			ShipmentID:       doc.ShipmentID,
			Source:           "SELLER",
			DocType:          doc.DocType,
			OriginalFileName: doc.OriginalFileName,
			ContentType:      doc.ContentType,
			SizeBytes:        doc.SizeBytes,
			SHA256Hash:       doc.SHA256Hash,
			HashMatches:      matched,
			HashStatus:       status,
			UploadedAt:       doc.UploadedAt,
		})
	}
	return out
}

func (h *CustomsHandlers) checkFileHash(storageKey, expectedHash string) (bool, string) {
	expectedHash = strings.TrimSpace(strings.ToLower(expectedHash))
	if expectedHash == "" {
		return false, "NO_RECORDED_HASH"
	}
	clean := filepath.Clean(storageKey)
	if clean == "." || clean == ".." || filepath.IsAbs(clean) || strings.HasPrefix(clean, ".."+string(os.PathSeparator)) {
		return false, "INVALID_PATH"
	}
	path := filepath.Join(h.uploadDir, clean)
	f, err := os.Open(path)
	if err != nil {
		if os.IsNotExist(err) {
			return false, "MISSING_FILE"
		}
		return false, "READ_ERROR"
	}
	defer f.Close()

	hasher := sha256.New()
	if _, err := io.Copy(hasher, f); err != nil {
		return false, "READ_ERROR"
	}
	actual := hex.EncodeToString(hasher.Sum(nil))
	if actual == expectedHash {
		return true, "MATCHED"
	}
	return false, "MISMATCHED"
}

func releaseReady(checks []domain.CustomsDocumentCheck) bool {
	if len(checks) == 0 {
		return false
	}
	hasBillOfLading := false
	hasCommercialInvoice := false
	for _, check := range checks {
		if !check.HashMatches {
			return false
		}
		if check.Source == "IMPORTER" && check.DocType == string(domain.DocumentBillOfLading) {
			hasBillOfLading = true
		}
		if check.Source == "IMPORTER" && check.DocType == string(domain.DocumentCommercialInvoice) {
			hasCommercialInvoice = true
		}
	}
	return hasBillOfLading && hasCommercialInvoice
}

func buildClearancePDF(detail domain.CustomsShipmentDetail) []byte {
	releaseHash := ""
	for i := len(detail.Events) - 1; i >= 0; i-- {
		if detail.Events[i].Action == "CUSTOMS_DIGITAL_RELEASE_GRANTED" {
			releaseHash = detail.Events[i].EventHash
			break
		}
	}
	lines := []string{
		"Clearance Certificate",
		"Issued by Ethio-Chain Customs Portal",
		"Issued at: " + time.Now().UTC().Format(time.RFC3339),
		"Shipment ID: " + detail.Shipment.ID,
		"Route: " + detail.Shipment.OriginPort + " to " + detail.Shipment.DestinationPort,
		"Cargo: " + detail.Shipment.CargoType,
		"Weight: " + detail.Shipment.WeightKG + " kg",
		"Status: " + string(detail.Shipment.Status),
		"Documents checked: " + strconv.Itoa(len(detail.Documents)),
		"Release event hash: " + firstNonEmpty(releaseHash, "not recorded"),
		"Digital release is final and irreversible.",
	}
	return simplePDF(lines)
}

func simplePDF(lines []string) []byte {
	var content strings.Builder
	content.WriteString("BT\n/F1 18 Tf\n72 740 Td\n")
	for i, line := range lines {
		if i == 1 {
			content.WriteString("/F2 11 Tf\n")
		}
		if i > 0 {
			content.WriteString("0 -22 Td\n")
		}
		content.WriteString("(")
		content.WriteString(pdfEscape(line))
		content.WriteString(") Tj\n")
	}
	content.WriteString("ET\n")
	contentString := content.String()

	objects := []string{
		"<< /Type /Catalog /Pages 2 0 R >>",
		"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
		"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
		"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
		"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
		fmt.Sprintf("<< /Length %d >>\nstream\n%s\nendstream", len([]byte(contentString)), contentString),
	}

	var out bytes.Buffer
	out.WriteString("%PDF-1.4\n")
	offsets := make([]int, 0, len(objects))
	for i, object := range objects {
		offsets = append(offsets, out.Len())
		fmt.Fprintf(&out, "%d 0 obj\n%s\nendobj\n", i+1, object)
	}
	xrefOffset := out.Len()
	fmt.Fprintf(&out, "xref\n0 %d\n", len(objects)+1)
	out.WriteString("0000000000 65535 f \n")
	for _, offset := range offsets {
		fmt.Fprintf(&out, "%010d 00000 n \n", offset)
	}
	fmt.Fprintf(&out, "trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n", len(objects)+1, xrefOffset)
	return out.Bytes()
}

func pdfEscape(value string) string {
	var out strings.Builder
	for _, r := range value {
		switch r {
		case '\\', '(', ')':
			out.WriteByte('\\')
			out.WriteRune(r)
		default:
			if r < 32 || r > 126 {
				out.WriteByte('?')
			} else {
				out.WriteRune(r)
			}
		}
	}
	return out.String()
}

func shortForFilename(value string) string {
	if len(value) <= 8 {
		return sanitizeFilename(value)
	}
	return sanitizeFilename(value[:8])
}
