package controller

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/abenezer54/ethio-chain-logistics/backend/internal/domain"
	"github.com/abenezer54/ethio-chain-logistics/backend/internal/usecase"
)

type stubAdminAnalyticsRepo struct{}

func (stubAdminAnalyticsRepo) GetAdminAnalytics(context.Context) (domain.AdminAnalytics, error) {
	return domain.AdminAnalytics{
		GeneratedAt: time.Date(2026, 6, 3, 9, 0, 0, 0, time.UTC),
		Overview: domain.AdminShipmentOverview{
			Total:          3,
			Active:         2,
			InTransit:      1,
			ActionRequired: 1,
		},
		ShipmentsByStatus: []domain.AdminCount{
			{Key: "IN_TRANSIT", Count: 1},
			{Key: "CLEARED", Count: 1},
		},
	}, nil
}

func TestAdminAnalyticsRouteRequiresAdminAndReturnsMetrics(t *testing.T) {
	const secret = "test-secret"
	r := Router(
		usecase.NewHealthUsecase(stubPing{}),
		nil,
		NewAdminHandlers(nil, nil, usecase.NewAdminAnalyticsUsecase(stubAdminAnalyticsRepo{})),
		nil,
		nil,
		nil,
		nil,
		nil,
		secret,
	)

	t.Run("missing token is rejected", func(t *testing.T) {
		rec := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/analytics", nil)
		r.ServeHTTP(rec, req)
		if rec.Code != http.StatusUnauthorized {
			t.Fatalf("expected 401, got %d", rec.Code)
		}
	})

	t.Run("non admin is forbidden", func(t *testing.T) {
		rec := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/analytics", nil)
		req.Header.Set("Authorization", "Bearer "+testJWT(t, secret, "importer-1", domain.RoleImporter))
		r.ServeHTTP(rec, req)
		if rec.Code != http.StatusForbidden {
			t.Fatalf("expected 403, got %d", rec.Code)
		}
	})

	t.Run("admin receives analytics", func(t *testing.T) {
		rec := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/analytics", nil)
		req.Header.Set("Authorization", "Bearer "+testJWT(t, secret, "admin-1", domain.RoleAdmin))
		r.ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d body=%s", rec.Code, rec.Body.String())
		}
		if got := rec.Body.String(); !containsAll(got, `"total":3`, `"in_transit":1`, `"shipments_by_status"`) {
			t.Fatalf("analytics body missing expected metrics: %s", got)
		}
	})
}

func containsAll(s string, needles ...string) bool {
	for _, needle := range needles {
		if !strings.Contains(s, needle) {
			return false
		}
	}
	return true
}
