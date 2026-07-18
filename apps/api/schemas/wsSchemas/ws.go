package wsschemas

import (
	"github.com/gorilla/websocket"
)

type Client struct {
	Conn      *websocket.Conn
	Send      chan []byte // Buffered channel for outbound messages
	UserID    string
	ProjectID string
	UserName  string
}

type Hub struct {
	// Map of projectID -> set of clients
	Projects map[string]map[*Client]bool
	// All connected clients
	Clients map[*Client]bool
	// Broadcast channel for messages
	Broadcast chan *Message
	// Register channel for new clients
	Register chan *Client
	// Unregister channel for disconnecting clients
	Unregister chan *Client
}

type Message struct {
	ProjectID string
	Data      []byte
	Sender    *Client
}
