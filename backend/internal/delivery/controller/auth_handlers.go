package controller

import (
	"errors"
	"fmt"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strings"

	"github.com/abenezer54/ethio-chain-logistics/backend/internal/domain"
	"github.com/abenezer54/ethio-chain-logistics/backend/internal/storage"
	"github.com/abenezer54/ethio-chain-logistics/backend/internal/usecase"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
)

type AuthHandlers struct {
	auth  *usecase.AuthUsecase
	store storage.FileStore
}

func NewAuthHandlers(auth *usecase.AuthUsecase, store storage.FileStore) *AuthHandlers {
	return &AuthHandlers{auth: auth, store: store}
}

func (h *AuthHandlers) RegisterRoutes(v1 *gin.RouterGroup) {
	g := v1.Group("/auth")
	g.POST("/signup", h.signup)
	g.POST("/login", h.login)
	g.POST("/verify-email", h.verifyEmail)
	g.POST("/resend-verification", h.resendVerification)
	g.POST("/change-unverified-email", h.changeUnverifiedEmail)
	g.POST("/password-reset/request", h.requestPasswordReset)
	g.POST("/password-reset/confirm", h.confirmPasswordReset)
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

func (h *AuthHandlers) verifyEmail(c *gin.Context) {
	var body struct {
		Email string `json:"email"`
		Code  string `json:"code"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid json"})
		return
	}
	u, err := h.auth.VerifyEmail(c.Request.Context(), body.Email, body.Code)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"id":                u.ID,
		"email":             u.Email,
		"role":              u.Role,
		"status":            u.Status,
		"email_verified_at": u.EmailVerifiedAt,
	})
}

func (h *AuthHandlers) resendVerification(c *gin.Context) {
	var body struct {
		Email string `json:"email"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid json"})
		return
	}
	if err := h.auth.ResendEmailVerification(c.Request.Context(), body.Email); err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

func (h *AuthHandlers) changeUnverifiedEmail(c *gin.Context) {
	var body struct {
		CurrentEmail string `json:"current_email"`
		Password     string `json:"password"`
		NewEmail     string `json:"new_email"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid json"})
		return
	}
	if err := h.auth.ChangeUnverifiedEmail(c.Request.Context(), body.CurrentEmail, body.Password, body.NewEmail); err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

func (h *AuthHandlers) requestPasswordReset(c *gin.Context) {
	var body struct {
		Email string `json:"email"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid json"})
		return
	}
	if err := h.auth.RequestPasswordReset(c.Request.Context(), body.Email); err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

func (h *AuthHandlers) confirmPasswordReset(c *gin.Context) {
	var body struct {
		Email       string `json:"email"`
		Code        string `json:"code"`
		NewPassword string `json:"new_password"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid json"})
		return
	}
	if err := h.auth.ResetPassword(c.Request.Context(), body.Email, body.Code, body.NewPassword); err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
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

		storageKey := path.Join("kyc", uuid.NewString()+"_"+sanitizeFilename(fh.Filename))
		n, err := h.store.Save(c.Request.Context(), storageKey, firstNonEmpty(fh.Header.Get("Content-Type"), "application/octet-stream"), src)
		if err != nil {
			return nil, err
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
	case errors.Is(err, domain.ErrEmailUnverified):
		c.JSON(http.StatusForbidden, gin.H{"error": "Please verify your email address before continuing."})
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
