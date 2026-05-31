package usecase

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"log"
	"math/big"
	"strings"
	"sync"
	"time"

	"github.com/abenezer54/ethio-chain-logistics/backend/internal/domain"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type UserRepository interface {
	CreateUser(ctx context.Context, u domain.User) (domain.User, error)
	GetUserByEmail(ctx context.Context, email string) (domain.User, error)
	GetUserByID(ctx context.Context, id string) (domain.User, error)
	SetUserActive(ctx context.Context, userID, approvedBy string, approvedAt time.Time) error
	SetUserDenied(ctx context.Context, userID, deniedBy string, deniedAt time.Time) error
	SetUserInfoRequired(ctx context.Context, userID string) error
	ListPendingUsers(ctx context.Context, limit int) ([]domain.User, error)
	ListUnverifiedUsers(ctx context.Context, limit int) ([]domain.User, error)
	CreateEmailVerificationToken(ctx context.Context, userID, tokenHash string, expiresAt time.Time) error
	VerifyEmailByTokenHash(ctx context.Context, userID, tokenHash string, now time.Time) (domain.User, error)
	UpdateUnverifiedEmail(ctx context.Context, userID, email string) (domain.User, error)
	CreatePasswordResetToken(ctx context.Context, userID, tokenHash string, expiresAt time.Time) error
	VerifyPasswordResetByTokenHash(ctx context.Context, userID, tokenHash string, now time.Time) (domain.User, error)
	UpdatePassword(ctx context.Context, userID, passwordHash string) error
}

type KYCDocumentRepository interface {
	AddDocument(ctx context.Context, doc domain.KYCDocument) (domain.KYCDocument, error)
	ListDocumentsByUserID(ctx context.Context, userID string) ([]domain.KYCDocument, error)
	GetDocumentByID(ctx context.Context, docID string) (domain.KYCDocument, error)
}

type EmailSender interface {
	Send(ctx context.Context, toEmail, subject, body string) error
}

type TemplateEmailSender interface {
	SendTemplate(ctx context.Context, toEmail string, templateID int, params map[string]any) error
}

type AuthUsecase struct {
	users           UserRepository
	docs            KYCDocumentRepository
	email           EmailSender
	jwtSecret       []byte
	frontendBaseURL string
	otpTemplateID   int
	rateLimits      map[string][]time.Time
	rateMu          sync.Mutex
}

func NewAuthUsecase(users UserRepository, docs KYCDocumentRepository, email EmailSender, jwtSecret string, frontendBaseURL string, otpTemplateID ...int) *AuthUsecase {
	baseURL := "http://localhost:3000"
	if strings.TrimSpace(frontendBaseURL) != "" {
		baseURL = strings.TrimRight(strings.TrimSpace(frontendBaseURL), "/")
	}
	templateID := 0
	if len(otpTemplateID) > 0 {
		templateID = otpTemplateID[0]
	}
	return &AuthUsecase{
		users:           users,
		docs:            docs,
		email:           email,
		jwtSecret:       []byte(jwtSecret),
		frontendBaseURL: baseURL,
		otpTemplateID:   templateID,
		rateLimits:      make(map[string][]time.Time),
	}
}

func (a *AuthUsecase) Signup(ctx context.Context, req SignupRequest) (domain.User, error) {
	if err := req.Validate(); err != nil {
		return domain.User{}, fmt.Errorf("%w: %v", domain.ErrValidation, err)
	}

	pwHashBytes, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return domain.User{}, fmt.Errorf("hash password: %w", err)
	}

	u := domain.User{
		Email:        normalizeEmail(req.Email),
		PasswordHash: string(pwHashBytes),
		Role:         req.Role,
		Status:       domain.StatusPending,

		FullName: req.FullName,
		Phone:    req.Phone,

		BusinessName: req.BusinessName,
		VATNumber:    req.VATNumber,

		CompanyAddress: req.CompanyAddress,
		OriginCountry:  req.OriginCountry,

		TruckID:        req.TruckID,
		CarrierCompany: req.CarrierCompany,

		EmployeeID:   req.EmployeeID,
		BranchOffice: req.BranchOffice,

		Department: req.Department,
		StaffCode:  req.StaffCode,
	}

	created, err := a.users.CreateUser(ctx, u)
	if err != nil {
		return domain.User{}, err
	}
	if err := a.sendVerificationEmail(ctx, created); err != nil {
		log.Printf("create email verification failed: user_id=%s email=%s error=%v", created.ID, created.Email, err)
	}
	return created, nil
}

