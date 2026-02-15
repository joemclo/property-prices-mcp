#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "${SCRIPT_DIR}/common.sh"

usage() {
  cat <<'EOF'
Usage:
  nearby_postcodes.sh --postcode "CT2 8ET" [options]
  nearby_postcodes.sh --easting 615000 --northing 157000 [options]

Options:
  --postcode <value>         Center postcode
  --easting <value>          Center easting
  --northing <value>         Center northing
  --radius-meters <value>    Search radius in meters (default: 5000)
  --limit <value>            Max results (default: 10)
  --include-self             Include center postcode in results
  --admin-district <value>   Filter by admin district code
  --db-path <path>           Override DB path (default: ./data/postcodes.sqlite)
  -h, --help                 Show this help

Output JSON shape:
  {
    "center": {...},
    "postcodes": [...],
    "total": 123
  }
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

main() {
  require_cmd sqlite3
  require_cmd jq

  local postcode=""
  local easting=""
  local northing=""
  local radius="5000"
  local limit="10"
  local include_self="false"
  local admin_district=""
  local db_path="${POSTCODE_DB_PATH:-$(pwd)/data/postcodes.sqlite}"

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --postcode)
        postcode="${2:-}"
        shift 2
        ;;
      --easting)
        easting="${2:-}"
        shift 2
        ;;
      --northing)
        northing="${2:-}"
        shift 2
        ;;
      --radius-meters)
        radius="${2:-}"
        shift 2
        ;;
      --limit)
        limit="${2:-}"
        shift 2
        ;;
      --include-self)
        include_self="true"
        shift
        ;;
      --admin-district)
        admin_district="${2:-}"
        shift 2
        ;;
      --db-path)
        db_path="${2:-}"
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

  [[ -f "$db_path" ]] || die "Postcode database not found at ${db_path}. Run npm run build:postcodes" 3

  if [[ -n "$postcode" ]]; then
    postcode="$(normalize_postcode "$postcode")"
  fi

  if [[ -n "$postcode" ]]; then
    local center_row
    center_row="$(sqlite3 -separator $'\t' "$db_path" "
      SELECT postcode, easting, northing, positional_quality, country_code, admin_district_code
      FROM postcodes
      WHERE postcode = '${postcode//\'/\'\'}'
      LIMIT 1;
    ")"

    [[ -n "$center_row" ]] || die "Postcode not found in DB: ${postcode}" 4

    IFS=$'\t' read -r postcode easting northing center_pq center_cc center_ad <<<"$center_row"
  else
    [[ -n "$easting" && -n "$northing" ]] || die "Provide --postcode or both --easting and --northing" 2
    local center_pq="0"
    local center_cc=""
    local center_ad=""
  fi

  local min_x max_x min_y max_y
  min_x=$(awk -v e="$easting" -v r="$radius" 'BEGIN { print e-r }')
  max_x=$(awk -v e="$easting" -v r="$radius" 'BEGIN { print e+r }')
  min_y=$(awk -v n="$northing" -v r="$radius" 'BEGIN { print n-r }')
  max_y=$(awk -v n="$northing" -v r="$radius" 'BEGIN { print n+r }')

  local admin_clause=""
  if [[ -n "$admin_district" ]]; then
    admin_clause=" AND p.admin_district_code = '${admin_district//\'/\'\'}'"
  fi

  local self_clause=""
  if [[ "$include_self" != "true" && -n "$postcode" ]]; then
    self_clause=" AND p.postcode != '${postcode//\'/\'\'}'"
  fi

  local distance_expr
  distance_expr="sqrt((p.easting - ${easting}) * (p.easting - ${easting}) + (p.northing - ${northing}) * (p.northing - ${northing}))"

  local base_where
  base_where="
    r.maxX >= ${min_x} AND r.minX <= ${max_x}
    AND r.maxY >= ${min_y} AND r.minY <= ${max_y}
    ${admin_clause}
    ${self_clause}
    AND ${distance_expr} <= ${radius}
  "

  local total
  total="$(sqlite3 "$db_path" "
    SELECT COUNT(*)
    FROM postcodes_rtree r
    JOIN postcodes p ON p.rowid = r.id
    WHERE ${base_where};
  ")"

  local rows
  rows="$(sqlite3 -separator $'\t' "$db_path" "
    SELECT p.postcode, p.easting, p.northing, p.positional_quality, p.country_code, p.admin_district_code,
           ${distance_expr} AS distance_meters
    FROM postcodes_rtree r
    JOIN postcodes p ON p.rowid = r.id
    WHERE ${base_where}
    ORDER BY distance_meters ASC
    LIMIT ${limit};
  ")"

  local postcodes_json
  if [[ -z "$rows" ]]; then
    postcodes_json='[]'
  else
    postcodes_json="$(printf '%s\n' "$rows" | jq -R -s '
      split("\n")
      | map(select(length > 0))
      | map(split("\t"))
      | map({
          postcode: .[0],
          easting: (.[1] | tonumber),
          northing: (.[2] | tonumber),
          positionalQuality: (.[3] | tonumber),
          countryCode: .[4],
          adminDistrictCode: .[5],
          distanceMeters: (.[6] | tonumber)
        })
    ')"
  fi

  jq -n \
    --arg postcode "$postcode" \
    --argjson easting "$easting" \
    --argjson northing "$northing" \
    --argjson positionalQuality "${center_pq:-0}" \
    --arg countryCode "${center_cc:-}" \
    --arg adminDistrictCode "${center_ad:-}" \
    --argjson postcodes "$postcodes_json" \
    --argjson total "${total:-0}" \
    '{
      center: {
        postcode: $postcode,
        easting: $easting,
        northing: $northing,
        positionalQuality: $positionalQuality,
        countryCode: $countryCode,
        adminDistrictCode: $adminDistrictCode
      },
      postcodes: $postcodes,
      total: $total
    }'
}

main "$@"
