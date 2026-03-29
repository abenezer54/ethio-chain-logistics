package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Pool wraps a pgx connection pool for use as a DBPing port.
type Pool struct {
	inner *pgxpool.Pool
}

// NewPool opens a Postgres pool from DATABASE_URL (or equivalent).
func NewPool(ctx context.Context, databaseURL string) (*Pool, error) {
	cfg, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("parse database url: %w", err)
	}
	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("connect database: %w", err)
	}
	return &Pool{inner: pool}, nil
}

// Ping implements usecase.DBPing.
func (p *Pool) Ping(ctx context.Context) error {
	return p.inner.Ping(ctx)
}

// Close releases pool resources.
func (p *Pool) Close() {
	p.inner.Close()
}
