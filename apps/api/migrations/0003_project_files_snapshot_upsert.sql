-- +goose Up
-- project_files was referenced by the storage handlers/queries but never had a
-- migration; fresh databases broke on first upload. Schema matches the columns
-- used by projectQueries.InsertProjectFile / GetProjectFiles.
CREATE TABLE IF NOT EXISTS project_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_type VARCHAR(32) NOT NULL,
  filename TEXT NOT NULL,
  object_key TEXT NOT NULL,
  content_type TEXT,
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_project_files_project ON project_files(project_id);

-- Snapshots were documented as "latest-only" but the query was a plain INSERT,
-- growing one row per save forever. Keep only the newest row per project, then
-- enforce one-row-per-project so the query can be a true UPSERT.
DELETE FROM snapshots s
USING snapshots newer
WHERE s.project_id = newer.project_id
  AND (s.created_at, s.id) < (newer.created_at, newer.id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_snapshots_project_unique ON snapshots(project_id);
DROP INDEX IF EXISTS idx_snapshots_project;

-- +goose Down
DROP INDEX IF EXISTS idx_snapshots_project_unique;
CREATE INDEX IF NOT EXISTS idx_snapshots_project ON snapshots(project_id);
DROP TABLE IF EXISTS project_files;
