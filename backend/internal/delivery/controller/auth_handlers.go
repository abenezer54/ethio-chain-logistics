package controller

import (
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/abenezer54/ethio-chain-logistics/backend/internal/domain"
	"github.com/abenezer54/ethio-chain-logistics/backend/internal/usecase"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
)

type AuthHandlers struct {
	auth      *usecase.AuthUsecase
	uploadDir string
}

func NewAuthHandlers(auth *usecase.AuthUsecase, uploadDir string) *AuthHandlers {
	return &AuthHandlers{auth: auth, uploadDir: uploadDir}
}

func (h *AuthHandlers) RegisterRoutes(v1 *gin.RouterGroup) {
	g := v1.Group("/auth")
	g.POST("/signup", h.signup)
	g.POST("/login", h.login)
}

func (h *AuthHandlers) signup(c *gin.Context) {
	// multipart/form-data expected: role, email, password, plus role-specific fields and required uploads.
	role := domain.UserRole(strings.ToUpper(strings.TrimSpace(c.PostForm("role"))))

	req := usecase.SignupRequest{
		Email:    strings.TrimSpace(c.PostForm("email")),
		Password: c.PostForm("password"),
		Role:     role,

		FullName: strings.TrimSpace(c.PostForm("full_name")),
		Phone:    strings.TrimSpace(c.PostForm("phone")),

		BusinessName: strings.TrimSpace(c.PostForm("business_name")),
		VATNumber:    strings.TrimSpace(c.PostForm("vat_number")),

		CompanyAddress: strings.TrimSpace(c.PostForm("company_address")),
		OriginCountry:  strings.TrimSpace(c.PostForm("origin_country")),

		TruckID:        strings.TrimSpace(c.PostForm("truck_id")),
		CarrierCompany: strings.TrimSpace(c.PostForm("carrier_company")),

		EmployeeID:   strings.TrimSpace(c.PostForm("employee_id")),
		BranchOffice: strings.TrimSpace(c.PostForm("branch_office")),

		Department: strings.TrimSpace(c.PostForm("department")),
		StaffCode:  strings.TrimSpace(c.PostForm("staff_code")),
	}

	requiredDocs := requiredDocTypes(role)
	docs, err := h.saveDocs(c, requiredDocs)
	if err != nil {
		writeError(c, err)
		return
	}

	u, err := h.auth.Signup(c.Request.Context(), req)
	if err != nil {
		writeError(c, err)
		return
	}

	// Attach docs to the created user.
	for _, d := range docs {
		d.UserID = u.ID
		if _, err := h.auth.AddKYCDocument(c.Request.Context(), d); err != nil {
			writeError(c, err)
			return
		}
	}

	c.JSON(http.StatusCreated, gin.H{
		"id":     u.ID,
		"email":  u.Email,
		"role":   u.Role,
		"status": u.Status,
	})
}

func (h *AuthHandlers) login(c *gin.Context) {
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid json"})
		return
	}
	token, u, err := h.auth.Login(c.Request.Context(), strings.TrimSpace(body.Email), body.Password)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"token": token,
		"user": gin.H{
			"id":     u.ID,
			"email":  u.Email,
			"role":   u.Role,
			"status": u.Status,
		},
	})
}

func (h *AuthHandlers) saveDocs(c *gin.Context, requiredDocTypes []string) ([]domain.KYCDocument, error) {
	if err := c.Request.ParseMultipartForm(25 << 20); err != nil { // 25MB
		return nil, fmt.Errorf("%w: invalid multipart form", domain.ErrValidation)
	}

	out := make([]domain.KYCDocument, 0, len(requiredDocTypes))
	for _, docType := range requiredDocTypes {
		fh, err := c.FormFile(docType)
		if err != nil {
			return nil, fmt.Errorf("%w: missing required upload %s", domain.ErrValidation, docType)
		}
		src, err := fh.Open()
		if err != nil {
			return nil, fmt.Errorf("open upload: %w", err)
		}
		defer src.Close()

		storageKey := filepath.Join("kyc", uuid.NewString()+"_"+sanitizeFilename(fh.Filename))
		dstPath := filepath.Join(h.uploadDir, storageKey)
		if err := os.MkdirAll(filepath.Dir(dstPath), 0o755); err != nil {
			return nil, fmt.Errorf("mkdir uploads: %w", err)
		}

		dst, err := os.Create(dstPath)
		if err != nil {
			return nil, fmt.Errorf("create upload: %w", err)
		}
		n, copyErr := io.Copy(dst, src)
		closeErr := dst.Close()
		if copyErr != nil {
			return nil, fmt.Errorf("save upload: %w", copyErr)
		}
		if closeErr != nil {
			return nil, fmt.Errorf("close upload: %w", closeErr)
		}

		out = append(out, domain.KYCDocument{
			DocType:          docType,
			OriginalFileName: fh.Filename,
			ContentType:      firstNonEmpty(fh.Header.Get("Content-Type"), "application/octet-stream"),
			SizeBytes:        n,
			StorageKey:       storageKey,
		})
	}
	return out, nil
}

func requiredDocTypes(role domain.UserRole) []string {
	switch role {
	case domain.RoleImporter:
		return []string{"trade_license", "tin_certificate"}
	case domain.RoleSeller:
		return []string{"business_registration", "export_permit"}
	case domain.RoleTransporter:
		return []string{"drivers_license", "vehicle_plate_registry"}
	case domain.RoleCustoms:
		return []string{"gov_id_badge"}
	case domain.RoleESLAgent:
		return []string{"employment_verification"}
	default:
		return nil
	}
}

func sanitizeFilename(name string) string {
	name = filepath.Base(name)
	name = strings.ReplaceAll(name, "..", "")
	name = strings.ReplaceAll(name, string(os.PathSeparator), "_")
	name = strings.ReplaceAll(name, "\\", "_")
	if name == "" {
		return "upload"
	}
	return name
}

func firstNonEmpty(v, fallback string) string {
	if v == "" {
		return fallback
	}
	return v
}

// writeError maps domain/usecase errors to HTTP responses.
func writeError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, domain.ErrValidation):
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
	case errors.Is(err, domain.ErrConflict):
		c.JSON(http.StatusConflict, gin.H{"error": "email already registered"})
	case errors.Is(err, domain.ErrUnauthorized):
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
	case errors.Is(err, domain.ErrForbidden):
		c.JSON(http.StatusForbidden, gin.H{"error": "account pending approval"})
	case errors.Is(err, domain.ErrNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
	default:
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23514" {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Unable to process this update. Please try again.",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
	}
}
