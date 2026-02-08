# План додавання OCR/ШІ для чеків і автододавання покупок

Дата: 2026-02-08

## 1. Мета
Додати в MealPlaner сценарій:
1. Завантажити фото/скан чека.
2. Автоматично розпізнати позиції (OCR + парсинг).
3. Автоматично зіставити позиції з товарами в базі (`ingredientKey`).
4. Якщо позиція не зіставлена, запитати користувача: вибрати існуючий товар або створити новий.
5. Запам'ятати зіставлення (alias), щоб наступного разу працювало без ручного втручання.
6. Зберігати магазин покупки.

Приклад: `pomCzer` -> користувач лінкує з `Помідор червоний` -> система зберігає alias і надалі розпізнає автоматично.

## 2. Поточний стан (база для інтеграції)
- Є модуль `purchases` і API `/api/purchases`.
- У поточній моделі `PurchaseDocument` немає поля магазину.
- Є довідник інгредієнтів (`ingredients`) з `ingredientKey`.
- Немає модуля для receipt ingestion, OCR, alias mapping і workflow підтвердження.

## 3. Цільовий workflow

## 3.1 Загальний потік
1. Користувач завантажує чек (`image/pdf`).
2. Система запускає OCR і парсинг структурованих рядків.
3. Кожен рядок проходить матчинг з інгредієнтами:
- auto-match (висока впевненість) -> готовий до імпорту,
- review-match (середня впевненість) -> потрібно підтвердження,
- unresolved (низька впевненість) -> ручне зіставлення обов'язкове.
4. Користувач підтверджує невідомі позиції.
5. Система створює покупки і, за бажанням, поповнює запаси.
6. Нові alias зберігаються для майбутніх чеків.

## 3.2 Стани обробки чека
- `uploaded`
- `ocr_processed`
- `parsed`
- `needs_review`
- `confirmed`
- `imported`
- `failed`

## 4. Зміни в моделі даних

## 4.1 Нові колекції

### `receipts`
- `id`
- `user_id`
- `source_file`
- `status`
- `store_raw`
- `store_id` (nullable)
- `purchase_at` (nullable)
- `currency` (nullable)
- `total_amount` (nullable)
- `ocr_engine`
- `ocr_confidence`
- `created_at`, `updated_at`

### `receipt_items`
- `id`
- `receipt_id`
- `user_id`
- `line_raw`
- `product_raw`
- `product_normalized`
- `qty`, `unit`, `price`, `line_total`
- `match_status`: `auto` | `review` | `unresolved` | `ignored`
- `match_confidence`
- `ingredient_key` (nullable)
- `resolution_source`: `auto_alias` | `manual_select` | `manual_create`

### `ingredient_aliases`
- `id`
- `user_id` (або `global=false/true`)
- `alias_raw`
- `alias_normalized`
- `ingredient_key`
- `store_id` (nullable, для store-specific alias)
- `confidence`
- `source`: `manual` | `ai` | `ocr`
- `usage_count`
- `last_used_at`

### `stores`
- `id`
- `user_id`
- `name`
- `normalized_name`
- `aliases[]`
- `created_at`, `updated_at`

## 4.2 Зміни існуючої моделі `purchases`
Додати поля:
- `store_id` (nullable)
- `store_name` (snapshot на момент покупки)
- `source`: `manual` | `receipt_import`
- `receipt_id` (nullable)
- `receipt_item_id` (nullable)
- `raw_product_name` (nullable, як було в чеку)

## 5. Логіка матчингу товарів

## 5.1 Каскад матчингу
1. Exact alias match (`alias_normalized`).
2. Exact ingredient name match (нормалізований `name`).
3. Fuzzy match (Levenshtein/token similarity).
4. AI reranker (LLM/embedding) для top-N кандидатів.

## 5.2 Пороги прийняття рішення
- `>= 0.90`: auto-match
- `0.65 - 0.89`: review-match (потрібне підтвердження)
- `< 0.65`: unresolved

## 5.3 Ручне вирішення unresolved
Для кожної позиції користувач має опції:
1. `Link to existing ingredient` (вибрати з довідника)
2. `Create new ingredient`
3. `Ignore line` (службові рядки, знижки, пакети)

При ручному лінкуванні створюється `ingredient_aliases` запис.

## 6. UI/UX план

## 6.1 Новий розділ "Чеки"
- Таблиця чеків зі статусами.
- Деталі чека:
  - розпізнані рядки,
  - автозіставлені,
  - unresolved список.
- Масові дії:
  - "Підтвердити всі auto-match",
  - "Імпортувати покупки".

## 6.2 Модалка ручного зіставлення
Поля:
- raw назва з чека,
- пропозиції кандидатів,
- кнопка створити новий товар,
- чекбокс `Запам'ятати як alias` (за замовчуванням увімкнено),
- чекбокс `Store-specific alias`.

