package downloadservices

import (
	"fmt"
	"log"
	"strings"

	"github.com/rwestlund/gotex"
)

func ReturnPdf(content string) ([]byte, error) {
	if !strings.Contains(content, "\\documentclass") {
		return nil, fmt.Errorf("invalid LaTeX: missing \\documentclass")
	}
	if !strings.Contains(content, "\\begin{document}") {
		return nil, fmt.Errorf("invalid LaTeX: missing \\begin{document}")
	}
	if !strings.Contains(content, "\\end{document}") {
		return nil, fmt.Errorf("invalid LaTeX: missing \\end{document}")
	}

	var pdf, err = gotex.Render(content, gotex.Options{
		Command: "pdflatex", // Use system pdflatex on Linux
		Runs:    2,
	})
	if err != nil {
		log.Printf("LaTeX compilation error: %v", err)

		// Extract more readable error message
		errorMsg := err.Error()
		if strings.Contains(errorMsg, "LaTeX error") {
			return nil, fmt.Errorf("LaTeX compilation failed. Please check your document for syntax errors like missing braces, invalid commands, or duplicate content")
		}

		return nil, fmt.Errorf("PDF generation failed: %v", err)
	}

	return pdf, nil
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
