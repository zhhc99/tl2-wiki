#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
node "$project_dir/scripts/import-tl2-db.mjs" "$project_dir/database"
node "$project_dir/scripts/validate-data.mjs"
