package usecase

import (
	"context"
	"log"
)

type NoopEmailSender struct{}

func (NoopEmailSender) Send(ctx context.Context, toEmail, subject, body string) error {
	_ = ctx
	log.Printf("noop email sender: to=%s subject=%q body=%q", toEmail, subject, body)
	return nil
}

