package websocket

import (
	"log"
	"time"

	"github.com/gorilla/websocket"
	wsschemas "github.com/synctex-org/backend/schemas/wsSchemas"
)

const (
	// Time allowed to write a message to the peer
	writeWait = 10 * time.Second

	// Time allowed to read the next pong message from the peer
	pongWait = 60 * time.Second

	// Send pings to peer with this period. Must be less than pongWait
	pingPeriod = (pongWait * 9) / 10

	// Maximum message size allowed from peer.
	// Yjs sync carries full document state on initial sync; a small cap
	// silently kills connections on any real document.
	maxMessageSize = 10 * 1024 * 1024

	// Buffer size for client send channel
	sendBufferSize = 256
)

// readPump pumps messages from the websocket connection to the hub.
// The application runs readPump in a per-connection goroutine. The application
// ensures that there is at most one reader on a connection by executing all
// reads from this goroutine.
func readPump(c *wsschemas.Client) {
	defer func() {
		hub.Unregister <- c
		c.Conn.Close()
	}()

	c.Conn.SetReadLimit(maxMessageSize)
	c.Conn.SetReadDeadline(time.Now().Add(pongWait))
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		// Read binary message from Yjs
		messageType, message, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("Websocket error for user %s: %v", c.UserName, err)
			}
			break
		}

		// Only handle binary messages (Yjs sends binary)
		if messageType == websocket.BinaryMessage {
			// Send to hub for broadcasting
			hub.Broadcast <- &wsschemas.Message{
				ProjectID: c.ProjectID,
				Data:      message,
				Sender:    c,
			}
		}
	}
}

// writePump pumps messages from the hub to the websocket connection.
// A goroutine running writePump is started for each connection. The
// application ensures that there is at most one writer to a connection by
// executing all writes from this goroutine.
func writePump(c *wsschemas.Client) {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// The hub closed the channel
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			// Send binary message to Yjs
			if err := c.Conn.WriteMessage(websocket.BinaryMessage, message); err != nil {
				log.Printf("Write error for user %s: %v", c.UserName, err)
				return
			}

		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
