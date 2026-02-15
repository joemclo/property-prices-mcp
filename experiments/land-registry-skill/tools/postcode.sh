#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "${SCRIPT_DIR}/common.sh"

usage() {
  cat <<'EOF'
Usage:
  postcode.sh normalize "<postcode>"
  postcode.sh validate "<postcode>"

Commands:
  normalize   Trim, uppercase, and normalize spacing (e.g. "ct28et" -> "CT2 8ET")
  validate    Validate full UK postcode format (strict)
EOF
}

normalize_postcode() {
  local raw="$1"
  local compact

  compact="$(echo "$raw" | tr -d '[:space:]' | tr '[:lower:]' '[:upper:]')"
  if [[ ${#compact} -le 3 ]]; then
    echo "$compact"
    return 0
  fi

  echo "${compact:0:${#compact}-3} ${compact: -3}"
}

is_valid_postcode() {
  local candidate="$1"
  [[ "$candidate" =~ ^(GIR\ 0AA|[A-PR-UWYZ][A-HK-Y]?[0-9][0-9A-HJKSTUW]?\ [0-9][ABD-HJLNP-UW-Z]{2})$ ]]
}

main() {
  if [[ $# -lt 2 ]]; then
    usage
    exit 2
  fi

  local cmd="$1"
  local input="$2"
  local normalized
  normalized="$(normalize_postcode "$input")"

  case "$cmd" in
    normalize)
      echo "$normalized"
      ;;
    validate)
      if is_valid_postcode "$normalized"; then
        echo "$normalized"
      else
        die "Invalid UK postcode format: ${input}" 3
      fi
      ;;
    -h|--help|help)
      usage
      ;;
    *)
      usage
      die "Unknown command: ${cmd}" 2
      ;;
  esac
}

main "$@"
