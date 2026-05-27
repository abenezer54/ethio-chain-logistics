package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

// Config holds runtime configuration loaded from the environment.
type Config struct {
	Addr                  string
	DatabaseURL           string
	GinMode               string
	JWTSecret             string
	UploadDir             string
	StorageProvider       string
	SupabaseURL           string
	SupabaseServiceRoleKey string
	SupabaseStorageBucket  string
	FromEmail             string
	BlockchainEnabled     bool
	BlockchainNetwork     string
	BlockchainRPCURL      string
	BlockchainChainID     string
	BlockchainPrivateKey  string
	AnchorContractAddress string
	BlockExplorerTxBase   string
	AnchorWorkerInterval  time.Duration
	AnchorConfirmTimeout  time.Duration
}

// Load reads configuration from environment variables.
func Load() (Config, error) {
	port := os.Getenv("API_PORT")
	if port == "" {
		port = "8080"
	}
	cfg := Config{
		Addr:                  ":" + port,
		DatabaseURL:           os.Getenv("DATABASE_URL"),
		GinMode:               os.Getenv("GIN_MODE"),
		JWTSecret:             os.Getenv("JWT_SECRET"),
		UploadDir:             os.Getenv("UPLOAD_DIR"),
		StorageProvider:       stringEnv("STORAGE_PROVIDER", "local"),
		SupabaseURL:           strings.TrimSpace(os.Getenv("SUPABASE_URL")),
		SupabaseServiceRoleKey: strings.TrimSpace(os.Getenv("SUPABASE_SERVICE_ROLE_KEY")),
		SupabaseStorageBucket:  stringEnv("SUPABASE_STORAGE_BUCKET", "ethio-chain-uploads"),
		FromEmail:             os.Getenv("FROM_EMAIL"),
		BlockchainEnabled:     boolEnv("BLOCKCHAIN_ENABLED", false),
		BlockchainNetwork:     stringEnv("BLOCKCHAIN_NETWORK", "hardhat-local"),
		BlockchainRPCURL:      stringEnv("BLOCKCHAIN_RPC_URL", "http://127.0.0.1:8545"),
		BlockchainChainID:     stringEnv("BLOCKCHAIN_CHAIN_ID", "31337"),
		BlockchainPrivateKey:  os.Getenv("BLOCKCHAIN_PRIVATE_KEY"),
		AnchorContractAddress: os.Getenv("ANCHOR_CONTRACT_ADDRESS"),
		BlockExplorerTxBase:   os.Getenv("BLOCK_EXPLORER_TX_BASE"),
		AnchorWorkerInterval:  durationSecondsEnv("ANCHOR_WORKER_INTERVAL_SECONDS", 5),
		AnchorConfirmTimeout:  durationSecondsEnv("ANCHOR_CONFIRM_TIMEOUT_SECONDS", 60),
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
	if cfg.StorageProvider == "" {
		cfg.StorageProvider = "local"
	}
	if cfg.FromEmail == "" {
		cfg.FromEmail = "no-reply@local.dev"
	}
	if cfg.DatabaseURL == "" {
		return Config{}, fmt.Errorf("DATABASE_URL or POSTGRES_* variables must be set")
	}
	if cfg.StorageProvider == "supabase" {
		if cfg.SupabaseURL == "" {
			return Config{}, fmt.Errorf("SUPABASE_URL is required when STORAGE_PROVIDER=supabase")
		}
		if cfg.SupabaseServiceRoleKey == "" {
			return Config{}, fmt.Errorf("SUPABASE_SERVICE_ROLE_KEY is required when STORAGE_PROVIDER=supabase")
		}
		if cfg.SupabaseStorageBucket == "" {
			return Config{}, fmt.Errorf("SUPABASE_STORAGE_BUCKET is required when STORAGE_PROVIDER=supabase")
		}
	}
	if cfg.BlockchainEnabled {
		if strings.TrimSpace(cfg.BlockchainPrivateKey) == "" {
			return Config{}, fmt.Errorf("BLOCKCHAIN_PRIVATE_KEY is required when BLOCKCHAIN_ENABLED=true")
		}
		if strings.TrimSpace(cfg.AnchorContractAddress) == "" {
			return Config{}, fmt.Errorf("ANCHOR_CONTRACT_ADDRESS is required when BLOCKCHAIN_ENABLED=true")
		}
		if !validPositiveIntString(cfg.BlockchainChainID) {
			return Config{}, fmt.Errorf("BLOCKCHAIN_CHAIN_ID must be a valid integer")
		}
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

func stringEnv(key, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	return value
}

func boolEnv(key string, fallback bool) bool {
	value := strings.TrimSpace(strings.ToLower(os.Getenv(key)))
	if value == "" {
		return fallback
	}
	return value == "1" || value == "true" || value == "yes" || value == "on"
}

func durationSecondsEnv(key string, fallback int) time.Duration {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return time.Duration(fallback) * time.Second
	}
	n, err := strconv.Atoi(value)
	if err != nil || n <= 0 {
		return time.Duration(fallback) * time.Second
	}
	return time.Duration(n) * time.Second
}

func validPositiveIntString(value string) bool {
	n, err := strconv.ParseInt(strings.TrimSpace(value), 10, 64)
	return err == nil && n > 0
}
