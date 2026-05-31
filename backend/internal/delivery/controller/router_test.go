package controller

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/abenezer54/ethio-chain-logistics/backend/internal/usecase"
)

type stubPing struct {
	err error
}

func (s stubPing) Ping(context.Context) error { return s.err }

func TestRouterHealthAndAPIRoot(t *testing.T) {
	r := Router(usecase.NewHealthUsecase(stubPing{}), nil, nil, nil, nil, nil, nil, nil, "test-secret")

	tests := []struct {
		name string
		path string
		want int
	}{
		{name: "health", path: "/health", want: http.StatusOK},
		{name: "ready", path: "/ready", want: http.StatusOK},
		{name: "api root", path: "/api/v1", want: http.StatusOK},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := httptest.NewRecorder()
			req := httptest.NewRequest(http.MethodGet, tt.path, nil)
			r.ServeHTTP(rec, req)
			if rec.Code != tt.want {
				t.Fatalf("expected %d, got %d", tt.want, rec.Code)
			}
		})
	}
}

func TestRouterReadyReturnsUnavailableWhenDBPingFails(t *testing.T) {
	r := Router(usecase.NewHealthUsecase(stubPing{err: errors.New("db down")}), nil, nil, nil, nil, nil, nil, nil, "test-secret")

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/ready", nil)
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected %d, got %d", http.StatusServiceUnavailable, rec.Code)
	}
}
