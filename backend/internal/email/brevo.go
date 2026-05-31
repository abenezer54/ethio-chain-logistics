package email

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

const brevoSendEmailURL = "https://api.brevo.com/v3/smtp/email"

type BrevoConfig struct {
	APIKey      string
	SenderEmail string
	SenderName  string
	Endpoint    string
	HTTPClient  *http.Client
}

type BrevoSender struct {
	apiKey      string
	senderEmail string
	senderName  string
	endpoint    string
	client      *http.Client
}

func NewBrevoSender(cfg BrevoConfig) (*BrevoSender, error) {
	apiKey := strings.TrimSpace(cfg.APIKey)
	senderEmail := strings.TrimSpace(cfg.SenderEmail)
	if apiKey == "" {
		return nil, fmt.Errorf("brevo api key is required")
	}
	if senderEmail == "" {
		return nil, fmt.Errorf("brevo sender email is required")
	}

	senderName := strings.TrimSpace(cfg.SenderName)
	if senderName == "" {
		senderName = "Ethio Chain Logistics"
	}
	endpoint := strings.TrimSpace(cfg.Endpoint)
	if endpoint == "" {
		endpoint = brevoSendEmailURL
	}
	client := cfg.HTTPClient
	if client == nil {
		client = &http.Client{Timeout: 10 * time.Second}
	}

	return &BrevoSender{
		apiKey:      apiKey,
		senderEmail: senderEmail,
		senderName:  senderName,
		endpoint:    endpoint,
		client:      client,
	}, nil
}

func (s *BrevoSender) Send(ctx context.Context, toEmail, subject, body string) error {
	return s.send(ctx, sendEmailRequest{
		Sender: emailContact{
			Name:  s.senderName,
			Email: s.senderEmail,
		},
		To: []emailContact{
			{Email: strings.TrimSpace(toEmail)},
		},
		Subject:     strings.TrimSpace(subject),
		TextContent: body,
	})
}

func (s *BrevoSender) SendTemplate(ctx context.Context, toEmail string, templateID int, params map[string]any) error {
	if templateID <= 0 {
		return fmt.Errorf("brevo template id is required")
	}
	return s.send(ctx, sendEmailRequest{
		Sender: emailContact{
			Name:  s.senderName,
			Email: s.senderEmail,
		},
		To: []emailContact{
			{Email: strings.TrimSpace(toEmail)},
		},
		TemplateID: templateID,
		Params:     params,
	})
}

func (s *BrevoSender) send(ctx context.Context, payload sendEmailRequest) error {
	if len(payload.To) == 0 {
		return fmt.Errorf("recipient email is required")
	}
	toEmail := strings.TrimSpace(payload.To[0].Email)
	toEmail = strings.TrimSpace(toEmail)
	if toEmail == "" {
		return fmt.Errorf("recipient email is required")
	}
	payload.To[0].Email = toEmail
	if payload.TemplateID <= 0 && strings.TrimSpace(payload.Subject) == "" {
		return fmt.Errorf("email subject is required")
	}
	reqBody, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshal brevo email request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, s.endpoint, bytes.NewReader(reqBody))
	if err != nil {
		return fmt.Errorf("create brevo email request: %w", err)
	}
	req.Header.Set("api-key", s.apiKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return fmt.Errorf("send brevo email: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		msg, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
		return fmt.Errorf("brevo email failed: status=%d body=%s", resp.StatusCode, strings.TrimSpace(string(msg)))
	}
	return nil
}

type sendEmailRequest struct {
	Sender      emailContact   `json:"sender"`
	To          []emailContact `json:"to"`
	Subject     string         `json:"subject,omitempty"`
	TextContent string         `json:"textContent,omitempty"`
	TemplateID  int            `json:"templateId,omitempty"`
	Params      map[string]any `json:"params,omitempty"`
}

type emailContact struct {
	Name  string `json:"name,omitempty"`
	Email string `json:"email"`
}
