package usecase

import (
	"context"

	"github.com/abenezer54/ethio-chain-logistics/backend/internal/domain"
)

type AdminAnalyticsRepository interface {
	GetAdminAnalytics(ctx context.Context) (domain.AdminAnalytics, error)
}

type AdminAnalyticsUsecase struct {
	repo AdminAnalyticsRepository
}

func NewAdminAnalyticsUsecase(repo AdminAnalyticsRepository) *AdminAnalyticsUsecase {
	return &AdminAnalyticsUsecase{repo: repo}
}

func (u *AdminAnalyticsUsecase) GetAdminAnalytics(ctx context.Context) (domain.AdminAnalytics, error) {
	return u.repo.GetAdminAnalytics(ctx)
}
