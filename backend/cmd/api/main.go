package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/abenezer54/ethio-chain-logistics/backend/internal/config"
	"github.com/abenezer54/ethio-chain-logistics/backend/internal/delivery/controller"
	"github.com/abenezer54/ethio-chain-logistics/backend/internal/domain"
	"github.com/abenezer54/ethio-chain-logistics/backend/internal/repository"
	"github.com/abenezer54/ethio-chain-logistics/backend/internal/usecase"
	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}
	gin.SetMode(cfg.GinMode)

	ctx := context.Background()
	pool, err := repository.NewPool(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("database: %v", err)
	}
	defer pool.Close()

	healthUC := usecase.NewHealthUsecase(pool)

	userRepo := repository.NewUserRepo(pool)
	docRepo := repository.NewKYCDocRepo(pool)
	emailSender := usecase.NoopEmailSender{}
	authUC := usecase.NewAuthUsecase(userRepo, docRepo, emailSender, cfg.JWTSecret)
	authHandlers := controller.NewAuthHandlers(authUC, cfg.UploadDir)
	adminHandlers := controller.NewAdminHandlers(authUC, cfg.UploadDir)

	bootstrapAdmin(ctx, userRepo)

	engine := controller.Router(healthUC, authHandlers, adminHandlers, cfg.JWTSecret)

	srv := &http.Server{
		Addr:              cfg.Addr,
		Handler:           engine,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	go func() {
		log.Printf("api listening on %s", cfg.Addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("shutdown: %v", err)
	}
}

func bootstrapAdmin(ctx context.Context, users *repository.UserRepo) {
	email := os.Getenv("ADMIN_EMAIL")
	pass := os.Getenv("ADMIN_PASSWORD")
	if email == "" || pass == "" {
		return
	}
	_, err := users.GetUserByEmail(ctx, email)
	if err == nil {
		return
	}
	if err != domain.ErrNotFound {
		log.Printf("bootstrap admin: lookup failed: %v", err)
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(pass), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("bootstrap admin: hash failed: %v", err)
		return
	}
	_, err = users.CreateUser(ctx, domain.User{
		Email:        email,
		PasswordHash: string(hash),
		Role:         domain.RoleAdmin,
		Status:       domain.StatusActive,
		FullName:     "Admin",
	})
	if err != nil {
		log.Printf("bootstrap admin: create failed: %v", err)
		return
	}
	log.Printf("bootstrap admin: created admin user %s", email)
}
