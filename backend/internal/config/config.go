package config

import (
	"fmt"
	"os"
	"strconv"
)

// Config holds runtime configuration loaded from the environment.
type Config struct {
	Addr         string
	DatabaseURL  string
	GinMode      string
	JWTSecret    string
	UploadDir    string
	FromEmail    string
}

// Load reads configuration from environment variables.
func Load() (Config, error) {
	port := os.Getenv("API_PORT")
	if port == "" {
		port = "8080"
	}
	cfg := Config{
		Addr:         ":" + port,
		DatabaseURL:  os.Getenv("DATABASE_URL"),
		GinMode:      os.Getenv("GIN_MODE"),
		JWTSecret:    os.Getenv("JWT_SECRET"),
		UploadDir:    os.Getenv("UPLOAD_DIR"),
		FromEmail:    os.Getenv("FROM_EMAIL"),
	}
	if cfg.DatabaseURL == "" {
		cfg.DatabaseURL = databaseURLFromParts()
	}
	if cfg.GinMode == "" {
		cfg.GinMode = "debug"
	}
	if cfg.JWTSecret == "" {
		cfg.JWTSecret = "dev-insecure-secret"
	}
	if cfg.UploadDir == "" {
		cfg.UploadDir = "uploads"
	}
	if cfg.FromEmail == "" {
		cfg.FromEmail = "no-reply@local.dev"
	}
	if cfg.DatabaseURL == "" {
		return Config{}, fmt.Errorf("DATABASE_URL or POSTGRES_* variables must be set")
	}
	return cfg, nil
}

func databaseURLFromParts() string {
	host := os.Getenv("POSTGRES_HOST")
	if host == "" {
		host = "localhost"
	}
	port := os.Getenv("POSTGRES_PORT")
	if port == "" {
		port = "5432"
	}
	user := os.Getenv("POSTGRES_USER")
	pass := os.Getenv("POSTGRES_PASSWORD")
	db := os.Getenv("POSTGRES_DB")
	if user == "" || pass == "" || db == "" {
		return ""
	}
	// Port for URL must be numeric; default already set.
	if _, err := strconv.Atoi(port); err != nil {
		return ""
	}
	return fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable", user, pass, host, port, db)
}
