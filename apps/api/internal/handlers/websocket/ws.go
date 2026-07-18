package websocket

import (
	"context"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/synctex-org/backend/internal/queries/projectQueries"
	wsschemas "github.com/synctex-org/backend/schemas/wsSchemas"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func WsHandler(pool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			log.Println("Upgrade error:", err)
			return
		}

		userID, ok := c.Get("userID")
		if !ok {
			log.Println("userID not found in context")
			conn.Close()
			return
		}
		userName, ok := c.Get("username")
		if !ok {
			log.Println("username not found in context")
			conn.Close()
			return
		}
		projectID := c.Param("projectID")

		// Check if project exists
		ctx := c.Request.Context()
		exists, err := checkIfProjectExists(pool, ctx, projectID)
		if err != nil || !exists {
			log.Println("project id not found")
			conn.Close()
			return
		}

		userIDstr := userID.(string)
		userNamestr := userName.(string)

		// Create client with buffered send channel
		client := &wsschemas.Client{
			Conn:      conn,
			Send:      make(chan []byte, sendBufferSize),
			UserID:    userIDstr,
			UserName:  userNamestr,
			ProjectID: projectID,
		}

		// Register client with hub
		hub.Register <- client

		log.Printf("User %s connected to project %s", userNamestr, projectID)

		// Start both pump goroutines for this client
		// readPump handles incoming messages from client
		go readPump(client)
		// writePump handles outgoing messages to client
		go writePump(client)
	}
}

func checkIfProjectExists(pool *pgxpool.Pool, ctx context.Context, projectID string) (bool, error) {
	var exists bool
	err := pool.QueryRow(ctx, projectQueries.Q.CheckProjectExists, projectID).Scan(&exists)
	if err != nil {
		return false, err //db error
	}
	return exists, nil //either project exists or not
}
