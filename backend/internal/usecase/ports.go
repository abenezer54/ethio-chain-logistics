package usecase

import "context"

// DBPing is implemented by the Postgres pool for readiness checks.
type DBPing interface {
	Ping(ctx context.Context) error
}
