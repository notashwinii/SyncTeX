package workspaceQueries

const CreateInvitation = `
INSERT INTO workspace_invitations (workspace_id, email, role, token, invited_by, status, expires_at)
VALUES ($1, $2, $3, $4, $5, 'pending', now() + INTERVAL '7 days')
RETURNING id, workspace_id, email, role, token, invited_by, status, created_at, expires_at
`

const GetInvitationByToken = `
SELECT id, workspace_id, email, role, token, invited_by, status, created_at, expires_at, accepted_at
FROM workspace_invitations
WHERE token = $1
`

const ListWorkspaceInvitations = `
SELECT id, workspace_id, email, role, invited_by, status, created_at, expires_at, accepted_at
FROM workspace_invitations
WHERE workspace_id = $1
ORDER BY created_at DESC
`

const ListPendingInvitationsByEmail = `
SELECT id, workspace_id, email, role, token, invited_by, status, created_at, expires_at
FROM workspace_invitations
WHERE email = $1 AND status = 'pending' AND expires_at > now()
ORDER BY created_at DESC
`

const UpdateInvitationStatus = `
UPDATE workspace_invitations
SET status = $1, accepted_at = CASE WHEN $1 = 'accepted' THEN now() ELSE NULL END
WHERE id = $2
RETURNING id, workspace_id, email, role, invited_by, status, created_at, expires_at, accepted_at
`

const DeleteInvitation = `
DELETE FROM workspace_invitations
WHERE id = $1 AND invited_by = $2
`

const CheckPendingInvitation = `
SELECT COUNT(*) FROM workspace_invitations
WHERE workspace_id = $1 AND email = $2 AND status = 'pending' AND expires_at > now()
`
