package websocket

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	wsschemas "github.com/synctex-org/backend/schemas/wsSchemas"
)

func WsHandler(allowedOrigins []string) gin.HandlerFunc {
	origins := make(map[string]struct{}, len(allowedOrigins))
	for _, origin := range allowedOrigins {
		origins[origin] = struct{}{}
	}
	upgrader := websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
		CheckOrigin: func(r *http.Request) bool {
			_, allowed := origins[r.Header.Get("Origin")]
			return allowed
		},
	}

	return func(c *gin.Context) {
		userID, ok := c.Get("userID")
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"message": "missing user identity"})
			return
		}
		userName, ok := c.Get("username")
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"message": "missing user identity"})
			return
		}
		projectID := c.Param("projectID")

		conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			log.Printf("WebSocket upgrade failed for project %s: %v", projectID, err)
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
