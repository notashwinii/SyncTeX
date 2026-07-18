-- name: UserCanAccessProject :one
SELECT EXISTS (
    SELECT 1
    FROM workspace_members AS member
    JOIN projects AS project ON project.workspace_id = member.workspace_id
    WHERE project.id = sqlc.arg(project_id)::text::uuid
      AND member.user_id = sqlc.arg(user_id)::text::uuid
);
