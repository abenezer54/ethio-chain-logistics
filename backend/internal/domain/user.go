package domain

import "time"

type UserRole string

const (
	RoleImporter    UserRole = "IMPORTER"
	RoleSeller      UserRole = "SELLER"
	RoleTransporter UserRole = "TRANSPORTER"
	RoleCustoms     UserRole = "CUSTOMS"
	RoleESLAgent    UserRole = "ESL_AGENT"
	RoleAdmin       UserRole = "ADMIN"
)

type UserStatus string

const (
	StatusPending      UserStatus = "PENDING"
	StatusActive       UserStatus = "ACTIVE"
	StatusDenied       UserStatus = "DENIED"
	StatusInfoRequired UserStatus = "INFO_REQUIRED"
)

type User struct {
	ID           string     `json:"id"`
	Email        string     `json:"email"`
	PasswordHash string     `json:"-"`

	Role   UserRole   `json:"role"`
	Status UserStatus `json:"status"`

	FullName string `json:"full_name,omitempty"`
	Phone    string `json:"phone,omitempty"`

	BusinessName string `json:"business_name,omitempty"`
	VATNumber    string `json:"vat_number,omitempty"`

	CompanyAddress string `json:"company_address,omitempty"`
	OriginCountry  string `json:"origin_country,omitempty"`

	TruckID        string `json:"truck_id,omitempty"`
	CarrierCompany string `json:"carrier_company,omitempty"`

	EmployeeID   string `json:"employee_id,omitempty"`
	BranchOffice string `json:"branch_office,omitempty"`

	Department string `json:"department,omitempty"`
	StaffCode  string `json:"staff_code,omitempty"`

	ApprovedBy string     `json:"approved_by,omitempty"`
	ApprovedAt *time.Time `json:"approved_at,omitempty"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type KYCDocument struct {
	ID               string    `json:"id"`
	UserID           string    `json:"user_id"`
	DocType          string    `json:"doc_type"`
	OriginalFileName string    `json:"original_file_name"`
	ContentType      string    `json:"content_type"`
	SizeBytes        int64     `json:"size_bytes"`
	StorageKey       string    `json:"storage_key"`
	UploadedAt       time.Time `json:"uploaded_at"`
}

