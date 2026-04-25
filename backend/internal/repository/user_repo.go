package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/abenezer54/ethio-chain-logistics/backend/internal/domain"
	"github.com/jackc/pgx/v5"
)

type UserRepo struct {
	pool *Pool
}

func NewUserRepo(pool *Pool) *UserRepo {
	return &UserRepo{pool: pool}
}

func (r *UserRepo) CreateUser(ctx context.Context, u domain.User) (domain.User, error) {
	const q = `
INSERT INTO users (
  email, password_hash, role, status,
  full_name, phone,
  business_name, vat_number,
  company_address, origin_country,
  truck_id, carrier_company,
  employee_id, branch_office,
  department, staff_code
)
VALUES (
  $1,$2,$3,$4,
  $5,$6,
  $7,$8,
  $9,$10,
  $11,$12,
  $13,$14,
  $15,$16
)
RETURNING
  id, created_at, updated_at
`

	row := r.pool.inner.QueryRow(ctx, q,
		u.Email, u.PasswordHash, string(u.Role), string(u.Status),
		nullIfEmpty(u.FullName), nullIfEmpty(u.Phone),
		nullIfEmpty(u.BusinessName), nullIfEmpty(u.VATNumber),
		nullIfEmpty(u.CompanyAddress), nullIfEmpty(u.OriginCountry),
		nullIfEmpty(u.TruckID), nullIfEmpty(u.CarrierCompany),
		nullIfEmpty(u.EmployeeID), nullIfEmpty(u.BranchOffice),
		nullIfEmpty(u.Department), nullIfEmpty(u.StaffCode),
	)

	var id string
	var createdAt, updatedAt time.Time
	if err := row.Scan(&id, &createdAt, &updatedAt); err != nil {
		if isUniqueViolation(err) {
			return domain.User{}, domain.ErrConflict
		}
		return domain.User{}, fmt.Errorf("create user: %w", err)
	}
	u.ID = id
	u.CreatedAt = createdAt
	u.UpdatedAt = updatedAt
	return u, nil
}

func (r *UserRepo) GetUserByEmail(ctx context.Context, email string) (domain.User, error) {
	const q = `
SELECT
  id, email, password_hash, role, status,
  full_name, phone,
  business_name, vat_number,
  company_address, origin_country,
  truck_id, carrier_company,
  employee_id, branch_office,
  department, staff_code,
  approved_by, approved_at,
  created_at, updated_at
FROM users
WHERE email = $1
`
	var u domain.User
	var role, status string
	var approvedAt *time.Time
	var approvedBy, fullName, phone, businessName, vatNumber *string
	var companyAddress, originCountry, truckID, carrierCompany *string
	var employeeID, branchOffice, department, staffCode *string
	err := r.pool.inner.QueryRow(ctx, q, email).Scan(
		&u.ID, &u.Email, &u.PasswordHash, &role, &status,
		&fullName, &phone,
		&businessName, &vatNumber,
		&companyAddress, &originCountry,
		&truckID, &carrierCompany,
		&employeeID, &branchOffice,
		&department, &staffCode,
		&approvedBy, &approvedAt,
		&u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return domain.User{}, domain.ErrNotFound
		}
		return domain.User{}, fmt.Errorf("get user by email: %w", err)
	}
	u.Role = domain.UserRole(role)
	u.Status = domain.UserStatus(status)
	u.FullName = deref(fullName)
	u.Phone = deref(phone)
	u.BusinessName = deref(businessName)
	u.VATNumber = deref(vatNumber)
	u.CompanyAddress = deref(companyAddress)
	u.OriginCountry = deref(originCountry)
	u.TruckID = deref(truckID)
	u.CarrierCompany = deref(carrierCompany)
	u.EmployeeID = deref(employeeID)
	u.BranchOffice = deref(branchOffice)
	u.Department = deref(department)
	u.StaffCode = deref(staffCode)
	u.ApprovedBy = deref(approvedBy)
	u.ApprovedAt = approvedAt
	return u, nil
}

