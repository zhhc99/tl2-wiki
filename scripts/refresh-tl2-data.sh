#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
(cd "$project_dir/db" && PYTHONPATH=src python3 -m tl2db verify)
node "$project_dir/scripts/import-tl2-db.mjs"
node "$project_dir/scripts/generate-derived-data.mjs"
node "$project_dir/scripts/validate-data.mjs"
