#!/usr/bin/env bash

set -euo pipefail

LAND_REGISTRY_ENDPOINT="${LAND_REGISTRY_ENDPOINT:-https://landregistry.data.gov.uk/landregistry/query}"

die() {
  local message="$1"
  local code="${2:-1}"
  echo "Error: ${message}" >&2
  exit "${code}"
}

require_cmd() {
  local cmd="$1"
  command -v "$cmd" >/dev/null 2>&1 || die "Missing dependency: ${cmd}" 10
}
