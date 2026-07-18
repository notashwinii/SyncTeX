
# SyncTex

### Prerequisites 
- Go 1.21+ installed 
- Git installed 
- [Air](https://github.com/cosmtrek/air) installed (optional, for live reloading) 

### Clone the Repository 
`git clone https://github.com/synctex-org/backend` 

`cd backend`


### Setup .env 

The project uses a .env file to store configuration values. Create a .env file in the root directory:

`touch .env`

Add your environment variables to .env. Example:

`DB_URI=postgres://username:password@localhost:5432/dbname` `JWT_KEY=your-secret-key`

Replace these values with your actual configuration.

### Dependencies 

Run `go mod tidy` to install all dependencies

### Running the backend

- Using air (Recommended for development) Air will watch for file changes and restart the server automatically: 
`air` 

Make sure your .air.toml configuration (if exists) is properly set up. 

- Using go run directly You can also run the server without live reloading: 
`go run cmd/server/main.go` 

The server should now be running locally on the port specified in your .env file (default 8080). 

### Notes 
Ensure your database or any other services required by the project are running. Check .env for sensitive configuration; do not commit it to version control. Air is optional but recommended for faster development workflow
