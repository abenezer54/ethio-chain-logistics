package controller

// import (
// 	"context"
// 	"net/http"
// 	"net/http/httptest"
// 	"testing"

// 	"github.com/abenezer54/ethio-chain-logistics/backend/internal/usecase"
// )

// type stubPing struct{}

// func (stubPing) Ping(context.Context) error { return nil }

// func TestHealth_OK(t *testing.T) {
// 	r := Router(usecase.NewHealthUsecase(stubPing{}), nil, nil, nil, "test-secret")
// 	rec := httptest.NewRecorder()
// 	req := httptest.NewRequest(http.MethodGet, "/health", nil)
// 	r.ServeHTTP(rec, req)
// 	if rec.Code != http.StatusOK {
// 		t.Fatalf("expected 200, got %d", rec.Code)
// 	}
// }

// func TestReady_OK(t *testing.T) {
// 	r := Router(usecase.NewHealthUsecase(stubPing{}), nil, nil, nil, "test-secret")
// 	rec := httptest.NewRecorder()
// 	req := httptest.NewRequest(http.MethodGet, "/ready", nil)
// 	r.ServeHTTP(rec, req)
// 	if rec.Code != http.StatusOK {
// 		t.Fatalf("expected 200, got %d", rec.Code)
// 	}
// }

// func TestAPIv1(t *testing.T) {
// 	r := Router(usecase.NewHealthUsecase(stubPing{}), nil, nil, nil, "test-secret")
// 	rec := httptest.NewRecorder()
// 	req := httptest.NewRequest(http.MethodGet, "/api/v1", nil)
// 	r.ServeHTTP(rec, req)
// 	if rec.Code != http.StatusOK {
// 		t.Fatalf("expected 200, got %d", rec.Code)
// 	}
// }
