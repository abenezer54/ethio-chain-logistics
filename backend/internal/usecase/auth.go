package usecase

import (
	"context"
	"fmt"
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
}

type KYCDocumentRepository interface {
	AddDocument(ctx context.Context, doc domain.KYCDocument) (domain.KYCDocument, error)
	ListDocumentsByUserID(ctx context.Context, userID string) ([]domain.KYCDocument, error)
	GetDocumentByID(ctx context.Context, docID string) (domain.KYCDocument, error)
}

type EmailSender interface {
	Send(ctx context.Context, toEmail, subject, body string) error
}

type AuthUsecase struct {
	users     UserRepository
	docs      KYCDocumentRepository
	email     EmailSender
	jwtSecret []byte
}

func NewAuthUsecase(users UserRepository, docs KYCDocumentRepository, email EmailSender, jwtSecret string) *AuthUsecase {
	return &AuthUsecase{
		users:     users,
		docs:      docs,
		email:     email,
		jwtSecret: []byte(jwtSecret),
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
		Email:        req.Email,
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
	if email == "" || password == "" {
		return "", domain.User{}, fmt.Errorf("%w: email and password are required", domain.ErrValidation)
	}

	u, err := a.users.GetUserByEmail(ctx, email)
	if err != nil {
		return "", domain.User{}, err
	}

	if u.Status != domain.StatusActive {
		return "", domain.User{}, domain.ErrForbidden
	}

	if err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(password)); err != nil {
		return "", domain.User{}, domain.ErrUnauthorized
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
	now := time.Now().UTC()
	if err := a.users.SetUserActive(ctx, userID, adminUserID, now); err != nil {
		return err
	}
	u, err := a.users.GetUserByID(ctx, userID)
	if err != nil {
		return err
	}
	_ = a.email.Send(ctx, u.Email, "Welcome to Ethio Chain Logistics", "Your account has been approved. You can now log in.")
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
	_ = a.email.Send(ctx, u.Email, "Application Update", "We regret to inform you that your application has been denied. Please contact support for more information.")
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
	_ = a.email.Send(ctx, u.Email, "Additional Information Required", "We need additional information to process your application. Please log in to update your documents.")
	return nil
}

func (a *AuthUsecase) ListPendingUsers(ctx context.Context, limit int) ([]domain.User, error) {
	return a.users.ListPendingUsers(ctx, limit)
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
	if r.Email == "" || r.Password == "" {
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
