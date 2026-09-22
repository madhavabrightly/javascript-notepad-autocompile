#!/usr/bin/env bash
# Rebuilds the portable exe from the chunked parts committed under release/.
set -euo pipefail

parts_dir="${1:-release}"
output="${2:-JavaScript Notepad 1.0.0.exe}"

parts=("$parts_dir"/*.part-*)
if [ ! -e "${parts[0]}" ]; then
  echo "No chunks found in $parts_dir" >&2
  exit 1
fi

cat "$parts_dir"/*.part-* > "$output"
echo "done: $output"
