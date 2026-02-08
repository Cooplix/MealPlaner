# План міграції бекенду: Python -> Java 25 + Spring Boot

Дата: 2026-02-07  
Статус: Cutover (Java backend is primary; Python backend is legacy)

## 1. Ціль і межі міграції

Ціль: перевести бекенд застосунку з FastAPI (Python) на Java 25 + Spring Boot без ламання фронтенд-контрактів і з підтримкою зовнішньої MongoDB, яка використовується не тільки цим проєктом.

У межах міграції:
- зберегти існуючий REST API-контракт (`/api/*`) або керовано версіонувати його;
- зберегти поточну модель даних у MongoDB або виконати сумісну еволюцію;
- забезпечити паритет бізнес-логіки для модулів:
`auth`, `users`, `dishes`, `plans`, `shopping`, `ingredients`, `calories`, `purchases`.

Поза межами (окремим треком):
- редизайн UI;
- зміна бізнес-процесів без потреби;
- міграція з MongoDB на іншу БД.

## 2. Критерії готовності (Definition of Done)

- Функціональний паритет з Python-реалізацією підтверджений тестами.
- Фронтенд працює без критичних змін API.
- Налаштування на зовнішню MongoDB документовані та перевірені.
- Smoke + інтеграційні тести стабільні в CI.
- Є план rollback на Python-бекенд.

## 3. Цільовий стек і архітектура

Базовий стек:
- Java 25
- Spring Boot 3.x
- Spring Web
- Spring Security
- Spring Data MongoDB
- Bean Validation (`jakarta.validation`)
- Actuator (health/readiness/liveness)

Рекомендована структура модулів:
- `controller` (REST endpoints)
- `service` (бізнес-логіка)
- `repository` (Mongo доступ)
- `dto` (request/response)
- `mapper` (DTO <-> domain)
- `config` (security, mongo, web, error handling)
- `migration` (міграції індексів/даних)

## 4. Дані і зовнішня MongoDB (ключова вимога)

Оскільки MongoDB shared між кількома проєктами:
- використовувати окрему логічну БД (наприклад, `mealplanner`);
- створити окремого Mongo-користувача з правами тільки на цю БД;
- не використовувати глобальні права (`root`) для runtime;
- всі індекси створювати і підтримувати тільки в межах своєї БД;
- параметризувати підключення тільки через `MONGODB_URI` і `MONGODB_DB`.

Рекомендований формат:
- `MONGODB_URI=mongodb://<user>:<password>@<host>:<port>/?authSource=<db>`
- `MONGODB_DB=mealplanner`

## 5. Поетапний план міграції

### Етап 0. Підготовка і аудит
- Зафіксувати поточний API-контракт (OpenAPI snapshot).
- Зробити inventory ендпоінтів, схем, кодів помилок.
- Зібрати список індексів Mongo та startup-міграцій.
- Зафіксувати baseline метрики (latency/error rate).

Артефакти:
- таблиця endpoint parity;
- перелік Mongo-індексів;
- технічний ADR по Spring-архітектурі.

### Етап 1. Каркас Java-сервісу
- Створити новий сервіс (`server-java/`) з базовою структурою.
- Додати `/api/health` + Actuator.
- Підключити Mongo, security-фреймворк, global exception handling.
- Налаштувати Dockerfile і локальний запуск у compose без вбудованої БД.

### Етап 2. Безпека і користувачі
- Реалізувати `auth`/`users` з JWT.
- Паролі: BCrypt.
- Уніфікувати TTL токена і claims з поточною системою.
- Перевірити backward compatibility (або зробити контрольовану ротацію токенів).

### Етап 3. Основні домени
- Перенести `ingredients`, `dishes`, `plans`, `shopping`.
- Перенести `calories` і `purchases`.
- Для кожного модуля: unit + integration + contract tests.

### Етап 4. Dual-run і звірка
- Запуск Python і Java паралельно.
- Traffic shadowing або порівняння відповідей на однакові запити.
- Виправлення розбіжностей до cutover.

### Етап 5. Cutover
- Поступове перемикання трафіку: 10% -> 50% -> 100%.
- Моніторинг SLO/SLA, логів, помилок авторизації.
- Готовий rollback script на Python-сервіс.

### Етап 6. Деактивація legacy
- Freeze Python-бекенд (read-only або fallback-only режим).
- Після стабілізації видалити legacy-код і лишити Java-сервіс.

## 6. Тестова стратегія

Обов'язково:
- Smoke тести (`/api/health`, базовий auth, критичний CRUD).
- Інтеграційні тести з тестовою Mongo.
- Контрактні тести проти OpenAPI та golden responses.
- Регресія з фронтендом (e2e/smoke сценарії).
- Лінійне покриття коду Java >= 60% (JaCoCo).

Цільові quality gates:
- 100% проходження smoke/integration/contract у CI.
- 0 blocker-багів у cutover вікні.
- JaCoCo gate: `>= 60%` line coverage на `server-java`.

## 7. CI/CD і оточення

- Окремий pipeline для `server-java`.
- Build: `mvn -q -DskipTests=false verify` або Gradle еквівалент.
- Контейнеризація: multi-stage Docker build.
- Secrets тільки через env/secret store, не в compose-файлах.
- Автоматичний деплой у stage перед production.

## 8. Ризики і пом'якшення

1. Розбіжності в контрактах API  
Пом'якшення: contract tests + endpoint parity matrix.

2. Проблеми з JWT сумісністю  
Пом'якшення: staging із реальними токенами, fallback на старий issuer.

3. Конкурентний доступ до shared MongoDB  
Пом'якшення: ізольовані користувач/БД/індекси, контроль доступу.

4. Регресії продуктивності  
Пом'якшення: baseline/perf тест до і після, профілювання hot paths.

## 9. Орієнтовний таймлайн

- Тиждень 1: аудит, контракти, ADR, skeleton.
- Тиждень 2: auth/users/security.
- Тиждень 3-4: доменні модулі та тести.
- Тиждень 5: dual-run (завершено), виправлення розбіжностей.
- Тиждень 6: cutover + стабілізація.

## 10. Чекліст запуску в прод

- Є актуальний backup Mongo.
- Підготовлені `MONGODB_URI`, `MONGODB_DB`, `JWT_SECRET`.
- Rollback-інструкція перевірена dry-run.
- Моніторинг/алерти увімкнені.
- Incident owner і канал комунікації визначені.
