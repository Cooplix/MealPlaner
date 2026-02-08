#!/usr/bin/env bash
set -euo pipefail

PY_URL="${PY_URL:-http://localhost:8000}"
JAVA_URL="${JAVA_URL:-http://localhost:8001}"
ADMIN_LOGIN="${ADMIN_LOGIN:-admin}"
ADMIN_PASSWORD="${ADMIN_INITIAL_PASSWORD:-ChangeMeNow123!}"

request_json() {
  local url=$1
  local path=$2
  curl -sS -w "\n%{http_code}" -H "Content-Type: application/json" "$url$path"
}

post_json() {
  local url=$1
  local path=$2
  local data=$3
  curl -sS -w "\n%{http_code}" -H "Content-Type: application/json" -d "$data" "$url$path"
}

extract_body() {
  sed '$d'
}

extract_code() {
  tail -n 1
}

health_check() {
  local url=$1
  local result
  result=$(request_json "$url" "/api/health")
  local code body
  code=$(printf "%s" "$result" | extract_code)
  body=$(printf "%s" "$result" | extract_body)
  printf "%s %s %s\n" "$url" "$code" "$(echo -n "$body" | wc -c | tr -d ' ')"
}

login_token() {
  local url=$1
  local result token code body
  result=$(post_json "$url" "/api/auth/login" "{\"login\":\"$ADMIN_LOGIN\",\"password\":\"$ADMIN_PASSWORD\"}")
  code=$(printf "%s" "$result" | extract_code)
  body=$(printf "%s" "$result" | extract_body)
  if [[ "$code" != "200" ]]; then
    echo ""
    return
  fi
  token=$(printf "%s" "$body" | sed -n 's/.*"access_token"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
  echo "$token"
}

get_authed() {
  local url=$1
  local token=$2
  local path=$3
  curl -sS -w "\n%{http_code}" -H "Authorization: Bearer $token" "$url$path"
}

compare_authed() {
  local path=$1
  local py_token=$2
  local java_token=$3
  local py_result java_result py_code java_code py_size java_size
  py_result=$(get_authed "$PY_URL" "$py_token" "$path")
  java_result=$(get_authed "$JAVA_URL" "$java_token" "$path")
  py_code=$(printf "%s" "$py_result" | extract_code)
  java_code=$(printf "%s" "$java_result" | extract_code)
  py_size=$(printf "%s" "$py_result" | extract_body | wc -c | tr -d ' ')
  java_size=$(printf "%s" "$java_result" | extract_body | wc -c | tr -d ' ')
  printf "%s %s/%s %s/%s\n" "$path" "$py_code" "$java_code" "$py_size" "$java_size"
}

echo "health" && health_check "$PY_URL" && health_check "$JAVA_URL"

echo "login"
PY_TOKEN=$(login_token "$PY_URL")
JAVA_TOKEN=$(login_token "$JAVA_URL")
if [[ -z "$PY_TOKEN" || -z "$JAVA_TOKEN" ]]; then
  echo "Login failed on one of the services. Ensure admin credentials are configured."
  exit 1
fi

compare_authed "/api/ingredients" "$PY_TOKEN" "$JAVA_TOKEN"
compare_authed "/api/dishes" "$PY_TOKEN" "$JAVA_TOKEN"
compare_authed "/api/plans" "$PY_TOKEN" "$JAVA_TOKEN"
compare_authed "/api/shopping-list?start=2024-01-01&end=2024-01-07" "$PY_TOKEN" "$JAVA_TOKEN"
compare_authed "/api/calories" "$PY_TOKEN" "$JAVA_TOKEN"
compare_authed "/api/purchases" "$PY_TOKEN" "$JAVA_TOKEN"
