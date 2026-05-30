package blockchain

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/abenezer54/ethio-chain-logistics/backend/internal/domain"
	"github.com/abenezer54/ethio-chain-logistics/backend/internal/repository"
)

func TestAnchorWorkerMarksAnchored(t *testing.T) {
	store := &fakeAnchorStore{jobs: []domain.AnchorJob{{ID: "job-1"}}}
	client := fakeAnchorClient{txHash: "0xabc"}
	worker := NewAnchorWorker(store, client, time.Millisecond, time.Second)

	worker.processAvailable(context.Background())

	if store.anchored != 1 {
		t.Fatalf("expected one anchored job, got %d", store.anchored)
	}
	if store.lastTxHash != "0xabc" {
		t.Fatalf("expected tx hash 0xabc, got %q", store.lastTxHash)
	}
}

func TestAnchorWorkerHandlesAlreadyAnchored(t *testing.T) {
	store := &fakeAnchorStore{jobs: []domain.AnchorJob{{ID: "job-1"}}}
	client := fakeAnchorClient{err: ErrRecordAlreadyAnchored}
	worker := NewAnchorWorker(store, client, time.Millisecond, time.Second)

	worker.processAvailable(context.Background())

	if store.alreadyAnchored != 1 {
		t.Fatalf("expected one already-anchored resolution, got %d", store.alreadyAnchored)
	}
	if store.failed != 0 {
		t.Fatalf("expected no failed jobs, got %d", store.failed)
	}
}

func TestAnchorWorkerMarksFailedWhenClientFails(t *testing.T) {
	store := &fakeAnchorStore{jobs: []domain.AnchorJob{{ID: "job-1"}}}
	client := fakeAnchorClient{err: errors.New("rpc unavailable")}
	worker := NewAnchorWorker(store, client, time.Millisecond, time.Second)

	worker.processAvailable(context.Background())

	if store.failed != 1 {
		t.Fatalf("expected one failed job, got %d", store.failed)
	}
}

func TestAnchorWorkerNoJobsIsNoop(t *testing.T) {
	store := &fakeAnchorStore{}
	client := fakeAnchorClient{txHash: "0xabc"}
	worker := NewAnchorWorker(store, client, time.Millisecond, time.Second)

	worker.processAvailable(context.Background())

	if store.anchored != 0 || store.failed != 0 || store.alreadyAnchored != 0 {
		t.Fatalf("expected no state changes, got anchored=%d failed=%d already=%d", store.anchored, store.failed, store.alreadyAnchored)
	}
}

type fakeAnchorStore struct {
	jobs            []domain.AnchorJob
	anchored        int
	failed          int
	alreadyAnchored int
	lastTxHash      string
}

func (s *fakeAnchorStore) ClaimNext(context.Context) (domain.AnchorJob, error) {
	if len(s.jobs) == 0 {
		return domain.AnchorJob{}, repository.ErrNoAnchorJobs
	}
	job := s.jobs[0]
	s.jobs = s.jobs[1:]
	return job, nil
}

func (s *fakeAnchorStore) MarkAnchored(_ context.Context, _ domain.AnchorJob, txHash string) error {
	s.anchored++
	s.lastTxHash = txHash
	return nil
}

func (s *fakeAnchorStore) MarkAlreadyAnchored(context.Context, domain.AnchorJob) error {
	s.alreadyAnchored++
	return nil
}

func (s *fakeAnchorStore) MarkFailed(context.Context, domain.AnchorJob, error) error {
	s.failed++
	return nil
}

type fakeAnchorClient struct {
	txHash string
	err    error
}

func (c fakeAnchorClient) AnchorRecord(context.Context, domain.AnchorJob) (string, error) {
	return c.txHash, c.err
}
