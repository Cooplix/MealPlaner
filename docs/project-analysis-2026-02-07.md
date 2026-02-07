# Аналіз проекту MealPlaner

Дата аналізу: 2026-02-07

## 1. Обсяг і підхід
- Проведено статичний аналіз структури репозиторію, фронтенду, бекенду та Docker-оточення.
- Проаналізовано відповідність контрактів між frontend/backend, конфігурації безпеки та готовність до підтримки.
- Динамічні перевірки (`npm run lint`, `npm run build`) у цьому середовищі не виконані: відсутній `npm` (`npm: command not found`).

## 2. Загальна архітектура
- Frontend: React + TypeScript + Vite + Tailwind (`front/src`), з локальною i18n-системою (EN/UK/PL).
- Backend: FastAPI + Motor (MongoDB), JWT-аутентифікація, маршрути для auth/users/dishes/plans/shopping/ingredients.
- Infra: Docker Compose (`docker/docker-compose.yml`) піднімає `mongo`, `backend`, `frontend` (nginx як статика+reverse proxy).

## 3. Сильні сторони
- Логічно розділені модулі фронту за фічами (`features/*`), присутня типізація та i18n.
- На бекенді є централізовані налаштування та окремий шар міграцій (`server/app/migrations`).
- На старті створюються індекси MongoDB (`server/app/migrations/steps.py`).
- Є контейнеризація повного стеку з маршрутизацією `/api` через nginx.

## 4. Критичні проблеми (P0)
1. Несумісність моделі `DayPlan` між frontend і backend:
- `frontend` очікує `dateISO` (`front/src/types.ts:20`), а `backend` схема має поле `id` (`server/app/schemas.py:39`).
- У `PUT /api/plans/{dateISO}` використовується `payload.dateISO`, якого у моделі нема (`server/app/routes/plans.py:51`), що потенційно ламає upsert планів.

2. Несумісність HTTP-методу оновлення страв:
- `frontend` відправляє `PUT /dishes/{id}` (`front/src/api.ts:112`).
- `backend` реалізує тільки `PATCH /api/dishes/{dish_id}` (`server/app/routes/dishes.py:73`).
- Результат: редагування існуючих страв у UI не працює коректно.

3. Несумісність структури інгредієнтів:
- `frontend` вимагає `ingredient.id` (`front/src/types.ts:3`).
- `backend` модель інгредієнта не містить `id` (`server/app/schemas.py:9`).
- У редакторі страв зміни прив’язані до `ingredient.id` (`front/src/features/dishes/DishesPage.tsx:220`, `front/src/features/dishes/DishesPage.tsx:249`), що при відсутніх id призводить до некоректних оновлень/видалень.

## 5. Високопріоритетні проблеми (P1)
1. Непослідовна генерація ключів інгредієнтів:
- Автостворення при збереженні страви використовує key лише з `name` (`server/app/routes/dishes.py:21`).
- CRUD інгредієнтів використовує `name__unit` (`server/app/routes/ingredients.py:41`).
- Це створює дублікати і конфлікти довідника інгредієнтів.

2. Небезпечні дефолтні секрети:
- `JWT_SECRET` має небезпечний дефолт у коді (`server/app/config.py:20`).
- У Compose закомічені слабкі/тестові секрети та стартовий admin-пароль (`docker/docker-compose.yml:19`, `docker/docker-compose.yml:22`).

3. Частина ключів помилок у UI відсутня в перекладах:
- Виклики `errors.saveIngredient`, `errors.shoppingList` (`front/src/App.tsx:238`, `front/src/App.tsx:296`).
- У словниках є `errors.shopping`, але нема `saveIngredient` і `shoppingList` (`front/src/i18n/translations.ts:31`).

## 6. Середній пріоритет (P2)
1. У проекті залишились стартові стилі Vite (`front/src/App.css:1`), що впливають на layout (`#root` max-width/padding/text-align) і можуть конфліктувати з реальним UI.
2. Немає тестового контуру:
- Фронт: відсутній `vitest`/RTL.
- Бек: відсутній `server/tests/`.
3. Документація частково розходиться з реалізацією API (наприклад, згадки `PUT /dishes/{id}` при фактичному `PATCH`).

## 7. Рекомендований порядок виправлень
1. Уніфікувати API-контракт і типи:
- `DayPlan`: обрати єдине поле (`dateISO` або `id`) і синхронізувати frontend/backend.
- `Dish update`: узгодити метод (`PATCH` або `PUT`) з обох сторін.
- `Ingredient`: додати стабільний `id` у DTO або прибрати залежність UI від нього.

2. Уніфікувати ключ інгредієнта:
- Використовувати один формат (рекомендовано `name__unit`) у всіх маршрутах.
- Додати міграцію для нормалізації вже існуючих записів.

3. Закрити безпекові ризики:
- Заборонити дефолтні секрети в production (fail-fast на старті без `JWT_SECRET`).
- Винести admin bootstrap у змінні середовища/секрети оркестратора, прибрати hardcoded пароль.

4. Посилити якість:
- Додати smoke-тести:
- frontend: рендер головних сторінок + базові user flows.
- backend: auth/login, upsert/list plans, update dish, shopping-list aggregation.

## 8. Підсумок
- Проект має добру базову структуру і зрозумілу цільову архітектуру.
- Поточний стан містить критичні розриви API-контрактів, які впливають на ключові сценарії (редагування страв і плани).
- Після виправлення P0/P1 проблем проект можна швидко стабілізувати для подальшого нарощування функціоналу.