func (a *AuthUsecase) AddKYCDocument(ctx context.Context, doc domain.KYCDocument) (domain.KYCDocument, error) {
	if doc.UserID == "" || doc.DocType == "" || doc.StorageKey == "" {
		return domain.KYCDocument{}, fmt.Errorf("%w: invalid document", domain.ErrValidation)
	}
	return a.docs.AddDocument(ctx, doc)
}

func (a *AuthUsecase) ListUserDocs(ctx context.Context, userID string) ([]domain.KYCDocument, error) {
	return a.docs.ListDocumentsByUserID(ctx, userID)
}

func (a *AuthUsecase) GetDoc(ctx context.Context, docID string) (domain.KYCDocument, error) {
	return a.docs.GetDocumentByID(ctx, docID)
}

func (a *AuthUsecase) Login(ctx context.Context, email, password string) (string, domain.User, error) {
	email = normalizeEmail(email)
	if email == "" || password == "" {
		return "", domain.User{}, fmt.Errorf("%w: email and password are required", domain.ErrValidation)
	}

	u, err := a.users.GetUserByEmail(ctx, email)
	if err != nil {
		return "", domain.User{}, err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(password)); err != nil {
		return "", domain.User{}, domain.ErrUnauthorized
	}
	if u.EmailVerifiedAt == nil && u.Role != domain.RoleAdmin {
		return "", domain.User{}, domain.ErrEmailUnverified
	}
	if u.Status != domain.StatusActive {
		return "", domain.User{}, domain.ErrForbidden
	}

	now := time.Now().UTC()
	claims := jwt.MapClaims{
		"sub":  u.ID,
		"role": string(u.Role),
		"iat":  now.Unix(),
		"exp":  now.Add(24 * time.Hour).Unix(),
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := tok.SignedString(a.jwtSecret)
	if err != nil {
		return "", domain.User{}, fmt.Errorf("sign jwt: %w", err)
	}
	return signed, u, nil
}

func (a *AuthUsecase) ApproveUser(ctx context.Context, userID, adminUserID string) error {
	u, err := a.users.GetUserByID(ctx, userID)
	if err != nil {
		return err
	}
	if u.EmailVerifiedAt == nil {
		return domain.ErrEmailUnverified
	}
	now := time.Now().UTC()
	if err := a.users.SetUserActive(ctx, userID, adminUserID, now); err != nil {
		return err
	}
	u, err = a.users.GetUserByID(ctx, userID)
	if err != nil {
		return err
	}
	a.sendEmail(ctx, u.Email, "Welcome to Ethio Chain Logistics", "Your account has been approved. You can now log in.")
	return nil
}

func (a *AuthUsecase) DenyUser(ctx context.Context, userID, adminUserID string) error {
	now := time.Now().UTC()
	if err := a.users.SetUserDenied(ctx, userID, adminUserID, now); err != nil {
		return err
	}
	u, err := a.users.GetUserByID(ctx, userID)
	if err != nil {
		return err
	}
	a.sendEmail(ctx, u.Email, "Application Update", "We regret to inform you that your application has been denied. Please contact support for more information.")
	return nil
}

func (a *AuthUsecase) RequestInfo(ctx context.Context, userID string) error {
	if err := a.users.SetUserInfoRequired(ctx, userID); err != nil {
		return err
	}
	u, err := a.users.GetUserByID(ctx, userID)
	if err != nil {
		return err
	}
	a.sendEmail(ctx, u.Email, "Additional Information Required", "We need additional information to process your application. Please log in to update your documents.")
	return nil
}

func (a *AuthUsecase) ListPendingUsers(ctx context.Context, limit int) ([]domain.User, error) {
	return a.users.ListPendingUsers(ctx, limit)
}

func (a *AuthUsecase) ListUnverifiedUsers(ctx context.Context, limit int) ([]domain.User, error) {
	return a.users.ListUnverifiedUsers(ctx, limit)
}

func (a *AuthUsecase) VerifyEmail(ctx context.Context, email, code string) (domain.User, error) {
	email = normalizeEmail(email)
	code = normalizeCode(code)
	if email == "" || code == "" {
		return domain.User{}, fmt.Errorf("%w: email and verification code are required", domain.ErrValidation)
	}
	if len(code) != 6 {
		return domain.User{}, fmt.Errorf("%w: verification code must be 6 digits", domain.ErrValidation)
	}
	if !a.allowRate("verify-email:"+email, 5, 15*time.Minute) {
		return domain.User{}, fmt.Errorf("%w: too many verification attempts; try again later", domain.ErrValidation)
	}
	u, err := a.users.GetUserByEmail(ctx, email)
	if err != nil {
		return domain.User{}, err
	}
	if u.EmailVerifiedAt != nil {
		return u, nil
	}
	return a.users.VerifyEmailByTokenHash(ctx, u.ID, hashToken(code), time.Now().UTC())
}

func (a *AuthUsecase) ResendEmailVerification(ctx context.Context, email string) error {
	email = normalizeEmail(email)
	if email == "" {
		return fmt.Errorf("%w: email is required", domain.ErrValidation)
	}
	if !a.allowRate("resend-verification:"+email, 3, 15*time.Minute) {
		return fmt.Errorf("%w: too many verification emails requested; try again later", domain.ErrValidation)
	}
	u, err := a.users.GetUserByEmail(ctx, email)
	if err != nil {
		if err == domain.ErrNotFound {
			return nil
		}
		return err
	}
	if u.EmailVerifiedAt != nil {
		return nil
	}
	if err := a.sendVerificationEmail(ctx, u); err != nil {
		log.Printf("resend email verification failed: user_id=%s email=%s error=%v", u.ID, u.Email, err)
	}
	return nil
}

func (a *AuthUsecase) ChangeUnverifiedEmail(ctx context.Context, currentEmail, password, newEmail string) error {
	currentEmail = normalizeEmail(currentEmail)
	newEmail = normalizeEmail(newEmail)
	if currentEmail == "" || password == "" || newEmail == "" {
		return fmt.Errorf("%w: current email, password, and new email are required", domain.ErrValidation)
	}
	if currentEmail == newEmail {
		return fmt.Errorf("%w: new email must be different", domain.ErrValidation)
	}
	if !a.allowRate("change-email:"+currentEmail, 5, 15*time.Minute) {
		return fmt.Errorf("%w: too many email change attempts; try again later", domain.ErrValidation)
	}
	u, err := a.users.GetUserByEmail(ctx, currentEmail)
	if err != nil {
		return err
	}
	if u.EmailVerifiedAt != nil {
		return fmt.Errorf("%w: email is already verified", domain.ErrValidation)
	}
	if err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(password)); err != nil {
		return domain.ErrUnauthorized
	}
	u.Email = newEmail
	updated, err := a.users.UpdateUnverifiedEmail(ctx, u.ID, newEmail)
	if err != nil {
		return err
	}
	if err := a.sendVerificationEmail(ctx, updated); err != nil {
		log.Printf("change email verification failed: user_id=%s email=%s error=%v", updated.ID, updated.Email, err)
	}
	return nil
}

