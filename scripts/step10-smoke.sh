#!/usr/bin/env bash
set -euo pipefail

API_BASE="${API_BASE:-http://localhost:8000/api}"
ADMIN_LOGIN="${ADMIN_LOGIN:-admin}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-ChangeMeNow123!}"
SMOKE_DATE="${SMOKE_DATE:-2099-12-31}"

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required" >&2
  exit 1
fi
if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required" >&2
  exit 1
fi

login_payload=$(printf '{"login":"%s","password":"%s"}' "$ADMIN_LOGIN" "$ADMIN_PASSWORD")
login_response=$(curl -sSf -X POST "$API_BASE/auth/login" -H 'Content-Type: application/json' -d "$login_payload")
TOKEN=$(echo "$login_response" | python3 -c 'import sys,json; print(json.load(sys.stdin)["access_token"])')

now_stamp=$(date -u +"%Y%m%d%H%M%S")
ingredient_name="Smoke Test Ingredient ${now_stamp}"
dish_name="Smoke Test Dish ${now_stamp}"
purchased_at=$(date -u +"%Y-%m-%dT%H:%M:%S")

ingredient_payload=$(printf '{"name":"%s","unit":"g","translations":{}}' "$ingredient_name")
ingredient_response=$(curl -sSf -X POST "$API_BASE/ingredients" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d "$ingredient_payload")
ingredient_key=$(echo "$ingredient_response" | python3 -c 'import sys,json; print(json.load(sys.stdin)["key"])')

dish_payload=$(cat <<JSON
{
  "name": "${dish_name}",
  "meal": "dinner",
  "notes": "smoke test",
  "ingredients": [
    {
      "ingredientKey": "${ingredient_key}",
      "name": "${ingredient_name}",
      "unit": "g",
      "qty": 100
    }
  ]
}
JSON
)

dish_response=$(curl -sSf -X POST "$API_BASE/dishes" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d "$dish_payload")
dish_id=$(echo "$dish_response" | python3 -c 'import sys,json; print(json.load(sys.stdin)["id"])')

plan_payload=$(cat <<JSON
{
  "dateISO": "${SMOKE_DATE}",
  "slots": {
    "dinner": "${dish_id}"
  }
}
JSON
)

curl -sSf -X PUT "$API_BASE/plans/${SMOKE_DATE}" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d "$plan_payload" >/dev/null

shopping_response=$(curl -sSf "$API_BASE/shopping-list?start=${SMOKE_DATE}&end=${SMOKE_DATE}" -H "Authorization: Bearer $TOKEN")
shopping_count=$(echo "$shopping_response" | python3 -c 'import sys,json; print(len(json.load(sys.stdin).get("items", [])))')

purchase_payload=$(cat <<JSON
{
  "ingredientKey": "${ingredient_key}",
  "amount": 200,
  "unit": "g",
  "price": 9.99,
  "purchasedAt": "${purchased_at}",
  "applyToInventory": true,
  "location": "Комора"
}
JSON
)

purchase_response=$(curl -sSf -X POST "$API_BASE/purchases" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d "$purchase_payload")
purchase_id=$(echo "$purchase_response" | python3 -c 'import sys,json; print(json.load(sys.stdin)["id"])')

inventory_response=$(curl -sSf "$API_BASE/inventory" -H "Authorization: Bearer $TOKEN")
cat > /tmp/step10_inventory.json <<JSON
$inventory_response
JSON
inventory_item_id=$(python3 - <<PY
import json
with open('/tmp/step10_inventory.json','r',encoding='utf-8') as f:
    items = json.load(f)
for item in items:
    if item.get('ingredientKey') == "${ingredient_key}":
        print(item.get('id') or '')
        break
PY
)

spending_response=$(curl -sSf "$API_BASE/analytics/spending" -H "Authorization: Bearer $TOKEN")
echo "$spending_response" | python3 -c 'import sys,json; json.load(sys.stdin); print("spending ok")' >/dev/null

costs_response=$(curl -sSf "$API_BASE/analytics/dish-costs" -H "Authorization: Bearer $TOKEN")
echo "$costs_response" | python3 -c 'import sys,json; json.load(sys.stdin); print("dish costs ok")' >/dev/null

curl -sSf -X DELETE "$API_BASE/plans/${SMOKE_DATE}" -H "Authorization: Bearer $TOKEN" >/dev/null
curl -sSf -X DELETE "$API_BASE/dishes/${dish_id}" -H "Authorization: Bearer $TOKEN" >/dev/null
if [ -n "${inventory_item_id}" ]; then
  curl -sSf -X DELETE "$API_BASE/inventory/${inventory_item_id}" -H "Authorization: Bearer $TOKEN" >/dev/null
fi

cat <<SUMMARY
Step 10 smoke completed.
- ingredientKey: ${ingredient_key}
- dishId: ${dish_id}
- purchaseId: ${purchase_id}
- shoppingItems: ${shopping_count}
- inventoryItemDeleted: $(if [ -n "${inventory_item_id}" ]; then echo yes; else echo no; fi)
SUMMARY
