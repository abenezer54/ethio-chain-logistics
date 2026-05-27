package storage

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path"
	"path/filepath"
	"strings"
	"time"
)

type FileStore interface {
	Save(ctx context.Context, key, contentType string, src io.Reader) (int64, error)
	Open(ctx context.Context, key string) (io.ReadCloser, error)
}

type LocalFileStore struct {
	baseDir string
}

func NewLocalFileStore(baseDir string) *LocalFileStore {
	if strings.TrimSpace(baseDir) == "" {
		baseDir = "uploads"
	}
	return &LocalFileStore{baseDir: baseDir}
}

func (s *LocalFileStore) Save(ctx context.Context, key, contentType string, src io.Reader) (int64, error) {
	_ = ctx
	if strings.TrimSpace(key) == "" {
		return 0, fmt.Errorf("storage key is required")
	}
	dstPath := filepath.Join(s.baseDir, filepath.FromSlash(key))
	if err := os.MkdirAll(filepath.Dir(dstPath), 0o755); err != nil {
		return 0, fmt.Errorf("mkdir uploads: %w", err)
	}
	dst, err := os.Create(dstPath)
	if err != nil {
		return 0, fmt.Errorf("create upload: %w", err)
	}
	defer dst.Close()
	if contentType == "" {
		contentType = "application/octet-stream"
	}
	_ = contentType
	return io.Copy(dst, src)
}

func (s *LocalFileStore) Open(ctx context.Context, key string) (io.ReadCloser, error) {
	_ = ctx
	if strings.TrimSpace(key) == "" {
		return nil, fmt.Errorf("storage key is required")
	}
	f, err := os.Open(filepath.Join(s.baseDir, filepath.FromSlash(key)))
	if err != nil {
		return nil, err
	}
	return f, nil
}

type SupabaseFileStore struct {
	baseURL   string
	bucket    string
	apiKey    string
	client    *http.Client
}

func NewSupabaseFileStore(baseURL, bucket, apiKey string) *SupabaseFileStore {
	return &SupabaseFileStore{
		baseURL: strings.TrimRight(strings.TrimSpace(baseURL), "/"),
		bucket:  strings.TrimSpace(bucket),
		apiKey:  strings.TrimSpace(apiKey),
		client: &http.Client{Timeout: 60 * time.Second},
	}
}

func (s *SupabaseFileStore) Save(ctx context.Context, key, contentType string, src io.Reader) (int64, error) {
	if err := s.validate(); err != nil {
		return 0, err
	}
	if strings.TrimSpace(key) == "" {
		return 0, fmt.Errorf("storage key is required")
	}
	payload, err := io.ReadAll(src)
	if err != nil {
		return 0, fmt.Errorf("read upload: %w", err)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPut, s.objectURL(key), bytes.NewReader(payload))
	if err != nil {
		return 0, fmt.Errorf("create upload request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+s.apiKey)
	req.Header.Set("apikey", s.apiKey)
	req.Header.Set("x-upsert", "true")
	if contentType == "" {
		contentType = http.DetectContentType(payload)
		if contentType == "" {
			contentType = "application/octet-stream"
		}
	}
	req.Header.Set("Content-Type", contentType)
	res, err := s.client.Do(req)
	if err != nil {
		return 0, fmt.Errorf("upload to supabase: %w", err)
	}
	defer res.Body.Close()
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		body, _ := io.ReadAll(io.LimitReader(res.Body, 2048))
		msg := strings.TrimSpace(string(body))
		if msg == "" {
			msg = res.Status
		}
		return 0, fmt.Errorf("supabase upload failed: %s", msg)
	}
	return int64(len(payload)), nil
}

func (s *SupabaseFileStore) Open(ctx context.Context, key string) (io.ReadCloser, error) {
	if err := s.validate(); err != nil {
		return nil, err
	}
	if strings.TrimSpace(key) == "" {
		return nil, fmt.Errorf("storage key is required")
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, s.objectURL(key), nil)
	if err != nil {
		return nil, fmt.Errorf("create download request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+s.apiKey)
	req.Header.Set("apikey", s.apiKey)
	res, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("download from supabase: %w", err)
	}
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		body, _ := io.ReadAll(io.LimitReader(res.Body, 2048))
		_ = res.Body.Close()
		msg := strings.TrimSpace(string(body))
		if msg == "" {
			msg = res.Status
		}
		return nil, fmt.Errorf("supabase download failed: %s", msg)
	}
	return res.Body, nil
}

func (s *SupabaseFileStore) validate() error {
	if s == nil {
		return errors.New("storage store is nil")
	}
	if s.baseURL == "" {
		return fmt.Errorf("supabase url is required")
	}
	if s.bucket == "" {
		return fmt.Errorf("supabase bucket is required")
	}
	if s.apiKey == "" {
		return fmt.Errorf("supabase api key is required")
	}
	return nil
}

func (s *SupabaseFileStore) objectURL(key string) string {
	return s.baseURL + "/storage/v1/object/" + url.PathEscape(s.bucket) + "/" + encodeObjectKey(key)
}

func encodeObjectKey(key string) string {
	parts := strings.Split(filepath.ToSlash(strings.TrimPrefix(key, "/")), "/")
	encoded := make([]string, 0, len(parts))
	for _, part := range parts {
		if part == "" {
			continue
		}
		encoded = append(encoded, url.PathEscape(part))
	}
	return path.Join(encoded...)
}
