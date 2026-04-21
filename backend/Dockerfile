# syntax=docker/dockerfile:1

FROM golang:1.23-alpine AS base
WORKDIR /src
RUN apk add --no-cache ca-certificates git

FROM base AS deps
COPY go.mod go.sum ./
RUN go mod download

FROM deps AS build
COPY . .
RUN CGO_ENABLED=0 go build -o /out/api ./cmd/api

FROM deps AS goose-build
RUN go install github.com/pressly/goose/v3/cmd/goose@v3.24.1
COPY migrations /src/migrations

FROM alpine:3.20 AS runtime
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app
COPY --from=build /out/api ./api
RUN mkdir -p /app/uploads && chown -R nobody:nobody /app/uploads
USER nobody
EXPOSE 8080
ENTRYPOINT ["/app/api"]

FROM alpine:3.20 AS migrate
RUN apk add --no-cache ca-certificates
WORKDIR /app
COPY --from=goose-build /go/bin/goose /usr/local/bin/goose
COPY --from=goose-build /src/migrations ./migrations
ENTRYPOINT ["goose", "-dir", "/app/migrations"]
