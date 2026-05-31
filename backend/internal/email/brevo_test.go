package email

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestBrevoSenderSendPostsTransactionalEmail(t *testing.T) {
	var gotKey string
	var gotPayload sendEmailRequest
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Fatalf("method = %s, want POST", r.Method)
		}
		gotKey = r.Header.Get("api-key")
		if err := json.NewDecoder(r.Body).Decode(&gotPayload); err != nil {
			t.Fatalf("decode request: %v", err)
		}
		w.WriteHeader(http.StatusCreated)
	}))
	defer server.Close()

	sender, err := NewBrevoSender(BrevoConfig{
		APIKey:      "test-key",
		SenderEmail: "ethiochainlogistics@gmail.com",
		SenderName:  "Ethio Chain Logistics",
		Endpoint:    server.URL,
		HTTPClient:  server.Client(),
	})
	if err != nil {
		t.Fatalf("NewBrevoSender: %v", err)
	}

	if err := sender.Send(context.Background(), "user@example.com", "Welcome", "Approved"); err != nil {
		t.Fatalf("Send: %v", err)
	}

	if gotKey != "test-key" {
		t.Fatalf("api-key header = %q, want test-key", gotKey)
	}
	if gotPayload.Sender.Email != "ethiochainlogistics@gmail.com" {
		t.Fatalf("sender email = %q", gotPayload.Sender.Email)
	}
	if len(gotPayload.To) != 1 || gotPayload.To[0].Email != "user@example.com" {
		t.Fatalf("to = %#v", gotPayload.To)
	}
	if gotPayload.Subject != "Welcome" || gotPayload.TextContent != "Approved" {
		t.Fatalf("payload = %#v", gotPayload)
	}
}

func TestBrevoSenderSendReturnsAPIError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "blocked ip", http.StatusUnauthorized)
	}))
	defer server.Close()

	sender, err := NewBrevoSender(BrevoConfig{
		APIKey:      "test-key",
		SenderEmail: "ethiochainlogistics@gmail.com",
		Endpoint:    server.URL,
		HTTPClient:  server.Client(),
	})
	if err != nil {
		t.Fatalf("NewBrevoSender: %v", err)
	}

	if err := sender.Send(context.Background(), "user@example.com", "Welcome", "Approved"); err == nil {
		t.Fatal("Send error = nil, want error")
	}
}
