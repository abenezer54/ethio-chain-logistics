package usecase

import "context"

// HealthUsecase supports liveness vs readiness semantics.
type HealthUsecase struct {
	db DBPing
}

func NewHealthUsecase(db DBPing) *HealthUsecase {
	return &HealthUsecase{db: db}
}

// Live is true when the process should receive traffic (no external checks).
func (h *HealthUsecase) Live() bool {
	return true
}

// Ready verifies dependencies (e.g. database).
func (h *HealthUsecase) Ready(ctx context.Context) error {
	if h.db == nil {
		return nil
	}
	return h.db.Ping(ctx)
}
