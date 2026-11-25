# Практическая работа № 5. Асинхронные операции и получение данных с сервера

## 1. Данные работы и окружение

| Поле | Значение |
|---|---|
| Имя | Марковский Андрей Андреевич |
| Группа | ЭФБО-02-25 |
| Вариант | Вариант 1 (номер в журнале 17; `{ completed: false }`) |
| Операционная система | macOS |
| Node.js | `v24.22.3` |
| npm | `11.19.1` |
| Git | `2.54.0` |
| Репозиторий | `https://github.com/Andrey-Markovsky/TIP/tree/main/practice-05` |

## 2. Запуск

Рабочая папка: `practice-05` внутри личного репозитория `TIP`. Установка пакетов (`npm install`) не требуется.

Запуск проверок:

```bash
npm run check:api
npm run check:client
npm run check:integration
npm test
node checks/custom.checks.js
```

Запуск примеров и клиента (в двух терминалах):

```bash
# Терминал 1 — локальный учебный API ([http://127.0.0.1:5505/api](http://127.0.0.1:5505/api))
npm start

# Терминал 2 — примеры и консольный клиент
npm run example:order
npm run example:fetch
npm run client
```

Остановка сервера: `Ctrl+C`.

## 3. Эксперимент с порядком выполнения (`examples/event-loop.js`)

- **Прогноз до запуска:** `A → B → C → D → E → F`.
- **Фактический вывод (`npm run example:order`):**

```text
A: синхронный код
B: начало async-функции
C: конец синхронного кода
D: обработчик Promise
E: продолжение после await
F: задача таймера
```

- **Объяснение:** сначала выполняется весь текущий синхронный стек — `A`, синхронная часть `demonstrateAwait()` до `await null` (`B`) и `C`. После очистки стека выполняются микрозадачи в порядке постановки: сначала `.then()` у `Promise.resolve()` (`D`), затем продолжение `async`-функции после `await` (`E`). В последнюю очередь выполняется макрозадача таймера `setTimeout(..., 0)` (`F`).

## 4. Наблюдение за учебным HTTP API

| Запрос | Статус | `response.ok` | `Content-Type` | Форма тела |
|---|---:|---|---|---|
| `GET /api/health` | `200` | `true` | `application/json; charset=utf-8` | `{ data: { status: "ok" } }` |
| `GET /api/tasks` | `200` | `true` | `application/json; charset=utf-8` | `{ data: Task[12], meta: { total: 12, filters } }` |
| `GET /api/tasks?completed=false&priority=high` | `200` | `true` | `application/json; charset=utf-8` | `{ data: Task[3] (id: 4, 13, 34), meta: { total: 3, filters } }` |
| `GET /api/tasks/25` | `200` | `true` | `application/json; charset=utf-8` | `{ data: Task (id: 25) }` |
| `GET /api/tasks/999` | `404` | `false` | `application/json; charset=utf-8` | `{ error: { code: "TASK_NOT_FOUND", message, details: { id: 999 } } }` |
| `GET /api/categories` | `200` | `true` | `application/json; charset=utf-8` | `{ data: Category[3], meta: { total: 3 } }` |

## 5. Архитектура и распределение ответственности

- `api/server.mjs`, `api/data.js` — готовый учебный HTTP API (не изменялся).
- `src/api-client.js` — транспортный слой: `ApiError`, сборка и кодирование адресов `buildUrl` через `URL` и `URLSearchParams` (с сохранением `false` и `0`, без мутации `query`), фабрика `createApiClient` с подменяемым `fetchFn`, заголовком `Accept: application/json`, тайм-аутом `AbortSignal.timeout`, объединением сигналов `AbortSignal.any`, проверкой `response.ok`, `204` и `Content-Type`.
- `src/task-api.js` — предметный клиент `createTaskApi(client)`: валидация фильтров (`completed`, `priority`, `categoryId`, `q`) до запроса, методы `getTasks`, `getTaskById`, `getCategories`, параллельная загрузка `loadInitialData` через `Promise.all`, строгая проверка схемы задач/категорий, уникальности `id` и соответствия `meta.total`.
- `src/task-extra.js` — дополнительный модуль с функцией частичной загрузки `loadInitialDataPartial` через `Promise.allSettled`.
- `src/variant.js` — конфигурация индивидуального варианта (`variantNumber = 1`, `variantFilters = { completed: false }`).
- `src/main.js` — консольный демонстрационный сценарий.

## 6. Классификация ошибок (`ApiError`)

| `kind` | Когда возникает | Значимые поля |
|---|---|---|
| `http` | Ответ сервера со статусом вне `2xx` (`400`, `404`, `502`, `503`) | `status`, `code`, `details`, `url`, `message` |
| `network` | Сетевой сбой (`fetch` отклонён, сервер остановлен) | `cause`, `url`, `message` |
| `invalid-response` | Неверный `Content-Type`, битый JSON, не `Response` или нарушение схемы/уникальности `id` | `cause` (при `SyntaxError`), `url`, `message` |
| `timeout` | Превышено время ожидания `timeoutMs` (`AbortSignal.timeout`) | `cause`, `url`, `message` |
| `aborted` | Запрос отменён внешним `AbortController` | `cause`, `url`, `message` |

