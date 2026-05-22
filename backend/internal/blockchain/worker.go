package blockchain

import (
	"context"
	"errors"
	"log"
	"time"

	"github.com/abenezer54/ethio-chain-logistics/backend/internal/domain"
	"github.com/abenezer54/ethio-chain-logistics/backend/internal/repository"
)

type AnchorJobStore interface {
	ClaimNext(ctx context.Context) (domain.AnchorJob, error)
	MarkAnchored(ctx context.Context, job domain.AnchorJob, txHash string) error
	MarkAlreadyAnchored(ctx context.Context, job domain.AnchorJob) error
	MarkFailed(ctx context.Context, job domain.AnchorJob, cause error) error
}

type AnchorClient interface {
	AnchorRecord(ctx context.Context, job domain.AnchorJob) (string, error)
}

type AnchorWorker struct {
	store          AnchorJobStore
	client         AnchorClient
	interval       time.Duration
	confirmTimeout time.Duration
}

func NewAnchorWorker(store AnchorJobStore, client AnchorClient, interval, confirmTimeout time.Duration) *AnchorWorker {
	if interval <= 0 {
		interval = 5 * time.Second
	}
	if confirmTimeout <= 0 {
		confirmTimeout = 60 * time.Second
	}
	return &AnchorWorker{
		store:          store,
		client:         client,
		interval:       interval,
		confirmTimeout: confirmTimeout,
	}
}

func (w *AnchorWorker) Run(ctx context.Context) {
	w.processAvailable(ctx)

	ticker := time.NewTicker(w.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			w.processAvailable(ctx)
		}
	}
}

func (w *AnchorWorker) processAvailable(ctx context.Context) {
	for {
		job, err := w.store.ClaimNext(ctx)
		if err != nil {
			if errors.Is(err, repository.ErrNoAnchorJobs) || errors.Is(err, context.Canceled) {
				return
			}
			log.Printf("blockchain anchor worker: claim job failed: %v", err)
			return
		}

		jobCtx, cancel := context.WithTimeout(ctx, w.confirmTimeout)
		txHash, err := w.client.AnchorRecord(jobCtx, job)
		cancel()
		if err != nil {
			if errors.Is(err, ErrRecordAlreadyAnchored) {
				if markErr := w.store.MarkAlreadyAnchored(ctx, job); markErr != nil {
					log.Printf("blockchain anchor worker: resolve already anchored job %s failed: %v", job.ID, markErr)
					if failErr := w.store.MarkFailed(ctx, job, err); failErr != nil {
						log.Printf("blockchain anchor worker: mark failed for job %s: %v", job.ID, failErr)
					}
				}
				continue
			}
			if markErr := w.store.MarkFailed(ctx, job, err); markErr != nil {
				log.Printf("blockchain anchor worker: mark failed for job %s: %v", job.ID, markErr)
			}
			log.Printf("blockchain anchor worker: anchor job %s failed: %v", job.ID, err)
			continue
		}
		if err := w.store.MarkAnchored(ctx, job, txHash); err != nil {
			log.Printf("blockchain anchor worker: mark anchored for job %s failed: %v", job.ID, err)
			continue
		}
	}
}
