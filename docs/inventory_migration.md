# Inventory Excel -> DB migration

## Source
- File: `inventory_system.xlsx`
- Sheet: `Inventory`
- The sheet contains two tables in one row: old (left, columns A–F) and new (right, columns G–O).
- Old and new tables contain the same items; the new table is already normalized.
- No cat food data is present in this file.

## What was verified in the sheet
- Total items: 59
- Categories (9):
  - Крупи/хліб/борошно: 14
  - Соуси/спеції/консервація: 13
  - Овочі/фрукти: 9
  - Молочне: 7
  - Солодке: 6
  - Білок: 4
  - Жири/олії: 3
  - Заморожене: 2
  - Інше: 1
- Locations (3):
  - Комора: 37
  - Холодильник: 20
  - Морозилка: 2
- Status values in the sheet (derived): `—`, `OK`, `<=14d`, `<=30d`, `<=60d`, `<=120d`

## Column mapping to DB (`inventory_items`)

Use the **new table** (columns G–O) as the source of truth. Old table is only used for quantity/unit if missing.

- `Назва` (old A) -> `name`
- `Назва (база)` (new G) -> `base_name`
- `Категорія` (new H) -> `category`
- `Локація` (new I) -> `location`
- `Одиниці вимірювання` (old C) -> `unit`
- `Кількість` (old D) -> `quantity`
- `MIN` (new J) -> `min_qty`
- `MAX` (new K) -> `max_qty`
- `Дата придатності` (new M) -> `expires_at`
- `Уваги до зберігання` (old F) -> `notes`
- `Днів до` (new N) and `Статус` (new O) are derived and should **not** be stored.
- `До купівлі` (new L) is derived from min/max/quantity and should **not** be stored.

## Date parsing
- Prefer `Дата придатності` (new column M). It is already a proper date in the sheet for rows with expiry.
- If a row has no new-date value, keep `expires_at = null`.
- Old column E has mixed formats (`dd.mm.yy`, `mm.yyyy`, or empty). Since the data is duplicated, it is safe to ignore old dates and use column M only.

## Required DB fields
- `user_id` must be set for every item. Use the target user (see auto migration options below).
- `added_at` can be set to migration timestamp.

## Auto migration options

### Option A: Script + API (recommended)
1. Create a script (e.g. `scripts/migrate-inventory-xlsx.py`) that reads the sheet and produces payloads for `/api/inventory`.
2. Authenticate with the API (login) and reuse the access token.
3. POST each item to `/api/inventory` with the mapped fields.

Pros: respects validation and user scoping, no direct DB access needed.

### Option B: Script + direct Mongo insert
1. Read the sheet and map fields into Mongo documents.
2. Insert into `inventory_items` with `user_id`, `added_at`, `expires_at`.

Pros: faster; Cons: bypasses API validations and would need DB access credentials.

## Suggested script inputs
- `--xlsx /opt/MealPlaner/inventory_system.xlsx`
- `--user-id <user_id>` or `--email <login>` (resolve to user id)
- `--base-url http://raspberrypi.local/mealplanner` (for API)
- `--dry-run` to inspect payloads before insert

