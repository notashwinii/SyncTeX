# Build stage
FROM golang:1.24-alpine AS builder
WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download
RUN go install \
    -tags="no_clickhouse no_libsql no_mssql no_mysql no_sqlite3 no_vertica no_ydb" \
    github.com/pressly/goose/v3/cmd/goose@v3.26.0

COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o synctex ./cmd/server

# Runtime stage
FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/synctex .
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /go/bin/goose /usr/local/bin/goose

EXPOSE 8080
CMD ["./synctex"]
