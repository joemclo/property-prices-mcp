#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "${SCRIPT_DIR}/common.sh"

usage() {
  cat <<'EOF'
Usage:
  query_raw.sh --query "<SPARQL>" [--timeout 30]
  query_raw.sh --query-file <path.rq> [--timeout 30]

Options:
  --query        Raw SPARQL query string
  --query-file   Path to file containing SPARQL query
  --timeout      Request timeout in seconds (default: 30)
  -h, --help     Show this help
EOF
}

main() {
  require_cmd curl

  local query=""
  local query_file=""
  local timeout="30"

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --query)
        query="${2:-}"
        shift 2
        ;;
      --query-file)
        query_file="${2:-}"
        shift 2
        ;;
      --timeout)
        timeout="${2:-}"
        shift 2
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        usage
        die "Unknown argument: $1" 2
        ;;
    esac
  done

  if [[ -n "$query" && -n "$query_file" ]]; then
    die "Use either --query or --query-file, not both" 2
  fi

  if [[ -z "$query" && -z "$query_file" ]]; then
    die "You must provide --query or --query-file" 2
  fi

  if [[ -n "$query_file" ]]; then
    [[ -f "$query_file" ]] || die "Query file not found: ${query_file}" 2
    query="$(<"$query_file")"
  fi

  curl --silent --show-error --fail-with-body \
    --max-time "$timeout" \
    --request POST "$LAND_REGISTRY_ENDPOINT" \
    --header "Content-Type: application/x-www-form-urlencoded" \
    --header "Accept: application/sparql-results+json" \
    --data-urlencode "query=${query}"
}

main "$@"
