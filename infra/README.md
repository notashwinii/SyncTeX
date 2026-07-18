# Infrastructure

`Caddyfile` provides the same-origin entry point for the containerized
development stack. It routes API, health, Swagger, and WebSocket requests to
the Go service and all remaining requests to the Next.js service.

Production environment provisioning and Terraform configuration are planned;
see `docs/implementation.md` for the deployment design.