Сетевой вызов `fetchFn` изолирован в отдельном `try/catch`, поэтому ошибки HTTP и проверки ответа не маскируются под `network`.

## 7. Сравнение последовательного и параллельного ожидания

Замер двух запросов `GET /api/debug/delay?ms=100` (`node checks/custom.checks.js`):

| Прогон | Последовательно (`await` + `await`) | Параллельно (`Promise.all`) |
|---:|---:|---:|
| 1 | `206.4 мс` | `106.0 мс` |
| 2 | `208.6 мс` | `104.8 мс` |
| 3 | `207.7 мс` | `102.4 мс` |

При использовании `Promise.all` оба запроса стартуют одновременно, поэтому общее время определяется самым медленным из них (~100 мс вместо ~200 мс).

## 8. Общий и индивидуальный сценарии

- **Общий контрольный запрос** (`{ completed: false, priority: "high" }`): получены задачи `id: [4, 13, 34]`, 3 категории и обработана контрольная ошибка `404 TASK_NOT_FOUND` для `id = 999`. При остановленном сервере `npm run client` возвращает `ApiError` с `kind: "network"`.
- **Индивидуальный вариант 1** (`src/variant.js`):
  - `variantNumber = 1`, `variantFilters = { completed: false }`;
  - сформированный URL: `http://127.0.0.1:5505/api/tasks?completed=false`;
  - фильтр `completed: false` передаётся как логическое значение и отбирает только невыполненные задачи;
  - ожидаемые и фактические `id`: `[4, 7, 13, 19, 22, 28, 34]`, `meta.total = 7`.

## 9. Протоколы автоматизированных проверок

Полный прогон `npm test` (все 3 набора: `18 + 26 + 13 = 57` проверок):

```text
Итог API: успешно 18, ошибок 0.
Итог клиента: успешно 26, ошибок 0.
Итог интеграции: успешно 13, ошибок 0.
```

## 10. Собственные проверки (`checks/custom.checks.js`)

| № | Сценарий | Ожидаемый результат | Фактический результат | Итог |
|---:|---|---|---|---|
| 1 | Вариант 1 (`{ completed: false }`) и комбинация `{ completed: false, priority: "medium", categoryId: 3 }` | URL `.../tasks?completed=false`, id `[4, 7, 13, 19, 22, 28, 34]` (`total: 7`); для комбинации — id `[19]` (`total: 1`) | `OK: Собственная 1. Вариант 1 ({ completed: false }) и комбинация с priority + categoryId` | Пройдено |
| 2 | HTTP-ошибка `404` для несуществующей категории `/categories/99` | `ApiError` с `kind: "http"`, `status: 404`, `code: "CATEGORY_NOT_FOUND"` | `OK: Собственная 2. HTTP-ошибка 404 для несуществующей категории (/categories/99)` | Пройдено |
| 3 | Заранее отменённый `AbortSignal` и дублирующиеся `id` в массиве категорий | `kind: "aborted"` для сигнала; `kind: "invalid-response"` для дубликатов категорий | `OK: Собственная 3. Заранее отменённый AbortSignal и проверка дубликатов id в категориях` | Пройдено |

## 11. Дополнительное задание

Выполнен **Вариант А — частичный результат через `Promise.allSettled`** в отдельном модуле [`src/task-extra.js`](./src/task-extra.js) без изменения основного `loadInitialData`.

- **Контракт `loadInitialDataPartial(api, filters = {})`:** возвращает объект `{ ok, tasks, meta, categories, errors: { tasks, categories } }`. При отказе одного из запросов данные другого сохраняются, а причина отказа фиксируется в `errors` в структурированном виде `{ kind, message, status, code }`.
- **Проверки (`node checks/custom.checks.js`):**
  - `OK: Расширение А-1. loadInitialDataPartial: успех обоих запросов`
  - `OK: Расширение А-2. loadInitialDataPartial: ошибка задач при доступных категориях`
  - `OK: Расширение А-3. loadInitialDataPartial: ошибка категорий при доступных задачах`
  - `OK: Расширение А-4. loadInitialDataPartial: ошибка обоих запросов`
  - Итог: `Итог собственных и доп. проверок: успешно 7, ошибок 0.`

## 12. Вывод

Реализован переиспользуемый асинхронный HTTP-клиент с разделением транспортного слоя (`api-client.js`) и предметного API (`task-api.js`). Освоена модель выполнения синхронного кода, микрозадач и таймеров, безопасная сборка URL через `URLSearchParams`, классификация ошибок `ApiError` (`http`, `network`, `invalid-response`, `timeout`, `aborted`), отмена запросов через `AbortSignal`, валидация JSON-схемы и параллельная загрузка через `Promise.all` и `Promise.allSettled`. Все 57 обязательных и 7 собственных/дополнительных проверок пройдены без ошибок.