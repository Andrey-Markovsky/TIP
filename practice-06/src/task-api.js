import { ApiError } from "./api-client.js";

const ALLOWED_PRIORITIES = new Set(["low", "medium", "high"]);
const ALLOWED_FILTERS = new Set(["completed", "priority", "categoryId", "q"]);

function invalidResponse(message) {
  return new ApiError(message, { kind: "invalid-response" });
}

function isPositiveSafeInteger(value) {
  return Number.isSafeInteger(value) && value > 0;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isTask(value) {
  return Boolean(
    isPlainObject(value)
    && isPositiveSafeInteger(value.id)
    && typeof value.title === "string"
    && value.title.trim().length >= 1
    && value.title.trim().length <= 100
    && typeof value.completed === "boolean"
    && ALLOWED_PRIORITIES.has(value.priority)
    && isPositiveSafeInteger(value.categoryId),
  );
}

export function isCategory(value) {
  return Boolean(
    isPlainObject(value)
    && isPositiveSafeInteger(value.id)
    && typeof value.name === "string"
    && value.name.trim().length >= 1
    && value.name.trim().length <= 100,
  );
}

function normalizeFilters(filters = {}) {
  if (!isPlainObject(filters)) {
    throw new TypeError("Фильтры должны быть обычным объектом.");
  }

  const normalized = {};

  for (const [key, value] of Object.entries(filters)) {
    if (!ALLOWED_FILTERS.has(key)) {
      throw new TypeError(`Неизвестный фильтр: ${key}.`);
    }
    if (value === undefined) {
      continue;
    }

    if (key === "completed") {
      if (typeof value !== "boolean") {
        throw new TypeError("Фильтр completed должен быть boolean.");
      }
      normalized.completed = value;
    } else if (key === "priority") {
      if (typeof value !== "string" || !ALLOWED_PRIORITIES.has(value)) {
        throw new TypeError('Фильтр priority должен быть "low", "medium" или "high".');
      }
      normalized.priority = value;
    } else if (key === "categoryId") {
      if (!isPositiveSafeInteger(value)) {
        throw new TypeError("Фильтр categoryId должен быть положительным целым числом.");
      }
      normalized.categoryId = value;
    } else if (key === "q") {
      if (typeof value !== "string") {
        throw new TypeError("Фильтр q должен быть строкой.");
      }
      const trimmed = value.trim();
      if (trimmed.length > 100) {
        throw new TypeError("Фильтр q не должен превышать 100 символов.");
      }
      if (trimmed.length > 0) {
        normalized.q = trimmed;
      }
    }
  }

  return normalized;
}

function validateUniqueCollection(items, predicate, label) {
  if (!Array.isArray(items)) {
    throw invalidResponse(`Поле data для ${label} должно быть массивом.`);
  }

  const seenIds = new Set();
  for (const item of items) {
    if (!predicate(item) || seenIds.has(item.id)) {
      throw invalidResponse(`Некорректная запись или дубликат id в списке ${label}.`);
    }
    seenIds.add(item.id);
  }
}

function withSignal(baseOptions, options) {
  if (options?.signal !== undefined) {
    return { ...baseOptions, signal: options.signal };
  }
  return baseOptions;
}

export function createTaskApi(client) {
  if (!client || typeof client.requestJson !== "function") {
    throw new TypeError("Требуется клиент API с методом requestJson.");
  }

  async function getTasks(filters = {}, options = {}) {
    const query = normalizeFilters(filters);
    const payload = await client.requestJson("/tasks", withSignal({ query }, options));

    if (!isPlainObject(payload) || !isPlainObject(payload.meta)) {
      throw invalidResponse("Ответ списка задач имеет неверную структуру.");
    }

    validateUniqueCollection(payload.data, isTask, "задач");

    if (payload.meta.total !== payload.data.length) {
      throw invalidResponse("Значение meta.total не совпадает с длиной списка задач.");
    }

    return { tasks: payload.data, meta: payload.meta };
  }

  async function getTaskById(id, options = {}) {
    if (!isPositiveSafeInteger(id)) {
      throw new TypeError("id задачи должен быть положительным целым числом.");
    }

    const reqOptions = options?.signal !== undefined ? { signal: options.signal } : undefined;
    const payload = await client.requestJson(`/tasks/${id}`, reqOptions);

    if (!isPlainObject(payload) || !isTask(payload.data)) {
      throw invalidResponse("Ответ одиночной задачи не соответствует схеме.");
    }

    return payload.data;
  }

  async function getCategories(options = {}) {
    const reqOptions = options?.signal !== undefined ? { signal: options.signal } : undefined;
    const payload = await client.requestJson("/categories", reqOptions);

    if (!isPlainObject(payload) || !isPlainObject(payload.meta)) {
      throw invalidResponse("Ответ категорий имеет неверную структуру.");
    }

    validateUniqueCollection(payload.data, isCategory, "категорий");

    if (payload.meta.total !== payload.data.length) {
      throw invalidResponse("Значение meta.total не совпадает с длиной списка категорий.");
    }

    return payload.data;
  }

  async function loadInitialData(filters = {}, options = {}) {
    const tasksPromise = getTasks(filters, options);
    const categoriesPromise = getCategories(options);

    const [{ tasks, meta }, categories] = await Promise.all([
      tasksPromise,
      categoriesPromise,
    ]);

    return { tasks, categories, meta };
  }

  async function createTask(draft, options = {}) {
    if (!isPlainObject(draft)) {
      throw new TypeError("Данные новой задачи должны быть объектом.");
    }

    const payload = await client.requestJson(
      "/tasks",
      withSignal({ method: "POST", body: draft }, options),
    );

    if (!isPlainObject(payload) || !isTask(payload.data)) {
      throw invalidResponse("Ответ создания задачи не соответствует схеме.");
    }

    return payload.data;
  }

  async function updateTask(id, changes, options = {}) {
    if (!isPositiveSafeInteger(id)) {
      throw new TypeError("id задачи должен быть положительным целым числом.");
    }
    if (!isPlainObject(changes)) {
      throw new TypeError("Изменения задачи должны быть объектом.");
    }

    const payload = await client.requestJson(
      `/tasks/${id}`,
      withSignal({ method: "PATCH", body: changes }, options),
    );

    if (!isPlainObject(payload) || !isTask(payload.data)) {
      throw invalidResponse("Ответ обновления задачи не соответствует схеме.");
    }

    return payload.data;
  }

  async function setTaskCompleted(id, completed, options = {}) {
    if (typeof completed !== "boolean") {
      throw new TypeError("completed должен быть логическим значением.");
    }
    return updateTask(id, { completed }, options);
  }

  async function deleteTask(id, options = {}) {
    if (!isPositiveSafeInteger(id)) {
      throw new TypeError("id задачи должен быть положительным целым числом.");
    }

    const payload = await client.requestJson(
      `/tasks/${id}`,
      withSignal({ method: "DELETE" }, options),
    );

    if (payload !== null) {
      throw invalidResponse("При удалении задачи ожидался пустой ответ 204.");
    }

    return null;
  }

  async function resetDemoData(options = {}) {
    const payload = await client.requestJson(
      "/debug/reset",
      withSignal({ method: "POST" }, options),
    );

    if (
      !isPlainObject(payload)
      || !isPlainObject(payload.data)
      || payload.data.reset !== true
      || !Number.isSafeInteger(payload.data.total)
      || payload.data.total < 0
    ) {
      throw invalidResponse("Ответ сброса данных не соответствует контракту.");
    }

    return payload.data;
  }

  return {
    getTasks,
    getTaskById,
    getCategories,
    loadInitialData,
    createTask,
    updateTask,
    setTaskCompleted,
    deleteTask,
    resetDemoData,
  };
}