package emailServices

import (
	"bytes"
	"fmt"
	"html/template"
	"net/smtp"
	"os"
)

type EmailService struct {
	SMTPHost string
	SMTPPort string
	SMTPUser string
	SMTPPass string
	FromName string
}

func NewEmailService() *EmailService {
	return &EmailService{
		SMTPHost: os.Getenv("SMTP_HOST"),
		SMTPPort: os.Getenv("SMTP_PORT"),
		SMTPUser: os.Getenv("SMTP_USER"),
		SMTPPass: os.Getenv("SMTP_PASS"),
		FromName: "SyncTeX",
	}
}

// IsConfigured checks if SMTP is properly configured
func (e *EmailService) IsConfigured() bool {
	return e.SMTPHost != "" && e.SMTPPort != "" && e.SMTPUser != "" && e.SMTPPass != ""
}

// SendEmail sends an email using SMTP
func (e *EmailService) SendEmail(to, subject, htmlBody string) error {
	if !e.IsConfigured() {
		return fmt.Errorf("SMTP not configured")
	}

	from := fmt.Sprintf("%s <%s>", e.FromName, e.SMTPUser)

	// Build email headers and body
	msg := []byte(fmt.Sprintf(
		"From: %s\r\n"+
			"To: %s\r\n"+
			"Subject: %s\r\n"+
			"MIME-Version: 1.0\r\n"+
			"Content-Type: text/html; charset=UTF-8\r\n"+
			"\r\n"+
			"%s",
		from, to, subject, htmlBody,
	))

	// Set up authentication
	auth := smtp.PlainAuth("", e.SMTPUser, e.SMTPPass, e.SMTPHost)

	// Send email
	addr := fmt.Sprintf("%s:%s", e.SMTPHost, e.SMTPPort)
	err := smtp.SendMail(addr, auth, e.SMTPUser, []string{to}, msg)
	if err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}

	return nil
}

// InvitationEmailData contains data for invitation email template
type InvitationEmailData struct {
	InviterName   string
	WorkspaceName string
	Role          string
	InvitationURL string
	ExpiresIn     string
}

// SendInvitationEmail sends a workspace invitation email
func (e *EmailService) SendInvitationEmail(to string, data InvitationEmailData) error {
	subject := fmt.Sprintf("You've been invited to join %s on SyncTeX", data.WorkspaceName)

	htmlTemplate := `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f5f5;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 40px auto;
            background: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
        }
        .content {
            padding: 40px 30px;
        }
        .content p {
            margin: 0 0 20px;
            font-size: 16px;
        }
        .invitation-details {
            background: #f8f9fa;
            border-left: 4px solid #667eea;
            padding: 20px;
            margin: 30px 0;
            border-radius: 4px;
        }
        .invitation-details p {
            margin: 10px 0;
        }
        .invitation-details strong {
            color: #667eea;
        }
        .button-container {
            text-align: center;
            margin: 40px 0;
        }
        .button {
            display: inline-block;
            padding: 14px 32px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            font-size: 16px;
            transition: transform 0.2s;
        }
        .button:hover {
            transform: translateY(-2px);
        }
        .footer {
            background: #f8f9fa;
            padding: 30px;
            text-align: center;
            color: #6c757d;
            font-size: 14px;
            border-top: 1px solid #e9ecef;
        }
        .footer p {
            margin: 5px 0;
        }
        .expiry-notice {
            color: #dc3545;
            font-size: 14px;
            text-align: center;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Workspace Invitation</h1>
        </div>
        <div class="content">
            <p>Hi there,</p>
            <p><strong>{{.InviterName}}</strong> has invited you to join the workspace <strong>{{.WorkspaceName}}</strong> on SyncTeX!</p>
            
            <div class="invitation-details">
                <p><strong>Workspace:</strong> {{.WorkspaceName}}</p>
                <p><strong>Role:</strong> {{.Role}}</p>
                <p><strong>Invited by:</strong> {{.InviterName}}</p>
            </div>

            <p>SyncTeX is a collaborative LaTeX editor that lets you work together in real-time. By accepting this invitation, you'll be able to collaborate on LaTeX documents with your team.</p>

            <div class="button-container">
                <a href="{{.InvitationURL}}" class="button">Accept Invitation</a>
            </div>

            <p class="expiry-notice">⚠️ This invitation expires in {{.ExpiresIn}}</p>

            <p style="margin-top: 40px; font-size: 14px; color: #6c757d;">
                If you don't want to accept this invitation, you can safely ignore this email.
            </p>
        </div>
        <div class="footer">
            <p><strong>SyncTeX</strong></p>
            <p>Collaborative LaTeX Editor</p>
            <p style="margin-top: 20px;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="{{.InvitationURL}}" style="color: #667eea; word-break: break-all;">{{.InvitationURL}}</a>
            </p>
        </div>
    </div>
</body>
</html>
`

	tmpl, err := template.New("invitation").Parse(htmlTemplate)
	if err != nil {
		return fmt.Errorf("failed to parse email template: %w", err)
	}

	var body bytes.Buffer
	if err := tmpl.Execute(&body, data); err != nil {
		return fmt.Errorf("failed to execute email template: %w", err)
	}

	return e.SendEmail(to, subject, body.String())
}
