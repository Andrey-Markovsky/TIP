export const STORAGE_VERSION = 1;

const ALLOWED_PRIORITIES = new Set(["low", "medium", "high"]);

function cloneTasks(tasks) {
  return tasks.map((task) => ({ ...task }));
}

export function isValidTaskList(value) {
  if (!Array.isArray(value)) return false;

  const seenIds = new Set();

  for (const item of value) {
    if (item === null || typeof item !== "object" || Array.isArray(item)) {
      return false;
    }
    if (
      typeof item.id !== "number" ||
      !Number.isSafeInteger(item.id) ||
      item.id <= 0 ||
      seenIds.has(item.id)
    ) {
      return false;
    }
    if (typeof item.title !== "string") {
      return false;
    }
    const trimmedTitle = item.title.trim();
    if (trimmedTitle.length < 1 || trimmedTitle.length > 100) {
      return false;
    }
    if (typeof item.completed !== "boolean") {
      return false;
    }
    if (typeof item.priority !== "string" || !ALLOWED_PRIORITIES.has(item.priority)) {
      return false;
    }

    seenIds.add(item.id);
  }

  return true;
}

export function loadTasks(storage, key, fallbackTasks) {
  let raw;
  try {
    raw = storage.getItem(key);
  } catch {
    return {
      ok: false,
      source: "fallback",
      tasks: cloneTasks(fallbackTasks),
      error: "Не удалось прочитать данные из localStorage. Загружен исходный набор.",
    };
  }

  if (raw === null) {
    return {
      ok: true,
      source: "initial",
      tasks: cloneTasks(fallbackTasks),
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      ok: false,
      source: "fallback",
      tasks: cloneTasks(fallbackTasks),
      error: "Повреждённый JSON в localStorage. Загружен исходный набор.",
    };
  }

  if (
    parsed === null ||
    typeof parsed !== "object" ||
    Array.isArray(parsed) ||
    parsed.version !== STORAGE_VERSION ||
    !isValidTaskList(parsed.tasks)
  ) {
    return {
      ok: false,
      source: "fallback",
      tasks: cloneTasks(fallbackTasks),
      error: "Некорректный формат или версия данных в localStorage. Загружен исходный набор.",
    };
  }

  return {
    ok: true,
    source: "storage",
    tasks: cloneTasks(parsed.tasks),
  };
}

export function saveTasks(storage, key, tasks) {
  if (!isValidTaskList(tasks)) {
    return { ok: false, error: "Некорректный список задач; сохранение отменено." };
  }

  try {
    storage.setItem(key, JSON.stringify({ version: STORAGE_VERSION, tasks }));
    return { ok: true };
  } catch {
    return { ok: false, error: "Не удалось сохранить данные в localStorage." };
  }
}

export function removeSavedTasks(storage, key) {
  try {
    storage.removeItem(key);
    return { ok: true };
  } catch {
    return { ok: false, error: "Не удалось удалить сохранённые данные из localStorage." };
  }
}