func (r *UserRepo) GetUserByID(ctx context.Context, id string) (domain.User, error) {
	const q = `
SELECT
  id, email, password_hash, role, status,
  full_name, phone,
  business_name, vat_number,
  company_address, origin_country,
  truck_id, carrier_company,
  employee_id, branch_office,
  department, staff_code,
  approved_by, approved_at,
  created_at, updated_at
FROM users
WHERE id = $1
`
	var u domain.User
	var role, status string
	var approvedAt *time.Time
	var approvedBy, fullName, phone, businessName, vatNumber *string
	var companyAddress, originCountry, truckID, carrierCompany *string
	var employeeID, branchOffice, department, staffCode *string
	err := r.pool.inner.QueryRow(ctx, q, id).Scan(
		&u.ID, &u.Email, &u.PasswordHash, &role, &status,
		&fullName, &phone,
		&businessName, &vatNumber,
		&companyAddress, &originCountry,
		&truckID, &carrierCompany,
		&employeeID, &branchOffice,
		&department, &staffCode,
		&approvedBy, &approvedAt,
		&u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return domain.User{}, domain.ErrNotFound
		}
		return domain.User{}, fmt.Errorf("get user: %w", err)
	}
	u.Role = domain.UserRole(role)
	u.Status = domain.UserStatus(status)
	u.FullName = deref(fullName)
	u.Phone = deref(phone)
	u.BusinessName = deref(businessName)
	u.VATNumber = deref(vatNumber)
	u.CompanyAddress = deref(companyAddress)
	u.OriginCountry = deref(originCountry)
	u.TruckID = deref(truckID)
	u.CarrierCompany = deref(carrierCompany)
	u.EmployeeID = deref(employeeID)
	u.BranchOffice = deref(branchOffice)
	u.Department = deref(department)
	u.StaffCode = deref(staffCode)
	u.ApprovedBy = deref(approvedBy)
	u.ApprovedAt = approvedAt
	return u, nil
}

func (r *UserRepo) SetUserActive(ctx context.Context, userID, approvedBy string, approvedAt time.Time) error {
	const q = `
UPDATE users
SET status = 'ACTIVE', approved_by = $2, approved_at = $3, updated_at = now()
WHERE id = $1 AND status IN ('PENDING', 'INFO_REQUIRED')
`
	ct, err := r.pool.inner.Exec(ctx, q, userID, approvedBy, approvedAt)
	if err != nil {
		return fmt.Errorf("approve user: %w", err)
	}
	if ct.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *UserRepo) SetUserDenied(ctx context.Context, userID, deniedBy string, deniedAt time.Time) error {
	const q = `
UPDATE users
SET status = 'DENIED', approved_by = $2, approved_at = $3, updated_at = now()
WHERE id = $1 AND status IN ('PENDING', 'INFO_REQUIRED')
`
	ct, err := r.pool.inner.Exec(ctx, q, userID, deniedBy, deniedAt)
	if err != nil {
		return fmt.Errorf("deny user: %w", err)
	}
	if ct.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *UserRepo) SetUserInfoRequired(ctx context.Context, userID string) error {
	const q = `
UPDATE users
SET status = 'INFO_REQUIRED', updated_at = now()
WHERE id = $1 AND status = 'PENDING'
`
	ct, err := r.pool.inner.Exec(ctx, q, userID)
	if err != nil {
		return fmt.Errorf("request info: %w", err)
	}
	if ct.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *UserRepo) ListPendingUsers(ctx context.Context, limit int) ([]domain.User, error) {
	if limit <= 0 || limit > 500 {
		limit = 100
	}
	const q = `
SELECT
  id, email, role, status,
  full_name, phone,
  business_name, vat_number,
  company_address, origin_country,
  truck_id, carrier_company,
  employee_id, branch_office,
  department, staff_code,
  created_at, updated_at
FROM users
WHERE status IN ('PENDING', 'INFO_REQUIRED')
ORDER BY created_at ASC
LIMIT $1
`
	rows, err := r.pool.inner.Query(ctx, q, limit)
	if err != nil {
		return nil, fmt.Errorf("list pending users: %w", err)
	}
	defer rows.Close()

	out := make([]domain.User, 0, limit)
	for rows.Next() {
		var u domain.User
		var role, status string
		var fullName, phone, businessName, vatNumber *string
		var companyAddress, originCountry, truckID, carrierCompany *string
		var employeeID, branchOffice, department, staffCode *string
		if err := rows.Scan(
			&u.ID, &u.Email, &role, &status,
			&fullName, &phone,
			&businessName, &vatNumber,
			&companyAddress, &originCountry,
			&truckID, &carrierCompany,
			&employeeID, &branchOffice,
			&department, &staffCode,
			&u.CreatedAt, &u.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan pending user: %w", err)
		}
		u.Role = domain.UserRole(role)
		u.Status = domain.UserStatus(status)
		u.FullName = deref(fullName)
		u.Phone = deref(phone)
		u.BusinessName = deref(businessName)
		u.VATNumber = deref(vatNumber)
		u.CompanyAddress = deref(companyAddress)
		u.OriginCountry = deref(originCountry)
		u.TruckID = deref(truckID)
		u.CarrierCompany = deref(carrierCompany)
		u.EmployeeID = deref(employeeID)
		u.BranchOffice = deref(branchOffice)
		u.Department = deref(department)
		u.StaffCode = deref(staffCode)
		out = append(out, u)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate pending users: %w", err)
	}
	return out, nil
}