## 6.3 Магазин у формі покупки
- У manual purchase form: `store` select + create new store.
- У receipt import: store підтягується з чека, можна перевизначити перед імпортом.

## 7. Архітектура OCR/AI

## 7.1 Мінімально життєздатний старт (MVP)
- OCR: `Tesseract` або `PaddleOCR`.
- Парсинг чека: rule-based + regex для `qty/unit/price/total`.
- Matcher: deterministic + fuzzy без LLM на першому етапі.

## 7.2 Розширення з ШІ
- LLM-функція для:
  - нормалізації `product_raw` -> canonical short name,
  - reranking кандидатів,
  - визначення noisy/службових рядків.
- Кешування результатів по `alias_normalized`, щоб зменшити вартість.

## 8. API план

### Receipt ingestion
- `POST /api/receipts` (upload)
- `GET /api/receipts`
- `GET /api/receipts/{id}`
- `POST /api/receipts/{id}/process`
- `POST /api/receipts/{id}/confirm`
- `POST /api/receipts/{id}/import-purchases`

### Resolution
- `POST /api/receipts/{id}/items/{itemId}/resolve`
- `POST /api/receipts/{id}/items/{itemId}/ignore`

### Aliases
- `GET /api/ingredient-aliases`
- `POST /api/ingredient-aliases`
- `PATCH /api/ingredient-aliases/{id}`
- `DELETE /api/ingredient-aliases/{id}`

### Stores
- `GET /api/stores`
- `POST /api/stores`
- `PATCH /api/stores/{id}`

## 9. Поетапний план реалізації

### Крок 1. Data model + міграції
- Додати `stores`, `receipts`, `receipt_items`, `ingredient_aliases`.
- Розширити `purchases` полями магазину і source.

DoD:
- Міграції пройшли, моделі читаються/пишуться.

### Крок 2. Магазин у ручних покупках
- Додати `store` у бекенд DTO і фронтову форму `Purchases`.

DoD:
- Можна створити покупку з магазином.

### Крок 3. Upload + збереження сирого чека
- Реалізувати `POST /api/receipts` і список чеків.

DoD:
- Користувач бачить завантажений чек в статусі `uploaded`.

### Крок 4. OCR + parser pipeline
- Обробка чека у `receipt_items` з базовими полями і confidence.

DoD:
- Для чека з'являються рядки товарів.

### Крок 5. Matching engine v1
- Alias exact + ingredient exact + fuzzy.
- Розкладання на `auto/review/unresolved`.

DoD:
- Позиції автоматично класифікуються по match-status.

### Крок 6. UI для unresolved
- Модалка/таблиця ручного мапінгу.
- Опція "створити новий товар".

DoD:
- Користувач може завершити резолв всіх рядків.

### Крок 7. Alias learning
- При manual link створювати alias.
- Автозастосування alias до інших рядків того ж чека і наступних чеків.

DoD:
- Повторний чек з тими ж скороченнями матчується автоматично.

### Крок 8. Import purchases
- Імпорт confirmed item -> `purchases`.
- Збереження `receipt_id`, `receipt_item_id`, `raw_product_name`, `store_id`.

DoD:
- Після імпорту покупки з'являються в модулі `Purchases`.

### Крок 9. Інтеграція з inventory (опціонально в імпорті)
- Прапорець `applyToInventory` при імпорті чека.

DoD:
- Імпорт чека може одразу поповнити запаси.

### Крок 10. AI enhancer
- Додати LLM rerank/normalization для поганого OCR.
- Додати telemetry (precision, manual corrections rate).

DoD:
- Частка unresolved зменшилась мінімум на 30% відносно v1.

## 10. Prompt-ready формат
- `Реалізуй крок 1 з docs/receipt-ocr-ai-plan-2026-02-08.md`
- `Реалізуй крок 2 з docs/receipt-ocr-ai-plan-2026-02-08.md`
- ...
- `Реалізуй крок 10 з docs/receipt-ocr-ai-plan-2026-02-08.md`

## 11. Ризики
- Якість OCR сильно залежить від фото і форматів чеків.
- Змішані мови/трансліт у назвах товарів можуть давати false match.
- Без review-черги можливі помилки автододавання покупок.

## 12. Метрики успіху
- `auto-match rate` >= 70% після перших 100 чеків.
- `manual correction rate` знижується щомісяця.
- `time-to-import` одного чека < 2 хвилин у 80% кейсів.
- `store captured` у >= 95% імпортованих покупок.

## 13. Рішення по alias scope (рекомендація)
- За замовчуванням alias робити `user-scoped`.
- Додати опцію `promote to global` тільки для admin після ручної валідації.
