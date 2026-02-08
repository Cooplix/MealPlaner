#!/usr/bin/env bash
set -euo pipefail

PY_BASE="${PY_BASE:-http://localhost:8000}"
JAVA_BASE="${JAVA_BASE:-http://localhost:8001}"
ADMIN_LOGIN="${ADMIN_LOGIN:-}"
ADMIN_INITIAL_PASSWORD="${ADMIN_INITIAL_PASSWORD:-}"

if [[ -z "$ADMIN_LOGIN" || -z "$ADMIN_INITIAL_PASSWORD" ]]; then
  echo "ADMIN_LOGIN and ADMIN_INITIAL_PASSWORD must be set" >&2
  exit 1
fi

login() {
  local base="$1"
  local payload="{\"login\":\"${ADMIN_LOGIN}\",\"password\":\"${ADMIN_INITIAL_PASSWORD}\"}"
  local resp
  resp=$(curl -sS -X POST "$base/api/auth/login" -H "Content-Type: application/json" -d "$payload")
  if [[ -n "$resp" && "$resp" != *"Not Found"* ]]; then
    echo "$resp"
    return 0
  fi
  curl -sS -X POST "$base/api/login" -H "Content-Type: application/json" -d "$payload"
}

extract_token() {
  python3 -c 'import json,sys; payload=json.load(sys.stdin); \
  print(next((payload.get(k) for k in ("access_token","token","jwt") if k in payload), ""))'
}

fetch_json() {
  local base="$1"
  local token="$2"
  local path="$3"
  curl -sS -L "$base$path" -H "Authorization: Bearer $token"
}

compare_json() {
  local left="$1"
  local right="$2"
  local label="$3"
  python3 - <<PY
import json,sys
left_path="$left"
right_path="$right"
label="$label"

def load(path):
  with open(path,"r",encoding="utf-8") as f:
    return json.load(f)

def index_items(items):
  if not isinstance(items,list):
    return {}, None
  key=None
  for candidate in ("id","_id"):
    if items and isinstance(items[0],dict) and candidate in items[0]:
      key=candidate
      break
  if key is None:
    return {}, None
  indexed={str(item.get(key)): item for item in items if isinstance(item,dict) and item.get(key) is not None}
  return indexed, key

def diff_dict(a,b,prefix=""):
  diffs=[]
  if not isinstance(a,dict) or not isinstance(b,dict):
    if a!=b:
      diffs.append((prefix,a,b))
    return diffs
  keys=sorted(set(a.keys())|set(b.keys()))
  for k in keys:
    pa=f"{prefix}.{k}" if prefix else k
    if k not in a:
      diffs.append((pa,None,b[k]))
    elif k not in b:
      diffs.append((pa,a[k],None))
    else:
      av=a[k]; bv=b[k]
      if isinstance(av,dict) and isinstance(bv,dict):
        diffs.extend(diff_dict(av,bv,pa))
      elif isinstance(av,list) and isinstance(bv,list):
        if av!=bv:
          diffs.append((pa,av,bv))
      elif av!=bv:
        diffs.append((pa,av,bv))
  return diffs

left=load(left_path)
right=load(right_path)

print(f"== {label} ==")
print(f"left type: {type(left).__name__}, right type: {type(right).__name__}")
if isinstance(left,list) and isinstance(right,list):
  print(f"left len: {len(left)}, right len: {len(right)}")
  lidx, lkey = index_items(left)
  ridx, rkey = index_items(right)
  if lkey and rkey:
    missing = sorted(set(lidx.keys()) - set(ridx.keys()))
    extra = sorted(set(ridx.keys()) - set(lidx.keys()))
    print(f"id key: {lkey}")
    print(f"missing ids in right: {len(missing)}")
    print(f"extra ids in right: {len(extra)}")
    if missing[:5]:
      print("missing sample:", missing[:5])
    if extra[:5]:
      print("extra sample:", extra[:5])
    common = [k for k in lidx.keys() if k in ridx]
    mismatch=0
    for k in common:
      diffs=diff_dict(lidx[k], ridx[k])
      if diffs:
        mismatch+=1
        if mismatch<=5:
          path, a, b = diffs[0]
          print(f"diff sample id={k} field={path} left={a} right={b}")
    print(f"items with diffs: {mismatch}")
  else:
    print("no stable id field detected; list diff skipped")
else:
  diffs=diff_dict(left,right)
  print(f"top-level diffs: {len(diffs)}")
  for d in diffs[:5]:
    print("diff", d)
PY
}

mkdir -p /tmp/dual-run-diff

py_login=$(login "$PY_BASE")
java_login=$(login "$JAVA_BASE")
py_token=$(printf "%s" "$py_login" | extract_token)
java_token=$(printf "%s" "$java_login" | extract_token)

if [[ -z "$py_token" || -z "$java_token" ]]; then
  echo "Failed to obtain tokens" >&2
  echo "python login response: $py_login" >&2
  echo "java login response: $java_login" >&2
  exit 1
fi

for path in /api/dishes /api/purchases; do
  py_file="/tmp/dual-run-diff/python${path//\//_}.json"
  java_file="/tmp/dual-run-diff/java${path//\//_}.json"
  fetch_json "$PY_BASE" "$py_token" "$path" > "$py_file"
  fetch_json "$JAVA_BASE" "$java_token" "$path" > "$java_file"
  compare_json "$py_file" "$java_file" "$path"
  echo ""
done