func (r *UserRepo) ListSellers(ctx context.Context, query string, limit int) ([]domain.User, error) {
	if limit <= 0 || limit > 500 {
		limit = 50
	}
	q := `
SELECT
  id, email, role, status,
  full_name, phone,
  business_name, vat_number,
  company_address, origin_country,
  truck_id, carrier_company,
  employee_id, branch_office,
  department, staff_code,
  created_at, updated_at
FROM users
WHERE role = 'SELLER' AND (business_name ILIKE $1 OR email ILIKE $1)
ORDER BY business_name ASC NULLS LAST
LIMIT $2
`
	arg := "%" + strings.TrimSpace(query) + "%"
	rows, err := r.pool.inner.Query(ctx, q, arg, limit)
	if err != nil {
		return nil, fmt.Errorf("list sellers: %w", err)
	}
	defer rows.Close()

	out := make([]domain.User, 0)
	for rows.Next() {
		var u domain.User
		var role, status string
		var fullName, phone, businessName, vatNumber *string
		var companyAddress, originCountry, truckID, carrierCompany *string
		var employeeID, branchOffice, department, staffCode *string
		if err := rows.Scan(
			&u.ID, &u.Email, &role, &status,
			&fullName, &phone,
			&businessName, &vatNumber,
			&companyAddress, &originCountry,
			&truckID, &carrierCompany,
			&employeeID, &branchOffice,
			&department, &staffCode,
			&u.CreatedAt, &u.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan seller: %w", err)
		}
		u.Role = domain.UserRole(role)
		u.Status = domain.UserStatus(status)
		u.FullName = deref(fullName)
		u.Phone = deref(phone)
		u.BusinessName = deref(businessName)
		u.VATNumber = deref(vatNumber)
		u.CompanyAddress = deref(companyAddress)
		u.OriginCountry = deref(originCountry)
		u.TruckID = deref(truckID)
		u.CarrierCompany = deref(carrierCompany)
		u.EmployeeID = deref(employeeID)
		u.BranchOffice = deref(branchOffice)
		u.Department = deref(department)
		u.StaffCode = deref(staffCode)
		out = append(out, u)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate sellers: %w", err)
	}
	return out, nil
}

func nullIfEmpty(s string) any {
	if s == "" {
		return nil
	}
	return s
}

func isUniqueViolation(err error) bool {
	// pgx exposes postgres errors via error string / pgconn.PgError, but we avoid adding pgconn import here.
	// This is best-effort; callers can still surface generic errors in development.
	type pgErr interface{ SQLState() string }
	var pe pgErr
	if errors.As(err, &pe) && pe.SQLState() == "23505" {
		return true
	}
	return false
}

func deref(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
