package storage

import (
	"strings"
)

type FileNode struct {
	ID       string      `json:"id,omitempty"`
	Name     string      `json:"name"`
	Type     string      `json:"type"` // "file" | "directory"
	Children []*FileNode `json:"children,omitempty"`
}

func BuildFileTree(files []FileMetadata) *FileNode {
	root := &FileNode{
		Name: "/",
		Type: "directory",
	}

	for _, file := range files {
		// choose one:
		path := file.Filename
		// OR: path := file.ObjectKey

		parts := strings.Split(path, "/")
		insertPath(root, parts, file.ID)
	}

	return root
}

func insertPath(node *FileNode, parts []string, fileID string) {
	if len(parts) == 0 {
		return
	}

	part := parts[0]

	// last part → file
	if len(parts) == 1 {
		node.Children = append(node.Children, &FileNode{
			ID:   fileID,
			Name: part,
			Type: "file",
		})
		return
	}

	// directory
	var dir *FileNode
	for _, c := range node.Children {
		if c.Name == part && c.Type == "directory" {
			dir = c
			break
		}
	}

	if dir == nil {
		dir = &FileNode{
			Name: part,
			Type: "directory",
		}
		node.Children = append(node.Children, dir)
	}

	insertPath(dir, parts[1:], fileID)
}
