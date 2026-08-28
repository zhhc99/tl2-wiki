#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cache_dir="$project_dir/.cache/tl2-data"
archive="$cache_dir/tl2db_base.db.7z"
database="$cache_dir/tl2db_base.db"
tidbi_archive="$cache_dir/tidbi-eng-v1.05.zip"
tidbi_dir="$cache_dir/tidbi"
tidbi_database="$tidbi_dir/TIDBI-eng v1/base.mdb"

mkdir -p "$cache_dir"
curl -L "https://raw.githubusercontent.com/Awkward-im/Torchlight/master/tl2db_base.db.7z" -o "$archive"
7z x -y "$archive" "-o$cache_dir"
curl -L "http://www.dethguild.com/wp-content/uploads/files/torchlight/TIDBI-eng%20v1.05.zip" -o "$tidbi_archive"
7z x -y "$tidbi_archive" "-o$tidbi_dir"
node "$project_dir/scripts/import-tl2-db.mjs" "$database" "$tidbi_database"