func (a *AuthUsecase) RequestPasswordReset(ctx context.Context, email string) error {
	email = normalizeEmail(email)
	if email == "" {
		return fmt.Errorf("%w: email is required", domain.ErrValidation)
	}
	if !a.allowRate("password-reset-request:"+email, 3, 15*time.Minute) {
		return fmt.Errorf("%w: too many password reset codes requested; try again later", domain.ErrValidation)
	}
	u, err := a.users.GetUserByEmail(ctx, email)
	if err != nil {
		if err == domain.ErrNotFound {
			return nil
		}
		return err
	}
	if err := a.sendPasswordResetEmail(ctx, u); err != nil {
		log.Printf("password reset email failed: user_id=%s email=%s error=%v", u.ID, u.Email, err)
	}
	return nil
}

func (a *AuthUsecase) ResetPassword(ctx context.Context, email, code, newPassword string) error {
	email = normalizeEmail(email)
	code = normalizeCode(code)
	if email == "" || code == "" || newPassword == "" {
		return fmt.Errorf("%w: email, code, and new password are required", domain.ErrValidation)
	}
	if len(code) != 6 {
		return fmt.Errorf("%w: reset code must be 6 digits", domain.ErrValidation)
	}
	if len(newPassword) < 8 {
		return fmt.Errorf("%w: password must be at least 8 characters", domain.ErrValidation)
	}
	if !a.allowRate("password-reset-verify:"+email, 5, 15*time.Minute) {
		return fmt.Errorf("%w: too many password reset attempts; try again later", domain.ErrValidation)
	}
	u, err := a.users.GetUserByEmail(ctx, email)
	if err != nil {
		return err
	}
	if _, err := a.users.VerifyPasswordResetByTokenHash(ctx, u.ID, hashToken(code), time.Now().UTC()); err != nil {
		return err
	}
	pwHashBytes, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("hash password: %w", err)
	}
	return a.users.UpdatePassword(ctx, u.ID, string(pwHashBytes))
}

func (a *AuthUsecase) sendEmail(ctx context.Context, toEmail, subject, body string) {
	if a.email == nil {
		return
	}
	if err := a.email.Send(ctx, toEmail, subject, body); err != nil {
		log.Printf("send email failed: to=%s subject=%q error=%v", toEmail, subject, err)
	}
}

