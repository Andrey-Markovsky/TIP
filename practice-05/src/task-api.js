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

function isTask(value) {
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

function isCategory(value) {
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

export function createTaskApi(client) {
  if (!client || typeof client.requestJson !== "function") {
    throw new TypeError("Требуется клиент API с методом requestJson.");
  }

  async function getTasks(filters = {}) {
    const query = normalizeFilters(filters);
    const payload = Object.keys(query).length > 0
      ? await client.requestJson("/tasks", { query })
      : await client.requestJson("/tasks");

    if (!isPlainObject(payload) || !isPlainObject(payload.meta)) {
      throw invalidResponse("Ответ списка задач имеет неверную структуру.");
    }

    validateUniqueCollection(payload.data, isTask, "задач");

    if (payload.meta.total !== payload.data.length) {
      throw invalidResponse("Значение meta.total не совпадает с длиной списка задач.");
    }

    return { tasks: payload.data, meta: payload.meta };
  }

  async function getTaskById(id) {
    if (!isPositiveSafeInteger(id)) {
      throw new TypeError("id задачи должен быть положительным целым числом.");
    }

    const payload = await client.requestJson(`/tasks/${id}`);
    if (!isPlainObject(payload) || !isTask(payload.data)) {
      throw invalidResponse("Ответ одиночной задачи не соответствует схеме.");
    }

    return payload.data;
  }

  async function getCategories() {
    const payload = await client.requestJson("/categories");
    if (!isPlainObject(payload) || !isPlainObject(payload.meta)) {
      throw invalidResponse("Ответ категорий имеет неверную структуру.");
    }

    validateUniqueCollection(payload.data, isCategory, "категорий");

    if (payload.meta.total !== payload.data.length) {
      throw invalidResponse("Значение meta.total не совпадает с длиной списка категорий.");
    }

    return payload.data;
  }

  async function loadInitialData(filters = {}) {
    const tasksPromise = getTasks(filters);
    const categoriesPromise = getCategories();

    const [{ tasks, meta }, categories] = await Promise.all([
      tasksPromise,
      categoriesPromise,
    ]);

    return { tasks, categories, meta };
  }

  return {
    getTasks,
    getTaskById,
    getCategories,
    loadInitialData,
  };
}