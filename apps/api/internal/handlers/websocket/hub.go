package websocket

import (
	"log"

	wsschemas "github.com/synctex-org/backend/schemas/wsSchemas"
)

// Global hub instance
var hub = &wsschemas.Hub{
	Projects:   make(map[string]map[*wsschemas.Client]bool),
	Clients:    make(map[*wsschemas.Client]bool),
	Broadcast:  make(chan *wsschemas.Message),
	Register:   make(chan *wsschemas.Client),
	Unregister: make(chan *wsschemas.Client),
}

// Initialize and run the hub
func init() {
	go runHub()
}

// runHub handles all hub operations in a single goroutine
func runHub() {
	for {
		select {
		case client := <-hub.Register:
			// Register new client
			hub.Clients[client] = true

			// Add client to project room
			if hub.Projects[client.ProjectID] == nil {
				hub.Projects[client.ProjectID] = make(map[*wsschemas.Client]bool)
			}
			hub.Projects[client.ProjectID][client] = true

			log.Printf("Client %s joined project %s. Total clients in project: %d",
				client.UserName, client.ProjectID, len(hub.Projects[client.ProjectID]))

		case client := <-hub.Unregister:
			// Unregister client
			if _, ok := hub.Clients[client]; ok {
				delete(hub.Clients, client)

				// Remove from project room
				if projectClients, exists := hub.Projects[client.ProjectID]; exists {
					delete(projectClients, client)

					// Clean up empty project rooms
					if len(projectClients) == 0 {
						delete(hub.Projects, client.ProjectID)
					}
				}

				// Close send channel
				close(client.Send)

				log.Printf("Client %s left project %s", client.UserName, client.ProjectID)
			}

		case message := <-hub.Broadcast:
			// Broadcast message to all clients in the project (except sender)
			if projectClients, exists := hub.Projects[message.ProjectID]; exists {
				for client := range projectClients {
					if client != message.Sender {
						select {
						case client.Send <- message.Data:
							// Message sent successfully
						default:
							// Client's send buffer is full, disconnect them
							log.Printf("Client %s send buffer full, disconnecting", client.UserName)
							delete(hub.Clients, client)
							delete(projectClients, client)
							close(client.Send)
						}
					}
				}
			}
		}
	}
}