func (a *AuthUsecase) sendVerificationEmail(ctx context.Context, u domain.User) error {
	code, err := randomCode()
	if err != nil {
		return err
	}
	expiresAt := time.Now().UTC().Add(15 * time.Minute)
	if err := a.users.CreateEmailVerificationToken(ctx, u.ID, hashToken(code), expiresAt); err != nil {
		return err
	}
	if a.otpTemplateID > 0 {
		if sender, ok := a.email.(TemplateEmailSender); ok {
			err := sender.SendTemplate(ctx, u.Email, a.otpTemplateID, map[string]any{
				"purpose": "email verification",
				"code":    code,
				"email":   u.Email,
				"minutes": 15,
			})
			if err == nil {
				return nil
			}
			log.Printf("brevo otp template send failed: email=%s error=%v", u.Email, err)
		}
	}
	body := fmt.Sprintf("Welcome to Ethio Chain Logistics.\n\nYour email verification code is:\n\n%s\n\nEnter this code in the app to verify your email. It expires in 15 minutes.", code)
	a.sendEmail(ctx, u.Email, "Verify your Ethio Chain Logistics email", body)
	return nil
}

func (a *AuthUsecase) sendPasswordResetEmail(ctx context.Context, u domain.User) error {
	code, err := randomCode()
	if err != nil {
		return err
	}
	expiresAt := time.Now().UTC().Add(15 * time.Minute)
	if err := a.users.CreatePasswordResetToken(ctx, u.ID, hashToken(code), expiresAt); err != nil {
		return err
	}
	if a.otpTemplateID > 0 {
		if sender, ok := a.email.(TemplateEmailSender); ok {
			err := sender.SendTemplate(ctx, u.Email, a.otpTemplateID, map[string]any{
				"purpose": "password reset",
				"code":    code,
				"email":   u.Email,
				"minutes": 15,
			})
			if err == nil {
				return nil
			}
			log.Printf("brevo otp template send failed: email=%s error=%v", u.Email, err)
		}
	}
	body := fmt.Sprintf("Your Ethio Chain Logistics password reset code is:\n\n%s\n\nEnter this code in the app to choose a new password. It expires in 15 minutes.", code)
	a.sendEmail(ctx, u.Email, "Reset your Ethio Chain Logistics password", body)
	return nil
}

func (a *AuthUsecase) allowRate(key string, limit int, window time.Duration) bool {
	now := time.Now().UTC()
	cutoff := now.Add(-window)
	a.rateMu.Lock()
	defer a.rateMu.Unlock()
	kept := a.rateLimits[key][:0]
	for _, ts := range a.rateLimits[key] {
		if ts.After(cutoff) {
			kept = append(kept, ts)
		}
	}
	if len(kept) >= limit {
		a.rateLimits[key] = kept
		return false
	}
	kept = append(kept, now)
	a.rateLimits[key] = kept
	return true
}

func randomCode() (string, error) {
	n, err := rand.Int(rand.Reader, big.NewInt(1000000))
	if err != nil {
		return "", fmt.Errorf("generate verification code: %w", err)
	}
	return fmt.Sprintf("%06d", n.Int64()), nil
}

func hashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

func normalizeCode(code string) string {
	code = strings.TrimSpace(code)
	code = strings.ReplaceAll(code, " ", "")
	code = strings.ReplaceAll(code, "-", "")
	return code
}

type SignupRequest struct {
	Email    string
	Password string
	Role     domain.UserRole

	FullName string
	Phone    string

	BusinessName string
	VATNumber    string

	CompanyAddress string
	OriginCountry  string

	TruckID        string
	CarrierCompany string

	EmployeeID   string
	BranchOffice string

	Department string
	StaffCode  string
}

func (r SignupRequest) Validate() error {
	if normalizeEmail(r.Email) == "" || r.Password == "" {
		return fmt.Errorf("email and password are required")
	}
	switch r.Role {
	case domain.RoleImporter:
		if r.BusinessName == "" || r.VATNumber == "" {
			return fmt.Errorf("business_name and vat_number are required for importer")
		}
	case domain.RoleSeller:
		if r.CompanyAddress == "" || r.OriginCountry == "" {
			return fmt.Errorf("company_address and origin_country are required for seller")
		}
	case domain.RoleTransporter:
		if r.TruckID == "" || r.CarrierCompany == "" {
			return fmt.Errorf("transport asset id and carrier_company are required for transporter")
		}
	case domain.RoleCustoms:
		if r.EmployeeID == "" || r.BranchOffice == "" {
			return fmt.Errorf("employee_id and branch_office are required for customs")
		}
	case domain.RoleESLAgent:
		if r.Department == "" || r.StaffCode == "" {
			return fmt.Errorf("department and staff_code are required for esl agent")
		}
	default:
		return fmt.Errorf("invalid role")
	}
	return nil
}
