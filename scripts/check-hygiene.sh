#!/usr/bin/env sh
set -eu

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

if git grep -nE 'console\.(log|debug)\(|fmt\.Print(f|ln)?\(' -- apps ':!apps/api/docs'; then
  echo "Debug output is not allowed in application code."
  exit 1
fi
